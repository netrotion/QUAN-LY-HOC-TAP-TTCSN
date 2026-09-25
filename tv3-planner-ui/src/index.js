/**
 * HaUI Advisor - Planner UI Feature Package (TV3)
 * Điểm nối route hợp đồng giữa TV2 (Web Host) và TV3 (Planner UI).
 *
 * @param {Object} options
 * @param {Object} options.api - API client chung do TV2 cung cấp
 * @param {Object} options.ui - UI components dùng chung do TV2 cung cấp
 * @returns {Array} Danh sách route definitions cho React Router
 */
export function createStudentRoutes({ api, ui } = {}) {
  // Tại bootstrap-v0, export danh sách route placeholder kỹ thuật
  return [
    {
      path: "/planner/placeholder",
      name: "PlannerPlaceholder",
      status: "NOT_IMPLEMENTED",
      description: "Lộ trình học tập - thuộc phạm vi TV3 task 1.4"
    }
  ];
}

export const PACKAGE_INFO = {
  name: "@haui/planner-ui",
  version: "0.0.1-v0",
  owner: "TV3 — FE kế hoạch/AI"
};
