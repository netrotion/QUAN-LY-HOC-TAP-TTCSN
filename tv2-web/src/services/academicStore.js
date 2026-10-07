/**
 * HaUI Advisor — Academic Store & State Management (Task 2.2a - flow-approved-v1)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Quản lý trạng thái Frontend thống nhất cho:
 * 1. Danh tính & Phiên sinh viên (Student Personas: normal, at-risk, empty)
 * 2. Xác thực (Login / Logout / Switch Persona)
 * 3. Hồ sơ bảng điểm (Transcript Records, Review & Confirm)
 * 4. Tính toán động: CPA, GPA, Tín chỉ tích lũy, Trạng thái cảnh báo học vụ
 * 5. Tiến độ kiểm toán tốt nghiệp (Graduation Audit 100%)
 * 6. Sơ đồ cây môn học & Trạng thái 4 màu sắc (Green, Yellow, Gray, Red)
 */

import {
  FIXTURE_TAG,
  UNVERIFIED_RULE_TAG,
  MOCK_CURRICULUM_TREE,
  MOCK_GRADUATION_AUDIT
} from './mockFixtures.js';

/**
 * 3 Tài khoản mẫu theo đặc tả Task 2.2a:
 * - normal: Sinh viên bình thường (ngành CNTT/KTPM, tiến độ chuẩn, CPA 3.20)
 * - at-risk: Sinh viên có nguy cơ học vụ (CPA < 2.0, nợ môn tiên quyết MATH1002)
 * - empty: Sinh viên chưa có bảng điểm (tài khoản trắng, tân sinh viên K19)
 */
