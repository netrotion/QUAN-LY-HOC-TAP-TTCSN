import React, { useState, useCallback, useMemo } from 'react';

/**
 * 4 Gợi ý câu hỏi thông minh (Quick Prompt Pills) chuẩn Màn hình 2 UI Flow
 */
const QUICK_PROMPTS_MAN_2 = Object.freeze([
  'Tư vấn lộ trình kỳ tới để kéo CPA lên >= 2.50 (bằng Khá).',
  'Tôi vừa trượt môn Giải tích 2 / Toán rời rạc, kỳ sau bị ảnh hưởng thế nào?',
  'Lên lộ trình học vượt 3.5 năm ngành CNTT.',
  'Kỳ này nên học cải thiện môn nào tốt nhất?'
]);

/**
 * Màn hình 2: Trợ lý ảo AI Chatbot Tư vấn Học vụ (AI Advisor Chat) — TV3
 *
 * Yêu cầu & Kiến trúc:
 * - Dựng khung giao diện trò chuyện:
 *   + Tiêu đề & thanh trạng thái.
 *   + Vùng hiển thị hội thoại 2 chiều (User & Assistant).
 *   + Khối gợi ý câu hỏi thông minh (Quick Prompt Pills).
 *   + Ô nhập nội dung văn bản (input) & nút Gửi.
 * - Có đầy đủ 3 trạng thái:
 *   + Empty: Khi chưa có tin nhắn nào trong hội thoại (hiển thị ui.EmptyState).
 *   + Loading: Khi AI đang đối chiếu dữ liệu và suy nghĩ (hiển thị ui.Loading hoặc typing indicator).
 *   + Error: Khi gửi tin nhắn thất bại (hiển thị ui.Error kèm nút Thử lại).
 * - Sử dụng API client và UI components từ TV2:
 *   + api.advisor.chat({ conversationId, message, clientTimestamp })
 *   + UI: Button, Card, Loading, Error, EmptyState.
 * - Không tạo backend, AI service, API client hoặc hệ thống chat độc lập.
 * - Minh bạch các điểm tích hợp nghiệp vụ còn thiếu (Phase 2): SSE streaming, nạp lịch sử từ DB, live LLM adapter.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client do TV2 truyền xuống
 * @param {Object} props.ui - Shared UI Library V0 do TV2 truyền xuống
 */
