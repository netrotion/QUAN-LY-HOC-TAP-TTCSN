/**
 * HaUI Advisor — Hợp đồng Dependency Injection `ui-api-v0` giữa TV2 (Web Host) và TV3 (Planner/AI UI)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Đảm bảo kiến trúc không vòng phụ thuộc (Acyclic Dependency):
 * - TV2 khởi tạo `{ api, ui }` và truyền xuống `createStudentRoutes({ api, ui })` của `@haui/planner-ui`.
 * - TV3 tuyệt đối không import ngược từ `@haui/web` (`tv2-web`).
 * - Khi TV3 chưa triển khai code thật (trạng thái `NOT_IMPLEMENTED` hoặc thiếu `element`),
 *   TV2 tự động cung cấp Fallback Placeholder cho đầy đủ các route: Planner, Recommendation, Chat, What-if.
 */

export const UI_API_CONTRACT_VERSION = 'ui-api-v0';

export const REQUIRED_UI_COMPONENT_NAMES = Object.freeze([
  'Button',
  'Card',
  'Table',
  'Modal',
  'Loading',
  'Error',
  'EmptyState'
]);

export const REQUIRED_API_METHODS = Object.freeze([
  'get',
  'post',
  'put',
  'delete',
  'request',
  'setMockMode',
  'isMockMode'
]);

/**
 * Danh sách các route tiêu chuẩn thuộc phạm vi TV3 cần có fallback khi TV3 chưa triển khai xong Task 1.4
 */
export const TV3_DEFAULT_FALLBACK_SPECS = Object.freeze([
  {
    path: '/planner',
    key: 'planner',
    name: 'StudyPlannerFallback',
    title: 'Màn hình 5: Tùy chỉnh & Xác nhận Kế hoạch học tập (Study Planner)',
    owner: 'TV3 — FE Kế hoạch & AI (Task 1.4)',
    endpointPreview: 'POST /api/v1/planner/generate',
    description:
      'Cho phép sinh viên tùy chỉnh môn học, kiểm tra ràng buộc quy chế 10–24 tín chỉ thời gian thực (BR-03/BR-04) và lưu vào Lộ trình mục tiêu (State Machine: DRAFT → VALIDATED → ACTIVE → COMPLETED / ARCHIVED).'
  },
  {
    path: '/recommendations',
    key: 'recommendations',
    name: 'RecommendationFallback',
    title: 'Màn hình 3: Kết quả Phân tích & Đề xuất Lộ trình học tập (Roadmap Recommendation)',
    owner: 'TV3 — FE Kế hoạch & AI (Task 1.4)',
    endpointPreview: 'POST /api/v1/planner/generate',
    description:
      'Trình bày lộ trình tối ưu kỳ tới (18 TC cân bằng, CPA dự kiến 2.54 đạt loại Khá) theo trọng số thuật toán 40% tiên quyết - 25% bắt buộc - 20% ROI cải thiện - 15% cân bằng tải.'
  },
  {
    path: '/what-if',
    key: 'what-if',
    name: 'WhatIfSimulatorFallback',
    title: 'Màn hình 6, 7, 8: Giả lập Điểm số, Tối ưu Học cải thiện & Tính điểm ngược (What-if)',
    owner: 'TV3 — FE Kế hoạch & AI (Task 1.4)',
    endpointPreview: 'POST /api/v1/simulation/grades',
    description:
      'Luồng chính 2: Giả lập điểm kỳ tới (Màn 6), xếp hạng môn học cải thiện điểm D/D+/C theo ROI tăng CPA (Màn 7 - BR-06) và tính điểm mục tiêu ngược để đạt bằng Giỏi CPA >= 3.20 (Màn 8).'
  },
  {
    path: '/chat',
    key: 'chat',
    name: 'AdvisorChatFallback',
    title: 'Màn hình 2: Trợ lý ảo AI Chatbot Tư vấn Học vụ (AI Advisor Chat)',
    owner: 'TV3 — FE Kế hoạch & AI (Task 1.4)',
    endpointPreview: 'POST /api/v1/advisor/chat',
    description:
      'Luồng chính 1: Tiếp nhận yêu cầu học vụ bằng ngôn ngữ tự nhiên tiếng Việt, gợi ý Quick Prompt thông minh và kết nối qua Backend Spring Boot (TV5 -> TV1 RAG & Rule Engine).'
  }
]);

