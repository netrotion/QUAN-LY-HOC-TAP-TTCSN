import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DevSlot } from '../components/dev/DevTools.jsx';
import { STUDENT_PRESETS, loginStudent } from '../services/academicStore.js';
import { api } from '../services/apiClient.js';

/**
 * Màn hình Xác thực (`/login`) — prototype-v1 (tv3-planner-ui/design/prototype/login)
 * Một thẻ duy nhất có thanh chuyển tab, gộp 3 màn prototype:
 * 1. Đăng nhập (`login/dang_nhap`): Mã sinh viên hoặc Email + mật khẩu, ẩn/hiện mật khẩu, ghi nhớ đăng nhập.
 *    Gọi loginStudent() của academicStore (mã chứa "normal"/"empty" chọn persona tương ứng, còn lại là
 *    sinh viên có nguy cơ học vụ), đồng bộ sinh viên sang api.setSessionStudent rồi chuyển về Tổng quan (`/`).
 * 2. Đăng ký (`login/dang_ki_tai_khoan`, `?tab=register`): kiểm tra form phía client (chưa có backend).
 * 3. Quên mật khẩu (`login/quen_mat_khau`, `?tab=forgot`): kiểm tra email phía client (chưa có backend).
 * Route nằm ngoài MainLayout nên trang tự dựng logo, thẻ và footer. 3 tài khoản mẫu (STUDENT_PRESETS)
 * để đăng nhập nhanh nằm trong panel công cụ dev (DevSlot).
 */

const TABS = [
  { id: 'login', label: 'Đăng nhập' },
  { id: 'register', label: 'Đăng ký' },
  { id: 'forgot', label: 'Quên mật khẩu' }
];

const TAB_HEADINGS = {
  login: {
    title: 'Chào mừng đến với HAUI ADVISOR',
    subtitle: 'Đăng nhập để quản lý kết quả học tập và xây dựng lộ trình học tập cá nhân'
  },
  register: {
    title: 'Tạo tài khoản sinh viên mới',
    subtitle: 'Khởi tạo không gian quản lý lộ trình học tập cá nhân tại HaUI'
  },
  forgot: {
    title: 'Quên mật khẩu?',
    subtitle: 'Nhập email sinh viên đã đăng ký để nhận mã xác thực và hướng dẫn đặt lại mật khẩu.'
  }
};

const FOOTER_LINKS = ['Điều khoản sử dụng', 'Chính sách bảo mật', 'Hỗ trợ sinh viên'];

const REMEMBER_STORAGE_KEY = 'haui_login_remember_id';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_ID_PATTERN = /^[0-9]{10}$/;

const EMPTY_REGISTER_FORM = {
  fullName: '',
  studentId: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
};

const FEEDBACK_STYLES = {
  error: { box: 'bg-error-container text-on-error-container', icon: 'error', iconClass: 'text-ember' },
  success: { box: 'bg-surface-container-high text-ink', icon: 'check_circle', iconClass: 'text-ink' },
  info: { box: 'bg-canvas text-ink', icon: 'info', iconClass: 'text-mid-gray' }
};

const INPUT_CLASS =
  'w-full bg-surface-alt rounded-[18px] font-body text-body text-ink placeholder:text-mid-gray focus:outline-none focus:bg-paper focus:ring-1 focus:ring-hairline transition-all';
const REGISTER_INPUT_CLASS =
  'w-full pl-10 py-2.5 bg-surface-alt rounded-[18px] font-body text-body text-ink placeholder:text-mid-gray outline-none transition-colors focus:bg-paper focus:ring-1 focus:ring-hairline';
const PRIMARY_BUTTON_CLASS =
  'w-full h-11 bg-ink text-paper rounded-[18px] font-body-medium text-body-medium flex items-center justify-center gap-2 hover:bg-ink-soft active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-wait';
const TEXT_LINK_CLASS = 'font-body-medium text-body-medium text-ink hover:underline';

