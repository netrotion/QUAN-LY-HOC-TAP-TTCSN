/**
 * Task 3.9 Test Suite: Graduation Audit, Dashboard Progress, Old Plan Button, Print CSS & Report
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 * Milestone: audit-ui-ready
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tv2Root = path.resolve(__dirname, '..');

test('Task 3.9 - Test 1: Bảng Kiểm toán Tốt nghiệp 100% và 3 Trạng thái (ĐẠT / THIẾU / CHƯA BIẾT)', async () => {
  const { api } = await import('../src/services/apiClient.js');
  const { mockAcademicService } = await import('../src/services/mockAcademicService.js');

  // Đảm bảo persona at-risk
  mockAcademicService.setActivePersona('at-risk');
  const auditRes = await api.audit.getGraduationAudit({ mode: 'actual' });

  assert.equal(auditRes.checklist.length, 7, 'Audit Checklist phải đủ 7 hạng mục');
  assert.equal(auditRes.completedPercentage, 82, 'Tiến độ thực tế sinh viên phải là 82%');
  assert.equal(auditRes.accumulatedCredits, 112, 'Tín chỉ tích lũy thực tế phải là 112 TC');
  assert.equal(auditRes.totalCreditsRequired, 135, 'Tổng tín chỉ CTĐT phải là 135 TC');
  assert.equal(auditRes.eligibleForGraduation, false, 'Sinh viên còn thiếu điều kiện nên chưa được tốt nghiệp');

  // 1. Trạng thái ĐẠT (completed === true)
  const passedItems = auditRes.checklist.filter((c) => c.completed === true);
  assert.ok(passedItems.length >= 4, 'Phải có các hạng mục ĐẠT (Khối bắt buộc, Ngoại ngữ, GDTC/GDQP-AN, Điểm rèn luyện)');
  assert.ok(passedItems.some((c) => c.category.includes('KHỐI BẮT BUỘC')));
  assert.ok(passedItems.some((c) => c.category.includes('CHUẨN NGOẠI NGỮ')));

  // 2. Trạng thái THIẾU (completed === false)
  const missingItems = auditRes.checklist.filter((c) => c.completed === false);
  assert.ok(missingItems.length >= 2, 'Phải có các hạng mục THIẾU (Tín chỉ tích lũy, Tự chọn chuyên ngành, Tin học MOS)');
  assert.ok(missingItems.some((c) => c.category.includes('CHUẨN TIN HỌC')));

  // 3. Trạng thái CHƯA BIẾT / CHỜ DUYỆT (completed === null hoặc undefined)
  // Kiểm tra logic render trong AcademicProgressPage.jsx hỗ trợ badge trung tính
  const progressJsx = fs.readFileSync(path.join(tv2Root, 'src/pages/AcademicProgressPage.jsx'), 'utf-8');
  assert.ok(
    progressJsx.includes('ĐẠT</span>'),
    'Giao diện phải render nhãn ĐẠT ngắn gọn'
  );
  assert.ok(
    progressJsx.includes('CÒN THIẾU') || progressJsx.includes('CẢNH BÁO ĐỎ'),
    'Giao diện phải render nhãn CÒN THIẾU hoặc CẢNH BÁO ĐỎ'
  );
  assert.ok(
    progressJsx.includes('CHƯA XÁC ĐỊNH / CHỜ DUYỆT'),
    'Giao diện phải render nhãn CHƯA XÁC ĐỊNH / CHỜ DUYỆT cho trạng thái thứ 3 (unknown/null)'
  );

  // Kiểm tra cảnh báo sớm AC-05 cho chứng chỉ MOS
  assert.ok(auditRes.pendingActions.some((a) => a.certificateType === 'MOS'));
  const mosAction = auditRes.pendingActions.find((a) => a.certificateType === 'MOS');
  assert.equal(mosAction.deadline, '2027-03-31');
  assert.equal(mosAction.status, 'PENDING');
});

test('Task 3.9 - Test 2: Phân định rạch ròi giữa Báo cáo Thực tế (Hiện tại) và Báo cáo Dự kiến (Kèm Lộ trình Bù đắp)', async () => {
  const { api } = await import('../src/services/apiClient.js');

  // 1. Lấy Báo cáo Thực tế
  const actualAudit = await api.audit.getGraduationAudit({ mode: 'actual' });
  assert.equal(actualAudit.reportType, 'ACTUAL');
  assert.equal(actualAudit.completedPercentage, 82);
  assert.equal(actualAudit.accumulatedCredits, 112);
  assert.equal(actualAudit.eligibleForGraduation, false);
  assert.ok(actualAudit.pendingActions.length > 0, 'Báo cáo thực tế phải còn điều kiện tồn đọng');

  // 2. Lấy Báo cáo Dự kiến (Sau bù đắp)
  const projectedAudit = await api.audit.getGraduationAudit({ mode: 'projected' });
  assert.equal(projectedAudit.reportType, 'PROJECTED');
  assert.equal(projectedAudit.completedPercentage, 100, 'Báo cáo dự kiến phải đạt 100% tiến độ');
  assert.equal(projectedAudit.accumulatedCredits, 135, 'Báo cáo dự kiến phải đạt 135/135 TC');
  assert.equal(projectedAudit.eligibleForGraduation, true, 'Báo cáo dự kiến đủ điều kiện tốt nghiệp');
  assert.ok(projectedAudit.expectedDegreeRank.includes('Giỏi'), 'Dự kiến xếp loại Giỏi (CPA 3.25)');
  assert.equal(projectedAudit.pendingActions.length, 0, 'Dự kiến đã bù đắp xong toàn bộ chứng chỉ và học phần');

  // Kiểm tra 7 mục của Báo cáo Dự kiến đều ĐẠT
  assert.equal(projectedAudit.checklist.every((c) => c.completed === true), true);
  assert.ok(projectedAudit.checklist.some((c) => c.statusMessage.includes('Dự kiến')));
});

test('Task 3.9 - Test 3: Bản in (@media print) TUYỆT ĐỐI KHÔNG để lẫn Dự kiến với Thực tế', () => {
  const progressJsx = fs.readFileSync(path.join(tv2Root, 'src/pages/AcademicProgressPage.jsx'), 'utf-8');
  const globalCss = fs.readFileSync(path.join(tv2Root, 'src/styles/global.css'), 'utf-8');

  // 1. Phân định tiêu đề in
  assert.ok(
    progressJsx.includes('BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỮ LIỆU THỰC TẾ (HIỆN TẠI)'),
    'Bản in Thực tế phải có tiêu đề chính thức DỮ LIỆU THỰC TẾ (HIỆN TẠI)'
  );
  assert.ok(
    progressJsx.includes('BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỰ KIẾN (KÈM LỘ TRÌNH BÙ ĐẮP)'),
    'Bản in Dự kiến phải có tiêu đề rõ ràng DỰ KIẾN (KÈM LỘ TRÌNH BÙ ĐẮP)'
  );

  // 2. Banner và Badge in ấn phân loại
  assert.ok(
    progressJsx.includes('haui-print-badge--actual') && progressJsx.includes('haui-print-badge--projected'),
    'Phải có badge in ấn chuyên biệt cho cả 2 loại báo cáo'
  );
  assert.ok(
    progressJsx.includes('BÁO CÁO MÔ PHỎNG DỰ KIẾN (SIMULATION ONLY) — KHÔNG THAY THẾ BẢNG ĐIỂM CHÍNH THỨC'),
    'Bản in Dự kiến bắt buộc phải có Watermark / Nhãn cảnh báo không thay thế bảng điểm'
  );

  // 3. Disclaimer pháp lý bắt buộc trong bản in
  assert.ok(
    progressJsx.includes('haui-print-disclaimer--actual') && progressJsx.includes('haui-print-disclaimer--projected'),
    'Phải có khối disclaimer pháp lý trong bản in'
  );
  assert.ok(
    progressJsx.includes('TUYỆT ĐỐI KHÔNG CÓ GIÁ TRỊ PHÁP LÝ XÉT TỐT NGHIỆP CHÍNH THỨC'),
    'Bản in Dự kiến phải có cảnh báo pháp lý không có giá trị xét tốt nghiệp chính thức'
  );

  // 4. Khối chữ ký xác nhận phù hợp ngữ cảnh
  assert.ok(
    progressJsx.includes('Xác nhận Kế hoạch Học tập Bù đắp Dự kiến') &&
    progressJsx.includes('Xác nhận Báo cáo Kết quả Học tập và Rà soát Điều kiện Tốt nghiệp Thực tế'),
    'Khối chữ ký in phải phân biệt giữa cam kết bù đắp dự kiến và xác nhận kết quả thực tế'
  );

  // 5. CSS Print rules
  assert.ok(globalCss.includes('@media print'));
  assert.ok(globalCss.includes('.haui-report-mode-switcher'));
  assert.ok(globalCss.includes('.haui-print-title'));
  assert.ok(globalCss.includes('.haui-print-badge--actual'));
  assert.ok(globalCss.includes('.haui-print-badge--projected'));
  assert.ok(globalCss.includes('.haui-print-disclaimer--projected'));
  assert.ok(globalCss.includes('A4 portrait'));
});

test('Task 3.9 - Test 4: Đường bù đắp Audit (F23-006) và Nút Lập kế hoạch bù đắp', async () => {
  const {
    buildAuditRemediationProposal,
    dispatchAuditRemediationProposal,
    getDynamicGraduationAudit
  } = await import('../src/services/academicStore.js');

  let plannerStore = null;
  try {
    const mod = await import('@haui/planner-ui');
    plannerStore = mod.plannerStore;
  } catch {
    const fallbackMod = await import('../../tv3-planner-ui/src/index.js');
    plannerStore = fallbackMod.plannerStore;
  }

  const actualAudit = getDynamicGraduationAudit('actual');
  const proposal = buildAuditRemediationProposal(actualAudit);

  // Kiểm tra payload đề xuất
  assert.equal(proposal.sourceName, 'Graduation Audit (Kiểm toán tốt nghiệp)');
  assert.equal(proposal.projectedCpa, 3.25);
  assert.equal(proposal.semesters.length, 2);
  assert.equal(proposal.semesters[0].totalCredits, 15);
  assert.equal(proposal.semesters[1].totalCredits, 10);

  // Kiểm tra CustomEvent và nạp vào plannerStore
  plannerStore.dismissProposal();
  dispatchAuditRemediationProposal(actualAudit, plannerStore);
  const incoming = plannerStore.getIncomingProposal();
  assert.ok(incoming, 'plannerStore phải nhận được proposal từ Audit');
  assert.equal(incoming.sourceName, 'Graduation Audit (Kiểm toán tốt nghiệp)');
  assert.equal(incoming.projectedCpa, 3.25);

  // Dọn dẹp
  plannerStore.dismissProposal();
});

test('Task 3.9 - Test 5: Tiến độ Dashboard và Nút Mở Kế hoạch Học tập Đã lưu', () => {
  const dashboardJsx = fs.readFileSync(path.join(tv2Root, 'src/pages/DashboardPage.jsx'), 'utf-8');

  // 1. Kiểm tra có nút mở kế hoạch cũ
  assert.ok(
    dashboardJsx.includes('Mở Kế hoạch Học tập Đã lưu &rarr;'),
    'DashboardPage phải có nút mở kế hoạch cũ đã lưu'
  );
  assert.ok(
    dashboardJsx.includes('/planner?plan_id='),
    'Nút mở kế hoạch cũ phải điều hướng sang /planner kèm plan_id'
  );

  // 2. Kiểm tra có nút chuyển nhanh sang Kiểm toán tốt nghiệp
  assert.ok(
    dashboardJsx.includes('Kiểm toán Tốt nghiệp & Báo cáo in') ||
    dashboardJsx.includes('Kiểm toán Tốt nghiệp (Audit)'),
    'DashboardPage phải có nút lối tắt sang Kiểm toán tốt nghiệp / Báo cáo in'
  );

  // 3. Khối tiến độ học vụ & kế hoạch đã lưu Task 3.9
  assert.ok(
    dashboardJsx.includes('Tiến độ Học vụ & Kế hoạch Học tập Đã lưu'),
    'DashboardPage phải có khối hiển thị Tiến độ học vụ và Kế hoạch đã lưu'
  );
  assert.ok(dashboardJsx.includes('plan-2026-9001'));
  assert.ok(dashboardJsx.includes('ACTIVE'));
});

test('Task 3.9 - Test 6: Ranh giới Kiến trúc & Sở hữu của TV2', () => {
  const targetFiles = [
    'src/pages/AcademicProgressPage.jsx',
    'src/pages/GraduationAuditPage.jsx',
    'src/pages/DashboardPage.jsx',
    'src/services/academicStore.js',
    'src/services/mockAcademicService.js'
  ];

  for (const rel of targetFiles) {
    const full = path.join(tv2Root, rel);
    assert.equal(fs.existsSync(full), true, `File ${rel} phải tồn tại`);
    const code = fs.readFileSync(full, 'utf-8');
    assert.equal(
      /openai|anthropic|@google\/generative-ai|langchain/i.test(code),
      false,
      `File ${rel} tuyệt đối không được import SDK LLM ở Frontend client`
    );
  }
});
