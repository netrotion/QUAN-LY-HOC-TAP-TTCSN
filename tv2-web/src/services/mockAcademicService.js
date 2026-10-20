/**
 * HaUI Advisor — Mock Academic Service & Contract V1 Adapter (Task 3.4)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Cung cấp dữ liệu và logic mô phỏng máy chủ (Server-side mock) theo chuẩn Contract V1:
 * - Dữ liệu 3 Personas mẫu: normal (CPA 3.05), at-risk (CPA < 2.0), empty (mới).
 * - DTO chuẩn hóa: StudentContextDTO, EnrollmentRecordDTO, CurriculumDTO, CourseRelationDTO.
 * - Quy tắc học vụ: Toàn bộ tính toán CPA/GPA, tích lũy tín chỉ và kiểm tra điều kiện tiên quyết (eligibility)
 *   được thực hiện ở Server Mock Adapter này, Frontend TUYỆT ĐỐI không tự suy luận ở client.
 * - Luồng 3 bước Import Bảng điểm: Upload/Manual -> Review/Edit Rows -> Confirm & Tái tính toán trạng thái.
 */

import { FIXTURE_TAG, UNVERIFIED_RULE_TAG, MOCK_GRADUATION_AUDIT, MOCK_PROJECTED_GRADUATION_AUDIT } from './mockFixtures.js';

// Thang điểm 4 HaUI quy đổi từ điểm chữ
const GRADE_POINT_4_MAP = Object.freeze({
  A: 4.0,
  'B+': 3.5,
  B: 3.0,
  'C+': 2.5,
  C: 2.0,
  'D+': 1.5,
  D: 1.0,
  F: 0.0
});

/**
 * Danh mục Khung CTĐT Kỹ sư Kỹ thuật phần mềm / CNTT HaUI (Chuẩn Contract V1)
 */
export const CURRICULUM_COURSES_BASE = Object.freeze([
  {
    courseCode: 'MATH1001',
    courseName: 'Giải tích 1',
    credits: 3,
    knowledgeBlock: 'I. KIẾN THỨC GIÁO DỤC ĐẠI CƯƠNG',
    suggestedSemester: 1,
    mandatory: true,
    prerequisiteCourseCodes: [],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: ['MATH1002', 'IT6001'],
    instructorNote: 'Môn toán nền tảng cho toàn bộ khối ngành CNTT.'
  },
  {
    courseCode: 'IT1001',
    courseName: 'Nhập môn lập trình',
    credits: 3,
    knowledgeBlock: 'I. KIẾN THỨC GIÁO DỤC ĐẠI CƯƠNG',
    suggestedSemester: 1,
    mandatory: true,
    prerequisiteCourseCodes: [],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: ['IT2001', 'IT6015'],
    instructorNote: 'Rèn luyện tư duy thuật toán và cú pháp cơ bản C/C++.'
  },
  {
    courseCode: 'ML1001',
    courseName: 'Triết học Mác - Lênin',
    credits: 3,
    knowledgeBlock: 'I. KIẾN THỨC GIÁO DỤC ĐẠI CƯƠNG',
    suggestedSemester: 1,
    mandatory: true,
    prerequisiteCourseCodes: [],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: [],
    instructorNote: 'Khối kiến thức lý luận chính trị bắt buộc.'
  },
  {
    courseCode: 'MATH1002',
    courseName: 'Toán rời rạc',
    credits: 3,
    knowledgeBlock: 'I. KIẾN THỨC GIÁO DỤC ĐẠI CƯƠNG',
    suggestedSemester: 2,
    mandatory: true,
    prerequisiteCourseCodes: [],
    priorCourseCodes: ['MATH1001'],
    corequisiteCourseCodes: [],
    unlocks: ['IT6001', 'IT6035'],
    instructorNote: 'Môn tiên quyết trọng yếu; nếu trượt (F) sẽ khóa toàn bộ khối môn cấu trúc dữ liệu và giải thuật kỳ sau.'
  },
  {
    courseCode: 'IT2001',
    courseName: 'Lập trình hướng đối tượng',
    credits: 4,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 2,
    mandatory: true,
    prerequisiteCourseCodes: ['IT1001'],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: ['IT6001', 'SE3001'],
    instructorNote: 'Cốt lõi lập trình OOP (Java/C#); nền tảng của ngành KTPM.'
  },
  {
    courseCode: 'IT6015',
    courseName: 'Kỹ thuật lập trình',
    credits: 3,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 2,
    mandatory: false,
    prerequisiteCourseCodes: ['IT1001'],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: ['IT6002'],
    instructorNote: 'Kỹ thuật viết mã sạch, xử lý con trỏ và tối ưu bộ nhớ.'
  },
  {
    courseCode: 'IT6001',
    courseName: 'Cấu trúc dữ liệu và giải thuật',
    credits: 3,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 3,
    mandatory: true,
    prerequisiteCourseCodes: ['MATH1002', 'IT2001'],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: ['IT6005', 'IT7001'],
    instructorNote: 'Yêu cầu hoàn thành Toán rời rạc (MATH1002 >= D). Nếu nợ MATH1002, hệ thống tự động khóa học phần này.'
  },
  {
    courseCode: 'IT3001',
    courseName: 'Mạng máy tính căn bản',
    credits: 3,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 3,
    mandatory: true,
    prerequisiteCourseCodes: [],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: ['IT6012'],
    instructorNote: 'Mô hình OSI, TCP/IP, cấu hình mạng cơ bản.'
  },
  {
    courseCode: 'IT3004',
    courseName: 'Hệ quản trị Cơ sở dữ liệu',
    credits: 3,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 3,
    mandatory: true,
    prerequisiteCourseCodes: [],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: ['IT4001'],
    instructorNote: 'Thiết kế CSDL quan hệ, SQL chuẩn và tối ưu hóa truy vấn.'
  },
  {
    courseCode: 'IT6005',
    courseName: 'Kiến trúc máy tính & Hợp ngữ',
    credits: 3,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 4,
    mandatory: true,
    prerequisiteCourseCodes: ['IT6001'],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: ['IT6012'],
    instructorNote: 'Cấu trúc tập lệnh CPU và phân tầng kiến trúc phần cứng.'
  },
  {
    courseCode: 'IT6012',
    courseName: 'Hệ điều hành',
    credits: 3,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 4,
    mandatory: true,
    prerequisiteCourseCodes: ['IT6005'],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: [],
    instructorNote: 'Quản lý tiến trình, bộ nhớ ảo, đồng bộ hóa và deadlock.'
  },
  {
    courseCode: 'SE3001',
    courseName: 'Công nghệ phần mềm',
    credits: 3,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 4,
    mandatory: true,
    prerequisiteCourseCodes: ['IT2001'],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: ['SE3002', 'IT7008'],
    instructorNote: 'Quy trình phát triển phần mềm Agile/Scrum và quản trị vòng đời dự án.'
  },
  {
    courseCode: 'IT4001',
    courseName: 'Cơ sở dữ liệu nâng cao',
    credits: 3,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 5,
    mandatory: false,
    prerequisiteCourseCodes: ['IT3004'],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: [],
    instructorNote: 'CSDL phân tán, NoSQL và đánh chỉ mục chuyên sâu.'
  },
  {
    courseCode: 'IT6010',
    courseName: 'Điện toán đám mây & DevOps',
    credits: 3,
    knowledgeBlock: 'II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP',
    suggestedSemester: 5,
    mandatory: false,
    prerequisiteCourseCodes: ['IT3001'],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: [],
    instructorNote: 'Docker, CI/CD pipeline và kiến trúc microservices trên cloud.'
  },
  {
    courseCode: 'IT7008',
    courseName: 'Đồ án tốt nghiệp Kỹ sư KTPM',
    credits: 10,
    knowledgeBlock: 'III. TỐT NGHIỆP (ĐỒ ÁN / THỰC TẬP)',
    suggestedSemester: 8,
    mandatory: true,
    prerequisiteCourseCodes: ['SE3001', 'IT6001'],
    priorCourseCodes: [],
    corequisiteCourseCodes: [],
    unlocks: [],
    instructorNote: 'Điều kiện nhận Đồ án tốt nghiệp (BR-09): Tích lũy >= 85% tổng số tín chỉ CTĐT và không nợ môn tiên quyết.'
  }
]);

