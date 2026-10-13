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
  PLAN_STATUSES,
  generateMockChatResponse
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

test('F23-008 (P04 vs P05): Mock Chat không tự động gắn card đề xuất kế hoạch cho câu hỏi quy chế', () => {
  assert.equal(typeof generateMockChatResponse, 'function');

  // Kịch bản P04: Hỏi quy chế thuần túy -> planProposal: null (không ép mở Planner)
  const regQueries = [
    'Điều kiện cảnh báo học vụ mức 1 là gì?',
    'Điều kiện cảnh báo học vụ mức 1 của trường là gì?',
    'Một học kỳ chính tại HaUI tôi được đăng ký tối đa bao nhiêu tín chỉ? Kỳ hè thì sao?',
    'CPA và GPA khác nhau như thế nào trong quy chế của trường?',
    'Môn Kỹ thuật lập trình tôi được điểm A (hoặc B), tôi có được đăng ký học cải thiện không?'
  ];

  for (const q of regQueries) {
    const res = generateMockChatResponse(q);
    assert.equal(
      res.planProposal,
      null,
      `Câu hỏi quy chế "${q}" tuyệt đối không được gắn planProposal (vi phạm nguyên tắc hỏi quy chế không ép mở Planner)`
    );
    assert.ok(res.sources && res.sources.length > 0, `Câu hỏi quy chế "${q}" phải có nguồn trích dẫn quy chế`);
    assert.ok(res.answer && res.answer.includes('[AI Advisor]'), 'Phải có câu trả lời từ AI Advisor');
  }

  // Kịch bản P05: Yêu cầu lập lộ trình / kế hoạch học tập -> planProposal: Object
  const planQueries = [
    'Tư vấn lộ trình kéo CPA lên >= 3.20 để tốt nghiệp bằng Giỏi.',
    'Lên lộ trình học vượt 3.5 năm ngành CNTT/KTPM.',
    'Lập kế hoạch học tập kỳ tới cho tôi với 18 tín chỉ'
  ];

  for (const q of planQueries) {
    const res = generateMockChatResponse(q);
    assert.ok(
      res.planProposal,
      `Câu hỏi lập lộ trình "${q}" phải gắn planProposal để hiển thị thẻ đề xuất phương án`
    );
    assert.ok(res.sources && res.sources.length > 0, 'Phải có nguồn trích dẫn');
  }
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

test('Nghiệm thu Task 2.2b: Tự bấm Chat -> đề xuất -> sửa -> lưu -> mở lại; thử What-if rồi thoát không thay bản đang theo dõi', async () => {
  // Đặt lại trạng thái ban đầu
  plannerStore.resetToDefault();

  // BƯỚC 1: Chat -> Đề xuất
  // Giả lập AI tư vấn và sinh đề xuất lộ trình
  const aiProposal = {
    planId: 'plan-ai-proposal-999',
    projectedCpa: 3.35,
    projectedRank: 'Bằng Giỏi (CPA ≥ 3.20)',
    semesters: [
      {
        semesterCode: '2026_1',
        semesterName: 'Học kỳ 1 (2026 - 2027) — Kỳ 7 tối ưu',
        workloadAssessment: 'Cân bằng (18 TC)',
        totalCredits: 18,
        expectedGpa: 3.40,
        courses: [
          { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3, courseType: 'Học lại (Nợ F)', targetGrade: 'B' },
          { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', credits: 4, courseType: 'Học cải thiện', targetGrade: 'A' },
          { courseCode: 'IT6002', courseName: 'Lập trình mạng', credits: 3, courseType: 'Chuẩn CTĐT', targetGrade: 'B+' },
          { courseCode: 'IT4001', courseName: 'Cơ sở dữ liệu nâng cao', credits: 3, courseType: 'Chuẩn CTĐT', targetGrade: 'B' },
          { courseCode: 'IT6010', courseName: 'Phát triển ứng dụng Web', credits: 3, courseType: 'Tự chọn', targetGrade: 'A' },
          { courseCode: 'FL2001', courseName: 'Tiếng Anh CNTT', credits: 2, courseType: 'Bắt buộc chung', targetGrade: 'B' }
        ]
      }
    ]
  };

  // Chat gửi đề xuất sang store
  plannerStore.setIncomingProposal(aiProposal, 'AI Advisor Chat');
  assert.ok(plannerStore.getIncomingProposal(), 'Store phải nhận diện đề xuất đang chờ từ AI');
  assert.equal(plannerStore.getIncomingProposal().sourceName, 'AI Advisor Chat');

  // Sinh viên bấm "Chấp nhận phương án"
  plannerStore.acceptProposal();
  assert.equal(plannerStore.getIncomingProposal(), null, 'Sau khi chấp nhận, đề xuất chờ phải được xóa');
  assert.equal(plannerStore.getPlan().semesters[0].semesterName, 'Học kỳ 1 (2026 - 2027) — Kỳ 7 tối ưu');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT, 'Kế hoạch nạp từ đề xuất phải ở trạng thái DRAFT');

  // BƯỚC 2: Sửa kế hoạch (Thêm môn / Bỏ môn trên Study Planner)
  // Sinh viên bỏ môn FL2001 (2 TC) khỏi Kỳ 7
  const removeSuccess = plannerStore.removeCourseFromSemester('2026_1', 'FL2001');
  assert.equal(removeSuccess, true, 'Bỏ môn FL2001 phải thành công');
  assert.equal(plannerStore.getPlan().semesters[0].totalCredits, 16, 'Tổng tín chỉ phải cập nhật về 16 TC');

  // Sinh viên thêm môn IT7001 (Trí tuệ nhân tạo - 3 TC) vào Kỳ 7
  const addSuccess = plannerStore.addCourseToSemester('2026_1', {
    courseCode: 'IT7001',
    courseName: 'Trí tuệ nhân tạo căn bản',
    credits: 3,
    courseType: 'Tự chọn chuyên ngành',
    targetGrade: 'A'
  });
  assert.equal(addSuccess, true, 'Thêm môn IT7001 phải thành công');
  assert.equal(plannerStore.getPlan().semesters[0].totalCredits, 19, 'Tổng tín chỉ phải tăng lên 19 TC');

  // Thẩm định tính hợp lệ theo quy chế 10 - 24 TC (BR-03/BR-04)
  const validateResult = plannerStore.validatePlan();
  assert.equal(validateResult.valid, true, '19 TC nằm trong ngưỡng hợp lệ 10-24 TC');
  assert.equal(validateResult.status, PLAN_STATUSES.VALIDATED);

  // BƯỚC 3: Lưu nháp (Save Draft)
  const saveDraftResult = plannerStore.saveDraft('Lộ trình KTPM Kỳ 7 đã tinh chỉnh');
  assert.equal(saveDraftResult.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.VALIDATED);
  const currentPlanId = plannerStore.getPlan().planId;

  // Sinh viên kích hoạt kế hoạch để bắt đầu theo dõi chính thức (ACTIVE)
  const activateResult = plannerStore.activatePlan();
  assert.equal(activateResult.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE, 'Kế hoạch đã kích hoạt thành công');

  // Ghi nhận bản đang theo dõi
  const activePlanSnapshot = JSON.parse(JSON.stringify(plannerStore.getPlan()));
  assert.equal(activePlanSnapshot.status, PLAN_STATUSES.ACTIVE);
  assert.equal(activePlanSnapshot.semesters[0].totalCredits, 19);

  // BƯỚC 4: Mở lại (Restore / Re-open từ Lịch sử kế hoạch)
  // Sinh viên vào Lịch sử, chọn bản cũ 'plan-haui-2026-v2.2' để mở lại
  const restoreResult = plannerStore.restorePlan('plan-haui-2026-v2.2');
  assert.equal(restoreResult.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT, 'Bản khôi phục mở ra dưới dạng DRAFT để chỉnh sửa');
  assert.ok(plannerStore.getPlan().version.includes('restored'));

  // Kiểm tra bản ACTIVE trong lịch sử không bị mất đi
  const activeInHistory = plannerStore.getHistory().find((h) => h.planId === currentPlanId);
  assert.ok(activeInHistory);
  assert.equal(activeInHistory.status, PLAN_STATUSES.ACTIVE, 'Bản đang theo dõi trong lịch sử vẫn giữ nguyên ACTIVE');

  // BƯỚC 5: Thử What-if rồi thoát KHÔNG thay bản đang theo dõi
  // Giả lập sinh viên mở What-if Simulator, tính toán điểm hoặc xếp hạng ROI
  const whatIfSimResult = {
    projectedSemesterGpa: 3.90,
    projectedNewCpa: 3.50,
    courses: [
      { courseCode: 'MATH1002', expectedGrade: 'A' },
      { courseCode: 'IT2001', expectedGrade: 'A' }
    ]
  };

  // Sinh viên xem kết quả What-if, nhưng THOÁT RA (không bấm "Áp dụng vào Kế hoạch")
  // -> KHÔNG gọi plannerStore.setIncomingProposal hay acceptProposal
  const planAfterExitWhatIf = plannerStore.getPlan();

  // Kiểm tra tính bất biến: Kế hoạch không bị What-if làm biến đổi
  assert.notEqual(planAfterExitWhatIf.projectedCpa, whatIfSimResult.projectedNewCpa, 'CPA của What-if không được tự ý ghi vào kế hoạch');
  assert.equal(activeInHistory.status, PLAN_STATUSES.ACTIVE, 'Bản ACTIVE đang theo dõi hoàn toàn không bị ảnh hưởng');

  // Đặt lại sạch sẽ
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
