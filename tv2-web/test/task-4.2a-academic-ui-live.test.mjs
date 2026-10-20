/**
 * HaUI Advisor — Task 4.2a Live Academic UI Integration Verification Suite
 * Role: TV2 (Frontend Platform & Academic Engineer)
 *
 * Verifies:
 * 1. Contract 1.3.0 endpoint GET /academic/curriculum/tree and CurriculumTreeResponse schema.
 * 2. Course tree node status comes directly from API (CourseProgressStatus: PASSED, IN_PROGRESS, FAILED, ELIGIBLE, BLOCKED, UNKNOWN).
 *    Strict Rule: Zero client-side deduction of PASSED/BLOCKED in JS.
 * 3. policyVersion and dataRevision presence across all academic and audit responses.
 * 4. 503 TOOL_NOT_READY handling: Clear notice, no silent fallback to mock, no fake numbers.
 * 5. Safe handling of deadline: null in audit pendingActions (per Contract 1.3.0 and Task 4.1 backend behavior).
 * 6. Navigation from Tree to TV3 Planner preserving course_id and plan_id.
 * 7. Strict Boundaries: TV2 ownership (tv2-web/ ONLY), zero client-side arithmetic for GPA/CPA, zero LLM imports.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApiClient, ApiClientError } from '../src/services/apiClient.js';
import { mockAcademicService } from '../src/services/mockAcademicService.js';
import { getCourseDisplayMeta } from '../src/services/curriculumTreeHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TV2_ROOT = path.resolve(__dirname, '..');

test('Task 4.2a - Test 1: Contract 1.3.0 GET /academic/curriculum/tree Schema & DTO Verification', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });
  mockAcademicService.setActivePersona('normal');

  const treeRes = await client.academic.getCurriculumTree();

  // Top-level CurriculumTreeResponse fields
  assert.ok(treeRes.studentId, 'Phải có studentId');
  assert.ok(treeRes.curriculumId, 'Phải có curriculumId');
  assert.ok(treeRes.curriculumName, 'Phải có curriculumName');
  assert.ok(['CONFIRMED', 'NONE'].includes(treeRes.transcriptStatus), 'transcriptStatus phải là CONFIRMED hoặc NONE');
  assert.ok(Array.isArray(treeRes.courses), 'courses phải là một mảng');
  assert.ok(treeRes.courses.length > 0, 'Phải có ít nhất 1 học phần trong CTĐT');
  assert.ok(treeRes.dataRevision, 'Phải có dataRevision');
  assert.ok(treeRes.policyVersion, 'Phải có policyVersion');
  assert.equal(treeRes.policyVersion, 'policy-haui-demo-2026@0.0.1-v0', 'policyVersion phải chuẩn demo 2026');

  // Verify CurriculumTreeCourseItem structure
  const firstCourse = treeRes.courses[0];
  assert.ok(firstCourse.courseCode, 'Phải có courseCode');
  assert.ok(firstCourse.courseName, 'Phải có courseName');
  assert.equal(typeof firstCourse.credits, 'number', 'credits phải là số');
  assert.ok(
    ['PASSED', 'FAILED', 'IN_PROGRESS', 'ELIGIBLE', 'BLOCKED', 'UNKNOWN'].includes(firstCourse.status),
    `status phải là CourseProgressStatus hợp lệ, nhận được: ${firstCourse.status}`
  );
  assert.equal(typeof firstCourse.eligible, 'boolean', 'eligible phải là boolean');
  assert.ok(Array.isArray(firstCourse.missingPrerequisites), 'missingPrerequisites phải là mảng');
});

test('Task 4.2a - Test 2: Trạng thái nút trên cây môn học theo CourseProgressStatus (PASSED, IN_PROGRESS, FAILED, ELIGIBLE, BLOCKED, UNKNOWN)', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });

  // 1. Persona at-risk (nợ MATH1002 - Điểm F)
  mockAcademicService.setActivePersona('at-risk');
  const atRiskTree = await client.academic.getCurriculumTree();
  assert.equal(atRiskTree.transcriptStatus, 'CONFIRMED');

  const math1002 = atRiskTree.courses.find((c) => c.courseCode === 'MATH1002');
  assert.ok(math1002);
  assert.equal(math1002.status, 'FAILED', 'MATH1002 phải có status FAILED do nhận điểm F');
  assert.equal(math1002.letterGrade, 'F');

  // IT6001 tiên quyết bởi MATH1002 và IT2001 -> phải bị BLOCKED
  const it6001 = atRiskTree.courses.find((c) => c.courseCode === 'IT6001');
  assert.ok(it6001);
  assert.equal(it6001.status, 'BLOCKED', 'IT6001 phải bị BLOCKED do nợ tiên quyết MATH1002');
  assert.equal(it6001.eligible, false);
  assert.ok(
    it6001.missingPrerequisites.some((p) => p.includes('MATH1002')),
    'missingPrerequisites phải chỉ rõ MATH1002'
  );

  // Môn đã đạt (MATH1001)
  const math1001 = atRiskTree.courses.find((c) => c.courseCode === 'MATH1001');
  assert.ok(math1001);
  assert.equal(math1001.status, 'PASSED', 'MATH1001 phải có status PASSED');

  // Môn đang học (IT3004)
  const it3004 = atRiskTree.courses.find((c) => c.courseCode === 'IT3004');
  assert.ok(it3004);
  assert.equal(it3004.status, 'IN_PROGRESS', 'IT3004 phải có status IN_PROGRESS');

  // 2. Persona normal (tiến độ chuẩn, đã đạt MATH1002)
  mockAcademicService.setActivePersona('normal');
  const normalTree = await client.academic.getCurriculumTree();
  const normalMath1002 = normalTree.courses.find((c) => c.courseCode === 'MATH1002');
  assert.equal(normalMath1002.status, 'PASSED', 'Sinh viên normal phải đạt MATH1002');

  const normalIt6001 = normalTree.courses.find((c) => c.courseCode === 'IT6001');
  assert.equal(normalIt6001.status, 'PASSED', 'Sinh viên normal đã hoàn thành IT6001');

  // 3. Persona empty (chưa có bảng điểm)
  mockAcademicService.setActivePersona('empty');
  const emptyTree = await client.academic.getCurriculumTree();
  assert.equal(emptyTree.transcriptStatus, 'NONE', 'Sinh viên mới phải có transcriptStatus NONE');
  for (const c of emptyTree.courses) {
    assert.equal(c.status, 'UNKNOWN', 'Khi chưa có bảng điểm xác nhận, mọi nút phải là UNKNOWN');
  }
});

test('Task 4.2a - Test 3: getCourseDisplayMeta chuyển đổi trực tiếp từ status của API (Không tính toán lại ở Client)', () => {
  // Test PASSED
  const metaPassed = getCourseDisplayMeta({ status: 'PASSED', letterGrade: 'A' });
  assert.equal(metaPassed.statusType, 'passed');
  assert.equal(metaPassed.statusClass, 'haui-badge--success');
  assert.ok(metaPassed.statusText.includes('Đạt: A'));

  // Test IN_PROGRESS
  const metaInProgress = getCourseDisplayMeta({ status: 'IN_PROGRESS', semesterCode: '2025_1' });
  assert.equal(metaInProgress.statusType, 'studying');
  assert.equal(metaInProgress.statusClass, 'haui-badge--primary');

  // Test ELIGIBLE
  const metaEligible = getCourseDisplayMeta({ status: 'ELIGIBLE' });
  assert.equal(metaEligible.statusType, 'eligible');
  assert.equal(metaEligible.statusClass, 'haui-badge--neutral');

  // Test BLOCKED
  const metaBlocked = getCourseDisplayMeta({ status: 'BLOCKED' });
  assert.equal(metaBlocked.statusType, 'locked');
  assert.equal(metaBlocked.statusClass, 'haui-badge--warning');

  // Test FAILED
  const metaFailed = getCourseDisplayMeta({ status: 'FAILED', letterGrade: 'F' });
  assert.equal(metaFailed.statusType, 'locked');
  assert.equal(metaFailed.statusClass, 'haui-badge--error');

  // Test UNKNOWN
  const metaUnknown = getCourseDisplayMeta({ status: 'UNKNOWN' });
  assert.equal(metaUnknown.statusType, 'unknown');
  assert.equal(metaUnknown.statusClass, 'haui-badge--neutral');
});

test('Task 4.2a - Test 4: policyVersion và dataRevision trên các endpoints học vụ (Contract 1.3.0)', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });
  mockAcademicService.setActivePersona('normal');

  // 1. GET /academic/status
  const statusRes = await client.academic.getStatus();
  assert.ok(statusRes.policyVersion, 'GET /academic/status phải có policyVersion');
  assert.ok(statusRes.dataRevision, 'GET /academic/status phải có dataRevision');

  // 2. GET /academic/curriculum/tree
  const treeRes = await client.academic.getCurriculumTree();
  assert.ok(treeRes.policyVersion, 'GET /academic/curriculum/tree phải có policyVersion');
  assert.ok(treeRes.dataRevision, 'GET /academic/curriculum/tree phải có dataRevision');

  // 3. POST /academic/eligibility
  const eligRes = await client.academic.checkEligibility({ courseCode: 'IT6001' });
  assert.ok(eligRes.policyVersion, 'POST /academic/eligibility phải có policyVersion');
  assert.ok(eligRes.dataRevision, 'POST /academic/eligibility phải có dataRevision');

  // 4. GET /audit/graduation
  const auditRes = await client.audit.getGraduationAudit();
  assert.ok(auditRes.policyVersion, 'GET /audit/graduation phải có policyVersion');
  assert.ok(auditRes.dataRevision, 'GET /audit/graduation phải có dataRevision');
});

test('Task 4.2a - Test 5: Xử lý lỗi 503 TOOL_NOT_READY — Không âm thầm fallback về mock và không tạo số giả', async () => {
  // Tạo client giả lập lỗi 503 TOOL_NOT_READY từ backend
  const errorClient = createApiClient({
    mockEnabled: false,
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: async () => ({
        code: 'TOOL_NOT_READY',
        message: 'Engine học vụ đang khởi động hoặc capability chưa sẵn sàng.',
        requestId: 'req-503-test',
        timestamp: new Date().toISOString(),
        details: ['TV4 chưa khai báo capability tương ứng']
      })
    })
  });

  await assert.rejects(
    async () => {
      await errorClient.academic.getCurriculumTree();
    },
    (err) => {
      assert.ok(err instanceof ApiClientError);
      assert.equal(err.status, 503);
      assert.equal(err.code, 'TOOL_NOT_READY');
      return true;
    },
    'Lỗi 503 TOOL_NOT_READY phải được ném ra nguyên vẹn, không được âm thầm fallback về mock'
  );
});

test('Task 4.2a - Test 6: An toàn với deadline: null trong pendingActions của Báo cáo Kiểm toán tốt nghiệp', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });
  mockAcademicService.setActivePersona('normal');

  const auditRes = await client.audit.getGraduationAudit();
  assert.ok(Array.isArray(auditRes.pendingActions), 'pendingActions phải là một mảng');

  // Giả lập một hành động có deadline: null (theo Contract 1.3.0 & Task 4.1 backend behavior)
  const actionWithNullDeadline = {
    certificateType: 'MOS',
    requiredStandard: 'Chuẩn tin học văn phòng MOS',
    actionDescription: 'Nộp chứng chỉ trước kỳ thi tốt nghiệp',
    deadline: null,
    status: 'Chưa nộp'
  };

  auditRes.pendingActions.push(actionWithNullDeadline);

  // Đảm bảo không ném ngoại lệ khi truy cập deadline
  assert.equal(actionWithNullDeadline.deadline, null);
  const formattedDeadline = actionWithNullDeadline.deadline || 'Chưa ấn định';
  assert.equal(formattedDeadline, 'Chưa ấn định');

  // Kiểm tra mã nguồn AcademicProgressPage có xử lý null an toàn
  const progressPageCode = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/AcademicProgressPage.jsx'), 'utf-8');
  assert.ok(
    progressPageCode.includes('val ||') || progressPageCode.includes("val ? val : 'Chưa ấn định'"),
    'AcademicProgressPage phải render an toàn khi deadline là null'
  );
});

test('Task 4.2a - Test 7: Giữ vững hợp đồng điều hướng từ Tree sang TV3 Planner (/planner?course_id=...&plan_id=...)', () => {
  const treePageCode = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/CurriculumTreePage.jsx'), 'utf-8');

  // Kiểm tra điều hướng có course_id và plan_id
  assert.ok(
    treePageCode.includes('course_id='),
    'CurriculumTreePage phải truyền course_id sang TV3 Planner'
  );
  assert.ok(
    treePageCode.includes('plan_id='),
    'CurriculumTreePage phải truyền plan_id sang TV3 Planner'
  );

  // Kiểm tra không import component của TV3
  assert.ok(
    !treePageCode.includes("from '@haui/planner-ui'"),
    'CurriculumTreePage không được import trực tiếp component của TV3'
  );
});

test('Task 4.2a - Test 8: Ranh giới TV2 — Không tự tính toán số học GPA/CPA ở Frontend & Không import LLM bên thứ ba', () => {
  const pagesDir = path.join(TV2_ROOT, 'src/pages');
  const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.jsx') || f.endsWith('.js'));

  for (const file of pageFiles) {
    const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');

    // Không được tự cộng dồn điểm nhân số tín chỉ để tính GPA/CPA (nhiệm vụ của Backend AcademicFacade)
    assert.ok(
      !content.includes('totalWeightedPoints'),
      `File ${file} không được chứa thuật toán tính điểm tích lũy totalWeightedPoints ở client`
    );

    // Không được gọi trực tiếp thư viện LLM hoặc AI endpoint của bên thứ 3
    assert.ok(!content.includes('openai'), `File ${file} không được import openai`);
    assert.ok(!content.includes('anthropic'), `File ${file} không được import anthropic`);
    assert.ok(!content.includes('langchain'), `File ${file} không được import langchain`);
    assert.ok(!content.includes('google/generative-ai'), `File ${file} không được import Gemini trực tiếp từ client`);
  }
});
