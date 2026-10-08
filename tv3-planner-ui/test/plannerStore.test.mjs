import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { plannerStore, PLAN_STATUSES } from '../src/index.js';

const findEntry = (planId) => plannerStore.getHistory().find((h) => h.planId === planId);
const activeEntries = () => plannerStore.getHistory().filter((h) => h.status === PLAN_STATUSES.ACTIVE);

beforeEach(() => {
  plannerStore.resetToDefault();
});

test('F23-005: không kích hoạt được khi kế hoạch còn ở DRAFT (chưa thẩm định)', () => {
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT);

  const res = plannerStore.activatePlan();
  assert.equal(res.success, false);
  assert.equal(res.code, 'PLAN_NOT_VALIDATED');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT);
  assert.equal(findEntry('plan-haui-2026-v2.3').status, PLAN_STATUSES.ACTIVE, 'Bản ACTIVE cũ phải giữ nguyên');
});

test('F23-005: kế hoạch vi phạm sàn 10 TC không thể đạt VALIDATED và không thể kích hoạt', () => {
  // Kỳ 7 còn 6 TC
  for (const code of ['MATH1002', 'IT2001', 'IT6002', 'FL2001']) {
    plannerStore.removeCourseFromSemester('2026_1', code);
  }
  assert.equal(plannerStore.getPlan().semesters[0].totalCredits, 6);

  const validation = plannerStore.validatePlan();
  assert.equal(validation.valid, false);
  assert.equal(validation.status, PLAN_STATUSES.DRAFT);
  assert.ok(validation.violations.some((v) => v.includes('BR-03')));

  const res = plannerStore.activatePlan();
  assert.equal(res.success, false);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT);
  assert.equal(activeEntries()[0].planId, 'plan-haui-2026-v2.3');
});

test('F23-005: DRAFT → VALIDATED → ACTIVE; chỉnh sửa sau thẩm định đưa về DRAFT và phải thẩm định lại', () => {
  assert.equal(plannerStore.validatePlan().status, PLAN_STATUSES.VALIDATED);
  assert.ok(plannerStore.getValidation());

  plannerStore.addCourseToSemester('2026_2', { courseCode: 'IT7010', courseName: 'An toàn thông tin', credits: 3 });
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT);
  assert.equal(plannerStore.getValidation(), null, 'Kết quả thẩm định cũ phải bị xóa khi sửa');
  assert.equal(plannerStore.activatePlan().code, 'PLAN_NOT_VALIDATED');

  assert.equal(plannerStore.validatePlan().valid, true);
  const res = plannerStore.activatePlan();
  assert.equal(res.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);
  assert.equal(activeEntries().length, 1);
  assert.equal(findEntry('plan-haui-2026-v2.3').status, PLAN_STATUSES.ARCHIVED);
});

test('F23-002: activatePlan(planId) kích hoạt đúng bản nháp được chọn trong lịch sử', () => {
  // Tạo bản nháp thứ 2 khác bản đang mở
  plannerStore.restorePlan('plan-haui-2026-v2.2');
  plannerStore.saveDraft('Bản nháp thứ hai');
  const draftId2 = plannerStore.getPlan().planId;

  // Mở lại bản v2.1 để bản đang mở trên Planner khác draftId2
  plannerStore.restorePlan('plan-haui-2026-v2.1');
  assert.notEqual(plannerStore.getPlan().planId, draftId2);

  const drafts = plannerStore.getHistory().filter((h) => h.status === PLAN_STATUSES.DRAFT);
  assert.ok(drafts.length >= 2, 'Cần ít nhất 2 bản DRAFT trong lịch sử');

  const res = plannerStore.activatePlan(draftId2);
  assert.equal(res.success, true);
  assert.equal(res.planId, draftId2);
  assert.equal(findEntry(draftId2).status, PLAN_STATUSES.ACTIVE);
  assert.equal(findEntry('plan-haui-2026-v2.4').status, PLAN_STATUSES.DRAFT, 'Bản nháp v2.4 không bị kích hoạt nhầm');
  assert.equal(activeEntries().length, 1);

  const plan = plannerStore.getPlan();
  assert.equal(plan.planId, draftId2);
  assert.equal(plan.semesters.length, 2);
  assert.equal(plan.semesters[0].totalCredits, 22, 'Phải nạp đúng dữ liệu bản v2.2 đã chọn');
});

test('F23-002: không kích hoạt trực tiếp bản ARCHIVED từ lịch sử', () => {
  const res = plannerStore.activatePlan('plan-haui-2026-v2.2');
  assert.equal(res.success, false);
  assert.equal(res.code, 'INVALID_TRANSITION');
  assert.equal(findEntry('plan-haui-2026-v2.2').status, PLAN_STATUSES.ARCHIVED);
  assert.equal(activeEntries()[0].planId, 'plan-haui-2026-v2.3');
});

