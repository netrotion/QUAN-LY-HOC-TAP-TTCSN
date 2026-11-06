import React, { useState, useCallback, useEffect, useRef } from 'react';
import { plannerStore, PLAN_STATUSES } from '../services/plannerStore.js';
import * as plannerApi from '../services/plannerApiService.js';
import { MarkdownContent } from '../components/MarkdownContent.js';

/**
 * 4 Gợi ý câu hỏi thông minh (Quick Prompt Pills) chuẩn Màn hình 2 UI Flow & prototype `ai_advisor`
 */
export const QUICK_PROMPTS_MAN_2 = Object.freeze([
  'Dự báo điểm GPA Kỳ 7 để tốt nghiệp loại Giỏi (CPA ≥ 3.20)?',
  'Mình muốn kiểm tra môn học trước và tiên quyết của một học phần.',
  'Kế hoạch Kỳ 8 nếu đăng ký 15 TC có bị quá tải không?',
  'Tôi còn thiếu chứng chỉ chuẩn đầu ra nào theo quy chế?'
]);

/**
 * Màn hình 2: Trợ lý ảo AI Chatbot Tư vấn Học vụ (AI Advisor Chat) — TV3
 * Tái thiết kế toàn diện theo Stitch Prototype `ai_advisor/code.html`:
 * - Layout 2 cột: 8 cols (Khu vực hội thoại & Quick Prompts) / 4 cols (Hồ sơ nạp vào AI & Khối tra cứu)
 * - Thẻ đề xuất kế hoạch (Plan Proposal Card) với 3 nhánh: [Chấp nhận] -> Planner, [Phương án khác], [Hủy]
 * - Thẻ cảnh báo dữ liệu (Data Warning Card) kèm action điều hướng
 * - Hộp tính toán công thức GPA/CPA mục tiêu chi tiết
 * - Nút đính kèm mở luồng nhập bảng điểm chung TV2 (/transcript)
 * - Khối Gợi ý chủ đề hỏi đáp nhanh tương tác 1-click
 */
