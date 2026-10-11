import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { plannerStore, PLAN_STATUSES } from '../services/plannerStore.js';

const h = React.createElement;

/**
 * 4 Gợi ý câu hỏi thông minh (Quick Prompt Pills) chuẩn Màn hình 2 UI Flow — hiển thị ở trạng thái hội thoại trống
 * và gửi ngay khi sinh viên bấm chọn.
 */
const QUICK_PROMPTS_MAN_2 = Object.freeze([
  'Tư vấn lộ trình kéo CPA lên >= 3.20 để tốt nghiệp bằng Giỏi.',
  'Tôi vừa trượt môn Toán rời rạc (MATH1002), kỳ sau bị ảnh hưởng thế nào?',
  'Lên lộ trình học vượt 3.5 năm ngành CNTT/KTPM.',
  'Kỳ này nên học cải thiện môn nào tốt nhất theo chỉ số ROI?'
]);

/**
 * Khối "Gợi ý câu hỏi phân tích nhanh" (copy tĩnh từ prototype `tu_van_ai`) — nhấp để điền nhanh vào ô nhập.
 */
const STARTER_PROMPTS = Object.freeze([
  'Dự báo điểm GPA Kỳ 7 để tốt nghiệp loại Giỏi (CPA ≥ 3.20)?',
  'Môn IT6080 - Đồ án chuyên ngành cần những môn tiên quyết nào?',
  'Kế hoạch Kỳ 8 nếu đăng ký 15 TC có bị quá tải không?',
  'Tôi còn thiếu chứng chỉ chuẩn đầu ra nào theo quy chế?'
]);

/**
 * Thẻ "Gợi ý chủ đề hỏi đáp nhanh" ở cột ngữ cảnh — bấm để gửi ngay câu hỏi tương ứng tới Trợ lý AI.
 */
const QUICK_TOPICS = Object.freeze([
  {
    icon: 'account_tree',
    title: 'Tiên quyết môn Đồ án',
    caption: 'Chuỗi môn IT6080 & IT6090',
    prompt: 'Môn Đồ án chuyên ngành IT6080 và Khóa luận tốt nghiệp IT6090 cần những môn tiên quyết nào?'
  },
  {
    icon: 'translate',
    title: 'Đổi điểm tiếng Anh VSTEP',
    caption: 'Quy chế miễn học phần B1/B2',
    prompt: 'Quy chế quy đổi chứng chỉ tiếng Anh VSTEP B1/B2 để miễn học phần tiếng Anh như thế nào?'
  },
  {
    icon: 'speed',
    title: 'Rút ngắn 3.5 năm tốt nghiệp',
    caption: 'Phân bổ tín chỉ tăng tốc',
    prompt: QUICK_PROMPTS_MAN_2[2]
  },
  {
    icon: 'calendar_month',
    title: 'Đăng ký học vượt kỳ hè',
    caption: 'Tối đa 8 tín chỉ / kỳ phụ',
    prompt: 'Điều kiện đăng ký học vượt kỳ hè (tối đa 8 tín chỉ / kỳ phụ) là gì?'
  }
]);

// Câu hỏi gửi lại khi sinh viên chọn [Phương án khác] trên thẻ đề xuất
const ALTERNATIVE_PROMPT =
  'Hãy đề xuất cho tôi một phương án khác nhẹ tải hơn (dưới 16 tín chỉ) hoặc đẩy bớt môn sang kỳ hè.';

// Hồ sơ mẫu (prototype) — chỉ dùng khi không có API phiên/trạng thái học tập (vd. môi trường kiểm thử)
const DEMO_STUDENT_PROFILE = Object.freeze({
  fullName: 'Nguyễn Văn An',
  studentCode: '2020601234',
  cpa: 3.18,
  accumulatedCredits: 108,
  totalCreditsRequired: 145,
  courseCount: 28,
  failedCourses: []
});

// --- Hội thoại mẫu khởi tạo (static demo từ prototype `tu_van_ai`) ---------------------------------
const DEMO_AUTHOR = 'Nguyễn Văn An';

const DEMO_GPA_STEPS = Object.freeze([
  ['Điểm trọng số hiện tại (Kỳ 1 → Kỳ 6): ', '108 tín chỉ × 3.18 = 343.44 điểm', '.'],
  ['Sau khi tích lũy 18 tín chỉ ở Kỳ 7, tổng số tín chỉ sẽ đạt: ', '108 + 18 = 126 tín chỉ', '.'],
  ['Mục tiêu CPA ≥ 3.20 yêu cầu tổng điểm trọng số đạt tối thiểu: ', '126 × 3.20 = 403.20 điểm', '.'],
  ['Tổng điểm trọng số cần đạt riêng ở Kỳ 7: ', '403.20 - 343.44 = 59.76 điểm', '.']
]);

const DEMO_DATA_USED = Object.freeze([
  'Bảng điểm Kỳ 1 - Kỳ 6 (28 môn hợp lệ, CPA 3.18)',
  'Dự thảo kế hoạch học tập v2.4 (Kỳ 7: 6 môn - 18 TC)',
  'Hệ số quy đổi thang điểm 4 theo Quy chế HaUI'
]);

const DEMO_REFERENCES = Object.freeze([
  'CTĐT K16 ngành Kỹ thuật Phần mềm (Khoa CNTT - HaUI)',
  'QĐ Hướng dẫn tính điểm trung bình chung tích lũy 2021'
]);

const DEMO_REFERENCE_NOTE =
  'Lưu ý: Các ngưỡng tính toán trên mang tính chất tham khảo học thuật từ dữ liệu giả lập, vui lòng đối chiếu bảng điểm chính thức tại sv.haui.edu.vn.';

const DEMO_INTERNSHIP_CHECKLIST = Object.freeze([
  { ok: true, text: 'Đã hoàn thành tối thiểu 90 tín chỉ (Hiện có: 108 TC)' },
  { ok: false, text: 'Chưa có xác nhận cơ sở thực tập CNTT' }
]);

const DEMO_SEED_MESSAGES = Object.freeze([
  {
    id: 'demo-msg-1',
    sender: 'user',
    author: DEMO_AUTHOR,
    timestamp: '14:22',
    text: 'Em đang có CPA 3.18, tích lũy 108 tín chỉ sau kỳ 6. Kỳ 7 em dự định đăng ký 18 tín chỉ thì cần đạt GPA kỳ 7 bao nhiêu để kéo CPA lên mức 3.20 (bằng Giỏi) ạ?'
  },
  {
    id: 'demo-msg-2',
    sender: 'assistant',
    demoContent: 'gpa-analysis',
    timestamp: '14:23',
    latencyMs: 1100,
    text: 'Bạn cần đạt GPA Kỳ 7 tối thiểu 3.32 / 4.00: điểm trọng số hiện tại 108 × 3.18 = 343.44; sau Kỳ 7 tổng 126 tín chỉ cần 126 × 3.20 = 403.20 điểm, tức Kỳ 7 phải đạt 59.76 điểm trọng số trên 18 tín chỉ.'
  },
  {
    id: 'demo-msg-3',
    sender: 'user',
    author: DEMO_AUTHOR,
    timestamp: '14:25',
    text: 'Thế còn điều kiện học phần Thực tập doanh nghiệp thì sao ạ?'
  },
  {
    id: 'demo-msg-4',
    sender: 'assistant',
    demoContent: 'internship-check',
    timestamp: '14:26',
    text: 'Cần bổ sung thông tin cơ sở thực tập hoặc xác nhận chuyên ngành hẹp trong Hồ sơ sinh viên để AI tư vấn lộ trình phân bổ tín chỉ chính xác nhất.'
  }
]);