function readRememberedId() {
  try {
    return window.localStorage.getItem(REMEMBER_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeRememberedId(value) {
  try {
    if (value) window.localStorage.setItem(REMEMBER_STORAGE_KEY, value);
    else window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
  } catch {
    // localStorage bị chặn: bỏ qua, chỉ mất tính năng ghi nhớ
  }
}

/** Chấm điểm độ mạnh mật khẩu giống thanh đo của prototype Đăng ký (4 vạch). */
function getPasswordStrength(value) {
  if (!value) return { score: 0, label: 'Chưa nhập', hint: 'Độ bảo mật mật khẩu', barClass: '' };
  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;
  if (score <= 1) return { score, label: 'Yếu', hint: 'Nên thêm số và chữ hoa', barClass: 'bg-ember' };
  if (score === 2) return { score, label: 'Trung bình', hint: 'Thêm ký tự đặc biệt', barClass: 'bg-secondary' };
  if (score === 3) return { score, label: 'Khá', hint: 'Mật khẩu đạt yêu cầu', barClass: 'bg-ink' };
  return { score, label: 'Mạnh', hint: 'Bảo mật tối ưu', barClass: 'bg-ink' };
}

function validateRegisterForm(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Bắt buộc nhập họ tên';
  if (!STUDENT_ID_PATTERN.test(form.studentId.trim())) errors.studentId = 'Mã sinh viên phải gồm đúng 10 chữ số';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Email không hợp lệ';
  if (form.password.length < 6) errors.password = 'Mật khẩu tối thiểu 6 ký tự';
  if (!form.confirmPassword || form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  }
  if (!form.acceptTerms) errors.terms = 'Bạn cần đồng ý với điều khoản để tiếp tục';
  return errors;
}

/** Link tĩnh của prototype (href="#"), chưa có trang đích. */
function PlaceholderLink({ className, children }) {
  return (
    <a className={className} href="#" onClick={(e) => e.preventDefault()}>
      {children}
    </a>
  );
}

function PasswordToggle({ visible, onToggle, label, className, iconClassName }) {
  return (
    <button aria-label={label} aria-pressed={visible} className={className} onClick={onToggle} type="button">
      <span className={`material-symbols-outlined ${iconClassName}`}>{visible ? 'visibility_off' : 'visibility'}</span>
    </button>
  );
}

function FeedbackAlert({ feedback, onAction }) {
  const style = FEEDBACK_STYLES[feedback.type] || FEEDBACK_STYLES.info;
  return (
    <div
      className={`rounded-[18px] p-3.5 flex items-start gap-2.5 text-left transition-all ${style.box}`}
      role={feedback.type === 'error' ? 'alert' : 'status'}
    >
      <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${style.iconClass}`}>{style.icon}</span>
      <div className="font-body text-body">
        {feedback.content}
        {feedback.actionLabel && (
          <div className="mt-2">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink text-paper font-label text-label hover:bg-ink-soft transition-colors"
              onClick={onAction}
              type="button"
            >
              <span>{feedback.actionLabel}</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'register' || requestedTab === 'forgot' ? requestedTab : 'login';

  // Hẹn giờ mô phỏng độ trễ xác thực — dọn khi rời trang
  const timersRef = useRef([]);
  useEffect(() => () => timersRef.current.forEach((id) => clearTimeout(id)), []);
  const schedule = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  // --- Đăng nhập ---
  const studentIdRef = useRef(null);
  const passwordRef = useRef(null);
  const [studentIdInput, setStudentIdInput] = useState(() => readRememberedId());
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(readRememberedId()));
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // --- Đăng ký ---
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [registerErrors, setRegisterErrors] = useState({});
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [registeredAccount, setRegisteredAccount] = useState(null);

  // --- Quên mật khẩu ---
  const forgotEmailRef = useRef(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSentTo, setForgotSentTo] = useState(null);

  const resetRegisterForm = () => {
    setRegisterForm(EMPTY_REGISTER_FORM);
    setRegisterErrors({});
    setShowRegisterPassword(false);
    setShowRegisterConfirm(false);
    setRegisteredAccount(null);
  };

  const switchTab = (tabId) => {
    setFeedback(null);
    setRegisteredAccount(null);
    setForgotSentTo(null);
    setForgotError('');
    setSearchParams(tabId === 'login' ? {} : { tab: tabId }, { replace: true });
  };

  const completeLogin = (credentials, displayId) => {
    const snapshot = loginStudent(credentials);

    // Đồng bộ thông tin sinh viên sang Singleton API Client
    const preset = STUDENT_PRESETS[snapshot?.activePresetId];
    if (preset) {
      api.setSessionStudent(preset);
    }

    writeRememberedId(rememberMe ? displayId : '');
    setLoading(false);
    setFeedback({
      type: 'success',
      content: (
        <>
          <strong>Xác thực thành công!</strong> Chào mừng sinh viên{' '}
          <strong>{preset?.fullName || displayId}</strong> ({displayId}) quay lại HAUI ADVISOR.
        </>
      ),
      actionLabel: 'Vào Tổng quan ngay'
    });

    schedule(() => navigate('/'), 700);
  };

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    const idVal = studentIdInput.trim();
    if (!idVal) {
      setFeedback({ type: 'error', content: 'Vui lòng nhập Mã sinh viên (10 số) hoặc Email HaUI hợp lệ.' });
      studentIdRef.current?.focus();
      return;
    }
    if (!passwordInput) {
      setFeedback({ type: 'error', content: 'Vui lòng nhập mật khẩu tài khoản học tập.' });
      passwordRef.current?.focus();
      return;
    }
    if (passwordInput.length < 6) {
      setFeedback({ type: 'error', content: 'Mật khẩu cần có ít nhất 6 ký tự để đảm bảo an toàn.' });
      passwordRef.current?.focus();
      return;
    }

    setFeedback(null);
    setLoading(true);
    // Mã sinh viên chứa "normal" / "empty" sẽ chọn persona tương ứng (xem loginStudent)
    schedule(() => completeLogin({ studentId: idVal, password: passwordInput }, idVal), 400);
  };

  /** Công cụ review: đăng nhập ngay bằng một trong 3 tài khoản mẫu. */
  const handleQuickLogin = (presetId) => {
    const preset = STUDENT_PRESETS[presetId];
    if (!preset || loading) return;
    if (activeTab !== 'login') switchTab('login');
    setStudentIdInput(preset.studentId);
    setPasswordInput('');
    completeLogin({ presetId: preset.id, studentId: preset.studentId }, preset.studentId);
  };

  const updateRegisterField = (field, value) => {
    setRegisterForm((prev) => ({ ...prev, [field]: value }));
    const errorKey = field === 'acceptTerms' ? 'terms' : field;
    if (registerErrors[errorKey]) {
      setRegisterErrors((prev) => ({ ...prev, [errorKey]: undefined }));
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const errors = validateRegisterForm(registerForm);
    setRegisterErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setRegisteredAccount({
      fullName: registerForm.fullName.trim(),
      studentId: registerForm.studentId.trim(),
      email: registerForm.email.trim()
    });
  };

  const goToLoginWithRegisteredAccount = () => {
    const account = registeredAccount;
    resetRegisterForm();
    switchTab('login');
    if (account) {
      setStudentIdInput(account.studentId);
      setPasswordInput('');
      setFeedback({
        type: 'info',
        content: (
          <>
            Đã tạo hồ sơ sinh viên cho <strong>{account.fullName}</strong> ({account.studentId}). Nhập mật khẩu
            và nhấn <strong>Đăng nhập</strong> để tiếp tục.
          </>
        )
      });
    }
  };

  const handleForgot = (e) => {
    e.preventDefault();
    if (forgotSending) return;
    const val = forgotEmail.trim();
    if (!val) {
      setForgotError('Vui lòng nhập địa chỉ email của bạn.');
      forgotEmailRef.current?.focus();
      return;
    }
    if (!EMAIL_PATTERN.test(val.toLowerCase())) {
      setForgotError('Định dạng email không hợp lệ (Ví dụ: student@haui.edu.vn).');
      forgotEmailRef.current?.focus();
      return;
    }
    setForgotError('');
    setForgotSending(true);
    schedule(() => {
      setForgotSending(false);
      setForgotSentTo(val);
    }, 700);
  };

  const handleForgotRetry = () => {
    setForgotSentTo(null);
    setForgotEmail('');
    setForgotError('');
    schedule(() => forgotEmailRef.current?.focus(), 0);
  };

  const handleForgotBackToLogin = () => {
    setForgotEmail('');
    switchTab('login');
  };

  const heading = TAB_HEADINGS[activeTab];
  const showHeading = !(activeTab === 'forgot' && forgotSentTo);
  const strength = getPasswordStrength(registerForm.password);

  return (
    <div className="min-h-screen bg-canvas font-body text-on-surface antialiased flex flex-col justify-between selection:bg-primary selection:text-paper">
      {/* Logo */}
      <div className="w-full flex justify-center pt-space-xl px-space-md sm:pt-12">
        <header className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center">
            <span className="material-symbols-outlined text-paper text-[18px]">school</span>
          </div>
          <div className="flex flex-col">
            <span className="font-subheading text-subheading text-ink tracking-tight uppercase font-semibold">
              HAUI ADVISOR
            </span>
            <span className="font-caption text-caption text-mid-gray tracking-wide uppercase">
              Đại học Công nghiệp Hà Nội
            </span>
          </div>
        </header>
      </div>

      <main className="w-full flex-1 flex flex-col items-center justify-center px-space-md py-space-xl">
        <div className="flex flex-col w-full max-w-xl mx-auto items-center">
          <div className="w-full bg-paper rounded-[24px] shadow-sm p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
            {/* Nhãn cổng & bảo mật */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-alt font-label text-label text-ink">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember"></span>
                  Cổng Sinh Viên
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-mid-gray font-caption text-caption self-start sm:self-auto">
                <span className="material-symbols-outlined text-[16px] text-mid-gray">verified_user</span>
                <span>Môi trường bảo mật SSL</span>
              </div>
            </div>

            {showHeading && (
              <div className="flex flex-col gap-1.5">
                <h1 className="font-headline text-headline text-ink tracking-tight font-semibold">{heading.title}</h1>
                <p className="font-body text-body text-secondary">{heading.subtitle}</p>
              </div>
            )}

            {/* Thanh chuyển tab */}
            <div className="grid grid-cols-3 p-1 rounded-full bg-canvas text-center" role="tablist">
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    aria-selected={isActive}
                    className={`py-2 px-3 rounded-full font-label text-label transition-all ${
                      isActive ? 'bg-paper text-ink shadow-sm' : 'text-mid-gray hover:text-ink'
                    }`}
                    id={`tab-${tab.id}`}
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ===== Tab Đăng nhập ===== */}
            {activeTab === 'login' && (
              <>
                <form className="flex flex-col gap-4" noValidate onSubmit={handleLogin}>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="font-body-medium text-body-medium text-ink flex items-center justify-between"
                      htmlFor="studentIdInput"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-secondary">badge</span>
                        Mã sinh viên hoặc Email
                      </span>
                      <span className="font-caption text-caption text-mid-gray">Bắt buộc</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        autoComplete="username"
                        className={`${INPUT_CLASS} px-4 py-3`}
                        id="studentIdInput"
                        name="identifier"
                        onChange={(e) => setStudentIdInput(e.target.value)}
                        placeholder="Ví dụ: 2020601234 hoặc sv@haui.edu.vn"
                        ref={studentIdRef}
                        type="text"
                        value={studentIdInput}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      className="font-body-medium text-body-medium text-ink flex items-center justify-between"
                      htmlFor="passwordInput"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-secondary">lock</span>
                        Mật khẩu
                      </span>
                      <span className="font-caption text-caption text-mid-gray">Tối thiểu 6 ký tự</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        autoComplete="current-password"
                        className={`${INPUT_CLASS} pl-4 pr-11 py-3`}
                        id="passwordInput"
                        name="password"
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Nhập mật khẩu tài khoản"
                        ref={passwordRef}
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                      />
                      <PasswordToggle
                        className="absolute right-3 p-1 text-mid-gray hover:text-ink focus:outline-none"
                        iconClassName="text-[20px] block"
                        label="Hiện hoặc ẩn mật khẩu"
                        onToggle={() => setShowPassword((v) => !v)}
                        visible={showPassword}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        checked={rememberMe}
                        className="w-4 h-4 rounded accent-ink cursor-pointer"
                        id="remember-me"
                        onChange={(e) => setRememberMe(e.target.checked)}
                        type="checkbox"
                      />
                      <span className="font-body text-body text-secondary">Ghi nhớ đăng nhập</span>
                    </label>
                    <button className={TEXT_LINK_CLASS} onClick={() => switchTab('forgot')} type="button">
                      Quên mật khẩu?
                    </button>
                  </div>

                  <button className={PRIMARY_BUTTON_CLASS} disabled={loading} type="submit">
                    <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
                    {loading && (
                      <svg
                        className="animate-spin h-4 w-4 text-paper"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <span className="font-body text-body text-secondary">Chưa có tài khoản?</span>
                    <button className={TEXT_LINK_CLASS} onClick={() => switchTab('register')} type="button">
                      Đăng ký ngay
                    </button>
                  </div>
                </form>

                <div className="pt-4 flex flex-col gap-3">
                  {feedback && <FeedbackAlert feedback={feedback} onAction={() => navigate('/')} />}
                </div>
              </>
            )}

            {/* ===== Tab Đăng ký ===== */}
            {activeTab === 'register' && (
              <>
                <form className="flex flex-col gap-space-md" noValidate onSubmit={handleRegister}>
                  {/* Họ và tên */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label text-label text-ink flex items-center justify-between" htmlFor="reg-fullName">
                      <span>Họ và tên</span>
                      {registerErrors.fullName && (
                        <span className="text-ember font-caption text-caption">{registerErrors.fullName}</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-mid-gray pointer-events-none">
                        person
                      </span>
                      <input
                        autoComplete="name"
                        className={`${REGISTER_INPUT_CLASS} pr-4`}
                        id="reg-fullName"
                        onChange={(e) => updateRegisterField('fullName', e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn An"
                        type="text"
                        value={registerForm.fullName}
                      />
                    </div>
                  </div>

                  {/* Mã sinh viên */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-label text-ink" htmlFor="reg-studentId">
                        Mã sinh viên
                      </label>
                      <span className="font-caption text-caption text-mid-gray">Định dạng 10 chữ số</span>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-mid-gray pointer-events-none">
                        badge
                      </span>
                      <input
                        className={`${REGISTER_INPUT_CLASS} pr-4`}
                        id="reg-studentId"
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) => updateRegisterField('studentId', e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Ví dụ: 2020601234"
                        type="text"
                        value={registerForm.studentId}
                      />
                    </div>
                    {registerErrors.studentId && (
                      <span className="text-ember font-caption text-caption">{registerErrors.studentId}</span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label text-label text-ink flex items-center justify-between" htmlFor="reg-email">
                      <span>Địa chỉ Email</span>
                      {registerErrors.email && (
                        <span className="text-ember font-caption text-caption">{registerErrors.email}</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-mid-gray pointer-events-none">
                        alternate_email
                      </span>
                      <input
                        autoComplete="email"
                        className={`${REGISTER_INPUT_CLASS} pr-4`}
                        id="reg-email"
                        onChange={(e) => updateRegisterField('email', e.target.value)}
                        placeholder="Ví dụ: an.nguyen@example.com hoặc sv@haui.edu.vn"
                        type="email"
                        value={registerForm.email}
                      />
                    </div>
                  </div>

                  {/* Mật khẩu + thanh đo độ mạnh */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label text-label text-ink flex items-center justify-between" htmlFor="reg-password">
                      <span>Mật khẩu</span>
                      {registerErrors.password && (
                        <span className="text-ember font-caption text-caption">{registerErrors.password}</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-mid-gray pointer-events-none">
                        lock
                      </span>
                      <input
                        autoComplete="new-password"
                        className={`${REGISTER_INPUT_CLASS} pr-11`}
                        id="reg-password"
                        onChange={(e) => updateRegisterField('password', e.target.value)}
                        placeholder="••••••••"
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerForm.password}
                      />
                      <PasswordToggle
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mid-gray hover:text-ink focus:outline-none transition-colors flex items-center"
                        iconClassName="text-[18px]"
                        label="Ẩn hiện mật khẩu"
                        onToggle={() => setShowRegisterPassword((v) => !v)}
                        visible={showRegisterPassword}
                      />
                    </div>
                    <div className="pt-1">
                      <div className="grid grid-cols-4 gap-1.5 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                        {[0, 1, 2, 3].map((idx) => (
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              idx < strength.score ? strength.barClass : 'bg-surface-container'
                            }`}
                            key={idx}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="font-caption text-caption text-mid-gray">{strength.hint}</span>
                        <span className="font-caption text-caption font-medium text-mid-gray">{strength.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Xác nhận mật khẩu */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="font-label text-label text-ink flex items-center justify-between"
                      htmlFor="reg-confirmPassword"
                    >
                      <span>Xác nhận mật khẩu</span>
                      {registerErrors.confirmPassword && (
                        <span className="text-ember font-caption text-caption">{registerErrors.confirmPassword}</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-mid-gray pointer-events-none">
                        lock_reset
                      </span>
                      <input
                        autoComplete="new-password"
                        className={`${REGISTER_INPUT_CLASS} pr-11`}
                        id="reg-confirmPassword"
                        onChange={(e) => updateRegisterField('confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        type={showRegisterConfirm ? 'text' : 'password'}
                        value={registerForm.confirmPassword}
                      />
                      <PasswordToggle
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mid-gray hover:text-ink focus:outline-none transition-colors flex items-center"
                        iconClassName="text-[18px]"
                        label="Ẩn hiện mật khẩu xác nhận"
                        onToggle={() => setShowRegisterConfirm((v) => !v)}
                        visible={showRegisterConfirm}
                      />
                    </div>
                  </div>

                  {/* Đồng ý điều khoản */}
                  <div className="pt-1">
                    <label className="flex items-start gap-space-sm cursor-pointer select-none">
                      <input
                        checked={registerForm.acceptTerms}
                        className="sr-only peer"
                        id="reg-terms"
                        onChange={(e) => updateRegisterField('acceptTerms', e.target.checked)}
                        type="checkbox"
                      />
                      <div className="w-4 h-4 shrink-0 rounded-[4px] bg-paper mt-0.5 flex items-center justify-center peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-ink text-transparent transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </div>
                      <span className="font-caption text-caption text-on-surface-variant leading-relaxed">
                        Tôi đồng ý với{' '}
                        <PlaceholderLink className="text-ink font-medium hover:underline">Điều khoản sử dụng</PlaceholderLink>{' '}
                        và{' '}
                        <PlaceholderLink className="text-ink font-medium hover:underline">Chính sách bảo mật</PlaceholderLink>{' '}
                        của HAUI ADVISOR
                      </span>
                    </label>
                    {registerErrors.terms && (
                      <span className="text-ember font-caption text-caption block mt-1">{registerErrors.terms}</span>
                    )}
                  </div>

                  <div className="pt-space-xs">
                    <button
                      className="w-full py-2.5 px-space-md bg-ink-soft hover:bg-ink text-paper rounded-full font-body-medium text-body-medium shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-space-xs cursor-pointer"
                      type="submit"
                    >
                      <span>Tạo tài khoản</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 pt-space-xs text-center">
                    <span className="font-body text-body text-mid-gray">Đã có tài khoản?</span>
                    <button
                      className={`${TEXT_LINK_CLASS} inline-flex items-center gap-0.5`}
                      onClick={() => switchTab('login')}
                      type="button"
                    >
                      Đăng nhập ngay
                    </button>
                  </div>
                </form>

                <div className="bg-surface-alt rounded-[16px] p-space-sm flex items-start gap-space-sm">
                  <span className="material-symbols-outlined text-[18px] text-mid-gray shrink-0 mt-0.5">verified_user</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-caption text-caption font-medium text-ink">Ghi chú vận hành &amp; Bảo mật độc lập</span>
                    <p className="font-caption text-caption text-mid-gray leading-normal">
                      Hệ thống HAUI ADVISOR được vận hành độc lập, không liên kết trực tiếp tài khoản xác thực
                      sv.haui.edu.vn. Người học chủ động thiết lập hồ sơ học thuật và tự quản lý dữ liệu cá nhân.
                    </p>
                  </div>
                </div>

                {/* Trạng thái đăng ký thành công (phủ lên thẻ) */}
                {registeredAccount && (
                  <div
                    aria-live="polite"
                    className="absolute inset-0 bg-paper/95 rounded-[24px] p-space-lg backdrop-blur-sm flex flex-col items-center justify-center text-center z-20"
                  >
                    <div className="w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center mb-space-md shadow-sm">
                      <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                        check_circle
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container mb-space-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink"></span>
                      <span className="font-caption text-caption text-ink font-medium tracking-wide uppercase">
                        Xác thực thành công
                      </span>
                    </div>
                    <h2 className="font-headline text-headline text-ink tracking-tight font-semibold mt-1">
                      Đăng ký thành công!
                    </h2>
                    <p className="font-body text-body text-mid-gray mt-space-xs max-w-sm">
                      Tài khoản sinh viên đã được khởi tạo hoàn tất trên hạ tầng HAUI ADVISOR. Bạn có thể chuyển sang
                      màn hình Đăng nhập để truy cập hệ thống ngay bây giờ.
                    </p>
                    <div className="w-full max-w-xs bg-surface-alt rounded-[16px] p-space-sm my-space-md text-left flex flex-col gap-1">
                      {[
                        ['Sinh viên:', registeredAccount.fullName],
                        ['Mã SV:', registeredAccount.studentId],
                        ['Email lưu trữ:', registeredAccount.email]
                      ].map(([label, value]) => (
                        <div className="flex justify-between items-center gap-space-sm text-caption font-caption" key={label}>
                          <span className="text-mid-gray shrink-0">{label}</span>
                          <span className="font-medium text-ink truncate">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col w-full max-w-xs gap-space-xs">
                      <button
                        className="w-full py-2.5 px-space-md bg-ink-soft hover:bg-ink text-paper rounded-full font-body-medium text-body-medium shadow-sm transition-all text-center flex items-center justify-center gap-space-xs cursor-pointer"
                        onClick={goToLoginWithRegisteredAccount}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">login</span>
                        <span>Chuyển tới Đăng nhập</span>
                      </button>
                      <button
                        className="w-full py-2 px-space-md text-mid-gray hover:text-ink font-body text-body transition-colors cursor-pointer"
                        onClick={resetRegisterForm}
                        type="button"
                      >
                        Đăng ký tài khoản khác
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== Tab Quên mật khẩu ===== */}
            {activeTab === 'forgot' && !forgotSentTo && (
              <>
                <form className="flex flex-col gap-5" noValidate onSubmit={handleForgot}>
                  <div className="flex flex-col gap-2 text-left">
                    <label className="font-label text-label text-ink font-medium flex items-center gap-1.5" htmlFor="recovery-email">
                      <span className="material-symbols-outlined text-[16px] text-mid-gray">mail</span>
                      Email đã đăng ký
                    </label>
                    <div className="relative flex items-center">
                      <input
                        autoComplete="email"
                        className={`w-full h-12 px-4 rounded-[18px] text-ink font-body text-body placeholder:text-mid-gray focus:outline-none focus:bg-surface-container-low transition-colors ${
                          forgotError ? 'bg-error-container/20' : 'bg-canvas'
                        }`}
                        id="recovery-email"
                        name="email"
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (forgotError) setForgotError('');
                        }}
                        placeholder="Ví dụ: an.nguyen@example.com hoặc 2020601234@sv.haui.edu.vn"
                        ref={forgotEmailRef}
                        type="email"
                        value={forgotEmail}
                      />
                    </div>
                    {forgotError && (
                      <div className="flex items-center gap-1.5 text-error font-caption text-caption mt-1 px-1" role="alert">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        <span>{forgotError}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <button className={`${PRIMARY_BUTTON_CLASS} h-12 shadow-sm`} disabled={forgotSending} type="submit">
                      {forgotSending ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <span>Gửi yêu cầu khôi phục</span>
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                    <button
                      className="w-full h-11 rounded-[18px] text-mid-gray hover:text-ink hover:bg-surface-alt font-body-medium text-body-medium flex items-center justify-center gap-1.5 transition-colors"
                      onClick={handleForgotBackToLogin}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      Quay lại màn hình Đăng nhập
                    </button>
                  </div>
                </form>

                <div className="flex flex-col gap-2">
                  <div className="h-[1px] w-full bg-hairline"></div>
                  <div className="flex items-start gap-2 pt-2 px-1 text-on-surface-variant font-caption text-caption">
                    <span className="material-symbols-outlined text-[16px] text-mid-gray shrink-0 mt-0.5">verified_user</span>
                    <span>
                      Hệ thống mô phỏng phục vụ cố vấn học tập và hướng nghiệp. Quá trình xác thực an toàn, độc lập và
                      bảo mật dữ liệu học vụ.
                    </span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'forgot' && forgotSentTo && (
              <div aria-live="polite" className="flex flex-col items-center text-center gap-6 py-2">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-ink">
                  <span className="material-symbols-outlined text-[32px]">mark_email_read</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-ink font-label text-label uppercase tracking-widest mx-auto">
                    <span className="w-2 h-2 rounded-full bg-ember"></span>
                    Yêu cầu đã được ghi nhận
                  </div>
                  <h2 className="font-headline text-headline text-ink tracking-tight mt-1">Kiểm tra hộp thư của bạn</h2>
                  <p className="font-body text-body text-on-surface-variant max-w-sm mt-1">
                    Đã gửi liên kết khôi phục tới{' '}
                    <span className="font-body-medium text-ink font-semibold break-all">{forgotSentTo}</span>. Vui lòng
                    kiểm tra hộp thư đến (và mục Spam) để tạo mật khẩu mới.
                  </p>
                </div>
                <div className="w-full bg-surface-container-low p-4 rounded-[18px] text-left flex gap-3">
                  <span className="material-symbols-outlined text-mid-gray text-[20px] shrink-0">info</span>
                  <div className="flex flex-col gap-1 text-on-surface-variant font-caption text-caption">
                    <span className="font-medium text-ink">Lưu ý thời hạn:</span>
                    <span>
                      Mã bảo mật có hiệu lực trong vòng 15 phút. Nếu không nhận được email sau 2 phút, vui lòng thử gửi
                      lại yêu cầu.
                    </span>
                  </div>
                </div>
                <div className="flex flex-col w-full gap-3 pt-2">
                  <button className={`${PRIMARY_BUTTON_CLASS} h-12`} onClick={handleForgotBackToLogin} type="button">
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    Quay lại Đăng nhập ngay lập tức
                  </button>
                  <button
                    className="w-full h-10 rounded-[18px] text-mid-gray hover:text-ink font-body-medium text-body-medium transition-colors"
                    onClick={handleForgotRetry}
                    type="button"
                  >
                    Chưa nhận được? Thử lại với email khác
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full pb-space-lg pt-space-md px-space-md">
        <div className="max-w-md mx-auto flex flex-col items-center gap-space-xs text-center">
          <nav className="flex items-center gap-space-md text-mid-gray font-caption text-caption">
            {FOOTER_LINKS.map((label, index) => (
              <React.Fragment key={label}>
                {index > 0 && <span className="w-1 h-1 rounded-full bg-hairline"></span>}
                <PlaceholderLink className="hover:text-ink transition-colors">{label}</PlaceholderLink>
              </React.Fragment>
            ))}
          </nav>
          <p className="font-caption text-caption text-mid-gray">
            © 2024 Đại học Công nghiệp Hà Nội. Hệ thống Cố vấn Học tập &amp; Hướng nghiệp.
          </p>
        </div>
      </footer>

      {/* Công cụ review: đăng nhập ngay bằng 3 tài khoản mẫu (STUDENT_PRESETS) */}
      <DevSlot title="Đăng nhập nhanh tài khoản mẫu">
        {Object.values(STUDENT_PRESETS).map((preset) => (
          <button
            className="w-full flex items-center gap-space-sm px-space-md py-2 rounded-[18px] border border-hairline text-left hover:bg-canvas transition-colors disabled:opacity-50"
            disabled={loading}
            key={preset.id}
            onClick={() => handleQuickLogin(preset.id)}
            title={`${preset.studentId} — ${preset.description}`}
            type="button"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                preset.academicWarning ? 'bg-ember' : preset.hasTranscript ? 'bg-ink' : 'bg-mid-gray'
              }`}
            />
            <span className="flex flex-col min-w-0">
              <span className="font-body-medium text-body-medium text-ink truncate">{preset.fullName}</span>
              <span className="font-caption text-caption text-mid-gray truncate">
                {preset.presetLabel}
              </span>
            </span>
            <span className="material-symbols-outlined text-[16px] text-mid-gray ml-auto">login</span>
          </button>
        ))}
      </DevSlot>
    </div>
  );
}

export default LoginPage;
