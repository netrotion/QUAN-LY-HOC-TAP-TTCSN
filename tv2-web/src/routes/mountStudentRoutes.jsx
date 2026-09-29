import React from 'react';
import { createStudentRoutes as tv3CreateStudentRoutes } from '@haui/planner-ui';
import { api as defaultApi } from '../services/apiClient.js';
import { ui as defaultUi } from '../components/ui/index.js';
import { resolveStudentRoutesWithFallback } from './tv3RouteContract.js';
import { Tv3FallbackPage } from '../pages/Tv3FallbackPage.jsx';

/**
 * Hàm mount route chính thức của Web Host (TV2) dành cho gói TV3 (`@haui/planner-ui`).
 * Tuân thủ chuẩn Dependency Injection: `createStudentRoutes({ api, ui })`.
 *
 * - Truyền singleton `api` và bộ component `ui` V0 xuống TV3.
 * - Nếu TV3 trả về `element` hoặc `Component` thực tế (Task 1.4), sử dụng trực tiếp component của TV3.
 * - Nếu TV3 trả về route ở trạng thái `NOT_IMPLEMENTED` hoặc chưa khai báo đủ các route
 *   (`/planner`, `/recommendations`, `/what-if`, `/chat`), tự động gắn `Tv3FallbackPage` để router không bị gãy.
 *
 * @param {Object} [options]
 * @param {Object} [options.api] - Singleton API client
 * @param {Object} [options.ui] - Shared UI library V0
 * @param {Function} [options.routeFactory] - Hàm createStudentRoutes (mặc định từ `@haui/planner-ui`)
 */
export function mountStudentRoutes({
  api = defaultApi,
  ui = defaultUi,
  routeFactory = tv3CreateStudentRoutes
} = {}) {
  const { contractStatus, rawTv3Routes, resolvedRoutes } = resolveStudentRoutesWithFallback({
    api,
    ui,
    routeFactory
  });

  const mountedRoutes = resolvedRoutes.map((routeSpec) => {
    let element = null;

    if (!routeSpec.isFallback) {
      if (React.isValidElement(routeSpec.element)) {
        element = routeSpec.element;
      } else if (typeof routeSpec.Component === 'function') {
        const RouteComponent = routeSpec.Component;
        element = <RouteComponent api={api} ui={ui} />;
      } else if (typeof routeSpec.render === 'function') {
        element = routeSpec.render({ api, ui });
      }
    }

    if (!element) {
      element = (
        <Tv3FallbackPage
          routeSpec={routeSpec}
          api={api}
          ui={ui}
          contractStatus={contractStatus}
        />
      );
    }

    return {
      ...routeSpec,
      element
    };
  });

  return {
    contractStatus,
    rawTv3Routes,
    routes: mountedRoutes
  };
}

export default mountStudentRoutes;
