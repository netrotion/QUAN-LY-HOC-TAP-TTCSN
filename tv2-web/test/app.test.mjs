import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  api,
  createApiClient,
  ApiClientError,
  sanitizeRequestBody
} from '../src/services/apiClient.js';
import {
  HAUI_BUSINESS_RULES,
  HAUI_GRADE_SCALE_BR05,
  OPTIMIZER_WEIGHTS,
  STUDENT_PERSONAS
} from '../src/services/mockFixtures.js';
import {
  UI_API_CONTRACT_VERSION,
  REQUIRED_UI_COMPONENT_NAMES,
  REQUIRED_API_METHODS,
  verifyUiApiContract,
  resolveStudentRoutesWithFallback
} from '../src/routes/tv3RouteContract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Helper tải `createStudentRoutes` từ `@haui/planner-ui` (hoặc đường dẫn workspace tương đối khi chưa chạy npm ci)
 */
async function loadTv3CreateStudentRoutes() {
  try {
    const mod = await import('@haui/planner-ui');
    return mod.createStudentRoutes;
  } catch {
    const fallbackMod = await import('../../tv3-planner-ui/src/index.js');
    return fallbackMod.createStudentRoutes;
  }
}

test('1. Singleton API Client: hỗ trợ baseURL, Mock Interceptor (FIXTURE_ONLY), CSRF header và lọc bỏ studentId', async () => {
  const client = createApiClient({
    baseURL: '/api/v1',
    mockEnabled: true,
    mockDelayMs: 0,
    csrfToken: 'csrf-token-demo-123'
  });

  assert.equal(client.isMockMode(), true);
  assert.equal(client.getConfig().baseURL, '/api/v1');

  // Kiểm tra GET /academic/status giữ nguyên gpa = null (Quy tắc 5 AGENTS.md) & có đủ 5 khối kiến thức Màn hình 1 UI Flow
  const statusRes = await client.academic.getStatus();
  assert.equal(statusRes.studentId, 'std-2026-001');
  assert.equal(statusRes.gpa, null, 'Missing data gpa phải giữ nguyên null, không được mặc định thành 0');
  assert.equal(statusRes.cpa, 2.45);
  assert.equal(statusRes.knowledgeBlocks.length, 5);
  assert.equal(statusRes.fixtureLabel, 'FIXTURE_ONLY');
  assert.equal(statusRes.__mock, true);
  assert.equal(statusRes.__meta.credentials, 'include');

  // Kiểm tra POST /academic/eligibility gửi kèm CSRF token và tự động loại bỏ studentId từ client body (Quy tắc 6 AGENTS.md & AC-02)
  const eligRes = await client.academic.checkEligibility({
    courseCode: 'IT6001',
    studentId: 'malicious-override-id'
  });
  assert.equal(eligRes.courseCode, 'IT6001');
  assert.equal(eligRes.eligible, false);
  assert.equal(eligRes.__meta.csrfHeaderAttached, true);
  assert.equal(eligRes.__meta.strippedUntrustedStudentId, true);

  // Kiểm tra hàm sanitizeRequestBody độc lập
  const { sanitizedBody, strippedStudentId } = sanitizeRequestBody({
    courseCode: 'MATH1002',
    studentId: 'std-fake'
  });
  assert.equal(strippedStudentId, true);
  assert.equal('studentId' in sanitizedBody, false);
  assert.equal(sanitizedBody.courseCode, 'MATH1002');
});

test('2. Kiểm thử các kịch bản UI Flow & PRD (AC-01..AC-05, BR-01..BR-10, Màn hình 1..9)', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });

  // AC-01 & Luồng phụ A: Bóc tách bảng điểm PDF hợp lệ & bắt lỗi định dạng file sai
  const ingestOk = await client.academic.ingestTranscript({
    fileName: 'Bang_Diem_Ca_Nhan_eHaUI_K17.pdf'
  });
  assert.equal(ingestOk.extractedCpa, 2.45);
  assert.ok(ingestOk.records.length >= 6);

  await assert.rejects(
    async () => {
      await client.academic.ingestTranscript({
        fileName: 'Bang_Diem_Sai.docx',
        invalidFormat: true
      });
    },
    (err) => err instanceof ApiClientError && err.code === 'INVALID_TRANSCRIPT_FORMAT'
  );

  // BR-03 & BR-04 (Màn hình 5): Kiểm tra quy chế giới hạn tín chỉ 10 - 24 TC
  const validPlan = await client.planner.validate({ totalCredits: 18 });
  assert.equal(validPlan.valid, true);
  assert.equal(validPlan.status, 'VALIDATED');

  const underloadPlan = await client.planner.validate({ totalCredits: 6 });
  assert.equal(underloadPlan.valid, false);
  assert.equal(underloadPlan.status, 'DRAFT');

  const overloadPlan = await client.planner.validate({ totalCredits: 27 });
  assert.equal(overloadPlan.valid, false);

  // Màn hình 4: Sơ đồ cây có đủ 4 trạng thái màu Node (GREEN, RED, YELLOW, GRAY)
  const treeRes = await client.academic.getCurriculum();
  const nodeColors = new Set(treeRes.courses.map((c) => c.nodeColor));
  assert.equal(nodeColors.has('GREEN'), true);
  assert.equal(nodeColors.has('RED'), true);
  assert.equal(nodeColors.has('YELLOW'), true);
  assert.equal(nodeColors.has('GRAY'), true);

  // Màn hình 9 (AC-05): Audit tốt nghiệp đủ 7 hạng mục Checklist
  const auditRes = await client.audit.getGraduationAudit();
  assert.equal(auditRes.completedPercentage, 82);
  assert.equal(auditRes.checklist.length, 7);

  // Kiểm tra dữ liệu PRD: 4 phân khúc sinh viên, 10 quy tắc BR-01..BR-10, 8 mức quy đổi điểm BR-05, 4 trọng số thuật toán
  assert.equal(STUDENT_PERSONAS.length, 4);
  assert.equal(HAUI_BUSINESS_RULES.length, 10);
  assert.equal(HAUI_GRADE_SCALE_BR05.length, 8);
  assert.equal(OPTIMIZER_WEIGHTS.length, 4);
});

