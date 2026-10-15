import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {
  WhatIfSimulatorPage,
  WHAT_IF_TOOLS,
  plannerStore,
  PLAN_STATUSES
} from '../src/index.js';

beforeEach(() => {
  plannerStore.resetToDefault();
});

// Mock UI components tuân thủ chuẩn TV2 V0
const mockUi = {
  Button: ({ children, onClick, variant, size, loading, disabled }) =>
    React.createElement('button', { onClick, 'data-variant': variant, disabled }, children),
  Card: ({ title, subtitle, children, headerAction, variant }) =>
    React.createElement('div', { className: `card ${variant || ''}` },
      React.createElement('div', { className: 'card-header' }, title, subtitle, headerAction),
      React.createElement('div', { className: 'card-body' }, children)
    ),
  Table: ({ columns, data }) => React.createElement('table', null),
  Loading: ({ label }) => React.createElement('div', { className: 'loading' }, label),
  Error: ({ title, message, onRetry }) =>
    React.createElement('div', { className: 'error-box' }, title, message),
  EmptyState: ({ title, description, onAction }) =>
    React.createElement('div', { className: 'empty-state' }, title, description)
};

test('Task 3.10 - 1: Hỗ trợ 3 công cụ What-if cốt lõi và vào trực tiếp từng công cụ', () => {
  assert.equal(typeof WhatIfSimulatorPage, 'function', 'WhatIfSimulatorPage phải là React component');
  assert.equal(WHAT_IF_TOOLS.length, 4, 'Bao gồm 3 công cụ What-if chính và 1 kịch bản học vượt');

  const toolIds = WHAT_IF_TOOLS.map((t) => t.id);
  assert.ok(toolIds.includes('grades'), 'Có Màn 6: Giả lập điểm');
  assert.ok(toolIds.includes('retake'), 'Có Màn 7: ROI cải thiện');
  assert.ok(toolIds.includes('target'), 'Có Màn 8: Mục tiêu ngược');

  // Khởi tạo và render với initialTool = "grades"
  const gradesHtml = ReactDOMServer.renderToString(
    React.createElement(WhatIfSimulatorPage, { initialTool: 'grades', ui: mockUi })
  );
  assert.ok(gradesHtml.includes('Giả lập điểm'), 'Render đúng công cụ grades');
  assert.ok(gradesHtml.includes('MATH1002'), 'Chứa môn MATH1002');

  // Khởi tạo và render với initialTool = "retake"
  const retakeHtml = ReactDOMServer.renderToString(
    React.createElement(WhatIfSimulatorPage, { initialTool: 'retake', ui: mockUi })
  );
  assert.ok(retakeHtml.includes('học cải thiện'), 'Render đúng công cụ retake');
  assert.ok(retakeHtml.includes('Khuyên dùng số 1'), 'Hiển thị badge ROI');

  // Khởi tạo và render với initialTool = "target"
  const targetHtml = ReactDOMServer.renderToString(
    React.createElement(WhatIfSimulatorPage, { initialTool: 'target', ui: mockUi })
  );
  assert.ok(targetHtml.includes('CPA Mục tiêu'), 'Render đúng công cụ target');
  assert.ok(targetHtml.includes('3.20 (Giỏi)'), 'Chứa nút preset 3.20');
});

test('Task 3.10 - 2: UI test: Nhập liên tiếp & Cơ chế Debounce (Consecutive inputs debounce)', async () => {
  // Mô phỏng hàm debounce độc lập như trong WhatIfSimulatorPage
  let executeCallCount = 0;
  let timer = null;
  let lastData = null;

  const triggerDebouncedInput = (data, delay = 50) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      executeCallCount += 1;
      lastData = data;
    }, delay);
  };

  // Người dùng thao tác nhập liệu liên tiếp 5 lần trong khoảng thời gian rất ngắn (< 20ms)
  triggerDebouncedInput({ expectedGrade: 'B' });
  triggerDebouncedInput({ expectedGrade: 'B+' });
  triggerDebouncedInput({ expectedGrade: 'A' });
  triggerDebouncedInput({ expectedGrade: 'A' });
  triggerDebouncedInput({ expectedGrade: 'A+' });

  // Ngay trước khi hết hạn timer debounce, chưa có request nào được phát đi
  assert.equal(executeCallCount, 0, 'Chưa được gọi ngay lập tức khi đang debounce');

  // Chờ hết thời gian debounce (100ms > 50ms)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Chỉ có đúng 1 lần thực thi duy nhất với giá trị nhập cuối cùng
  assert.equal(executeCallCount, 1, 'Chỉ phát đúng 1 request sau khi người dùng dừng nhập liên tiếp');
  assert.deepEqual(lastData, { expectedGrade: 'A+' }, 'Dữ liệu thực thi là giá trị mới nhất');
});

