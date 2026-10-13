/**
 * HaUI Advisor — Academic Store & State Management (Task 3.4 - Contract V1 Mock)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Quản lý trạng thái Frontend thống nhất cho:
 * 1. Danh tính & Phiên sinh viên (Student Personas: normal, at-risk, empty)
 * 2. Xác thực (Login / Logout / Switch Persona)
 * 3. Hồ sơ bảng điểm (Transcript Records, Review & Confirm)
 * 4. Quy tắc học vụ: Toàn bộ việc tính toán CPA, GPA, Tín chỉ tích lũy và Cảnh báo học vụ
 *    do Mock Academic Service đảm nhiệm (Server-side simulation), không tự tính ở client.
 * 5. Tiến độ kiểm toán tốt nghiệp (Graduation Audit 100%)
 * 6. Sơ đồ cây môn học & Trạng thái 4 màu sắc (Green, Yellow, Gray, Red)
 */

import {
  FIXTURE_TAG,
  UNVERIFIED_RULE_TAG,
  MOCK_GRADUATION_AUDIT
} from './mockFixtures.js';
import {
  mockAcademicService,
  computeServerAcademicMetrics
} from './mockAcademicService.js';

/**
 * 3 Tài khoản mẫu theo đặc tả Task 3.4:
 * - normal: Sinh viên bình thường (ngành KTPM/CNTT, tiến độ chuẩn, CPA 3.05, không nợ môn)
 * - at-risk: Sinh viên có nguy cơ học vụ (CPA < 2.0 (1.85), nợ môn tiên quyết MATH1002)
 * - empty: Sinh viên mới (chưa có dữ liệu bảng điểm, CPA null, tích lũy 0 TC)
 */
