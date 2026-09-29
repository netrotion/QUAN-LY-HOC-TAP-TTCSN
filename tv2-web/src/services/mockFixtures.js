/**
 * HaUI Advisor — Local V0 Mock Fixtures (FIXTURE_ONLY)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Căn cứ thiết kế:
 * - Tài liệu Thiết kế UI Flow (Màn hình 1 -> Màn hình 9, Luồng phụ A & B, Mục 5 Edge Cases)
 * - 1-Page Brief — HaUI Advisor (4 phân khúc sinh viên, giải pháp RAG + Rule Engine)
 * - Product Requirements Document (PRD: G1..G10, US-01..US-13, FR-01..FR-18, BR-01..BR-10, AC-01..AC-05, Phụ lục 13.1 & 13.2)
 *
 * Ràng buộc tuân thủ AGENTS.md:
 * 1. Mọi dữ liệu giả lập chỉ phục vụ phát triển cục bộ / kiểm thử V0 và gắn nhãn `FIXTURE_ONLY`.
 * 2. Các tham số quy chế học vụ HaUI chưa kiểm chứng chính thức phải gắn nhãn `DEMO_UNVERIFIED`.
 * 3. Dữ liệu khuyết thiếu (missing data) phải để `null` hoặc `'UNKNOWN'`, tuyệt đối không mặc định thành 0 hoặc "đạt".
 * 4. Không nhận `studentId` từ client làm định danh tin cậy; `studentId` trong phản hồi được giả lập từ Session Context.
 */

export const FIXTURE_TAG = 'FIXTURE_ONLY';
export const UNVERIFIED_RULE_TAG = 'DEMO_UNVERIFIED';

/**
 * Bảng quy đổi thang điểm 10 - điểm chữ - thang điểm 4 theo PRD (BR-05 — DEMO_UNVERIFIED)
 */
export const HAUI_GRADE_SCALE_BR05 = Object.freeze([
  { letter: 'A', minScore10: 8.5, maxScore10: 10.0, score4: 4.0, classification: 'Giỏi / Xuất sắc', allowRetake: false },
  { letter: 'B+', minScore10: 8.0, maxScore10: 8.4, score4: 3.5, classification: 'Khá giỏi', allowRetake: false },
  { letter: 'B', minScore10: 7.0, maxScore10: 7.9, score4: 3.0, classification: 'Khá', allowRetake: false },
  { letter: 'C+', minScore10: 6.5, maxScore10: 6.9, score4: 2.5, classification: 'Trung bình khá', allowRetake: false },
  { letter: 'C', minScore10: 5.5, maxScore10: 6.4, score4: 2.0, classification: 'Trung bình (Được học cải thiện - BR-06)', allowRetake: true },
  { letter: 'D+', minScore10: 5.0, maxScore10: 5.4, score4: 1.5, classification: 'Trung bình yếu (Ưu tiên cải thiện - BR-06)', allowRetake: true },
  { letter: 'D', minScore10: 4.0, maxScore10: 4.9, score4: 1.0, classification: 'Yếu (Ưu tiên cải thiện cao - BR-06)', allowRetake: true },
  { letter: 'F', minScore10: 0.0, maxScore10: 3.9, score4: 0.0, classification: 'Trượt / Bắt buộc học lại (BR-01)', allowRetake: true }
]);

/**
 * 10 Quy tắc nghiệp vụ cốt lõi từ PRD Mục 9 (BR-01 -> BR-10, gắn nhãn DEMO_UNVERIFIED)
 */
export const HAUI_BUSINESS_RULES = Object.freeze([
  { code: 'BR-01', title: 'Môn tiên quyết (Prerequisite)', rule: 'Chỉ được đăng ký môn B khi đã học và đạt môn tiên quyết A (Điểm 10 >= 4.0 hoặc điểm chữ khác F).', tag: UNVERIFIED_RULE_TAG },
  { code: 'BR-02', title: 'Môn học trước (Prior)', rule: 'Được đăng ký môn B nếu môn học trước A đã dự thi không bị cấm thi (kể cả điểm F).', tag: UNVERIFIED_RULE_TAG },
  { code: 'BR-03', title: 'Giới hạn tín chỉ tối thiểu', rule: 'Trong học kỳ chính phải đăng ký tối thiểu 10 tín chỉ (ngoại trừ học kỳ cuối).', tag: UNVERIFIED_RULE_TAG },
  { code: 'BR-04', title: 'Giới hạn tín chỉ tối đa', rule: 'Đăng ký tối đa 24 tín chỉ trong học kỳ chính; học kỳ phụ (kỳ hè) tối đa 12 tín chỉ.', tag: UNVERIFIED_RULE_TAG },
  { code: 'BR-05', title: 'Thang điểm 4 & Quy đổi', rule: 'A (4.0), B+ (3.5), B (3.0), C+ (2.5), C (2.0), D+ (1.5), D (1.0), F (0.0 - Trượt).', tag: UNVERIFIED_RULE_TAG },
  { code: 'BR-06', title: 'Học cải thiện điểm', rule: 'Chỉ được học cải thiện các môn đạt điểm D, D+, C. Điểm mới cao hơn sẽ thay thế điểm cũ khi tính CPA.', tag: UNVERIFIED_RULE_TAG },
  { code: 'BR-07', title: 'Cảnh báo học tập', rule: 'CPA < 1.20 (Năm 1), < 1.40 (Năm 2), < 1.60 (Năm 3) hoặc nợ quá 24 TC. Buộc thôi học nếu cảnh báo 2 lần liên tiếp.', tag: UNVERIFIED_RULE_TAG },
  { code: 'BR-08', title: 'Xếp loại tốt nghiệp', rule: 'Xuất sắc (>= 3.60), Giỏi (3.20 - 3.59), Khá (2.50 - 3.19), Trung bình (2.00 - 2.49). Hạ 1 bậc nếu học lại > 5% CTĐT.', tag: UNVERIFIED_RULE_TAG },
  { code: 'BR-09', title: 'Nhận Đồ án tốt nghiệp', rule: 'Tích lũy tối thiểu 85% tổng số tín chỉ CTĐT và không nợ môn tiên quyết của đồ án.', tag: UNVERIFIED_RULE_TAG },
  { code: 'BR-10', title: 'Điều kiện xét Tốt nghiệp', rule: 'Tích lũy đủ 100% tín chỉ CTĐT, nộp đủ chuẩn ngoại ngữ, tin học, GDQP-AN, GDTC và CPA >= 2.00.', tag: UNVERIFIED_RULE_TAG }
]);

