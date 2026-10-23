/**
 * HaUI Advisor — Planner Store & State Machine (TV3)
 * Quản lý trạng thái tập trung cho Study Planner, Lịch sử phiên bản,
 * và điều phối luồng hội tụ đề xuất từ AI Advisor, What-if Simulator và Graduation Audit.
 */

import * as plannerApi from './plannerApiService.js';

// Danh sách các trạng thái kế hoạch theo State Machine chuẩn
export const PLAN_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  VALIDATED: 'VALIDATED',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
});

// Dữ liệu mẫu khởi tạo cho kế hoạch nhiều kỳ (Kỳ 7, Kỳ 8, Kỳ hè)
export const INITIAL_MULTI_SEMESTER_PLAN = Object.freeze({
  planId: 'plan-haui-2026-v2.4',
  planName: 'Kế hoạch học tập cá nhân KTPM/CNTT (Khóa 16)',
  version: 'v2.4',
  status: PLAN_STATUSES.DRAFT,
  targetCpa: 3.20,
  projectedCpa: 3.32,
  projectedRank: 'Bằng Giỏi (CPA ≥ 3.20)',
  totalEarnedCredits: 108,
  totalRequiredCredits: 145,
  remainingCredits: 37,
  semesters: [
    {
      semesterCode: '2026_1',
      semesterName: 'Học kỳ 1 (2026 - 2027) — Kỳ 7',
      workloadAssessment: 'Cân bằng (18 / 24 TC)',
      totalCredits: 18,
      expectedGpa: 3.35,
      courses: [
        {
          courseCode: 'MATH1002',
          courseName: 'Toán rời rạc',
          credits: 3,
          courseType: 'Học lại (Nợ F)',
          targetGrade: 'B (3.0)',
          rationale: 'Gỡ môn tiên quyết sống còn (Trọng số 40%) để mở khóa Cấu trúc dữ liệu'
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
          courseType: 'Chuẩn CTĐT',
          targetGrade: 'B+ (3.5)',
          rationale: 'Môn bắt buộc chuyên ngành đúng tiến độ chuẩn CTĐT'
        },
        {
          courseCode: 'IT4001',
          courseName: 'Cơ sở dữ liệu nâng cao',
          credits: 3,
          courseType: 'Chuẩn CTĐT',
          targetGrade: 'B (3.0)',
          rationale: 'Đã hoàn thành Hệ QTCSDL, cân bằng tải lý thuyết và thực hành'
        },
        {
          courseCode: 'IT6010',
          courseName: 'Phát triển ứng dụng Web hiện đại',
          credits: 3,
          courseType: 'Tự chọn chuyên ngành',
          targetGrade: 'A (4.0)',
          rationale: 'Bù đắp 3 tín chỉ khối Tự chọn còn thiếu theo Audit tốt nghiệp'
        },
        {
          courseCode: 'FL2001',
          courseName: 'Tiếng Anh Công nghệ thông tin',
          credits: 2,
          courseType: 'Bắt buộc chung',
          targetGrade: 'B (3.0)',
          rationale: 'Đạt chuẩn khối lượng 18 tín chỉ trong học kỳ chính'
        }
      ]
    },
    {
      semesterCode: '2026_2',
      semesterName: 'Học kỳ 2 (2026 - 2027) — Kỳ 8',
      workloadAssessment: 'Tập trung chuyên sâu (15 / 24 TC)',
      totalCredits: 15,
      expectedGpa: 3.40,
      courses: [
        {
          courseCode: 'IT6080',
          courseName: 'Đồ án chuyên ngành Kỹ thuật phần mềm',
          credits: 4,
          courseType: 'Bắt buộc chuyên ngành',
          targetGrade: 'A (4.0)',
          rationale: 'Học phần then chốt trước khi làm Khóa luận tốt nghiệp'
        },
        {
          courseCode: 'IT6090',
          courseName: 'Khóa luận tốt nghiệp KTPM',
          credits: 6,
          courseType: 'Tốt nghiệp',
          targetGrade: 'A (4.0)',
          rationale: 'Yêu cầu CPA ≥ 2.50 và tích lũy tối thiểu 115 tín chỉ'
        },
        {
          courseCode: 'IT6015',
          courseName: 'Kiến trúc phần mềm & Mẫu thiết kế',
          credits: 3,
          courseType: 'Tự chọn chuyên ngành',
          targetGrade: 'B+ (3.5)',
          rationale: 'Bổ sung đủ 6 tín chỉ tự chọn chuyên ngành'
        },
        {
          courseCode: 'SK2001',
          courseName: 'Kỹ năng làm việc chuyên nghiệp',
          credits: 2,
          courseType: 'Bổ trợ',
          targetGrade: 'A (4.0)',
          rationale: 'Hoàn thành chuẩn đầu ra kỹ năng mềm'
        }
      ]
    },
    {
      semesterCode: '2027_SUMMER',
      semesterName: 'Học kỳ phụ (Kỳ hè 2027)',
      workloadAssessment: 'Thực tập tăng tốc (4 / 8 TC tối đa)',
      totalCredits: 4,
      expectedGpa: 3.80,
      courses: [
        {
          courseCode: 'IT6099',
          courseName: 'Thực tập tốt nghiệp doanh nghiệp',
          credits: 4,
          courseType: 'Học vượt / Thực tập',
          targetGrade: 'A (4.0)',
          rationale: 'Thực hiện tại doanh nghiệp liên kết CNTT, tối đa 8 TC/kỳ phụ'
        }
      ]
    }
  ],
  aiRiskAdvice:
    'Lộ trình phân bổ 37 tín chỉ còn lại vào 2 kỳ chính và 1 kỳ hè đảm bảo đúng tiến độ tốt nghiệp chuẩn 4 năm. Môn Toán rời rạc (MATH1002) được ưu tiên học ngay ở Kỳ 7 để gỡ nút thắt tiên quyết.',
  warnings: [
    'Kiểm tra quy chế HaUI: Kỳ 7 (18 TC) và Kỳ 8 (15 TC) thỏa mãn giới hạn 10-24 TC (BR-03/BR-04).',
    'Kỳ hè (4 TC) nằm trong giới hạn tối đa 8 TC theo quy chế đào tạo tín chỉ HaUI.'
  ]
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const sumCredits = (courses) => courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);

const findFixtureCourse = (courseCode) => {
  for (const sem of INITIAL_MULTI_SEMESTER_PLAN.semesters) {
    const found = sem.courses.find((c) => c.courseCode === courseCode);
    if (found) return clone(found);
  }
  return null;
};

// Dựng một học kỳ fixture từ danh sách môn, tự tính lại tổng tín chỉ
const buildFixtureSemester = (semesterCode, workloadAssessment, courses) => {
  const base = INITIAL_MULTI_SEMESTER_PLAN.semesters.find((s) => s.semesterCode === semesterCode);
  return {
    ...clone(base),
    workloadAssessment,
    courses,
    totalCredits: sumCredits(courses)
  };
};

const [FIXTURE_SEM_7, FIXTURE_SEM_8, FIXTURE_SEM_SUMMER] = INITIAL_MULTI_SEMESTER_PLAN.semesters;

// Dữ liệu chi tiết (snapshot) của từng phiên bản fixture trong lịch sử.
// Mỗi bản ghi lịch sử phải mang đủ cấu trúc học kỳ/môn học để "Mở lại" và "Kích hoạt" đúng bản được chọn (F23-002, F23-003).
const FIXTURE_PLAN_SNAPSHOTS = Object.freeze({
  'plan-haui-2026-v2.4': clone(INITIAL_MULTI_SEMESTER_PLAN),
  'plan-haui-2026-v2.3': {
    ...clone(INITIAL_MULTI_SEMESTER_PLAN),
    planId: 'plan-haui-2026-v2.3',
    planName: 'Lộ trình chuẩn 4 năm K16',
    version: 'v2.3',
    status: PLAN_STATUSES.ACTIVE,
    projectedCpa: 3.25,
    semesters: [clone(FIXTURE_SEM_7), clone(FIXTURE_SEM_8)],
    aiRiskAdvice: 'Lộ trình chuẩn 2 học kỳ chính, chưa bố trí thực tập kỳ hè.'
  },
  'plan-haui-2026-v2.2': {
    ...clone(INITIAL_MULTI_SEMESTER_PLAN),
    planId: 'plan-haui-2026-v2.2',
    planName: 'Phương án học vượt 3.5 năm (Thử nghiệm)',
    version: 'v2.2',
    status: PLAN_STATUSES.ARCHIVED,
    projectedCpa: 3.18,
    semesters: [
      buildFixtureSemester('2026_1', 'Quá tải (22 / 24 TC)', [...clone(FIXTURE_SEM_7.courses), findFixtureCourse('IT6080')]),
      buildFixtureSemester('2026_2', 'Tốt nghiệp sớm (15 / 24 TC)', [
        findFixtureCourse('IT6090'),
        findFixtureCourse('IT6015'),
        findFixtureCourse('SK2001'),
        findFixtureCourse('IT6099')
      ])
    ],
    aiRiskAdvice: 'Dồn 22 TC vào Kỳ 7 để tốt nghiệp sớm — rủi ro quá tải học vụ cao.'
  },
  'plan-haui-2026-v2.1': {
    ...clone(INITIAL_MULTI_SEMESTER_PLAN),
    planId: 'plan-haui-2026-v2.1',
    planName: 'Kế hoạch ban đầu khi nhập bảng điểm',
    version: 'v2.1',
    status: PLAN_STATUSES.ARCHIVED,
    projectedCpa: 3.15,
    semesters: [
      buildFixtureSemester(
        '2026_1',
        'Cân bằng (18 / 24 TC)',
        FIXTURE_SEM_7.courses.map((c) =>
          c.courseCode === 'IT6010'
            ? {
                courseCode: 'IT7001',
                courseName: 'Trí tuệ nhân tạo căn bản',
                credits: 3,
                courseType: 'Tự chọn chuyên ngành',
                targetGrade: 'B+ (3.5)',
                rationale: 'Gợi ý tự động sau khi nhập bảng điểm K1-K6'
              }
            : clone(c)
        )
      ),
      clone(FIXTURE_SEM_8),
      clone(FIXTURE_SEM_SUMMER)
    ],
    aiRiskAdvice: 'Bản khởi tạo tự động từ bảng điểm K1-K6.'
  }
});

// Lịch sử các phiên bản kế hoạch (Immutable Plan History)
export const INITIAL_PLAN_HISTORY = Object.freeze([
  {
    planId: 'plan-haui-2026-v2.4',
    version: 'v2.4',
    name: 'Kế hoạch học tập tối ưu KTPM K16 (Bản nháp mới)',
    status: PLAN_STATUSES.DRAFT,
    updatedAt: '10 phút trước',
    totalSemesters: 3,
    totalCredits: 37,
    projectedCpa: 3.32,
    badge: 'Bản nháp (Đang chỉnh sửa)',
    note: 'Đã bổ sung môn Tự chọn IT6010 và phân bổ thực tập vào kỳ hè.',
    snapshot: FIXTURE_PLAN_SNAPSHOTS['plan-haui-2026-v2.4']
  },
  {
    planId: 'plan-haui-2026-v2.3',
    version: 'v2.3',
    name: 'Lộ trình chuẩn 4 năm K16 (Đang theo dõi chính thức)',
    status: PLAN_STATUSES.ACTIVE,
    updatedAt: '2 ngày trước',
    totalSemesters: 2,
    totalCredits: 33,
    projectedCpa: 3.25,
    badge: 'Đang áp dụng (ACTIVE)',
    note: 'Bản kế hoạch chính thức đã được kích hoạt áp dụng.',
    snapshot: FIXTURE_PLAN_SNAPSHOTS['plan-haui-2026-v2.3']
  },
  {
    planId: 'plan-haui-2026-v2.2',
    version: 'v2.2',
    name: 'Phương án học vượt 3.5 năm (Thử nghiệm)',
    status: PLAN_STATUSES.ARCHIVED,
    updatedAt: '1 tuần trước',
    totalSemesters: 2,
    totalCredits: 37,
    projectedCpa: 3.18,
    badge: 'Lưu trữ (ARCHIVED)',
    note: 'Phương án dồn 22 TC vào Kỳ 7 - Cảnh báo quá tải học vụ.',
    snapshot: FIXTURE_PLAN_SNAPSHOTS['plan-haui-2026-v2.2']
  },
  {
    planId: 'plan-haui-2026-v2.1',
    version: 'v2.1',
    name: 'Kế hoạch ban đầu khi nhập bảng điểm',
    status: PLAN_STATUSES.ARCHIVED,
    updatedAt: '2 tuần trước',
    totalSemesters: 3,
    totalCredits: 37,
    projectedCpa: 3.15,
    badge: 'Lưu trữ (ARCHIVED)',
    note: 'Bản khởi tạo từ gợi ý tự động sau khi nhập bảng điểm K1-K6.',
    snapshot: FIXTURE_PLAN_SNAPSHOTS['plan-haui-2026-v2.1']
  }
]);

let planIdSequence = 0;
const createPlanId = (prefix) => {
  planIdSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${planIdSequence}`;
};

/**
 * Kiểm tra tính hợp lệ về mặt cấu trúc và định dạng dữ liệu của kế hoạch.
 * Yêu cầu: "DRAFT lưu được khi dữ liệu đúng định dạng; kích hoạt phải kiểm tra nghiệp vụ."
 */
export function validatePlanFormat(plan) {
  if (!plan || typeof plan !== 'object') {
    return { valid: false, errors: ['Kế hoạch không hợp lệ hoặc rỗng.'] };
  }
  if (!Array.isArray(plan.semesters)) {
    return { valid: false, errors: ['Kế hoạch phải có mảng học kỳ (semesters).'] };
  }
  const errors = [];
  for (const sem of plan.semesters) {
    if (!sem || typeof sem !== 'object') {
      errors.push('Học kỳ không hợp lệ.');
      continue;
    }
    if (!sem.semesterCode) {
      errors.push('Học kỳ thiếu mã học kỳ (semesterCode).');
    }
    if (!Array.isArray(sem.courses)) {
      errors.push(`Học kỳ ${sem.semesterCode || ''} thiếu mảng môn học (courses).`);
      continue;
    }
    for (const course of sem.courses) {
      if (!course || !course.courseCode) {
        errors.push('Môn học thiếu mã môn học (courseCode).');
      }
      if (typeof course.credits !== 'number' || course.credits <= 0) {
        errors.push(`Môn học ${course?.courseCode || ''} có số tín chỉ không hợp lệ (phải > 0).`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Kiểm tra quy chế tín chỉ HaUI trên một kế hoạch (hàm thuần, không đổi trạng thái).
 * Dùng chung cho validatePlan() và chốt chặn trong activatePlan().
 */
export function evaluatePlanRules(plan) {
  const violations = [];
  const warnings = [];
  const semesters = plan?.semesters || [];

  if (semesters.length === 0) {
    violations.push('Kế hoạch chưa có học kỳ nào — không thể thẩm định hoặc kích hoạt.');
  }

  for (const sem of semesters) {
    const tc = Number(sem.totalCredits) || 0;
    const isSummer = String(sem.semesterCode || '').includes('SUMMER');

    if (isSummer) {
      if (tc > 8) {
        violations.push(`${sem.semesterName}: Tổng ${tc} TC vượt trần 8 TC tối đa của học kỳ hè.`);
      }
    } else if (tc < 10) {
      violations.push(`${sem.semesterName}: Tổng ${tc} TC nhỏ hơn sàn tối thiểu 10 TC trong học kỳ chính (BR-03).`);
    } else if (tc > 24) {
      violations.push(`${sem.semesterName}: Tổng ${tc} TC vượt trần tối đa 24 TC trong học kỳ chính (BR-04).`);
    } else if (tc >= 20) {
      warnings.push(`${sem.semesterName}: Tải học tập cao (${tc} TC). Chú ý cân bằng thời gian ôn tập.`);
    }
  }

  return { valid: violations.length === 0, violations, warnings };
}

/**
 * Singleton Store quản lý State kế hoạch trong phạm vi TV3
 *
 * State Machine: DRAFT --validatePlan()--> VALIDATED --activatePlan()--> ACTIVE
 * - Mọi chỉnh sửa nội dung (thêm/bớt môn, nạp đề xuất) đưa kế hoạch về DRAFT và xóa kết quả thẩm định.
 * - Bản ACTIVE/ARCHIVED trong lịch sử là bất biến: sửa trên chúng sẽ tách thành một bản nháp mới.
 * - `baseline` là mốc đã cam kết gần nhất (tải, lưu nháp, kích hoạt, mở lại) dùng cho "Hủy thay đổi".
 */
class PlannerStore {
  constructor() {
    this.listeners = new Set();
    this.loadInitialState();
  }

  loadInitialState() {
    this.plan = clone(INITIAL_MULTI_SEMESTER_PLAN);
    this.history = clone(INITIAL_PLAN_HISTORY);
    this.baseline = clone(this.plan);
    this.validation = null; // Kết quả thẩm định gắn với nội dung kế hoạch hiện tại
    this.incomingProposal = null; // Đề xuất từ AI Chat hoặc What-if đang chờ duyệt
    this.reconcileResult = null; // Kết quả đối chiếu học kỳ với bản ACTIVE
    this.apiError = null;
    this.loading = false;
    this.isLive = false;
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    return () => {};
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.getState());
      } catch (e) {
        // Bỏ qua lỗi listener
      }
    }
  }

  getState() {
    return {
      plan: this.plan,
      history: this.history,
      incomingProposal: this.incomingProposal,
      validation: this.validation,
      reconcileResult: this.reconcileResult,
      apiError: this.apiError,
      loading: this.loading,
      isLive: this.isLive
    };
  }

  getPlan() {
    return this.plan;
  }

  getHistory() {
    return this.history;
  }

  getIncomingProposal() {
    return this.incomingProposal;
  }

  getValidation() {
    return this.validation;
  }

  getReconcileResult() {
    return this.reconcileResult;
  }

  clearReconcileResult() {
    this.reconcileResult = null;
    this.notify();
  }

  getActiveEntry() {
    return this.history.find((h) => h.status === PLAN_STATUSES.ACTIVE) || null;
  }

  // Phiên bản kế tiếp dạng vX.Y dựa trên phiên bản lớn nhất trong lịch sử
  nextVersion() {
    let major = 0;
    let minor = 0;
    for (const version of [...this.history.map((h) => h.version), this.plan.version]) {
      const match = /^v(\d+)\.(\d+)$/.exec(version || '');
      if (!match) continue;
      const [a, b] = [Number(match[1]), Number(match[2])];
      if (a > major || (a === major && b > minor)) {
        major = a;
        minor = b;
      }
    }
    return `v${major || 1}.${minor + 1}`;
  }

  // Đánh dấu nội dung kế hoạch vừa bị chỉnh sửa: quay về DRAFT, hủy kết quả thẩm định cũ.
  // Nếu đang sửa trên bản ACTIVE/ARCHIVED thì tách sang bản nháp mới để không ghi đè lịch sử bất biến.
  markEdited() {
    const savedEntry = this.history.find((h) => h.planId === this.plan.planId);
    const semesters = (this.plan.semesters || []).map((s) => ({ ...s, courses: [...(s.courses || [])] }));

    if (savedEntry && savedEntry.status !== PLAN_STATUSES.DRAFT) {
      this.plan = {
        ...this.plan,
        semesters,
        planId: createPlanId('plan-draft'),
        version: this.nextVersion(),
        sourcePlanId: savedEntry.planId
      };
    } else {
      this.plan = { ...this.plan, semesters };
    }

    this.plan.status = PLAN_STATUSES.DRAFT;
    this.validation = null;
  }

  buildHistoryEntry(status, { updatedAt, badge, note }) {
    return {
      planId: this.plan.planId,
      version: this.plan.version,
      name: this.plan.planName,
      status,
      updatedAt,
      totalSemesters: this.plan.semesters.length,
      totalCredits: this.plan.semesters.reduce((sum, s) => sum + (Number(s.totalCredits) || 0), 0),
      projectedCpa: this.plan.projectedCpa,
      badge,
      note,
      snapshot: clone({ ...this.plan, status })
    };
  }

  upsertHistoryEntry(entry) {
    const existingIdx = this.history.findIndex((h) => h.planId === entry.planId);
    if (existingIdx >= 0) {
      this.history[existingIdx] = entry;
    } else {
      this.history.unshift(entry);
    }
  }

  // Nhận đề xuất lộ trình từ AI Advisor hoặc What-if Simulator
  setIncomingProposal(proposal, sourceName = 'AI Advisor') {
    // Tính toán diff chi tiết giữa kế hoạch hiện hành và phương án đề xuất
    const currentCourses = (this.plan.semesters || []).flatMap((s) =>
      (s.courses || []).map((c) => ({ ...c, semesterCode: s.semesterCode }))
    );
    const proposedCourses = (proposal.semesters || []).flatMap((s) =>
      (s.courses || []).map((c) => ({ ...c, semesterCode: s.semesterCode }))
    );

    const currentCodes = new Set(currentCourses.map((c) => c.courseCode));
    const proposedCodes = new Set(proposedCourses.map((c) => c.courseCode));

    const addedCourses = proposedCourses.filter((c) => !currentCodes.has(c.courseCode));
    const removedCourses = currentCourses.filter((c) => !proposedCodes.has(c.courseCode));

    const currentCredits = this.plan.semesters
      ? this.plan.semesters.reduce((sum, s) => sum + (Number(s.totalCredits) || 0), 0)
      : 0;
    const proposedCredits = proposal.semesters
      ? proposal.semesters.reduce((sum, s) => sum + (Number(s.totalCredits) || 0), 0)
      : (Number(proposal.totalCredits) || 0);

    const currentCpa = this.plan.projectedCpa || this.plan.targetCpa || null;
    const proposedCpa = proposal.projectedCpa || proposal.targetCpa || null;
    const cpaDelta =
      proposedCpa !== null && currentCpa !== null
        ? Number((proposedCpa - currentCpa).toFixed(2))
        : null;

    const diff = {
      addedCourses,
      removedCourses,
      creditsDelta: proposedCredits - currentCredits,
      currentCredits,
      proposedCredits,
      currentCpa,
      proposedCpa,
      cpaDelta
    };

    this.incomingProposal = {
      ...proposal,
      sourceName,
      diff,
      receivedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    this.notify();

    // Phát custom event cho các component đang nghe
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(
          new CustomEvent('haui:planner:proposal', {
            detail: this.incomingProposal
          })
        );
      } catch {
        // Bỏ qua lỗi custom event trên môi trường test Node.js
      }
    }
  }

  // Chấp nhận đề xuất: Ghi đè vào bản nháp hiện hành (đưa kế hoạch về DRAFT để thẩm định lại)
  acceptProposal() {
    if (!this.incomingProposal) return;
    const proposal = this.incomingProposal;

    this.markEdited();

    // Chuẩn hóa cấu trúc học kỳ từ proposal
    if (proposal.semesters && Array.isArray(proposal.semesters)) {
      this.plan.semesters = clone(proposal.semesters);
    }
    if (proposal.projectedCpa) {
      this.plan.projectedCpa = proposal.projectedCpa;
    }
    if (proposal.projectedRank) {
      this.plan.projectedRank = proposal.projectedRank;
    }
    if (proposal.aiRiskAdvice) {
      this.plan.aiRiskAdvice = proposal.aiRiskAdvice;
    }

    this.incomingProposal = null;
    this.notify();
  }

  // Hủy đề xuất: Bỏ qua không nhập vào kế hoạch
  dismissProposal() {
    this.incomingProposal = null;
    this.notify();
  }

  // Alias tương thích cho dismissProposal
  rejectProposal() {
    this.dismissProposal();
  }

  // Ghi đè một phần nội dung kế hoạch (giữ nguyên định danh/trạng thái do store quản lý)
  setPlan(nextPlan = {}) {
    const { planId, version, status, ...content } = clone(nextPlan);
    this.markEdited();
    Object.assign(this.plan, content);
    this.notify();
  }

  // Thêm một môn học vào học kỳ chỉ định
  addCourseToSemester(semesterCode, course) {
    const existing = this.plan.semesters.find((s) => s.semesterCode === semesterCode);
    if (!existing) return false;

    // Tránh trùng mã môn
    if (existing.courses.some((c) => c.courseCode === course.courseCode)) {
      return false;
    }

    this.markEdited(); // Mọi thay đổi đều đưa về DRAFT để re-validate
    const sem = this.plan.semesters.find((s) => s.semesterCode === semesterCode);
    sem.courses.push({
      courseCode: course.courseCode,
      courseName: course.courseName,
      credits: Number(course.credits) || 3,
      courseType: course.courseType || 'Tự chọn chuyên ngành',
      targetGrade: course.targetGrade || 'A (4.0)',
      rationale: course.rationale || 'Sinh viên chủ động bổ sung vào kế hoạch'
    });
    sem.totalCredits = sumCredits(sem.courses);

    this.notify();
    return true;
  }

  // Bỏ một môn học khỏi học kỳ
  removeCourseFromSemester(semesterCode, courseCode) {
    if (!this.plan.semesters.some((s) => s.semesterCode === semesterCode)) return false;

    this.markEdited();
    const sem = this.plan.semesters.find((s) => s.semesterCode === semesterCode);
    sem.courses = sem.courses.filter((c) => c.courseCode !== courseCode);
    sem.totalCredits = sumCredits(sem.courses);

    this.notify();
    return true;
  }

  // Chuyển một môn học từ học kỳ này sang học kỳ khác
  moveCourse(fromSemesterCode, toSemesterCode, courseCode) {
    if (fromSemesterCode === toSemesterCode) {
      return { success: false, message: 'Học kỳ nguồn và học kỳ đích giống nhau.' };
    }
    const fromSem = this.plan.semesters?.find((s) => s.semesterCode === fromSemesterCode);
    const toSem = this.plan.semesters?.find((s) => s.semesterCode === toSemesterCode);
    if (!fromSem || !toSem) {
      return { success: false, message: 'Không tìm thấy học kỳ nguồn hoặc học kỳ đích.' };
    }

    const courseIndex = fromSem.courses?.findIndex((c) => c.courseCode === courseCode);
    if (courseIndex === -1 || courseIndex === undefined) {
      return { success: false, message: `Môn ${courseCode} không có trong học kỳ nguồn.` };
    }

    if (toSem.courses?.some((c) => c.courseCode === courseCode)) {
      return { success: false, message: `Môn ${courseCode} đã có trong học kỳ đích.` };
    }

    this.markEdited();

    const freshFromSem = this.plan.semesters.find((s) => s.semesterCode === fromSemesterCode);
    const freshToSem = this.plan.semesters.find((s) => s.semesterCode === toSemesterCode);

    const [movedCourse] = freshFromSem.courses.splice(courseIndex, 1);
    freshToSem.courses.push(movedCourse);

    freshFromSem.totalCredits = sumCredits(freshFromSem.courses);
    freshToSem.totalCredits = sumCredits(freshToSem.courses);

    this.notify();
    return {
      success: true,
      message: `Đã chuyển môn ${courseCode} từ ${freshFromSem.semesterName || fromSemesterCode} sang ${freshToSem.semesterName || toSemesterCode}.`
    };
  }

  // Lưu bản nháp (Save Draft) — DRAFT lưu được khi dữ liệu đúng định dạng, không bắt buộc đạt chuẩn quy chế học vụ
  saveDraft(customName) {
    if (this.plan.status === PLAN_STATUSES.ACTIVE) {
      return {
        success: false,
        code: 'NO_CHANGES',
        message: 'Kế hoạch đang áp dụng chưa có thay đổi nào để lưu thành bản nháp.'
      };
    }

    const formatCheck = validatePlanFormat(this.plan);
    if (!formatCheck.valid) {
      return {
        success: false,
        code: 'INVALID_FORMAT',
        errors: formatCheck.errors,
        message: `Dữ liệu kế hoạch không đúng định dạng: ${formatCheck.errors.join('; ')}`
      };
    }

    if (customName) {
      this.plan = { ...this.plan, planName: customName };
    }

    this.upsertHistoryEntry(
      this.buildHistoryEntry(PLAN_STATUSES.DRAFT, {
        updatedAt: 'Vừa xong',
        badge: 'Bản nháp (Đã lưu)',
        note: 'Bản nháp được lưu thành công vào CSDL.'
      })
    );
    this.baseline = clone(this.plan);

    this.notify();
    return { success: true, message: 'Đã lưu thành công bản nháp vào hệ thống!' };
  }

  // Thẩm định quy chế thời gian thực (Validate Plan): DRAFT → VALIDATED nếu không có vi phạm.
  // `externalViolations/externalWarnings`: kết quả kiểm tra bổ sung từ backend (nếu có) được gộp vào.
  validatePlan({ externalViolations = [], externalWarnings = [] } = {}) {
    const local = evaluatePlanRules(this.plan);
    const violations = [...new Set([...local.violations, ...(externalViolations || [])])];
    const warnings = [...new Set([...local.warnings, ...(externalWarnings || [])])];
    const isValid = violations.length === 0;

    // Bản ACTIVE chỉ được kiểm tra lại, không bị hạ trạng thái
    if (this.plan.status !== PLAN_STATUSES.ACTIVE) {
      this.plan = { ...this.plan, status: isValid ? PLAN_STATUSES.VALIDATED : PLAN_STATUSES.DRAFT };
    }

    this.validation = {
      valid: isValid,
      status: this.plan.status,
      planId: this.plan.planId,
      violations,
      warnings
    };
    this.notify();

    return { ...this.validation };
  }

  /**
   * Kích hoạt kế hoạch (Bắt đầu theo dõi — ACTIVATE)
   * - Không truyền `targetPlanId` (hoặc trùng bản đang mở): chỉ cho phép khi bản hiện tại đã VALIDATED.
   * - Truyền `targetPlanId` của một bản DRAFT trong lịch sử: nạp đúng bản đó, thẩm định lại
   *   (DRAFT → VALIDATED) rồi mới chuyển ACTIVE; từ chối nếu có vi phạm quy chế.
   */
  activatePlan(targetPlanId) {
    if (targetPlanId && targetPlanId !== this.plan.planId) {
      return this.activateFromHistory(targetPlanId);
    }

    if (this.plan.status === PLAN_STATUSES.ACTIVE) {
      return { success: false, code: 'ALREADY_ACTIVE', message: 'Kế hoạch này đang được áp dụng.' };
    }

    if (this.plan.status !== PLAN_STATUSES.VALIDATED) {
      return {
        success: false,
        code: 'PLAN_NOT_VALIDATED',
        message: 'Kế hoạch chưa được thẩm định. Vui lòng bấm "Kiểm tra điều kiện" và đạt trạng thái VALIDATED trước khi kích hoạt.'
      };
    }

    // Chốt chặn cuối: kiểm tra lại quy chế ngay trước khi kích hoạt
    const { violations } = evaluatePlanRules(this.plan);
    if (violations.length > 0) {
      this.plan = { ...this.plan, status: PLAN_STATUSES.DRAFT };
      this.validation = { valid: false, status: PLAN_STATUSES.DRAFT, planId: this.plan.planId, violations, warnings: [] };
      this.notify();
      return {
        success: false,
        code: 'PLAN_RULE_VIOLATION',
        violations,
        message: `Không thể kích hoạt: Kế hoạch vi phạm quy chế (${violations.join('; ')})`
      };
    }

    return this.commitActivation();
  }

  activateFromHistory(planId) {
    const entry = this.history.find((h) => h.planId === planId);
    if (!entry) {
      return { success: false, code: 'PLAN_NOT_FOUND', message: 'Không tìm thấy phiên bản yêu cầu.' };
    }
    if (entry.status === PLAN_STATUSES.ACTIVE) {
      return { success: false, code: 'ALREADY_ACTIVE', message: `Phiên bản ${entry.version} đang được áp dụng.` };
    }
    if (entry.status !== PLAN_STATUSES.DRAFT) {
      return {
        success: false,
        code: 'INVALID_TRANSITION',
        message: `Phiên bản ${entry.version} đã lưu trữ — hãy "Mở lại" thành bản nháp mới rồi thẩm định trước khi kích hoạt.`
      };
    }
    if (!entry.snapshot) {
      return { success: false, code: 'SNAPSHOT_MISSING', message: `Phiên bản ${entry.version} không có dữ liệu chi tiết để kích hoạt.` };
    }

    const candidate = {
      ...clone(entry.snapshot),
      planId: entry.planId,
      version: entry.version,
      status: PLAN_STATUSES.DRAFT
    };
    const { violations } = evaluatePlanRules(candidate);
    if (violations.length > 0) {
      return {
        success: false,
        code: 'PLAN_RULE_VIOLATION',
        violations,
        message: `Không thể kích hoạt ${entry.version}: Kế hoạch vi phạm quy chế (${violations.join('; ')})`
      };
    }

    // DRAFT → VALIDATED → ACTIVE trên chính bản được chọn
    this.plan = { ...candidate, status: PLAN_STATUSES.VALIDATED };
    return this.commitActivation();
  }

  commitActivation() {
    const version = this.plan.version;

    // 1. Chuyển bản ACTIVE trước đó trong lịch sử thành ARCHIVED
    this.history = this.history.map((h) => {
      if (h.status === PLAN_STATUSES.ACTIVE && h.planId !== this.plan.planId) {
        return {
          ...h,
          status: PLAN_STATUSES.ARCHIVED,
          badge: 'Lưu trữ (Đã thay thế)',
          note: `Lưu trữ tự động khi kích hoạt bản ${version}`,
          snapshot: h.snapshot ? { ...h.snapshot, status: PLAN_STATUSES.ARCHIVED } : h.snapshot
        };
      }
      return h;
    });

    // 2. Chuyển bản hiện tại thành ACTIVE
    this.plan = { ...this.plan, status: PLAN_STATUSES.ACTIVE };
    this.upsertHistoryEntry(
      this.buildHistoryEntry(PLAN_STATUSES.ACTIVE, {
        updatedAt: 'Vừa kích hoạt',
        badge: 'Đang áp dụng (ACTIVE)',
        note: 'Kế hoạch học tập chính thức đang được hệ thống theo dõi tiến độ.'
      })
    );
    this.baseline = clone(this.plan);
    this.validation = null;

    this.notify();
    return {
      success: true,
      planId: this.plan.planId,
      message: `Kế hoạch ${version} đã được kích hoạt chính thức thành công!`
    };
  }

  // Khôi phục / Mở lại một bản cũ (Restore Plan): nhân bản đúng dữ liệu của bản được chọn thành bản nháp mới,
  // bản ghi trong lịch sử giữ nguyên (bất biến).
  restorePlan(planId) {
    const target = this.history.find((h) => h.planId === planId);
    if (!target) return { success: false, message: 'Không tìm thấy phiên bản yêu cầu.' };
    if (!target.snapshot) {
      return { success: false, code: 'SNAPSHOT_MISSING', message: `Phiên bản ${target.version} không có dữ liệu chi tiết để mở lại.` };
    }

    this.plan = {
      ...clone(target.snapshot),
      planId: createPlanId('plan-restored'),
      version: `${target.version}-restored`,
      planName: `Khôi phục từ ${target.name}`,
      status: PLAN_STATUSES.DRAFT,
      sourcePlanId: target.planId
    };
    this.baseline = clone(this.plan);
    this.validation = null;

    this.notify();
    return {
      success: true,
      message: `Đã mở lại phiên bản ${target.version} dưới dạng bản nháp mới để bạn tiếp tục chỉnh sửa!`
    };
  }

  // Hủy các thay đổi chưa lưu: quay về mốc đã cam kết gần nhất (bản ACTIVE nếu đang sửa trên bản ACTIVE),
  // giữ nguyên lịch sử kế hoạch.
  discardDraftChanges() {
    this.plan = clone(this.baseline);
    this.validation = null;
    this.notify();
    return {
      success: true,
      message: `Đã hoàn tác các thay đổi chưa lưu, quay về phiên bản ${this.plan.version} (${this.plan.status}).`
    };
  }

  // Đặt lại toàn bộ dữ liệu (kế hoạch + lịch sử) về fixture mặc định ban đầu
  resetToDefault() {
    this.loadInitialState();
    this.notify();
  }

  // =========================================================================
  // LIVE API INTEGRATION METHODS (Task 4.3a)
  // =========================================================================

  /**
   * Cập nhật thông tin chi tiết kế hoạch từ DTO server vào Store.
   * @param {Object} detail - StudyPlanDetailResponse
   */
  loadPlanDetail(detail) {
    if (!detail) return;
    const semesters = (detail.semesters || []).map((s) => ({
      semesterCode: s.semesterCode,
      semesterName: s.semesterName || s.semesterCode,
      totalCredits: s.totalCredits ?? sumCredits(s.courses || []),
      expectedGpa: s.expectedGpa ?? null,
      courses: (s.courses || []).map((c) => ({
        courseCode: c.courseCode,
        courseName: c.courseName || c.courseCode,
        credits: Number(c.credits) || 3,
        courseType: c.courseType || 'Chuẩn CTĐT',
        targetGrade: c.targetGrade || 'A (4.0)',
        rationale: c.rationale || ''
      }))
    }));

    this.plan = {
      planId: detail.planId,
      planName: detail.planName,
      planVersion: detail.planVersion || 1,
      version: `v${detail.planVersion || 1}`,
      status: detail.status || PLAN_STATUSES.DRAFT,
      sourcePlanId: detail.sourcePlanId || null,
      dataRevision: detail.dataRevision || null,
      policyVersion: detail.policyVersion || null,
      validatedAt: detail.validatedAt || null,
      targetCpa: detail.targetCpa ?? null,
      projectedCpa: detail.projectedCpa ?? null,
      targetGraduationSemester: detail.targetGraduationSemester || null,
      maxCreditsPerSemester: detail.maxCreditsPerSemester || null,
      totalCredits: detail.totalCredits || semesters.reduce((sum, s) => sum + (Number(s.totalCredits) || 0), 0),
      semesters,
      warnings: detail.warnings || [],
      actions: detail.actions || [],
      updatedAt: detail.updatedAt || 'Vừa xong'
    };

    this.baseline = clone(this.plan);
    this.validation = detail.validatedAt
      ? {
          valid: true,
          status: this.plan.status,
          planId: this.plan.planId,
          policyVersion: this.plan.policyVersion,
          violations: [],
          warnings: this.plan.warnings || []
        }
      : null;
    this.notify();
  }

  /**
   * Nạp danh sách kế hoạch từ máy chủ và mở bản ACTIVE hoặc bản chỉ định.
   * Phục vụ kịch bản "Mở lại sau reload".
   * Giữ nguyên nội dung khi API gặp sự cố.
   */
  async fetchPlansAsync(api, preferredPlanId = null) {
    if (!api) return { success: false, message: 'Thiếu API client' };
    this.loading = true;
    this.notify();
    try {
      const listRes = await plannerApi.listStudyPlans(api);
      const plans = Array.isArray(listRes?.plans) ? listRes.plans : [];
      this.isLive = true;
      this.apiError = null;

      if (plans.length > 0) {
        this.history = plans.map((p) => ({
          planId: p.planId,
          version: `v${p.planVersion || 1}`,
          planVersion: p.planVersion || 1,
          name: p.planName,
          status: p.status,
          sourcePlanId: p.sourcePlanId || null,
          updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString('vi-VN') : 'Gần đây',
          totalCredits: p.totalCredits || 0,
          projectedCpa: p.projectedCpa,
          badge:
            p.status === PLAN_STATUSES.ACTIVE
              ? 'Đang áp dụng (ACTIVE)'
              : p.status === PLAN_STATUSES.VALIDATED
                ? 'Đã thẩm định'
                : p.status === PLAN_STATUSES.DRAFT
                  ? 'Bản nháp'
                  : 'Lưu trữ (ARCHIVED)',
          note: p.sourcePlanId ? `Kế thừa từ ${p.sourcePlanId}` : 'Kế hoạch học tập'
        }));

        let target = null;
        if (preferredPlanId) {
          target = plans.find((p) => p.planId === preferredPlanId);
        }
        if (!target) {
          target = plans.find((p) => p.status === PLAN_STATUSES.ACTIVE) || plans[0];
        }

        if (target) {
          const detail = await plannerApi.getStudyPlan(api, target.planId);
          this.loadPlanDetail(detail);
        }
      }
      return { success: true, count: plans.length };
    } catch (err) {
      // Giữ nguyên nội dung khi API lỗi!
      this.apiError = err;
      return {
        success: false,
        error: err,
        message: err?.message || 'Lỗi khi tải kế hoạch từ máy chủ'
      };
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  /**
   * Tạo phương án trực tiếp không cần Chat thông qua POST /planner/generate.
   * Giữ nguyên nội dung khi API lỗi.
   */
  async generatePlanAsync(api, options = {}) {
    if (!api) return { success: false, message: 'Thiếu API client' };
    this.loading = true;
    this.notify();
    try {
      const res = await plannerApi.generateStudyPlan(api, {
        targetGraduationSemester: options.targetGraduationSemester || '2026_1',
        targetCpa: options.targetCpa ?? this.plan.targetCpa ?? 3.20,
        maxCreditsPerSemester: options.maxCreditsPerSemester ?? 24,
        includeSummerSemesters: options.includeSummerSemesters ?? true,
        selectedRetakeCourseCodes: options.selectedRetakeCourseCodes || [],
        dataRevision: options.dataRevision || this.plan.dataRevision || null
      });

      this.isLive = true;
      this.apiError = null;

      const semesters = (res.semesters || []).map((s) => ({
        semesterCode: s.semesterCode,
        semesterName: s.semesterName || s.semesterCode,
        totalCredits: s.totalCredits ?? sumCredits(s.courses || []),
        expectedGpa: s.expectedGpa ?? null,
        courses: (s.courses || []).map((c) => ({
          courseCode: c.courseCode,
          courseName: c.courseName || c.courseCode,
          credits: Number(c.credits) || 3,
          courseType: c.courseType || 'Chuẩn CTĐT',
          targetGrade: c.targetGrade || 'A (4.0)',
          rationale: c.rationale || ''
        }))
      }));

      // Kế hoạch được sinh luôn ở DRAFT, chưa lưu (planId/planVersion null)
      this.plan = {
        ...this.plan,
        planId: null,
        planVersion: null,
        planName: res.planName || 'Kế hoạch học tập đề xuất',
        version: this.nextVersion(),
        status: PLAN_STATUSES.DRAFT,
        sourcePlanId: null,
        targetCpa: res.targetCpa ?? this.plan.targetCpa,
        projectedCpa: res.projectedCpa ?? null,
        totalCredits: res.totalCredits ?? semesters.reduce((sum, s) => sum + (Number(s.totalCredits) || 0), 0),
        semesters,
        warnings: res.warnings || [],
        actions: res.actions || [],
        dataRevision: res.dataRevision || this.plan.dataRevision,
        policyVersion: res.policyVersion || this.plan.policyVersion,
        proposalId: res.proposalId
      };

      this.validation = null; // Chưa thẩm định
      this.baseline = clone(this.plan);
      this.notify();

      return {
        success: true,
        plan: this.plan,
        warnings: res.warnings || [],
        policyVersion: res.policyVersion,
        message: 'Đã sinh phương án lộ trình học tập đề xuất thành công!'
      };
    } catch (err) {
      // Giữ nguyên nội dung khi API lỗi!
      this.apiError = err;
      return {
        success: false,
        error: err,
        message: err?.message || 'Lỗi khi sinh phương án từ máy chủ'
      };
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  /**
   * Lưu nháp kế hoạch học tập qua POST /planner/plans.
   * - Nếu sửa trên bản ACTIVE: server tự động tách sang bản DRAFT mới kế thừa, bản ACTIVE giữ nguyên.
   * - Giữ nguyên toàn bộ nội dung khi API lỗi.
   */
  async saveDraftAsync(api, customName = null) {
    const formatCheck = validatePlanFormat(this.plan);
    if (!formatCheck.valid) {
      return {
        success: false,
        code: 'INVALID_FORMAT',
        errors: formatCheck.errors,
        message: `Dữ liệu kế hoạch không đúng định dạng: ${formatCheck.errors.join('; ')}`
      };
    }

    if (!api) {
      return this.saveDraft(customName);
    }

    this.loading = true;
    this.notify();
    try {
      let sendPlanId = null;
      let sendPlanVersion = null;

      const isTemporaryDraftId = typeof this.plan.planId === 'string' && this.plan.planId.startsWith('plan-draft-');
      if (this.plan.sourcePlanId) {
        // Đang sửa bản kế thừa từ ACTIVE: gửi ID và version của bản gốc ACTIVE
        sendPlanId = this.plan.sourcePlanId;
        const sourceEntry = this.history.find((h) => h.planId === this.plan.sourcePlanId);
        sendPlanVersion = sourceEntry?.planVersion || 1;
      } else if (this.plan.planId && !isTemporaryDraftId) {
        sendPlanId = this.plan.planId;
        sendPlanVersion = this.plan.planVersion || 1;
      }

      const payload = {
        planId: sendPlanId,
        planName: customName || this.plan.planName,
        planVersion: sendPlanVersion,
        dataRevision: this.plan.dataRevision || null,
        targetCpa: this.plan.targetCpa || null,
        targetGraduationSemester: this.plan.targetGraduationSemester || null,
        maxCreditsPerSemester: this.plan.maxCreditsPerSemester || null,
        semesters: (this.plan.semesters || []).map((s) => ({
          semesterCode: s.semesterCode,
          semesterName: s.semesterName,
          totalCredits: s.totalCredits,
          expectedGpa: s.expectedGpa,
          courses: (s.courses || []).map((c) => ({
            courseCode: c.courseCode,
            courseName: c.courseName,
            credits: Number(c.credits) || 3,
            courseType: c.courseType,
            targetGrade: c.targetGrade,
            rationale: c.rationale
          }))
        })),
        actions: this.plan.actions || []
      };

      const res = await plannerApi.saveStudyPlan(api, payload);
      this.isLive = true;
      this.apiError = null;

      this.plan = {
        ...this.plan,
        planId: res.planId,
        planName: res.planName || this.plan.planName,
        status: PLAN_STATUSES.DRAFT,
        planVersion: res.planVersion,
        version: `v${res.planVersion}`,
        sourcePlanId: res.sourcePlanId || null,
        dataRevision: res.dataRevision || this.plan.dataRevision,
        updatedAt: res.updatedAt || 'Vừa xong'
      };
      this.validation = null;
      this.baseline = clone(this.plan);

      this.upsertHistoryEntry(
        this.buildHistoryEntry(PLAN_STATUSES.DRAFT, {
          updatedAt: 'Vừa xong',
          badge: 'Bản nháp (Đã lưu)',
          note: res.message || 'Bản nháp chưa được kiểm tra điều kiện.'
        })
      );

      return {
        success: true,
        planId: res.planId,
        planVersion: res.planVersion,
        message: res.message || 'Đã lưu thành công bản nháp vào hệ thống!',
        plan: this.plan
      };
    } catch (err) {
      // Giữ nguyên nội dung kế hoạch khi API lỗi!
      this.apiError = err;
      return {
        success: false,
        error: err,
        message: `Lỗi khi lưu máy chủ: ${err?.message || 'Sự cố kết nối'}. Nội dung nháp vẫn được giữ nguyên.`
      };
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  /**
   * Thẩm định kế hoạch học tập qua POST /planner/validate.
   * - Xử lý 503 TOOL_NOT_READY: thông báo rõ ràng, chặn kích hoạt.
   * - Giữ nguyên nội dung khi API lỗi.
   */
  async validatePlanAsync(api) {
    if (!api) {
      return this.validatePlan();
    }

    this.loading = true;
    this.notify();
    try {
      const isSaved = Boolean(this.plan.planId) && !this.plan.planId.startsWith('plan-draft-');
      const payload = isSaved
        ? {
            planId: this.plan.planId,
            planVersion: this.plan.planVersion || 1,
            dataRevision: this.plan.dataRevision || null
          }
        : {
            semesters: this.plan.semesters,
            dataRevision: this.plan.dataRevision || null
          };

      const res = await plannerApi.validateStudyPlan(api, payload);
      this.isLive = true;
      this.apiError = null;

      const isValid = Boolean(res.valid);
      const newStatus =
        isSaved && isValid
          ? PLAN_STATUSES.VALIDATED
          : this.plan.status === PLAN_STATUSES.ACTIVE
            ? PLAN_STATUSES.ACTIVE
            : PLAN_STATUSES.DRAFT;

      this.plan = {
        ...this.plan,
        status: newStatus,
        policyVersion: res.policyVersion || this.plan.policyVersion,
        dataRevision: res.dataRevision || this.plan.dataRevision
      };

      this.validation = {
        valid: isValid,
        status: newStatus,
        planId: this.plan.planId,
        violations: res.violations || [],
        warnings: res.warnings || [],
        policyVersion: res.policyVersion,
        validationMode: res.validationMode
      };

      if (isSaved) {
        this.upsertHistoryEntry(
          this.buildHistoryEntry(newStatus, {
            updatedAt: 'Vừa thẩm định',
            badge: newStatus === PLAN_STATUSES.VALIDATED ? 'Đã thẩm định (VALIDATED)' : 'Bản nháp (DRAFT)',
            note: isValid ? 'Đã kiểm tra điều kiện đạt chuẩn.' : `Vi phạm ${res.violations?.length || 0} điều kiện.`
          })
        );
      }

      return {
        success: true,
        valid: isValid,
        status: newStatus,
        violations: res.violations || [],
        warnings: res.warnings || [],
        policyVersion: res.policyVersion,
        message: isValid
          ? isSaved
            ? 'Kế hoạch hợp lệ theo quy chế — đã chuyển sang VALIDATED, có thể kích hoạt.'
            : 'Kiểm tra nhanh: Nội dung hợp lệ (Cần lưu bản nháp và thẩm định lại trước khi kích hoạt).'
          : `Phát hiện ${res.violations?.length || 0} vi phạm quy chế — kế hoạch vẫn ở DRAFT.`
      };
    } catch (err) {
      // Giữ nguyên nội dung khi API lỗi!
      this.apiError = err;
      const isToolNotReady = err?.status === 503 || err?.code === 'TOOL_NOT_READY';
      this.validation = {
        valid: false,
        status: this.plan.status,
        planId: this.plan.planId,
        toolNotReady: isToolNotReady,
        violations: isToolNotReady ? [] : [err?.message || 'Lỗi thẩm định từ máy chủ'],
        warnings: isToolNotReady ? ['Công cụ kiểm tra điều kiện chưa sẵn sàng (503 TOOL_NOT_READY). Vui lòng thử lại sau.'] : []
      };
      return {
        success: false,
        error: err,
        toolNotReady: isToolNotReady,
        message: isToolNotReady
          ? 'Công cụ kiểm tra điều kiện chưa sẵn sàng (503 TOOL_NOT_READY).'
          : `Lỗi thẩm định máy chủ: ${err?.message || 'Sự cố kết nối'}`
      };
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  /**
   * Kích hoạt kế hoạch học tập qua POST /planner/plans/{planId}/activate.
   * - Chỉ bản VALIDATED mới được kích hoạt.
   * - Kích hoạt thành công chuyển bản cũ thành ARCHIVED.
   * - Giữ nguyên nội dung khi API lỗi.
   */
  async activatePlanAsync(api, targetPlanId = null) {
    const planToActivate =
      targetPlanId && targetPlanId !== this.plan.planId
        ? this.history.find((h) => h.planId === targetPlanId)
        : this.plan;

    if (!planToActivate) {
      return { success: false, code: 'PLAN_NOT_FOUND', message: 'Không tìm thấy kế hoạch để kích hoạt.' };
    }

    if (!api) {
      return this.activatePlan(targetPlanId);
    }

    if (planToActivate.status !== PLAN_STATUSES.VALIDATED) {
      return {
        success: false,
        code: 'PLAN_NOT_VALIDATED',
        message: 'Chỉ kích hoạt được kế hoạch đã thẩm định hợp lệ (VALIDATED). Vui lòng bấm "Kiểm tra điều kiện" trước.'
      };
    }

    this.loading = true;
    this.notify();
    try {
      const res = await plannerApi.activateStudyPlan(api, planToActivate.planId, {
        planVersion: planToActivate.planVersion || 1,
        dataRevision: planToActivate.dataRevision || null
      });

      this.isLive = true;
      this.apiError = null;

      const activatedId = res.planId;
      this.history = this.history.map((h) => {
        if (h.status === PLAN_STATUSES.ACTIVE && h.planId !== activatedId) {
          return {
            ...h,
            status: PLAN_STATUSES.ARCHIVED,
            badge: 'Lưu trữ (Đã thay thế)',
            note: 'Lưu trữ tự động khi kích hoạt bản mới',
            snapshot: h.snapshot ? { ...h.snapshot, status: PLAN_STATUSES.ARCHIVED } : h.snapshot
          };
        }
        return h;
      });

      this.plan = {
        ...this.plan,
        planId: activatedId,
        status: PLAN_STATUSES.ACTIVE
      };

      this.upsertHistoryEntry(
        this.buildHistoryEntry(PLAN_STATUSES.ACTIVE, {
          updatedAt: 'Vừa kích hoạt',
          badge: 'Đang áp dụng (ACTIVE)',
          note: res.message || 'Kế hoạch học tập chính thức đang được hệ thống theo dõi tiến độ.'
        })
      );

      this.baseline = clone(this.plan);
      this.validation = null;

      return {
        success: true,
        planId: activatedId,
        message: res.message || 'Kế hoạch đã được kích hoạt chính thức thành công!'
      };
    } catch (err) {
      // Giữ nguyên nội dung khi API lỗi!
      this.apiError = err;
      return {
        success: false,
        error: err,
        code: err?.code || 'ACTIVATION_FAILED',
        message: `Không thể kích hoạt kế hoạch: ${err?.message || 'Lỗi từ máy chủ'}`
      };
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  /**
   * Hủy bản nháp kế hoạch học tập qua DELETE /planner/plans/{planId}?planVersion=...
   * Giữ nguyên nội dung khi API lỗi.
   */
  async deleteDraftAsync(api, planId = null, planVersion = null) {
    const targetId = planId || this.plan.planId;
    const targetVersion = planVersion || this.plan.planVersion || 1;

    if (!api) {
      this.history = this.history.filter((h) => h.planId !== targetId);
      this.discardDraftChanges();
      return { success: true, message: 'Đã hủy bản nháp.' };
    }

    this.loading = true;
    this.notify();
    try {
      await plannerApi.deleteStudyPlan(api, targetId, targetVersion);
      this.isLive = true;
      this.apiError = null;

      this.history = this.history.filter((h) => h.planId !== targetId);

      if (this.plan.planId === targetId) {
        const activeItem = this.history.find((h) => h.status === PLAN_STATUSES.ACTIVE);
        if (activeItem) {
          const detail = await plannerApi.getStudyPlan(api, activeItem.planId);
          this.loadPlanDetail(detail);
        } else if (this.history.length > 0) {
          const detail = await plannerApi.getStudyPlan(api, this.history[0].planId);
          this.loadPlanDetail(detail);
        } else {
          this.resetToDefault();
        }
      }

      return { success: true, message: 'Đã hủy bản nháp thành công!' };
    } catch (err) {
      // Giữ nguyên nội dung khi API lỗi!
      this.apiError = err;
      return {
        success: false,
        error: err,
        message: `Lỗi khi hủy bản nháp: ${err?.message || 'Sự cố kết nối'}`
      };
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  /**
   * Mở lại kế hoạch (Restore) qua POST /planner/plans/{planId}/restore.
   * Tạo bản DRAFT mới sao chép nội dung, bản cũ giữ nguyên.
   * Giữ nguyên nội dung khi API lỗi.
   */
  async restorePlanAsync(api, planId, customName = null) {
    if (!api) {
      return this.restorePlan(planId);
    }

    this.loading = true;
    this.notify();
    try {
      const detail = await plannerApi.restoreStudyPlan(api, planId, { planName: customName });
      this.isLive = true;
      this.apiError = null;

      this.loadPlanDetail(detail);

      this.upsertHistoryEntry(
        this.buildHistoryEntry(PLAN_STATUSES.DRAFT, {
          updatedAt: 'Vừa khôi phục',
          badge: 'Bản nháp (Đã khôi phục)',
          note: `Khôi phục từ kế hoạch ${planId}`
        })
      );

      return {
        success: true,
        plan: this.plan,
        message: 'Đã mở lại kế hoạch dưới dạng bản nháp mới để bạn tiếp tục chỉnh sửa!'
      };
    } catch (err) {
      // Giữ nguyên nội dung khi API lỗi!
      this.apiError = err;
      return {
        success: false,
        error: err,
        message: `Lỗi khi mở lại kế hoạch: ${err?.message || 'Sự cố kết nối'}`
      };
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  /**
   * Đối chiếu kết quả học kỳ đã hoàn thành với kế hoạch ACTIVE (POST /planner/reconcile).
   * - Chỉ chạy trên kế hoạch ACTIVE (nếu đang ở DRAFT thì tìm bản ACTIVE trong lịch sử hoặc từ chối).
   * - Server trả 409 PLAN_NOT_ACTIVE nếu kế hoạch chỉ định không phải ACTIVE.
   * - Không làm thay đổi kế hoạch hiện tại (read-only).
   * @param {Object} api - Injected API client
   * @param {string} completedSemester - Học kỳ vừa hoàn thành (ví dụ: '2025_1', '2025_2', '2026_1')
   */
  async reconcilePlanAsync(api, completedSemester = '2025_1') {
    if (!api) return { success: false, message: 'Thiếu API client' };

    // Tìm kế hoạch ACTIVE để đối soát
    let activeTarget = null;
    if (this.plan.status === PLAN_STATUSES.ACTIVE) {
      activeTarget = this.plan;
    } else {
      activeTarget = this.history.find((h) => h.status === PLAN_STATUSES.ACTIVE) || null;
    }

    if (!activeTarget) {
      return {
        success: false,
        code: 'PLAN_NOT_ACTIVE',
        planNotActive: true,
        message: 'Chỉ có thể đối soát trên kế hoạch đang theo dõi (ACTIVE).'
      };
    }

    this.loading = true;
    this.notify();
    try {
      const payload = {
        planId: activeTarget.planId,
        completedSemester,
        planVersion: activeTarget.planVersion || 1,
        dataRevision: activeTarget.dataRevision || this.plan.dataRevision || null
      };

      const res = await plannerApi.reconcileStudyPlan(api, payload);
      this.isLive = true;
      this.apiError = null;

      this.reconcileResult = {
        planId: res.planId || activeTarget.planId,
        completedSemester,
        onTrack: Boolean(res.onTrack),
        completedCourses: res.completedCourses || [],
        missedOrFailedCourses: res.missedOrFailedCourses || [],
        adjustmentsRecommended: res.adjustmentsRecommended || [],
        planVersion: res.planVersion || activeTarget.planVersion,
        dataRevision: res.dataRevision || activeTarget.dataRevision,
        policyVersion: res.policyVersion || null,
        reconciledAt: new Date().toLocaleTimeString('vi-VN')
      };

      this.notify();
      return {
        success: true,
        onTrack: res.onTrack,
        data: this.reconcileResult,
        message: res.onTrack
          ? `Học kỳ ${completedSemester}: Tiến độ ĐÚNG KẾ HOẠCH! (${res.completedCourses?.length || 0} môn hoàn thành)`
          : `Học kỳ ${completedSemester}: Phát hiện ${res.missedOrFailedCourses?.length || 0} môn chưa đạt/bỏ lỡ. Cần điều chỉnh lộ trình!`
      };
    } catch (err) {
      this.apiError = err;
      const isPlanNotActive =
        err?.status === 409 &&
        (err?.code === 'PLAN_NOT_ACTIVE' || String(err?.message || '').includes('PLAN_NOT_ACTIVE'));
      return {
        success: false,
        code: err?.code || (isPlanNotActive ? 'PLAN_NOT_ACTIVE' : 'RECONCILE_FAILED'),
        planNotActive: isPlanNotActive,
        error: err,
        message: isPlanNotActive
          ? 'Chỉ có thể đối soát trên kế hoạch đang theo dõi (ACTIVE).'
          : `Lỗi đối chiếu học kỳ: ${err?.message || 'Sự cố kết nối'}`
      };
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  /**
   * Tạo bản DRAFT đề xuất mới từ các kiến nghị điều chỉnh đối soát (Reconcile Adjustments),
   * bảo toàn 100% bản ACTIVE hiện có.
   */
  applyReconcileAdjustmentsAsDraft() {
    if (!this.reconcileResult) return null;
    const { adjustmentsRecommended, missedOrFailedCourses, completedSemester } = this.reconcileResult;

    // Lấy bản kế hoạch gốc (ACTIVE)
    const basePlan =
      this.plan.status === PLAN_STATUSES.ACTIVE
        ? this.plan
        : this.history.find((h) => h.status === PLAN_STATUSES.ACTIVE)?.snapshot || this.plan;

    const draftPlan = clone(basePlan);
    draftPlan.planName = `Kế hoạch điều chỉnh sau đối soát ${completedSemester}`;
    draftPlan.status = PLAN_STATUSES.DRAFT;
    draftPlan.planId = null;
    draftPlan.planVersion = null;
    draftPlan.sourcePlanId = basePlan.planId;
    draftPlan.reconcileNotes = adjustmentsRecommended || [];

    // Nếu có môn trượt cần xếp lại vào kỳ tiếp theo
    if (missedOrFailedCourses && missedOrFailedCourses.length > 0 && draftPlan.semesters?.[0]) {
      const existingCodes = new Set(draftPlan.semesters[0].courses.map((c) => c.courseCode));
      for (const courseCode of missedOrFailedCourses) {
        if (!existingCodes.has(courseCode)) {
          draftPlan.semesters[0].courses.push({
            courseCode,
            courseName: `Học lại: ${courseCode}`,
            credits: 3,
            courseType: 'Học lại (Đối soát học kỳ)',
            targetGrade: 'B (3.0)',
            rationale: `Bổ sung sau đối soát kết quả học kỳ ${completedSemester}`
          });
        }
      }
      draftPlan.semesters[0].totalCredits = draftPlan.semesters[0].courses.reduce(
        (sum, c) => sum + (Number(c.credits) || 0),
        0
      );
    }

    this.setIncomingProposal(draftPlan, `Đối soát học vụ (${completedSemester})`);
    return draftPlan;
  }
}

export const plannerStore = new PlannerStore();
export default plannerStore;