export function ChatAdvisorPage({ api, ui } = {}) {
  const {
    Button,
    Card,
    Loading,
    Error: ErrorBox,
    EmptyState
  } = ui || {};

  // State hội thoại
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastPrompt, setLastPrompt] = useState('');

  // ID phiên hội thoại (duy trì xuyên suốt phiên làm việc)
  const [conversationId] = useState(() => `conv-${Date.now()}`);

  // Xử lý gửi tin nhắn tới API cố vấn học vụ (api.advisor.chat)
  const handleSendMessage = useCallback(async (customText) => {
    const rawText = typeof customText === 'string' ? customText : inputValue;
    if (!rawText || !rawText.trim()) return;

    const trimmed = rawText.trim();
    setLastPrompt(trimmed);

    // 1. Thêm tin nhắn của người dùng vào danh sách
    const userMsg = {
      id: `msg-user-${Date.now()}-${Math.random()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);
    setError(null);

    // Kiểm tra tính sẵn sàng của API Client từ TV2
    if (!api || !api.advisor || typeof api.advisor.chat !== 'function') {
      setLoading(false);
      setError({
        code: 'API_METHOD_MISSING',
        message: 'Chưa kết nối được API client: api.advisor.chat không tồn tại.',
        details: [
          'Endpoint mục tiêu cần tích hợp: POST /api/v1/advisor/chat',
          'Payload yêu cầu: { conversationId, message, clientTimestamp }'
        ]
      });
      return;
    }

    try {
      // 2. Gọi API gửi tin nhắn
      const response = await api.advisor.chat({
        conversationId,
        message: trimmed,
        clientTimestamp: new Date().toISOString()
      });

      // 3. Thêm tin nhắn phản hồi của AI vào danh sách
      const aiMsg = {
        id: `msg-ai-${Date.now()}-${Math.random()}`,
        sender: 'assistant',
        text: response?.answer || 'Hệ thống đã nhận yêu cầu nhưng nội dung trả lời trống.',
        sources: response?.sources || [],
        actions: response?.actions || [],
        planProposal: response?.planProposal || null,
        warnings: response?.warnings || [],
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError({
        code: err?.code || 'CHAT_REQUEST_FAILED',
        message: err?.message || 'Không thể nhận phản hồi từ dịch vụ Trợ lý AI Cố vấn học vụ.',
        details: err?.details || [
          'Kiểm tra kết nối mạng tới Backend Spring Boot (/api/v1/advisor/chat).',
          'Hoặc bật chế độ Mock Mode trên thanh Topbar để thử nghiệm kịch bản giả lập.'
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [api, conversationId, inputValue]);

  // Xóa toàn bộ hội thoại để đưa về trạng thái Empty
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setInputValue('');
  }, []);

  // Mô phỏng trạng thái Error để kiểm thử UI
  const handleSimulateError = useCallback(() => {
    setError({
      code: 'SIMULATED_CHAT_ERROR',
      message: 'Mô phỏng lỗi kết nối máy chủ AI Cố vấn học vụ (Kiểm thử Error State).',
      details: [
        'Endpoint: POST /api/v1/advisor/chat gặp sự cố mạng hoặc timeout.',
        'Nhấn nút "Thử lại tin nhắn vừa gửi" để kiểm tra tính năng khôi phục.'
      ]
    });
  }, []);

  // Bắt phím Enter để gửi nhanh (Shift + Enter để xuống dòng nếu là textarea)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Tiêu đề đầu trang và thanh công cụ kiểm thử
  const headerSection = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--spacing-4, 16px)',
        marginBottom: 'var(--spacing-6, 24px)'
      }
    },
    React.createElement(
      'div',
      null,
      React.createElement(
        'h2',
        { style: { fontSize: 'var(--text-2xl, 24px)', fontWeight: 700, color: 'var(--color-gray-900, #0f172a)', margin: 0 } },
        'Trợ lý Cố vấn Học vụ AI (AI Advisor Chat)'
      ),
      React.createElement(
        'p',
        { style: { color: 'var(--color-gray-600, #475569)', marginTop: 'var(--spacing-1, 4px)', fontSize: 'var(--text-sm, 14px)' } },
        'Màn hình 2 — Tiếp nhận câu hỏi học vụ bằng ngôn ngữ tự nhiên, gợi ý Quick Prompts thông minh và điều phối tư vấn qua API.'
      )
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: 'var(--spacing-2, 8px)', alignItems: 'center' } },
      Button
        ? React.createElement(
            Button,
            { variant: 'ghost', size: 'sm', onClick: handleClearChat },
            'Xóa hội thoại (Empty)'
          )
        : null,
      Button
        ? React.createElement(
            Button,
            { variant: 'ghost', size: 'sm', onClick: handleSimulateError },
            'Mô phỏng Lỗi (Error)'
          )
        : null
    )
  );

  // Vùng thông báo trạng thái tích hợp kỹ thuật (Integration Points)
  const integrationNotice = Card
    ? React.createElement(
        Card,
        {
          variant: 'status-info',
          padding: 'sm',
          style: { marginBottom: 'var(--spacing-4, 16px)' }
        },
        React.createElement(
          'div',
          { style: { fontSize: 'var(--text-xs, 12px)', color: '#0369a1', lineHeight: 1.5 } },
          React.createElement('strong', null, 'ℹ️ Điểm kết nối nghiệp vụ API: '),
          'Giao diện kết nối qua hàm ',
          React.createElement('code', null, 'api.advisor.chat({ conversationId, message })'),
          ' (gọi ',
          React.createElement('code', null, 'POST /api/v1/advisor/chat'),
          '). Các phần nâng cao sẽ mở rộng ở Phase tiếp theo: SSE Streaming, lưu vết lịch sử chat từ Database, và kết nối LLM Gemini thật.'
        )
      )
    : null;

  // Khối các nút gợi ý câu hỏi nhanh (Quick Prompt Pills)
  const quickPromptsSection = React.createElement(
    'div',
    { style: { marginBottom: 'var(--spacing-4, 16px)' } },
    React.createElement(
      'div',
      { style: { fontSize: 'var(--text-xs, 12px)', fontWeight: 600, color: 'var(--color-gray-600, #475569)', marginBottom: '8px' } },
      '💡 Câu hỏi học vụ gợi ý nhanh (Quick Prompts):'
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
      QUICK_PROMPTS_MAN_2.map((prompt, idx) =>
        Button
          ? React.createElement(
              Button,
              {
                key: idx,
                variant: 'ghost',
                size: 'sm',
                onClick: () => handleSendMessage(prompt),
                disabled: loading,
                style: {
                  background: 'var(--color-gray-100, #f1f5f9)',
                  borderColor: 'var(--color-gray-200, #e2e8f0)',
                  fontSize: 'var(--text-xs, 12px)',
                  textAlign: 'left'
                }
              },
              `💬 ${prompt}`
            )
          : null
      )
    )
  );

  // ==========================================
  // 1. TRẠNG THÁI EMPTY & VÙNG HỘI THOẠI
  // ==========================================
  let conversationArea = null;

  if (messages.length === 0) {
    // TRẠNG THÁI EMPTY
    conversationArea = React.createElement(
      'div',
      {
        style: {
          padding: 'var(--spacing-8, 32px) var(--spacing-4, 16px)',
          background: 'var(--color-gray-50, #f8fafc)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px dashed var(--color-gray-300, #cbd5e1)',
          marginBottom: 'var(--spacing-4, 16px)'
        }
      },
      EmptyState
        ? React.createElement(EmptyState, {
            title: 'Chưa có tin nhắn nào trong cuộc hội thoại',
            description: 'Hãy đặt câu hỏi về lộ trình học tập, quy chế tích lũy tín chỉ hoặc chọn một câu hỏi gợi ý ở trên để bắt đầu trò chuyện với Cố vấn AI.',
            actionLabel: 'Gợi ý: Tư vấn lộ trình kỳ tới',
            onAction: () => handleSendMessage(QUICK_PROMPTS_MAN_2[0])
          })
        : React.createElement('div', { style: { textAlign: 'center' } }, 'Chưa có tin nhắn nào.')
    );
  } else {
    // VÙNG HIỂN THỊ DANH SÁCH TIN NHẮN ĐÃ GỬI
    conversationArea = React.createElement(
      'div',
      {
        className: 'haui-chat-messages-container',
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-4, 16px)',
          maxHeight: '520px',
          overflowY: 'auto',
          padding: 'var(--spacing-4, 16px)',
          background: 'var(--color-gray-50, #f8fafc)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-gray-200, #e2e8f0)',
          marginBottom: 'var(--spacing-4, 16px)'
        }
      },
      messages.map((msg) => {
        const isUser = msg.sender === 'user';
        return React.createElement(
          'div',
          {
            key: msg.id,
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
              width: '100%'
            }
          },
          // Header tin nhắn (Người gửi & thời gian)
          React.createElement(
            'div',
            {
              style: {
                fontSize: '11px',
                color: 'var(--color-gray-500, #64748b)',
                marginBottom: '4px',
                padding: '0 4px'
              }
            },
            isUser ? `Bạn • ${msg.timestamp}` : `Trợ lý Cố vấn HaUI • ${msg.timestamp}`
          ),
          // Bong bóng nội dung tin nhắn
          React.createElement(
            'div',
            {
              style: {
                maxWidth: '82%',
                padding: '12px 16px',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isUser ? 'var(--color-primary, #0284c7)' : '#ffffff',
                color: isUser ? '#ffffff' : 'var(--color-gray-900, #0f172a)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                border: isUser ? 'none' : '1px solid var(--color-gray-200, #e2e8f0)',
                fontSize: 'var(--text-sm, 14px)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }
            },
            msg.text,
            // Nếu AI trả về Cảnh báo học vụ (warnings)
            !isUser && msg.warnings && msg.warnings.length > 0
              ? React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#fffbeb',
                      borderLeft: '3px solid #f59e0b',
                      color: '#92400e',
                      fontSize: '12px'
                    }
                  },
                  React.createElement('strong', null, '⚠️ Cảnh báo học vụ:'),
                  React.createElement(
                    'ul',
                    { style: { margin: '4px 0 0 0', paddingLeft: '16px' } },
                    msg.warnings.map((w, wIdx) => React.createElement('li', { key: wIdx }, w))
                  )
                )
              : null,
            // Nếu AI trả về Trích dẫn nguồn quy chế (sources)
            !isUser && msg.sources && msg.sources.length > 0
              ? React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                      color: '#475569'
                    }
                  },
                  React.createElement('strong', null, '📚 Nguồn tài liệu đối chiếu:'),
                  React.createElement(
                    'ul',
                    { style: { margin: '4px 0 0 0', paddingLeft: '16px' } },
                    msg.sources.map((s, sIdx) =>
                      React.createElement(
                        'li',
                        { key: sIdx },
                        `${s.title || 'Quy chế'} — ${s.section || ''} (${s.version || 'Chuẩn'})`
                      )
                    )
                  )
                )
              : null,
            // Nếu AI đề xuất Kế hoạch học tập (planProposal)
            !isUser && msg.planProposal
              ? React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      fontSize: '12px',
                      color: '#166534'
                    }
                  },
                  React.createElement('strong', null, '📅 Dự thảo Lộ trình đề xuất: '),
                  `${msg.planProposal.description || 'Kế hoạch học tập kỳ tới'} (CPA dự kiến: ${msg.planProposal.projectedCpa || 'N/A'})`
                )
              : null,
            // Nếu AI trả về nút hành động gợi ý (actions)
            !isUser && msg.actions && msg.actions.length > 0
              ? React.createElement(
                  'div',
                  { style: { marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                  msg.actions.map((act, aIdx) =>
                    Button
                      ? React.createElement(
                          Button,
                          {
                            key: aIdx,
                            variant: 'secondary',
                            size: 'sm',
                            onClick: () => {
                              if (act.targetRoute) {
                                window.location.hash = act.targetRoute;
                              }
                            }
                          },
                          `👉 ${act.label || 'Xem chi tiết'}`
                        )
                      : null
                  )
                )
              : null
          )
        );
      }),
      // Chỉ báo AI đang phản hồi (Loading Indicator)
      loading
        ? React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                alignSelf: 'flex-start',
                fontSize: '12px',
                color: 'var(--color-gray-600, #475569)'
              }
            },
            Loading
              ? React.createElement(Loading, { variant: 'inline', size: 'sm' })
              : '⏳',
            'AI đang phân tích câu hỏi & đối chiếu dữ liệu học vụ...'
          )
        : null
    );
  }

  // ==========================================
  // 2. KHỐI HIỂN THỊ ERROR
  // ==========================================
  const errorBoxSection = error && ErrorBox
    ? React.createElement(
        'div',
        { style: { marginBottom: 'var(--spacing-4, 16px)' } },
        React.createElement(ErrorBox, {
          title: error.message || 'Lỗi gửi tin nhắn',
          error: error,
          code: error.code || 'CHAT_ERROR',
          details: error.details || [],
          onRetry: lastPrompt ? () => handleSendMessage(lastPrompt) : undefined,
          retryLabel: 'Thử lại tin nhắn vừa gửi'
        })
      )
    : null;

  // ==========================================
  // 3. Ô NHẬP NỘI DUNG & NÚT GỬI (INPUT BAR)
  // ==========================================
  const inputBarSection = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        gap: 'var(--spacing-3, 12px)',
        alignItems: 'flex-end',
        padding: 'var(--spacing-3, 12px)',
        background: '#ffffff',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-gray-300, #cbd5e1)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
      }
    },
    React.createElement('textarea', {
      value: inputValue,
      onChange: (e) => setInputValue(e.target.value),
      onKeyDown: handleKeyDown,
      placeholder: 'Nhập câu hỏi về lộ trình, nợ môn, điểm số, học vượt... (Nhấn Enter để gửi)',
      disabled: loading,
      rows: 2,
      style: {
        flex: 1,
        border: 'none',
        outline: 'none',
        resize: 'none',
        fontSize: 'var(--text-sm, 14px)',
        fontFamily: 'inherit',
        color: 'var(--color-gray-900, #0f172a)',
        lineHeight: 1.4,
        background: 'transparent'
      }
    }),
    Button
      ? React.createElement(
          Button,
          {
            variant: 'primary',
            size: 'md',
            loading,
            disabled: loading || !inputValue.trim(),
            onClick: () => handleSendMessage()
          },
          'Gửi câu hỏi'
        )
      : React.createElement(
          'button',
          {
            disabled: loading || !inputValue.trim(),
            onClick: () => handleSendMessage()
          },
          'Gửi'
        )
  );

  return React.createElement(
    'div',
    { className: 'haui-page-container haui-chat-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
    headerSection,
    integrationNotice,
    quickPromptsSection,
    errorBoxSection,
    conversationArea,
    inputBarSection
  );
}

export default ChatAdvisorPage;
