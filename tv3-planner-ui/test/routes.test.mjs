import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {
  createStudentRoutes,
  PACKAGE_INFO,
  StudyPlannerPage,
  ChatAdvisorPage,
  WhatIfSimulatorPage,
  StudentProfilePage,
  PlanHistoryModal,
  CurriculumTreeModal,
  plannerStore,
  PLAN_STATUSES
} from '../src/index.js';

test('createStudentRoutes returns an array of route definitions with 4 core pages', () => {
  const mockApi = { get: () => {}, post: () => {} };
  const mockUi = { Button: () => null, Card: () => null };

  const routes = createStudentRoutes({ api: mockApi, ui: mockUi });
  assert.ok(Array.isArray(routes), 'createStudentRoutes must return an array');
  assert.equal(routes.length, 5);

  const paths = routes.map((r) => r.path);
  assert.ok(paths.includes('/planner/placeholder'));
  assert.ok(paths.includes('/planner'));
  assert.ok(paths.includes('/chat'));
  assert.ok(paths.includes('/what-if'));
  assert.ok(paths.includes('/profile'));

  assert.equal(routes[0].path, '/planner/placeholder');
  assert.equal(routes[0].status, 'NOT_IMPLEMENTED');

  const plannerRoute = routes.find((r) => r.path === '/planner');
  assert.equal(typeof plannerRoute.Component, 'function');
  assert.equal(plannerRoute.Component, StudyPlannerPage);

  const chatRoute = routes.find((r) => r.path === '/chat');
  assert.equal(typeof chatRoute.Component, 'function');
  assert.equal(chatRoute.Component, ChatAdvisorPage);

  const whatIfRoute = routes.find((r) => r.path === '/what-if');
  assert.equal(typeof whatIfRoute.Component, 'function');
  assert.equal(whatIfRoute.Component, WhatIfSimulatorPage);

  const profileRoute = routes.find((r) => r.path === '/profile');
  assert.equal(typeof profileRoute.Component, 'function');
  assert.equal(profileRoute.Component, StudentProfilePage);
});

test('createStudentRoutes allows configurable status (e.g. READY for live implementation)', () => {
  const mockApi = { get: () => {} };
  const mockUi = { Button: () => null };

  const readyRoutes = createStudentRoutes({ api: mockApi, ui: mockUi, status: 'READY' });
  const plannerRoute = readyRoutes.find((r) => r.path === '/planner');
  assert.equal(plannerRoute.status, 'READY');

  const chatRoute = readyRoutes.find((r) => r.path === '/chat');
  assert.equal(chatRoute.status, 'READY');

  const whatIfRoute = readyRoutes.find((r) => r.path === '/what-if');
  assert.equal(whatIfRoute.status, 'READY');

  const profileRoute = readyRoutes.find((r) => r.path === '/profile');
  assert.equal(profileRoute.status, 'READY');
});

test('StudyPlannerPage is a valid React component and can be instantiated as a React element', () => {
  assert.equal(typeof StudyPlannerPage, 'function');

  const mockUi = {
    Button: ({ children }) => children,
    Card: ({ title, children }) => children,
    Table: () => null,
    Modal: () => null,
    Loading: () => null,
    Error: () => null,
    EmptyState: () => null
  };

  const mockApi = {
    planner: {
      generate: async () => ({ planId: 'plan-1' }),
      validate: async () => ({ valid: true })
    }
  };

  const element = React.createElement(StudyPlannerPage, { api: mockApi, ui: mockUi });
  assert.ok(element, 'StudyPlannerPage must return a valid React element');
  assert.equal(element.type, StudyPlannerPage);
  assert.equal(element.props.api, mockApi);
  assert.equal(element.props.ui, mockUi);
});

test('ChatAdvisorPage is a valid React component and can be instantiated as a React element', () => {
  assert.equal(typeof ChatAdvisorPage, 'function');

  const mockUi = {
    Button: ({ children }) => children,
    Card: ({ title, children }) => children,
    Loading: () => null,
    Error: () => null,
    EmptyState: () => null
  };

  const mockApi = {
    advisor: {
      chat: async () => ({
        answer: 'Xin chào sinh viên',
        sources: [],
        actions: [],
        warnings: []
      })
    }
  };

  const element = React.createElement(ChatAdvisorPage, { api: mockApi, ui: mockUi });
  assert.ok(element, 'ChatAdvisorPage must return a valid React element');
  assert.equal(element.type, ChatAdvisorPage);
  assert.equal(element.props.api, mockApi);
  assert.equal(element.props.ui, mockUi);
});

test('WhatIfSimulatorPage is a valid React component and can be instantiated as a React element', () => {
  assert.equal(typeof WhatIfSimulatorPage, 'function');

  const mockUi = {
    Button: ({ children }) => children,
    Card: ({ title, children }) => children,
    Table: () => null,
    Loading: () => null,
    Error: () => null,
    EmptyState: () => null
  };

  const mockApi = {
    simulation: {
      simulateGrades: async () => ({ projectedGpa: 3.5, projectedCpa: 3.1 }),
      rankRetake: async () => ({ recommendations: [] }),
      calculateTargetGrades: async () => ({ achievable: true })
    }
  };

  const element = React.createElement(WhatIfSimulatorPage, { api: mockApi, ui: mockUi });
  assert.ok(element, 'WhatIfSimulatorPage must return a valid React element');
  assert.equal(element.type, WhatIfSimulatorPage);
  assert.equal(element.props.api, mockApi);
  assert.equal(element.props.ui, mockUi);
});