test('3. Singleton API Client: tuân thủ Quy tắc 4 AGENTS.md — KHÔNG âm thầm fallback về mock khi chạy live/production', async () => {
  const prodClient = createApiClient({
    isProduction: true,
    mockEnabled: true,
    fetchImpl: async () => {
      throw new Error('Connection refused');
    }
  });

  assert.equal(prodClient.isMockMode(), false, 'Production client phải luôn tắt mockMode');
  assert.throws(
    () => prodClient.setMockMode(true),
    (err) => err instanceof ApiClientError && err.code === 'MOCK_FORBIDDEN_IN_PRODUCTION'
  );

  await assert.rejects(
    async () => {
      await prodClient.academic.getStatus();
    },
    (err) => err instanceof ApiClientError && err.code === 'NETWORK_ERROR'
  );
});

test('4. Cơ chế mount Route cho TV3: createStudentRoutes({ api, ui }) và Fallback Placeholders', async () => {
  const createStudentRoutes = await loadTv3CreateStudentRoutes();

  const uiContractStub = Object.fromEntries(
    REQUIRED_UI_COMPONENT_NAMES.map((name) => [name, function UiComponentStub() { return null; }])
  );

  const contractCheck = verifyUiApiContract({ api, ui: uiContractStub });
  assert.equal(contractCheck.valid, true);
  assert.equal(contractCheck.version, UI_API_CONTRACT_VERSION);
  assert.deepEqual(contractCheck.missingUi, []);
  assert.deepEqual(contractCheck.missingApi, []);
  assert.equal(REQUIRED_API_METHODS.every((m) => typeof api[m] === 'function'), true);

  const { rawTv3Routes, resolvedRoutes } = resolveStudentRoutesWithFallback({
    api,
    ui: uiContractStub,
    routeFactory: createStudentRoutes
  });

  assert.ok(Array.isArray(rawTv3Routes));
  assert.ok(rawTv3Routes.length >= 1);
  assert.equal(rawTv3Routes[0].status, 'NOT_IMPLEMENTED');

  const resolvedPaths = resolvedRoutes.map((r) => r.path);
  assert.ok(resolvedPaths.includes('/planner'));
  assert.ok(resolvedPaths.includes('/recommendations'));
  assert.ok(resolvedPaths.includes('/what-if'));
  assert.ok(resolvedPaths.includes('/chat'));
  assert.ok(resolvedPaths.includes('/planner/placeholder'));
  assert.equal(resolvedRoutes.every((r) => r.isFallback === true), true);

  const customResolved = resolveStudentRoutesWithFallback({
    api,
    ui: uiContractStub,
    routeFactory: () => [
      {
        path: '/planner',
        name: 'RealPlannerScreen',
        status: 'READY',
        Component: function RealPlanner() { return null; }
      }
    ]
  });
  const plannerRoute = customResolved.resolvedRoutes.find((r) => r.path === '/planner');
  assert.equal(plannerRoute.isFallback, false);
  assert.equal(plannerRoute.status, 'IMPLEMENTED');
});

test('5. Kiểm tra cấu trúc Design Tokens, Shared UI Library V0, trang /demo-ui và ranh giới không gọi LLM trực tiếp', () => {
  const tv2Root = path.resolve(__dirname, '..');

  const requiredFiles = [
    'src/styles/tokens.css',
    'src/styles/global.css',
    'src/components/ui/Button.jsx',
    'src/components/ui/Card.jsx',
    'src/components/ui/Table.jsx',
    'src/components/ui/Modal.jsx',
    'src/components/ui/Loading.jsx',
    'src/components/ui/Error.jsx',
    'src/components/ui/EmptyState.jsx',
    'src/components/ui/index.js',
    'src/components/layout/Topbar.jsx',
    'src/components/layout/Sidebar.jsx',
    'src/components/layout/MainLayout.jsx',
    'src/pages/DemoUiPage.jsx',
    'src/pages/DashboardPage.jsx',
    'src/pages/AcademicProgressPage.jsx',
    'src/pages/CurriculumTreePage.jsx',
    'src/pages/Tv3FallbackPage.jsx',
    'src/routes/mountStudentRoutes.jsx',
    'src/index.js',
    'src/App.jsx'
  ];

  for (const relPath of requiredFiles) {
    const absPath = path.join(tv2Root, relPath);
    assert.equal(fs.existsSync(absPath), true, `Thiếu file bắt buộc trong tv2-web: ${relPath}`);

    const content = fs.readFileSync(absPath, 'utf-8');
    assert.equal(
      /openai|anthropic|@google\/generative-ai|langchain/i.test(content),
      false,
      `File ${relPath} vi phạm ranh giới: không được import SDK LLM trực tiếp ở Frontend`
    );
  }

  const tokensCss = fs.readFileSync(path.join(tv2Root, 'src/styles/tokens.css'), 'utf-8');
  for (const token of [
    '--color-primary',
    '--color-success',
    '--color-warning',
    '--color-error',
    '--color-info',
    '--space-4',
    '--radius-md',
    '--font-sans'
  ]) {
    assert.equal(tokensCss.includes(token), true, `tokens.css thiếu biến CSS: ${token}`);
  }
});
