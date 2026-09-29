import { StudyPlannerPage } from './pages/StudyPlannerPage.js';
import { ChatAdvisorPage } from './pages/ChatAdvisorPage.js';
import { WhatIfSimulatorPage } from './pages/WhatIfSimulatorPage.js';
import { StudentProfilePage } from './pages/StudentProfilePage.js';

/**
 * HaUI Advisor - Planner UI Feature Package (TV3)
 * Điểm nối route hợp đồng giữa TV2 (Web Host) và TV3 (Planner UI).
 *
 * @param {Object} [options]
 * @param {Object} [options.api] - API client chung do TV2 cung cấp
 * @param {Object} [options.ui] - UI components dùng chung do TV2 cung cấp
 * @param {string} [options.status] - Trạng thái triển khai của route (mặc định 'NOT_IMPLEMENTED' tại bước dựng khung)
 * @returns {Array} Danh sách route definitions cho React Router
 */
export function createStudentRoutes({ api, ui, status } = {}) {
  // Tại bước tạo khung (skeleton), status mặc định là 'NOT_IMPLEMENTED'
  // theo đúng hợp đồng bàn giao Task 1.3a để Web Host TV2 nhận diện và áp dụng cơ chế fallback an toàn
  // cho đến khi hoàn tất nghiệp vụ chi tiết của từng màn hình.
  const routeStatus = status || 'NOT_IMPLEMENTED';

  return [
    {
      path: '/planner/placeholder',
      name: 'PlannerPlaceholder',
      status: 'NOT_IMPLEMENTED',
      description: 'Lộ trình học tập - thuộc phạm vi TV3 task 1.4'
    },
    {
      path: '/planner',
      name: 'StudyPlannerPage',
      title: 'Màn hình 5: Tùy chỉnh & Xác nhận Kế hoạch học tập (Study Planner)',
      status: routeStatus,
      Component: StudyPlannerPage
    },
    {
      path: '/chat',
      name: 'ChatAdvisorPage',
      title: 'Màn hình 2: Trợ lý ảo AI Chatbot Tư vấn Học vụ (AI Advisor Chat)',
      status: routeStatus,
      Component: ChatAdvisorPage
    },
    {
      path: '/what-if',
      name: 'WhatIfSimulatorPage',
      title: 'Màn hình 6, 7, 8: Giả lập Điểm số, Tối ưu Học cải thiện & Tính điểm ngược (What-if)',
      status: routeStatus,
      Component: WhatIfSimulatorPage
    },
    {
      path: '/profile',
      name: 'StudentProfilePage',
      title: 'Hồ sơ Sinh viên & Tùy chọn Học tập cá nhân (Profile)',
      status: routeStatus,
      Component: StudentProfilePage
    }
  ];
}

export {
  StudyPlannerPage,
  ChatAdvisorPage,
  WhatIfSimulatorPage,
  StudentProfilePage
};

export const PACKAGE_INFO = {
  name: '@haui/planner-ui',
  version: '0.0.1-v0',
  owner: 'TV3 — FE kế hoạch/AI'
};
