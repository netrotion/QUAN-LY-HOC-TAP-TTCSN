import React, { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  StudyPlannerPage,
  ChatAdvisorPage,
  WhatIfSimulatorPage,
  StudentProfilePage
} from '@haui/planner-ui';
import { api } from './services/apiClient.js';
import { ui } from './components/ui/index.js';
import { MainLayout } from './components/layout/MainLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { AcademicProgressPage } from './pages/AcademicProgressPage.jsx';
import { GraduationAuditPage } from './pages/GraduationAuditPage.jsx';
import { CurriculumTreePage } from './pages/CurriculumTreePage.jsx';
import { TranscriptImportPage } from './pages/TranscriptImportPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { PlanHistoryPage } from './pages/PlanHistoryPage.jsx';
import { DemoUiPage } from './pages/DemoUiPage.jsx';
import { mountStudentRoutes } from './routes/mountStudentRoutes.jsx';
import { useAnimatedNavigate } from './components/layout/animatedNavigation.jsx';

// ponytail: SettingsPage lazy-loaded, add when built
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage.jsx').catch(() => ({ default: () => <DemoUiPage /> }))
);

export { api, ui, mountStudentRoutes };

export function AppRoutes() {
  const navigate = useAnimatedNavigate();
  const mountedRouteSummary = useMemo(() => mountStudentRoutes({ api, ui }), []);

  return (
    <Routes>
      {/* Auth routes (no layout) */}
      <Route path="/login" element={<LoginPage />} />

      <Route element={<MainLayout />}>
        {/* TV2 core pages */}
        <Route index element={<DashboardPage mountedRouteSummary={mountedRouteSummary} />} />
        <Route path="/dashboard" element={<DashboardPage mountedRouteSummary={mountedRouteSummary} />} />
        <Route path="/transcript" element={<TranscriptImportPage />} />
        <Route path="/academic/import" element={<Navigate to="/transcript" replace />} />
        <Route path="/progress" element={<StudentProfilePage api={api} ui={ui} onNavigate={navigate} onOpenTranscript={() => navigate('/transcript')} onOpenPlanner={() => navigate('/planner')} />} />
        <Route path="/profile" element={<StudentProfilePage api={api} ui={ui} onNavigate={navigate} onOpenTranscript={() => navigate('/transcript')} onOpenPlanner={() => navigate('/planner')} />} />
        <Route path="/academic" element={<Navigate to="/progress" replace />} />
        <Route path="/audit" element={<GraduationAuditPage />} />
        <Route path="/curriculum" element={<CurriculumTreePage />} />
        <Route path="/curriculum/tree" element={<CurriculumTreePage />} />
        <Route path="/planner" element={<StudyPlannerPage api={api} ui={ui} onNavigate={navigate} />} />
        <Route path="/chat" element={<ChatAdvisorPage api={api} ui={ui} onNavigate={navigate} onOpenTranscript={() => navigate('/transcript')} onOpenPlanner={() => navigate('/planner')} />} />
        <Route path="/what-if" element={<WhatIfSimulatorPage api={api} ui={ui} onNavigate={navigate} />} />
        <Route path="/plan-history" element={<PlanHistoryPage />} />
        <Route path="/settings" element={
          <React.Suspense fallback={<div style={{ padding: 32 }}>Đang tải...</div>}>
            <SettingsPage />
          </React.Suspense>
        } />
        <Route path="/demo-ui" element={<Navigate to="/settings" replace />} />

        {/* TV3 mounted routes */}
        {mountedRouteSummary.routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
