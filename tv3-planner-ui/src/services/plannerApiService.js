/**
 * HaUI Advisor — Planner API Service Adapter (TV3)
 * Kết nối các endpoint chuẩn theo contracts-v1 (1.4.0 / openapi-v1.yaml, tag Planner)
 *
 * Hỗ trợ giao tiếp thông qua injected singleton `api` từ TV2 web host.
 */

/**
 * Sinh phương án lộ trình học tập đề xuất để xem trước (không lưu, luôn DRAFT).
 * POST /planner/generate
 * @param {Object} api - Injected API client
 * @param {Object} [payload] - GenerateStudyPlanRequest
 * @param {string} [payload.targetGraduationSemester] - Học kỳ muốn tốt nghiệp (ví dụ: '2026_1')
 * @param {number} [payload.targetCpa] - CPA mục tiêu
 * @param {number} [payload.maxCreditsPerSemester] - Trần tín chỉ mỗi kỳ
 * @param {boolean} [payload.includeSummerSemesters] - Cho phép xếp kỳ hè
 * @param {string[]} [payload.selectedRetakeCourseCodes] - Học phần cải thiện
 * @param {string} [payload.dataRevision] - Revision dữ liệu học vụ
 * @returns {Promise<Object>} GenerateStudyPlanResponse
 */
export async function generateStudyPlan(api, payload = {}, opts = {}) {
  if (api?.planner && typeof api.planner.generate === 'function') {
    return api.planner.generate(payload, opts);
  }
  if (typeof api?.post === 'function') {
    return api.post('/planner/generate', payload, opts);
  }
  throw new Error('API client không hỗ trợ endpoint POST /planner/generate');
}

/**
 * Thẩm định kế hoạch học tập theo quy chế (AcademicFacade).
 * POST /planner/validate
 * - Có planId (+planVersion): Thẩm định bản đã lưu.
 * - Không có planId: Kiểm tra nhanh semesters chưa lưu (status luôn DRAFT).
 * @param {Object} api
 * @param {Object} payload - ValidateStudyPlanRequest
 * @returns {Promise<Object>} ValidateStudyPlanResponse
 */
export async function validateStudyPlan(api, payload = {}, opts = {}) {
  if (api?.planner && typeof api.planner.validate === 'function') {
    return api.planner.validate(payload, opts);
  }
  if (typeof api?.post === 'function') {
    return api.post('/planner/validate', payload, opts);
  }
  throw new Error('API client không hỗ trợ endpoint POST /planner/validate');
}

/**
 * Lấy danh sách lịch sử kế hoạch học tập của sinh viên đang đăng nhập.
 * GET /planner/plans
 * @param {Object} api
 * @returns {Promise<Object>} StudyPlanListResponse ({ plans: StudyPlanSummaryItem[] })
 */
export async function listStudyPlans(api, opts = {}) {
  if (api?.planner && typeof api.planner.listPlans === 'function') {
    return api.planner.listPlans(opts);
  }
  if (typeof api?.get === 'function') {
    return api.get('/planner/plans', opts);
  }
  throw new Error('API client không hỗ trợ endpoint GET /planner/plans');
}

/**
 * Lấy chi tiết một kế hoạch học tập đã lưu.
 * GET /planner/plans/{planId}
 * @param {Object} api
 * @param {string} planId
 * @returns {Promise<Object>} StudyPlanDetailResponse
 */
export async function getStudyPlan(api, planId, opts = {}) {
  if (api?.planner && typeof api.planner.getPlan === 'function') {
    return api.planner.getPlan(planId, opts);
  }
  if (typeof api?.get === 'function') {
    return api.get(`/planner/plans/${encodeURIComponent(planId)}`, opts);
  }
  throw new Error('API client không hỗ trợ endpoint GET /planner/plans/{planId}');
}

/**
 * Lưu nháp kế hoạch học tập (luôn DRAFT, không đổi bản ACTIVE).
 * POST /planner/plans
 * - planId = null: Tạo DRAFT mới.
 * - planId của DRAFT/VALIDATED: Cập nhật tại chỗ, planVersion+1, về DRAFT.
 * - planId của ACTIVE: Tạo DRAFT mới kế thừa, ACTIVE giữ nguyên.
 * @param {Object} api
 * @param {Object} payload - SaveStudyPlanRequest
 * @returns {Promise<Object>} SaveStudyPlanResponse
 */
export async function saveStudyPlan(api, payload = {}, opts = {}) {
  if (api?.planner && typeof api.planner.savePlan === 'function') {
    return api.planner.savePlan(payload, opts);
  }
  if (typeof api?.post === 'function') {
    return api.post('/planner/plans', payload, opts);
  }
  throw new Error('API client không hỗ trợ endpoint POST /planner/plans');
}

/**
 * Hủy bản nháp kế hoạch (DRAFT/VALIDATED). Bản ACTIVE/ARCHIVED không xóa được.
 * DELETE /planner/plans/{planId}?planVersion=...
 * @param {Object} api
 * @param {string} planId
 * @param {number} [planVersion]
 * @returns {Promise<void>}
 */
export async function deleteStudyPlan(api, planId, planVersion, opts = {}) {
  if (api?.planner && typeof api.planner.deletePlan === 'function') {
    return api.planner.deletePlan(planId, planVersion, opts);
  }
  const query = planVersion !== undefined && planVersion !== null ? `?planVersion=${encodeURIComponent(planVersion)}` : '';
  if (typeof api?.delete === 'function') {
    return api.delete(`/planner/plans/${encodeURIComponent(planId)}${query}`, opts);
  }
  throw new Error('API client không hỗ trợ endpoint DELETE /planner/plans/{planId}');
}

/**
 * Kích hoạt kế hoạch học tập (VALIDATED -> ACTIVE). Bản ACTIVE cũ chuyển ARCHIVED.
 * POST /planner/plans/{planId}/activate
 * @param {Object} api
 * @param {string} planId
 * @param {Object} [payload] - ActivateStudyPlanRequest ({ planVersion, dataRevision })
 * @returns {Promise<Object>} ActivateStudyPlanResponse
 */
export async function activateStudyPlan(api, planId, payload = {}, opts = {}) {
  if (api?.planner && typeof api.planner.activatePlan === 'function') {
    return api.planner.activatePlan(planId, payload, opts);
  }
  if (typeof api?.post === 'function') {
    return api.post(`/planner/plans/${encodeURIComponent(planId)}/activate`, payload, opts);
  }
  throw new Error('API client không hỗ trợ endpoint POST /planner/plans/{planId}/activate');
}

/**
 * Khôi phục / Tạo DRAFT mới từ một kế hoạch (thường là ARCHIVED); bản gốc giữ nguyên.
 * POST /planner/plans/{planId}/restore
 * @param {Object} api
 * @param {string} planId
 * @param {Object} [payload] - RestoreStudyPlanRequest ({ planName })
 * @returns {Promise<Object>} StudyPlanDetailResponse
 */
export async function restoreStudyPlan(api, planId, payload = {}, opts = {}) {
  if (api?.planner && typeof api.planner.restorePlan === 'function') {
    return api.planner.restorePlan(planId, payload, opts);
  }
  if (typeof api?.post === 'function') {
    return api.post(`/planner/plans/${encodeURIComponent(planId)}/restore`, payload, opts);
  }
  throw new Error('API client không hỗ trợ endpoint POST /planner/plans/{planId}/restore');
}
