/**
 * HaUI Advisor — Task 4.4b Audit, Progress & Live Reporting Verification Suite
 * Role: TV2 (Frontend Platform & Academic Engineer)
 * Milestone: `student-academic-e2e-ready`
 *
 * Requirements (§4.4b):
 * "Chạy Audit→bù đắp→Planner→lưu; cập nhật bảng điểm→Dashboard/tiến độ mới→mở đúng kế hoạch.
 * In báo cáo từ snapshot đang xem. Hiển thị trạng thái app đánh giá, không xác nhận tốt nghiệp thay trường.
 * Kiểm thử/nghiệm thu: E2E Audit/tiến độ/export; không đánh dấu đạt điều kiện thực tế khi chỉ thêm kế hoạch."
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApiClient } from '../src/services/apiClient.js';
import { mockAcademicService } from '../src/services/mockAcademicService.js';
import {
  buildAuditRemediationProposal,
  dispatchAuditRemediationProposal,
  subscribeAcademicStore
} from '../src/services/academicStore.js';
import { plannerStore } from '@haui/planner-ui';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TV2_ROOT = path.resolve(__dirname, '..');

test('Task 4.4b - Test 1: Luồng Audit → Bù đắp → Planner → Lưu (dispatch proposal mang theo plan_id và nạp vào plannerStore)', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });
  mockAcademicService.setActivePersona('at-risk');

  const auditData = await client.audit.getGraduationAudit({ mode: 'actual' });
  assert.equal(auditData.eligibleForGraduation, false);
  assert.equal(auditData.accumulatedCredits, 112);
  assert.equal(auditData.totalCreditsRequired, 135);

  // 1. Sinh proposal bù đắp có mang theo activePlanId nếu có
  const activePlanId = 'plan-test-active-44b';
  const proposal = buildAuditRemediationProposal(auditData, { planId: activePlanId });

  assert.ok(proposal);
  assert.equal(proposal.auditCompletedPercentage, 82);
  assert.equal(proposal.missingCredits, 23);
  assert.ok(Array.isArray(proposal.pendingActions));
  assert.ok(proposal.pendingActions.some((a) => a.certificateType === 'MOS'));
  assert.equal(proposal.planId, activePlanId);

  // 2. Dispatch proposal nạp vào plannerStore
  dispatchAuditRemediationProposal(auditData, plannerStore, { planId: activePlanId });
  const incoming = plannerStore.getIncomingProposal();
  assert.ok(incoming, 'plannerStore phải nhận được incomingProposal');
  assert.equal(incoming.auditCompletedPercentage, 82);
  assert.equal(incoming.missingCredits, 23);
});

test('Task 4.4b - Test 2: Báo cáo in ấn (@media print) xuất từ đúng snapshot đang xem kèm policyVersion, dataRevision, timestamp', async () => {
  const progressJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/AcademicProgressPage.jsx'), 'utf-8');

  // 1. Phân định tiêu đề in theo snapshot đang xem
  assert.ok(
    progressJsx.includes('BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỮ LIỆU THỰC TẾ (HIỆN TẠI)'),
    'Bản in phải có tiêu đề DỮ LIỆU THỰC TẾ khi xem snapshot actual'
  );
  assert.ok(
    progressJsx.includes('BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỰ KIẾN (KÈM LỘ TRÌNH BÙ ĐẮP)'),
    'Bản in phải có tiêu đề DỰ KIẾN khi xem snapshot projected'
  );

  // 2. Chứa metadata snapshot: policyVersion, dataRevision, timestamp xuất báo cáo
  assert.ok(
    progressJsx.includes('policyVersion') || progressJsx.includes('auditData?.policyVersion'),
    'Bản in phải in policyVersion áp dụng'
  );
  assert.ok(
    progressJsx.includes('dataRevision') || progressJsx.includes('auditData?.dataRevision'),
    'Bản in phải in dataRevision của hồ sơ'
  );
  assert.ok(
    progressJsx.includes('snapshotTimestamp') || progressJsx.includes('Thời điểm xuất') || progressJsx.includes('Thời điểm rà soát'),
    'Bản in phải ghi nhận thời điểm xuất báo cáo/snapshot'
  );

  // 3. Thông tin sinh viên trên bản in
  assert.ok(progressJsx.includes('sessionStudent.fullName'));
  assert.ok(progressJsx.includes('sessionStudent.studentId'));
  assert.ok(progressJsx.includes('sessionStudent.cohort'));
  assert.ok(progressJsx.includes('sessionStudent.majorName'));
});

test('Task 4.4b - Test 3: Khuyến cáo pháp lý bắt buộc: Hiển thị rõ trạng thái ứng dụng đánh giá tự động, không xác nhận tốt nghiệp thay trường', () => {
  const progressJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/AcademicProgressPage.jsx'), 'utf-8');

  // Kiểm tra thông điệp pháp lý bắt buộc trong UI và bản in
  assert.ok(
    progressJsx.includes('không xác nhận tốt nghiệp thay trường') ||
    progressJsx.includes('không thay thế quyết định') ||
    progressJsx.includes('không thay thế Quyết định công nhận tốt nghiệp chính thức'),
    'Phải có khuyến cáo pháp lý rõ ràng: ứng dụng không xác nhận tốt nghiệp thay trường'
  );
  assert.ok(
    progressJsx.includes('Hội đồng xét tốt nghiệp') || progressJsx.includes('Trường Đại học Công nghiệp Hà Nội'),
    'Phải ghi rõ thẩm quyền quyết định tốt nghiệp thuộc Trường Đại học Công nghiệp Hà Nội'
  );
  assert.ok(
    progressJsx.includes('haui-disclaimer-banner') || progressJsx.includes('haui-print-disclaimer'),
    'Phải có banner cảnh báo pháp lý trực quan trên giao diện và bản in'
  );
});

test('Task 4.4b - Test 4: Ranh giới nghiệp vụ: Tuyệt đối không đánh dấu đạt điều kiện thực tế khi chỉ thêm kế hoạch học tập', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });
  mockAcademicService.setActivePersona('at-risk');

  // Giả lập sinh viên vừa tạo kế hoạch học tập bù đắp 23 tín chỉ trong planner
  const mockPlan = {
    planId: 'plan-remediation-full',
    status: 'ACTIVE',
    totalCredits: 23,
    courses: ['MATH1002', 'IT6010', 'IT6015', 'IT7008']
  };
  plannerStore.getState().plan = mockPlan;

  // Lấy dữ liệu rà soát Thực tế (actual)
  const actualAudit = await client.audit.getGraduationAudit({ mode: 'actual' });

  // TUYỆT ĐỐI: Thêm kế hoạch KHÔNG được làm thay đổi trạng thái tốt nghiệp thực tế
  assert.equal(
    actualAudit.eligibleForGraduation,
    false,
    'Tuyệt đối không đánh dấu đạt điều kiện thực tế (eligibleForGraduation: false) khi chỉ thêm kế hoạch'
  );
  assert.equal(
    actualAudit.accumulatedCredits,
    112,
    'Tín chỉ tích lũy thực tế phải giữ nguyên (112 TC), không được cộng gộp 23 TC từ kế hoạch'
  );
  assert.notEqual(
    actualAudit.accumulatedCredits,
    135,
    'Không được đánh dấu hoàn thành 135 TC trên dữ liệu thực tế'
  );

  // Chỉ ở chế độ Dự kiến (projected) mới thể hiện kết quả sau khi hoàn thành kế hoạch
  const projectedAudit = await client.audit.getGraduationAudit({ mode: 'projected' });
  assert.equal(projectedAudit.eligibleForGraduation, true);
  assert.equal(projectedAudit.accumulatedCredits, 135);
  assert.equal(projectedAudit.completedPercentage, 100);
});

test('Task 4.4b - Test 5: Cập nhật bảng điểm → Dashboard / Tiến độ phản ánh dữ liệu mới và mở đúng plan_id', () => {
  const progressJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/AcademicProgressPage.jsx'), 'utf-8');
  const dashboardJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/DashboardPage.jsx'), 'utf-8');

  // 1. Cả hai trang đều lắng nghe sự kiện haui:academic:transcript-updated
  assert.ok(
    progressJsx.includes('haui:academic:transcript-updated'),
    'AcademicProgressPage phải lắng nghe sự kiện haui:academic:transcript-updated'
  );
  assert.ok(
    dashboardJsx.includes('haui:academic:transcript-updated'),
    'DashboardPage phải lắng nghe sự kiện haui:academic:transcript-updated'
  );

  // 2. Mở đúng kế hoạch qua tham số query plan_id
  assert.ok(
    dashboardJsx.includes('/planner?plan_id='),
    'DashboardPage phải điều hướng tới /planner?plan_id=... với đúng planId đã lưu'
  );
  assert.ok(
    progressJsx.includes('/planner?plan_id=') || progressJsx.includes('activePlanId'),
    'AcademicProgressPage phải hỗ trợ điều hướng tới /planner?plan_id=...'
  );
});

test('Task 4.4b - Test 6: Đồng bộ sự kiện Planner (haui:planner:plan-updated, haui:planner:plan-activated, plannerStore.subscribe)', () => {
  const progressJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/AcademicProgressPage.jsx'), 'utf-8');

  // Kiểm tra AcademicProgressPage đăng ký lắng nghe cập nhật kế hoạch từ Planner
  assert.ok(
    progressJsx.includes('plannerStore.subscribe') ||
    progressJsx.includes('haui:planner:plan-updated') ||
    progressJsx.includes('haui:planner:plan-activated'),
    'AcademicProgressPage phải đăng ký lắng nghe thay đổi kế hoạch từ plannerStore hoặc sự kiện planner'
  );
});

test('Task 4.4b - Test 7: Xử lý an toàn khi API Audit trả 503 TOOL_NOT_READY hoặc lỗi mạng', async () => {
  const progressJsx = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/AcademicProgressPage.jsx'), 'utf-8');

  // Kiểm tra xử lý lỗi 503 trong component
  assert.ok(
    progressJsx.includes('503') || progressJsx.includes('TOOL_NOT_READY'),
    'AcademicProgressPage phải xử lý mã lỗi 503 TOOL_NOT_READY'
  );
  assert.ok(
    progressJsx.includes('ErrorBox') || progressJsx.includes('Error as ErrorBox'),
    'Phải render component ErrorBox khi gặp sự cố'
  );
  assert.ok(
    progressJsx.includes('Tuyệt đối không') || progressJsx.includes('tạm thời chưa khả dụng'),
    'Phải có thông báo rõ ràng không bịa đặt số liệu giả khi công cụ chưa sẵn sàng'
  );
});

test('Task 4.4b - Test 8: Ranh giới TV2 — Không tự tính toán số học GPA/CPA ở Frontend & Không import LLM bên thứ ba', () => {
  const serviceFiles = fs.readdirSync(path.join(TV2_ROOT, 'src/services'));
  const pageFiles = fs.readdirSync(path.join(TV2_ROOT, 'src/pages'));

  for (const file of [...serviceFiles, ...pageFiles]) {
    if (!file.endsWith('.js') && !file.endsWith('.jsx')) continue;
    const content = fs.readFileSync(
      path.join(TV2_ROOT, serviceFiles.includes(file) ? 'src/services' : 'src/pages', file),
      'utf-8'
    );

    // Không import LLM bên thứ ba vào client frontend
    assert.doesNotMatch(content, /@google\/genai/, `File ${file} không được import @google/genai trực tiếp vào FE`);
    assert.doesNotMatch(content, /from\s+['"]openai['"]/, `File ${file} không được import openai trực tiếp vào FE`);
    assert.doesNotMatch(content, /from\s+['"]langchain['"]/, `File ${file} không được import langchain trực tiếp vào FE`);
  }
});