/**
 * Trọng số thuật toán xếp lịch môn học tối ưu (PRD Phụ lục 13.1)
 */
export const OPTIMIZER_WEIGHTS = Object.freeze([
  { criterion: 'Môn nợ là tiên quyết của nhiều môn sau', weight: '40%', purpose: 'Khơi thông mạch học tập, tránh nợ dây chuyền làm chậm tốt nghiệp.' },
  { criterion: 'Môn bắt buộc theo tiến độ chuẩn CTĐT', weight: '25%', purpose: 'Đảm bảo đúng khung chương trình đào tạo của trường.' },
  { criterion: 'Môn học cải thiện có ROI tăng CPA cao nhất', weight: '20%', purpose: 'Giúp nâng hạng bằng hoặc gỡ án cảnh báo nhanh nhất.' },
  { criterion: 'Cân bằng tải tín chỉ và độ khó môn học (10-24 TC)', weight: '15%', purpose: 'Tránh quá tải gây trượt môn hàng loạt trong kỳ.' }
]);

/**
 * 4 Phân khúc Sinh viên mục tiêu theo PRD Mục 2 & 1-Page Brief
 */
export const STUDENT_PERSONAS = Object.freeze([
  {
    id: 'at-risk',
    segment: '2. Sinh viên có nguy cơ / Cần kéo CPA (At-risk)',
    studentId: 'std-2026-001',
    fullName: 'Nguyễn Văn An',
    cohort: 'K17 (2022 - 2026)',
    majorName: 'Kỹ thuật phần mềm / CNTT',
    cpa: 2.45,
    gpa: null,
    accumulatedCredits: 68,
    totalCreditsRequired: 135,
    riskLevel: 'WARNING_LEVEL_1',
    rankLabel: 'Trung bình — Cách ngưỡng bằng Khá (2.50) đúng 0.05 điểm',
    painPoint: 'Đang nợ môn tiên quyết Toán rời rạc (3 TC), CPA 2.45 sát ngưỡng Khá 2.50.',
    goal: 'Gỡ môn tiên quyết MATH1002 ngay kỳ tới và kéo CPA >= 2.50.'
  },
  {
    id: 'freshman',
    segment: '1. Sinh viên năm nhất (Freshmen)',
    studentId: 'std-2026-002',
    fullName: 'Trần Minh Châu',
    cohort: 'K19 (2024 - 2028)',
    majorName: 'Công nghệ thông tin',
    cpa: 2.85,
    gpa: 2.85,
    accumulatedCredits: 18,
    totalCreditsRequired: 135,
    riskLevel: 'NORMAL',
    rankLabel: 'Khá — Đang làm quen học chế tín chỉ',
    painPoint: 'Bỡ ngỡ cách tính điểm thang 4/thang 10 và thứ tự học môn đại cương.',
    goal: 'Hiểu quy chế HaUI, lập lộ trình an toàn 16-18 TC/kỳ.'
  },
  {
    id: 'high-achiever',
    segment: '3. Sinh viên mục tiêu cao / Học vượt (High Achievers)',
    studentId: 'std-2026-003',
    fullName: 'Lê Hoàng Nam',
    cohort: 'K18 (2023 - 2027)',
    majorName: 'Kỹ thuật phần mềm',
    cpa: 3.42,
    gpa: 3.55,
    accumulatedCredits: 86,
    totalCreditsRequired: 135,
    riskLevel: 'NORMAL',
    rankLabel: 'Giỏi — Mục tiêu học vượt 3.5 năm & săn học bổng',
    painPoint: 'Cần phân bổ 20-24 TC/kỳ hợp lý để ra trường sớm mà không quá tải đồ án.',
    goal: 'Tốt nghiệp sớm sau 3.5 năm với bằng Giỏi/Xuất sắc (CPA >= 3.50).'
  },
  {
    id: 'pre-graduate',
    segment: '4. Sinh viên năm 3 – năm cuối (Pre-graduates)',
    studentId: 'std-2026-004',
    fullName: 'Phạm Thu Hà',
    cohort: 'K16 (2021 - 2025)',
    majorName: 'Công nghệ thông tin',
    cpa: 2.78,
    gpa: null,
    accumulatedCredits: 112,
    totalCreditsRequired: 135,
    riskLevel: 'WARNING_LEVEL_1',
    rankLabel: 'Khá — Chuẩn bị xét nhận Đồ án & Tốt nghiệp',
    painPoint: 'Thiếu 6 TC tự chọn và chưa nộp chứng chỉ Tin học MOS trước hạn 3 tháng.',
    goal: 'Rà soát 100% checklist tốt nghiệp (Màn hình 9) và hoàn tất điều kiện còn thiếu.'
  }
]);

/**
 * Thông tin phiên sinh viên mặc định trích xuất từ Server Session Context (giả lập V0)
 */
export const MOCK_SESSION_STUDENT = Object.freeze({
  studentId: 'std-2026-001',
  fullName: 'Nguyễn Văn An',
  cohort: 'K17 (2022 - 2026)',
  majorCode: '7480103',
  majorName: 'Kỹ thuật phần mềm (CNTT)',
  faculty: 'Trường Công nghệ Thông tin và Truyền thông (SICT - HaUI)',
  advisorClass: 'KTPM01-K17',
  identitySource: 'SERVER_SESSION_CONTEXT',
  fixtureLabel: FIXTURE_TAG,
  regulationStatus: UNVERIFIED_RULE_TAG
});

/**
 * GET /api/v1/system/bootstrap
 */
export const MOCK_BOOTSTRAP_INFO = Object.freeze({
  contractVersion: '0.0.1-v0',
  runtimeMode: 'ui-api-v0',
  fixtureLabel: FIXTURE_TAG,
  modules: {
    contracts: 'READY',
    webHost: 'READY (ui-api-v0)',
    ai: 'NOT_IMPLEMENTED',
    academic: 'NOT_IMPLEMENTED',
    persistence: 'NOT_IMPLEMENTED'
  }
});

/**
 * GET /api/v1/system/health
 */
export function createMockHealthResponse() {
  return {
    status: 'UP',
    timestamp: new Date().toISOString(),
    fixtureLabel: FIXTURE_TAG,
    service: 'haui-advisor-mock-adapter-v0'
  };
}

