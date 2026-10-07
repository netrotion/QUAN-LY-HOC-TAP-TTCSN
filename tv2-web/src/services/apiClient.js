/**
 * HaUI Advisor — Singleton API Client & Mock Interceptor (ui-api-v0)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Đặc tả kỹ thuật:
 * - Cung cấp singleton `api` dùng chung cho cả TV2 (Web Host) và TV3 (`createStudentRoutes({ api, ui })`).
 * - Hỗ trợ `baseURL`, gửi kèm session cookie (`credentials: 'include'`) và CSRF token (`X-XSRF-TOKEN`) phục vụ Spring Security.
 * - Tích hợp Mock Interceptor / Mock Adapter có nhãn `FIXTURE_ONLY`, bật/tắt qua cờ môi trường hoặc runtime toggle (chỉ cho phép ở môi trường dev/test).
 * - Tuân thủ Quy tắc 4 (AGENTS.md): Tuyệt đối KHÔNG âm thầm fallback về mock khi chạy live/production.
 * - Tuân thủ Quy tắc 6 (AGENTS.md): Không gửi `studentId` từ client body làm định danh tin cậy (server trích xuất từ session context).
 */

import {
  FIXTURE_TAG,
  MOCK_ACADEMIC_STATUS,
  MOCK_BOOTSTRAP_INFO,
  MOCK_CURRICULUM_TREE,
  MOCK_GRADUATION_AUDIT,
  MOCK_RECONCILE_PLAN,
  MOCK_RETAKE_RANKING,
  MOCK_SESSION_STUDENT,
  MOCK_SIMULATE_GRADES,
  MOCK_STUDY_PLAN,
  MOCK_TARGET_GRADES,
  MOCK_TRANSCRIPT_INGESTION_PREVIEW,
  createMockChatResponse,
  createMockEligibilityResponse,
  createMockHealthResponse,
  createMockValidatePlanResponse
} from './mockFixtures.js';

/**
 * Lỗi chuẩn hóa từ API Client (tương thích `ApiErrorResponse` trong `openapi-v0.yaml`)
 */
export class ApiClientError extends Error {
  /**
   * @param {Object} params
   * @param {string} params.message
   * @param {string} [params.code]
   * @param {number} [params.status]
   * @param {string} [params.requestId]
   * @param {string} [params.timestamp]
   * @param {string[]} [params.details]
   */
  constructor({
    message,
    code = 'API_ERROR',
    status = 500,
    requestId = `req-${Date.now()}`,
    timestamp = new Date().toISOString(),
    details = []
  }) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.timestamp = timestamp;
    this.details = Array.isArray(details) ? details : [];
  }
}

/**
 * Đọc biến môi trường an toàn trên cả trình duyệt (Vite) và Node.js (`node --test`)
 */
function readEnvConfig() {
  const viteEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const nodeEnv = typeof globalThis !== 'undefined' && globalThis.process?.env ? globalThis.process.env : {};

  const mode = viteEnv.MODE || nodeEnv.NODE_ENV || 'development';
  const isProduction = mode === 'production';
  const baseURL = viteEnv.VITE_API_BASE_URL || nodeEnv.VITE_API_BASE_URL || '/api/v1';

  const rawMockFlag = viteEnv.VITE_USE_MOCK_API ?? nodeEnv.VITE_USE_MOCK_API;
  const initialMockEnabled = isProduction
    ? false
    : rawMockFlag !== undefined
      ? String(rawMockFlag).toLowerCase() === 'true'
      : true;

  return {
    mode,
    isProduction,
    baseURL,
    initialMockEnabled
  };
}

/**
 * Trích xuất CSRF token từ cookie `XSRF-TOKEN` hoặc thẻ `<meta name="_csrf">` cho Spring Security
 * @param {string} cookieName
 * @returns {string|null}
 */
