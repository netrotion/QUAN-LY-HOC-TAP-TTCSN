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
    note: 'Đã bổ sung môn Tự chọn IT6010 và phân bổ thực tập vào kỳ hè.'
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
    note: 'Bản kế hoạch chính thức đã được kích hoạt áp dụng.'
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
    note: 'Phương án dồn 22 TC vào Kỳ 7 - Cảnh báo quá tải học vụ.'
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
    note: 'Bản khởi tạo từ gợi ý tự động sau khi nhập bảng điểm K1-K6.'
  }
]);

/**
 * Singleton Store quản lý State kế hoạch trong phạm vi TV3
 */
class PlannerStore {
  constructor() {
    this.plan = JSON.parse(JSON.stringify(INITIAL_MULTI_SEMESTER_PLAN));
    this.history = JSON.parse(JSON.stringify(INITIAL_PLAN_HISTORY));
    this.incomingProposal = null; // Đề xuất từ AI Chat hoặc What-if đang chờ duyệt
    this.listeners = new Set();
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
      incomingProposal: this.incomingProposal
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

  // Chấp nhận đề xuất: Ghi đè vào bản nháp hiện hành
  acceptProposal() {
    if (!this.incomingProposal) return;
    const proposal = this.incomingProposal;

    // Chuẩn hóa cấu trúc học kỳ từ proposal
    if (proposal.semesters && Array.isArray(proposal.semesters)) {
      this.plan.semesters = JSON.parse(JSON.stringify(proposal.semesters));
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

    this.plan.status = PLAN_STATUSES.DRAFT;
    this.plan.version = 'v2.4 (Đề xuất đã nạp)';
    this.incomingProposal = null;
    this.notify();
  }

  // Hủy đề xuất: Bỏ qua không nhập vào kế hoạch
  dismissProposal() {
    this.incomingProposal = null;
    this.notify();
  }

  // Thêm một môn học vào học kỳ chỉ định
  addCourseToSemester(semesterCode, course) {
    const sem = this.plan.semesters.find((s) => s.semesterCode === semesterCode);
    if (!sem) return false;

    // Tránh trùng mã môn
    if (sem.courses.some((c) => c.courseCode === course.courseCode)) {
      return false;
    }

    sem.courses.push({
      courseCode: course.courseCode,
      courseName: course.courseName,
      credits: Number(course.credits) || 3,
      courseType: course.courseType || 'Tự chọn chuyên ngành',
      targetGrade: course.targetGrade || 'A (4.0)',
      rationale: course.rationale || 'Sinh viên chủ động bổ sung vào kế hoạch'
    });

    sem.totalCredits = sem.courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
    this.plan.status = PLAN_STATUSES.DRAFT; // Mọi thay đổi đều đưa về DRAFT để re-validate
    this.notify();
    return true;
  }

  // Bỏ một môn học khỏi học kỳ
  removeCourseFromSemester(semesterCode, courseCode) {
    const sem = this.plan.semesters.find((s) => s.semesterCode === semesterCode);
    if (!sem) return false;

    sem.courses = sem.courses.filter((c) => c.courseCode !== courseCode);
    sem.totalCredits = sem.courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
    this.plan.status = PLAN_STATUSES.DRAFT;
    this.notify();
    return true;
  }

  // Lưu bản nháp (Save Draft)
  saveDraft(customName) {
    this.plan.status = PLAN_STATUSES.DRAFT;
    if (customName) {
      this.plan.planName = customName;
    }

    // Cập nhật hoặc thêm vào lịch sử
    const existingIdx = this.history.findIndex((h) => h.planId === this.plan.planId);
    const summary = {
      planId: this.plan.planId,
      version: this.plan.version || 'v2.4',
      name: this.plan.planName,
      status: PLAN_STATUSES.DRAFT,
      updatedAt: 'Vừa xong',
      totalSemesters: this.plan.semesters.length,
      totalCredits: this.plan.semesters.reduce((sum, s) => sum + (s.totalCredits || 0), 0),
      projectedCpa: this.plan.projectedCpa,
      badge: 'Bản nháp (Đã lưu)',
      note: 'Bản nháp được lưu thành công vào CSDL.'
    };

    if (existingIdx >= 0) {
      this.history[existingIdx] = summary;
    } else {
      this.history.unshift(summary);
    }

    this.notify();
    return { success: true, message: 'Đã lưu thành công bản nháp vào hệ thống!' };
  }

  // Thẩm định quy chế thời gian thực (Validate Plan)
  validatePlan() {
    const violations = [];
    const warnings = [];

    // Kiểm tra từng học kỳ
    for (const sem of this.plan.semesters) {
      const tc = Number(sem.totalCredits) || 0;
      const isSummer = sem.semesterCode.includes('SUMMER');

      if (isSummer) {
        if (tc > 8) {
          violations.push(`${sem.semesterName}: Tổng ${tc} TC vượt trần 8 TC tối đa của học kỳ hè.`);
        }
      } else {
        if (tc < 10) {
          violations.push(`${sem.semesterName}: Tổng ${tc} TC nhỏ hơn sàn tối thiểu 10 TC trong học kỳ chính (BR-03).`);
        } else if (tc > 24) {
          violations.push(`${sem.semesterName}: Tổng ${tc} TC vượt trần tối đa 24 TC trong học kỳ chính (BR-04).`);
        } else if (tc >= 20) {
          warnings.push(`${sem.semesterName}: Tải học tập cao (${tc} TC). Chú ý cân bằng thời gian ôn tập.`);
        }
      }
    }

    const isValid = violations.length === 0;
    this.plan.status = isValid ? PLAN_STATUSES.VALIDATED : PLAN_STATUSES.DRAFT;
    this.notify();

    return {
      valid: isValid,
      status: this.plan.status,
      violations,
      warnings
    };
  }

  // Kích hoạt kế hoạch (Bắt đầu theo dõi — ACTIVATE)
  activatePlan() {
    // 1. Chuyển tất cả bản ACTIVE trước đó trong lịch sử thành ARCHIVED
    this.history = this.history.map((h) => {
      if (h.status === PLAN_STATUSES.ACTIVE) {
        return {
          ...h,
          status: PLAN_STATUSES.ARCHIVED,
          badge: 'Lưu trữ (Đã thay thế)',
          note: `Lưu trữ tự động khi kích hoạt bản ${this.plan.version}`
        };
      }
      return h;
    });

    // 2. Chuyển bản hiện tại thành ACTIVE
    this.plan.status = PLAN_STATUSES.ACTIVE;
    const activeSummary = {
      planId: this.plan.planId,
      version: this.plan.version || 'v2.4',
      name: this.plan.planName,
      status: PLAN_STATUSES.ACTIVE,
      updatedAt: 'Vừa kích hoạt',
      totalSemesters: this.plan.semesters.length,
      totalCredits: this.plan.semesters.reduce((sum, s) => sum + (s.totalCredits || 0), 0),
      projectedCpa: this.plan.projectedCpa,
      badge: 'Đang áp dụng (ACTIVE)',
      note: 'Kế hoạch học tập chính thức đang được hệ thống theo dõi tiến độ.'
    };

    const existingIdx = this.history.findIndex((h) => h.planId === this.plan.planId);
    if (existingIdx >= 0) {
      this.history[existingIdx] = activeSummary;
    } else {
      this.history.unshift(activeSummary);
    }

    this.notify();
    return {
      success: true,
      message: 'Kế hoạch học tập đã được kích hoạt chính thức thành công!'
    };
  }

  // Khôi phục / Mở lại một bản lưu trữ cũ (Restore Plan)
  restorePlan(planId) {
    const target = this.history.find((h) => h.planId === planId);
    if (!target) return { success: false, message: 'Không tìm thấy phiên bản yêu cầu.' };

    // Tạo bản DRAFT mới kế thừa từ bản cũ
    this.plan = JSON.parse(JSON.stringify(INITIAL_MULTI_SEMESTER_PLAN));
    this.plan.planId = `plan-restored-${Date.now()}`;
    this.plan.version = `${target.version}-restored`;
    this.plan.planName = `Khôi phục từ ${target.name}`;
    this.plan.status = PLAN_STATUSES.DRAFT;

    this.notify();
    return {
      success: true,
      message: `Đã mở lại phiên bản ${target.version} dưới dạng bản nháp mới để bạn tiếp tục chỉnh sửa!`
    };
  }

  // Đặt lại dữ liệu về mặc định ban đầu
  resetToDefault() {
    this.plan = JSON.parse(JSON.stringify(INITIAL_MULTI_SEMESTER_PLAN));
    this.history = JSON.parse(JSON.stringify(INITIAL_PLAN_HISTORY));
    this.incomingProposal = null;
    this.notify();
  }
}

export const plannerStore = new PlannerStore();
export default plannerStore;