/**
 * GET /api/v1/academic/status
 * Khớp chuẩn `academic-status-response.sample.json` + bổ sung phân rã tiến độ 5 khối kiến thức của Màn hình 1 UI Flow
 */
export const MOCK_ACADEMIC_STATUS = Object.freeze({
  studentId: 'std-2026-001',
  gpa: null, // Missing data: giữ nguyên null theo quy tắc 5 AGENTS.md, không mặc định thành 0
  gpaStatus: 'UNKNOWN',
  cpa: 2.45,
  cpaClassification: 'Trung bình (Cách ngưỡng bằng Khá 2.50 đúng 0.05 điểm)',
  accumulatedCredits: 68,
  totalCreditsRequired: 135,
  completionRatePercent: 50.4,
  riskLevel: 'WARNING_LEVEL_1',
  warningMessages: [
    'Bạn đang nợ môn Toán rời rạc (3 TC - MATH1002) – Đây là môn tiên quyết của Cấu trúc dữ liệu & Giải thuật (IT6001) kỳ tới!',
    'Điểm GPA học kỳ hiện tại đang ở trạng thái null / UNKNOWN (chưa khóa sổ điểm từ e-HaUI)'
  ],
  knowledgeBlocks: [
    { blockId: 'GEN', name: 'Khối kiến thức Đại cương', earnedCredits: 25.5, requiredCredits: 30, percentage: 85, color: 'var(--color-success)' },
    { blockId: 'CORE', name: 'Khối Cơ sở ngành', earnedCredits: 24, requiredCredits: 48, percentage: 50, color: 'var(--color-primary)' },
    { blockId: 'SPEC', name: 'Khối Chuyên ngành', earnedCredits: 3, requiredCredits: 30, percentage: 10, color: 'var(--color-info)' },
    { blockId: 'ELEC', name: 'Khối Tự chọn', earnedCredits: 3, requiredCredits: 15, percentage: 20, color: 'var(--color-warning)' },
    { blockId: 'GRAD', name: 'Khối Tốt nghiệp (Đồ án / Thực tập)', earnedCredits: 0, requiredCredits: 12, percentage: 0, color: 'var(--color-text-muted)' }
  ],
  dataRevision: 'rev-1001',
  fixtureLabel: FIXTURE_TAG,
  regulationTag: UNVERIFIED_RULE_TAG
});

/**
 * Dữ liệu mẫu cho Luồng phụ A (Bước A1 -> A4: Tải & Bóc tách Bảng điểm từ e-HaUI — FR-02, AC-01)
 */
