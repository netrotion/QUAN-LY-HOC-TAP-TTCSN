import test from 'node:test';
import assert from 'node:assert/strict';

import { conversationToMessages, getConversation, listConversations } from '../src/services/plannerApiService.js';
import { buildProfileUpdate, cohortLabel } from '../src/pages/StudentProfilePage.js';

test('conversationToMessages đọc đúng ChatMessageHistoryItem do module AI lưu', () => {
  const record = {
    conversationId: 'c-1',
    messagesJson: JSON.stringify([
      { role: 'user', content: 'Kỳ tới học gì?', timestamp: '2026-10-13T07:55:00Z' },
      {
        role: 'assistant',
        content: 'Nên học lại LP6004.',
        timestamp: '2026-10-13T07:56:10Z',
        sources: [{ title: 'Quy chế' }],
        warnings: ['W1']
      }
    ])
  };

  const [user, ai] = conversationToMessages(record, 'Lê Hùng');

  assert.equal(user.sender, 'user');
  assert.equal(user.senderName, 'Lê Hùng');
  assert.equal(user.text, 'Kỳ tới học gì?');
  assert.ok(user.timestamp);
  assert.equal(ai.sender, 'assistant');
  assert.equal(ai.text, 'Nên học lại LP6004.');
  assert.deepEqual(ai.sources, [{ title: 'Quy chế' }]);
  assert.deepEqual(ai.warnings, ['W1']);
  assert.notEqual(user.id, ai.id);
});

test('conversationToMessages không làm vỡ màn hình khi dữ liệu trống hoặc hỏng', () => {
  assert.deepEqual(conversationToMessages({ conversationId: 'c', messagesJson: null }), []);
  assert.deepEqual(conversationToMessages({ conversationId: 'c', messagesJson: '{hỏng' }), []);
  assert.deepEqual(conversationToMessages({ conversationId: 'c', messagesJson: '{"a":1}' }), []);
  assert.deepEqual(conversationToMessages(null), []);
});

test('listConversations/getConversation dùng api.advisor', async () => {
  const api = {
    advisor: {
      listConversations: async () => ({ conversations: [{ conversationId: 'c-1' }] }),
      getConversation: async (id) => ({ conversationId: id })
    }
  };
  assert.deepEqual(await listConversations(api), [{ conversationId: 'c-1' }]);
  assert.deepEqual(await getConversation(api, 'c-2'), { conversationId: 'c-2' });
});

test('buildProfileUpdate: khóa gửi dạng K19, trường trống là null (giữ nguyên), không đổi CTĐT', () => {
  assert.deepEqual(
    buildProfileUpdate({ fullName: ' Lê Hùng ', email: '', className: ' 2024DHKTPM02 ', cohort: 'K19 (2024 - 2028)', dataRevision: 'REV-1' }),
    { fullName: 'Lê Hùng', email: null, className: '2024DHKTPM02', cohort: 'K19', curriculumId: null, dataRevision: 'REV-1' }
  );
});

test('cohortLabel: đổi K19 thành nhãn của form, giữ nguyên giá trị lạ', () => {
  assert.equal(cohortLabel('K19'), 'K19 (2024 - 2028)');
  assert.equal(cohortLabel('K99'), 'K99');
  assert.equal(cohortLabel(null), '');
});