export const STUDENT_PRESETS = Object.freeze({
  normal: {
    id: 'normal',
    studentId: 'std-2026-normal',
    fullName: 'Nguyễn Văn An',
    email: 'annv@sv.haui.edu.vn',
    cohort: 'K17 (2022 - 2026)',
    majorCode: '7480103',
    majorName: 'Kỹ thuật phần mềm (CNTT)',
    faculty: 'Trường Công nghệ Thông tin và Truyền thông (SICT - HaUI)',
    advisorClass: 'KTPM01-K17',
    avatarChar: 'A',
    presetLabel: 'Sinh viên tiến độ chuẩn',
    badgeType: 'success',
    badgeText: '✓ Tiến độ chuẩn (Bình thường)',
    academicWarning: null,
    totalCreditsRequired: 135,
    initialCpa: 3.20,
    initialGpa: 3.35,
    initialCredits: 102,
    hasTranscript: true,
    description: 'Ngành KTPM K17, tiến độ chuẩn, không nợ môn, CPA 3.20 (Khá/Giỏi). Đã hoàn thành 102/135 tín chỉ.',
    records: [
      { courseCode: 'MATH1001', courseName: 'Giải tích 1', semesterCode: '2024_1', credits: 3, score10: 8.5, letterGrade: 'A', score4: 4.0, status: 'PASSED' },
      { courseCode: 'IT1001', courseName: 'Nhập môn lập trình', semesterCode: '2024_1', credits: 3, score10: 8.8, letterGrade: 'A', score4: 4.0, status: 'PASSED' },
      { courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', semesterCode: '2024_1', credits: 3, score10: 7.2, letterGrade: 'B', score4: 3.0, status: 'PASSED' },
      { courseCode: 'MATH1002', courseName: 'Toán rời rạc', semesterCode: '2024_2', credits: 3, score10: 7.6, letterGrade: 'B', score4: 3.0, status: 'PASSED' },
      { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', semesterCode: '2024_2', credits: 4, score10: 8.2, letterGrade: 'B+', score4: 3.5, status: 'PASSED' },
      { courseCode: 'IT3001', courseName: 'Mạng máy tính căn bản', semesterCode: '2025_1', credits: 3, score10: 7.8, letterGrade: 'B', score4: 3.0, status: 'PASSED' },
      { courseCode: 'IT6001', courseName: 'Cấu trúc dữ liệu và giải thuật', semesterCode: '2025_1', credits: 3, score10: 8.0, letterGrade: 'B+', score4: 3.5, status: 'PASSED' },
      { courseCode: 'IT3004', courseName: 'Hệ quản trị Cơ sở dữ liệu', semesterCode: '2025_2', credits: 3, score10: null, letterGrade: null, score4: null, status: 'IN_PROGRESS' }
    ]
  },
  'at-risk': {
    id: 'at-risk',
    studentId: 'std-2026-001',
    fullName: 'Trần Thị Bình',
    email: 'binhtt@sv.haui.edu.vn',
    cohort: 'K17 (2022 - 2026)',
    majorCode: '7480103',
    majorName: 'Kỹ thuật phần mềm (CNTT)',
    faculty: 'Trường Công nghệ Thông tin và Truyền thông (SICT - HaUI)',
    advisorClass: 'KTPM02-K17',
    avatarChar: 'B',
    presetLabel: 'Sinh viên có nguy cơ học vụ',
    badgeType: 'warning',
    badgeText: '⚠️ Cảnh báo học vụ: Mức 1',
    academicWarning: 'Cảnh báo học vụ Mức 1 (BR-07): CPA 1.85 < 2.00 và nợ môn tiên quyết Toán rời rạc (MATH1002). Cần ưu tiên học lại ngay để mở khóa các môn chuyên ngành.',
    totalCreditsRequired: 135,
    initialCpa: 1.85,
    initialGpa: null,
    initialCredits: 58,
    hasTranscript: true,
    description: 'CPA 1.85 tiệm cận ngưỡng nguy hiểm (< 2.0), đang nợ môn tiên quyết Toán rời rạc (MATH1002 - Điểm F).',
    records: [
      { courseCode: 'MATH1001', courseName: 'Giải tích 1', semesterCode: '2024_1', credits: 3, score10: 5.8, letterGrade: 'C', score4: 2.0, status: 'PASSED' },
      { courseCode: 'IT1001', courseName: 'Nhập môn lập trình', semesterCode: '2024_1', credits: 3, score10: 7.0, letterGrade: 'B', score4: 3.0, status: 'PASSED' },
      { courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', semesterCode: '2024_1', credits: 3, score10: 4.5, letterGrade: 'D', score4: 1.0, status: 'PASSED_LOW' },
      { courseCode: 'MATH1002', courseName: 'Toán rời rạc', semesterCode: '2024_2', credits: 3, score10: 3.2, letterGrade: 'F', score4: 0.0, status: 'FAILED' },
      { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', semesterCode: '2024_2', credits: 4, score10: 5.2, letterGrade: 'D+', score4: 1.5, status: 'PASSED_LOW' },
      { courseCode: 'IT3001', courseName: 'Mạng máy tính căn bản', semesterCode: '2025_1', credits: 3, score10: 6.8, letterGrade: 'C+', score4: 2.5, status: 'PASSED' },
      { courseCode: 'IT3004', courseName: 'Hệ quản trị Cơ sở dữ liệu', semesterCode: '2025_2', credits: 3, score10: null, letterGrade: null, score4: null, status: 'IN_PROGRESS' }
    ]
  },
  empty: {
    id: 'empty',
    studentId: 'std-2026-empty',
    fullName: 'Lê Hoàng Nam',
    email: 'namlh@sv.haui.edu.vn',
    cohort: 'K19 (2025 - 2029)',
    majorCode: '7480201',
    majorName: 'Công nghệ thông tin',
    faculty: 'Trường Công nghệ Thông tin và Truyền thông (SICT - HaUI)',
    advisorClass: 'CNTT03-K19',
    avatarChar: 'N',
    presetLabel: 'Sinh viên chưa có bảng điểm',
    badgeType: 'neutral',
    badgeText: 'ℹ️ Chưa nạp bảng điểm',
    academicWarning: null,
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
 * Quy đổi Điểm 10 -> Điểm chữ & Điểm 4
 * @param {number} score10
 */
export function convertScore10ToGrade(score10) {
  if (score10 === null || score10 === undefined || isNaN(score10)) {
    return { letterGrade: null, score4: null, status: 'IN_PROGRESS' };
  }
  const s = Number(score10);
  if (s >= 8.5) return { letterGrade: 'A', score4: 4.0, status: 'PASSED' };
  if (s >= 8.0) return { letterGrade: 'B+', score4: 3.5, status: 'PASSED' };
  if (s >= 7.0) return { letterGrade: 'B', score4: 3.0, status: 'PASSED' };
  if (s >= 6.5) return { letterGrade: 'C+', score4: 2.5, status: 'PASSED' };
  if (s >= 5.5) return { letterGrade: 'C', score4: 2.0, status: 'PASSED' };
  if (s >= 5.0) return { letterGrade: 'D+', score4: 1.5, status: 'PASSED_LOW' };
  if (s >= 4.0) return { letterGrade: 'D', score4: 1.0, status: 'PASSED_LOW' };
  return { letterGrade: 'F', score4: 0.0, status: 'FAILED' };
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

/**
 * Khởi tạo dữ liệu trạng thái bộ nhớ
 */
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
 * Tính toán số liệu học vụ động từ danh sách môn học
 * @param {Array} records
 * @param {Object} student
 */
export function computeAcademicMetrics(records = [], student = globalState.student) {
  if (!records || records.length === 0) {
    return {
      cpa: student.initialCpa ?? null,
      gpa: student.initialGpa ?? null,
      accumulatedCredits: student.initialCredits ?? 0,
      totalCreditsRequired: student.totalCreditsRequired || 135,
      progressPercent: student.initialCredits
        ? Number(((student.initialCredits / (student.totalCreditsRequired || 135)) * 100).toFixed(1))
        : 0,
      failedCourses: [],
      passedCourses: [],
      inProgressCourses: [],
      academicWarning: student.academicWarning,
      rankInfo: classifyAcademicRank(student.initialCpa)
    };
  }

  let totalWeightedPoints = 0;
  let totalGradedCredits = 0;
  let totalEarnedCredits = 0;
  const failed = [];
  const passed = [];
  const inProgress = [];

  for (const rec of records) {
    const credits = Number(rec.credits || 0);
    const score4 = rec.score4 !== null && rec.score4 !== undefined ? Number(rec.score4) : null;

    if (rec.status === 'FAILED' || rec.letterGrade === 'F' || (score4 !== null && score4 === 0)) {
      failed.push(rec);
    } else if (rec.status === 'IN_PROGRESS' || score4 === null) {
      inProgress.push(rec);
    } else {
      passed.push(rec);
      totalEarnedCredits += credits;
    }

    if (score4 !== null) {
      totalWeightedPoints += credits * score4;
      totalGradedCredits += credits;
    }
  }

  const isInitialPresetMode = !globalState.hasImportedNewTranscript && student.initialCpa !== undefined;

  const computedCpa = isInitialPresetMode
    ? student.initialCpa
    : totalGradedCredits > 0
    ? Number((totalWeightedPoints / totalGradedCredits).toFixed(2))
    : student.initialCpa;

  const finalAccumulatedCredits = isInitialPresetMode
    ? (student.initialCredits ?? totalEarnedCredits)
    : totalEarnedCredits;

  // Cảnh báo học tập theo BR-07: Nếu CPA < 2.0 hoặc nợ môn tiên quyết
  let warningMessage = student.academicWarning;
  if (!isInitialPresetMode) {
    if (computedCpa !== null && computedCpa < 2.00) {
      warningMessage = `Cảnh báo học vụ Mức 1 (BR-07): CPA tích lũy hiện tại (${computedCpa}) dưới 2.00.`;
      if (failed.length > 0) {
        warningMessage += ` Đang nợ ${failed.length} học phần: ${failed.map(f => f.courseCode).join(', ')}.`;
      }
    } else if (failed.some(f => f.courseCode === 'MATH1002')) {
      warningMessage = 'Cảnh báo môn tiên quyết: Đang nợ môn Toán rời rạc (MATH1002) - Cần ưu tiên học lại gỡ nợ.';
    } else {
      warningMessage = null;
    }
  }

  const totalReq = student.totalCreditsRequired || 135;
  const progressPct = Number(((finalAccumulatedCredits / totalReq) * 100).toFixed(1));

  return {
    cpa: computedCpa,
    gpa: student.initialGpa, // Giữ nguyên null hoặc GPA gần nhất
    accumulatedCredits: finalAccumulatedCredits,
    totalCreditsRequired: totalReq,
    progressPercent: progressPct,
    failedCourses: failed,
    passedCourses: passed,
    inProgressCourses: inProgress,
    academicWarning: warningMessage,
    rankInfo: classifyAcademicRank(computedCpa)
  };
}

/**
 * Lấy toàn bộ Snapshot học vụ hiện tại của Store
 */
export function getAcademicSnapshot() {
  const metrics = computeAcademicMetrics(globalState.transcriptRecords, globalState.student);
  return {
    isAuthenticated: globalState.isAuthenticated,
    activePresetId: globalState.activePresetId,
    student: {
      ...globalState.student,
      cpa: metrics.cpa,
      gpa: metrics.gpa,
      accumulatedCredits: metrics.accumulatedCredits,
      academicWarning: metrics.academicWarning
    },
    transcriptRecords: globalState.transcriptRecords,
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

  // Chuẩn hóa bản ghi
  const normalizedRecords = newRecords.map((r, index) => {
    const credits = Number(r.credits || 3);
    let letterGrade = r.letterGrade ? String(r.letterGrade).toUpperCase().trim() : null;
    let score4 = r.score4 !== null && r.score4 !== undefined ? Number(r.score4) : null;
    let score10 = r.score10 !== null && r.score10 !== undefined ? Number(r.score10) : null;
    let status = r.status || 'PASSED';

    if (letterGrade && score4 === null) {
      const mapping = {
        A: 4.0, 'B+': 3.5, B: 3.0, 'C+': 2.5, C: 2.0, 'D+': 1.5, D: 1.0, F: 0.0
      };
      score4 = mapping[letterGrade] ?? 2.0;
    }
    if (letterGrade === 'F') {
      status = 'FAILED';
    } else if (letterGrade === 'D' || letterGrade === 'D+') {
      status = 'PASSED_LOW';
    }

    return {
      id: r.id || `rec-${index + 1}-${r.courseCode || 'course'}`,
      courseCode: String(r.courseCode || `HP-${index + 1}`).toUpperCase().trim(),
      courseName: r.courseName || `Học phần ${r.courseCode}`,
      semesterCode: r.semesterCode || '2025_1',
      credits,
      score10,
      letterGrade,
      score4,
      status
    };
  });

  globalState.transcriptRecords = normalizedRecords;
  globalState.hasImportedNewTranscript = true;
  globalState.lastImportedAt = new Date().toISOString();
  globalState.student.hasTranscript = true;

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
  const snapshot = getAcademicSnapshot();
  const { student, metrics } = snapshot;

  return {
    studentId: student.studentId,
    gpa: metrics.gpa,
    cpa: metrics.cpa,
    accumulatedCredits: metrics.accumulatedCredits,
    totalCreditsRequired: metrics.totalCreditsRequired,
    academicWarning: metrics.academicWarning,
    knowledgeBlocks: [
      {
        blockCode: 'KB-GEN',
        blockName: '1. Khối Kiến thức Giáo dục Đại cương',
        earnedCredits: Math.min(32, metrics.accumulatedCredits),
        requiredCredits: 32,
        completionPercentage: Number((Math.min(1, metrics.accumulatedCredits / 32) * 100).toFixed(1)),
        isCompleted: metrics.accumulatedCredits >= 32
      },
      {
        blockCode: 'KB-BASE',
        blockName: '2. Khối Kiến thức Cơ sở Ngành',
        earnedCredits: Math.min(30, Math.max(0, metrics.accumulatedCredits - 32)),
        requiredCredits: 30,
        completionPercentage: Number((Math.min(1, Math.max(0, metrics.accumulatedCredits - 32) / 30) * 100).toFixed(1)),
        isCompleted: metrics.accumulatedCredits >= 62
      },
      {
        blockCode: 'KB-CORE',
        blockName: '3. Khối Chuyên ngành Bắt buộc',
        earnedCredits: Math.min(32, Math.max(0, metrics.accumulatedCredits - 62)),
        requiredCredits: 32,
        completionPercentage: Number((Math.min(1, Math.max(0, metrics.accumulatedCredits - 62) / 32) * 100).toFixed(1)),
        isCompleted: metrics.accumulatedCredits >= 94
      },
      {
        blockCode: 'KB-ELEC',
        blockName: '4. Khối Tự chọn Chuyên ngành',
        earnedCredits: Math.min(12, Math.max(0, metrics.accumulatedCredits - 94)),
        requiredCredits: 12,
        completionPercentage: Number((Math.min(1, Math.max(0, metrics.accumulatedCredits - 94) / 12) * 100).toFixed(1)),
        isCompleted: metrics.accumulatedCredits >= 106
      },
      {
        blockCode: 'KB-GRAD',
        blockName: '5. Khối Thực tập & Đồ án Tốt nghiệp',
        earnedCredits: Math.min(29, Math.max(0, metrics.accumulatedCredits - 106)),
        requiredCredits: 29,
        completionPercentage: Number((Math.min(1, Math.max(0, metrics.accumulatedCredits - 106) / 29) * 100).toFixed(1)),
        isCompleted: metrics.accumulatedCredits >= 135
      }
    ],
    fixtureLabel: FIXTURE_TAG,
    __mock: true
  };
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
    totalCreditsEarned: earned,
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
        requiredCredits: total,
        earnedCredits: earned,
        statusMessage: earned >= total
          ? `Đã tích lũy đủ ${earned} / ${total} tín chỉ`
          : `Đạt ${earned} / ${total} tín chỉ (Còn thiếu ${total - earned} tín chỉ)`
      },
      {
        id: 'CHK-02',
        category: '2. KHỐI BẮT BUỘC',
        name: 'Khối kiến thức giáo dục đại cương & bắt buộc ngành',
        completed: earned >= 94,
        requiredCredits: 94,
        earnedCredits: Math.min(94, earned),
        statusMessage: earned >= 94
          ? 'Hoàn thành 100% các học phần bắt buộc'
          : `Đã tích lũy ${Math.min(94, earned)} / 94 tín chỉ bắt buộc`
      },
      {
        id: 'CHK-03',
        category: '3. TỰ CHỌN CHUYÊN NGÀNH',
        name: 'Khối kiến thức tự chọn chuyên ngành',
        completed: earned >= 106,
        requiredCredits: 12,
        earnedCredits: Math.min(12, Math.max(0, earned - 94)),
        statusMessage: earned >= 106
          ? 'Đã hoàn thành 12/12 tín chỉ tự chọn'
          : 'Cần bổ sung thêm môn tự chọn trong danh mục đào tạo'
      },
      {
        id: 'CHK-04',
        category: '4. CHUẨN NGOẠI NGỮ',
        name: 'Chứng chỉ Chuẩn đầu ra Ngoại ngữ (TOEIC 550 / VSTEP - DEMO_UNVERIFIED)',
        completed: student.id !== 'empty',
        requiredCredits: null,
        earnedCredits: null,
        statusMessage: student.id !== 'empty'
          ? 'Đã nộp chứng chỉ TOEIC 550 (Hợp lệ - DEMO_UNVERIFIED)'
          : 'Chưa có chứng chỉ ngoại ngữ nộp về phòng Đào tạo (DEMO_UNVERIFIED)'
      },
      {
        id: 'CHK-05',
        category: '5. CHUẨN TIN HỌC',
        name: 'Chuẩn đầu ra Tin học quốc tế (MOS/IC3 - DEMO_UNVERIFIED)',
        completed: false,
        requiredCredits: null,
        earnedCredits: null,
        statusMessage: 'Chưa nộp (Cảnh báo đỏ AC-05: Hạn chót trước đợt xét tốt nghiệp 3 tháng)'
      },
      {
        id: 'CHK-06',
        category: '6. GDTC & GDQP-AN',
        name: 'Giáo dục thể chất & Giáo dục Quốc phòng - An ninh',
        completed: student.id !== 'empty',
        requiredCredits: null,
        earnedCredits: null,
        statusMessage: student.id !== 'empty'
          ? 'Đã hoàn thành đầy đủ chứng chỉ GDTC và GDQP-AN'
          : 'Chưa hoàn thành chứng chỉ GDTC và GDQP-AN'
      },
      {
        id: 'CHK-07',
        category: '7. ĐIỂM RÈN LUYỆN',
        name: 'Điểm rèn luyện tích lũy toàn khóa',
        completed: student.id !== 'empty',
        requiredCredits: null,
        earnedCredits: null,
        statusMessage: student.id !== 'empty'
          ? '78 điểm (Loại Khá - Đạt yêu cầu >= 65)'
          : 'Chưa có điểm rèn luyện tích lũy'
      }
    ]
  };
}

/**
 * Sinh phản hồi động cho Cây môn học gắn với kết quả học tập sinh viên
 */
export function getDynamicCurriculumTree() {
  const snapshot = getAcademicSnapshot();
  const records = snapshot.transcriptRecords;
  const recordMap = new Map();
  records.forEach((r) => {
    recordMap.set(r.courseCode, r);
  });

  const baseTree = MOCK_CURRICULUM_TREE;
  const dynamicCourses = baseTree.courses.map((course) => {
    const studentRecord = recordMap.get(course.courseCode);
    let nodeColor = 'GRAY';
    let status = 'NOT_TAKEN';
    let letterGrade = null;
    let score4 = null;

    if (studentRecord) {
      letterGrade = studentRecord.letterGrade;
      score4 = studentRecord.score4;
      if (studentRecord.status === 'FAILED' || letterGrade === 'F') {
        nodeColor = 'RED';
        status = 'FAILED';
      } else if (studentRecord.status === 'IN_PROGRESS' || score4 === null) {
        nodeColor = 'YELLOW';
        status = 'IN_PROGRESS';
      } else if (course.aiRecommendedNextTerm && (studentRecord.status === 'PASSED_LOW' || studentRecord.letterGrade === 'D' || studentRecord.letterGrade === 'D+')) {
        nodeColor = 'YELLOW';
        status = 'AI_RECOMMENDED';
      } else {
        nodeColor = 'GREEN';
        status = 'PASSED';
      }
    } else {
      // Kiểm tra xem môn tiên quyết đã đạt chưa
      const prereqs = course.prerequisites || [];
      const hasUnsatisfiedPrereq = prereqs.some((prereqCode) => {
        const prereqRecord = recordMap.get(prereqCode);
        return !prereqRecord || prereqRecord.status === 'FAILED' || prereqRecord.letterGrade === 'F';
      });

      if (hasUnsatisfiedPrereq && prereqs.length > 0) {
        nodeColor = 'RED'; // Bị chặn vì thiếu môn tiên quyết
        status = 'BLOCKED';
      } else if (course.courseCode === 'IT6002') {
        nodeColor = 'YELLOW'; // AI Đề xuất kỳ tới
        status = 'AI_RECOMMENDED';
      } else {
        nodeColor = 'GRAY'; // Chưa học, đủ điều kiện đăng ký
        status = 'READY_TO_TAKE';
      }
    }

    return {
      ...course,
      nodeColor,
      status,
      letterGrade: letterGrade || course.letterGrade,
      gradePoint: score4 !== null ? score4 : course.gradePoint
    };
  });

  return {
    ...baseTree,
    courses: dynamicCourses
  };
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