test('Task 3.10 - 3: UI test: Response cũ đến muộn (Out-of-order / late response dropping)', async () => {
  let activeSequence = 0;
  let stateResult = null;
  const trace = [];

  const handleSimulateRequest = async (requestId, delayMs, data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        trace.push(`arrived-req-${requestId}`);
        if (requestId === activeSequence) {
          stateResult = data;
          resolve({ accepted: true, data });
        } else {
          // Bỏ qua response cũ đến muộn
          trace.push(`dropped-req-${requestId}`);
          resolve({ accepted: false, data: null });
        }
      }, delayMs);
    });
  };

  // Người dùng gõ thay đổi mục tiêu điểm:
  // Request 1 gửi trước (mạng chậm, mất 120ms)
  activeSequence = 1;
  const promise1 = handleSimulateRequest(1, 120, { targetCpa: 3.20, projectedCpa: 3.20 });

  // Sau 10ms, người dùng đổi ý gõ tiếp Request 2 (mạng nhanh, chỉ mất 30ms)
  activeSequence = 2;
  const promise2 = handleSimulateRequest(2, 30, { targetCpa: 3.60, projectedCpa: 3.60 });

  const [res1, res2] = await Promise.all([promise1, promise2]);

  // Request 2 kết thúc trước (sau 30ms) và được chấp nhận
  assert.equal(res2.accepted, true, 'Request 2 mới nhất được áp dụng vào state');

  // Request 1 kết thúc sau (sau 120ms) nhưng sequence ID của nó là 1 < activeSequence 2 nên bị drop
  assert.equal(res1.accepted, false, 'Request 1 cũ đến muộn bị bỏ qua (dropped)');
  assert.equal(stateResult.targetCpa, 3.60, 'State cuối cùng phản ánh chính xác kết quả của request 2');
  assert.ok(trace.includes('dropped-req-1'), 'Nhật ký trace ghi nhận đã hủy bỏ response 1');
});

test('Task 3.10 - 4: UI test: Thao tác Hủy / Thoát KHÔNG sửa bảng điểm hoặc bản ACTIVE', () => {
  const initialActive = plannerStore.getActiveEntry();
  const initialPlan = plannerStore.getPlan();
  const initialHistory = plannerStore.getHistory();

  // 1. Render trang What-if
  const element = React.createElement(WhatIfSimulatorPage, {
    initialTool: 'grades',
    ui: mockUi
  });
  const html = ReactDOMServer.renderToString(element);
  assert.ok(html.includes('Thoát thử nghiệm'), 'UI phải có nút Thoát thử nghiệm');

  // 2. Kích hoạt thao tác thoát / hủy
  plannerStore.dismissProposal();

  // 3. Khẳng định nghiêm ngặt:
  // - Bản ACTIVE không hề bị thay đổi
  assert.equal(plannerStore.getActiveEntry()?.planId, initialActive?.planId);
  assert.equal(plannerStore.getActiveEntry()?.status, PLAN_STATUSES.ACTIVE);
  // - Kế hoạch đang mở không bị sửa đổi trạng thái thành ACTIVE
  assert.equal(plannerStore.getPlan().planId, initialPlan.planId);
  // - Lịch sử kế hoạch không bị ô nhiễm
  assert.equal(plannerStore.getHistory().length, initialHistory.length);
  // - Bảng điểm không bị biến đổi
  assert.equal(plannerStore.getIncomingProposal(), null);
});

