/**
 * HaUI Advisor — Planner Store & State Machine (TV3)
 * Quản lý trạng thái tập trung cho Study Planner, Lịch sử phiên bản,
 * và điều phối luồng hội tụ đề xuất từ AI Advisor, What-if Simulator và Graduation Audit.
 */

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
      validation: this.validation
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
    this.incomingProposal = {
      ...proposal,
      sourceName,
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

  // Lưu bản nháp (Save Draft) — lưu không phải kích hoạt, không đổi nội dung nên giữ nguyên kết quả thẩm định
  saveDraft(customName) {
    if (this.plan.status === PLAN_STATUSES.ACTIVE) {
      return {
        success: false,
        code: 'NO_CHANGES',
        message: 'Kế hoạch đang áp dụng chưa có thay đổi nào để lưu thành bản nháp.'
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
}

export const plannerStore = new PlannerStore();
export default plannerStore;
