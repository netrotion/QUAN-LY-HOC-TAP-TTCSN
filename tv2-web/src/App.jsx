import React, { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './services/apiClient.js';
import { ui } from './components/ui/index.js';
import { MainLayout } from './components/layout/MainLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { AcademicProgressPage } from './pages/AcademicProgressPage.jsx';
import { CurriculumTreePage } from './pages/CurriculumTreePage.jsx';
import { DemoUiPage } from './pages/DemoUiPage.jsx';
import { mountStudentRoutes } from './routes/mountStudentRoutes.jsx';

export { api, ui, mountStudentRoutes };

/**
 * Cấu trúc Routes nội bộ của Web Host (TV2) kết hợp với các Route được mount từ TV3
 */
export function AppRoutes() {
  // Mount các route của TV3 thông qua Dependency Injection: createStudentRoutes({ api, ui })
  const mountedRouteSummary = useMemo(() => mountStudentRoutes({ api, ui }), []);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Các màn hình nền tảng & học vụ do TV2 phụ trách */}
        <Route
          index
          element={<DashboardPage mountedRouteSummary={mountedRouteSummary} />}
        />
        <Route path="/progress" element={<AcademicProgressPage />} />
        <Route path="/audit" element={<Navigate to="/progress" replace />} />
        <Route path="/curriculum" element={<CurriculumTreePage />} />
        <Route path="/demo-ui" element={<DemoUiPage />} />

        {/* Các route của TV3 được mount qua createStudentRoutes({ api, ui }) kèm Fallback Placeholder */}
        {mountedRouteSummary.routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}

        {/* Fallback 404 điều hướng về trang chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

/**
 * Root Application Component của Web Host (TV2 — Task 1.3a `ui-api-v0`)
 */
export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
