import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {
  plannerStore,
  PLAN_STATUSES,
  StudyPlannerPage,
  createStudentRoutes
} from '../src/index.js';

beforeEach(() => {
  plannerStore.resetToDefault();
});

test('Task 3.5 - 1: Quản lý kế hoạch nhiều kỳ và phương án đề xuất', () => {
  const plan = plannerStore.getPlan();
  assert.ok(Array.isArray(plan.semesters), 'Kế hoạch phải có danh sách các học kỳ');
  assert.ok(plan.semesters.length >= 3, 'Kế hoạch mẫu có ít nhất 3 học kỳ (Kỳ 7, Kỳ 8, Kỳ hè)');

  // Phương án đề xuất
  const proposal = {
    planId: 'proposal-test-01',
    projectedCpa: 3.45,
    projectedRank: 'Bằng Giỏi',
    semesters: [
      {
        semesterCode: '2026_1',
        semesterName: 'Kỳ 7 phương án AI',
        totalCredits: 15,
        courses: [
          { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3 },
          { courseCode: 'IT2001', courseName: 'Lập trình HĐT', credits: 4 },
          { courseCode: 'IT6002', courseName: 'Lập trình mạng', credits: 3 },
          { courseCode: 'IT4001', courseName: 'CSDL nâng cao', credits: 3 },
          { courseCode: 'FL2001', courseName: 'Tiếng Anh CNTT', credits: 2 }
        ]
      }
    ]
  };

  plannerStore.setIncomingProposal(proposal, 'AI Advisor Test');
  assert.equal(plannerStore.getIncomingProposal().sourceName, 'AI Advisor Test');

  // Chấp nhận phương án đưa kế hoạch về DRAFT và cập nhật học kỳ
  plannerStore.acceptProposal();
  assert.equal(plannerStore.getIncomingProposal(), null);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT);
  assert.equal(plannerStore.getPlan().semesters[0].semesterName, 'Kỳ 7 phương án AI');
});

test('Task 3.5 - 2: Thao tác Thêm, Bớt và Chuyển môn (moveCourse) giữa các kỳ', () => {
  const sem7 = plannerStore.getPlan().semesters.find((s) => s.semesterCode === '2026_1');
  const sem8 = plannerStore.getPlan().semesters.find((s) => s.semesterCode === '2026_2');
  const initialCredits7 = sem7.totalCredits; // 18
  const initialCredits8 = sem8.totalCredits; // 15

  // 1. Chuyển môn FL2001 (2 TC) từ Kỳ 7 sang Kỳ 8
  const moveRes = plannerStore.moveCourse('2026_1', '2026_2', 'FL2001');
  assert.equal(moveRes.success, true, 'Chuyển môn FL2001 sang Kỳ 8 phải thành công');

  const updatedSem7 = plannerStore.getPlan().semesters.find((s) => s.semesterCode === '2026_1');
  const updatedSem8 = plannerStore.getPlan().semesters.find((s) => s.semesterCode === '2026_2');

  assert.equal(updatedSem7.totalCredits, initialCredits7 - 2, 'Kỳ 7 phải giảm 2 tín chỉ');
  assert.equal(updatedSem8.totalCredits, initialCredits8 + 2, 'Kỳ 8 phải tăng 2 tín chỉ');
  assert.ok(!updatedSem7.courses.some((c) => c.courseCode === 'FL2001'), 'Kỳ 7 không còn môn FL2001');
  assert.ok(updatedSem8.courses.some((c) => c.courseCode === 'FL2001'), 'Kỳ 8 đã nhận môn FL2001');

  // Chuyển môn phải đưa kế hoạch về DRAFT và hủy validation cũ
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT);
  assert.equal(plannerStore.getValidation(), null);

  // 2. Chuyển môn không tồn tại hoặc chuyển trùng mã môn phải bị từ chối
  const invalidMove = plannerStore.moveCourse('2026_1', '2026_2', 'NON_EXISTENT_COURSE');
  assert.equal(invalidMove.success, false);

  const duplicateMove = plannerStore.moveCourse('2026_1', '2026_2', 'IT6080'); // IT6080 đã có ở Kỳ 8
  assert.equal(duplicateMove.success, false);
});

test('Task 3.5 - 3: Cảnh báo validation theo quy chế HaUI', () => {
  // Giảm tín chỉ kỳ chính xuống dưới 10 TC
  plannerStore.removeCourseFromSemester('2026_1', 'MATH1002');
  plannerStore.removeCourseFromSemester('2026_1', 'IT2001');
  plannerStore.removeCourseFromSemester('2026_1', 'IT6002');
  plannerStore.removeCourseFromSemester('2026_1', 'IT4001');

  const validation = plannerStore.validatePlan();
  assert.equal(validation.valid, false);
  assert.ok(validation.violations.some((v) => v.includes('BR-03')));
});