const ACTION_ICONS = Object.freeze({
  OPEN_RECOMMENDATIONS: 'route',
  OPEN_TREE: 'account_tree',
  OPEN_PLANNER: 'event_note'
});

const PLAN_STATUS_LABELS = Object.freeze({
  [PLAN_STATUSES.DRAFT]: 'Bản nháp',
  [PLAN_STATUSES.VALIDATED]: 'Đã thẩm định',
  [PLAN_STATUSES.ACTIVE]: 'Đang áp dụng',
  [PLAN_STATUSES.ARCHIVED]: 'Lưu trữ'
});

// --- Tiện ích -------------------------------------------------------------------------------------
const nowLabel = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const createConversationId = () => `conv-${Date.now()}`;

const cloneSeedMessages = () => DEMO_SEED_MESSAGES.map((m) => ({ ...m }));

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatCpa = (cpa) => (cpa === null || cpa === undefined ? '—' : Number(cpa).toFixed(2));

// Nhãn xếp loại ngắn gọn cạnh CPA (thang 4 — Quy chế HaUI)
const describeCpa = (cpa) => {
  if (cpa === null || cpa === undefined) return 'Chưa có dữ liệu';
  if (cpa >= 3.6) return 'Xuất sắc';
  if (cpa >= 3.2) return 'Giỏi';
  if (cpa >= 3.0) return 'Tiệm cận Giỏi';
  if (cpa >= 2.5) return 'Khá';
  if (cpa >= 2.0) return 'Trung bình';
  return 'Cảnh báo học vụ';
};

const creditsPercent = (earned, total) =>
  earned !== null && total ? Math.min(100, Math.round((earned / total) * 1000) / 10) : null;

// Hồ sơ học tập nạp vào AI: phiên đăng nhập (sessionStudent) + trạng thái học tập (api.academic.getStatus)
const buildProfile = (session, status, syncState) => {
  const records = Array.isArray(session?.records) ? session.records : null;
  return {
    syncState,
    fullName: session?.fullName || DEMO_STUDENT_PROFILE.fullName,
    studentCode: session?.studentCode || session?.studentId || status?.studentId || DEMO_STUDENT_PROFILE.studentCode,
    cpa: toNumber(status?.cpa ?? session?.initialCpa),
    accumulatedCredits: toNumber(status?.accumulatedCredits ?? session?.initialCredits),
    totalCreditsRequired: toNumber(status?.totalCreditsRequired ?? session?.totalCreditsRequired),
    courseCount: records ? records.length : null,
    failedCourses: records ? records.filter((r) => r.status === 'FAILED') : []
  };
};

const summarizePlan = (plan) => ({
  version: plan?.version || '—',
  status: plan?.status || PLAN_STATUSES.DRAFT,
  statusLabel: PLAN_STATUS_LABELS[plan?.status] || 'Bản nháp',
  semesterCount: Array.isArray(plan?.semesters) ? plan.semesters.length : 0
});

const semesterCredits = (sem) =>
  toNumber(sem?.totalCredits) ??
  (Array.isArray(sem?.courses) ? sem.courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0) : 0);

const icon = (name, className = 'text-[16px]') =>
  h('span', { className: `material-symbols-outlined ${className}`, 'aria-hidden': true }, name);

/**
 * Màn hình 2: Trợ lý ảo AI Chatbot Tư vấn Học vụ (AI Advisor Chat) — TV3, route `/chat`
 * Bố cục theo prototype `tu_van_ai`: thanh tiêu đề, khối gợi ý câu hỏi, luồng hội thoại (Sinh viên - AI),
 * ô nhập dính đáy và cột ngữ cảnh (Hồ sơ nạp vào AI, Gợi ý chủ đề, Lưu ý thuật toán).
 *
 * Thực hiện yêu cầu nghiệp vụ:
 * 1. Tiếp nhận câu hỏi học vụ qua `api.advisor.chat`, gợi ý câu hỏi nhanh (prototype + 4 Quick Prompts UI Flow).
 * 2. Cung cấp câu trả lời có căn cứ RAG (nguồn trích dẫn, cảnh báo, liên kết hành động) và đề xuất Phương án Lộ trình.
 * 3. Đầy đủ 3 nhánh hành động trên thẻ Phương án đề xuất:
 *    - [Chấp nhận phương án]: Nạp đề xuất vào Planner Store (`haui:planner:proposal`) và mở lối tắt sang /planner.
 *    - [Phương án khác]: Gửi yêu cầu AI tính toán lại phương án thay thế.
 *    - [Hủy đề xuất]: Đóng thẻ đề xuất, giữ nguyên kế hoạch hiện tại.
 * 4. Hồ sơ nạp vào AI lấy từ phiên sinh viên + trạng thái học tập (API) và phiên bản kế hoạch (Planner Store).
 * 5. Đầy đủ 3 trạng thái kiểm thử: Empty, Loading, Error (điều khiển mô phỏng nằm trong panel công cụ dev).
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2 (dùng `ui.DevSlot` cho điều khiển dev)
 */