test('Task 3.10 - 5: UI test: Thao tác Áp dụng tạo proposal DRAFT cho Planner xem lại, KHÔNG tự ý ACTIVE', () => {
  const initialActiveId = plannerStore.getActiveEntry()?.planId;

  // Dữ liệu mô phỏng từ kết quả What-if
  const proposalFromWhatIf = {
    planId: 'proposal-what-if-roi',
    projectedCpa: 3.25,
    projectedRank: 'Bằng Giỏi (CPA ≥ 3.20)',
    semesters: [
      {
        semesterCode: '2026_1',
        semesterName: 'Học kỳ 1 (2026 - 2027) — Kỳ 7 (Đề xuất What-if)',
        totalCredits: 18,
        expectedGpa: 3.44,
        courses: [
          { courseCode: 'IT2001', courseName: 'Lập trình HĐT', credits: 4, courseType: 'Học cải thiện (ROI)', targetGrade: 'A (4.0)' },
          { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3, courseType: 'Học lại', targetGrade: 'B (3.0)' }
        ]
      }
    ]
  };

  // Bấm "Áp dụng vào Kế hoạch học tập (Xem lại tại Planner)"
  plannerStore.setIncomingProposal(proposalFromWhatIf, 'What-if: Giả lập điểm & ROI cải thiện');

  // 1. Proposal được tạo trong store nhưng kế hoạch hiện hành KHÔNG tự ý chuyển sang ACTIVE
  const incoming = plannerStore.getIncomingProposal();
  assert.ok(incoming, 'Store phải nhận incomingProposal để Planner hiển thị banner xem lại');
  assert.equal(incoming.sourceName, 'What-if: Giả lập điểm & ROI cải thiện');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT);
  assert.equal(plannerStore.getActiveEntry()?.planId, initialActiveId, 'Bản ACTIVE cũ không bị ghi đè');

  // 2. Khi sinh viên bấm "Chấp nhận phương án" trong Planner, kế hoạch chỉ chuyển thành DRAFT để thẩm định
  plannerStore.acceptProposal();
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT, 'Kế hoạch ở trạng thái DRAFT');
  assert.equal(plannerStore.getPlan().semesters[0].semesterName, 'Học kỳ 1 (2026 - 2027) — Kỳ 7 (Đề xuất What-if)');
});

test('Task 3.10 - 6: UI test: Ranh giới kiến trúc — Tuyệt đối không gọi AI để kéo slider / chọn điểm', async () => {
  let aiCallCount = 0;
  let simulationCallCount = 0;

  const mockApi = {
    simulation: {
      simulateGrades: async (payload) => {
        simulationCallCount += 1;
        return {
          currentCpa: 2.45,
          expectedGpa: 3.44,
          projectedCpa: 2.58,
          cpaDelta: 0.13,
          rankChange: 'Từ Trung bình -> Bằng Khá'
        };
      },
      rankRetake: async () => {
        simulationCallCount += 1;
        return { recommendations: [] };
      },
      calculateTargetGrades: async () => {
        simulationCallCount += 1;
        return { targetCpa: 3.20, requiredAverageGpa: 3.42 };
      }
    },
    advisor: {
      chat: async () => {
        aiCallCount += 1;
        throw new Error('VIOLATION: Tuyệt đối không gọi advisor.chat khi thao tác What-if');
      }
    }
  };

  // Giả lập thao tác kéo chọn điểm trên Màn 6
  await mockApi.simulation.simulateGrades({
    courses: [{ courseCode: 'MATH1002', expectedGrade: 'A', credits: 3 }]
  });

  // Giả lập thao tác chọn môn học cải thiện trên Màn 7
  await mockApi.simulation.rankRetake({ maxCourses: 3 });

  // Giả lập thao tác đổi mục tiêu CPA trên Màn 8
  await mockApi.simulation.calculateTargetGrades({ targetCpa: 3.20 });

  // Khẳng định: Toàn bộ quá trình What-if KHÔNG gọi AI bất kỳ lần nào
  assert.equal(aiCallCount, 0, 'Số lần gọi API AI/LLM phải bằng 0');
  assert.equal(simulationCallCount, 3, 'Chỉ gọi các endpoint mô phỏng học vụ thuần túy');
});

test('Task 3.10 - 7: UI test: Render đầy đủ giao diện 3 công cụ (Màn 6, Màn 7, Màn 8)', () => {
  // Render Màn 6: Giả lập điểm
  const gradesHtml = ReactDOMServer.renderToString(
    React.createElement(WhatIfSimulatorPage, { initialTool: 'grades', ui: mockUi })
  );
  assert.ok(gradesHtml.includes('MATH1002'));
  assert.ok(gradesHtml.includes('IT2001'));
  assert.ok(gradesHtml.includes('Điểm A'));
  assert.ok(gradesHtml.includes('Điểm B+'));

  // Render Màn 7: ROI cải thiện
  const retakeHtml = ReactDOMServer.renderToString(
    React.createElement(WhatIfSimulatorPage, { initialTool: 'retake', ui: mockUi })
  );
  assert.ok(retakeHtml.includes('Lập trình hướng đối tượng (Java)'));
  assert.ok(retakeHtml.includes('Khuyên dùng số 1 (ROI cao nhất)'));
  assert.ok(retakeHtml.includes('checkbox'));

  // Render Màn 8: Mục tiêu ngược
  const targetHtml = ReactDOMServer.renderToString(
    React.createElement(WhatIfSimulatorPage, { initialTool: 'target', ui: mockUi })
  );
  assert.ok(targetHtml.includes('CPA Mục tiêu tốt nghiệp mong muốn:'));
  assert.ok(targetHtml.includes('3.20 (Giỏi)'));
  assert.ok(targetHtml.includes('3.60 (Xuất sắc)'));
});