export function extractCsrfTokenFromBrowser(cookieName = 'XSRF-TOKEN') {
  if (typeof document === 'undefined') {
    return null;
  }

  if (typeof document.cookie === 'string' && document.cookie.length > 0) {
    const cookies = document.cookie.split(';');
    for (const rawCookie of cookies) {
      const [name, ...rest] = rawCookie.trim().split('=');
      if (name === cookieName && rest.length > 0) {
        return decodeURIComponent(rest.join('='));
      }
    }
  }

  if (typeof document.querySelector === 'function') {
    const metaTag = document.querySelector('meta[name="_csrf"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
  }

  return null;
}

/**
 * Loại bỏ `studentId` không tin cậy khỏi request body theo Quy tắc 6 (AGENTS.md).
 * Danh tính sinh viên luôn do Backend trích xuất từ Session Context.
 * @param {any} body
 * @returns {{ sanitizedBody: any, strippedStudentId: boolean }}
 */
export function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { sanitizedBody: body, strippedStudentId: false };
  }

  if (Object.prototype.hasOwnProperty.call(body, 'studentId')) {
    const cloned = { ...body };
    delete cloned.studentId;
    return { sanitizedBody: cloned, strippedStudentId: true };
  }

  return { sanitizedBody: body, strippedStudentId: false };
}

/**
 * Chuẩn hóa đường dẫn endpoint với `baseURL`
 * @param {string} baseURL
 * @param {string} path
 * @returns {{ fullUrl: string, normalizedPath: string }}
 */
function resolveEndpointUrl(baseURL, path) {
  const cleanBase = (baseURL || '/api/v1').replace(/\/+$/, '');
  const rawPath = String(path || '/').trim();

  let normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  if (normalizedPath.startsWith(cleanBase)) {
    normalizedPath = normalizedPath.slice(cleanBase.length) || '/';
  }

  const fullUrl = `${cleanBase}${normalizedPath}`;
  return { fullUrl, normalizedPath };
}

/**
 * Bộ định tuyến Mock Adapter nội bộ cho giai đoạn V0 (`FIXTURE_ONLY`)
 * @param {string} method
 * @param {string} normalizedPath
 * @param {any} body
 * @param {Object} options
 */
function resolveMockFixture(method, normalizedPath, body, options = {}) {
  const upperMethod = method.toUpperCase();
  const cleanPath = normalizedPath.split('?')[0];

  if (options.simulateError || cleanPath === '/mock/error') {
    throw new ApiClientError({
      code: 'NOT_IMPLEMENTED',
      status: 501,
      message: 'Mô phỏng lỗi 501 NOT_IMPLEMENTED từ hợp đồng OpenAPI V0 để kiểm thử Error Component & Retry.',
      requestId: `req-mock-err-${Date.now()}`,
      details: [
        'Endpoint nghiệp vụ chưa được nối database thực tế ở mốc V0',
        `Nhãn kiểm thử: ${FIXTURE_TAG}`
      ]
    });
  }

  const routeKey = `${upperMethod} ${cleanPath}`;

  if (options.state?.dynamicProvider && typeof options.state.dynamicProvider[routeKey] === 'function') {
    return options.state.dynamicProvider[routeKey](body, options);
  }

  switch (routeKey) {
    case 'GET /system/bootstrap':
      return { ...MOCK_BOOTSTRAP_INFO };
    case 'GET /system/health':
      return createMockHealthResponse();
    case 'GET /academic/status':
      return { ...MOCK_ACADEMIC_STATUS };
    case 'GET /academic/curriculum':
      return { ...MOCK_CURRICULUM_TREE };
    case 'POST /academic/eligibility':
      return createMockEligibilityResponse(body);
    case 'POST /academic/transcript-ingest': {
      // Mục 4.1 Luồng phụ A & Mục 5 Edge Cases: Kiểm tra định dạng file bảng điểm
      const fileName = String(body?.fileName || 'Bang_Diem_eHaUI.pdf');
      if (body?.invalidFormat || /\.(exe|zip|docx|txt)$/i.test(fileName)) {
        throw new ApiClientError({
          code: 'INVALID_TRANSCRIPT_FORMAT',
          status: 422,
          message: `Không tải được bảng điểm do lỗi định dạng file (${fileName}). Hệ thống chỉ chấp nhận file PDF hoặc Ảnh (PNG/JPG) xuất từ cổng e-HaUI.`,
          requestId: `req-ingest-err-${Date.now()}`,
          details: [
            'Vui lòng chọn [Tải lại file] đúng chuẩn PDF/Ảnh e-HaUI hoặc chọn [Nhập điểm thủ công từng môn].'
          ]
        });
      }
      return {
        ...MOCK_TRANSCRIPT_INGESTION_PREVIEW,
        sourceFileName: fileName
      };
    }
    case 'GET /audit/graduation':
      return { ...MOCK_GRADUATION_AUDIT };
    case 'POST /planner/generate':
      return { ...MOCK_STUDY_PLAN };
    case 'POST /planner/validate':
      return createMockValidatePlanResponse(body);
    case 'POST /planner/reconcile':
      return { ...MOCK_RECONCILE_PLAN };
    case 'POST /simulation/grades':
      return { ...MOCK_SIMULATE_GRADES };
    case 'POST /simulation/retake-ranking':
      return { ...MOCK_RETAKE_RANKING };
    case 'POST /simulation/target-grades':
      return { ...MOCK_TARGET_GRADES };
    case 'POST /advisor/chat':
      return createMockChatResponse(body);
    default:
      throw new ApiClientError({
        code: 'MOCK_ROUTE_NOT_FOUND',
        status: 404,
        message: `Không tìm thấy mock fixture V0 cho endpoint: ${routeKey}`,
        requestId: `req-mock-404-${Date.now()}`,
        details: [`Hỗ trợ các endpoint định nghĩa trong openapi-v0.yaml (${FIXTURE_TAG})`]
      });
  }
}

