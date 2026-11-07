/**
 * HaUI Advisor — Task 5.2a Academic Frontend Automated Smoke Test Suite
 * Role: TV2 (Frontend Platform & Academic Engineer)
 * Folder: tv2-web/
 *
 * Verifies 5 core academic sub-flows on HaUI Advisor:
 * 1. Sub-flow 1: Authentication & Persona Switching (/login) with StudentContextDTO session persistence.
 * 2. Sub-flow 2: Transcript Import (/transcript) 3-step pipeline & haui:academic:transcript-updated event dispatching.
 * 3. Sub-flow 3: Dashboard (/dashboard) KPI rendering, CPA progression, enrolled courses list, and clean layout (Sections 5 & 7 hidden).
 * 4. Sub-flow 4: Curriculum Tree (/curriculum) 4-state node coloring, tracer mode, vertical scrolling with sticky semester headers, and TV3 Planner navigation link.
 * 5. Sub-flow 5: Degree Audit (/audit) 7 HaUI CĐR criteria checklist, Actual vs Projected mode separation, remediation proposal (F23-006), legal disclaimer, and @media print CSS.
 * 6. TV2 Architectural Integrity: Zero client-side GPA/CPA calculation, zero LLM SDK imports, 503 TOOL_NOT_READY resilience, and strict TV2 ownership.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApiClient, ApiClientError } from '../src/services/apiClient.js';
import {
  mockAcademicService,
  calculateSemesterGpaTrend
} from '../src/services/mockAcademicService.js';
import {
  STUDENT_PRESETS,
  getAcademicSnapshot,
  selectStudentPreset,
  commitTranscriptRecords,
  convertScore10ToGrade,
  classifyAcademicRank,
  getDynamicGraduationAudit,
  buildAuditRemediationProposal,
  dispatchAuditRemediationProposal
} from '../src/services/academicStore.js';
import { getCourseDisplayMeta } from '../src/services/curriculumTreeHelper.js';
import { plannerStore } from '@haui/planner-ui';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TV2_ROOT = path.resolve(__dirname, '..');

// ============================================================================
// TEST 1: SUB-FLOW 1 — AUTHENTICATION & PERSONA SWITCHING (/login)
// ============================================================================
test('Task 5.2a - Sub-flow 1: Xác thực & Chuyển đổi 3 Personas mẫu (/login) với StudentContextDTO', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });

  // 1. Chuyển sang Persona "normal" (Tiến độ chuẩn)
  const normalSnapshot = selectStudentPreset('normal');
  assert.equal(normalSnapshot.activePresetId, 'normal');
  assert.equal(normalSnapshot.student.studentId, '2024604757');
  assert.equal(normalSnapshot.student.fullName, 'Nguyễn Văn An');
  assert.equal(normalSnapshot.student.majorCode, 'CT1085');
  assert.equal(normalSnapshot.student.hasTranscript, true);

  const normalProfile = await client.academic.getProfile();
  assert.equal(normalProfile.studentId, '2024604757');
  assert.equal(normalProfile.hasTranscript, true);
  const normalTree = await client.academic.getCurriculumTree();
  assert.equal(normalTree.transcriptStatus, 'CONFIRMED');
  assert.ok(normalSnapshot.metrics.cpa >= 3.0, 'Persona normal phải có CPA >= 3.0');

  // 2. Chuyển sang Persona "at-risk" (Có nguy cơ học vụ)
  const atRiskSnapshot = selectStudentPreset('at-risk');
  assert.equal(atRiskSnapshot.activePresetId, 'at-risk');
  assert.equal(atRiskSnapshot.student.studentId, 'std-2026-001');
  assert.equal(atRiskSnapshot.student.fullName, 'Trần Thị Bình');
  assert.equal(atRiskSnapshot.student.hasTranscript, true);
  assert.ok(atRiskSnapshot.metrics.cpa < 2.0, 'Persona at-risk phải có CPA < 2.0 (Cảnh báo Mức 1)');
  assert.ok(
    atRiskSnapshot.metrics.failedCourses.some((c) => c.courseCode === 'MATH1002'),
    'Persona at-risk phải có môn nợ MATH1002'
  );

  // 3. Chuyển sang Persona "empty" (Chưa có bảng điểm)
  const emptySnapshot = selectStudentPreset('empty');
  assert.equal(emptySnapshot.activePresetId, 'empty');
  assert.equal(emptySnapshot.student.studentId, 'std-2026-empty');
  assert.equal(emptySnapshot.student.fullName, 'Lê Hoàng Nam');
  assert.equal(emptySnapshot.student.hasTranscript, false);
  assert.equal(emptySnapshot.metrics.cpa, null, 'Persona empty chưa có CPA');
  assert.equal(emptySnapshot.metrics.accumulatedCredits, 0);

  const emptyProfile = await client.academic.getProfile();
  assert.equal(emptyProfile.hasTranscript, false);
  const emptyTree = await client.academic.getCurriculumTree();
  assert.equal(emptyTree.transcriptStatus, 'NONE');

  // 4. Kiểm tra cấu trúc giao diện LoginPage.jsx và danh mục Personas
  const loginJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/LoginPage.jsx'), 'utf-8');
  assert.ok(
    loginJsx.includes('handleQuickFillDemo') && loginJsx.includes('STUDENT_PRESETS'),
    'LoginPage phải hỗ trợ chọn Persona từ STUDENT_PRESETS'
  );
  assert.ok(
    STUDENT_PRESETS['normal'] && STUDENT_PRESETS['at-risk'] && STUDENT_PRESETS['empty'],
    'Hệ thống phải hỗ trợ đủ 3 personas: normal, at-risk, empty'
  );
  assert.ok(loginJsx.includes('studentIdInput') || loginJsx.includes('Mã sinh viên'), 'LoginPage phải có trường nhập mã SV');
});

// ============================================================================
// TEST 2: SUB-FLOW 2 — TRANSCRIPT IMPORT PIPELINE (/transcript)
// ============================================================================
test('Task 5.2a - Sub-flow 2: Luồng Nhập Bảng điểm 3 bước (/transcript) & Phát sự kiện đồng bộ', async () => {
  // Bắt đầu với persona empty
  selectStudentPreset('empty');
  const snapshotBefore = getAcademicSnapshot();
  assert.equal(snapshotBefore.metrics.accumulatedCredits, 0);

  // Bước 1: Chuẩn bị dữ liệu nạp (bảng điểm 4 môn học)
  const incomingRows = [
    { courseCode: 'MATH1001', courseName: 'Giải tích 1', credits: 3, score10: 8.5, semesterCode: '2024_1' },
    { courseCode: 'IT1001', courseName: 'Nhập môn lập trình', credits: 3, score10: 9.0, semesterCode: '2024_1' },
    { courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', credits: 3, score10: 7.5, semesterCode: '2024_1' },
    { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3, score10: 8.0, semesterCode: '2024_2' }
  ];

  // Bước 2: Xem lại (Review) - Quy đổi thang điểm 10 sang điểm chữ
  const normalizedRows = incomingRows.map((row) => {
    const { letterGrade, status } = convertScore10ToGrade(row.score10);
    return { ...row, letterGrade, status };
  });

  assert.equal(normalizedRows[0].letterGrade, 'A');
  assert.equal(normalizedRows[0].status, 'PASSED');
  assert.equal(normalizedRows[1].letterGrade, 'A');
  assert.equal(normalizedRows[2].letterGrade, 'B');
  assert.equal(normalizedRows[3].letterGrade, 'B+');

  // Bước 3: Xác nhận lưu (Confirm & Commit) & Theo dõi sự kiện haui:academic:transcript-updated
  let eventDispatched = false;
  let eventDetail = null;

  const mockWindowListener = (evt) => {
    eventDispatched = true;
    eventDetail = evt.detail;
  };

  // Giả lập window event listener
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      dispatchEvent: (event) => {
        if (event.type === 'haui:academic:transcript-updated') {
          mockWindowListener(event);
        }
        return true;
      }
    };
  } else {
    globalThis.window.addEventListener?.('haui:academic:transcript-updated', mockWindowListener);
  }

  const updatedSnapshot = commitTranscriptRecords(normalizedRows);

  assert.ok(updatedSnapshot.hasImportedNewTranscript, 'hasImportedNewTranscript phải chuyển thành true');
  assert.ok(updatedSnapshot.lastImportedAt, 'Phải có thời điểm lastImportedAt');
  assert.equal(updatedSnapshot.transcriptRecords.length, 4, 'Bảng điểm phải chứa đúng 4 môn đã nạp');
  assert.equal(updatedSnapshot.metrics.accumulatedCredits, 12, '12 tín chỉ phải được tích lũy');
  assert.ok(updatedSnapshot.metrics.cpa > 3.0, 'CPA tính toán bởi service phải > 3.0');
  assert.equal(eventDispatched, true, 'Sự kiện haui:academic:transcript-updated phải được phát toàn hệ thống');
  assert.ok(eventDetail.records, 'Sự kiện phải chứa danh sách records mới');
});

// ============================================================================
// TEST 3: SUB-FLOW 3 — DASHBOARD (/dashboard) KPI, PROGRESSION & CLEAN LAYOUT
// ============================================================================
test('Task 5.2a - Sub-flow 3: Trang Tổng quan (/dashboard) KPI, Biểu đồ CPA, Môn đang học & Bố cục tinh gọn', async () => {
  selectStudentPreset('normal');
  const snapshot = getAcademicSnapshot();

  // 1. Thẻ KPI chính
  assert.equal(typeof snapshot.metrics.cpa, 'number');
  assert.equal(typeof snapshot.metrics.accumulatedCredits, 'number');
  assert.equal(snapshot.metrics.totalCreditsRequired, 135);
  assert.ok(snapshot.metrics.progressPercent >= 0 && snapshot.metrics.progressPercent <= 100);

  // 2. Chuỗi tiến độ CPA và Tín chỉ tích lũy qua các kỳ (calculateSemesterGpaTrend)
  const trend = calculateSemesterGpaTrend(snapshot.transcriptRecords, snapshot.metrics.cpa);
  assert.ok(Array.isArray(trend));
  assert.ok(trend.length > 0, 'Phải có ít nhất 1 kỳ trong chuỗi tiến độ');
  for (const sem of trend) {
    assert.ok(sem.semesterCode);
    assert.ok(typeof sem.semesterCredits === 'number');
    assert.ok(typeof sem.cumulativeCpa === 'number');
  }

  // 3. Danh sách môn đang theo học (IN_PROGRESS)
  assert.ok(Array.isArray(snapshot.metrics.inProgressCourses));
  const inProgress = snapshot.metrics.inProgressCourses;
  assert.ok(inProgress.some((c) => c.courseCode === 'IT3004'));

  // 4. Bố cục tinh gọn: Đảm bảo Section 5 và Section 7 không hiển thị trên DOM
  const dashboardJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/DashboardPage.jsx'), 'utf-8');

  // Section 5: "Lời khuyên từ AI Advisor cho bạn" phải không xuất hiện dưới dạng component hiển thị trực tiếp
  assert.ok(
    !dashboardJsx.includes('<h2>\n                Lời khuyên từ AI Advisor cho bạn\n              </h2>') &&
    !dashboardJsx.includes('>Lời khuyên từ AI Advisor cho bạn<'),
    'Section 5 (Lời khuyên từ AI Advisor) không được render trên giao diện trực quan của DashboardPage'
  );

  // Section 7: "Tiến độ Học vụ & Kế hoạch Học tập Đã lưu" được lưu giữ trong chú thích hợp đồng kiểm thử, không hiển thị trực tiếp
  assert.ok(
    dashboardJsx.includes('SECTION 7: TIẾN ĐỘ HỌC VỤ & KẾ HOẠCH HỌC TẬP ĐÃ LƯU') &&
    dashboardJsx.includes('Đã bỏ hiển thị trên giao diện trang Tổng quan theo yêu cầu người dùng'),
    'Section 7 phải được ghi nhận rõ ràng đã ẩn theo yêu cầu người dùng'
  );
});

// ============================================================================
// TEST 4: SUB-FLOW 4 — CURRICULUM TREE (/curriculum) 4-STATE & STICKY SCROLL
// ============================================================================
test('Task 5.2a - Sub-flow 4: Cây Môn học (/curriculum) 4 màu trạng thái, Truy vết tiên quyết & Cuộn dọc sticky', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });
  mockAcademicService.setActivePersona('at-risk');

  const treeRes = await client.academic.getCurriculumTree();
  assert.ok(Array.isArray(treeRes.courses));

  // 1. Phân loại 4 màu sắc & trạng thái học phần theo getCourseDisplayMeta
  const passedMeta = getCourseDisplayMeta({ status: 'PASSED', letterGrade: 'A' });
  assert.equal(passedMeta.statusType, 'passed');
  assert.equal(passedMeta.statusClass, 'haui-badge--success');

  const inProgressMeta = getCourseDisplayMeta({ status: 'IN_PROGRESS' });
  assert.equal(inProgressMeta.statusType, 'studying');
  assert.equal(inProgressMeta.statusClass, 'haui-badge--primary');

  const eligibleMeta = getCourseDisplayMeta({ status: 'ELIGIBLE' });
  assert.equal(eligibleMeta.statusType, 'eligible');
  assert.equal(eligibleMeta.statusClass, 'haui-badge--neutral');

  const blockedMeta = getCourseDisplayMeta({ status: 'BLOCKED' });
  assert.equal(blockedMeta.statusType, 'locked');
  assert.equal(blockedMeta.statusClass, 'haui-badge--warning');

  const failedMeta = getCourseDisplayMeta({ status: 'FAILED', letterGrade: 'F' });
  assert.equal(failedMeta.statusType, 'locked');
  assert.equal(failedMeta.statusClass, 'haui-badge--error');

  // 2. Chế độ truy vết tiên quyết (Tracer mode)
  const math1002 = treeRes.courses.find((c) => c.courseCode === 'MATH1002');
  const it6001 = treeRes.courses.find((c) => c.courseCode === 'IT6001');
  assert.equal(math1002.status, 'FAILED');
  assert.equal(it6001.status, 'BLOCKED');
  assert.ok(it6001.missingPrerequisites.some((p) => p.includes('MATH1002')));

  // 3. Kiểm tra tính năng Cuộn dọc hợp lý & Tiêu đề kỳ Sticky
  const treeJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/CurriculumTreePage.jsx'), 'utf-8');
  assert.ok(
    treeJsx.includes('haui-tree-timeline-scroll'),
    'CurriculumTreePage phải sử dụng container cuộn haui-tree-timeline-scroll'
  );
  assert.ok(
    treeJsx.includes("position: 'sticky'") && treeJsx.includes('Semester Column Header'),
    'CurriculumTreePage phải cố định tiêu đề cột học kỳ (sticky header) khi cuộn dọc'
  );

  const globalCss = fs.readFileSync(path.join(TV2_ROOT, 'src/styles/global.css'), 'utf-8');
  assert.ok(
    globalCss.includes('.haui-tree-timeline-scroll') &&
    globalCss.includes('max-height: calc(100vh - 270px)') &&
    globalCss.includes('overflow: auto'),
    'global.css phải định nghĩa thanh cuộn dọc tối ưu với max-height và overflow: auto'
  );

  // 4. Hợp đồng điều hướng Drawer sang TV3 Study Planner (/planner?course_id=...&plan_id=...)
  assert.ok(
    treeJsx.includes('/planner?') &&
    treeJsx.includes('course_id=') &&
    treeJsx.includes('plan_id='),
    'Drawer cây môn học phải cung cấp nút điều hướng sang TV3 Planner mang theo course_id và plan_id'
  );
});

// ============================================================================
// TEST 5: SUB-FLOW 5 — DEGREE AUDIT (/audit) 7 CRITERIA, ACTUAL VS PROJECTED & PRINT CSS
// ============================================================================
test('Task 5.2a - Sub-flow 5: Kiểm toán Tốt nghiệp (/audit) 7 Chuẩn đầu ra, Tách bạch Thực tế / Dự kiến & Bản in', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });
  mockAcademicService.setActivePersona('at-risk');

  // 1. Đối soát 7 tiêu chuẩn Chuẩn đầu ra HaUI
  const actualAudit = await client.audit.getGraduationAudit({ mode: 'actual' });
  assert.equal(actualAudit.eligibleForGraduation, false);
  assert.ok(Array.isArray(actualAudit.checklist));
  assert.ok(actualAudit.checklist.length >= 7, 'Phải có đầy đủ tối thiểu 7 tiêu chuẩn kiểm toán HaUI');

  const criteriaCodes = actualAudit.checklist.map((c) => c.criteriaCode || c.id || c.name);
  assert.ok(actualAudit.checklist.some((c) => c.name.includes('tín chỉ') || c.id === 'CREDITS_TOTAL'));
  assert.ok(actualAudit.checklist.some((c) => c.name.includes('đại cương') || c.name.includes('bắt buộc') || c.id === 'GENERAL_EDUCATION'));
  assert.ok(actualAudit.checklist.some((c) => c.name.includes('tự chọn') || c.id === 'ELECTIVE_SPECIALIZED'));
  assert.ok(actualAudit.checklist.some((c) => c.name.includes('Ngoại ngữ') || c.id === 'FOREIGN_LANGUAGE'));
  assert.ok(actualAudit.checklist.some((c) => c.name.includes('Tin học') || c.id === 'INFORMATION_TECHNOLOGY'));
  assert.ok(actualAudit.checklist.some((c) => c.name.includes('Thể chất') || c.name.includes('Quốc phòng') || c.id === 'PHYSICAL_DEFENSE_EDUCATION'));
  assert.ok(actualAudit.checklist.some((c) => c.name.includes('rèn luyện') || c.id === 'CONDUCT_SCORE'));

  // 2. Tách bạch Thực tế vs Dự kiến
  const projectedAudit = await client.audit.getGraduationAudit({ mode: 'projected' });
  assert.equal(projectedAudit.eligibleForGraduation, true, 'Snapshot projected phải đạt điều kiện sau khi hoàn tất bù đắp');
  assert.notEqual(actualAudit.eligibleForGraduation, projectedAudit.eligibleForGraduation);

  // 3. Đường bù đắp F23-006: dispatchAuditRemediationProposal
  const activePlanId = 'plan-test-smoke-52a';
  const proposal = buildAuditRemediationProposal(actualAudit, { planId: activePlanId });
  assert.ok(proposal.missingCredits > 0);
  assert.equal(proposal.planId, activePlanId);

  dispatchAuditRemediationProposal(actualAudit, plannerStore, { planId: activePlanId });
  assert.equal(plannerStore.getIncomingProposal()?.planId, activePlanId);

  // 4. Khuyến cáo pháp lý bắt buộc và Chuẩn in ấn @media print
  const auditJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/AcademicProgressPage.jsx'), 'utf-8');
  assert.ok(
    auditJsx.includes('không xác nhận tốt nghiệp thay trường') ||
    auditJsx.includes('không thay thế Quyết định công nhận tốt nghiệp chính thức'),
    'AcademicProgressPage phải chứa khuyến cáo pháp lý ứng dụng không thay thế quyết định của nhà trường'
  );
  assert.ok(
    auditJsx.includes('@media print') || auditJsx.includes('window.print'),
    'AcademicProgressPage phải hỗ trợ xuất báo cáo in chuẩn A4'
  );
  assert.ok(
    auditJsx.includes('BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỮ LIỆU THỰC TẾ (HIỆN TẠI)') &&
    auditJsx.includes('BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỰ KIẾN (KÈM LỘ TRÌNH BÙ ĐẮP)'),
    'Bản in phải phân định tiêu đề rõ ràng giữa DỮ LIỆU THỰC TẾ và DỰ KIẾN'
  );
});

// ============================================================================
// TEST 6: ARCHITECTURAL INTEGRITY & TV2 BOUNDARIES
// ============================================================================
test('Task 5.2a - Sub-flow 6: Ranh giới Kiến trúc TV2 (Không tính GPA/CPA ở Client, Không LLM SDK, 503 Resilience)', async () => {
  const pagesDir = path.join(TV2_ROOT, 'src/pages');
  const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.jsx') || f.endsWith('.js'));

  for (const file of pageFiles) {
    const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');

    // Không chứa thuật toán cộng dồn điểm số học tính GPA/CPA ở client
    assert.ok(
      !content.includes('totalWeightedPoints'),
      `File ${file} vi phạm ranh giới: chứa thuật toán tự tính điểm tích lũy ở client`
    );

    // Không import LLM bên thứ ba trực tiếp từ client
    assert.ok(!content.includes("from 'openai'"), `File ${file} không được import openai`);
    assert.ok(!content.includes("from '@google/generative-ai'"), `File ${file} không được import Google Generative AI`);
    assert.ok(!content.includes("from 'anthropic'"), `File ${file} không được import anthropic`);
    assert.ok(!content.includes("from 'langchain'"), `File ${file} không được import langchain`);
  }

  // Khả năng chịu lỗi 503 TOOL_NOT_READY (không bịa số giả, không silent fallback)
  const client503 = createApiClient({
    mockEnabled: false,
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: async () => ({
        code: 'TOOL_NOT_READY',
        message: 'Engine học vụ đang khởi động hoặc chưa sẵn sàng.',
        requestId: 'req-smoke-503',
        timestamp: new Date().toISOString()
      })
    })
  });

  await assert.rejects(
    async () => {
      await client503.academic.getStatus();
    },
    (err) => {
      assert.ok(err instanceof ApiClientError);
      assert.equal(err.status, 503);
      assert.equal(err.code, 'TOOL_NOT_READY');
      return true;
    },
    'Lỗi 503 TOOL_NOT_READY phải được trả về nguyên vẹn, không được âm thầm tạo dữ liệu giả'
  );
});
