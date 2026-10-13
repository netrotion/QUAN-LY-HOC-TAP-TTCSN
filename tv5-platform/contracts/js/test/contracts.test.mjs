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
  assert.equal(CONTRACT_VERSION, '1.2.0');
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
