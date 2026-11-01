/**
 * Các API còn lại được nối vào FE: đăng ký, cập nhật hồ sơ, chứng chỉ, phiên nhập bảng điểm, lịch sử hội thoại.
 * Kiểm tra client gọi đúng method + path + body (không dùng mock adapter).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createApiClient } from '../src/services/apiClient.js';
import { DEFAULT_CURRICULUM_ID, registerStudent } from '../src/services/academicStore.js';

function liveClient(responses = {}) {
  const calls = [];
  const client = createApiClient({
    mockEnabled: false,
    baseURL: '/api/v1',
    csrfToken: 'csrf-test',
    fetchImpl: async (url, init) => {
      const key = `${init.method} ${url}`;
      calls.push({ key, body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers });
      const payload = responses[key] ?? {};
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => payload,
        text: async () => JSON.stringify(payload)
      };
    }
  });
  return { client, calls };
}

test('auth.register gửi nguyên studentId (là thông tin xác thực, không bị lọc)', async () => {
  const { client, calls } = liveClient();
  await client.auth.register({ studentId: '2024610001', password: 'matkhau-123' });
  assert.equal(calls[0].key, 'POST /api/v1/auth/register');
  assert.equal(calls[0].body.studentId, '2024610001');
  assert.equal(calls[0].headers['X-XSRF-TOKEN'], 'csrf-test');
});

test('registerStudent: lấy CSRF, đăng ký đúng contract rồi đồng bộ phiên', async () => {
  const { client, calls } = liveClient({
    'GET /api/v1/auth/session': { authenticated: true, studentId: '2024610001', role: 'STUDENT' },
    'GET /api/v1/students/me': { studentId: '2024610001', fullName: 'Nguyễn Thu Hà', transcriptStatus: 'NONE' }
  });

  const result = await registerStudent(
    { studentId: ' 2024610001 ', password: ' giu nguyen ', fullName: ' Nguyễn Thu Hà ', email: ' ha@example.com ', className: '  ', cohort: 'K19' },
    client
  );

  assert.deepEqual(calls.map((c) => c.key), [
    'GET /api/v1/auth/csrf',
    'POST /api/v1/auth/register',
    'GET /api/v1/auth/session',
    'GET /api/v1/students/me'
  ]);
  assert.deepEqual(calls[1].body, {
    studentId: '2024610001',
    password: ' giu nguyen ',
    fullName: 'Nguyễn Thu Hà',
    email: 'ha@example.com',
    className: null,
    cohort: 'K19',
    curriculumId: DEFAULT_CURRICULUM_ID
  });
  assert.equal(result.authenticated, true);
  assert.equal(result.student.hasTranscript, false);
});

test('registerStudent: lỗi từ server (trùng mã sinh viên) được ném ra, không đồng bộ phiên', async () => {
  const calls = [];
  const client = createApiClient({
    mockEnabled: false,
    fetchImpl: async (url, init) => {
      calls.push(`${init.method} ${url}`);
      if (url.endsWith('/auth/register')) {
        const payload = { code: 'ACCOUNT_ALREADY_EXISTS', message: 'Mã sinh viên này đã có tài khoản.' };
        return {
          ok: false,
          status: 409,
          headers: { get: () => 'application/json' },
          json: async () => payload,
          text: async () => JSON.stringify(payload)
        };
      }
      return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}), text: async () => '{}' };
    }
  });

  await assert.rejects(
    registerStudent({ studentId: '2024604757', password: 'matkhau-123', fullName: 'A', email: 'a@b.vn', cohort: 'K19' }, client),
    (err) => err.code === 'ACCOUNT_ALREADY_EXISTS' && err.message === 'Mã sinh viên này đã có tài khoản.'
  );
  assert.ok(!calls.some((c) => c.endsWith('/auth/session')));
});

test('Hồ sơ và chứng chỉ gọi đúng endpoint', async () => {
  const { client, calls } = liveClient();
  await client.academic.updateProfile({ fullName: 'A', dataRevision: 'REV-1' });
  await client.academic.listCertificates();
  await client.academic.declareCertificate('IT_SKILLS', { status: 'ACHIEVED', dataRevision: 'REV-1' });

  assert.deepEqual(calls.map((c) => c.key), [
    'PUT /api/v1/students/me',
    'GET /api/v1/academic/certificates',
    'PUT /api/v1/academic/certificates/IT_SKILLS'
  ]);
  assert.equal(calls[2].body.status, 'ACHIEVED');
});

test('Phiên nhập bảng điểm: danh sách và hủy', async () => {
  const { client, calls } = liveClient();
  await client.academic.listImportSessions();
  await client.academic.cancelImport('imp/1');

  assert.deepEqual(calls.map((c) => c.key), [
    'GET /api/v1/academic/transcript/imports',
    'POST /api/v1/academic/transcript/imports/imp%2F1/cancel'
  ]);
});

test('Lịch sử hội thoại: danh sách và chi tiết', async () => {
  const { client, calls } = liveClient();
  await client.advisor.listConversations();
  await client.advisor.getConversation('c-1');

  assert.deepEqual(calls.map((c) => c.key), [
    'GET /api/v1/advisor/conversations',
    'GET /api/v1/advisor/conversations/c-1'
  ]);
});