/**
 * Kiểm tra tính hợp lệ của gói hợp đồng `{ api, ui }` trước khi bàn giao cho TV3
 * @param {{ api: Object, ui: Object }} contract
 */
export function verifyUiApiContract({ api, ui } = {}) {
  const missingUi = REQUIRED_UI_COMPONENT_NAMES.filter(
    (name) => !ui || typeof ui[name] !== 'function'
  );
  const missingApi = REQUIRED_API_METHODS.filter(
    (method) => !api || typeof api[method] !== 'function'
  );

  return {
    valid: missingUi.length === 0 && missingApi.length === 0,
    version: UI_API_CONTRACT_VERSION,
    missingUi,
    missingApi,
    uiKeys: ui ? Object.keys(ui) : [],
    apiKeys: api ? Object.keys(api) : []
  };
}

/**
 * Chuẩn hóa và hợp nhất danh sách route từ `createStudentRoutes({ api, ui })` của TV3
 * kèm cơ chế Fallback Placeholder an toàn khi TV3 chưa có component thật.
 *
 * @param {Object} params
 * @param {Object} params.api - Singleton API Client
 * @param {Object} params.ui - Bộ Shared UI V0
 * @param {Function} [params.routeFactory] - Hàm `createStudentRoutes` từ `@haui/planner-ui`
 * @returns {{
 *   contractStatus: ReturnType<typeof verifyUiApiContract>,
 *   rawTv3Routes: Array<Object>,
 *   resolvedRoutes: Array<Object>
 * }}
 */
export function resolveStudentRoutesWithFallback({ api, ui, routeFactory } = {}) {
  const contractStatus = verifyUiApiContract({ api, ui });

  let rawTv3Routes = [];
  if (typeof routeFactory === 'function') {
    try {
      const result = routeFactory({ api, ui });
      if (Array.isArray(result)) {
        rawTv3Routes = result;
      }
    } catch (err) {
      rawTv3Routes = [
        {
          path: '/planner/error',
          name: 'Tv3MountError',
          status: 'NOT_IMPLEMENTED',
          description: err?.message || 'Lỗi khi gọi createStudentRoutes từ gói TV3'
        }
      ];
    }
  }

  const routeMap = new Map();

  // 1. Đưa các route do TV3 khai báo vào trước
  for (const route of rawTv3Routes) {
    if (!route || !route.path) continue;
    const hasRealComponent = Boolean(
      (route.element || route.Component || route.render) &&
        route.status !== 'NOT_IMPLEMENTED'
    );

    const matchingSpec = TV3_DEFAULT_FALLBACK_SPECS.find((s) => s.path === route.path);

    routeMap.set(route.path, {
      ...route,
      key: route.key || matchingSpec?.key || 'planner',
      title: route.title || matchingSpec?.title || route.name || route.path,
      owner: route.owner || matchingSpec?.owner || 'TV3 — @haui/planner-ui',
      endpointPreview: route.endpointPreview || matchingSpec?.endpointPreview || 'POST /api/v1/planner/generate',
      description:
        route.description ||
        matchingSpec?.description ||
        'Route được đăng ký qua createStudentRoutes({ api, ui }).',
      isFallback: !hasRealComponent,
      status: hasRealComponent ? 'IMPLEMENTED' : route.status || 'FALLBACK_PLACEHOLDER'
    });
  }

  // 2. Bổ sung đầy đủ các route cốt lõi của TV3 (/planner, /recommendations, /what-if, /chat) nếu TV3 chưa khai báo
  for (const spec of TV3_DEFAULT_FALLBACK_SPECS) {
    if (!routeMap.has(spec.path)) {
      routeMap.set(spec.path, {
        ...spec,
        isFallback: true,
        status: 'FALLBACK_PLACEHOLDER'
      });
    }
  }

  return {
    contractStatus,
    rawTv3Routes,
    resolvedRoutes: Array.from(routeMap.values())
  };
}
