import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {
  createStudentRoutes,
  PACKAGE_INFO,
  StudyPlannerPage,
  ChatAdvisorPage,
  WhatIfSimulatorPage,
  StudentProfilePage
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
