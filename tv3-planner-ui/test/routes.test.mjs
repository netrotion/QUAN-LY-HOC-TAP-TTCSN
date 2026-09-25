import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudentRoutes, PACKAGE_INFO } from '../src/index.js';

test('createStudentRoutes returns an array of route definitions', () => {
  const mockApi = { get: () => {}, post: () => {} };
  const mockUi = { Button: () => null, Card: () => null };

  const routes = createStudentRoutes({ api: mockApi, ui: mockUi });
  assert.ok(Array.isArray(routes), 'createStudentRoutes must return an array');
  assert.equal(routes.length, 1);
  assert.equal(routes[0].path, '/planner/placeholder');
  assert.equal(routes[0].status, 'NOT_IMPLEMENTED');
});

test('PACKAGE_INFO has correct metadata', () => {
  assert.equal(PACKAGE_INFO.name, '@haui/planner-ui');
  assert.equal(PACKAGE_INFO.version, '0.0.1-v0');
});
