import { useState, useRef, useCallback } from 'react';

/**
 * Phân tích cú pháp luồng SSE (Server-Sent Events) từ ReadableStream
 * Hỗ trợ các dòng: event: <type>\n và data: <json>\n\n
 *
 * @param {ReadableStream} stream
 * @param {Object} callbacks
 * @param {Function} [callbacks.onStatus]
 * @param {Function} [callbacks.onToolCall]
 * @param {Function} [callbacks.onToolResult]
 * @param {Function} [callbacks.onCitation]
 * @param {Function} [callbacks.onChunk]
 * @param {Function} [callbacks.onDone]
 * @param {Function} [callbacks.onError]
 */
export async function parseSseStream(stream, callbacks = {}) {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Cắt các khối SSE phân tách bằng \n\n hoặc \r\n\r\n
      let boundaryIndex;
      while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1 || (boundaryIndex = buffer.indexOf('\r\n\r\n')) !== -1) {
        const isDoubleCrLf = buffer.slice(boundaryIndex, boundaryIndex + 4) === '\r\n\r\n';
        const delimiterLength = isDoubleCrLf ? 4 : 2;
        const block = buffer.slice(0, boundaryIndex).trim();
        buffer = buffer.slice(boundaryIndex + delimiterLength);

        if (!block) continue;

        let eventType = 'message';
        let dataStr = '';

        const lines = block.split(/\r?\n/);
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.slice(5).trim();
          }
        }

        if (dataStr) {
          let eventData = null;
          try {
            eventData = JSON.parse(dataStr);
          } catch (e) {
            eventData = { raw: dataStr };
          }

          const resolvedType = (eventData?.eventType || eventType || '').toUpperCase();

          switch (resolvedType) {
            case 'STATUS':
              callbacks.onStatus?.(eventData);
              break;
            case 'TOOL_CALL':
              callbacks.onToolCall?.(eventData);
              break;
            case 'TOOL_RESULT':
              callbacks.onToolResult?.(eventData);
              break;
            case 'CITATION':
              callbacks.onCitation?.(eventData);
              break;
            case 'CHUNK':
              callbacks.onChunk?.(eventData.text || eventData.chunkText || '');
              break;
            case 'DONE':
              callbacks.onDone?.(eventData);
              break;
            case 'ERROR':
              callbacks.onError?.(eventData);
              break;
            default:
              if (callbacks.onMessage) {
                callbacks.onMessage(eventData);
              }
              break;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Tạo một phiên gửi SSE với fetch và hỗ trợ AbortController
 */
export function createChatStreamSession({
  fetchFn = (typeof window !== 'undefined' ? window.fetch : fetch),
  baseUrl = '/api/v1',
  csrfToken = null
} = {}) {
  let activeAbortController = null;

  return {
    send: async (payload, callbacks = {}, options = {}) => {
      if (activeAbortController) {
        activeAbortController.abort();
      }
      activeAbortController = new AbortController();

      const cleanBase = (baseUrl || '/api/v1').replace(/\/+$/, '');
      const url = `${cleanBase}/advisor/chat/stream`;

      const headers = {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const effectiveCsrf = csrfToken || (typeof document !== 'undefined' ? getCsrfFromCookieOrMeta() : null);
      if (effectiveCsrf) {
        headers['X-XSRF-TOKEN'] = effectiveCsrf;
      }

      const response = await fetchFn(url, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
        signal: activeAbortController.signal
      });

      if (!response.ok) {
        let errJson = null;
        try {
          errJson = await response.json();
        } catch (_) {
          errJson = { status: response.status, message: response.statusText };
        }
        const error = new Error(errJson?.message || `HTTP ${response.status} chat stream error`);
        error.status = response.status;
        error.code = errJson?.code || 'CHAT_STREAM_ERROR';
        error.retryable = response.status === 503 || response.status === 409 || errJson?.retryable;
        callbacks.onError?.(error);
        throw error;
      }

      if (!response.body) {
        throw new Error('Response body is empty or streaming is not supported');
      }

      await parseSseStream(response.body, callbacks);
    },

    abort: () => {
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
    }
  };
}

/**
 * Trích xuất CSRF Token từ Cookie hoặc Thẻ Meta trong DOM
 */
function getCsrfFromCookieOrMeta() {
  if (typeof document === 'undefined') return null;

  // 1. Thử đọc từ cookie XSRF-TOKEN
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  // 2. Thử đọc từ meta tag
  const meta = document.querySelector('meta[name="_csrf"]');
  if (meta) {
    return meta.getAttribute('content');
  }

  return null;
}

/**
 * React Hook quản lý vòng đời Server-Sent Events cho màn hình Chat
 */
export function useChatStream({
  api,
  onStatus,
  onToolCall,
  onToolResult,
  onCitation,
  onChunk,
  onDone,
  onError
} = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [phase, setPhase] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const sessionRef = useRef(null);

  const startStream = useCallback(async (payload) => {
    setIsStreaming(true);
    setStatusMessage('');
    setPhase('INITIALIZING');
    setStreamedText('');

    const baseUrl = api?.baseURL || '/api/v1';
    const csrfToken = api?.csrfToken || null;

    if (!sessionRef.current) {
      sessionRef.current = createChatStreamSession({
        fetchFn: api?.fetch || (typeof window !== 'undefined' ? window.fetch : fetch),
        baseUrl,
        csrfToken
      });
    }

    try {
      await sessionRef.current.send(payload, {
        onStatus: (evt) => {
          setStatusMessage(evt.message || '');
          setPhase(evt.phase || '');
          onStatus?.(evt);
        },
        onToolCall: (evt) => {
          setStatusMessage(`Đang gọi công cụ ${evt.toolName || ''}...`);
          onToolCall?.(evt);
        },
        onToolResult: (evt) => {
          onToolResult?.(evt);
        },
        onCitation: (evt) => {
          onCitation?.(evt);
        },
        onChunk: (chunk) => {
          setStreamedText((prev) => prev + chunk);
          onChunk?.(chunk);
        },
        onDone: (evt) => {
          setIsStreaming(false);
          setStatusMessage('');
          onDone?.(evt);
        },
        onError: (err) => {
          setIsStreaming(false);
          setStatusMessage('');
          onError?.(err);
        }
      });
    } catch (err) {
      setIsStreaming(false);
      setStatusMessage('');
      if (err.name !== 'AbortError') {
        onError?.(err);
      }
    }
  }, [api, onStatus, onToolCall, onToolResult, onCitation, onChunk, onDone, onError]);

  const abort = useCallback(() => {
    sessionRef.current?.abort();
    setIsStreaming(false);
    setStatusMessage('');
  }, []);

  return {
    isStreaming,
    statusMessage,
    phase,
    streamedText,
    startStream,
    abort
  };
}