/**
 * Khởi tạo API Client theo kiến trúc Singleton + Interceptor
 * @param {Object} [customConfig]
 */
export function createApiClient(customConfig = {}) {
  const env = readEnvConfig();

  const state = {
    baseURL: customConfig.baseURL || env.baseURL,
    mode: customConfig.mode || env.mode,
    isProduction: customConfig.isProduction ?? env.isProduction,
    mockEnabled: customConfig.mockEnabled ?? env.initialMockEnabled,
    mockDelayMs: customConfig.mockDelayMs ?? 140,
    csrfCookieName: customConfig.csrfCookieName || 'XSRF-TOKEN',
    csrfHeaderName: customConfig.csrfHeaderName || 'X-XSRF-TOKEN',
    manualCsrfToken: customConfig.csrfToken || null,
    fetchImpl: customConfig.fetchImpl || (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null),
    sessionStudent: customConfig.sessionStudent || { ...MOCK_SESSION_STUDENT },
    dynamicProvider: customConfig.dynamicProvider || null
  };

  if (state.isProduction) {
    state.mockEnabled = false;
  }

  const listeners = new Set();
  const requestInterceptors = [];
  const responseInterceptors = [];

  function notifyListeners() {
    const snapshot = getConfig();
    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch {
        // Bỏ qua lỗi listener bên ngoài
      }
    }
  }

  function getConfig() {
    return Object.freeze({
      baseURL: state.baseURL,
      mode: state.mode,
      isProduction: state.isProduction,
      mockEnabled: state.mockEnabled,
      mockDelayMs: state.mockDelayMs,
      csrfCookieName: state.csrfCookieName,
      csrfHeaderName: state.csrfHeaderName,
      fixtureLabel: state.mockEnabled ? FIXTURE_TAG : null,
      sessionStudent: state.sessionStudent
    });
  }

  function setSessionStudent(nextStudent) {
    state.sessionStudent = { ...state.sessionStudent, ...nextStudent };
    notifyListeners();
    return state.sessionStudent;
  }

  function setDynamicProvider(provider) {
    state.dynamicProvider = provider;
    notifyListeners();
  }

  /**
   * Bật/tắt Mock Adapter (chỉ hợp lệ khi không ở môi trường production)
   * @param {boolean} enabled
   */
  function setMockMode(enabled) {
    if (state.isProduction && enabled) {
      throw new ApiClientError({
        code: 'MOCK_FORBIDDEN_IN_PRODUCTION',
        status: 403,
        message: 'Vi phạm Quy tắc 4 (AGENTS.md): Không được phép bật Mock Adapter trên môi trường production.'
      });
    }
    state.mockEnabled = Boolean(enabled);
    notifyListeners();
    return state.mockEnabled;
  }

  function isMockMode() {
    return state.mockEnabled;
  }

  function setCsrfToken(token) {
    state.manualCsrfToken = token || null;
  }

  function getCsrfToken() {
    return state.manualCsrfToken || extractCsrfTokenFromBrowser(state.csrfCookieName);
  }

  function subscribe(listener) {
    if (typeof listener === 'function') {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
    return () => {};
  }

  function addRequestInterceptor(fn) {
    if (typeof fn === 'function') {
      requestInterceptors.push(fn);
    }
  }

  function addResponseInterceptor(fn) {
    if (typeof fn === 'function') {
      responseInterceptors.push(fn);
    }
  }

  /**
   * Thực thi HTTP request hoặc Mock Interceptor
   * @param {string} path
   * @param {Object} [options]
   */
  async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const { fullUrl, normalizedPath } = resolveEndpointUrl(state.baseURL, path);
    const { sanitizedBody, strippedStudentId } = sanitizeRequestBody(options.body);

    const headers = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Client-Contract': 'ui-api-v0',
      'X-Identity-Source': 'SERVER_SESSION_CONTEXT',
      ...(options.headers || {})
    };

    if (strippedStudentId) {
      headers['X-Security-Sanitized'] = 'stripped-untrusted-studentId';
    }

    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (sanitizedBody !== undefined && sanitizedBody !== null) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const csrfToken = getCsrfToken();
    if (csrfToken && (isMutating || options.includeCsrf)) {
      headers[state.csrfHeaderName] = csrfToken;
    }

    let requestContext = {
      url: fullUrl,
      normalizedPath,
      method,
      headers,
      body: sanitizedBody,
      credentials: options.credentials || 'include',
      strippedStudentId,
      simulateError: Boolean(options.simulateError)
    };

    for (const interceptor of requestInterceptors) {
      requestContext = (await interceptor(requestContext)) || requestContext;
    }

    const useMock = options.useMock !== undefined ? Boolean(options.useMock) : state.mockEnabled;
    if (state.isProduction && useMock) {
      throw new ApiClientError({
        code: 'MOCK_FORBIDDEN_IN_PRODUCTION',
        status: 403,
        message: 'Không được phép sử dụng Mock Interceptor trong môi trường production.'
      });
    }

    if (useMock) {
      const delay = options.mockDelayMs ?? state.mockDelayMs;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const fixturePayload = resolveMockFixture(
        requestContext.method,
        requestContext.normalizedPath,
        requestContext.body,
        { simulateError: requestContext.simulateError, state }
      );

      let enrichedResponse = {
        ...fixturePayload,
        __mock: true,
        fixtureLabel: FIXTURE_TAG,
        __meta: {
          endpoint: requestContext.url,
          method: requestContext.method,
          mode: 'MOCK_INTERCEPTOR',
          fixtureLabel: FIXTURE_TAG,
          credentials: requestContext.credentials,
          csrfHeaderAttached: Boolean(requestContext.headers[state.csrfHeaderName]),
          strippedUntrustedStudentId: requestContext.strippedStudentId,
          timestamp: new Date().toISOString()
        }
      };

      for (const interceptor of responseInterceptors) {
        enrichedResponse = (await interceptor(enrichedResponse, requestContext)) || enrichedResponse;
      }

      return enrichedResponse;
    }

    if (typeof state.fetchImpl !== 'function') {
      throw new ApiClientError({
        code: 'FETCH_UNAVAILABLE',
        status: 500,
        message: 'Môi trường hiện tại không hỗ trợ Fetch API.'
      });
    }

    let response;
    try {
      response = await state.fetchImpl(requestContext.url, {
        method: requestContext.method,
        headers: requestContext.headers,
        credentials: requestContext.credentials,
        body:
          requestContext.body !== undefined && requestContext.body !== null
            ? typeof requestContext.body === 'string'
              ? requestContext.body
              : JSON.stringify(requestContext.body)
            : undefined,
        signal: options.signal
      });
    } catch (networkErr) {
      throw new ApiClientError({
        code: 'NETWORK_ERROR',
        status: 0,
        message:
          networkErr?.message ||
          'Không thể kết nối tới Backend Spring Boot (/api/v1). Hệ thống giữ nguyên lỗi thật, không tự động fallback về mock.',
        details: [
          'Kiểm tra tiến trình Spring Boot tại cổng 8080 hoặc bật công tắc Mock Mode (FIXTURE_ONLY) để thử nghiệm cục bộ.'
        ]
      });
    }

    let payload = null;
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    } else {
      try {
        const text = await response.text();
        payload = text ? { message: text } : null;
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw new ApiClientError({
        code: payload?.code || `HTTP_${response.status}`,
        status: response.status,
        message:
          payload?.message ||
          `Yêu cầu ${requestContext.method} ${requestContext.url} thất bại với mã trạng thái ${response.status}.`,
        requestId: payload?.requestId || `req-http-${response.status}`,
        timestamp: payload?.timestamp || new Date().toISOString(),
        details: payload?.details || []
      });
    }

    let finalPayload =
      payload && typeof payload === 'object'
        ? {
            ...payload,
            __mock: false,
            __meta: {
              endpoint: requestContext.url,
              method: requestContext.method,
              mode: 'LIVE_BACKEND',
              credentials: requestContext.credentials,
              csrfHeaderAttached: Boolean(requestContext.headers[state.csrfHeaderName]),
              strippedUntrustedStudentId: requestContext.strippedStudentId,
              timestamp: new Date().toISOString()
            }
          }
        : payload;

    for (const interceptor of responseInterceptors) {
      finalPayload = (await interceptor(finalPayload, requestContext)) || finalPayload;
    }

    return finalPayload;
  }

  function get(path, options = {}) {
    return request(path, { ...options, method: 'GET' });
  }

  function post(path, body, options = {}) {
    return request(path, { ...options, method: 'POST', body });
  }

  function put(path, body, options = {}) {
    return request(path, { ...options, method: 'PUT', body });
  }

  function del(path, options = {}) {
    return request(path, { ...options, method: 'DELETE' });
  }

  const system = Object.freeze({
    getBootstrap: (opts) => get('/system/bootstrap', opts),
    getHealth: (opts) => get('/system/health', opts)
  });

  const academic = Object.freeze({
    getStatus: (opts) => get('/academic/status', opts),
    getCurriculum: (opts) => get('/academic/curriculum', opts),
    checkEligibility: (payload, opts) => post('/academic/eligibility', payload, opts),
    ingestTranscript: (payload, opts) => post('/academic/transcript-ingest', payload, opts)
  });

  const audit = Object.freeze({
    getGraduationAudit: (opts) => get('/audit/graduation', opts)
  });

  const planner = Object.freeze({
    generate: (payload = {}, opts) => post('/planner/generate', payload, opts),
    validate: (payload = {}, opts) => post('/planner/validate', payload, opts),
    reconcile: (payload = {}, opts) => post('/planner/reconcile', payload, opts)
  });

  const simulation = Object.freeze({
    simulateGrades: (payload = {}, opts) => post('/simulation/grades', payload, opts),
    rankRetake: (payload = {}, opts) => post('/simulation/retake-ranking', payload, opts),
    calculateTargetGrades: (payload = {}, opts) => post('/simulation/target-grades', payload, opts)
  });

  const advisor = Object.freeze({
    chat: (payload = {}, opts) => post('/advisor/chat', payload, opts)
  });

  return Object.freeze({
    get,
    post,
    put,
    delete: del,
    request,
    getConfig,
    setMockMode,
    isMockMode,
    setCsrfToken,
    getCsrfToken,
    subscribe,
    setSessionStudent,
    setDynamicProvider,
    addRequestInterceptor,
    addResponseInterceptor,
    system,
    academic,
    audit,
    planner,
    simulation,
    advisor
  });
}

/**
 * Singleton API Client duy nhất của toàn ứng dụng HaUI Advisor (`ui-api-v0`)
 */
export const api = createApiClient();
export default api;