export const STUDENT_PRESETS = Object.freeze({
  normal: {
    id: 'normal',
    studentId: '2024604757',
    student_id: '2024604757',
    fullName: 'Nguyễn Văn An',
    full_name: 'Nguyễn Văn An',
    email: 'annv@sv.haui.edu.vn',
    cohort: 'K17 (2022 - 2026)',
    majorCode: 'CT1085',
    major_id: 'CT1085',
    majorName: 'Kỹ thuật phần mềm (CNTT)',
    faculty: 'Trường Công nghệ thông tin và Truyền thông - HaUI',
    className: '2022DHKTPM01',
    avatarChar: 'A',
    presetLabel: 'Sinh viên tiến độ chuẩn',
    badgeType: 'success',
    badgeText: '✓ Tiến độ chuẩn (Bình thường)',
    warnings: [],
    totalCreditsRequired: 135,
    initialCpa: 3.05,
    initialGpa: 3.20,
    initialCredits: 102,
    hasTranscript: true,
    description: 'Ngành KTPM K17, tiến độ chuẩn, không nợ môn, CPA 3.05 (Khá/Giỏi). Đã hoàn thành 102/135 tín chỉ.',
    records: [
      { courseCode: 'MATH1001', courseName: 'Giải tích 1', semesterCode: '2024_1', credits: 3, score10: 8.5, letterGrade: 'A', status: 'PASSED' },
      { courseCode: 'IT1001', courseName: 'Nhập môn lập trình', semesterCode: '2024_1', credits: 3, score10: 8.8, letterGrade: 'A', status: 'PASSED' },
      { courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', semesterCode: '2024_1', credits: 3, score10: 7.2, letterGrade: 'B', status: 'PASSED' },
      { courseCode: 'MATH1002', courseName: 'Toán rời rạc', semesterCode: '2024_2', credits: 3, score10: 7.6, letterGrade: 'B', status: 'PASSED' },
      { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', semesterCode: '2024_2', credits: 4, score10: 8.2, letterGrade: 'B+', status: 'PASSED' },
      { courseCode: 'IT3001', courseName: 'Mạng máy tính căn bản', semesterCode: '2025_1', credits: 3, score10: 7.8, letterGrade: 'B', status: 'PASSED' },
      { courseCode: 'IT6001', courseName: 'Cấu trúc dữ liệu và giải thuật', semesterCode: '2025_1', credits: 3, score10: 8.0, letterGrade: 'B+', status: 'PASSED' },
      { courseCode: 'IT3004', courseName: 'Hệ quản trị Cơ sở dữ liệu', semesterCode: '2025_2', credits: 3, score10: null, letterGrade: null, status: 'IN_PROGRESS' }
    ]
  },
  'at-risk': {
    id: 'at-risk',
    studentId: 'std-2026-001',
    student_id: 'std-2026-001',
    fullName: 'Trần Thị Bình',
    full_name: 'Trần Thị Bình',
    email: 'binhtt@sv.haui.edu.vn',
    cohort: 'K17 (2022 - 2026)',
    majorCode: 'CT1085',
    major_id: 'CT1085',
    majorName: 'Kỹ thuật phần mềm (CNTT)',
    faculty: 'Trường Công nghệ thông tin và Truyền thông - HaUI',
    className: '2022DHKTPM02',
    avatarChar: 'B',
    presetLabel: 'Sinh viên có nguy cơ học vụ',
    badgeType: 'warning',
    badgeText: '⚠️ Cảnh báo học vụ: Mức 1',
    warnings: [
      'Cảnh báo học vụ Mức 1 (BR-07): CPA 1.85 < 2.00 và nợ môn tiên quyết Toán rời rạc (MATH1002). Cần ưu tiên học lại ngay để mở khóa các môn chuyên ngành.'
    ],
    totalCreditsRequired: 135,
    initialCpa: 1.85,
    initialGpa: null,
    initialCredits: 58,
    hasTranscript: true,
    description: 'CPA 1.85 tiệm cận ngưỡng nguy hiểm (< 2.0), đang nợ môn tiên quyết Toán rời rạc (MATH1002 - Điểm F).',
    records: [
      { courseCode: 'MATH1001', courseName: 'Giải tích 1', semesterCode: '2024_1', credits: 3, score10: 5.8, letterGrade: 'C', status: 'PASSED' },
      { courseCode: 'IT1001', courseName: 'Nhập môn lập trình', semesterCode: '2024_1', credits: 3, score10: 7.0, letterGrade: 'B', status: 'PASSED' },
      { courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', semesterCode: '2024_1', credits: 3, score10: 4.5, letterGrade: 'D', status: 'PASSED_LOW' },
      { courseCode: 'MATH1002', courseName: 'Toán rời rạc', semesterCode: '2024_2', credits: 3, score10: 3.2, letterGrade: 'F', status: 'FAILED' },
      { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', semesterCode: '2024_2', credits: 4, score10: 5.2, letterGrade: 'D+', status: 'PASSED_LOW' },
      { courseCode: 'IT3001', courseName: 'Mạng máy tính căn bản', semesterCode: '2025_1', credits: 3, score10: 6.8, letterGrade: 'C+', status: 'PASSED' },
      { courseCode: 'IT3004', courseName: 'Hệ quản trị Cơ sở dữ liệu', semesterCode: '2025_2', credits: 3, score10: null, letterGrade: null, status: 'IN_PROGRESS' }
    ]
  },
  empty: {
    id: 'empty',
    studentId: 'std-2026-empty',
    student_id: 'std-2026-empty',
    fullName: 'Lê Hoàng Nam',
    full_name: 'Lê Hoàng Nam',
    email: 'namlh@sv.haui.edu.vn',
    cohort: 'K19 (2025 - 2029)',
    majorCode: 'CT1085',
    major_id: 'CT1085',
    majorName: 'Công nghệ thông tin',
    faculty: 'Trường Công nghệ thông tin và Truyền thông - HaUI',
    className: '2025DHCNTT03',
    avatarChar: 'N',
    presetLabel: 'Sinh viên chưa có bảng điểm',
    badgeType: 'neutral',
    badgeText: 'ℹ️ Chưa nạp bảng điểm',
    warnings: [
      'Tài khoản mới: Chưa có dữ liệu bảng điểm. Vui lòng tải bảng điểm e-HaUI hoặc nhập điểm để kích hoạt các tính năng cố vấn.'
    ],
    totalCreditsRequired: 135,
    initialCpa: null,
    initialGpa: null,
    initialCredits: 0,
    hasTranscript: false,
    description: 'Tân sinh viên K19 mới nhập học, tài khoản trắng (0 tín chỉ, CPA null, chưa tải bảng điểm từ e-HaUI).',
    records: []
  }
});

/**
 * Quy đổi Điểm 10 -> Điểm chữ
 * @param {number} score10
 */
export function convertScore10ToGrade(score10) {
  if (score10 === null || score10 === undefined || isNaN(score10)) {
    return { letterGrade: null, status: 'IN_PROGRESS' };
  }
  const s = Number(score10);
  if (s >= 8.5) return { letterGrade: 'A', status: 'PASSED' };
  if (s >= 8.0) return { letterGrade: 'B+', status: 'PASSED' };
  if (s >= 7.0) return { letterGrade: 'B', status: 'PASSED' };
  if (s >= 6.5) return { letterGrade: 'C+', status: 'PASSED' };
  if (s >= 5.5) return { letterGrade: 'C', status: 'PASSED' };
  if (s >= 5.0) return { letterGrade: 'D+', status: 'PASSED_LOW' };
  if (s >= 4.0) return { letterGrade: 'D', status: 'PASSED_LOW' };
  return { letterGrade: 'F', status: 'FAILED' };
}

/**
 * Xếp loại học lực theo CPA
 * @param {number|null} cpa
 */
export function classifyAcademicRank(cpa) {
  if (cpa === null || cpa === undefined) return { rank: 'Chưa xếp loại', variant: 'neutral' };
  if (cpa >= 3.60) return { rank: 'Xuất sắc', variant: 'success' };
  if (cpa >= 3.20) return { rank: 'Giỏi', variant: 'success' };
  if (cpa >= 2.50) return { rank: 'Khá', variant: 'info' };
  if (cpa >= 2.00) return { rank: 'Trung bình', variant: 'warning' };
  return { rank: 'Yếu (Cảnh báo học vụ)', variant: 'error' };
}

function createInitialState() {
  const defaultPreset = STUDENT_PRESETS['at-risk'];
  return {
    isAuthenticated: true,
    activePresetId: 'at-risk',
    student: { ...defaultPreset },
    transcriptRecords: [...defaultPreset.records],
    hasImportedNewTranscript: false,
    lastImportedAt: null
  };
}

let globalState = createInitialState();
const storeListeners = new Set();

function emitChange() {
  const snapshot = getAcademicSnapshot();
  for (const listener of storeListeners) {
    try {
      listener(snapshot);
    } catch {
      // Ignored
    }
  }
}

/**
 * Tính toán số liệu học vụ:
 * Ủy nhiệm 100% việc tính toán cho Mock Academic Service (Server-side adapter),
 * tuân thủ nguyên tắc TUYỆT ĐỐI không tự suy luận GPA/CPA ở Frontend.
 * @param {Array} records
 * @param {Object} student
 */
export function computeAcademicMetrics(records = [], student = globalState.student) {
  const reqTotal = student.totalCreditsRequired || 135;
  const metrics = computeServerAcademicMetrics(records, reqTotal);

  return {
    cpa: metrics.cpa,
    gpa: metrics.gpa,
    accumulatedCredits: metrics.accumulatedCredits,
    totalCreditsRequired: metrics.totalCreditsRequired,
    progressPercent: metrics.progressPercent,
    failedCourses: metrics.failedCourses,
    passedCourses: metrics.passedCourses,
    inProgressCourses: metrics.inProgressCourses,
    warnings: metrics.warnings,
    rankInfo: classifyAcademicRank(metrics.cpa)
  };
}

/**
 * Lấy toàn bộ Snapshot học vụ hiện tại của Store
 */
export function getAcademicSnapshot() {
  const context = mockAcademicService.getStudentContext();
  const transcript = mockAcademicService.getTranscript();

  const metrics = {
    cpa: context.cpa,
    gpa: context.gpa,
    accumulatedCredits: context.accumulatedCredits,
    totalCreditsRequired: context.totalCreditsRequired,
    progressPercent: context.progressPercent,
    warnings: context.warnings,
    failedCourses: transcript.attempts.filter((a) => a.letterGrade === 'F' || a.status === 'FAILED'),
    passedCourses: transcript.attempts.filter((a) => a.letterGrade && a.letterGrade !== 'F' && a.status !== 'FAILED'),
    inProgressCourses: transcript.attempts.filter((a) => a.status === 'IN_PROGRESS' || a.letterGrade === null),
    rankInfo: classifyAcademicRank(context.cpa)
  };

  return {
    isAuthenticated: globalState.isAuthenticated,
    activePresetId: globalState.activePresetId,
    student: {
      ...globalState.student,
      cpa: context.cpa,
      gpa: context.gpa,
      accumulatedCredits: context.accumulatedCredits,
      warnings: context.warnings
    },
    transcriptRecords: transcript.attempts,
    metrics,
    hasImportedNewTranscript: globalState.hasImportedNewTranscript,
    lastImportedAt: globalState.lastImportedAt
  };
}

/**
 * Đăng nhập / Chuyển đổi sang Persona mục tiêu
 * @param {'normal'|'at-risk'|'empty'} presetId
 */
export function selectStudentPreset(presetId) {
  const preset = STUDENT_PRESETS[presetId] || STUDENT_PRESETS['at-risk'];
  mockAcademicService.setActivePersona(preset.id);

  globalState = {
    isAuthenticated: true,
    activePresetId: preset.id,
    student: { ...preset },
    transcriptRecords: [...preset.records],
    hasImportedNewTranscript: false,
    lastImportedAt: null
  };
  emitChange();
  return getAcademicSnapshot();
}

/**
 * Đăng nhập với tài khoản tự nhập hoặc preset
 * @param {{ studentId?: string, password?: string, presetId?: string }} credentials
 */
export function loginStudent(credentials = {}) {
  const targetPresetId = credentials.presetId || (
    credentials.studentId?.includes('empty') ? 'empty' :
    credentials.studentId?.includes('normal') ? 'normal' : 'at-risk'
  );
  return selectStudentPreset(targetPresetId);
}

/**
 * Đăng xuất sinh viên
 */
export function logoutStudent() {
  globalState.isAuthenticated = false;
  emitChange();
  return getAcademicSnapshot();
}

/**
 * Lưu và xác nhận bảng điểm mới (Bước 3 Luồng bóc tách bảng điểm)
 * @param {Array} newRecords
 * @param {Object} [meta]
 */
export function commitTranscriptRecords(newRecords, meta = {}) {
  if (!Array.isArray(newRecords)) return getAcademicSnapshot();

  const session = mockAcademicService.createImportSession({ rows: newRecords });
  mockAcademicService.confirmImportSession(session.importSessionId);

  globalState.hasImportedNewTranscript = true;
  globalState.lastImportedAt = new Date().toISOString();
  emitChange();
  return getAcademicSnapshot();
}

/**
 * Đăng ký lắng nghe thay đổi trạng thái Store
 * @param {Function} listener
 * @returns {Function} unsubscribe
 */
export function subscribeAcademicStore(listener) {
  if (typeof listener === 'function') {
    storeListeners.add(listener);
    return () => storeListeners.delete(listener);
  }
  return () => {};
}

/**
 * Sinh phản hồi động cho `api.academic.getStatus()` dựa trên dữ liệu hiện hành của store
 */
export function getDynamicAcademicStatus() {
  return mockAcademicService.getAcademicStatus();
}

/**
 * Sinh phản hồi động cho `api.audit.getGraduationAudit()`
 */
export function getDynamicGraduationAudit() {
  const snapshot = getAcademicSnapshot();
  const { student, metrics } = snapshot;

  const earned = metrics.accumulatedCredits;
  const total = metrics.totalCreditsRequired;
  const pct = Math.min(100, Number(((earned / total) * 100).toFixed(0)));
  const isEligible = earned >= total && (metrics.cpa || 0) >= 2.0 && !metrics.failedCourses.length;

  return {
    ...MOCK_GRADUATION_AUDIT,
    studentId: student.studentId,
    accumulatedCredits: earned,
    totalCreditsRequired: total,
    completedPercentage: pct,
    eligibleForGraduation: isEligible,
    eligibleForThesis: earned >= 115, // BR-09
    checklist: [
      {
        id: 'CHK-01',
        category: '1. TÍN CHỈ TÍCH LŨY',
        name: 'Tổng số tín chỉ tích lũy toàn khóa (BR-10)',
        completed: earned >= total,
        totalCreditsRequired: total,
        accumulatedCredits: earned,
        statusMessage: earned >= total
          ? `Đã tích lũy đủ ${earned} / ${total} tín chỉ`
          : `Đạt ${earned} / ${total} tín chỉ (Còn thiếu ${total - earned} tín chỉ)`
      },
      {
        id: 'CHK-02',
        category: '2. KHỐI BẮT BUỘC',
        name: 'Khối kiến thức giáo dục đại cương & bắt buộc ngành',
        completed: earned >= 94,
        totalCreditsRequired: 94,
        accumulatedCredits: Math.min(94, earned),
        statusMessage: earned >= 94
          ? 'Hoàn thành 100% các học phần bắt buộc'
          : `Đã tích lũy ${Math.min(94, earned)} / 94 tín chỉ bắt buộc`
      },
      {
        id: 'CHK-03',
        category: '3. TỰ CHỌN CHUYÊN NGÀNH',
        name: 'Khối kiến thức tự chọn chuyên ngành',
        completed: earned >= 106,
        totalCreditsRequired: 12,
        accumulatedCredits: Math.min(12, Math.max(0, earned - 94)),
        statusMessage: earned >= 106
          ? 'Đã hoàn thành 12/12 tín chỉ tự chọn'
          : 'Cần bổ sung thêm môn tự chọn trong danh mục đào tạo'
      },
      {
        id: 'CHK-04',
        category: '4. CHUẨN NGOẠI NGỮ',
        name: 'Chứng chỉ Chuẩn đầu ra Ngoại ngữ (TOEIC 550 / VSTEP - DEMO_UNVERIFIED)',
        completed: student.id !== 'empty',
        totalCreditsRequired: null,
        accumulatedCredits: null,
        statusMessage: student.id !== 'empty'
          ? 'Đã nộp chứng chỉ TOEIC 550 (Hợp lệ - DEMO_UNVERIFIED)'
          : 'Chưa có chứng chỉ ngoại ngữ nộp về phòng Đào tạo (DEMO_UNVERIFIED)'
      },
      {
        id: 'CHK-05',
        category: '5. CHUẨN TIN HỌC',
        name: 'Chuẩn đầu ra Tin học quốc tế (MOS/IC3 - DEMO_UNVERIFIED)',
        completed: false,
        totalCreditsRequired: null,
        accumulatedCredits: null,
        statusMessage: 'Chưa nộp (Cảnh báo đỏ AC-05: Hạn chót trước đợt xét tốt nghiệp 3 tháng)'
      },
      {
        id: 'CHK-06',
        category: '6. GDTC & GDQP-AN',
        name: 'Giáo dục thể chất & Giáo dục Quốc phòng - An ninh',
        completed: true,
        totalCreditsRequired: null,
        accumulatedCredits: null,
        statusMessage: 'Đã hoàn thành đầy đủ chứng chỉ GDTC và GDQP-AN'
      },
      {
        id: 'CHK-07',
        category: '7. ĐIỂM RÈN LUYỆN',
        name: 'Điểm rèn luyện tích lũy toàn khóa',
        completed: true,
        totalCreditsRequired: null,
        accumulatedCredits: null,
        statusMessage: '78 điểm (Loại Khá - Đạt yêu cầu)'
      }
    ],
    pendingActions: [
      {
        certificateType: 'MOS',
        requiredStandard: 'Đạt chứng chỉ Tin học MOS 3 môn (DEMO_UNVERIFIED)',
        actionDescription: 'Đăng ký thi đợt gần nhất tại Trung tâm CNTT và nộp chứng chỉ trước đợt xét tốt nghiệp 3 tháng',
        deadline: '2027-03-31',
        status: 'PENDING'
      },
      {
        certificateType: 'ELECTIVE_CREDITS',
        requiredStandard: 'Bổ sung 6 tín chỉ Tự chọn chuyên ngành (2 học phần)',
        actionDescription: 'Đưa 2 môn tự chọn vào Kế hoạch học tập kỳ tới',
        deadline: '2027-01-15',
        status: 'PENDING'
      }
    ],
    dataRevision: 'rev-1001',
    fixtureLabel: FIXTURE_TAG,
    regulationTag: UNVERIFIED_RULE_TAG
  };
}

/**
 * Đề xuất lộ trình bù đắp điều kiện tốt nghiệp mẫu (F23-006)
 */
export const AUDIT_REMEDIATION_PROPOSAL = Object.freeze({
  proposalId: 'prop-audit-remediation-2026',
  source: 'AUDIT',
  sourceName: 'Graduation Audit (Kiểm toán tốt nghiệp)',
  createdAt: '2026-10-13T10:00:00Z',
  targetCpa: 3.20,
  projectedCpa: 3.25,
  remediationSummary: {
    retakeCourses: [
      {
        courseCode: 'MATH1002',
        courseName: 'Toán rời rạc',
        credits: 3,
        currentGrade: 'F',
        targetGrade: 'A (4.0)',
        rationale: 'Học lại gỡ điểm F để khơi thông môn tiên quyết và kéo CPA'
      }
    ],
    missingElectiveCredits: 6,
    missingCertificates: [
      'Chứng chỉ Tin học Quốc tế (MOS / IC3)'
    ],
    actionNote: 'Hoàn thành 2 học kỳ (Kỳ 7: 15 TC; Kỳ 8: 10 TC Đồ án) để tích lũy đủ 135 TC tốt nghiệp'
  },
  semesters: [
    {
      semesterCode: '2026_1',
      semesterName: 'Học kỳ 1 (2026 - 2027) — Kỳ 7 (Bù đắp điều kiện)',
      workloadAssessment: 'Cân bằng tải chuẩn HaUI (15 / 24 TC)',
      totalCredits: 15,
      expectedGpa: 3.4,
      courses: [
        {
          courseCode: 'MATH1002',
          courseName: 'Toán rời rạc (Học lại)',
          credits: 3,
          courseType: 'Học lại gỡ nợ',
          targetGrade: 'A (4.0)',
          rationale: 'Gỡ nợ tiên quyết và khôi phục CPA theo BR-01/BR-07'
        },
        {
          courseCode: 'IT6010',
          courseName: 'Điện toán đám mây & DevOps',
          credits: 3,
          courseType: 'Tự chọn chuyên ngành',
          targetGrade: 'A (4.0)',
          rationale: 'Bù đắp 3/6 TC khối Tự chọn chuyên ngành còn thiếu (Audit Checklist #3)'
        },
        {
          courseCode: 'IT6015',
          courseName: 'Kiến trúc phần mềm & Mẫu thiết kế',
          credits: 3,
          courseType: 'Tự chọn chuyên ngành',
          targetGrade: 'A (4.0)',
          rationale: 'Hoàn thành 100% (6/6 TC) khối Tự chọn chuyên ngành để vượt mốc 85% nhận Đồ án (BR-09)'
        },
        {
          courseCode: 'IT6002',
          courseName: 'Lập trình mạng',
          credits: 3,
          courseType: 'Bắt buộc chuyên ngành',
          targetGrade: 'B+ (3.5)',
          rationale: 'Tích lũy đủ khối lượng học kỳ chính 10–24 TC (BR-03)'
        },
        {
          courseCode: 'IT4001',
          courseName: 'Cơ sở dữ liệu nâng cao',
          credits: 3,
          courseType: 'Bắt buộc chuyên ngành',
          targetGrade: 'B (3.0)',
          rationale: 'Hoàn tất khối kiến thức chuyên ngành bắt buộc'
        }
      ]
    },
    {
      semesterCode: '2026_2',
      semesterName: 'Học kỳ 2 (2026 - 2027) — Kỳ 8 (Đồ án Tốt nghiệp)',
      workloadAssessment: 'Tập trung Đồ án TN (10 / 24 TC)',
      totalCredits: 10,
      expectedGpa: 3.6,
      courses: [
        {
          courseCode: 'IT7008',
          courseName: 'Đồ án tốt nghiệp Kỹ thuật phần mềm',
          credits: 10,
          courseType: 'Tốt nghiệp',
          targetGrade: 'A (4.0)',
          rationale: 'Đạt ≥ 85% tín chỉ CTĐT và không nợ môn tiên quyết theo BR-09'
        }
      ]
    }
  ]
});

/**
 * Xây dựng payload đề xuất bù đắp từ kết quả Kiểm toán tốt nghiệp hiện hành (F23-006)
 * @param {Object} [auditData]
 */
export function buildAuditRemediationProposal(auditData = null) {
  const effectiveAudit = auditData || getDynamicGraduationAudit();
  const totalRequired = effectiveAudit?.totalCreditsRequired ?? 135;
  const totalEarned = effectiveAudit?.accumulatedCredits ?? 112;

  return {
    ...JSON.parse(JSON.stringify(AUDIT_REMEDIATION_PROPOSAL)),
    auditCompletedPercentage: effectiveAudit?.completedPercentage ?? 82,
    missingCredits: Math.max(0, totalRequired - totalEarned),
    pendingActions: Array.isArray(effectiveAudit?.pendingActions)
      ? JSON.parse(JSON.stringify(effectiveAudit.pendingActions))
      : []
  };
}

/**
 * Phát đề xuất lộ trình bù đắp từ Audit sang Planner qua cả plannerStore và CustomEvent('haui:planner:proposal') (F23-006)
 * @param {Object} [auditData]
 * @param {Object} [plannerStoreTarget]
 */
export function dispatchAuditRemediationProposal(auditData = null, plannerStoreTarget = null) {
  const proposal = buildAuditRemediationProposal(auditData);

  if (plannerStoreTarget && typeof plannerStoreTarget.setIncomingProposal === 'function') {
    plannerStoreTarget.setIncomingProposal(proposal, proposal.sourceName);
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('haui:planner:proposal', {
          detail: proposal
        })
      );
    } catch {
      // Ignored
    }
  }

  return proposal;
}

/**
 * Sinh phản hồi động cho Cây môn học gắn với kết quả học tập sinh viên
 */
export function getDynamicCurriculumTree() {
  return mockAcademicService.getCurriculum();
}

/**
 * Kết nối Store với instance của API Client singleton
 * @param {Object} apiInstance
 */
export function connectApi(apiInstance) {
  if (!apiInstance || typeof apiInstance.setDynamicProvider !== 'function') return;

  apiInstance.setDynamicProvider({
    'GET /academic/status': () => getDynamicAcademicStatus(),
    'GET /academic/curriculum': () => getDynamicCurriculumTree(),
    'GET /audit/graduation': () => getDynamicGraduationAudit()
  });

  const snapshot = getAcademicSnapshot();
  apiInstance.setSessionStudent(snapshot.student);

  subscribeAcademicStore((nextSnapshot) => {
    apiInstance.setSessionStudent(nextSnapshot.student);
  });
}
