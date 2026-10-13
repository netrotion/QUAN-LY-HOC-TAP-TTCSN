import React, { useState, useCallback } from 'react';
import { plannerStore } from '../services/plannerStore.js';

/**
 * 4 Gợi ý câu hỏi thông minh (Quick Prompt Pills) chuẩn Màn hình 2 UI Flow & prototype `tu_van_ai`
 */
const QUICK_PROMPTS_MAN_2 = Object.freeze([
  'Tư vấn lộ trình kéo CPA lên >= 3.20 để tốt nghiệp bằng Giỏi.',
  'Tôi vừa trượt môn Toán rời rạc (MATH1002), kỳ sau bị ảnh hưởng thế nào?',
  'Lên lộ trình học vượt 3.5 năm ngành CNTT/KTPM.',
  'Kỳ này nên học cải thiện môn nào tốt nhất theo chỉ số ROI?'
]);

/**
 * Tạo phản hồi mô phỏng cho AI Advisor Chat khi chưa kết nối API Backend Spring Boot.
 * Tuân thủ quy tắc F23-008:
 * - Câu hỏi tra cứu quy chế học vụ thuần túy (Kịch bản P04): planProposal: null, trích dẫn điều khoản quy chế, không ép mở Planner.
 * - Câu hỏi yêu cầu lập lộ trình / kế hoạch học tập (Kịch bản P05): gắn planProposal kèm thẻ đề xuất phương án.
 *
 * @param {string} queryText - Nội dung tin nhắn của sinh viên
 * @param {Object} [plan] - Bản kế hoạch hiện hành từ plannerStore (nếu có)
 * @returns {Object} { answer, sources, planProposal }
 */