/**
 * 3 Personas mẫu theo yêu cầu Task 3.4
 */
export function createDefaultPersonas() {
  return {
    normal: {
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
      totalCreditsRequired: 135,
      avatarChar: 'A',
      presetLabel: 'Sinh viên bình thường (Tiến độ chuẩn)',
      badgeType: 'success',
      badgeText: '✓ Tiến độ chuẩn (Bình thường)',
      hasTranscript: true,
      initialCpa: 3.20,
      initialGpa: 3.20,
      initialCredits: 102,
      warnings: [],
      attempts: [
        { courseCode: 'MATH1001', courseName: 'Giải tích 1', credits: 3, semesterCode: '2024_1', attemptNumber: 1, score10: 8.5, letterGrade: 'A', status: 'PASSED' },
        { courseCode: 'IT1001', courseName: 'Nhập môn lập trình', credits: 3, semesterCode: '2024_1', attemptNumber: 1, score10: 8.8, letterGrade: 'A', status: 'PASSED' },
        { courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', credits: 3, semesterCode: '2024_1', attemptNumber: 1, score10: 7.2, letterGrade: 'B', status: 'PASSED' },
        { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3, semesterCode: '2024_2', attemptNumber: 1, score10: 7.6, letterGrade: 'B', status: 'PASSED' },
        { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', credits: 4, semesterCode: '2024_2', attemptNumber: 1, score10: 8.2, letterGrade: 'B+', status: 'PASSED' },
        { courseCode: 'IT3001', courseName: 'Mạng máy tính căn bản', credits: 3, semesterCode: '2025_1', attemptNumber: 1, score10: 7.8, letterGrade: 'B', status: 'PASSED' },
        { courseCode: 'IT6001', courseName: 'Cấu trúc dữ liệu và giải thuật', credits: 3, semesterCode: '2025_1', attemptNumber: 1, score10: 8.0, letterGrade: 'B+', status: 'PASSED' },
        { courseCode: 'IT3004', courseName: 'Hệ quản trị Cơ sở dữ liệu', credits: 3, semesterCode: '2025_2', attemptNumber: 1, score10: null, letterGrade: null, status: 'IN_PROGRESS' }
      ]
    },
    'at-risk': {
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
      totalCreditsRequired: 135,
      avatarChar: 'B',
      presetLabel: 'Sinh viên có nguy cơ học vụ',
      badgeType: 'warning',
      badgeText: '⚠️ Cảnh báo học vụ: Mức 1',
      hasTranscript: true,
      initialCpa: 1.85,
      initialGpa: null,
      initialCredits: 58,
      warnings: [
        'Cảnh báo học vụ Mức 1 (BR-07): CPA 1.85 < 2.00 và nợ môn tiên quyết Toán rời rạc (MATH1002). Cần ưu tiên học lại ngay để mở khóa các môn chuyên ngành.'
      ],
      attempts: [
        { courseCode: 'MATH1001', courseName: 'Giải tích 1', credits: 3, semesterCode: '2024_1', attemptNumber: 1, score10: 5.8, letterGrade: 'C', status: 'PASSED' },
        { courseCode: 'IT1001', courseName: 'Nhập môn lập trình', credits: 3, semesterCode: '2024_1', attemptNumber: 1, score10: 7.0, letterGrade: 'B', status: 'PASSED' },
        { courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', credits: 3, semesterCode: '2024_1', attemptNumber: 1, score10: 4.5, letterGrade: 'D', status: 'PASSED_LOW' },
        { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3, semesterCode: '2024_2', attemptNumber: 1, score10: 3.2, letterGrade: 'F', status: 'FAILED' },
        { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', credits: 4, semesterCode: '2024_2', attemptNumber: 1, score10: 5.2, letterGrade: 'D+', status: 'PASSED_LOW' },
        { courseCode: 'IT3001', courseName: 'Mạng máy tính căn bản', credits: 3, semesterCode: '2025_1', attemptNumber: 1, score10: 6.8, letterGrade: 'C+', status: 'PASSED' },
        { courseCode: 'IT3004', courseName: 'Hệ quản trị Cơ sở dữ liệu', credits: 3, semesterCode: '2025_2', attemptNumber: 1, score10: null, letterGrade: null, status: 'IN_PROGRESS' }
      ]
    },
    empty: {
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
      totalCreditsRequired: 135,
      avatarChar: 'N',
      presetLabel: 'Sinh viên mới (Chưa có bảng điểm)',
      badgeType: 'neutral',
      badgeText: '○ Tân sinh viên K19',
      hasTranscript: false,
      initialCpa: null,
      initialGpa: null,
      initialCredits: 0,
      warnings: [],
      attempts: []
    }
  };
}

/**
 * Server-Side Metric Computation:
 * Tính toán CPA, GPA, Tín chỉ tích lũy và Cảnh báo học vụ trên Mock Adapter (KHÔNG chạy trên client).
 */
export function computeServerAcademicMetrics(attempts = [], totalCreditsRequired = 135, preset = null) {
  let totalWeightedPoints = 0;
  let totalGradedCredits = 0;
  let accumulatedCredits = 0;
  const failedCourses = [];
  const passedCourses = [];
  const inProgressCourses = [];

  for (const item of attempts) {
    const credits = Number(item.credits || 0);
    const letter = item.letterGrade ? String(item.letterGrade).toUpperCase().trim() : null;
    const isFailed = letter === 'F' || item.status === 'FAILED';
    const isInProgress = (letter === null && item.gradePoint === undefined) || item.status === 'IN_PROGRESS';

    if (isInProgress) {
      inProgressCourses.push(item);
      continue;
    }

    if (isFailed) {
      failedCourses.push(item);
      totalGradedCredits += credits;
      // Điểm 4 = 0.0, weighted = 0
      continue;
    }

    const gp4 = item.gradePoint !== undefined && item.gradePoint !== null
      ? Number(item.gradePoint)
      : (letter ? (GRADE_POINT_4_MAP[letter] ?? 2.0) : 2.0);

    totalWeightedPoints += gp4 * credits;
    totalGradedCredits += credits;
    accumulatedCredits += credits;
    passedCourses.push(item);
  }

  const computedCpa = totalGradedCredits > 0
    ? Number((totalWeightedPoints / totalGradedCredits).toFixed(2))
    : null;

  const cpa = preset && preset.initialCpa !== undefined ? preset.initialCpa : computedCpa;
  const finalAccumulatedCredits = preset && preset.initialCredits !== undefined ? preset.initialCredits : accumulatedCredits;

  // Điểm GPA kỳ gần nhất (nếu có kỳ đã kết thúc)
  let gpa = preset?.initialGpa ?? null;
  if (gpa === null && attempts.length > 0) {
    const semestersWithGrades = [...new Set(
      attempts.filter((a) => a.letterGrade && a.semesterCode).map((a) => a.semesterCode)
    )].sort();
    if (semestersWithGrades.length > 0) {
      const lastSem = semestersWithGrades[semestersWithGrades.length - 1];
      const lastSemAttempts = attempts.filter((a) => a.semesterCode === lastSem && a.letterGrade);
      let semPoints = 0;
      let semCredits = 0;
      for (const a of lastSemAttempts) {
        const c = Number(a.credits || 0);
        const gp4 = GRADE_POINT_4_MAP[a.letterGrade] ?? 2.0;
        semPoints += gp4 * c;
        semCredits += c;
      }
      if (semCredits > 0) {
        gpa = Number((semPoints / semCredits).toFixed(2));
      }
    }
  }

  // Cảnh báo học vụ theo BR-07
  const warnings = [];
  let riskLevel = 'NORMAL';
  let academicStatus = 'NORMAL';

  if (cpa !== null && cpa < 2.00) {
    riskLevel = 'WARNING_LEVEL_1';
    academicStatus = 'AT_RISK';
    warnings.push(`Cảnh báo học vụ Mức 1 (BR-07): CPA tích lũy hiện tại (${cpa}) dưới 2.00.`);
  }

  if (failedCourses.length > 0) {
    const failedCodes = failedCourses.map((f) => f.courseCode).join(', ');
    warnings.push(`Còn nợ ${failedCourses.length} học phần: ${failedCodes}. Cần đăng ký học lại sớm để mở khóa tiến độ.`);
    if (riskLevel === 'NORMAL') {
      riskLevel = 'WARNING_LEVEL_1';
      academicStatus = 'AT_RISK';
    }
  }

  const finalWarnings = preset?.warnings?.length ? preset.warnings : warnings;
  const progressPercent = Number(((finalAccumulatedCredits / totalCreditsRequired) * 100).toFixed(1));

  return {
    cpa,
    gpa,
    accumulatedCredits: finalAccumulatedCredits,
    totalCreditsRequired,
    progressPercent,
    riskLevel,
    academicStatus,
    warnings: finalWarnings,
    failedCourses,
    passedCourses,
    inProgressCourses
  };
}

/**
 * State Controller lưu trữ dữ liệu Mock Service ở phạm vi singleton
 */
class MockAcademicServiceState {
  constructor() {
    this.reset();
  }

  reset() {
    this.personas = createDefaultPersonas();
    this.activePersonaId = 'at-risk';
    this.importSessions = new Map();
    this.sessionVersion = 1;
    this.hasImportedNewTranscript = false;
  }

  getActivePersona() {
    return this.personas[this.activePersonaId] || this.personas['at-risk'];
  }

  setActivePersona(personaId) {
    if (this.personas[personaId]) {
      this.activePersonaId = personaId;
      this.hasImportedNewTranscript = false;
      return this.getActivePersona();
    }
    return this.getActivePersona();
  }

  getStudentContext() {
    const student = this.getActivePersona();
    const preset = !this.hasImportedNewTranscript ? {
      initialCpa: student.initialCpa,
      initialCredits: student.initialCredits,
      initialGpa: student.initialGpa,
      warnings: student.warnings
    } : null;
    const metrics = computeServerAcademicMetrics(student.attempts, student.totalCreditsRequired, preset);

    return {
      student_id: student.studentId,
      studentId: student.studentId,
      full_name: student.fullName,
      fullName: student.fullName,
      major_id: student.majorCode,
      majorCode: student.majorCode,
      majorName: student.majorName,
      cohort: student.cohort,
      current_cpa: metrics.cpa,
      cpa: metrics.cpa,
      gpa: metrics.gpa,
      accumulated_credits: metrics.accumulatedCredits,
      accumulatedCredits: metrics.accumulatedCredits,
      totalCreditsRequired: metrics.totalCreditsRequired,
      academic_status: metrics.academicStatus,
      riskLevel: metrics.riskLevel,
      warnings: metrics.warnings,
      progressPercent: metrics.progressPercent,
      hasTranscript: student.attempts.length > 0,
      className: student.className,
      email: student.email,
      faculty: student.faculty,
      dataRevision: `REV-${student.studentId}-${this.sessionVersion}`,
      policyVersion: 'policy-haui-demo-2026@0.0.1-v0',
      fixtureLabel: FIXTURE_TAG,
      regulationTag: UNVERIFIED_RULE_TAG
    };
  }

  getAcademicStatus() {
    const context = this.getStudentContext();
    return {
      studentId: context.studentId,
      gpa: context.gpa,
      cpa: context.cpa,
      accumulatedCredits: context.accumulatedCredits,
      totalCreditsRequired: context.totalCreditsRequired,
      riskLevel: context.riskLevel,
      academicStatus: context.academic_status,
      warnings: context.warnings,
      dataRevision: context.dataRevision,
      policyVersion: 'policy-haui-demo-2026@0.0.1-v0',
      knowledgeBlocks: [
        { blockId: 'GEN', name: 'Khối kiến thức Đại cương', accumulatedCredits: Math.min(context.accumulatedCredits, 30), totalCreditsRequired: 30, percentage: Math.min(100, Math.round((context.accumulatedCredits / 30) * 100)), color: 'var(--color-success)' },
        { blockId: 'CORE', name: 'Khối Cơ sở ngành', accumulatedCredits: Math.max(0, Math.min(context.accumulatedCredits - 30, 48)), totalCreditsRequired: 48, percentage: Math.min(100, Math.round((Math.max(0, context.accumulatedCredits - 30) / 48) * 100)), color: 'var(--color-primary)' },
        { blockId: 'SPEC', name: 'Khối Chuyên ngành', accumulatedCredits: Math.max(0, Math.min(context.accumulatedCredits - 78, 30)), totalCreditsRequired: 30, percentage: Math.min(100, Math.round((Math.max(0, context.accumulatedCredits - 78) / 30) * 100)), color: 'var(--color-info)' },
        { blockId: 'ELEC', name: 'Khối Tự chọn', accumulatedCredits: Math.max(0, Math.min(context.accumulatedCredits - 108, 15)), totalCreditsRequired: 15, percentage: Math.min(100, Math.round((Math.max(0, context.accumulatedCredits - 108) / 15) * 100)), color: 'var(--color-warning)' },
        { blockId: 'GRAD', name: 'Khối Tốt nghiệp (Đồ án)', accumulatedCredits: 0, totalCreditsRequired: 12, percentage: 0, color: 'var(--color-text-muted)' }
      ],
      fixtureLabel: FIXTURE_TAG
    };
  }

  getTranscript() {
    const student = this.getActivePersona();
    const attempts = student.attempts.map((a) => ({
      courseCode: a.courseCode,
      course_code: a.courseCode,
      courseName: a.courseName,
      course_name: a.courseName,
      credits: a.credits,
      semesterCode: a.semesterCode,
      semester_code: a.semesterCode,
      attemptNumber: a.attemptNumber || 1,
      attempt_number: a.attemptNumber || 1,
      score10: a.score10,
      score_10: a.score10,
      letterGrade: a.letterGrade,
      letter_grade: a.letterGrade,
      gradePoint: a.letterGrade ? (GRADE_POINT_4_MAP[a.letterGrade] ?? null) : null,
      status: a.status
    }));

    return {
      studentId: student.studentId,
      student_id: student.studentId,
      transcriptStatus: student.attempts.length > 0 ? 'CONFIRMED' : 'EMPTY',
      sourceType: student.attempts.length > 0 ? 'DEMO_SEED' : 'NONE',
      attempts,
      records: attempts, // Alias tương thích
      dataRevision: `REV-${student.studentId}-${this.sessionVersion}`,
      fixtureLabel: FIXTURE_TAG
    };
  }

  getCurriculum() {
    const student = this.getActivePersona();
    const passedCodes = new Set(
      student.attempts
        .filter((a) => a.letterGrade && a.letterGrade !== 'F' && a.status !== 'FAILED')
        .map((a) => a.courseCode)
    );
    const inProgressCodes = new Set(
      student.attempts
        .filter((a) => a.status === 'IN_PROGRESS' || a.letterGrade === null)
        .map((a) => a.courseCode)
    );
    const failedCodes = new Set(
      student.attempts
        .filter((a) => a.letterGrade === 'F' || a.status === 'FAILED')
        .map((a) => a.courseCode)
    );

    const enrichedCourses = CURRICULUM_COURSES_BASE.map((course) => {
      let status = 'NOT_TAKEN';
      let nodeColor = 'GRAY';

      if (passedCodes.has(course.courseCode)) {
        status = 'PASSED';
        nodeColor = 'GREEN';
      } else if (inProgressCodes.has(course.courseCode)) {
        status = 'IN_PROGRESS';
        nodeColor = 'YELLOW';
      } else if (failedCodes.has(course.courseCode)) {
        status = 'FAILED';
        nodeColor = 'RED';
      } else {
        // Kiểm tra xem có bị chặn bởi môn tiên quyết không
        const isBlocked = course.prerequisiteCourseCodes.some((pre) => !passedCodes.has(pre));
        if (isBlocked && course.prerequisiteCourseCodes.length > 0) {
          status = 'BLOCKED';
          nodeColor = 'RED';
        }
      }

      return {
        ...course,
        course_id: course.courseCode,
        course_name: course.courseName,
        block: course.knowledgeBlock,
        semester: course.suggestedSemester,
        status,
        nodeColor
      };
    });

    return {
      curriculumId: 'curriculum-ktpm-haui-2024',
      curriculumName: 'Chương trình đào tạo Kỹ sư Kỹ thuật phần mềm - HaUI (Khóa 2024)',
      majorCode: student.majorCode,
      majorName: student.majorName,
      faculty: student.faculty,
      totalCreditsRequired: student.totalCreditsRequired,
      status: 'VERIFIED_GROUND_TRUTH',
      source: 'Cổng thông tin đào tạo sv.haui.edu.vn',
      dataRevision: `REV-${student.studentId}-${this.sessionVersion}`,
      policyVersion: 'policy-haui-demo-2026@0.0.1-v0',
      courses: enrichedCourses,
      fixtureLabel: FIXTURE_TAG
    };
  }

  /**
   * Cây CTĐT kèm trạng thái học phần và điều kiện đăng ký (Contract V1.3.0 - GET /academic/curriculum/tree)
   */
  getCurriculumTree() {
    const student = this.getActivePersona();
    const hasTranscript = student.attempts && student.attempts.length > 0;
    const transcriptStatus = hasTranscript ? 'CONFIRMED' : 'NONE';

    const passedAttemptsMap = new Map();
    const inProgressAttemptsMap = new Map();
    const failedAttemptsMap = new Map();
    const allAttemptsMap = new Map();

    for (const a of (student.attempts || [])) {
      const code = a.courseCode;
      allAttemptsMap.set(code, a);
      if (a.letterGrade && a.letterGrade !== 'F' && a.status !== 'FAILED') {
        passedAttemptsMap.set(code, a);
      } else if (a.status === 'IN_PROGRESS' || (a.letterGrade === null && (a.score10 === null || a.score10 === undefined))) {
        inProgressAttemptsMap.set(code, a);
      } else if (a.letterGrade === 'F' || a.status === 'FAILED') {
        failedAttemptsMap.set(code, a);
      }
    }

    const passedCodes = new Set(passedAttemptsMap.keys());

    const courses = CURRICULUM_COURSES_BASE.map((course) => {
      const code = course.courseCode;
      let status = 'UNKNOWN';
      let letterGrade = null;
      let semesterCode = null;

      if (!hasTranscript) {
        status = 'UNKNOWN';
      } else if (passedAttemptsMap.has(code)) {
        status = 'PASSED';
        const att = passedAttemptsMap.get(code);
        letterGrade = att.letterGrade;
        semesterCode = att.semesterCode;
      } else if (inProgressAttemptsMap.has(code)) {
        status = 'IN_PROGRESS';
        const att = inProgressAttemptsMap.get(code);
        letterGrade = att.letterGrade;
        semesterCode = att.semesterCode;
      } else if (failedAttemptsMap.has(code)) {
        status = 'FAILED';
        const att = failedAttemptsMap.get(code);
        letterGrade = att.letterGrade || 'F';
        semesterCode = att.semesterCode;
      } else {
        // Chưa học
        const missing = (course.prerequisiteCourseCodes || []).filter((pre) => !passedCodes.has(pre));
        if (missing.length === 0) {
          status = 'ELIGIBLE';
        } else {
          status = 'BLOCKED';
        }
      }

      // Thẩm định điều kiện theo rule engine
      const missingPrerequisites = [];
      for (const pre of (course.prerequisiteCourseCodes || [])) {
        if (!passedCodes.has(pre)) {
          const preCourse = CURRICULUM_COURSES_BASE.find((c) => c.courseCode === pre);
          const name = preCourse ? preCourse.courseName : pre;
          missingPrerequisites.push(`${pre} - ${name} (chưa đạt)`);
        }
      }
      for (const prior of (course.priorCourseCodes || [])) {
        const hasStudiedPrior = allAttemptsMap.has(prior);
        if (!hasStudiedPrior) {
          missingPrerequisites.push(`${prior} (chưa đăng ký học phần học trước)`);
        }
      }

      const eligible = missingPrerequisites.length === 0;
      const warnings = eligible
        ? []
        : [
            `Rule Engine: Chưa đáp ứng điều kiện tiên quyết/học trước cho học phần ${code}`
          ];

      return {
        courseCode: course.courseCode,
        courseName: course.courseName,
        credits: course.credits,
        knowledgeBlock: course.knowledgeBlock,
        suggestedSemester: course.suggestedSemester,
        mandatory: course.mandatory,
        prerequisiteCourseCodes: course.prerequisiteCourseCodes || [],
        priorCourseCodes: course.priorCourseCodes || [],
        corequisiteCourseCodes: course.corequisiteCourseCodes || [],
        status,
        letterGrade,
        semesterCode,
        eligible,
        missingPrerequisites,
        warnings
      };
    });

    return {
      studentId: student.studentId,
      curriculumId: 'curriculum-ktpm-haui-2024',
      curriculumName: 'Chương trình đào tạo Kỹ sư Kỹ thuật phần mềm - HaUI (Khóa 2024)',
      majorCode: student.majorCode,
      totalCreditsRequired: student.totalCreditsRequired || 150,
      transcriptStatus,
      courses,
      dataRevision: `REV-${student.studentId}-${this.sessionVersion}`,
      policyVersion: 'policy-haui-demo-2026@0.0.1-v0'
    };
  }

  checkEligibility(courseCode) {
    const student = this.getActivePersona();
    const passedCodes = new Set(
      student.attempts
        .filter((a) => a.letterGrade && a.letterGrade !== 'F' && a.status !== 'FAILED')
        .map((a) => a.courseCode)
    );

    const targetCourse = CURRICULUM_COURSES_BASE.find(
      (c) => c.courseCode.toUpperCase() === String(courseCode || '').toUpperCase()
    );

    if (!targetCourse) {
      return {
        courseCode,
        eligible: true,
        missingPrerequisites: [],
        warnings: [],
        dataRevision: `REV-${student.studentId}-${this.sessionVersion}`,
        policyVersion: 'policy-haui-demo-2026@0.0.1-v0',
        fixtureLabel: FIXTURE_TAG
      };
    }

    const missingPrerequisites = [];
    for (const pre of targetCourse.prerequisiteCourseCodes) {
      if (!passedCodes.has(pre)) {
        const preCourse = CURRICULUM_COURSES_BASE.find((c) => c.courseCode === pre);
        const name = preCourse ? preCourse.courseName : pre;
        missingPrerequisites.push(`${pre} - ${name} (Chưa hoàn thành môn tiên quyết BR-01)`);
      }
    }

    const eligible = missingPrerequisites.length === 0;
    const warnings = eligible
      ? []
      : [
          `Rule Engine chặn đăng ký (AC-02 / BR-01): Sinh viên cần hoàn thành ${missingPrerequisites.join(', ')} trước khi thêm học phần này vào kế hoạch.`
        ];

    return {
      courseCode: targetCourse.courseCode,
      eligible,
      missingPrerequisites,
      warnings,
      dataRevision: `REV-${student.studentId}-${this.sessionVersion}`,
      policyVersion: 'policy-haui-demo-2026@0.0.1-v0',
      fixtureLabel: FIXTURE_TAG
    };
  }

  /**
   * Tạo phiên Import Bảng điểm (Upload File PDF / Ảnh hoặc Nhập tay)
   */
  createImportSession(options = {}) {
    const student = this.getActivePersona();
    const sessionId = `imp-${student.studentId}-${Date.now()}`;
    const fileName = options.fileName || 'Bang_Diem_eHaUI_Export.pdf';
    const isManual = options.isManual || false;

    // Các dòng bóc tách mẫu dựa trên MOCK_TRANSCRIPT_INGESTION_PREVIEW (7 môn)
    const defaultSampleRows = [
      { rowId: 'row-001', courseCode: 'MATH1001', courseName: 'Giải tích 1', documentCourseName: 'Giải tích 1', credits: 3, semesterCode: '2024_1', score10: 8.1, letterGrade: 'B+', included: true, issues: [] },
      { rowId: 'row-002', courseCode: 'IT1001', courseName: 'Nhập môn lập trình', documentCourseName: 'Nhập môn lập trình', credits: 3, semesterCode: '2024_1', score10: 8.7, letterGrade: 'A', included: true, issues: [] },
      { rowId: 'row-003', courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', documentCourseName: 'Triết học Mác - Lênin', credits: 3, semesterCode: '2024_1', score10: 4.5, letterGrade: 'D', included: true, issues: [] },
      { rowId: 'row-004', courseCode: 'MATH1002', courseName: 'Toán rời rạc', documentCourseName: 'Toán rời rạc', credits: 3, semesterCode: '2024_2', score10: 3.2, letterGrade: 'F', included: true, issues: [{ code: 'FAILED_PREREQUISITE', blocking: false, message: 'Điểm F học phần tiên quyết' }] },
      { rowId: 'row-005', courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', documentCourseName: 'Lập trình hướng đối tượng', credits: 4, semesterCode: '2024_2', score10: 5.2, letterGrade: 'D+', included: true, issues: [] },
      { rowId: 'row-006', courseCode: 'IT3001', courseName: 'Mạng máy tính căn bản', documentCourseName: 'Mạng máy tính căn bản', credits: 3, semesterCode: '2025_1', score10: 7.4, letterGrade: 'B', included: true, issues: [] },
      { rowId: 'row-007', courseCode: 'IT3004', courseName: 'Hệ quản trị Cơ sở dữ liệu', documentCourseName: 'Hệ quản trị Cơ sở dữ liệu', credits: 3, semesterCode: '2025_2', score10: null, letterGrade: null, included: true, issues: [{ code: 'MISSING_GRADE', blocking: false, message: 'Đang học' }] }
    ];

    const inputRows = Array.isArray(options.rows) && options.rows.length > 0
      ? options.rows.map((r, i) => ({
          rowId: r.rowId || `row-${i + 1}`,
          courseCode: r.courseCode,
          courseName: r.courseName || r.courseCode,
          documentCourseName: r.courseName || r.courseCode,
          credits: Number(r.credits || 3),
          semesterCode: r.semesterCode || '2025_1',
          score10: r.score10 !== undefined && r.score10 !== null ? Number(r.score10) : null,
          letterGrade: r.letterGrade || (r.score10 >= 8.5 ? 'A' : r.score10 >= 7 ? 'B' : r.score10 >= 5.5 ? 'C' : r.score10 >= 4 ? 'D' : 'F'),
          gradePoint: r.gradePoint ?? (r.letterGrade ? (GRADE_POINT_4_MAP[r.letterGrade] ?? null) : null),
          included: r.included !== false,
          issues: []
        }))
      : defaultSampleRows;

    const session = {
      importSessionId: sessionId,
      status: 'REVIEW_REQUIRED',
      sourceType: isManual ? 'MANUAL_ENTRY' : 'PDF_TEXT',
      fileName,
      fileSizeBytes: 42100,
      pageCount: 2,
      sessionVersion: 1,
      rows: inputRows,
      documentSummary: {
        studentIdOnDocument: student.studentId,
        fullNameOnDocument: student.fullName,
        reportedCpa: 2.45,
        reportedAccumulatedCredits: 58
      },
      warnings: [
        'CPA và số tín chỉ in trên tài liệu chỉ để đối chiếu; CPA chính thức do hệ thống tính từ bảng điểm sau khi bạn xác nhận.'
      ],
      blockingIssueCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedAt: null
    };

    this.importSessions.set(sessionId, session);
    return session;
  }

  getImportSession(sessionId) {
    return this.importSessions.get(sessionId) || null;
  }

  updateImportRows(sessionId, updatedRows) {
    const session = this.importSessions.get(sessionId);
    if (!session) return null;

    session.rows = updatedRows.map((r) => ({
      ...r,
      letterGrade: r.letterGrade ? String(r.letterGrade).toUpperCase().trim() : null
    }));
    session.sessionVersion += 1;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  confirmImportSession(sessionId) {
    const session = this.importSessions.get(sessionId);
    if (!session) return null;

    const student = this.getActivePersona();
    const confirmedRows = session.rows.filter((r) => r.included !== false);

    // Chuyển rows thành attempts của sinh viên
    const newAttempts = confirmedRows.map((r) => ({
      courseCode: r.courseCode,
      courseName: r.courseName,
      credits: Number(r.credits || 3),
      semesterCode: r.semesterCode || '2025_1',
      attemptNumber: 1,
      score10: r.score10 !== null && r.score10 !== undefined ? Number(r.score10) : null,
      letterGrade: r.letterGrade || null,
      gradePoint: r.gradePoint ?? (r.letterGrade ? (GRADE_POINT_4_MAP[r.letterGrade] ?? null) : null),
      status: r.letterGrade === 'F' ? 'FAILED' : (r.letterGrade ? 'PASSED' : 'IN_PROGRESS')
    }));

    student.attempts = newAttempts;
    student.hasTranscript = newAttempts.length > 0;
    this.hasImportedNewTranscript = true;
    this.sessionVersion += 1;

    session.status = 'CONFIRMED';
    session.confirmedAt = new Date().toISOString();

    const metrics = computeServerAcademicMetrics(student.attempts, student.totalCreditsRequired);

    return {
      studentId: student.studentId,
      student_id: student.studentId,
      status: 'CONFIRMED',
      transcriptStatus: 'CONFIRMED',
      sourceType: session.sourceType,
      importSessionId: session.importSessionId,
      confirmedAt: session.confirmedAt,
      dataRevision: `REV-${student.studentId}-${this.sessionVersion}`,
      attempts: student.attempts,
      current_cpa: metrics.cpa,
      accumulated_credits: metrics.accumulatedCredits,
      academic_status: metrics.academicStatus,
      warnings: metrics.warnings
    };
  }

  /**
   * Báo cáo Kiểm toán Tốt nghiệp 100% Tiêu chí (Task 3.9)
   * Hỗ trợ 2 chế độ:
   * - 'actual' (Thực tế): Phản ánh dữ liệu chính thức e-HaUI (82%, 112/135 TC, thiếu tự chọn và MOS, nợ MATH1002).
   * - 'projected' (Dự kiến): Mô phỏng hoàn thành lộ trình bù đắp 2 kỳ (100%, 135/135 TC, CPA 3.25 Loại Giỏi).
   * @param {Object|string} [options]
   */
  getGraduationAudit(options = {}) {
    const mode = typeof options === 'string' ? options : (options?.mode || 'actual');
    if (mode === 'projected') {
      return { ...MOCK_PROJECTED_GRADUATION_AUDIT, policyVersion: 'policy-haui-demo-2026@0.0.1-v0' };
    }

    const student = this.getActivePersona();
    if (student.studentId === 'std-2026-001' || !student.studentId) {
      return { ...MOCK_GRADUATION_AUDIT, policyVersion: 'policy-haui-demo-2026@0.0.1-v0' };
    }
    const metrics = computeServerAcademicMetrics(student.attempts, student.totalCreditsRequired, student);
    const earned = metrics.accumulatedCredits;
    const total = student.totalCreditsRequired || 135;
    const completedPercentage = Math.min(100, Math.round((earned / total) * 100));

    // Xây dựng 7 tiêu chí kiểm toán
    const checklist = [
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
          : 'Đã tích lũy 6 / 12 tín chỉ (Cảnh báo: Cần đăng ký thêm 2 môn tự chọn trong danh mục)'
      },
      {
        id: 'CHK-04',
        category: '4. CHUẨN NGOẠI NGỮ',
        name: 'Chứng chỉ Chuẩn đầu ra Ngoại ngữ (TOEIC 550 / VSTEP - DEMO_UNVERIFIED)',
        completed: student.studentId !== 'std-2026-empty',
        totalCreditsRequired: null,
        accumulatedCredits: null,
        statusMessage: student.studentId !== 'std-2026-empty'
          ? 'Đã nộp chứng chỉ TOEIC 550 (Hợp lệ - Tích xanh)'
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
        statusMessage: `${student.studentId === 'std-2026-001' ? 78 : (student.studentId === 'std-2026-normal' ? 84 : 70)} điểm (Loại Khá - Đạt yêu cầu)`
      }
    ];

    return {
      studentId: student.studentId,
      student_id: student.studentId,
      reportType: 'ACTUAL',
      eligibleForGraduation: earned >= total && checklist.every((c) => c.completed === true),
      eligibleForThesis: earned >= 115, // BR-09: Cần >= 85% tổng tín chỉ (115/135 TC)
      completedPercentage,
      accumulatedCredits: earned,
      totalCreditsRequired: total,
      trainingScore: student.studentId === 'std-2026-001' ? 78 : 84,
      trainingClassification: 'Khá (Đạt yêu cầu xét tốt nghiệp)',
      retakeCreditsPercentage: 2.2,
      expectedDegreeRank: metrics.cpa && metrics.cpa >= 3.2 ? 'Giỏi' : (metrics.cpa && metrics.cpa >= 2.5 ? 'Khá' : 'Trung bình'),
      checklist,
      pendingActions: [
        {
          certificateType: 'MOS',
          requiredStandard: 'Đạt chứng chỉ Tin học MOS 3 môn (DEMO_UNVERIFIED)',
          actionDescription: 'Đăng ký thi đợt gần nhất tại Trung tâm CNTT và nộp chứng chỉ trước đợt xét tốt nghiệp 3 tháng',
          deadline: '2027-03-31',
          status: 'PENDING'
        },
        ...(earned < total ? [
          {
            certificateType: 'ELECTIVE_CREDITS',
            requiredStandard: 'Bổ sung 6 tín chỉ Tự chọn chuyên ngành (2 học phần)',
            actionDescription: 'Đưa 2 môn tự chọn (IT6010, IT6015) vào Kế hoạch học tập kỳ tới',
            deadline: '2027-01-15',
            status: 'PENDING'
          }
        ] : [])
      ],
      dataRevision: `REV-${student.studentId}-${this.sessionVersion}`,
      policyVersion: 'policy-haui-demo-2026@0.0.1-v0',
      fixtureLabel: FIXTURE_TAG,
      regulationTag: UNVERIFIED_RULE_TAG
    };
  }
}

export const mockAcademicService = new MockAcademicServiceState();
export default mockAcademicService;