test('F23-002: bản nháp trong lịch sử vi phạm quy chế bị từ chối, kế hoạch đang mở giữ nguyên', () => {
  plannerStore.restorePlan('plan-haui-2026-v2.1');
  plannerStore.removeCourseFromSemester('2026_1', 'MATH1002');
  plannerStore.removeCourseFromSemester('2026_1', 'IT2001');
  plannerStore.removeCourseFromSemester('2026_1', 'IT6002');
  plannerStore.saveDraft('Bản nháp vi phạm');
  const invalidDraftId = plannerStore.getPlan().planId;

  plannerStore.restorePlan('plan-haui-2026-v2.2');
  const openPlanId = plannerStore.getPlan().planId;

  const res = plannerStore.activatePlan(invalidDraftId);
  assert.equal(res.success, false);
  assert.equal(res.code, 'PLAN_RULE_VIOLATION');
  assert.equal(findEntry(invalidDraftId).status, PLAN_STATUSES.DRAFT);
  assert.equal(plannerStore.getPlan().planId, openPlanId);
});

test('F23-003: restorePlan nhân bản đúng học kỳ/môn học của bản được chọn, lịch sử giữ nguyên', () => {
  // v2.2: 2 kỳ, không có kỳ hè, Kỳ 7 có 22 TC
  let res = plannerStore.restorePlan('plan-haui-2026-v2.2');
  assert.equal(res.success, true);
  let plan = plannerStore.getPlan();
  assert.equal(plan.status, PLAN_STATUSES.DRAFT);
  assert.equal(plan.semesters.length, 2);
  assert.equal(plan.semesters[0].totalCredits, 22);
  assert.ok(plan.semesters[0].courses.some((c) => c.courseCode === 'IT6080'));
  assert.equal(plan.projectedCpa, 3.18);
  assert.notEqual(plan.planId, 'plan-haui-2026-v2.2');

  // v2.1: có kỳ hè và môn IT7001 thay cho IT6010
  res = plannerStore.restorePlan('plan-haui-2026-v2.1');
  assert.equal(res.success, true);
  plan = plannerStore.getPlan();
  const summer = plan.semesters.find((s) => s.semesterCode.includes('SUMMER'));
  assert.ok(summer, 'Bản khôi phục phải có kỳ hè');
  assert.ok(summer.courses.some((c) => c.courseCode === 'IT6099'));
  assert.ok(plan.semesters[0].courses.some((c) => c.courseCode === 'IT7001'));

  // Chỉnh sửa bản khôi phục không làm thay đổi bản ghi bất biến trong lịch sử
  plannerStore.removeCourseFromSemester('2026_1', 'IT7001');
  const archived = findEntry('plan-haui-2026-v2.1');
  assert.equal(archived.status, PLAN_STATUSES.ARCHIVED);
  assert.ok(archived.snapshot.semesters[0].courses.some((c) => c.courseCode === 'IT7001'));
});

test('F23-004: Hủy thay đổi sau khi kích hoạt quay về đúng bản ACTIVE, giữ nguyên lịch sử', () => {
  plannerStore.validatePlan();
  plannerStore.activatePlan();
  const activated = plannerStore.getPlan();
  const activatedId = activated.planId;
  const historyLength = plannerStore.getHistory().length;

  plannerStore.addCourseToSemester('2026_2', { courseCode: 'IT7010', courseName: 'An toàn thông tin', credits: 3 });
  const edited = plannerStore.getPlan();
  assert.equal(edited.status, PLAN_STATUSES.DRAFT);
  assert.notEqual(edited.planId, activatedId, 'Sửa trên bản ACTIVE phải tách thành bản nháp mới');
  assert.equal(findEntry(activatedId).status, PLAN_STATUSES.ACTIVE, 'Bản ACTIVE trong lịch sử không bị ghi đè');

  const res = plannerStore.discardDraftChanges();
  assert.equal(res.success, true);
  const restored = plannerStore.getPlan();
  assert.equal(restored.planId, activatedId);
  assert.equal(restored.status, PLAN_STATUSES.ACTIVE);
  assert.ok(!restored.semesters[1].courses.some((c) => c.courseCode === 'IT7010'));
  assert.equal(plannerStore.getHistory().length, historyLength, 'Lịch sử phải giữ nguyên');
  assert.equal(findEntry('plan-haui-2026-v2.3').status, PLAN_STATUSES.ARCHIVED);
});

test('F23-004: bản nháp tách từ bản ACTIVE được lưu riêng, không thay thế bản ACTIVE', () => {
  plannerStore.validatePlan();
  plannerStore.activatePlan();
  const activatedId = plannerStore.getPlan().planId;

  plannerStore.removeCourseFromSemester('2026_1', 'FL2001');
  const saveRes = plannerStore.saveDraft();
  assert.equal(saveRes.success, true);

  const draftId = plannerStore.getPlan().planId;
  assert.equal(findEntry(draftId).status, PLAN_STATUSES.DRAFT);
  assert.equal(findEntry(activatedId).status, PLAN_STATUSES.ACTIVE);
  assert.equal(activeEntries().length, 1);
});