export const MOCK_TRANSCRIPT_INGESTION_PREVIEW = Object.freeze({
  sourceFileName: 'Bang_Diem_Ca_Nhan_eHaUI_std-2026-001.pdf',
  extractedAt: '2026-09-29T08:30:00Z',
  studentId: 'std-2026-001',
  extractedCpa: 2.45,
  extractedAccumulatedCredits: 68,
  records: [
    { courseCode: 'MATH1001', courseName: 'Giải tích 1', semesterCode: '2024_1', credits: 3, score10: 8.1, letterGrade: 'B+', score4: 3.5, status: 'PASSED' },
    { courseCode: 'IT1001', courseName: 'Nhập môn lập trình', semesterCode: '2024_1', credits: 3, score10: 8.7, letterGrade: 'A', score4: 4.0, status: 'PASSED' },
    { courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', semesterCode: '2024_1', credits: 3, score10: 4.5, letterGrade: 'D', score4: 1.0, status: 'PASSED_LOW' },
    { courseCode: 'MATH1002', courseName: 'Toán rời rạc', semesterCode: '2024_2', credits: 3, score10: 3.2, letterGrade: 'F', score4: 0.0, status: 'FAILED' },
    { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', semesterCode: '2024_2', credits: 4, score10: 5.2, letterGrade: 'D+', score4: 1.5, status: 'PASSED_LOW' },
    { courseCode: 'IT3001', courseName: 'Mạng máy tính căn bản', semesterCode: '2025_1', credits: 3, score10: 7.4, letterGrade: 'B', score4: 3.0, status: 'PASSED' },
    { courseCode: 'IT3004', courseName: 'Hệ quản trị Cơ sở dữ liệu', semesterCode: '2025_2', credits: 3, score10: null, letterGrade: null, score4: null, status: 'IN_PROGRESS' }
  ],
  fixtureLabel: FIXTURE_TAG,
  regulationTag: UNVERIFIED_RULE_TAG
});

/**
 * POST /api/v1/academic/eligibility
 * Khớp chuẩn `course-eligibility-response.sample.json` và kịch bản AC-02 (Chặn tiên quyết)
 */
export function createMockEligibilityResponse(payload = {}) {
  const courseCode = (payload?.courseCode || 'IT6001').toUpperCase();

  const catalog = {
    IT6001: {
      courseCode: 'IT6001',
      courseName: 'Cấu trúc dữ liệu và giải thuật',
      eligible: false,
      relationType: 'PREREQUISITE (BR-01)',
      missingPrerequisites: ['MATH1002 - Toán rời rạc (Đang điểm F — Bắt buộc học lại đạt >= D)'],
      blockedDownstreamCourses: [
        'IT6005 - Phân tích và thiết kế thuật toán',
        'IT7001 - Trí tuệ nhân tạo',
        'IT7008 - Đồ án chuyên ngành Kỹ thuật phần mềm'
      ],
      warnings: [
        'Môn học này là tiên quyết cho 3 môn chuyên ngành ở kỳ tiếp theo (DEMO_UNVERIFIED)',
        'Rule Engine chặn đăng ký (AC-02): Bạn cần hoàn thành môn Toán rời rạc (MATH1002) trước khi thêm học phần này vào kế hoạch.'
      ],
      dataRevision: 'rev-1001',
      fixtureLabel: FIXTURE_TAG,
      regulationTag: UNVERIFIED_RULE_TAG
    },
    IT6002: {
      courseCode: 'IT6002',
      courseName: 'Lập trình mạng',
      eligible: true,
      relationType: 'PREREQUISITE (BR-01)',
      missingPrerequisites: [],
      blockedDownstreamCourses: ['IT7012 - An toàn mạng nâng cao'],
      warnings: [
        'Đã hoàn thành học phần tiên quyết Mạng máy tính căn bản (IT3001 - Điểm B) và Lập trình hướng đối tượng (IT2001 - Điểm D+)'
      ],
      dataRevision: 'rev-1001',
      fixtureLabel: FIXTURE_TAG,
      regulationTag: UNVERIFIED_RULE_TAG
    },
    MATH1002: {
      courseCode: 'MATH1002',
      courseName: 'Toán rời rạc',
      eligible: true,
      relationType: 'PRIOR (BR-02)',
      missingPrerequisites: [],
      blockedDownstreamCourses: ['IT6001 - Cấu trúc dữ liệu và giải thuật'],
      warnings: [
        'Học phần đang ở trạng thái Nợ môn (Điểm F ở kỳ trước) — AI đề xuất ưu tiên số 1 (Trọng số 40%) để gỡ nút thắt tiên quyết.'
      ],
      dataRevision: 'rev-1001',
      fixtureLabel: FIXTURE_TAG,
      regulationTag: UNVERIFIED_RULE_TAG
    }
  };

  return (
    catalog[courseCode] || {
      courseCode,
      courseName: `Học phần ${courseCode}`,
      eligible: true,
      relationType: 'PREREQUISITE (BR-01)',
      missingPrerequisites: [],
      blockedDownstreamCourses: [],
      warnings: [`Tham số điều kiện tiên quyết của ${courseCode} gắn nhãn ${UNVERIFIED_RULE_TAG}`],
      dataRevision: 'rev-1001',
      fixtureLabel: FIXTURE_TAG,
      regulationTag: UNVERIFIED_RULE_TAG
    }
  );
}

/**
 * GET /api/v1/audit/graduation
 * Khớp chuẩn `graduation-audit-response.sample.json` + đầy đủ 7 mục Checklist của Màn hình 9 UI Flow & FR-17
 */
export const MOCK_GRADUATION_AUDIT = Object.freeze({
  studentId: 'std-2026-001',
  eligibleForGraduation: false,
  eligibleForThesis: false, // BR-09: Cần >= 85% tổng tín chỉ (115/135 TC)
  completedPercentage: 82,
  totalCreditsEarned: 112,
  totalCreditsRequired: 135,
  trainingScore: 78,
  trainingClassification: 'Khá (Đạt yêu cầu xét tốt nghiệp)',
  retakeCreditsPercentage: 2.2, // < 5% nên không bị hạ bậc bằng theo BR-08
  expectedDegreeRank: 'Khá (Nếu nâng CPA từ 2.45 lên >= 2.50)',
  checklist: [
    {
      id: 'CHK-01',
      category: '1. TÍN CHỈ TÍCH LŨY',
      name: 'Tổng số tín chỉ tích lũy toàn khóa (BR-10)',
      completed: false,
      requiredCredits: 135,
      earnedCredits: 112,
      statusMessage: 'Đạt 112 / 135 tín chỉ (Còn thiếu 23 tín chỉ)'
    },
    {
      id: 'CHK-02',
      category: '2. KHỐI BẮT BUỘC',
      name: 'Khối kiến thức giáo dục đại cương & bắt buộc ngành',
      completed: true,
      requiredCredits: 94,
      earnedCredits: 94,
      statusMessage: 'Hoàn thành 100% các học phần bắt buộc theo tiến độ'
    },
    {
      id: 'CHK-03',
      category: '3. TỰ CHỌN CHUYÊN NGÀNH',
      name: 'Khối kiến thức tự chọn chuyên ngành',
      completed: false,
      requiredCredits: 12,
      earnedCredits: 6,
      statusMessage: 'Đã tích lũy 6 / 12 tín chỉ (Cảnh báo: Cần đăng ký thêm 2 môn tự chọn trong danh mục)'
    },
    {
      id: 'CHK-04',
      category: '4. CHUẨN NGOẠI NGỮ',
      name: 'Chứng chỉ Chuẩn đầu ra Ngoại ngữ (TOEIC 550 / VSTEP - DEMO_UNVERIFIED)',
      completed: true,
      requiredCredits: null,
      earnedCredits: null,
      statusMessage: 'Đã nộp chứng chỉ TOEIC 550 (Hợp lệ - Tích xanh)'
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
      completed: true,
      requiredCredits: null,
      earnedCredits: null,
      statusMessage: 'Đã hoàn thành đầy đủ chứng chỉ GDTC và GDQP-AN'
    },
    {
      id: 'CHK-07',
      category: '7. ĐIỂM RÈN LUYỆN',
      name: 'Điểm rèn luyện tích lũy toàn khóa',
      completed: true,
      requiredCredits: null,
      earnedCredits: null,
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
      actionDescription: 'Đưa 2 môn tự chọn (IT6010, IT6015) vào Kế hoạch học tập kỳ tới',
      deadline: '2027-01-15',
      status: 'PENDING'
    }
  ],
  dataRevision: 'rev-1001',
  fixtureLabel: FIXTURE_TAG,
  regulationTag: UNVERIFIED_RULE_TAG
});

/**
 * POST /api/v1/planner/generate
 * Khớp chuẩn Màn hình 3 UI Flow (18 tín chỉ đề xuất, CPA dự kiến 2.54 đạt xếp loại Khá) & `generate-study-plan-response.sample.json`
 */
export const MOCK_STUDY_PLAN = Object.freeze({
  planId: 'plan-2026-9001',
  studentId: 'std-2026-001',
  status: 'DRAFT',
  stateMachineFlow: ['DRAFT', 'VALIDATED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
  semesters: [
    {
      semesterCode: '2026_1',
      semesterName: 'Học kỳ 1 – Năm học 2026-2027',
      workloadAssessment: 'Cân bằng (18 / 24 tín chỉ tối đa)',
      courses: [
        {
          courseCode: 'MATH1002',
          courseName: 'Toán rời rạc',
          credits: 3,
          courseType: 'Học lại (Nợ tiên quyết)',
          targetGrade: 'B (3.0)',
          rationale: 'Gỡ môn tiên quyết sống còn (Trọng số 40%) để mở khóa Cấu trúc dữ liệu & Giải thuật kỳ sau'
        },
        {
          courseCode: 'IT2001',
          courseName: 'Lập trình hướng đối tượng',
          credits: 4,
          courseType: 'Học cải thiện (Từ D+)',
          targetGrade: 'A (4.0)',
          rationale: 'Kéo CPA nhanh nhất (+0.16 CPA với 4 tín chỉ - Trọng số ROI 20%)'
        },
        {
          courseCode: 'IT6002',
          courseName: 'Lập trình mạng',
          credits: 3,
          courseType: 'Bắt buộc chuyên ngành',
          targetGrade: 'B+ (3.5)',
          rationale: 'Môn bắt buộc đúng tiến độ chuẩn CTĐT (Trọng số 25%)'
        },
        {
          courseCode: 'IT4001',
          courseName: 'Cơ sở dữ liệu nâng cao',
          credits: 3,
          courseType: 'Bắt buộc chuyên ngành',
          targetGrade: 'B (3.0)',
          rationale: 'Đã hoàn thành tiên quyết Hệ QTCSDL, cân bằng tải lý thuyết/thực hành'
        },
        {
          courseCode: 'IT6010',
          courseName: 'Phát triển ứng dụng Web hiện đại',
          credits: 3,
          courseType: 'Tự chọn chuyên ngành',
          targetGrade: 'A (4.0)',
          rationale: 'Bù đắp tín chỉ khối Tự chọn còn thiếu trong Audit tốt nghiệp'
        },
        {
          courseCode: 'FL2001',
          courseName: 'Tiếng Anh Công nghệ thông tin',
          credits: 2,
          courseType: 'Bắt buộc chung',
          targetGrade: 'B (3.0)',
          rationale: 'Đạt chuẩn 18 tín chỉ cân bằng trong học kỳ chính (10 - 24 TC)'
        }
      ],
      totalCredits: 18,
      expectedGpa: 3.44
    }
  ],
  projectedCpa: 2.54,
  projectedRank: 'Khá (CPA >= 2.50)',
  aiRiskAdvice:
    'Nếu không học lại môn Toán rời rạc (MATH1002) trong kỳ này, bạn sẽ bị hoãn ít nhất 3 môn chuyên ngành ở kỳ tiếp theo (Cấu trúc dữ liệu & GT, Phân tích thiết kế thuật toán, Trí tuệ nhân tạo).',
  warnings: [
    'Tổng số tín chỉ đề xuất: 18/24 TC -> Hợp lệ theo quy chế HaUI (Tối thiểu 10 TC, tối đa 24 TC - DEMO_UNVERIFIED)'
  ],
  planVersion: 1,
  dataRevision: 'rev-1001',
  fixtureLabel: FIXTURE_TAG,
  regulationTag: UNVERIFIED_RULE_TAG
});

/**
 * POST /api/v1/planner/validate
 * Hỗ trợ kiểm tra quy chế thời gian thực (10 <= credits <= 24) theo Màn hình 5 UI Flow & BR-03, BR-04
 */
export function createMockValidatePlanResponse(payload = {}) {
  const totalCredits = Number(payload?.totalCredits ?? 3);

  if (totalCredits >= 10 && totalCredits <= 24) {
    return {
      valid: true,
      status: 'VALIDATED',
      totalCredits,
      violations: [],
      warnings:
        totalCredits >= 20
          ? ['Cảnh báo tải học tập cao (20-24 TC): Cần chú ý phân bổ thời gian nếu có 2 môn đồ án lớn trong cùng học kỳ.']
          : ['Tổng số tín chỉ nằm trong ngưỡng cân bằng (10 - 24 TC theo quy chế HaUI - DEMO_UNVERIFIED).'],
      planVersion: 1,
      dataRevision: 'rev-1001',
      fixtureLabel: FIXTURE_TAG,
      regulationTag: UNVERIFIED_RULE_TAG
    };
  }

  const isUnderload = totalCredits < 10;
  return {
    valid: false,
    status: 'DRAFT',
    totalCredits,
    violations: [
      isUnderload
        ? `Vi phạm quy chế HaUI (BR-03): Tổng số tín chỉ đăng ký (${totalCredits} TC) nhỏ hơn sàn tối thiểu 10 TC trong học kỳ chính (DEMO_UNVERIFIED).`
        : `Vi phạm quy chế HaUI (BR-04): Tổng số tín chỉ đăng ký (${totalCredits} TC) vượt trần tối đa 24 TC trong học kỳ chính (DEMO_UNVERIFIED).`
    ],
    warnings: [
      isUnderload
        ? `Gợi ý: Cần bổ sung thêm ít nhất ${10 - totalCredits} tín chỉ để được phép Lưu Kế hoạch học tập mục tiêu.`
        : `Gợi ý: Cần rút bớt ít nhất ${totalCredits - 24} tín chỉ hoặc chuyển sang học kỳ hè (tối đa 12 TC).`
    ],
    planVersion: 1,
    dataRevision: 'rev-1001',
    fixtureLabel: FIXTURE_TAG,
    regulationTag: UNVERIFIED_RULE_TAG
  };
}

export const MOCK_VALIDATE_PLAN = Object.freeze(createMockValidatePlanResponse({ totalCredits: 3 }));

/**
 * POST /api/v1/planner/reconcile
 */
export const MOCK_RECONCILE_PLAN = Object.freeze({
  planId: 'plan-2026-9001',
  studentId: 'std-2026-001',
  onTrack: true,
  completedCourses: ['MATH1002 - Điểm B (Đã gỡ thành công nút thắt tiên quyết)'],
  missedOrFailedCourses: [],
  adjustmentsRecommended: [
    'Tiến độ phù hợp, mở khóa đăng ký học phần Cấu trúc dữ liệu & Giải thuật (IT6001) ở học kỳ tiếp theo'
  ],
  planVersion: 1,
  dataRevision: 'rev-1002',
  fixtureLabel: FIXTURE_TAG
});

/**
 * POST /api/v1/simulation/grades (Màn hình 6 UI Flow)
 */
export const MOCK_SIMULATE_GRADES = Object.freeze({
  studentId: 'std-2026-001',
  currentCpa: 2.45,
  projectedSemesterGpa: 3.44,
  projectedNewCpa: 2.58,
  cpaDifference: 0.13,
  rankChange: 'Từ Trung bình (2.45) -> Đạt ngưỡng Bằng Khá (2.58 >= 2.50)',
  dataRevision: 'rev-1001',
  fixtureLabel: FIXTURE_TAG
});

/**
 * POST /api/v1/simulation/retake-ranking (Màn hình 7 UI Flow: Retake ROI Optimizer - BR-06)
 */
export const MOCK_RETAKE_RANKING = Object.freeze({
  studentId: 'std-2026-001',
  recommendations: [
    {
      courseCode: 'IT2001',
      courseName: 'Lập trình hướng đối tượng',
      credits: 4,
      currentGrade: 'D+',
      currentGradePoints: 1.5,
      targetGrade: 'A',
      targetGradePoints: 4.0,
      potentialCpaGain: 0.16,
      rank: 1,
      badge: 'Khuyên dùng số 1',
      rationale: 'Môn 4 tín chỉ có điểm D+, cải thiện lên A giúp CPA tăng +0.16 điểm (ROI cao nhất)'
    },
    {
      courseCode: 'ML1001',
      courseName: 'Triết học Mác - Lênin',
      credits: 3,
      currentGrade: 'D',
      currentGradePoints: 1.0,
      targetGrade: 'B',
      targetGradePoints: 3.0,
      potentialCpaGain: 0.09,
      rank: 2,
      badge: 'Khuyên dùng số 2',
      rationale: 'Cải thiện từ D lên B giúp CPA tăng +0.09 điểm với chi phí 3 tín chỉ'
    }
  ],
  dataRevision: 'rev-1001',
  fixtureLabel: FIXTURE_TAG
});

/**
 * POST /api/v1/simulation/target-grades (Màn hình 8 UI Flow: Goal-Backward Calculator)
 */
export const MOCK_TARGET_GRADES = Object.freeze({
  studentId: 'std-2026-001',
  currentCpa: 2.45,
  targetCpa: 3.2,
  targetRankLabel: 'Bằng Giỏi (CPA >= 3.20)',
  remainingCredits: 67,
  requiredAverageGpa: 3.42,
  allocationSummary: 'Tối thiểu 60% môn đạt điểm A (4.0), 40% môn đạt điểm B+ (3.5), không có môn nào dưới B.',
  courseRequirements: [
    {
      courseCode: 'IT4001',
      courseName: 'Cơ sở dữ liệu nâng cao',
      credits: 3,
      requiredGrade: 'A (8.5)',
      requiredGradePoints: 4.0,
      rationale: 'Nhóm môn chuyên ngành cốt lõi cần đạt điểm A (4.0)'
    },
    {
      courseCode: 'IT6002',
      courseName: 'Lập trình mạng',
      credits: 3,
      requiredGrade: 'B+ (8.0)',
      requiredGradePoints: 3.5,
      rationale: 'Duy trì chuẩn GPA trung bình các kỳ còn lại >= 3.42'
    }
  ],
  feasibilityWarnings: [
    'Mục tiêu tốt nghiệp loại Giỏi (CPA >= 3.20) đòi hỏi GPA trung bình 67 tín chỉ còn lại >= 3.42 (mức tương đối thử thách, nên kết hợp học cải thiện môn điểm D/D+).'
  ],
  dataRevision: 'rev-1001',
  fixtureLabel: FIXTURE_TAG
});

/**
 * POST /api/v1/advisor/chat (Màn hình 2 UI Flow)
 * Lưu ý: Frontend KHÔNG gọi trực tiếp LLM. Endpoint này chỉ mô phỏng phản hồi từ Spring Boot Backend (TV5 -> TV1).
 */
export function createMockChatResponse(payload = {}) {
  const question = payload?.message || payload?.question || '';
  return {
    answer:
      question.trim().length > 0
        ? `[AI Advisor đối chiếu CTĐT & Bảng điểm cá nhân cho yêu cầu: "${question}"]: Với CPA hiện tại 2.45 (68/135 TC) và đang nợ môn Toán rời rạc (MATH1002), bạn nên đăng ký 18 tín chỉ ở Học kỳ 1 năm học 2026-2027 gồm: Học lại Toán rời rạc (3 TC - mục tiêu B) để mở khóa Cấu trúc dữ liệu & Giải thuật, học cải thiện Lập trình hướng đối tượng (4 TC từ D+ lên A, kéo +0.16 CPA) và 4 môn chuyên ngành/tự chọn. CPA dự kiến cuối kỳ sẽ đạt 2.54 (chính thức đạt ngưỡng Bằng Khá >= 2.50).`
        : 'Khi chưa đạt môn Toán rời rạc (MATH1002), bạn sẽ chưa đủ điều kiện tiên quyết để đăng ký môn Cấu trúc dữ liệu & Giải thuật (IT6001) trong học kỳ tới.',
    reasoningStatus: 'AI đã đối chiếu khung CTĐT ngành CNTT/KTPM, sơ đồ cây tiên quyết và bảng điểm cá nhân (rev-1001).',
    sources: [
      {
        sourceId: 'SRC_CTDT_DEMO',
        title: 'Khung CTĐT ngành CNTT/KTPM HaUI (Bản mẫu demo)',
        section: 'Mục 4.2 - Cây quan hệ học phần tiên quyết & Quy tắc BR-01..BR-10',
        version: UNVERIFIED_RULE_TAG,
        referenceUrl: '/curriculum'
      }
    ],
    actions: [
      {
        actionType: 'OPEN_RECOMMENDATIONS',
        label: 'Xem Kết quả Đề xuất Lộ trình (Màn hình 3)',
        targetRoute: '/recommendations',
        payloadJson: '{"planId":"plan-2026-9001"}'
      },
      {
        actionType: 'OPEN_TREE',
        label: 'Xem Sơ đồ Cây Môn học (Màn hình 4)',
        targetRoute: '/curriculum',
        payloadJson: '{"highlightCourse":"MATH1002"}'
      },
      {
        actionType: 'OPEN_PLANNER',
        label: 'Tùy chỉnh & Xác nhận Kế hoạch (Màn hình 5)',
        targetRoute: '/planner',
        payloadJson: '{"suggestedCourse":"MATH1002"}'
      }
    ],
    planProposal: MOCK_STUDY_PLAN,
    warnings: [
      'Quy tắc tiên quyết và thang điểm dựa trên dữ liệu mô phỏng (DEMO_UNVERIFIED), cần đối chiếu thông báo mở lớp chính thức trên e-HaUI.'
    ],
    fixtureLabel: FIXTURE_TAG
  };
}

/**
 * GET /api/v1/academic/curriculum
 * Dữ liệu Sơ đồ Cây quan hệ môn học (Màn hình 4 UI Flow + Luồng phụ B: Curriculum Explorer)
 * Hỗ trợ đủ 4 trạng thái màu sắc Node theo tài liệu thiết kế UI Flow:
 * - PASSED (Node Xanh lá): Đã hoàn thành
 * - FAILED (Node Đỏ - Rung cảnh báo): Trượt / Nợ môn kèm mũi tên trỏ đến môn bị chặn
 * - AI_RECOMMENDED (Node Vàng viền đậm): Được AI đề xuất đăng ký kỳ tới
 * - LOCKED / BLOCKED (Node Xám - Khóa): Chưa đủ điều kiện tiên quyết
 */
export const MOCK_CURRICULUM_TREE = Object.freeze({
  programCode: 'KTPM-CNTT-K17-DEMO',
  programName: 'Khung Chương trình Đào tạo Kỹ thuật Phần mềm / CNTT — Đại học Công nghiệp Hà Nội (Mẫu V0)',
  regulationTag: UNVERIFIED_RULE_TAG,
  fixtureLabel: FIXTURE_TAG,
  totalCredits: 135,
  courses: [
    {
      courseCode: 'MATH1001',
      courseName: 'Giải tích 1',
      credits: 3,
      lectureHours: 45,
      labHours: 0,
      semester: 1,
      specialization: 'Chung CNTT/KTPM',
      block: 'Đại cương',
      prerequisites: [],
      relationType: null,
      unlocks: ['MATH1002', 'MATH1003'],
      status: 'PASSED',
      nodeColor: 'GREEN',
      score10: 8.1,
      letterGrade: 'B+',
      gradePoint: 3.5,
      difficulty: 'Trung bình (3/5)',
      instructorNote: 'Bộ môn Toán cơ bản — Khoa Khoa học Cơ bản',
      description: 'Cung cấp kiến thức nền tảng về giới hạn, phép tính vi phân và tích phân hàm một biến.'
    },
    {
      courseCode: 'IT1001',
      courseName: 'Nhập môn lập trình',
      credits: 3,
      lectureHours: 30,
      labHours: 30,
      semester: 1,
      specialization: 'Chung CNTT/KTPM',
      block: 'Cơ sở ngành',
      prerequisites: [],
      relationType: null,
      unlocks: ['IT2001', 'IT3001', 'IT6001'],
      status: 'PASSED',
      nodeColor: 'GREEN',
      score10: 8.7,
      letterGrade: 'A',
      gradePoint: 4.0,
      difficulty: 'Cơ bản (2/5)',
      instructorNote: 'Khoa Công nghệ phần mềm — SICT',
      description: 'Tư duy thuật toán, cấu trúc điều khiển, hàm và mảng cơ bản bằng ngôn ngữ C/C++.'
    },
    {
      courseCode: 'ML1001',
      courseName: 'Triết học Mác - Lênin',
      credits: 3,
      lectureHours: 45,
      labHours: 0,
      semester: 1,
      specialization: 'Chung toàn trường',
      block: 'Đại cương',
      prerequisites: [],
      relationType: null,
      unlocks: ['ML1002'],
      status: 'PASSED_LOW',
      nodeColor: 'GREEN',
      score10: 4.5,
      letterGrade: 'D',
      gradePoint: 1.0,
      difficulty: 'Lý thuyết (2.5/5)',
      instructorNote: 'Khoa Lý luận Chính trị và Pháp luật',
      description: 'Môn đại cương bắt buộc; hiện đạt điểm D (1.0) — nằm trong danh sách có thể học cải thiện (BR-06).'
    },
    {
      courseCode: 'MATH1002',
      courseName: 'Toán rời rạc',
      credits: 3,
      lectureHours: 45,
      labHours: 0,
      semester: 2,
      specialization: 'Chung CNTT/KTPM',
      block: 'Cơ sở ngành',
      prerequisites: ['MATH1001'],
      relationType: 'PRIOR (BR-02)',
      unlocks: ['IT6001', 'IT7001'],
      status: 'FAILED',
      nodeColor: 'RED',
      aiRecommendedNextTerm: true,
      score10: 3.2,
      letterGrade: 'F',
      gradePoint: 0.0,
      difficulty: 'Khó (4/5)',
      instructorNote: 'Môn tiên quyết cốt lõi (Trọng số ưu tiên 40%)',
      description: 'Logic mệnh đề, tổ hợp, lý thuyết đồ thị và cây. Đang nợ điểm F, trực tiếp chặn Cấu trúc dữ liệu & Giải thuật (IT6001).'
    },
    {
      courseCode: 'IT2001',
      courseName: 'Lập trình hướng đối tượng',
      credits: 4,
      lectureHours: 45,
      labHours: 30,
      semester: 2,
      specialization: 'Kỹ thuật phần mềm',
      block: 'Cơ sở ngành',
      prerequisites: ['IT1001'],
      relationType: 'PREREQUISITE (BR-01)',
      unlocks: ['IT6002', 'IT6010'],
      status: 'AI_RECOMMENDED',
      nodeColor: 'YELLOW',
      aiRecommendedNextTerm: true,
      score10: 5.2,
      letterGrade: 'D+',
      gradePoint: 1.5,
      difficulty: 'Trung bình - Khó (3.5/5)',
      instructorNote: 'AI đề xuất Học cải thiện kỳ tới (ROI +0.16 CPA)',
      description: 'Đã đạt D+ (1.5) nhưng là môn 4 tín chỉ có hệ số kéo CPA cao nhất nếu đăng ký học cải thiện lên A.'
    },
    {
      courseCode: 'IT3001',
      courseName: 'Mạng máy tính căn bản',
      credits: 3,
      lectureHours: 30,
      labHours: 30,
      semester: 3,
      specialization: 'Chung CNTT/KTPM',
      block: 'Cơ sở ngành',
      prerequisites: ['IT1001'],
      relationType: 'PREREQUISITE (BR-01)',
      unlocks: ['IT6002'],
      status: 'PASSED',
      nodeColor: 'GREEN',
      score10: 7.4,
      letterGrade: 'B',
      gradePoint: 3.0,
      difficulty: 'Trung bình (3/5)',
      instructorNote: 'Khoa Mạng máy tính và Truyền thông',
      description: 'Mô hình OSI, TCP/IP, định tuyến và cấu hình mạng doanh nghiệp cơ bản.'
    },
    {
      courseCode: 'IT6001',
      courseName: 'Cấu trúc dữ liệu và giải thuật',
      credits: 4,
      lectureHours: 45,
      labHours: 30,
      semester: 3,
      specialization: 'Chung CNTT/KTPM',
      block: 'Cơ sở ngành',
      prerequisites: ['MATH1002', 'IT1001'],
      relationType: 'PREREQUISITE (BR-01)',
      unlocks: ['IT6005', 'IT7001', 'IT7008'],
      status: 'BLOCKED',
      nodeColor: 'GRAY',
      score10: null,
      letterGrade: null,
      gradePoint: null,
      difficulty: 'Rất khó (4.5/5)',
      instructorNote: 'Đang bị KHÓA do nợ môn tiên quyết MATH1002',
      description: 'Danh sách liên kết, ngăn xếp, hàng đợi, cây nhị phân, đồ thị và các giải thuật sắp xếp/tìm kiếm.'
    },
    {
      courseCode: 'IT6002',
      courseName: 'Lập trình mạng',
      credits: 3,
      lectureHours: 30,
      labHours: 30,
      semester: 4,
      specialization: 'Kỹ thuật phần mềm',
      block: 'Chuyên ngành',
      prerequisites: ['IT3001', 'IT2001'],
      relationType: 'PREREQUISITE (BR-01)',
      unlocks: ['IT7012'],
      status: 'AI_RECOMMENDED',
      nodeColor: 'YELLOW',
      aiRecommendedNextTerm: true,
      score10: null,
      letterGrade: null,
      gradePoint: null,
      difficulty: 'Trung bình (3/5)',
      instructorNote: 'AI đề xuất đăng ký Học kỳ 1 (2026-2027)',
      description: 'Lập trình Socket TCP/UDP, đa luồng, giao thức truyền thông phân tán.'
    },
    {
      courseCode: 'IT4001',
      courseName: 'Cơ sở dữ liệu nâng cao',
      credits: 3,
      lectureHours: 30,
      labHours: 30,
      semester: 4,
      specialization: 'Hệ thống thông tin / KTPM',
      block: 'Chuyên ngành',
      prerequisites: ['IT1001'],
      relationType: 'PREREQUISITE (BR-01)',
      unlocks: ['IT7008'],
      status: 'AI_RECOMMENDED',
      nodeColor: 'YELLOW',
      aiRecommendedNextTerm: true,
      score10: null,
      letterGrade: null,
      gradePoint: null,
      difficulty: 'Trung bình - Khó (3.5/5)',
      instructorNote: 'AI đề xuất đăng ký Học kỳ 1 (2026-2027)',
      description: 'Tối ưu hóa truy vấn, đánh chỉ mục, giao dịch phân tán và an toàn dữ liệu.'
    },
    {
      courseCode: 'IT6010',
      courseName: 'Phát triển ứng dụng Web hiện đại',
      credits: 3,
      lectureHours: 30,
      labHours: 30,
      semester: 4,
      specialization: 'Kỹ thuật phần mềm',
      block: 'Tự chọn',
      prerequisites: ['IT2001'],
      relationType: 'PREREQUISITE (BR-01)',
      unlocks: [],
      status: 'AI_RECOMMENDED',
      nodeColor: 'YELLOW',
      aiRecommendedNextTerm: true,
      score10: null,
      letterGrade: null,
      gradePoint: null,
      difficulty: 'Trung bình (3/5)',
      instructorNote: 'AI đề xuất bù tín chỉ khối Tự chọn chuyên ngành',
      description: 'Kiến trúc SPA/SSR, RESTful API, bảo mật ứng dụng Web và triển khai thực tế.'
    },
    {
      courseCode: 'IT6005',
      courseName: 'Phân tích và thiết kế thuật toán',
      credits: 3,
      lectureHours: 45,
      labHours: 0,
      semester: 4,
      specialization: 'Chung CNTT/KTPM',
      block: 'Chuyên ngành',
      prerequisites: ['IT6001'],
      relationType: 'PREREQUISITE (BR-01)',
      unlocks: ['IT7008'],
      status: 'BLOCKED',
      nodeColor: 'GRAY',
      score10: null,
      letterGrade: null,
      gradePoint: null,
      difficulty: 'Khó (4/5)',
      instructorNote: 'Bị chặn gián tiếp (Cần qua MATH1002 -> IT6001)',
      description: 'Chia để trị, quy hoạch động, thuật toán tham lam và độ phức tạp tính toán.'
    },
    {
      courseCode: 'IT7001',
      courseName: 'Trí tuệ nhân tạo',
      credits: 3,
      lectureHours: 30,
      labHours: 30,
      semester: 5,
      specialization: 'Trí tuệ nhân tạo / KTPM',
      block: 'Chuyên ngành',
      prerequisites: ['IT6001', 'MATH1002'],
      relationType: 'PREREQUISITE (BR-01)',
      unlocks: ['IT7008'],
      status: 'BLOCKED',
      nodeColor: 'GRAY',
      score10: null,
      letterGrade: null,
      gradePoint: null,
      difficulty: 'Khó (4/5)',
      instructorNote: 'Bị chặn trực tiếp bởi MATH1002 và IT6001',
      description: 'Tìm kiếm không gian trạng thái, biểu diễn tri thức và học máy cơ bản.'
    },
    {
      courseCode: 'IT7008',
      courseName: 'Đồ án Tốt nghiệp Kỹ thuật phần mềm',
      credits: 10,
      lectureHours: 0,
      labHours: 150,
      semester: 8,
      specialization: 'Kỹ thuật phần mềm',
      block: 'Tốt nghiệp',
      prerequisites: ['IT6001', 'IT6005', 'IT4001'],
      relationType: 'PREREQUISITE (BR-09)',
      unlocks: [],
      status: 'BLOCKED',
      nodeColor: 'GRAY',
      score10: null,
      letterGrade: null,
      gradePoint: null,
      difficulty: 'Đồ án tổng hợp (5/5)',
      instructorNote: 'Quy tắc BR-09: Yêu cầu tích lũy >= 85% tổng tín chỉ CTĐT (115/135 TC) và không nợ tiên quyết',
      description: 'Thực hiện đề tài tốt nghiệp toàn diện dưới sự hướng dẫn của giảng viên bộ môn.'
    }
  ]
});