export function generateMockChatResponse(queryText, plan = null) {
  const trimmed = (queryText || '').trim();
  const lower = trimmed.toLowerCase();

  // 1. Nhận diện ý định lập lộ trình / kế hoạch học tập (Kịch bản P05)
  const isPlanRequest =
    lower.includes('lộ trình') ||
    lower.includes('kế hoạch') ||
    lower.includes('học vượt') ||
    lower.includes('lên lịch') ||
    lower.includes('lập lịch') ||
    lower.includes('phân bổ') ||
    lower.includes('đề xuất môn') ||
    lower.includes('phương án');

  // 2. Nhận diện câu hỏi tra cứu quy chế / quy định / điều kiện học vụ thuần túy (Kịch bản P04)
  const isRegulationQuery =
    lower.includes('quy chế') ||
    lower.includes('quy định') ||
    lower.includes('cảnh báo') ||
    lower.includes('thôi học') ||
    lower.includes('chuẩn đầu ra') ||
    lower.includes('điều kiện tốt nghiệp') ||
    lower.includes('thang điểm') ||
    lower.includes('gpa') ||
    lower.includes('cpa') ||
    lower.includes('cách tính') ||
    lower.includes('rút học phần') ||
    lower.includes('tối đa bao nhiêu tín chỉ') ||
    lower.includes('hạn mức tín chỉ') ||
    lower.includes('điều kiện') ||
    lower.includes('tiêu chuẩn');

  // Quy tắc F23-008: Nếu là câu hỏi quy chế hoặc KHÔNG có yêu cầu lập lộ trình -> KHÔNG ép mở Planner
  if (!isPlanRequest || (isRegulationQuery && !lower.includes('lộ trình') && !lower.includes('kế hoạch') && !lower.includes('lập lịch') && !lower.includes('lên lịch') && !lower.includes('phương án'))) {
    let answerText = `[AI Advisor]: Theo Quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội (HaUI):`;
    let sources = [
      {
        title: 'Quy chế đào tạo trình độ đại học theo hệ thống tín chỉ - HaUI',
        section: 'Quy định đào tạo & Quản lý học vụ'
      }
    ];

    if (lower.includes('cảnh báo')) {
      answerText = `[AI Advisor]: Căn cứ Điều 16 Quy chế đào tạo HaUI (REG-HAUI-04 / BR-02):\n` +
        `• Cảnh báo học vụ mức 1: Áp dụng khi điểm trung bình chung tích lũy (CPA) < 1.20 (Năm 1), < 1.40 (Năm 2), < 1.60 (Năm 3), < 1.80 (Năm 4 trở đi), hoặc tổng số tín chỉ nợ F vượt quá 24 tín chỉ.\n` +
        `• Giới hạn khối lượng: Sinh viên bị cảnh báo học vụ chỉ được đăng ký tối đa 14 tín chỉ trong học kỳ chính tiếp theo để tập trung cải thiện kết quả.`;
      sources = [
        {
          title: 'Quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội (HaUI)',
          section: 'Điều 16 - Cảnh báo kết quả học tập & Buộc thôi học (REG-HAUI-04)'
        }
      ];
    } else if (lower.includes('tín chỉ') || lower.includes('tối đa')) {
      answerText = `[AI Advisor]: Căn cứ Điều 14 Quy chế đào tạo HaUI (REG-HAUI-01 / BR-03, BR-04):\n` +
        `• Học kỳ chính: Sinh viên được đăng ký tối thiểu 10 tín chỉ và tối đa 24 tín chỉ (đối với sinh viên có học lực bình thường).\n` +
        `• Học kỳ hè: Sinh viên được đăng ký tối đa 12 tín chỉ để học lại hoặc học vượt.`;
      sources = [
        {
          title: 'Quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội (HaUI)',
          section: 'Điều 14 - Đăng ký khối lượng học tập (REG-HAUI-01)'
        }
      ];
    } else if (lower.includes('cải thiện') || lower.includes('học lại')) {
      answerText = `[AI Advisor]: Căn cứ Điều 15 Quy chế đào tạo HaUI (REG-HAUI-03):\n` +
        `• Học lại: Bắt buộc đối với các học phần bị điểm F (chưa đạt).\n` +
        `• Học cải thiện: Chỉ áp dụng cho các học phần đạt điểm D, D+, C để nâng điểm CPA. Sinh viên đã đạt điểm B trở lên không được phép đăng ký học cải thiện.`;
      sources = [
        {
          title: 'Quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội (HaUI)',
          section: 'Điều 15 - Học lại và học cải thiện điểm (REG-HAUI-03)'
        }
      ];
    } else {
      answerText = `[AI Advisor]: Theo Quy chế đào tạo tín chỉ HaUI, các quy định học vụ áp dụng cho câu hỏi "${trimmed}" được quy định chi tiết tại các văn bản quy chế hiện hành của nhà trường. Bạn có thể tra cứu chi tiết trong sổ tay sinh viên hoặc mục Quy chế đào tạo.`;
    }

    return {
      answer: answerText,
      sources,
      planProposal: null
    };
  }

  // Trường hợp yêu cầu lập lộ trình / kế hoạch học tập (Kịch bản P05)
  return {
    answer: `[AI Advisor]: Dựa trên hồ sơ của bạn (CPA 3.18, 108/145 TC), để đạt mục tiêu cho câu hỏi "${trimmed}", AI đề xuất bạn nên phân bổ 18 tín chỉ ở Kỳ 7: ưu tiên gỡ môn Toán rời rạc (3 TC), cải thiện OOP (4 TC) và 4 môn chuyên ngành.`,
    sources: [
      {
        title: 'Quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội (HaUI)',
        section: 'Điều 14 - Điều kiện tiên quyết & Giới hạn 10-24 TC (BR-03/BR-04)'
      }
    ],
    planProposal: plan || (typeof plannerStore !== 'undefined' ? plannerStore.getPlan() : null)
  };
}