export function ChatAdvisorPage({ api, ui } = {}) {
  // State hội thoại (khởi tạo bằng hội thoại mẫu của prototype)
  const [messages, setMessages] = useState(cloneSeedMessages);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // ID phiên hội thoại (tạo mới khi "Làm mới phiên chat")
  const [conversationId, setConversationId] = useState(createConversationId);

  // Hồ sơ học tập nạp vào AI & tóm tắt kế hoạch hiện hành
  const [profile, setProfile] = useState(() =>
    buildProfile(typeof api?.getConfig === 'function' ? api.getConfig()?.sessionStudent : null, null, 'loading')
  );
  const [planInfo, setPlanInfo] = useState(() => summarizePlan(plannerStore.getPlan()));

  const inputRef = useRef(null);
  const threadEndRef = useRef(null);
  const toastTimerRef = useRef(null);
  const sessionRef = useRef(0);
  const prevCountRef = useRef(messages.length);

  const isBusy = loading || devLoading;

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 3500);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Đồng bộ phiên bản kế hoạch từ Planner Store
  useEffect(
    () => plannerStore.subscribe((state) => setPlanInfo(summarizePlan(state.plan))),
    []
  );

  // Nạp hồ sơ học tập: sessionStudent + GET /academic/status, làm mới khi đổi tài khoản/cấu hình API
  useEffect(() => {
    const canLoad = typeof api?.getConfig === 'function' || typeof api?.academic?.getStatus === 'function';
    if (!canLoad) {
      setProfile({ ...DEMO_STUDENT_PROFILE, syncState: 'demo' });
      return undefined;
    }

    let cancelled = false;
    let requestSeq = 0;

    const load = async (configSnapshot) => {
      const seq = ++requestSeq;
      const session =
        configSnapshot?.sessionStudent ||
        (typeof api.getConfig === 'function' ? api.getConfig()?.sessionStudent : null) ||
        null;
      setProfile(buildProfile(session, null, 'loading'));
      try {
        const status = typeof api.academic?.getStatus === 'function' ? await api.academic.getStatus() : null;
        if (cancelled || seq !== requestSeq) return;
        setProfile(buildProfile(session, status, 'ready'));
      } catch {
        if (cancelled || seq !== requestSeq) return;
        setProfile(buildProfile(session, null, 'error'));
      }
    };

    load();
    const unsubscribe = typeof api.subscribe === 'function' ? api.subscribe(load) : null;
    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [api]);

  // Cuộn tới tin nhắn mới (không cuộn khi vừa mở trang)
  useEffect(() => {
    if (messages.length > prevCountRef.current || isBusy) {
      threadEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, isBusy]);

  // Gửi câu hỏi tới API cố vấn học vụ (api.advisor.chat)
  const sendToAdvisor = useCallback(
    async (text, { appendUser = true } = {}) => {
      const session = sessionRef.current;

      // 1. Thêm tin nhắn của người dùng vào hội thoại
      if (appendUser) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-user-${Date.now()}-${Math.random()}`,
            sender: 'user',
            author: profile.fullName,
            text,
            timestamp: nowLabel()
          }
        ]);
      }

      setLoading(true);
      setError(null);
      const startedAt = Date.now();

      try {
        let response = null;

        if (api && api.advisor && typeof api.advisor.chat === 'function') {
          response = await api.advisor.chat({
            conversationId,
            message: text,
            clientTimestamp: new Date().toISOString()
          });
        } else {
          // Fallback response mô phỏng khi chưa có API
          response = {
            answer: `[AI Advisor]: Dựa trên hồ sơ của bạn (CPA ${formatCpa(profile.cpa)}, ${profile.accumulatedCredits ?? '—'}/${profile.totalCreditsRequired ?? '—'} TC), để đạt mục tiêu cho câu hỏi "${text}", AI đề xuất bạn nên phân bổ 18 tín chỉ ở Kỳ 7: ưu tiên gỡ môn Toán rời rạc (3 TC), cải thiện OOP (4 TC) và 4 môn chuyên ngành.`,
            sources: [
              {
                title: 'Quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội (HaUI)',
                section: 'Điều 14 - Điều kiện tiên quyết & Giới hạn 10-24 TC (BR-03/BR-04)'
              }
            ],
            planProposal: plannerStore.getPlan()
          };
        }

        if (session !== sessionRef.current) return;

        // 2. Thêm tin nhắn phản hồi của AI
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-ai-${Date.now()}-${Math.random()}`,
            sender: 'assistant',
            text: response?.answer || 'Hệ thống đã nhận yêu cầu nhưng nội dung trả lời trống.',
            reasoningStatus: response?.reasoningStatus || '',
            sources: Array.isArray(response?.sources) ? response.sources : [],
            actions: Array.isArray(response?.actions) ? response.actions : [],
            planProposal: response?.planProposal || null,
            proposalDismissed: false,
            warnings: Array.isArray(response?.warnings) ? response.warnings : [],
            latencyMs: Date.now() - startedAt,
            context: {
              profileLine: `Hồ sơ ${profile.fullName}: CPA ${formatCpa(profile.cpa)} · ${profile.accumulatedCredits ?? '—'}/${profile.totalCreditsRequired ?? '—'} TC`,
              planLine: `Kế hoạch học tập ${planInfo.statusLabel.toLowerCase()} ${planInfo.version} (${planInfo.semesterCount} học kỳ)`
            },
            timestamp: nowLabel()
          }
        ]);
      } catch (err) {
        if (session !== sessionRef.current) return;
        setError({
          code: err?.code || 'CHAT_REQUEST_FAILED',
          message: err?.message || 'Không thể nhận phản hồi từ dịch vụ Trợ lý AI Cố vấn học vụ.',
          details: err?.details || ['Kiểm tra kết nối mạng tới Backend Spring Boot (/api/v1/advisor/chat).'],
          failedText: text
        });
      } finally {
        if (session === sessionRef.current) setLoading(false);
      }
    },
    [api, conversationId, profile, planInfo]
  );

  const handleSendMessage = useCallback(
    (customText) => {
      const rawText = typeof customText === 'string' ? customText : inputValue;
      if (!rawText || !rawText.trim() || isBusy) return undefined;
      setInputValue('');
      return sendToAdvisor(rawText.trim());
    },
    [inputValue, isBusy, sendToAdvisor]
  );

  // Gợi ý câu hỏi phân tích nhanh: điền vào ô nhập để sinh viên chỉnh sửa trước khi gửi
  const handleFillPrompt = useCallback((text) => {
    setInputValue(text);
    inputRef.current?.focus?.();
  }, []);

  // Nhánh hành động 1: Chấp nhận phương án -> Nạp vào Planner (phát sự kiện `haui:planner:proposal`)
  const handleAcceptProposal = useCallback(
    (msgId, proposal) => {
      if (!proposal) return;
      plannerStore.setIncomingProposal(proposal, 'AI Advisor Chat');
      showToast('Đã chấp nhận phương án của AI! Bạn có thể chuyển sang trang "Kế hoạch học tập" để tinh chỉnh.');
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, proposalAccepted: true } : m)));
    },
    [showToast]
  );

  // Nhánh hành động 2: Phương án khác -> Re-prompt AI
  const handleRequestAlternative = useCallback(() => {
    handleSendMessage(ALTERNATIVE_PROMPT);
  }, [handleSendMessage]);

  // Nhánh hành động 3: Hủy đề xuất -> Đóng card proposal
  const handleDismissProposal = useCallback(
    (msgId) => {
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, proposalDismissed: true } : m)));
      showToast('Đã hủy bỏ đề xuất phương án.');
    },
    [showToast]
  );

  // Xóa toàn bộ hội thoại (Empty state)
  const handleClearChat = useCallback(() => {
    sessionRef.current += 1;
    setMessages([]);
    setError(null);
    setInputValue('');
    setLoading(false);
  }, []);

  // Làm mới phiên chat: xóa hội thoại và mở phiên mới
  const handleNewSession = useCallback(() => {
    handleClearChat();
    setConversationId(createConversationId());
    showToast('Đã làm mới phiên chat. Hãy đặt câu hỏi mới cho Trợ lý AI.');
  }, [handleClearChat, showToast]);

  // Nạp lại hội thoại mẫu của prototype
  const handleLoadDemo = useCallback(() => {
    sessionRef.current += 1;
    setMessages(cloneSeedMessages());
    setError(null);
    setLoading(false);
  }, []);

  // Mô phỏng trạng thái Error để kiểm thử UI
  const handleSimulateError = useCallback(() => {
    setError({
      code: 'SIMULATED_CHAT_ERROR',
      message: 'Mô phỏng lỗi kết nối máy chủ AI Cố vấn học vụ (Kiểm thử Error State).',
      details: ['Endpoint POST /api/v1/advisor/chat gặp sự cố mạng hoặc timeout.']
    });
  }, []);

  // Thử lại: gửi lại câu hỏi vừa lỗi (nếu có), không lặp lại bong bóng của sinh viên
  const handleRetry = useCallback(() => {
    const failedText = error?.failedText;
    setError(null);
    if (failedText) sendToAdvisor(failedText, { appendUser: false });
  }, [error, sendToAdvisor]);

  // Lưu hội thoại (.pdf) qua hộp thoại in của trình duyệt
  const handleSaveConversation = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') window.print();
  }, []);

  const handleFeedback = useCallback((msgId, value) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: m.feedback === value ? null : value } : m))
    );
  }, []);

  const handleCopy = useCallback(
    (text) => {
      const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null;
      if (!clipboard || typeof clipboard.writeText !== 'function') {
        showToast('Trình duyệt không hỗ trợ sao chép tự động.');
        return;
      }
      clipboard.writeText(text || '').then(
        () => showToast('Đã sao chép câu trả lời.'),
        () => showToast('Không thể sao chép câu trả lời.')
      );
    },
    [showToast]
  );

  const handleVoiceInput = useCallback(() => {
    showToast('Nhập giọng nói chưa được hỗ trợ trong phiên bản này.');
  }, [showToast]);

  // Bắt phím Enter để gửi nhanh
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // ---------------------------------------------------------------------------------------------
  // Khối hiển thị dùng chung trong luồng hội thoại
  // ---------------------------------------------------------------------------------------------
  const pillPrimary =
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-paper font-body-medium text-body hover:bg-ink-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const pillSecondary =
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-canvas text-ink font-body-medium text-body hover:bg-surface-variant transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const renderAssistantFrame = (key, children, footerLabel, avatarIcon = 'auto_awesome') =>
    h(
      'div',
      { key, className: 'flex justify-start gap-space-sm items-start pr-4 sm:pr-8' },
      h(
        'div',
        { className: 'w-8 h-8 rounded-full bg-canvas flex items-center justify-center shrink-0 mt-1' },
        icon(avatarIcon, `${avatarIcon === 'error' ? 'text-ember' : 'text-ink'} text-[18px]`)
      ),
      h(
        'div',
        { className: 'flex flex-col items-start max-w-3xl w-full' },
        h(
          'div',
          {
            className:
              'bg-paper text-ink p-space-lg rounded-[24px] rounded-tl-none shadow-sm w-full flex flex-col gap-space-md'
          },
          ...children
        ),
        footerLabel ? h('span', { className: 'font-caption text-caption text-mid-gray mt-1 ml-2' }, footerLabel) : null
      )
    );

  const renderAiHeader = (subtitle, tag) =>
    h(
      'div',
      { className: 'flex flex-wrap items-center justify-between gap-space-xs pb-space-xs border-b border-hairline' },
      h(
        'div',
        { className: 'flex items-center gap-1.5' },
        h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, 'Cố vấn học tập AI (HaUI Advisor)'),
        h('span', { className: 'text-mid-gray font-caption text-caption' }, `• ${subtitle}`)
      ),
      tag
        ? h('span', { className: 'inline-flex items-center gap-1 font-label text-label text-mid-gray' }, icon('verified', 'text-[14px]'), tag)
        : null
    );

  const renderSubCard = (key, iconName, title, items, footer) =>
    h(
      'div',
      { key, className: 'p-space-md bg-surface-alt rounded-[18px] flex flex-col justify-between' },
      h(
        'div',
        null,
        h(
          'div',
          { className: 'flex items-center gap-1.5 font-label text-label font-medium text-ink mb-2' },
          icon(iconName, 'text-[16px] text-mid-gray'),
          title
        ),
        items.length > 0
          ? h(
              'ul',
              { className: 'text-xs text-on-surface-variant space-y-1.5' },
              items.map((item, idx) =>
                h(
                  'li',
                  { key: idx, className: 'flex items-center gap-1.5' },
                  h('span', { className: 'w-1 h-1 rounded-full bg-ink shrink-0' }),
                  h('span', null, item)
                )
              )
            )
          : null
      ),
      footer
    );

  const renderFeedbackRow = (msg) => {
    const feedbackButton = (iconName, title, active, onClick) =>
      h(
        'button',
        {
          type: 'button',
          title,
          'aria-label': title,
          'aria-pressed': active,
          onClick,
          className: `p-1 hover:text-ink hover:bg-canvas rounded-full transition-colors ${active ? 'text-ink' : ''}`
        },
        h(
          'span',
          {
            className: 'material-symbols-outlined text-[16px]',
            'aria-hidden': true,
            style: active ? { fontVariationSettings: "'FILL' 1" } : undefined
          },
          iconName
        )
      );

    return h(
      'div',
      { className: 'flex items-center justify-between pt-space-xs text-mid-gray font-caption text-caption' },
      h(
        'span',
        null,
        typeof msg.latencyMs === 'number' ? `Mô hình hoàn thành phản hồi trong ${(msg.latencyMs / 1000).toFixed(1)}s` : ''
      ),
      h(
        'div',
        { className: 'flex items-center gap-2' },
        feedbackButton('thumb_up', 'Hữu ích', msg.feedback === 'up', () => handleFeedback(msg.id, 'up')),
        feedbackButton('thumb_down', 'Chưa chính xác', msg.feedback === 'down', () => handleFeedback(msg.id, 'down')),
        feedbackButton('content_copy', 'Sao chép câu trả lời', false, () => handleCopy(msg.text))
      )
    );
  };

  const renderUserMessage = (msg) =>
    h(
      'div',
      { key: msg.id, className: 'flex justify-end gap-space-sm items-start pl-8' },
      h(
        'div',
        { className: 'flex flex-col items-end max-w-2xl' },
        h(
          'div',
          { className: 'bg-ink-soft text-paper px-space-lg py-3 rounded-[24px] rounded-tr-none shadow-sm' },
          h('p', { className: 'font-body text-body leading-relaxed whitespace-pre-line' }, msg.text)
        ),
        h('span', { className: 'font-caption text-caption text-mid-gray mt-1 mr-2' }, `${msg.timestamp} • ${msg.author || profile.fullName}`)
      ),
      h(
        'div',
        { className: 'w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1' },
        icon('person', 'text-on-primary text-[18px]')
      )
    );

  // Tin nhắn mẫu 2: Phân tích mô phỏng GPA (prototype)
  const renderGpaAnalysisDemo = (msg) => [
    renderAiHeader('Phân tích mô phỏng GPA', 'Công thức thang 4'),
    h(
      'div',
      { className: 'font-body text-body text-ink flex flex-col gap-space-sm' },
      h(
        'p',
        { className: 'leading-relaxed' },
        'Chào bạn ',
        h('strong', null, DEMO_AUTHOR),
        ', dựa vào kết quả 108 tín chỉ đã tích lũy trong hồ sơ sinh viên, dưới đây là thuật toán tính toán cụ thể để bạn đạt ngưỡng bằng Giỏi ở Kỳ 7:'
      ),
      h(
        'div',
        { className: 'p-space-md bg-canvas rounded-[18px] flex flex-col gap-2' },
        h(
          'div',
          { className: 'font-body-medium text-body-medium text-ink font-semibold flex items-center gap-1' },
          icon('calculate'),
          'Phân tích công thức tính điểm tích lũy:'
        ),
        h(
          'ul',
          { className: 'font-body text-body text-on-surface-variant space-y-1.5 pl-1 list-none' },
          DEMO_GPA_STEPS.map(([lead, strong, tail], idx) =>
            h(
              'li',
              { key: idx, className: 'flex items-start gap-2' },
              h('span', { className: 'text-ink font-bold' }, '•'),
              h('span', null, lead, h('strong', null, strong), tail)
            )
          )
        )
      ),
      h(
        'div',
        { className: 'p-space-md bg-surface-container rounded-[18px] flex items-center gap-space-md' },
        h(
          'div',
          { className: 'w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center shrink-0' },
          icon('target', 'text-[20px]')
        ),
        h(
          'div',
          null,
          h('p', { className: 'font-label text-label text-mid-gray uppercase tracking-wider' }, 'Mục tiêu cần hoàn thành ở Kỳ 7'),
          h(
            'p',
            { className: 'font-subheading text-subheading text-ink font-semibold mt-0.5' },
            'Bạn cần đạt GPA Kỳ 7 tối thiểu ',
            h('span', { className: 'underline underline-offset-4' }, '3.32 / 4.00')
          ),
          h(
            'p',
            { className: 'font-caption text-caption text-mid-gray mt-0.5' },
            'Tương đương điểm trung bình B+ (3.5) cho phần lớn các môn và không có môn nào dưới B (3.0) trong 6 học phần dự kiến (18 tín chỉ).'
          )
        )
      )
    ),
    h(
      'div',
      { className: 'grid grid-cols-1 md:grid-cols-2 gap-space-sm pt-space-xs' },
      renderSubCard(
        'data',
        'folder_shared',
        'Dữ liệu học tập sử dụng',
        DEMO_DATA_USED,
        h('span', { className: 'font-caption text-caption text-mid-gray mt-3 block' }, 'Đồng bộ: 12 phút trước')
      ),
      renderSubCard(
        'refs',
        'menu_book',
        'Nguồn tham khảo & Quy chế minh họa',
        DEMO_REFERENCES,
        h('div', { className: 'mt-3 text-[11px] text-mid-gray italic leading-tight' }, DEMO_REFERENCE_NOTE)
      )
    ),
    renderFeedbackRow(msg)
  ];

  // Tin nhắn mẫu 4: Cảnh báo thiếu dữ liệu thực tập (prototype)
  const renderInternshipDemo = () => [
    h(
      'div',
      { className: 'bg-error-container/40 p-space-md rounded-[18px] flex items-start gap-space-sm' },
      icon('warning', 'text-ember text-[20px] shrink-0 mt-0.5'),
      h(
        'div',
        { className: 'flex flex-col' },
        h(
          'span',
          { className: 'font-body-medium text-body-medium text-on-error-container font-semibold' },
          'Cần bổ sung thêm thông tin dữ liệu!'
        ),
        h(
          'p',
          { className: 'font-body text-body text-on-surface-variant mt-1 leading-relaxed' },
          'Hệ thống nhận thấy trong hồ sơ của bạn chưa có thông tin đăng ký cơ sở thực tập hoặc xác nhận chuyên ngành hẹp (Kỹ thuật phần mềm hay Hệ thống thông tin). Vui lòng cập nhật mục ',
          h('strong', null, "'Hồ sơ sinh viên'"),
          ' hoặc tải lên giấy xác nhận thực tập để AI có thể tư vấn lộ trình phân bổ tín chỉ chính xác nhất.'
        )
      )
    ),
    h(
      'div',
      { className: 'space-y-2' },
      h('span', { className: 'font-label text-label text-mid-gray uppercase tracking-wider' }, 'Điều kiện cơ bản theo CTĐT Khoa CNTT HaUI:'),
      h(
        'div',
        { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs' },
        DEMO_INTERNSHIP_CHECKLIST.map((item, idx) =>
          item.ok
            ? h(
                'div',
                { key: idx, className: 'p-2.5 rounded-[12px] bg-canvas flex items-center gap-2' },
                icon('check_circle', 'text-ink text-[16px]'),
                h('span', null, item.text)
              )
            : h(
                'div',
                { key: idx, className: 'p-2.5 rounded-[12px] bg-canvas flex items-center gap-2 text-mid-gray' },
                icon('cancel', 'text-ember text-[16px]'),
                h('span', { className: 'text-ink' }, item.text)
              )
        )
      )
    ),
    h(
      'div',
      { className: 'flex flex-wrap items-center gap-2 pt-1' },
      h(Link, { to: '/profile', className: pillPrimary }, icon('edit_document'), h('span', null, 'Cập nhật hồ sơ thực tập')),
      h(Link, { to: '/transcript', className: pillSecondary }, icon('upload_file'), h('span', null, 'Tải lên văn bản xác nhận'))
    )
  ];

  // Thẻ Đề xuất Phương án Lộ trình (Plan Proposal) — 3 nhánh hành động
  const renderProposalCard = (msg) => {
    const proposal = msg.planProposal;
    const semesters = Array.isArray(proposal.semesters) ? proposal.semesters : [];
    const totalCredits = semesters.reduce((sum, sem) => sum + semesterCredits(sem), 0);
    const courseCount = semesters.reduce((sum, sem) => sum + (Array.isArray(sem.courses) ? sem.courses.length : 0), 0);

    return h(
      'div',
      { className: 'p-space-md bg-surface-container rounded-[18px] flex flex-col gap-space-md' },
      h(
        'div',
        { className: 'flex items-start gap-space-md' },
        h(
          'div',
          { className: 'w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center shrink-0' },
          icon('route', 'text-[20px]')
        ),
        h(
          'div',
          { className: 'flex-1 min-w-0' },
          h(
            'div',
            { className: 'flex flex-wrap items-center justify-between gap-space-xs' },
            h('p', { className: 'font-label text-label text-mid-gray uppercase tracking-wider' }, 'Đề xuất phương án lộ trình học tập mới'),
            h(
              'span',
              { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-paper text-ink font-label text-label' },
              msg.proposalAccepted ? icon('check', 'text-[14px]') : h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ink' }),
              msg.proposalAccepted ? 'Đã chấp nhận' : 'Chờ bạn xem xét'
            )
          ),
          h(
            'p',
            { className: 'font-subheading text-subheading text-ink font-semibold mt-0.5' },
            'CPA dự kiến ',
            h('span', { className: 'underline underline-offset-4' }, `${formatCpa(toNumber(proposal.projectedCpa))} / 4.00`),
            proposal.projectedRank ? ` · ${proposal.projectedRank}` : ''
          ),
          h(
            'p',
            { className: 'font-caption text-caption text-mid-gray mt-0.5' },
            `${semesters.length} học kỳ · ${totalCredits} tín chỉ · ${courseCount} học phần cân bằng tải.`
          )
        )
      ),
      semesters.length > 0
        ? h(
            'div',
            { className: 'flex flex-wrap gap-space-xs' },
            semesters.map((sem, idx) =>
              h(
                'span',
                {
                  key: sem.semesterCode || idx,
                  className: 'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-paper text-ink font-caption text-caption'
                },
                icon('event_note', 'text-[14px] text-mid-gray'),
                `${sem.semesterName || sem.semesterCode} · ${semesterCredits(sem)} TC`
              )
            )
          )
        : null,
      proposal.aiRiskAdvice
        ? h('p', { className: 'font-caption text-caption text-on-surface-variant leading-relaxed' }, proposal.aiRiskAdvice)
        : null,
      !msg.proposalAccepted
        ? h(
            'div',
            { className: 'flex flex-wrap items-center gap-2' },
            h(
              'button',
              { type: 'button', className: pillPrimary, disabled: isBusy, onClick: () => handleAcceptProposal(msg.id, proposal) },
              icon('check'),
              'Chấp nhận phương án'
            ),
            h(
              'button',
              {
                type: 'button',
                className: pillSecondary.replace('bg-canvas', 'bg-paper'),
                disabled: isBusy,
                onClick: () => handleRequestAlternative(msg.id)
              },
              icon('autorenew'),
              'Phương án khác'
            ),
            h(
              'button',
              {
                type: 'button',
                className:
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-mid-gray font-body-medium text-body hover:text-ink hover:bg-paper transition-colors',
                onClick: () => handleDismissProposal(msg.id)
              },
              icon('close'),
              'Hủy đề xuất'
            )
          )
        : h(
            'div',
            { className: 'flex flex-wrap items-center justify-between gap-space-sm' },
            h(
              'span',
              { className: 'inline-flex items-center gap-1.5 font-caption text-caption text-ink' },
              icon('check_circle'),
              'Đã nạp thành công vào Study Planner. Bạn có thể mở trang "Kế hoạch học tập" để xem toàn bộ các kỳ.'
            ),
            h(Link, { to: '/planner', className: pillPrimary }, icon('event_note'), h('span', null, 'Mở Kế hoạch học tập'))
          )
    );
  };

  // Tin nhắn AI từ API: nội dung + đề xuất + hành động + nguồn trích dẫn
  const renderLiveAssistant = (msg) => {
    const sources = msg.sources || [];
    const warnings = msg.warnings || [];
    const actions = (msg.actions || []).filter((a) => typeof a?.targetRoute === 'string' && a.targetRoute.startsWith('/'));
    const showRefs = sources.length > 0 || warnings.length > 0;
    const dataItems = [msg.context?.profileLine, msg.context?.planLine, msg.reasoningStatus].filter(Boolean);

    return [
      renderAiHeader('Tư vấn lộ trình học tập', sources.length > 0 ? 'Đối chiếu quy chế' : null),
      h('p', { className: 'font-body text-body text-ink leading-relaxed whitespace-pre-line' }, msg.text),
      msg.planProposal && !msg.proposalDismissed ? renderProposalCard(msg) : null,
      actions.length > 0
        ? h(
            'div',
            { className: 'flex flex-wrap items-center gap-2' },
            actions.map((action, idx) =>
              h(
                Link,
                { key: `${action.actionType}-${idx}`, to: action.targetRoute, className: pillSecondary },
                icon(ACTION_ICONS[action.actionType] || 'arrow_forward'),
                h('span', null, action.label || action.targetRoute)
              )
            )
          )
        : null,
      h(
        'div',
        { className: `grid grid-cols-1 ${showRefs ? 'md:grid-cols-2' : ''} gap-space-sm pt-space-xs` },
        renderSubCard(
          'data',
          'folder_shared',
          'Dữ liệu học tập sử dụng',
          dataItems,
          h('span', { className: 'font-caption text-caption text-mid-gray mt-3 block' }, `Đồng bộ: ${msg.timestamp}`)
        ),
        showRefs
          ? renderSubCard(
              'refs',
              'menu_book',
              'Nguồn tham khảo & Quy chế minh họa',
              sources.map((s) =>
                typeof s === 'string'
                  ? s
                  : h(
                      React.Fragment,
                      null,
                      s.title || s.sourceId,
                      s.section ? h('span', { className: 'text-mid-gray' }, ` — ${s.section}`) : null
                    )
              ),
              warnings.length > 0
                ? h('div', { className: 'mt-3 text-[11px] text-mid-gray italic leading-tight' }, `Lưu ý: ${warnings.join(' ')}`)
                : null
            )
          : null
      ),
      renderFeedbackRow(msg)
    ];
  };

  const renderAssistantMessage = (msg) => {
    let body;
    if (msg.demoContent === 'gpa-analysis') body = renderGpaAnalysisDemo(msg);
    else if (msg.demoContent === 'internship-check') body = renderInternshipDemo(msg);
    else body = renderLiveAssistant(msg);
    return renderAssistantFrame(msg.id, body, `${msg.timestamp} • Trợ lý AI HaUI`);
  };

  // Trạng thái Empty: lời chào + 4 Quick Prompts UI Flow
  const emptyState = h(
    'div',
    { key: 'empty', className: 'bg-paper p-space-xl rounded-[24px] shadow-sm flex flex-col items-center text-center gap-space-md' },
    h(
      'div',
      { className: 'w-12 h-12 rounded-full bg-canvas flex items-center justify-center' },
      icon('auto_awesome', 'text-ink text-[24px]')
    ),
    h(
      'div',
      { className: 'flex flex-col gap-1 max-w-xl' },
      h('h2', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Chào bạn! Tôi là Trợ lý Cố vấn Học vụ HaUI'),
      h(
        'p',
        { className: 'font-body text-body text-mid-gray' },
        'Hãy chọn một câu hỏi gợi ý bên dưới hoặc nhập thắc mắc về lộ trình, nợ môn, học cải thiện để tôi hỗ trợ.'
      )
    ),
    h(
      'div',
      { className: 'flex flex-wrap justify-center gap-space-xs' },
      h(
        'button',
        { type: 'button', className: pillPrimary, disabled: isBusy, onClick: () => handleSendMessage(QUICK_PROMPTS_MAN_2[0]) },
        icon('trending_up'),
        'Tư vấn kéo CPA lên Giỏi'
      ),
      QUICK_PROMPTS_MAN_2.slice(1).map((prompt) =>
        h(
          'button',
          {
            key: prompt,
            type: 'button',
            disabled: isBusy,
            onClick: () => handleSendMessage(prompt),
            className:
              'inline-flex items-center text-left px-3 py-1.5 rounded-full bg-canvas hover:bg-surface-variant hover:text-ink text-mid-gray font-body text-body transition-all text-xs lg:text-[13px] disabled:opacity-50'
          },
          prompt
        )
      )
    )
  );

  // Trạng thái Loading: chỉ báo AI đang suy luận
  const loadingBubble = renderAssistantFrame(
    'loading',
    [
      h(
        'div',
        { className: 'flex items-center gap-space-sm font-body text-body text-mid-gray', role: 'status' },
        h(
          'span',
          { className: 'flex items-center gap-1' },
          [0, 1, 2].map((i) =>
            h('span', {
              key: i,
              className: 'w-1.5 h-1.5 rounded-full bg-ink animate-pulse',
              style: { animationDelay: `${i * 200}ms` }
            })
          )
        ),
        'AI đang phân tích bảng điểm và quy chế...'
      )
    ],
    null
  );

  // Trạng thái Error: thẻ lỗi trong luồng hội thoại
  const errorBubble = error
    ? renderAssistantFrame(
        'error',
        [
          h(
            'div',
            { className: 'bg-error-container/40 p-space-md rounded-[18px] flex items-start gap-space-sm', role: 'alert' },
            icon('error', 'text-ember text-[20px] shrink-0 mt-0.5'),
            h(
              'div',
              { className: 'flex flex-col gap-1' },
              h(
                'span',
                { className: 'font-body-medium text-body-medium text-on-error-container font-semibold' },
                'Không thể kết nối với Trợ lý AI'
              ),
              h('p', { className: 'font-body text-body text-on-surface-variant leading-relaxed' }, error.message),
              Array.isArray(error.details) && error.details.length > 0
                ? h(
                    'ul',
                    { className: 'font-caption text-caption text-mid-gray list-disc pl-4' },
                    error.details.map((d, idx) => h('li', { key: idx }, String(d)))
                  )
                : null,
              h('span', { className: 'font-label text-label text-mid-gray' }, `Mã lỗi: ${error.code}`)
            )
          ),
          h(
            'div',
            { className: 'flex flex-wrap items-center gap-2' },
            h('button', { type: 'button', className: pillPrimary, onClick: handleRetry }, icon('refresh'), 'Thử lại'),
            h('button', { type: 'button', className: pillSecondary, onClick: () => setError(null) }, icon('close'), 'Đóng')
          )
        ],
        `${nowLabel()} • Trợ lý AI HaUI`,
        'error'
      )
    : null;

  // ---------------------------------------------------------------------------------------------
  // Tiêu đề trang
  // ---------------------------------------------------------------------------------------------
  const headerSection = h(
    'div',
    { className: 'flex flex-col gap-space-sm' },
    h(
      'div',
      { className: 'flex items-center gap-space-xs text-mid-gray font-caption text-caption' },
      h(Link, { to: '/', className: 'hover:text-ink transition-colors' }, 'Trang chủ'),
      icon('chevron_right', 'text-[14px]'),
      h('span', { className: 'text-ink font-body-medium' }, 'Tư vấn AI & Lộ trình học tập')
    ),
    h(
      'div',
      {
        className:
          'flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-paper p-space-lg rounded-[24px] shadow-sm'
      },
      h(
        'div',
        { className: 'flex flex-col max-w-3xl' },
        h(
          'div',
          { className: 'flex items-center gap-space-xs mb-1' },
          h(
            'span',
            { className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-canvas text-ink font-label text-label' },
            h('span', { className: 'w-2 h-2 rounded-full bg-ink animate-pulse' }),
            'Mô hình HaUI Academic v2.4'
          ),
          h('span', { className: 'font-caption text-caption text-mid-gray' }, 'Cập nhật theo Quy chế đào tạo 2021')
        ),
        h(
          'h1',
          { className: 'font-headline text-headline text-ink tracking-tight' },
          'Tư vấn học tập thông minh',
          h('div', null, ' (AI Advisor)')
        ),
        h(
          'p',
          { className: 'font-body text-body text-mid-gray mt-1' },
          'Hỏi đáp, phân tích tiến độ, tra cứu điều kiện tiên quyết và xây dựng lộ trình học tập tối ưu dựa trên dữ liệu học tập cá nhân.'
        )
      ),
      h(
        'div',
        { className: 'flex flex-wrap items-center gap-space-xs shrink-0 print:hidden' },
        h(
          'div',
          {
            className: 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas text-mid-gray font-label text-label',
            title: `Dữ liệu học tập cá nhân đã nạp vào AI · Phiên ${conversationId}`
          },
          icon('database', 'text-[16px] text-ink')
        ),
        h(
          'button',
          {
            type: 'button',
            onClick: handleNewSession,
            className:
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas hover:bg-surface-variant text-ink font-body-medium text-body transition-colors'
          },
          icon('refresh'),
          h('span', null, 'Làm mới phiên chat')
        ),
        h(
          'button',
          {
            type: 'button',
            onClick: handleSaveConversation,
            className:
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas hover:bg-surface-variant text-ink font-body-medium text-body transition-colors'
          },
          icon('download'),
          h('span', null, 'Lưu hội thoại (.pdf)')
        )
      )
    )
  );

  // ---------------------------------------------------------------------------------------------
  // Cột trái: gợi ý nhanh + luồng hội thoại + ô nhập
  // ---------------------------------------------------------------------------------------------
  const starterCard = h(
    'div',
    { className: 'bg-paper p-space-md rounded-[24px] shadow-sm print:hidden' },
    h(
      'div',
      { className: 'flex items-center justify-between mb-space-xs' },
      h(
        'span',
        { className: 'font-label text-label text-mid-gray uppercase tracking-wider flex items-center gap-1' },
        icon('bolt', 'text-[14px]'),
        'Gợi ý câu hỏi phân tích nhanh'
      ),
      h('span', { className: 'font-caption text-caption text-mid-gray' }, 'Nhấp để điền nhanh')
    ),
    h(
      'div',
      { className: 'flex flex-wrap gap-space-xs pt-1' },
      STARTER_PROMPTS.map((prompt) =>
        h(
          'button',
          {
            key: prompt,
            type: 'button',
            onClick: () => handleFillPrompt(prompt),
            className:
              'inline-flex items-center text-left px-3 py-1.5 rounded-full bg-canvas hover:bg-surface-variant hover:text-ink text-mid-gray font-body text-body transition-all text-xs lg:text-[13px]'
          },
          h('span', null, prompt)
        )
      )
    )
  );

  const thread = h(
    'div',
    { className: 'relative flex flex-col gap-space-lg pb-space-md', 'aria-live': 'polite' },
    messages.length === 0 && !isBusy && !error ? emptyState : null,
    ...messages.map((msg) => (msg.sender === 'user' ? renderUserMessage(msg) : renderAssistantMessage(msg))),
    isBusy ? loadingBubble : null,
    errorBubble,
    h('div', { ref: threadEndRef, className: 'absolute bottom-0 left-0 w-px h-px scroll-mb-40', 'aria-hidden': true })
  );

  const composer = h(
    'div',
    { className: 'sticky bottom-4 z-30 w-full print:hidden' },
    h(
      'div',
      { className: 'bg-paper p-space-sm rounded-[24px] shadow-md flex flex-col gap-2' },
      h(
        'div',
        { className: 'flex items-center gap-2' },
        h(
          Link,
          {
            to: '/transcript',
            title: 'Đính kèm bảng điểm hoặc minh chứng',
            'aria-label': 'Đính kèm bảng điểm hoặc minh chứng',
            className:
              'w-9 h-9 rounded-full bg-canvas hover:bg-surface-variant flex items-center justify-center text-mid-gray hover:text-ink transition-colors shrink-0'
          },
          icon('attach_file', 'text-[18px]')
        ),
        h(
          'div',
          { className: 'relative flex-1' },
          h('input', {
            ref: inputRef,
            type: 'text',
            value: inputValue,
            onChange: (e) => setInputValue(e.target.value),
            onKeyDown: handleKeyDown,
            disabled: isBusy,
            'aria-label': 'Câu hỏi gửi Trợ lý AI',
            placeholder: 'Hỏi AI về môn tiên quyết, mẹo kéo GPA, điều kiện tốt nghiệp...',
            className:
              'w-full bg-canvas rounded-full px-4 py-2.5 font-body text-body text-ink placeholder:text-mid-gray focus:outline-none focus:bg-surface-alt transition-all disabled:opacity-60'
          })
        ),
        h(
          'button',
          {
            type: 'button',
            title: 'Nhập giọng nói',
            'aria-label': 'Nhập giọng nói',
            onClick: handleVoiceInput,
            className:
              'w-9 h-9 rounded-full bg-canvas hover:bg-surface-variant flex items-center justify-center text-mid-gray hover:text-ink transition-colors shrink-0'
          },
          icon('mic', 'text-[18px]')
        ),
        h(
          'button',
          {
            type: 'button',
            title: 'Gửi yêu cầu',
            'aria-label': 'Gửi yêu cầu',
            onClick: () => handleSendMessage(),
            disabled: isBusy,
            className:
              'inline-flex items-center justify-center w-10 h-10 rounded-full bg-ink text-paper hover:bg-ink-soft transition-colors shrink-0 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed'
          },
          icon(isBusy ? 'progress_activity' : 'send', `text-[18px] ${isBusy ? 'animate-spin' : ''}`)
        )
      ),
      h(
        'p',
        { className: 'font-caption text-caption text-mid-gray text-center px-space-md select-none' },
        'AI Advisor sử dụng dữ liệu học tập cá nhân mẫu để phân tích. Dữ liệu chỉ mang tính chất tham khảo hỗ trợ sinh viên.'
      )
    )
  );

  // ---------------------------------------------------------------------------------------------
  // Cột phải: ngữ cảnh & gợi ý
  // ---------------------------------------------------------------------------------------------
  const profileRow = (label, value) =>
    h(
      'div',
      { className: 'flex items-center justify-between gap-space-sm py-1' },
      h('span', { className: 'font-caption text-caption text-mid-gray shrink-0' }, label),
      value
    );

  const valueText = (text) => h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold text-right' }, text);

  const percent = creditsPercent(profile.accumulatedCredits, profile.totalCreditsRequired);
  const syncPill = {
    loading: { dot: 'bg-mid-gray animate-pulse', label: 'Đang đồng bộ' },
    ready: { dot: 'bg-ink', label: 'Đồng bộ' },
    demo: { dot: 'bg-mid-gray', label: 'Dữ liệu mẫu' },
    error: { dot: 'bg-ember', label: 'Chưa đồng bộ' }
  }[profile.syncState] || { dot: 'bg-ink', label: 'Đồng bộ' };

  let syncText = 'Đang tải...';
  if (profile.syncState === 'error') syncText = 'Không tải được trạng thái học tập';
  else if (profile.syncState !== 'loading') {
    syncText = profile.courseCount !== null ? `Đã tải (${profile.courseCount}/${profile.courseCount} môn)` : 'Đã tải';
  }

  const profileCard = h(
    'div',
    { className: 'bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col gap-space-md' },
    h(
      'div',
      { className: 'flex items-center justify-between pb-space-xs border-b border-hairline' },
      h(
        'div',
        { className: 'flex items-center gap-2' },
        icon('badge', 'text-ink text-[20px]'),
        h('h2', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Hồ sơ nạp vào AI')
      ),
      h(
        'span',
        { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas text-mid-gray font-label text-label' },
        h('span', { className: `w-1.5 h-1.5 rounded-full ${syncPill.dot}` }),
        syncPill.label
      )
    ),
    h(
      'div',
      { className: 'flex flex-col gap-space-sm' },
      profileRow('Sinh viên', valueText(`${profile.fullName} (${profile.studentCode})`)),
      profileRow(
        'CPA hiện tại',
        h(
          'div',
          { className: 'flex items-center gap-1.5' },
          valueText(`${formatCpa(profile.cpa)} / 4.00`),
          h('span', { className: 'px-2 py-0.5 rounded-full bg-canvas text-ink font-label text-label whitespace-nowrap' }, describeCpa(profile.cpa))
        )
      ),
      h(
        'div',
        { className: 'flex flex-col gap-1 py-1' },
        h(
          'div',
          { className: 'flex items-center justify-between gap-space-sm' },
          h('span', { className: 'font-caption text-caption text-mid-gray' }, 'Tín chỉ tích lũy'),
          valueText(
            `${profile.accumulatedCredits ?? '—'} / ${profile.totalCreditsRequired ?? '—'} TC${percent !== null ? ` (${percent}%)` : ''}`
          )
        ),
        h(
          'div',
          { className: 'w-full bg-canvas h-1.5 rounded-full overflow-hidden mt-1' },
          h('div', { className: 'bg-ink h-full rounded-full', style: { width: `${percent ?? 0}%` } })
        ),
        profile.failedCourses.length > 0
          ? h(
              'span',
              { className: 'font-caption text-caption text-ember flex items-center gap-1 mt-1' },
              icon('warning', 'text-[14px]'),
              `Nợ ${profile.failedCourses.length} môn F (${profile.failedCourses
                .map((c) => `${c.courseCode} - ${c.courseName}`)
                .join(', ')})`
            )
          : null
      ),
      profileRow('Phiên bản kế hoạch', valueText(`${planInfo.statusLabel} ${planInfo.version}`)),
      profileRow(
        'Đồng bộ dữ liệu',
        h(
          'span',
          { className: 'font-body-medium text-body-medium text-ink flex items-center gap-1' },
          icon(profile.syncState === 'error' ? 'cloud_off' : 'cloud_done', `text-[16px] ${profile.syncState === 'error' ? 'text-ember' : 'text-ink'}`),
          syncText
        )
      )
    ),
    h(
      Link,
      {
        to: '/profile',
        className:
          'w-full py-2 rounded-full bg-canvas hover:bg-surface-variant text-ink font-body-medium text-body text-center transition-colors'
      },
      'Xem hồ sơ học tập chi tiết'
    )
  );

  const topicsCard = h(
    'div',
    { className: 'bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col gap-space-md print:hidden' },
    h(
      'div',
      { className: 'flex items-center gap-2 pb-space-xs border-b border-hairline' },
      icon('explore', 'text-ink text-[20px]'),
      h('h2', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Gợi ý chủ đề hỏi đáp nhanh')
    ),
    h(
      'div',
      { className: 'flex flex-col gap-2' },
      QUICK_TOPICS.map((topic) =>
        h(
          'button',
          {
            key: topic.title,
            type: 'button',
            disabled: isBusy,
            onClick: () => handleSendMessage(topic.prompt),
            className:
              'group w-full text-left p-space-sm rounded-[18px] bg-canvas hover:bg-surface-variant flex items-center justify-between transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
          },
          h(
            'div',
            { className: 'flex items-center gap-2.5' },
            h(
              'div',
              {
                className:
                  'w-8 h-8 rounded-full bg-paper flex items-center justify-center text-ink shrink-0 group-hover:scale-105 transition-transform'
              },
              icon(topic.icon)
            ),
            h(
              'div',
              { className: 'flex flex-col' },
              h('span', { className: 'font-body-medium text-body-medium text-ink font-medium' }, topic.title),
              h('span', { className: 'font-caption text-caption text-mid-gray' }, topic.caption)
            )
          ),
          icon('chevron_right', 'text-mid-gray text-[16px] group-hover:text-ink group-hover:translate-x-0.5 transition-all')
        )
      )
    )
  );

  const safetyCard = h(
    'div',
    { className: 'bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col gap-space-sm' },
    h(
      'div',
      { className: 'flex items-center gap-2' },
      icon('shield', 'text-ink text-[20px]'),
      h('h2', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Lưu ý thuật toán AI')
    ),
    h(
      'div',
      { className: 'p-space-sm bg-canvas rounded-[18px] flex items-start gap-2.5' },
      icon('lock', 'text-mid-gray text-[18px] shrink-0 mt-0.5'),
      h(
        'p',
        { className: 'font-caption text-caption text-mid-gray leading-relaxed' },
        h('strong', null, 'Ghi chú an toàn:'),
        ' AI hoạt động độc lập trên thiết bị, không thay đổi dữ liệu gốc trên hệ thống quản lý đào tạo của HaUI. Dữ liệu phân tích dựa trên cây tiên quyết của Khoa Công nghệ Thông tin.'
      )
    ),
    h(
      'div',
      { className: 'flex items-center justify-between text-mid-gray font-caption text-caption px-1 pt-1' },
      h('span', null, 'Phiên bản thuật toán: 2024.3'),
      h('a', { className: 'hover:text-ink underline', href: '#', onClick: (e) => e.preventDefault() }, 'Chính sách bảo mật')
    )
  );

  // Toast thông báo
  const toast = toastMessage
    ? h(
        'div',
        {
          role: 'status',
          className:
            'fixed top-20 right-space-xl z-50 max-w-md flex items-start gap-space-sm bg-ink text-paper px-space-md py-3 rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] print:hidden'
        },
        icon('check_circle', 'text-[18px] shrink-0'),
        h('span', { className: 'font-body text-body flex-1' }, toastMessage),
        h(
          'button',
          {
            type: 'button',
            onClick: () => setToastMessage(''),
            'aria-label': 'Đóng thông báo',
            className: 'text-paper/70 hover:text-paper transition-colors'
          },
          icon('close')
        )
      )
    : null;

  // Điều khiển kiểm thử trạng thái (chỉ hiện trong panel công cụ dev)
  const devButtonClass =
    'inline-flex items-center gap-space-xs px-space-md py-1 rounded-full border border-hairline font-label text-label text-ink hover:bg-canvas transition-colors';
  const devControls = ui?.DevSlot
    ? h(
        ui.DevSlot,
        { title: 'Tư vấn AI — Trạng thái' },
        h(
          'div',
          { className: 'flex flex-wrap gap-space-xs' },
          h('button', { type: 'button', className: devButtonClass, onClick: handleSimulateError }, 'Mô phỏng lỗi'),
          h(
            'button',
            { type: 'button', className: devButtonClass, onClick: () => setDevLoading((prev) => !prev) },
            devLoading ? 'Tắt mô phỏng tải' : 'Mô phỏng đang tải'
          ),
          h('button', { type: 'button', className: devButtonClass, onClick: handleClearChat }, 'Hội thoại trống'),
          h('button', { type: 'button', className: devButtonClass, onClick: handleLoadDemo }, 'Nạp hội thoại mẫu')
        )
      )
    : null;

  return h(
    'div',
    { className: 'flex flex-col w-full haui-chat-page' },
    h(
      'div',
      { className: 'px-space-md lg:px-space-xl py-space-lg flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full' },
      headerSection,
      h(
        'div',
        { className: 'grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start' },
        h('section', { className: 'lg:col-span-8 flex flex-col gap-space-md' }, starterCard, thread, composer),
        h('aside', { className: 'lg:col-span-4 flex flex-col gap-space-md' }, profileCard, topicsCard, safetyCard)
      )
    ),
    toast,
    devControls
  );
}

export default ChatAdvisorPage;
