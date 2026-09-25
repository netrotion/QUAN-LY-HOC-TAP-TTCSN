import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudentRoutes } from '@haui/planner-ui';

test('tv2-web can successfully import and call createStudentRoutes from @haui/planner-ui workspace', () => {
  const routes = createStudentRoutes({ api: {}, ui: {} });
  assert.ok(Array.isArray(routes));
  assert.ok(routes.length >= 1);
  assert.equal(routes[0].status, 'NOT_IMPLEMENTED');
});