/**
 * Màn hình 2: Trợ lý ảo AI Chatbot Tư vấn Học vụ (AI Advisor Chat) — TV3
 *
 * Thực hiện yêu cầu nghiệp vụ:
 * 1. Tiếp nhận câu hỏi học vụ, gợi ý 4 Quick Prompts thông minh.
 * 2. Cung cấp câu trả lời có căn cứ RAG và đề xuất Phương án Lộ trình (Plan Proposal).
 * 3. Đầy đủ 3 nhánh hành động trên thẻ Phương án đề xuất:
 *    - [Chấp nhận phương án]: Nạp đề xuất vào Planner Store và điều hướng sang /planner.
 *    - [Phương án khác]: Gửi yêu cầu AI tính toán lại phương án thay thế.
 *    - [Hủy đề xuất]: Đóng thẻ đề xuất, giữ nguyên kế hoạch hiện tại.
 * 4. Đầy đủ 3 trạng thái kiểm thử: Empty, Loading, Error.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2
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
  const [toastMessage, setToastMessage] = useState('');

  // ID phiên hội thoại
  const [conversationId] = useState(() => `conv-${Date.now()}`);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  // Xử lý gửi tin nhắn tới API cố vấn học vụ (api.advisor.chat)
  const handleSendMessage = useCallback(async (customText) => {
    const rawText = typeof customText === 'string' ? customText : inputValue;
    if (!rawText || !rawText.trim()) return;

    const trimmed = rawText.trim();

    // 1. Thêm tin nhắn của người dùng vào hội thoại
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

    try {
      let response = null;

      if (api && api.advisor && typeof api.advisor.chat === 'function') {
        response = await api.advisor.chat({
          conversationId,
          message: trimmed,
          clientTimestamp: new Date().toISOString()
        });
      } else {
        // Fallback response mô phỏng khi chưa có API (tuân thủ F23-008: P04 quy chế vs P05 lộ trình)
        response = generateMockChatResponse(trimmed, plannerStore.getPlan());
      }

      // 2. Thêm tin nhắn phản hồi của AI
      const aiMsg = {
        id: `msg-ai-${Date.now()}-${Math.random()}`,
        sender: 'assistant',
        text: response?.answer || 'Hệ thống đã nhận yêu cầu nhưng nội dung trả lời trống.',
        sources: response?.sources || [],
        actions: response?.actions || [],
        planProposal: response?.planProposal || null,
        proposalDismissed: false,
        warnings: response?.warnings || [],
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError({
        code: err?.code || 'CHAT_REQUEST_FAILED',
        message: err?.message || 'Không thể nhận phản hồi từ dịch vụ Trợ lý AI Cố vấn học vụ.',
        details: err?.details || ['Kiểm tra kết nối mạng tới Backend Spring Boot (/api/v1/advisor/chat).']
      });
    } finally {
      setLoading(false);
    }
  }, [api, conversationId, inputValue]);

  // Nhánh hành động 1: Chấp nhận phương án -> Nạp vào Planner
  const handleAcceptProposal = useCallback((msgId, proposal) => {
    if (!proposal) return;
    plannerStore.setIncomingProposal(proposal, 'AI Advisor Chat');
    showToast('Đã chấp nhận phương án của AI! Bạn có thể chuyển sang trang "Kế hoạch học tập" để tinh chỉnh.');

    // Ẩn nút sau khi chấp nhận
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, proposalAccepted: true } : m))
    );

    // Hỗ trợ chuyển route nếu có window navigation
    if (typeof window !== 'undefined') {
      const isReactRouter = window.location.pathname !== '/planner';
      if (isReactRouter && window.location.hash) {
        window.location.hash = '#/planner';
      }
    }
  }, [showToast]);

  // Nhánh hành động 2: Phương án khác -> Re-prompt AI
  const handleRequestAlternative = useCallback((msgId) => {
    handleSendMessage('Hãy đề xuất cho tôi một phương án khác nhẹ tải hơn (dưới 16 tín chỉ) hoặc đẩy bớt môn sang kỳ hè.');
  }, [handleSendMessage]);

  // Nhánh hành động 3: Hủy đề xuất -> Đóng card proposal
  const handleDismissProposal = useCallback((msgId) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, proposalDismissed: true } : m))
    );
    showToast('Đã hủy bỏ đề xuất phương án.');
  }, [showToast]);

  // Xóa toàn bộ hội thoại (Empty test)
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
      details: ['Endpoint POST /api/v1/advisor/chat gặp sự cố mạng hoặc timeout.']
    });
  }, []);

  // Bắt phím Enter để gửi nhanh
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Header trang
  const headerSection = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }
    },
    React.createElement(
      'div',
      null,
      React.createElement(
        'h2',
        { style: { fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 } },
        'Trợ lý Cố vấn Học vụ AI (AI Advisor Chat)'
      ),
      React.createElement(
        'p',
        { style: { color: '#475569', marginTop: '4px', fontSize: '14px' } },
        'Màn hình 2 — Tiếp nhận câu hỏi học vụ bằng tiếng Việt, phân tích bảng điểm, trích dẫn quy chế HaUI và đề xuất phương án kế hoạch.'
      )
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      Button ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: handleClearChat }, 'Xóa chat') : null,
      Button ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: handleSimulateError }, 'Mô phỏng Lỗi') : null
    )
  );

  // Toast thông báo
  const toastBar = toastMessage
    ? React.createElement(
        'div',
        {
          style: {
            padding: '10px 16px',
            marginBottom: '16px',
            borderRadius: '12px',
            background: '#0a0a0a',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        },
        React.createElement('span', null, `✓ ${toastMessage}`),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => setToastMessage(''),
            style: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }
          },
          '×'
        )
      )
    : null;

  // Trạng thái Error
  if (error) {
    return React.createElement(
      'div',
      { className: 'haui-page-container', style: { padding: '24px 0' } },
      headerSection,
      ErrorBox
        ? React.createElement(ErrorBox, {
            title: 'Không thể kết nối với Trợ lý AI',
            error,
            message: error?.message,
            onRetry: () => setError(null),
            retryLabel: 'Thử lại'
          })
        : React.createElement('div', { style: { color: 'red' } }, error?.message)
    );
  }

  return React.createElement(
    'div',
    { className: 'haui-page-container haui-chat-page', style: { padding: '24px 0' } },
    headerSection,
    toastBar,

    // Layout chính: Khung Chat bên trái + Thẻ hồ sơ bên phải
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'flex-start'
        }
      },
      // CỘT 1: KHU VỰC HỘI THOẠI CHAT (2 phần 3 chiều rộng nếu màn lớn)
      React.createElement(
        'div',
        { style: { gridColumn: 'span 2', minWidth: '320px' } },
        Card
          ? React.createElement(
              Card,
              {
                title: 'Hội thoại Cố vấn Lộ trình',
                subtitle: 'Hệ thống đối chiếu trực tiếp dữ liệu học tập cá nhân và quy chế đào tạo tín chỉ HaUI.',
                variant: 'default',
                padding: 'md'
              },
              // 1. Vùng tin nhắn
              React.createElement(
                'div',
                {
                  style: {
                    minHeight: '360px',
                    maxHeight: '520px',
                    overflowY: 'auto',
                    padding: '12px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }
                },
                messages.length === 0
                  ? EmptyState
                    ? React.createElement(EmptyState, {
                        title: 'Chào bạn! Tôi là Trợ lý Cố vấn Học vụ HaUI',
                        description: 'Hãy chọn một câu hỏi gợi ý bên dưới hoặc nhập thắc mắc về lộ trình, nợ môn, học cải thiện để tôi hỗ trợ.',
                        actionLabel: 'Tư vấn kéo CPA lên Giỏi',
                        onAction: () => handleSendMessage(QUICK_PROMPTS_MAN_2[0])
                      })
                    : React.createElement('div', { style: { textAlign: 'center', color: '#64748b' } }, 'Chưa có tin nhắn nào.')
                  : messages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return React.createElement(
                        'div',
                        {
                          key: msg.id,
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isUser ? 'flex-end' : 'flex-start',
                            gap: '4px'
                          }
                        },
                        // Bubble tin nhắn
                        React.createElement(
                          'div',
                          {
                            style: {
                              maxWidth: '85%',
                              padding: '12px 16px',
                              borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              background: isUser ? '#0a0a0a' : 'var(--color-surface-alt, #fafafa)',
                              color: isUser ? '#ffffff' : '#0f172a',
                              border: isUser ? 'none' : '1px solid var(--color-hairline, #e5e5e5)',
                              fontSize: '14px',
                              lineHeight: 1.5
                            }
                          },
                          React.createElement('div', null, msg.text),

                          // Khối RAG Citations
                          msg.sources && msg.sources.length > 0
                            ? React.createElement(
                                'div',
                                {
                                  style: {
                                    marginTop: '8px',
                                    paddingTop: '8px',
                                    borderTop: '1px solid #e2e8f0',
                                    fontSize: '11px',
                                    color: '#64748b'
                                  }
                                },
                                React.createElement('strong', null, '📖 Nguồn tham khảo & Quy chế: '),
                                msg.sources.map((s, sIdx) =>
                                  React.createElement('div', { key: sIdx }, `• ${s.title || s} (${s.section || ''})`)
                                )
                              )
                            : null
                        ),

                        // THẺ ĐỀ XUẤT PHƯƠNG ÁN (PLAN PROPOSAL CARD) — Có 3 nhánh
                        !isUser && msg.planProposal && !msg.proposalDismissed
                          ? React.createElement(
                              'div',
                              {
                                style: {
                                  maxWidth: '88%',
                                  marginTop: '8px',
                                  padding: '14px 16px',
                                  borderRadius: '16px',
                                  background: '#ffffff',
                                  border: '1.5px solid #0284c7',
                                  boxShadow: '0 2px 8px rgba(2,132,199,0.08)'
                                }
                              },
                              React.createElement(
                                'div',
                                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                React.createElement(
                                  'strong',
                                  { style: { color: '#0369a1', fontSize: '13px' } },
                                  '📋 Đề xuất Phương án Lộ trình Học tập mới'
                                ),
                                React.createElement(
                                  'span',
                                  {
                                    style: {
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      padding: '2px 6px',
                                      borderRadius: '4px'
                                    }
                                  },
                                  msg.proposalAccepted ? '✓ Đã chấp nhận' : 'Chờ bạn xem xét'
                                )
                              ),
                              React.createElement(
                                'div',
                                { style: { fontSize: '12px', color: '#475569', marginTop: '6px' } },
                                `Học kỳ 1 (2026-2027): 18 tín chỉ · CPA dự kiến: ${msg.planProposal.projectedCpa || '3.25'} (Bằng Giỏi) · 6 học phần cân bằng tải.`
                              ),
                              // 3 NHÁNH HÀNH ĐỘNG
                              !msg.proposalAccepted
                                ? React.createElement(
                                    'div',
                                    { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
                                    Button
                                      ? React.createElement(
                                          Button,
                                          {
                                            variant: 'primary',
                                            size: 'sm',
                                            onClick: () => handleAcceptProposal(msg.id, msg.planProposal)
                                          },
                                          '✓ Chấp nhận phương án'
                                        )
                                      : null,
                                    Button
                                      ? React.createElement(
                                          Button,
                                          {
                                            variant: 'secondary',
                                            size: 'sm',
                                            onClick: () => handleRequestAlternative(msg.id)
                                          },
                                          '🔄 Phương án khác'
                                        )
                                      : null,
                                    Button
                                      ? React.createElement(
                                          Button,
                                          {
                                            variant: 'ghost',
                                            size: 'sm',
                                            onClick: () => handleDismissProposal(msg.id)
                                          },
                                          '✕ Hủy'
                                        )
                                      : null
                                  )
                                : React.createElement(
                                    'div',
                                    { style: { marginTop: '8px', fontSize: '12px', color: '#16a34a', fontWeight: 600 } },
                                    '✓ Đã nạp thành công vào Study Planner. Bạn có thể mở tab "Kế hoạch học tập" để xem toàn bộ các kỳ.'
                                  )
                            )
                          : null,

                        React.createElement(
                          'span',
                          { style: { fontSize: '10px', color: '#94a3b8', margin: '2px 4px' } },
                          msg.timestamp
                        )
                      );
                    }),
                loading
                  ? Loading
                    ? React.createElement(Loading, { variant: 'spinner', size: 'sm', label: 'AI đang phân tích bảng điểm và quy chế...' })
                    : React.createElement('div', null, 'AI đang suy nghĩ...')
                  : null
              ),

              // 2. 4 Quick Prompts Pills
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    padding: '8px 0',
                    borderTop: '1px solid #f1f5f9'
                  }
                },
                QUICK_PROMPTS_MAN_2.map((pill, pIdx) =>
                  React.createElement(
                    'button',
                    {
                      key: pIdx,
                      type: 'button',
                      onClick: () => handleSendMessage(pill),
                      disabled: loading,
                      style: {
                        padding: '6px 12px',
                        borderRadius: '18px',
                        background: '#f8fafc',
                        border: '1px solid var(--color-hairline, #e5e5e5)',
                        fontSize: '12px',
                        color: '#0f172a',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }
                    },
                    `💬 ${pill}`
                  )
                )
              ),

              // 3. Khung nhập tin nhắn
              React.createElement(
                'div',
                { style: { display: 'flex', gap: '8px', marginTop: '12px' } },
                React.createElement('input', {
                  type: 'text',
                  placeholder: 'Nhập câu hỏi về lộ trình, quy chế, nợ môn hoặc tính điểm...',
                  value: inputValue,
                  onChange: (e) => setInputValue(e.target.value),
                  onKeyDown: handleKeyDown,
                  disabled: loading,
                  style: {
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '18px',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    fontSize: '14px',
                    outline: 'none'
                  }
                }),
                Button
                  ? React.createElement(
                      Button,
                      {
                        variant: 'primary',
                        size: 'md',
                        loading,
                        onClick: () => handleSendMessage()
                      },
                      'Gửi tin nhắn'
                    )
                  : React.createElement('button', { onClick: () => handleSendMessage() }, 'Gửi')
              )
            )
          : null
      ),

      // CỘT 2: THẺ HỒ SƠ & TRẠNG THÁI HỌC VỤ BÊN CẠNH
      React.createElement(
        'div',
        { style: { minWidth: '260px' } },
        Card
          ? React.createElement(
              Card,
              {
                title: 'Hồ sơ sinh viên nạp vào AI',
                subtitle: 'Dữ liệu tin cậy trích xuất từ CSDL',
                variant: 'default',
                padding: 'sm'
              },
              React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' } },
                React.createElement(
                  'div',
                  null,
                  React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'Sinh viên'),
                  React.createElement('strong', { style: { color: '#0f172a' } }, 'Nguyễn Văn An (2020601234)'),
                  React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'K16 Kỹ thuật phần mềm (CNTT)')
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'CPA hiện tại'),
                  React.createElement('strong', { style: { color: '#0284c7', fontSize: '16px' } }, '3.18 / 4.00 '),
                  React.createElement('span', { style: { color: '#16a34a', fontSize: '11px' } }, '(Tiệm cận bằng Giỏi)')
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'Tín chỉ tích lũy'),
                  React.createElement('strong', { style: { color: '#0f172a' } }, '108 / 145 TC (74.5%)'),
                  React.createElement('div', { style: { fontSize: '11px', color: '#dc2626' } }, '⚠️ Nợ 1 môn F (MATH1002 - Toán rời rạc)')
                ),
                React.createElement(
                  'div',
                  null,
                  React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'Phiên bản kế hoạch'),
                  React.createElement('strong', { style: { color: '#0f172a' } }, 'Bản nháp v2.4 (Đa kỳ)')
                )
              )
            )
          : null
      )
    )
  );
}

export default ChatAdvisorPage;