test('StudentProfilePage is a valid React component and can be instantiated as a React element', () => {
  assert.equal(typeof StudentProfilePage, 'function');

  const mockUi = {
    Button: ({ children }) => children,
    Card: ({ title, children }) => children,
    Loading: () => null,
    Error: () => null,
    EmptyState: () => null
  };

  const mockApi = {
    academic: {
      getStatus: async () => ({ studentId: 'std-test-1', cpa: 3.2, gpa: 3.4 })
    },
    getConfig: () => ({ sessionStudent: { fullName: 'Nguyễn Văn A' } })
  };

  const element = React.createElement(StudentProfilePage, { api: mockApi, ui: mockUi });
  assert.ok(element, 'StudentProfilePage must return a valid React element');
  assert.equal(element.type, StudentProfilePage);
  assert.equal(element.props.api, mockApi);
  assert.equal(element.props.ui, mockUi);
});

test('PlanHistoryModal and CurriculumTreeModal are exported and can be instantiated as React elements', () => {
  assert.equal(typeof PlanHistoryModal, 'function');
  assert.equal(typeof CurriculumTreeModal, 'function');

  const mockUi = {
    Button: ({ children }) => children,
    Card: ({ title, children }) => children,
    Modal: ({ children }) => children
  };

  const historyEl = React.createElement(PlanHistoryModal, { isOpen: true, onClose: () => {}, ui: mockUi });
  assert.equal(historyEl.type, PlanHistoryModal);

  const treeEl = React.createElement(CurriculumTreeModal, { isOpen: true, onClose: () => {}, ui: mockUi });
  assert.equal(treeEl.type, CurriculumTreeModal);
});

test('plannerStore manages multi-semester plan, state machine and proposal lifecycle', () => {
  plannerStore.resetToDefault();
  const plan = plannerStore.getPlan();

  // 1. Kiểm tra cấu trúc đa kỳ
  assert.ok(Array.isArray(plan.semesters));
  assert.equal(plan.semesters.length, 3, 'Kế hoạch phải có 3 học kỳ: Kỳ 7, Kỳ 8 và Kỳ hè');
  assert.equal(plan.status, PLAN_STATUSES.DRAFT);

  // 2. Kiểm tra thao tác lưu nháp (Save Draft)
  const saveRes = plannerStore.saveDraft('Kế hoạch KTPM K16 thử nghiệm');
  assert.equal(saveRes.success, true);
  const historyAfterSave = plannerStore.getHistory();
  assert.ok(historyAfterSave.length >= 4);

  // 3. Kiểm tra thẩm định quy chế (Validate Plan)
  const validRes = plannerStore.validatePlan();
  assert.equal(validRes.valid, true);
  assert.equal(validRes.status, PLAN_STATUSES.VALIDATED);

  // 4. Kiểm tra kích hoạt kế hoạch (Activate / Bắt đầu theo dõi)
  const activateRes = plannerStore.activatePlan();
  assert.equal(activateRes.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);
  const activeHistory = plannerStore.getHistory().filter((h) => h.status === PLAN_STATUSES.ACTIVE);
  assert.equal(activeHistory.length, 1, 'Chỉ duy nhất 1 bản ghi có trạng thái ACTIVE');

  // 5. Kiểm tra mở lại kế hoạch đã lưu trữ (Restore Plan)
  const restoreRes = plannerStore.restorePlan('plan-haui-2026-v2.2');
  assert.equal(restoreRes.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT, 'Bản khôi phục phải ở trạng thái DRAFT');

  // 6. Kiểm tra luồng hội tụ đề xuất (Incoming Proposal from AI / What-if)
  plannerStore.setIncomingProposal({
    projectedCpa: 3.40,
    semesters: [
      {
        semesterCode: '2026_1',
        semesterName: 'Kỳ 7 đề xuất mới',
        totalCredits: 18,
        courses: []
      }
    ]
  }, 'AI Advisor');

  assert.ok(plannerStore.getIncomingProposal());
  assert.equal(plannerStore.getIncomingProposal().sourceName, 'AI Advisor');

  // Chấp nhận đề xuất
  plannerStore.acceptProposal();
  assert.equal(plannerStore.getIncomingProposal(), null);
  assert.equal(plannerStore.getPlan().semesters[0].semesterName, 'Kỳ 7 đề xuất mới');

  // Reset về ban đầu
  plannerStore.resetToDefault();
});

test('All TV3 page components are exported and can be instantiated as React elements', () => {
  assert.equal(typeof StudyPlannerPage, 'function');
  assert.equal(typeof ChatAdvisorPage, 'function');
  assert.equal(typeof WhatIfSimulatorPage, 'function');
  assert.equal(typeof StudentProfilePage, 'function');

  const mockUi = {
    Button: ({ children }) => children,
    Card: ({ title, children }) => children
  };
  const mockApi = {};

  const plannerEl = React.createElement(StudyPlannerPage, { api: mockApi, ui: mockUi });
  assert.equal(plannerEl.type, StudyPlannerPage);

  const chatEl = React.createElement(ChatAdvisorPage, { api: mockApi, ui: mockUi });
  assert.equal(chatEl.type, ChatAdvisorPage);

  const whatIfEl = React.createElement(WhatIfSimulatorPage, { api: mockApi, ui: mockUi });
  assert.equal(whatIfEl.type, WhatIfSimulatorPage);

  const profileEl = React.createElement(StudentProfilePage, { api: mockApi, ui: mockUi });
  assert.equal(profileEl.type, StudentProfilePage);
});

test('PACKAGE_INFO has correct metadata', () => {
  assert.equal(PACKAGE_INFO.name, '@haui/planner-ui');
  assert.equal(PACKAGE_INFO.version, '0.0.1-v0');
});
