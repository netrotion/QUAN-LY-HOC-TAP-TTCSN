import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTRACT_MILESTONE,
  CONTRACT_VERSION,
  DEMO_STUDENT,
  ENUMS,
  FIXTURES,
  OPERATIONS,
  findFixture,
  getFixture,
  operationFor,
} from '../index.js';

test('phát hành đúng mốc contracts-v1', () => {
  assert.equal(CONTRACT_MILESTONE, 'contracts-v1');
  assert.equal(CONTRACT_VERSION, '1.5.0');
  assert.equal(DEMO_STUDENT.studentId, '2024604757');
});

test('mọi fixture trỏ tới operation có trong OpenAPI', () => {
  for (const [id, fixture] of Object.entries(FIXTURES)) {
    const operation = OPERATIONS[fixture.operationId];
    assert.ok(operation, `${id}: thiếu operation ${fixture.operationId}`);
    assert.equal(operation.method, fixture.method, id);
    assert.equal(operation.path, fixture.path, id);
  }
});

test('findFixture khớp path cụ thể với path template và phân biệt mã lỗi', () => {
  const ok = findFixture('post', '/planner/plans/plan-2024604757-0003/activate');
  assert.equal(ok.httpStatus, 200);
  assert.equal(ok.response.status, 'ACTIVE');

  const notValidated = findFixture('POST', '/planner/plans/x/activate', { httpStatus: 422 });
  assert.ok(['PLAN_NOT_VALIDATED', 'PLAN_VALIDATION_FAILED'].includes(notValidated.response.code));

  assert.equal(findFixture('GET', '/planner/plans').response.plans.length, 3);
  assert.equal(findFixture('GET', '/khong-ton-tai'), null);
});

test('getFixture trả bản sao, sửa không ảnh hưởng lần sau', () => {
  getFixture('get-study-plan').response.semesters.length = 0;
  assert.ok(getFixture('get-study-plan').response.semesters.length > 0);
});

test('request FE không chứa trường thuộc server (studentId) cho các thao tác planner', () => {
  for (const id of ['save-study-plan', 'activate-study-plan', 'restore-study-plan']) {
    assert.equal(getFixture(id).request.studentId, undefined, id);
  }
});

test('enum và operation dùng cho FE', () => {
  assert.deepEqual(ENUMS.StudyPlanStatus, ['DRAFT', 'VALIDATED', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);
  assert.ok(ENUMS.ApiErrorCode.includes('PLAN_NOT_VALIDATED'));
  assert.deepEqual(operationFor('activateStudyPlan'), { method: 'POST', path: '/planner/plans/{planId}/activate' });
});

test('kết quả học vụ (1.3.0) mang dataRevision và policyVersion; cây CTĐT có trạng thái học phần', () => {
  for (const id of ['academic-status', 'course-eligibility', 'graduation-audit', 'curriculum', 'curriculum-tree']) {
    const { response } = getFixture(id);
    assert.ok(response.dataRevision, `${id}: thiếu dataRevision`);
    assert.ok(response.policyVersion, `${id}: thiếu policyVersion`);
  }
  const tree = findFixture('GET', '/academic/curriculum/tree');
  assert.equal(tree.operationId, 'getCurriculumTree');
  assert.ok(tree.response.courses.every((c) => ENUMS.CourseProgressStatus.includes(c.status)));
  assert.deepEqual(ENUMS.CourseProgressStatus, ['PASSED', 'FAILED', 'IN_PROGRESS', 'ELIGIBLE', 'BLOCKED', 'UNKNOWN']);
});

test('planner (1.4.0): phương án sinh ra là DRAFT kèm dataRevision/policyVersion; generate không còn 501', () => {
  const proposal = findFixture('POST', '/planner/generate');
  assert.equal(proposal.httpStatus, 200);
  assert.equal(proposal.response.status, 'DRAFT');
  assert.ok(proposal.response.dataRevision);
  assert.ok(proposal.response.policyVersion);
  assert.equal(findFixture('POST', '/planner/generate', { httpStatus: 501 }), null);
  assert.ok(getFixture('get-study-plan').response.policyVersion, 'chi tiết kế hoạch đã thẩm định ghi quy chế đã dùng');
});

test('What-if, đối chiếu và Chat (1.5.0): kết quả kèm policyVersion; AI không trả lời được là lỗi thử lại được', () => {
  for (const [method, path] of [['POST', '/simulation/grades'], ['POST', '/simulation/retake-ranking'],
    ['POST', '/simulation/target-grades'], ['POST', '/planner/reconcile']]) {
    const fixture = findFixture(method, path);
    assert.ok(fixture.response.dataRevision, `${path}: thiếu dataRevision`);
    assert.ok(fixture.response.policyVersion, `${path}: thiếu policyVersion`);
  }
  const unavailable = findFixture('POST', '/advisor/chat', { httpStatus: 503 });
  assert.equal(unavailable.response.code, 'AI_UNAVAILABLE');
  assert.equal(unavailable.response.retryable, true);
  assert.ok(ENUMS.ApiErrorCode.includes('CONVERSATION_BUSY'));
  assert.ok(ENUMS.ApiErrorCode.includes('PLAN_NOT_ACTIVE'));
  assert.ok(Object.values(FIXTURES).every((f) => f.httpStatus !== 501), 'không còn operation trả 501');
});