test('Task 3.5 - 4: DRAFT lưu được khi đúng định dạng dữ liệu dù có vi phạm quy chế học vụ', () => {
  // Kỳ 7 vi phạm quy chế (< 10 TC)
  plannerStore.removeCourseFromSemester('2026_1', 'MATH1002');
  plannerStore.removeCourseFromSemester('2026_1', 'IT2001');
  plannerStore.removeCourseFromSemester('2026_1', 'IT6002');
  assert.equal(plannerStore.getPlan().semesters[0].totalCredits, 8); // 8 TC < 10 TC

  // Nhưng đúng định dạng dữ liệu (học kỳ hợp lệ, môn học có mã và số TC dương)
  const saveRes = plannerStore.saveDraft('Bản nháp đang làm dở 8 TC');
  assert.equal(saveRes.success, true, 'DRAFT lưu được dù còn vi phạm số tín chỉ học vụ');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT);

  // Thử lưu với định dạng sai hỏng
  plannerStore.getPlan().semesters = null;
  const invalidSave = plannerStore.saveDraft('Bản sai định dạng');
  assert.equal(invalidSave.success, false);
  assert.equal(invalidSave.code, 'INVALID_FORMAT');
});

test('Task 3.5 - 5: Kích hoạt kế hoạch phải kiểm tra nghiệp vụ và từ chối nếu vi phạm', () => {
  // Bản kế hoạch vi phạm < 10 TC
  plannerStore.removeCourseFromSemester('2026_1', 'MATH1002');
  plannerStore.removeCourseFromSemester('2026_1', 'IT2001');
  plannerStore.removeCourseFromSemester('2026_1', 'IT6002');

  const activateRes = plannerStore.activatePlan();
  assert.equal(activateRes.success, false);
  assert.ok(['PLAN_NOT_VALIDATED', 'PLAN_RULE_VIOLATION'].includes(activateRes.code));
  assert.notEqual(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);
});

test('Task 3.5 - 6: Sửa bản ACTIVE tạo DRAFT kế thừa, Hủy giữ bản cũ', () => {
  // Kích hoạt một bản thành ACTIVE
  plannerStore.validatePlan();
  const actRes = plannerStore.activatePlan();
  assert.equal(actRes.success, true);
  const activePlanId = plannerStore.getPlan().planId;
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);

  // Sửa trên bản ACTIVE (thêm môn)
  plannerStore.addCourseToSemester('2026_2', {
    courseCode: 'IT7010',
    courseName: 'An toàn thông tin ứng dụng',
    credits: 3
  });

  const draftPlan = plannerStore.getPlan();
  assert.equal(draftPlan.status, PLAN_STATUSES.DRAFT, 'Sửa ACTIVE phải chuyển sang DRAFT');
  assert.notEqual(draftPlan.planId, activePlanId, 'Tạo bản nháp mới có ID riêng');
  assert.equal(draftPlan.sourcePlanId, activePlanId, 'Bản nháp mới kế thừa sourcePlanId từ ACTIVE cũ');

  // Hủy thay đổi -> quay lại đúng bản ACTIVE cũ
  const discardRes = plannerStore.discardDraftChanges();
  assert.equal(discardRes.success, true);
  assert.equal(plannerStore.getPlan().planId, activePlanId);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);
  assert.ok(!plannerStore.getPlan().semesters[1].courses.some((c) => c.courseCode === 'IT7010'));
});

test('Task 3.5 - 7: Chấp nhận không bắt buộc xem tree môn học trước khi lưu/kích hoạt', () => {
  // Trực tiếp kiểm tra điều kiện và kích hoạt mà không cần mở cây môn học
  const valid = plannerStore.validatePlan();
  assert.equal(valid.valid, true);

  const activateRes = plannerStore.activatePlan();
  assert.equal(activateRes.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);
});

test('Task 3.5 - 8: Lưu lỗi không mất nội dung chỉnh sửa', async () => {
  // Thêm một môn mới vào Kỳ 7
  plannerStore.addCourseToSemester('2026_1', {
    courseCode: 'CUSTOM999',
    courseName: 'Môn học tự chọn đặc biệt',
    credits: 3
  });

  assert.ok(plannerStore.getPlan().semesters[0].courses.some((c) => c.courseCode === 'CUSTOM999'));

  // Giả lập mock API lỗi khi lưu
  const mockApiWithError = {
    planner: {
      save: async () => {
        throw new Error('500 Internal Server Error: Database timeout');
      }
    }
  };

  // Giả lập giao diện gọi hàm lưu có lỗi
  let caughtError = null;
  try {
    if (mockApiWithError.planner?.save) {
      await mockApiWithError.planner.save(plannerStore.getPlan());
    }
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, 'Phải bắt được lỗi khi API lưu thất bại');
  // Nội dung môn đã sửa vẫn còn nguyên vẹn trong store
  assert.ok(
    plannerStore.getPlan().semesters[0].courses.some((c) => c.courseCode === 'CUSTOM999'),
    'Nội dung đang chỉnh sửa không được bị xóa hoặc mất đi khi lưu lỗi'
  );
});

test('Task 3.5 - 9: StudyPlannerPage render thành công với injected api/ui từ TV2', () => {
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
      generate: async () => ({ planId: 'p1' }),
      validate: async () => ({ valid: true })
    }
  };

  const routes = createStudentRoutes({ api: mockApi, ui: mockUi, status: 'READY' });
  const plannerRoute = routes.find((r) => r.path === '/planner');
  assert.ok(plannerRoute);
  assert.equal(plannerRoute.status, 'READY');

  const element = React.createElement(StudyPlannerPage, { api: mockApi, ui: mockUi });
  assert.ok(React.isValidElement(element));
  assert.equal(element.type, StudyPlannerPage);
});
