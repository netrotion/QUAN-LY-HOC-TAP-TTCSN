import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseSseStream, createChatStreamSession } from '../src/hooks/useChatStream.js';

describe('useChatStream & SSE Parser', () => {
  test('parseSseStream dispatches STATUS, CHUNK, CITATION, and DONE events correctly', async () => {
    const ssePayload = [
      'event: status\n',
      'data: {"eventType":"STATUS","phase":"PLANNING","message":"Đang kiểm tra tiến độ học vụ..."}\n\n',
      'event: chunk\n',
      'data: {"eventType":"CHUNK","text":"Chào "}\n\n',
      'event: chunk\n',
      'data: {"eventType":"CHUNK","text":"bạn!"}\n\n',
      'event: citation\n',
      'data: {"eventType":"CITATION","sources":[{"articleId":"REG-HAUI-01","articleNumber":"14"}]}\n\n',
      'event: done\n',
      'data: {"eventType":"DONE","text":"Chào bạn!","sources":[{"articleId":"REG-HAUI-01","articleNumber":"14"}]}\n\n'
    ].join('');

    const events = [];
    const chunks = [];
    let statusMsg = '';
    let completedDone = null;

    // Simulate ReadableStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(ssePayload));
        controller.close();
      }
    });

    await parseSseStream(stream, {
      onStatus: (evt) => {
        statusMsg = evt.message;
        events.push(evt);
      },
      onChunk: (text) => {
        chunks.push(text);
      },
      onCitation: (evt) => {
        events.push(evt);
      },
      onDone: (evt) => {
        completedDone = evt;
        events.push(evt);
      }
    });

    assert.equal(statusMsg, 'Đang kiểm tra tiến độ học vụ...');
    assert.deepEqual(chunks, ['Chào ', 'bạn!']);
    assert.equal(completedDone?.text, 'Chào bạn!');
    assert.equal(completedDone?.sources?.[0]?.articleId, 'REG-HAUI-01');
    assert.equal(events.length, 3); // status, citation, done
  });

  test('parseSseStream handles chunk boundaries across packets gracefully', async () => {
    const part1 = 'event: chunk\ndata: {"eventType":"CHUNK","te';
    const part2 = 'xt":"HaUI"}\n\nevent: done\ndata: {"eventType":"DONE","text":"HaUI"}\n\n';

    const chunks = [];
    let doneCalled = false;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(part1));
        controller.enqueue(encoder.encode(part2));
        controller.close();
      }
    });

    await parseSseStream(stream, {
      onChunk: (text) => chunks.push(text),
      onDone: () => { doneCalled = true; }
    });

    assert.deepEqual(chunks, ['HaUI']);
    assert.ok(doneCalled);
  });

  test('parseSseStream handles ERROR events and server-side errors', async () => {
    const ssePayload = 'event: error\ndata: {"eventType":"ERROR","code":"AI_UNAVAILABLE","message":"Model overloaded","retryable":true}\n\n';

    let caughtError = null;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(ssePayload));
        controller.close();
      }
    });

    await parseSseStream(stream, {
      onError: (err) => {
        caughtError = err;
      }
    });

    assert.ok(caughtError);
    assert.equal(caughtError.code, 'AI_UNAVAILABLE');
    assert.equal(caughtError.retryable, true);
  });

  test('createChatStreamSession configures fetch with credentials and headers and supports abort', async () => {
    let requestedUrl = '';
    let requestedOptions = {};

    const mockFetch = async (url, options) => {
      requestedUrl = url;
      requestedOptions = options;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('event: chunk\ndata: {"eventType":"CHUNK","text":"ok"}\n\n'));
          controller.close();
        }
      });
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: stream
      };
    };

    const session = createChatStreamSession({
      fetchFn: mockFetch,
      baseUrl: '/api/v1',
      csrfToken: 'test-csrf-token'
    });

    let receivedChunk = '';
    await session.send({
      conversationId: 'conv-test-1',
      message: 'Test message'
    }, {
      onChunk: (text) => { receivedChunk += text; }
    });

    assert.equal(requestedUrl, '/api/v1/advisor/chat/stream');
    assert.equal(requestedOptions.method, 'POST');
    assert.equal(requestedOptions.credentials, 'include');
    assert.equal(requestedOptions.headers['Accept'], 'text/event-stream');
    assert.equal(requestedOptions.headers['Content-Type'], 'application/json');
    assert.equal(requestedOptions.headers['X-XSRF-TOKEN'], 'test-csrf-token');
    assert.equal(receivedChunk, 'ok');
  });

  test('chatAdvisorStream delegates to api.advisor.chatStream when available', async () => {
    let streamCalled = false;
    let streamPayload = null;

    const mockApi = {
      advisor: {
        chatStream: async (payload, callbacks) => {
          streamCalled = true;
          streamPayload = payload;
          callbacks.onStatus?.({ message: 'Đang chuẩn bị...' });
          callbacks.onChunk?.('Dữ ');
          callbacks.onChunk?.('liệu');
          callbacks.onDone?.({ text: 'Dữ liệu', proposal: { proposalId: 'prop-1' } });
        }
      }
    };

    let fullText = '';
    let doneResult = null;
    let currentStatus = '';

    const { chatAdvisorStream } = await import('../src/services/plannerApiService.js');
    await chatAdvisorStream(mockApi, { conversationId: 'conv-1', message: 'Hello' }, {
      onStatus: (evt) => { currentStatus = evt.message; },
      onChunk: (chunk) => { fullText += chunk; },
      onDone: (evt) => { doneResult = evt; }
    });

    assert.ok(streamCalled);
    assert.equal(streamPayload.message, 'Hello');
    assert.equal(currentStatus, 'Đang chuẩn bị...');
    assert.equal(fullText, 'Dữ liệu');
    assert.equal(doneResult?.proposal?.proposalId, 'prop-1');
  });
});