export function ChatAdvisorPage({
  api,
  ui,
  onOpenTranscript,
  onOpenPlanner,
  onNavigate,
  initialMessages = undefined,
  initialError = null
} = {}) {
  const { Button, Card, Loading, Error: ErrorBox, EmptyState } = ui || {};

  // State hội thoại — mặc định khởi đầu sạch (Empty State) để người dùng tự chọn câu hỏi hoặc gõ tin nhắn
  const [messages, setMessages] = useState(() => {
    if (initialMessages !== undefined && initialMessages !== null) {
      return initialMessages;
    }
    return [];
  });

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [toastMessage, setToastMessage] = useState('');
  const [lastFailedQuery, setLastFailedQuery] = useState(null);

  // Sinh viên hiện tại từ apiConfig
  const [student, setStudent] = useState(() => api?.getConfig?.()?.sessionStudent || null);

  useEffect(() => {
    if (api && typeof api.subscribe === 'function') {
      return api.subscribe((config) => {
        setStudent(config.sessionStudent);
      });
    }
  }, [api]);

  // Đồng bộ CPA & Tín chỉ từ Tổng quan học tập
  useEffect(() => {
    if (api && api.academic && typeof api.academic.getStatus === 'function') {
      api.academic.getStatus().then((status) => {
        if (status) {
          setStudent((prev) => ({
            ...(prev || {}),
            cpa: status.cpa ?? prev?.cpa,
            accumulatedCredits: status.accumulatedCredits ?? prev?.accumulatedCredits,
            totalCreditsRequired: status.totalCreditsRequired ?? prev?.totalCreditsRequired
          }));
        }
      }).catch(() => {});
    }
  }, [api]);

  useEffect(() => {
    const handleTranscriptUpdated = (e) => {
      if (e?.detail?.snapshot?.student) {
        setStudent(e.detail.snapshot.student);
      }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
      return () => window.removeEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
    }
  }, []);

  // ID phiên hội thoại (Conversation ID chuẩn UUID theo OpenAPI V1)
  const [conversationId, setConversationId] = useState(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'c1111111-2222-3333-4444-555555555555';
  });
  const messagesContainerRef = useRef(null);
  const isInitialMount = useRef(true);

  // Lịch sử hội thoại đã lưu trên server (không có ở chế độ mock)
  const historyEnabled = Boolean(api) && typeof api.isMockMode === 'function' && !api.isMockMode();
  const [conversations, setConversations] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [openingConversationId, setOpeningConversationId] = useState(null);

  const loadConversations = useCallback(async () => {
    if (!historyEnabled) return;
    try {
      setConversations(await plannerApi.listConversations(api));
      setHistoryError(null);
    } catch (err) {
      setHistoryError(err?.message || 'Không tải được lịch sử hội thoại.');
    }
  }, [api, historyEnabled]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  // Cuộn xuống tin nhắn mới nhất khi có tương tác (không tự nhảy xuống đáy lúc vừa mở trang)
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading, scrollToBottom]);

  // Điều hướng an toàn hỗ trợ cả HashRouter và BrowserRouter
  const navigateTo = useCallback((path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
      return;
    }
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.hash) {
        window.location.hash = `#${path.startsWith('/') ? path : '/' + path}`;
      } else {
        window.location.pathname = path;
      }
    }
  }, [onNavigate]);

  // Xử lý nút đính kèm -> mở luồng nhập bảng điểm chung của TV2 (/transcript)
  const handleAttachmentClick = useCallback(() => {
    showToast('Đang chuyển đến luồng Nhập bảng điểm chung của TV2 (/transcript)...');
    if (typeof onOpenTranscript === 'function') {
      onOpenTranscript();
    } else {
      navigateTo('/transcript');
    }
  }, [onOpenTranscript, navigateTo, showToast]);

  // Xử lý gửi tin nhắn tới API cố vấn học vụ (api.advisor.chat / POST /advisor/chat)
  const handleSendMessage = useCallback(async (customText) => {
    const rawText = typeof customText === 'string' ? customText : inputValue;
    if (!rawText || !rawText.trim()) return;

    const trimmed = rawText.trim();

    // 1. Thêm tin nhắn của người dùng vào dòng hội thoại
    const userMsgId = `msg-user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      senderName: student?.fullName || 'Nguyễn Văn An',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      failed: false
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);
    setError(null);
    setLastFailedQuery(trimmed);

    try {
      let response = null;

      // Ưu tiên gọi API thật POST /advisor/chat qua plannerApi hoặc api client
      if (api && (api.advisor?.chat || typeof api.post === 'function')) {
        response = await plannerApi.chatAdvisor(api, {
          conversationId,
          message: trimmed,
          clientTimestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Chưa cấu hình kết nối API cố vấn học vụ.');
      }

      // 2. Thêm tin nhắn phản hồi của AI vào hội thoại (chỉ khi có câu trả lời thật từ server)
      const aiMsg = {
        id: `msg-ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        sender: 'assistant',
        text: response?.answer || 'Hệ thống đã nhận yêu cầu nhưng nội dung trả lời trống.',
        calculationData: response?.calculationData || null,
        targetData: response?.targetData || null,
        subcards: response?.subcards || null,
        warningData: response?.warningData || null,
        checklistData: response?.checklistData || null,
        sources: response?.sources || [],
        actions: response?.actions || [],
        planProposal: response?.planProposal || null,
        proposalAccepted: false,
        proposalDismissed: false,
        warnings: response?.warnings || [],
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLastFailedQuery(null);
      loadConversations();
    } catch (err) {
      const isUnavailable =
        err?.status === 503 ||
        err?.code === 'AI_UNAVAILABLE' ||
        err?.body?.code === 'AI_UNAVAILABLE';
      const isBusy =
        err?.status === 409 ||
        err?.code === 'CONVERSATION_BUSY' ||
        err?.body?.code === 'CONVERSATION_BUSY';

      const errMsg = isUnavailable
        ? 'Trợ lý AI chưa sẵn sàng hoặc quá tải (503 AI_UNAVAILABLE). Vui lòng thử lại sau.'
        : isBusy
          ? 'Hội thoại đang bận do lượt ghi khác (409 CONVERSATION_BUSY). Vui lòng thử lại.'
          : (err?.message || 'Không thể nhận phản hồi từ dịch vụ Trợ lý AI Cố vấn học vụ.');

      setError({
        code: err?.code || (isUnavailable ? 'AI_UNAVAILABLE' : isBusy ? 'CONVERSATION_BUSY' : 'CHAT_REQUEST_FAILED'),
        status: err?.status,
        retryable: isUnavailable || isBusy || Boolean(err?.retryable),
        retryAfter: err?.retryAfter || (isUnavailable ? 5 : undefined),
        message: errMsg,
        details: err?.details || [
          isUnavailable
            ? 'AI_UNAVAILABLE: retryable=true, header Retry-After'
            : 'Kiểm tra kết nối mạng tới Backend Spring Boot (/api/v1/advisor/chat).'
        ]
      });

      // Đánh dấu tin nhắn gần nhất bị lỗi để người dùng có thể Thử lại
      // TUYỆT ĐỐI KHÔNG hiển thị câu trả lời giả mạo khi AI lỗi
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsgId ? { ...m, failed: true, errorText: errMsg } : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [api, conversationId, inputValue, student, loadConversations]);

  // Mở lại một hội thoại đã lưu: tin nhắn gửi tiếp sẽ nối vào đúng hội thoại này
  const handleOpenConversation = useCallback(async (id) => {
    if (loading || openingConversationId) return;
    setOpeningConversationId(id);
    try {
      const record = await plannerApi.getConversation(api, id);
      setMessages(plannerApi.conversationToMessages(record, student?.fullName || ''));
      setConversationId(id);
      setError(null);
      setLastFailedQuery(null);
    } catch (err) {
      showToast(err?.message || 'Không mở được hội thoại này.');
    } finally {
      setOpeningConversationId(null);
    }
  }, [api, loading, openingConversationId, showToast, student]);

  // Xử lý Thử lại (Retry) khi gửi tin nhắn thất bại
  const handleRetry = useCallback((textToRetry, failedMsgId) => {
    if (failedMsgId) {
      setMessages((prev) => prev.filter((m) => m.id !== failedMsgId));
    }
    setError(null);
    handleSendMessage(textToRetry || lastFailedQuery);
  }, [handleSendMessage, lastFailedQuery]);

  // Nhánh hành động 1: Chấp nhận phương án -> Nạp vào Planner và mở Planner
  const handleAcceptProposal = useCallback((msgId, proposal) => {
    if (!proposal) return;
    plannerStore.setIncomingProposal(proposal, 'AI Advisor Chat');
    plannerStore.acceptProposal();
    showToast('Đã chấp nhận phương án! Đang mở Study Planner để xem xét chi tiết...');

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, proposalAccepted: true } : m))
    );

    if (typeof onOpenPlanner === 'function') {
      onOpenPlanner();
    } else {
      navigateTo('/planner');
    }
  }, [showToast, onOpenPlanner, navigateTo]);

  // Nhánh hành động 2: Phương án khác -> Re-prompt AI
  const handleRequestAlternative = useCallback(() => {
    handleSendMessage('Hãy đề xuất cho tôi một phương án khác nhẹ tải hơn (dưới 16 tín chỉ) hoặc đẩy bớt môn sang kỳ hè.');
  }, [handleSendMessage]);

  // Nhánh hành động 3: Hủy đề xuất -> Đóng card proposal
  const handleDismissProposal = useCallback((msgId) => {
    plannerStore.rejectProposal();
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, proposalDismissed: true } : m))
    );
    showToast('Đã hủy bỏ đề xuất phương án, giữ nguyên kế hoạch hiện tại.');
  }, [showToast]);

  // Bắt đầu phiên hội thoại mới (Làm mới phiên chat với UUID mới)
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setInputValue('');
    setLastFailedQuery(null);
    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `c${Date.now()}-2222-3333-4444-555555555555`;
    setConversationId(newId);
    showToast('Đã làm mới phiên chat. Bạn có thể bắt đầu với câu hỏi mới!');
  }, [showToast]);

  // Bắt phím Enter để gửi nhanh
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Sao chép tin nhắn
  const handleCopyText = (text) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Đã sao chép câu trả lời vào bộ nhớ tạm!');
    }
  };

  return React.createElement(
    'div',
    { className: 'haui-page-container haui-chat-container' },

    // 1. Top Breadcrumb & Page Header Card
    React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
      React.createElement(
        'nav',
        {
          className: 'haui-breadcrumb',
          'aria-label': 'Đường dẫn trang'
        },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'haui-breadcrumb__home',
            onClick: () => navigateTo('/'),
          },
          React.createElement('span', { className: 'material-symbols-outlined haui-breadcrumb__icon', 'aria-hidden': 'true' }, 'home'),
          'Trang chủ'
        ),
        React.createElement('span', { className: 'haui-breadcrumb__separator', 'aria-hidden': 'true' }, '/'),
        React.createElement('span', { className: 'haui-breadcrumb__current', 'aria-current': 'page' }, 'Tư vấn AI & Lộ trình học tập')
      ),
      React.createElement(
        'div',
        {
          style: {
            backgroundColor: 'var(--color-paper, #ffffff)',
            borderRadius: 'var(--heroui-radius-xl, 24px)',
            border: '1px solid var(--color-hairline, #e5e5e5)',
            padding: '24px',
            boxShadow: 'var(--heroui-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04))',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px'
          }
        },
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', maxWidth: '780px' } },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
            React.createElement(
              'span',
              {
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-ink, #0a0a0a)'
                }
              },
              React.createElement('span', {
                style: {
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-ink, #0a0a0a)'
                }
              }),
              'Mô hình HaUI Academic v2.4'
            )
          ),
          React.createElement(
            'h1',
            {
              style: {
                fontSize: '30px',
                fontWeight: 600,
                color: 'var(--color-ink, #0a0a0a)',
                margin: 0,
                letterSpacing: '-0.5px'
              }
            },
            'Tư vấn học tập thông minh (AI Advisor)'
          ),
          React.createElement(
            'p',
            { style: { margin: '6px 0 0', fontSize: '14px', color: 'var(--color-mid-gray, #737373)', lineHeight: 1.5 } },
            'Hỏi đáp, phân tích tiến độ, tra cứu điều kiện tiên quyết và xây dựng lộ trình học tập tối ưu dựa trên dữ liệu học tập cá nhân.'
          )
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'haui-pill-btn-canvas',
              onClick: handleNewConversation,
              title: 'Làm mới phiên hội thoại'
            },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'refresh'),
            React.createElement('span', null, 'Làm mới phiên chat')
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'haui-pill-btn-canvas',
              onClick: () => window.print(),
              title: 'Lưu hoặc in hội thoại dưới dạng PDF'
            },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'download'),
            React.createElement('span', null, 'Lưu hội thoại (.pdf)')
          )
        )
      )
    ),

    // Toast thông báo
    toastMessage
      ? React.createElement(
          'div',
          {
            style: {
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 100,
              backgroundColor: 'var(--color-ink, #0a0a0a)',
              color: 'var(--color-paper, #ffffff)',
              padding: '12px 20px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.16)'
            }
          },
          React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'check_circle'),
          React.createElement('span', null, toastMessage)
        )
      : null,

    // Lỗi chung nếu có
    error
      ? ErrorBox
        ? React.createElement(ErrorBox, {
            title: 'Sự cố kết nối với Trợ lý AI',
            error,
            message: error?.message,
            onRetry: () => handleRetry(lastFailedQuery),
            retryLabel: 'Thử lại câu hỏi'
          })
        : React.createElement(
            'div',
            {
              style: {
                padding: '12px 16px',
                borderRadius: '16px',
                backgroundColor: '#fff1f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px'
              }
            },
            React.createElement('span', null, `${error?.message}`),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => handleRetry(lastFailedQuery),
                className: 'haui-pill-btn-dark',
                style: { fontSize: '12px', padding: '4px 12px' }
              },
              'Thử lại'
            )
          )
      : null,

    // 2. Main Workspace Split: 8 cols (Khu vực Chat) & 4 cols (Sidebar ngữ cảnh)
    React.createElement(
      'div',
      { className: 'haui-chat-grid' },

      // CỘT TRÁI (8 COLS): KHU VỰC HỘI THOẠI & QUICK PROMPTS
      React.createElement(
        'section',
        { className: 'haui-chat-col-main', style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

        // Quick Starter Prompt Chips Card
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              borderRadius: 'var(--heroui-radius-xl, 24px)',
              padding: '16px 20px',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              boxShadow: 'var(--heroui-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }
          },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-mid-gray, #737373)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              },
              React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'bolt'),
              'Gợi ý câu hỏi phân tích nhanh'
            ),
            React.createElement(
              'span',
              { style: { fontSize: '12px', color: 'var(--color-mid-gray, #737373)' } },
              'Nhấp để điền nhanh'
            )
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
            QUICK_PROMPTS_MAN_2.map((pill, idx) =>
              React.createElement(
                'button',
                {
                  key: idx,
                  type: 'button',
                  className: 'haui-chat-prompt-chip',
                  onClick: () => handleSendMessage(pill),
                  disabled: loading
                },
                pill
              )
            )
          )
        ),

        // Dòng hội thoại tin nhắn (Conversation Stream)
        React.createElement(
          'div',
          { ref: messagesContainerRef, className: 'haui-chat-stream', style: { display: 'flex', flexDirection: 'column', gap: '24px' } },
          messages.length === 0
            ? React.createElement(
                'div',
                {
                  style: {
                    backgroundColor: 'var(--color-paper, #ffffff)',
                    borderRadius: 'var(--heroui-radius-xl, 24px)',
                    padding: '48px 24px',
                    textAlign: 'center',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    boxShadow: 'var(--heroui-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04))',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-canvas)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-ink)'
                    }
                  },
                  React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '24px' } }, 'smart_toy')
                ),
                React.createElement(
                  'h3',
                  { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' } },
                  'Bắt đầu phiên tư vấn học tập với AI Advisor'
                ),
                React.createElement(
                  'p',
                  { style: { margin: 0, fontSize: '13px', color: 'var(--color-mid-gray)', maxWidth: '420px' } },
                  'Hãy chọn một câu hỏi gợi ý phía trên hoặc nhập câu hỏi cụ thể về điểm GPA, môn tiên quyết, quy chế đào tạo tín chỉ HaUI.'
                )
              )
            : messages.map((msg) => {
                const isUser = msg.sender === 'user';

                // TIN NHẮN CỦA SINH VIÊN (USER MESSAGE)
                if (isUser) {
                  return React.createElement(
                    'div',
                    {
                      key: msg.id,
                      style: {
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'flex-start',
                        gap: '10px',
                        paddingLeft: '32px'
                      }
                    },
                    React.createElement(
                      'div',
                      { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '82%' } },
                      React.createElement(
                        'div',
                        { className: 'haui-chat-bubble-user' },
                        React.createElement('p', { style: { margin: 0, whiteSpace: 'pre-line' } }, msg.text)
                      ),
                      React.createElement(
                        'span',
                        { style: { fontSize: '11px', color: 'var(--color-mid-gray)', marginTop: '4px', marginRight: '6px' } },
                        `${msg.timestamp || '14:22'} • ${msg.senderName || student?.fullName || 'Nguyễn Văn An'}`
                      ),
                      msg.failed
                        ? React.createElement(
                            'div',
                            { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' } },
                            React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-ember)' } }, 'Không thể gửi tin nhắn'),
                            React.createElement(
                              'button',
                              {
                                type: 'button',
                                onClick: () => handleRetry(msg.text, msg.id),
                                style: {
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: 'var(--color-ember)',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: 'pointer'
                                }
                              },
                              'Thử lại'
                            )
                          )
                        : null
                    ),
                    React.createElement(
                      'div',
                      {
                        style: {
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-ink, #0a0a0a)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '4px'
                        }
                      },
                      React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'person')
                    )
                  );
                }

                // TIN NHẮN CỦA TRỢ LÝ AI (AI ADVISOR RESPONSE)
                return React.createElement(
                  'div',
                  {
                    key: msg.id,
                    style: {
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      gap: '10px',
                      paddingRight: '16px'
                    }
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-canvas, #f5f5f5)',
                        border: '1px solid var(--color-hairline, #e5e5e5)',
                        color: 'var(--color-ink, #0a0a0a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '4px'
                      }
                    },
                    React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'auto_awesome')
                  ),
                  React.createElement(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', maxWidth: '92%' } },
                    React.createElement(
                      'div',
                      { className: 'haui-chat-ai-card' },

                      // Status Tag Header
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingBottom: '10px',
                            borderBottom: '1px solid var(--color-hairline, #e5e5e5)'
                          }
                        },
                        React.createElement(
                          'div',
                          { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                          React.createElement('span', { style: { fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Cố vấn học tập AI (HaUI Advisor)'),
                          React.createElement('span', { style: { fontSize: '12px', color: 'var(--color-mid-gray)' } }, '• Phân tích mô phỏng GPA')
                        ),
                        React.createElement(
                          'span',
                          {
                            style: {
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: 'var(--color-canvas)',
                              fontSize: '11px',
                              color: 'var(--color-mid-gray)'
                            }
                          },
                          React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '14px' } }, 'verified'),
                          'Công thức thang 4'
                        )
                      ),

                      // Text body (Render Markdown, GFM tables, and LaTeX math formulas safely)
                      React.createElement(MarkdownContent, { content: msg.text }),

                      // KHỐI 1: Công thức tính toán chi tiết (Calculation Data Breakdown)
                      msg.calculationData
                        ? React.createElement(
                            'div',
                            {
                              style: {
                                backgroundColor: 'var(--color-canvas, #f5f5f5)',
                                borderRadius: '18px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }
                            },
                            React.createElement(
                              'div',
                              { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' } },
                              React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'calculate'),
                              msg.calculationData.title || 'Phân tích công thức tính điểm tích lũy:'
                            ),
                            React.createElement(
                              'ul',
                              { style: { margin: 0, paddingLeft: '4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--color-ink)' } },
                              msg.calculationData.items?.map((it, itIdx) =>
                                React.createElement(
                                  'li',
                                  { key: itIdx, style: { display: 'flex', alignItems: 'flex-start', gap: '6px' } },
                                  React.createElement('span', { style: { fontWeight: 700 } }, '•'),
                                  React.createElement('span', null, it)
                                )
                              )
                            )
                          )
                        : null,

                      // KHỐI 2: Thẻ Mục tiêu Cần Đạt (Target Recommendation Badge)
                      msg.targetData
                        ? React.createElement(
                            'div',
                            {
                              style: {
                                backgroundColor: 'var(--color-surface-alt, #fafafa)',
                                border: '1px solid var(--color-hairline, #e5e5e5)',
                                borderRadius: '18px',
                                padding: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                              }
                            },
                            React.createElement(
                              'div',
                              {
                                style: {
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--color-ink, #0a0a0a)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }
                              },
                              React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '20px' } }, 'flag')
                            ),
                            React.createElement(
                              'div',
                              { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
                              React.createElement(
                                'span',
                                { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 } },
                                msg.targetData.label || 'Mục tiêu cần hoàn thành ở Kỳ 7'
                              ),
                              React.createElement(
                                'strong',
                                { style: { fontSize: '16px', color: 'var(--color-ink)', textDecoration: 'underline', textUnderlineOffset: '4px' } },
                                msg.targetData.target
                              ),
                              React.createElement(
                                'p',
                                { style: { margin: '2px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)', lineHeight: 1.4 } },
                                msg.targetData.description
                              )
                            )
                          )
                        : null,

                      // KHỐI 3: 2 Subcards Trích xuất Dữ liệu & Nguồn quy chế
                      msg.subcards && msg.subcards.length > 0
                        ? React.createElement(
                            'div',
                            {
                              style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                gap: '12px'
                              }
                            },
                            msg.subcards.map((sc, scIdx) =>
                              React.createElement(
                                'div',
                                {
                                  key: scIdx,
                                  style: {
                                    backgroundColor: 'var(--color-surface-alt, #fafafa)',
                                    border: '1px solid var(--color-hairline, #e5e5e5)',
                                    borderRadius: '18px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                  }
                                },
                                React.createElement(
                                  'div',
                                  null,
                                  React.createElement(
                                    'div',
                                    { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' } },
                                    React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px', color: 'var(--color-mid-gray)' } }, sc.icon || 'info'),
                                    sc.title
                                  ),
                                  React.createElement(
                                    'ul',
                                    { style: { margin: 0, paddingLeft: '4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--color-mid-gray)' } },
                                    sc.items?.map((it, iIdx) =>
                                      React.createElement(
                                        'li',
                                        { key: iIdx, style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                                        React.createElement('span', { style: { width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-ink)' } }),
                                        it
                                      )
                                    )
                                  )
                                ),
                                sc.footer
                                  ? React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray)', marginTop: '8px', display: 'block' } }, sc.footer)
                                  : null,
                                sc.note
                                  ? React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray)', fontStyle: 'italic', marginTop: '8px', lineHeight: 1.3, display: 'block' } }, sc.note)
                                  : null
                              )
                            )
                          )
                        : null,

                      // KHỐI 4: Thẻ Cảnh báo Thiếu dữ liệu (Data Warning Banner)
                      msg.warningData
                        ? React.createElement(
                            'div',
                            {
                              style: {
                                backgroundColor: '#fff5f5',
                                border: '1px solid #fee2e2',
                                borderRadius: '18px',
                                padding: '16px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px'
                              }
                            },
                            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '22px', color: 'var(--color-ember, #e7000b)', flexShrink: 0, marginTop: '2px' } }, 'warning'),
                            React.createElement(
                              'div',
                              { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                              React.createElement('strong', { style: { fontSize: '14px', color: '#991b1b' } }, msg.warningData.title),
                              React.createElement('p', { style: { margin: 0, fontSize: '13px', color: 'var(--color-ink)', lineHeight: 1.5 } }, msg.warningData.description)
                            )
                          )
                        : null,

                      // KHỐI 5: Checklist Điều kiện cơ bản
                      msg.checklistData
                        ? React.createElement(
                            'div',
                            { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                            React.createElement(
                              'span',
                              { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 } },
                              msg.checklistData.title
                            ),
                            React.createElement(
                              'div',
                              { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' } },
                              msg.checklistData.items?.map((ck, cIdx) =>
                                React.createElement(
                                  'div',
                                  {
                                    key: cIdx,
                                    style: {
                                      padding: '10px 14px',
                                      borderRadius: '12px',
                                      backgroundColor: 'var(--color-canvas, #f5f5f5)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      fontSize: '12px',
                                      color: ck.done ? 'var(--color-ink)' : 'var(--color-mid-gray)'
                                    }
                                  },
                                  React.createElement(
                                    'span',
                                    {
                                      className: 'material-symbols-outlined',
                                      style: {
                                        fontSize: '16px',
                                        color: ck.done ? '#16a34a' : 'var(--color-ember, #e7000b)'
                                      }
                                    },
                                    ck.done ? 'check_circle' : 'cancel'
                                  ),
                                  React.createElement('span', null, ck.text)
                                )
                              )
                            )
                          )
                        : null,

                      // Nút hành động đính kèm của Warning
                      msg.actions && msg.actions.length > 0 && !msg.planProposal
                        ? React.createElement(
                            'div',
                            { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' } },
                            msg.actions.map((act) =>
                              React.createElement(
                                'button',
                                {
                                  key: act.id,
                                  type: 'button',
                                  className: act.primary ? 'haui-pill-btn-dark' : 'haui-pill-btn-canvas',
                                  onClick: () => {
                                    if (act.route === '/transcript') {
                                      handleAttachmentClick();
                                    } else {
                                      navigateTo(act.route);
                                    }
                                  }
                                },
                                act.icon ? React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, act.icon) : null,
                                React.createElement('span', null, act.label)
                              )
                            )
                          )
                        : null,

                      // KHỐI 6: Thẻ Đề Xuất Phương Án Lộ Trình (Plan Proposal Card)
                      msg.planProposal && !msg.proposalDismissed
                        ? React.createElement(
                            'div',
                            {
                              style: {
                                backgroundColor: 'var(--color-surface-alt, #fafafa)',
                                border: '1.5px solid var(--color-ink, #0a0a0a)',
                                borderRadius: '18px',
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                              }
                            },
                            React.createElement(
                              'div',
                              { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                              React.createElement('strong', { style: { fontSize: '14px', color: 'var(--color-ink)' } }, 'Đề xuất Phương án Lộ trình Học tập mới'),
                              React.createElement(
                                'span',
                                {
                                  style: {
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    backgroundColor: msg.proposalAccepted ? '#dcfce7' : 'var(--color-ink)',
                                    color: msg.proposalAccepted ? '#15803d' : '#ffffff'
                                  }
                                },
                                msg.proposalAccepted ? 'Đã chấp nhận & Nạp vào Planner' : 'Chờ bạn xem xét'
                              )
                            ),
                            React.createElement(
                              'p',
                              { style: { margin: 0, fontSize: '13px', color: 'var(--color-mid-gray)', lineHeight: 1.5 } },
                              msg.planProposal.summary ||
                                (msg.planProposal.semesters && msg.planProposal.semesters.length > 0
                                  ? `Lộ trình ${msg.planProposal.semesters.length} học kỳ đề xuất · CPA dự kiến: ${msg.planProposal.projectedCpa ? `${msg.planProposal.projectedCpa} (Dự kiến)` : 'Chưa xác định'}`
                                  : `Học kỳ 1 (2026-2027): 18 tín chỉ · CPA dự kiến: ${msg.planProposal.projectedCpa ? `${msg.planProposal.projectedCpa} (Dự kiến)` : '3.25 (Dự kiến)'}`)
                            ),
                            !msg.proposalAccepted
                              ? React.createElement(
                                  'div',
                                  { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' } },
                                  React.createElement(
                                    'button',
                                    {
                                      type: 'button',
                                      className: 'haui-pill-btn-dark',
                                      onClick: () => handleAcceptProposal(msg.id, msg.planProposal)
                                    },
                                    React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'check'),
                                    React.createElement('span', null, 'Chấp nhận phương án')
                                  ),
                                  React.createElement(
                                    'button',
                                    {
                                      type: 'button',
                                      className: 'haui-pill-btn-paper',
                                      onClick: () => handleRequestAlternative()
                                    },
                                    React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'replay'),
                                    React.createElement('span', null, 'Phương án khác')
                                  ),
                                  React.createElement(
                                    'button',
                                    {
                                      type: 'button',
                                      className: 'haui-pill-btn-canvas',
                                      onClick: () => handleDismissProposal(msg.id)
                                    },
                                    React.createElement('span', null, 'Hủy đề xuất')
                                  )
                                )
                              : React.createElement(
                                  'div',
                                  { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a', fontWeight: 600 } },
                                  React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'check_circle'),
                                  'Đã nạp vào Study Planner. Bạn có thể mở tab "Kế hoạch học tập" để tinh chỉnh.'
                                )
                          )
                        : null,

                      // Nguồn trích dẫn quy chế RAG
                      msg.sources && msg.sources.length > 0 && !msg.subcards
                        ? React.createElement(
                            'div',
                            { style: { paddingTop: '8px', borderTop: '1px solid var(--color-hairline)', fontSize: '12px', color: 'var(--color-mid-gray)' } },
                            React.createElement('strong', { style: { color: 'var(--color-ink)' } }, 'Nguồn tham khảo & Quy chế: '),
                            msg.sources.map((s, sIdx) =>
                              React.createElement('span', { key: sIdx }, `${s.title} ${s.section ? `(${s.section})` : ''}${sIdx < msg.sources.length - 1 ? '; ' : ''}`)
                            )
                          )
                        : null,

                      // Footer Actions (Like, Dislike, Copy)
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--color-hairline)',
                            fontSize: '11px',
                            color: 'var(--color-mid-gray)'
                          }
                        },
                        React.createElement(
                          'div',
                          { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                          React.createElement(
                            'button',
                            {
                              type: 'button',
                              title: 'Hữu ích',
                              onClick: () => showToast('Cảm ơn bạn đã đóng góp đánh giá hữu ích!'),
                              style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-mid-gray)', padding: '2px', display: 'flex', alignItems: 'center' }
                            },
                            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'thumb_up')
                          ),
                          React.createElement(
                            'button',
                            {
                              type: 'button',
                              title: 'Chưa chính xác',
                              onClick: () => showToast('Hệ thống đã ghi nhận phản hồi để hoàn thiện mô hình!'),
                              style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-mid-gray)', padding: '2px', display: 'flex', alignItems: 'center' }
                            },
                            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'thumb_down')
                          ),
                          React.createElement(
                            'button',
                            {
                              type: 'button',
                              title: 'Sao chép câu trả lời',
                              onClick: () => handleCopyText(msg.text),
                              style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-mid-gray)', padding: '2px', display: 'flex', alignItems: 'center' }
                            },
                            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'content_copy')
                          )
                        )
                      )
                    ),
                    React.createElement(
                      'span',
                      { style: { fontSize: '11px', color: 'var(--color-mid-gray)', marginTop: '4px', marginLeft: '6px' } },
                      `${msg.timestamp || '14:23'} • Trợ lý AI HaUI`
                    )
                  )
                );
              }),

          loading
            ? React.createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', color: 'var(--color-mid-gray)', fontSize: '13px' } },
                React.createElement('span', { className: 'material-symbols-outlined haui-spin', style: { fontSize: '20px' } }, 'progress_activity'),
                React.createElement('span', null, 'AI đang đối chiếu bảng điểm và phân tích quy chế đào tạo HaUI...')
              )
            : null,
          React.createElement('div')
        ),

        // Sticky Bottom Chat Input Bar (Chuẩn xác theo prototype)
        React.createElement(
          'div',
          { style: { position: 'sticky', bottom: '16px', zIndex: 30, width: '100%' } },
          React.createElement(
            'div',
            {
              style: {
                backgroundColor: 'var(--color-paper, #ffffff)',
                borderRadius: 'var(--heroui-radius-xl, 24px)',
                padding: '8px 12px',
                boxShadow: 'var(--heroui-shadow-md, 0 4px 20px rgba(0, 0, 0, 0.08))',
                border: '1px solid var(--color-hairline, #e5e5e5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }
            },
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              // Nút Đính kèm
              React.createElement(
                'button',
                {
                  type: 'button',
                  title: 'Đính kèm bảng điểm hoặc minh chứng (Mở luồng nhập bảng điểm TV2)',
                  onClick: handleAttachmentClick,
                  style: {
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--heroui-radius-full, 9999px)',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-mid-gray, #737373)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 150ms'
                  }
                },
                React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'attach_file')
              ),
              // Input text
              React.createElement('input', {
                type: 'text',
                className: 'haui-input',
                value: inputValue,
                onChange: (e) => setInputValue(e.target.value),
                onKeyDown: handleKeyDown,
                disabled: loading,
                placeholder: 'Hỏi AI về môn tiên quyết, mẹo kéo GPA, điều kiện tốt nghiệp...',
                style: {
                  flex: 1,
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  borderRadius: 'var(--heroui-radius-full, 9999px)',
                  padding: '10px 18px',
                  fontSize: '14px',
                  color: 'var(--color-ink, #0a0a0a)',
                  fontFamily: 'inherit'
                }
              }),
              // Nút Mic giọng nói
              React.createElement(
                'button',
                {
                  type: 'button',
                  title: 'Nhập giọng nói',
                  onClick: () => showToast('Tính năng nhận diện giọng nói đang hoàn thiện.'),
                  style: {
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-mid-gray, #737373)',
                    cursor: 'pointer',
                    flexShrink: 0
                  }
                },
                React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'mic')
              ),
              // Nút Gửi
              React.createElement(
                'button',
                {
                  type: 'button',
                  title: 'Gửi yêu cầu',
                  onClick: () => handleSendMessage(),
                  disabled: loading || !inputValue.trim(),
                  style: {
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-ink, #0a0a0a)',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !inputValue.trim() ? 0.45 : 1,
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                    transition: 'all 150ms'
                  }
                },
                React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'send')
              )
            ),
            React.createElement(
              'p',
              {
                style: {
                  fontSize: '11px',
                  color: 'var(--color-mid-gray, #737373)',
                  textAlign: 'center',
                  margin: '2px 0 0',
                  userSelect: 'none'
                }
              },
              'AI Advisor sử dụng dữ liệu học tập cá nhân mẫu để phân tích. Dữ liệu chỉ mang tính chất tham khảo hỗ trợ sinh viên.'
            )
          )
        )
      ),

      // CỘT PHẢI (4 COLS): SIDEBAR NGỮ CẢNH & HỒ SƠ NẠP VÀO AI
      React.createElement(
        'aside',
        { className: 'haui-chat-col-sidebar', style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

        // Card 1: Hồ sơ học tập nạp vào AI
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              borderRadius: 'var(--heroui-radius-xl, 24px)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              padding: '24px',
              boxShadow: 'var(--heroui-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }
          },
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '10px',
                borderBottom: '1px solid var(--color-hairline, #e5e5e5)'
              }
            },
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '20px', color: 'var(--color-ink)' } }, 'badge'),
              React.createElement('h2', { style: { margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Hồ sơ nạp vào AI')
            ),
            React.createElement(
              'span',
              {
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas)',
                  fontSize: '11px',
                  color: 'var(--color-mid-gray)',
                  fontWeight: 500
                }
              },
              React.createElement('span', { style: { width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-ink)' } }),
              'Đồng bộ'
            )
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' } },
            React.createElement(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              React.createElement('span', { style: { color: 'var(--color-mid-gray)' } }, 'Sinh viên'),
              React.createElement('strong', { style: { color: 'var(--color-ink)' } }, `${student?.fullName || 'Sinh viên'} (${student?.studentId || '2024604757'})`)
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              React.createElement('span', { style: { color: 'var(--color-mid-gray)' } }, 'CPA hiện tại'),
              React.createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                React.createElement('strong', { style: { color: 'var(--color-ink)' } }, student?.cpa ? `${Number(student.cpa).toFixed(2)} / 4.00` : '—'),
                student?.cpa
                  ? React.createElement('span', { style: { padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', fontWeight: 500 } }, Number(student.cpa) >= 3.2 ? 'Giỏi' : Number(student.cpa) >= 2.5 ? 'Khá' : 'Trung bình')
                  : React.createElement('span', { style: { padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-mid-gray)' } }, 'Chưa có')
              )
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
              React.createElement(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement('span', { style: { color: 'var(--color-mid-gray)' } }, 'Tín chỉ tích lũy'),
                React.createElement('strong', { style: { color: 'var(--color-ink)' } }, `${student?.accumulatedCredits ?? 0} / ${student?.totalCreditsRequired || 135} TC (${student?.progressPercent ?? 0}%)`)
              ),
              React.createElement(
                'div',
                { className: 'haui-progress-bar-minimal' },
                React.createElement('div', { className: 'haui-progress-bar-fill', style: { width: `${Math.min(100, student?.progressPercent ?? 0)}%` } })
              )
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              React.createElement('span', { style: { color: 'var(--color-mid-gray)' } }, 'Phiên bản kế hoạch'),
              React.createElement('strong', { style: { color: 'var(--color-ink)' } }, plannerStore.getPlan()?.version || 'Chưa lưu')
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              React.createElement('span', { style: { color: 'var(--color-mid-gray)' } }, 'Đồng bộ dữ liệu'),
              React.createElement(
                'span',
                { style: { display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-ink)', fontWeight: 500 } },
                React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, student?.hasTranscript !== false ? 'cloud_done' : 'cloud_off'),
                student?.hasTranscript !== false ? 'Đã đồng bộ' : 'Chưa nạp điểm'
              )
            )
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'haui-pill-btn-canvas',
              onClick: () => navigateTo('/profile'),
              style: { justifyContent: 'center', fontSize: '13px' }
            },
            'Xem hồ sơ học tập chi tiết'
          )
        ),

        // Card: Lịch sử hội thoại đã lưu (chỉ có với backend thật)
        historyEnabled && React.createElement(
          'div',
          {
            'data-testid': 'chat-history',
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              borderRadius: 'var(--heroui-radius-xl, 24px)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              padding: '24px',
              boxShadow: 'var(--heroui-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }
          },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--color-hairline)' } },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '20px', color: 'var(--color-ink)' } }, 'history'),
            React.createElement('h2', { style: { margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Lịch sử hội thoại')
          ),
          historyError && React.createElement('p', { style: { margin: 0, fontSize: '13px', color: 'var(--color-ember, #b91c1c)' } }, historyError),
          !historyError && conversations.length === 0 && React.createElement(
            'p',
            { style: { margin: 0, fontSize: '13px', color: 'var(--color-mid-gray, #737373)' } },
            'Chưa có hội thoại nào được lưu.'
          ),
          conversations.length > 0 && React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' } },
            conversations.map((c) => {
              const active = c.conversationId === conversationId;
              const updated = c.updatedAt ? new Date(c.updatedAt) : null;
              return React.createElement(
                'button',
                {
                  key: c.conversationId,
                  type: 'button',
                  onClick: () => handleOpenConversation(c.conversationId),
                  disabled: loading || Boolean(openingConversationId),
                  'aria-current': active ? 'true' : undefined,
                  style: {
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: `1px solid ${active ? 'var(--color-ink, #0a0a0a)' : 'var(--color-hairline, #e5e5e5)'}`,
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }
                },
                React.createElement('span', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.title || 'Hội thoại'),
                updated && !Number.isNaN(updated.getTime()) && React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, updated.toLocaleString('vi-VN'))
              );
            })
          )
        ),

        // Card 2: Gợi ý chủ đề hỏi đáp nhanh (4 cards 1-click)
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              borderRadius: 'var(--heroui-radius-xl, 24px)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              padding: '24px',
              boxShadow: 'var(--heroui-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }
          },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--color-hairline)' } },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '20px', color: 'var(--color-ink)' } }, 'explore'),
            React.createElement('h2', { style: { margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Gợi ý chủ đề hỏi đáp nhanh')
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            [
              {
                icon: 'account_tree',
                title: 'Điều kiện học phần',
                desc: 'Cho mình biết mã học phần cần kiểm tra',
                prompt: 'Mình muốn kiểm tra môn học trước và tiên quyết của một học phần.'
              },
              {
                icon: 'translate',
                title: 'Đổi điểm tiếng Anh VSTEP',
                desc: 'Quy chế miễn học phần B1/B2',
                prompt: 'Quy chế đổi điểm tiếng Anh VSTEP sang chuẩn đầu ra như thế nào?'
              },
              {
                icon: 'speed',
                title: 'Rút ngắn 3.5 năm tốt nghiệp',
                desc: 'Phân bổ tín chỉ tăng tốc',
                prompt: 'Lên lộ trình học vượt 3.5 năm ngành CNTT/KTPM.'
              },
              {
                icon: 'calendar_month',
                title: 'Đăng ký học vượt kỳ hè',
                desc: 'Tối đa 8 tín chỉ / kỳ phụ',
                prompt: 'Quy định đăng ký học vượt kỳ hè tối đa bao nhiêu tín chỉ?'
              }
            ].map((topic, tIdx) =>
              React.createElement(
                'div',
                {
                  key: tIdx,
                  className: 'haui-chat-topic-card',
                  onClick: () => handleSendMessage(topic.prompt)
                },
                React.createElement(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                  React.createElement(
                    'div',
                    {
                      style: {
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-paper)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-ink)',
                        flexShrink: 0,
                        border: '1px solid var(--color-hairline)'
                      }
                    },
                    React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, topic.icon)
                  ),
                  React.createElement(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column' } },
                    React.createElement('span', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' } }, topic.title),
                    React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray)' } }, topic.desc)
                  )
                ),
                React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px', color: 'var(--color-mid-gray)' } }, 'chevron_right')
              )
            )
          )
        ),

        // Card 3: Lưu ý thuật toán AI
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              borderRadius: 'var(--heroui-radius-xl, 24px)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              padding: '24px',
              boxShadow: 'var(--heroui-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }
          },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '20px', color: 'var(--color-ink)' } }, 'shield'),
            React.createElement('h2', { style: { margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Lưu ý thuật toán AI')
          ),
          React.createElement(
            'div',
            {
              style: {
                padding: '12px 14px',
                borderRadius: '18px',
                backgroundColor: 'var(--color-canvas, #f5f5f5)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }
            },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px', color: 'var(--color-mid-gray)', marginTop: '2px', flexShrink: 0 } }, 'lock'),
            React.createElement(
              'p',
              { style: { margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', lineHeight: 1.5 } },
              React.createElement('strong', { style: { color: 'var(--color-ink)' } }, 'Ghi chú an toàn: '),
              'AI hoạt động độc lập trên thiết bị, không thay đổi dữ liệu gốc trên hệ thống quản lý đào tạo của HaUI. Dữ liệu phân tích dựa trên cây tiên quyết của Khoa Công nghệ Thông tin.'
            )
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-mid-gray)', paddingTop: '4px' } },
            React.createElement('span', null, 'Phiên bản thuật toán: 2024.3'),
            React.createElement('a', { href: '#', style: { color: 'var(--color-ink)', textDecoration: 'underline' } }, 'Chính sách bảo mật')
          )
        )
      )
    )
  );
}

export default ChatAdvisorPage;
