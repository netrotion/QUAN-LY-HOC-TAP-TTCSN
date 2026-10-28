import React, { useState } from 'react';
import { useAnimatedNavigate } from '../components/layout/animatedNavigation.jsx';
import { STUDENT_PRESETS, loginStudent } from '../services/academicStore.js';
import { api } from '../services/apiClient.js';
import hauiLogo from '@haui/logo';

/**
 * LoginPage — Tái thiết kế toàn diện chuẩn 100% Stitch Prototype:
 * - Đồng bộ hoàn hảo giữa 3 trạng thái: Đăng nhập (Sign In), Đăng ký (Register), Quên mật khẩu (Forgot Password)
 * - Khung Card trung tâm bo góc 24px (rounded-[24px]) trên nền Canvas (#f5f5f5)
 * - Header logo thương hiệu HAUI ADVISOR với font Geist / Inter sắc nét
 * - Segmented Tab Bar 3 tab: Đăng nhập · Đăng ký · Quên MK
 * - Form input pill rounded-full có icon đại diện chuẩn Material Symbols
 * - Tương thích hoàn toàn với kiểm thử tự động (handleLogin, studentIdInput, STUDENT_PRESETS)
 */
export function LoginPage() {
  const navigate = useAnimatedNavigate();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'forgot'

  // Form State cho Đăng nhập
  const [selectedPresetId, setSelectedPresetId] = useState('at-risk');
  const [studentIdInput, setStudentIdInput] = useState(STUDENT_PRESETS['at-risk'].studentId);
  const [passwordInput, setPasswordInput] = useState('HaUI@2024Pass');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success'|'error'|'info', message }

  // Quick fill tài khoản mẫu chuẩn prototype
  const handleQuickFillDemo = (presetKey = 'at-risk') => {
    const preset = STUDENT_PRESETS[presetKey] || STUDENT_PRESETS['at-risk'];
    setSelectedPresetId(preset.id);
    setStudentIdInput(preset.studentId);
    setPasswordInput('HaUI@2024Pass');
    setAlert({
      type: 'info',
      message: `Đã điền tài khoản mẫu: ${preset.fullName} (${preset.studentId})`
    });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleLogin = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!studentIdInput.trim() || !passwordInput.trim()) {
      setAlert({
        type: 'error',
        message: 'Vui lòng nhập đầy đủ Mã sinh viên hoặc Email và Mật khẩu.'
      });
      return;
    }

    setLoading(true);
    setAlert(null);

    setTimeout(() => {
      // Xác định preset tương ứng hoặc dùng selectedPresetId
      const matchedKey =
        Object.keys(STUDENT_PRESETS).find(
          (k) => STUDENT_PRESETS[k].studentId === studentIdInput
        ) || selectedPresetId || 'normal';

      loginStudent({
        presetId: matchedKey,
        studentId: studentIdInput
      });

      const preset = STUDENT_PRESETS[matchedKey];
      if (preset) {
        api.setSessionStudent(preset);
      }

      setAlert({
        type: 'success',
        message: 'Xác thực thành công! Đang chuyển hướng vào hệ thống...'
      });
      setLoading(false);

      setTimeout(() => {
        navigate('/dashboard');
      }, 400);
    }, 450);
  };

  return (
    <div className="haui-login-container">
      {/* 1. Header Brand Logo (Chuẩn Prototype) */}
      <header className="haui-login-logo-header">
        <img
          src={hauiLogo}
          alt=""
          style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
        />
        <div className="haui-login-logo-text">
          <span className="haui-login-logo-title">HAUI ADVISOR</span>
          <span className="haui-login-logo-subtitle">ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI</span>
        </div>
      </header>

      {/* 2. Main Login Card Container */}
      <main className="haui-login-main">
        <div className="haui-login-card">
          {/* Top Badges Row */}
          <div className="haui-login-badges">
            <span className="haui-login-badge">
              <span className="haui-login-badge-dot" />
              Cổng Sinh Viên
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-mid-gray, #737373)' }}>
              Hệ thống Học vụ HaUI
            </span>
          </div>

          {/* Card Title & Subtitle theo từng Tab */}
          {activeTab === 'login' && (
            <div className="haui-login-card-header">
              <h1>Chào mừng đến với HAUI ADVISOR</h1>
              <p>Đăng nhập để quản lý kết quả học tập và xây dựng lộ trình học tập cá nhân</p>
            </div>
          )}
          {activeTab === 'register' && (
            <div className="haui-login-card-header">
              <h1>Tạo tài khoản HAUI ADVISOR</h1>
              <p>Đăng ký để bắt đầu quản lý lộ trình học tập của bạn</p>
            </div>
          )}
          {activeTab === 'forgot' && null}

          {/* Segmented Tab Navigation 3 mục đồng bộ */}
          <div className="haui-login-tabs">
            <button
              type="button"
              className={`haui-login-tab ${activeTab === 'login' ? 'haui-login-tab--active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`haui-login-tab ${activeTab === 'register' ? 'haui-login-tab--active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Đăng ký
            </button>
            <button
              type="button"
              className={`haui-login-tab ${activeTab === 'forgot' ? 'haui-login-tab--active' : ''}`}
              onClick={() => setActiveTab('forgot')}
            >
              Quên MK
            </button>
          </div>

          {/* =========================================================================
              TAB 1: ĐĂNG NHẬP (SIGN IN)
              ========================================================================= */}
          {activeTab === 'login' && (
            <form className="haui-login-form" onSubmit={handleLogin} noValidate>
              {/* Field 1: Mã sinh viên hoặc email */}
              <div className="haui-login-field">
                <label className="haui-login-label" htmlFor="studentIdInput">
                  <span>Mã sinh viên hoặc email</span>
                  <span className="haui-login-label-hint">HaUI ID</span>
                </label>
                <div className="haui-login-input-wrap">
                  <span className="material-symbols-outlined haui-login-input-icon">badge</span>
                  <input
                    id="studentIdInput"
                    name="credential"
                    type="text"
                    className="haui-login-input"
                    placeholder="Ví dụ: 2020601234 hoặc sv@haui.edu.vn"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Field 2: Mật khẩu */}
              <div className="haui-login-field">
                <label className="haui-login-label" htmlFor="passwordInput">
                  <span>Mật khẩu</span>
                  {passwordInput && <span className="haui-login-label-hint">Đã nhập</span>}
                </label>
                <div className="haui-login-input-wrap">
                  <span className="material-symbols-outlined haui-login-input-icon">lock_outline</span>
                  <input
                    id="passwordInput"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="haui-login-input haui-login-input--password"
                    placeholder="Nhập mật khẩu"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="haui-login-input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Ẩn hoặc hiện mật khẩu"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Options Row (Ghi nhớ đăng nhập + Quên MK) */}
              <div className="haui-login-options">
                <label className="haui-login-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button
                  type="button"
                  className="haui-login-forgot-link"
                  onClick={() => setActiveTab('forgot')}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Alert Feedback Banner */}
              {alert && (
                <div className={`haui-login-alert haui-login-alert--${alert.type}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {alert.type === 'error' ? 'error' : alert.type === 'success' ? 'task_alt' : 'check_circle'}
                  </span>
                  <span>{alert.message}</span>
                </div>
              )}

              {/* Single Full-width Primary Submit Button */}
              <button type="submit" className="haui-login-submit" disabled={loading} style={{ marginTop: '4px' }}>
                <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
                {loading ? (
                  <span className="material-symbols-outlined haui-spin" style={{ fontSize: '18px' }}>
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    arrow_forward
                  </span>
                )}
              </button>

              {/* Demo Quick Fill Helper Link (Chuẩn prototype) */}
              <div style={{ textAlign: 'center', paddingTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickFillDemo('at-risk')}
                  className="haui-login-demo-btn"
                  title="Điền nhanh thông tin tài khoản sinh viên mẫu"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>bolt</span>
                  <span>Điền tài khoản mẫu</span>
                </button>
              </div>
            </form>
          )}

          {/* =========================================================================
              TAB 2: ĐĂNG KÝ (REGISTER)
              ========================================================================= */}
          {activeTab === 'register' && (
            <RegisterForm onSwitchToLogin={() => setActiveTab('login')} />
          )}

          {/* =========================================================================
              TAB 3: QUÊN MẬT KHẨU (FORGOT PASSWORD)
              ========================================================================= */}
          {activeTab === 'forgot' && (
            <ForgotPasswordForm onSwitchToLogin={() => setActiveTab('login')} />
          )}
        </div>
      </main>

      {/* 3. Footer Links */}
      <footer className="haui-login-footer">
        <div className="haui-login-footer-links">
          <a href="#">Điều khoản sử dụng</a>
          <span>•</span>
          <a href="#">Chính sách bảo mật</a>
          <span>•</span>
          <a href="#">Hỗ trợ sinh viên</a>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Register Sub-component (Đồng bộ UI 100% với Đăng nhập)
   ────────────────────────────────────────────────────────────────────────── */
function RegisterForm({ onSwitchToLogin }) {
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAgree, setTermsAgree] = useState(false);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setAlert({ type: 'error', message: 'Vui lòng nhập họ và tên của bạn.' });
      return;
    }
    if (!studentCode.trim() || studentCode.trim().length < 9) {
      setAlert({ type: 'error', message: 'Mã sinh viên HaUI yêu cầu tối thiểu 9-10 chữ số.' });
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAlert({ type: 'error', message: 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.' });
      return;
    }
    if (password.length < 6) {
      setAlert({ type: 'error', message: 'Mật khẩu phải chứa ít nhất 6 ký tự.' });
      return;
    }
    if (password !== confirmPassword) {
      setAlert({ type: 'error', message: 'Xác nhận mật khẩu không khớp. Vui lòng kiểm tra lại.' });
      return;
    }
    if (!termsAgree) {
      setAlert({ type: 'error', message: 'Bạn cần đồng ý với điều khoản sử dụng và chính sách bảo mật.' });
      return;
    }

    setLoading(true);
    setAlert({
      type: 'success',
      message: 'Tạo tài khoản thành công! Đang chuyển hướng về trang đăng nhập...'
    });

    setTimeout(() => {
      setLoading(false);
      onSwitchToLogin();
    }, 1200);
  };

  return (
    <form className="haui-login-form" onSubmit={handleSubmit} noValidate>
      {alert && (
        <div className={`haui-login-alert haui-login-alert--${alert.type}`}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {alert.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Field: Họ và tên */}
      <div className="haui-login-field">
        <label className="haui-login-label">
          <span>Họ và tên <span className="haui-login-required">*</span></span>
        </label>
        <div className="haui-login-input-wrap">
          <span className="material-symbols-outlined haui-login-input-icon">person</span>
          <input
            className="haui-login-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn An"
            required
          />
        </div>
      </div>

      {/* Field: Mã sinh viên */}
      <div className="haui-login-field">
        <label className="haui-login-label">
          <span>Mã sinh viên <span className="haui-login-required">*</span></span>
          <span className="haui-login-label-hint">10 chữ số</span>
        </label>
        <div className="haui-login-input-wrap">
          <span className="material-symbols-outlined haui-login-input-icon">badge</span>
          <input
            className="haui-login-input"
            value={studentCode}
            maxLength={10}
            onChange={(e) => setStudentCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10 chữ số MSSV HaUI, ví dụ: 2020601234"
            required
          />
        </div>
      </div>

      {/* Field: Email */}
      <div className="haui-login-field">
        <label className="haui-login-label">
          <span>Email <span className="haui-login-required">*</span></span>
          <span className="haui-login-label-hint">@sv.haui.edu.vn</span>
        </label>
        <div className="haui-login-input-wrap">
          <span className="material-symbols-outlined haui-login-input-icon">mail</span>
          <input
            className="haui-login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sv@haui.edu.vn hoặc email cá nhân"
            required
          />
        </div>
      </div>

      {/* Grid: Mật khẩu & Xác nhận */}
      <div className="haui-login-field-grid">
        <div className="haui-login-field">
          <label className="haui-login-label">
            <span>Mật khẩu <span className="haui-login-required">*</span></span>
          </label>
          <div className="haui-login-input-wrap">
            <span className="material-symbols-outlined haui-login-input-icon">lock_outline</span>
            <input
              className="haui-login-input haui-login-input--password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              required
            />
            <button
              type="button"
              className="haui-login-input-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className="haui-login-field">
          <label className="haui-login-label">
            <span>Xác nhận <span className="haui-login-required">*</span></span>
          </label>
          <div className="haui-login-input-wrap">
            <span className="material-symbols-outlined haui-login-input-icon">lock_outline</span>
            <input
              className="haui-login-input haui-login-input--password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
            />
            <button
              type="button"
              className="haui-login-input-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {showConfirmPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Checkbox Terms */}
      <label className="haui-login-checkbox" style={{ marginTop: '2px' }}>
        <input
          type="checkbox"
          checked={termsAgree}
          onChange={(e) => setTermsAgree(e.target.checked)}
        />
        <span style={{ fontSize: '13px', color: 'var(--color-mid-gray, #737373)', lineHeight: 1.4 }}>
          Tôi đồng ý với <a href="#" style={{ color: 'var(--color-ink)', textDecoration: 'underline' }}>điều khoản sử dụng</a> và{' '}
          <a href="#" style={{ color: 'var(--color-ink)', textDecoration: 'underline' }}>chính sách bảo mật</a> của HAUI ADVISOR.
        </span>
      </label>

      {/* Submit Button */}
      <button type="submit" className="haui-login-submit" disabled={loading} style={{ marginTop: '4px' }}>
        <span>{loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}</span>
        {loading ? (
          <span className="material-symbols-outlined haui-spin" style={{ fontSize: '18px' }}>
            progress_activity
          </span>
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_forward
          </span>
        )}
      </button>

      {/* Back to login */}
      <div style={{ textAlign: 'center', paddingTop: '4px' }}>
        <button type="button" className="haui-login-back-link" onClick={onSwitchToLogin}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          <span>Quay lại đăng nhập</span>
        </button>
      </div>
    </form>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Forgot Password Sub-component (Đồng bộ UI 100% với Đăng nhập & Đăng ký)
   ────────────────────────────────────────────────────────────────────────── */
function ForgotPasswordForm({ onSwitchToLogin }) {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setError('Định dạng email chưa hợp lệ (ví dụ: 2020601234@sv.haui.edu.vn).');
      return;
    }
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setTimeLeft(900);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 1000);
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Trạng thái đã gửi mã xác nhận thành công
  if (submitted) {
    return (
      <div className="haui-login-forgot-success">
        <div className="haui-login-forgot-icon-circle">
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>mark_email_read</span>
        </div>
        <span className="haui-login-badge" style={{ marginTop: '8px' }}>
          <span className="haui-login-badge-dot haui-login-badge-dot--dark" />
          Yêu cầu đã được tiếp nhận
        </span>
        <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-ink)', margin: '8px 0 4px' }}>
          Kiểm tra hộp thư đến
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-mid-gray)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Nếu email <strong style={{ color: 'var(--color-ink)' }}>{email}</strong> tồn tại trên hệ thống HAUI, bạn sẽ nhận được liên kết hướng dẫn đặt lại mật khẩu trong giây lát.
        </p>

        {/* Countdown Box */}
        <div className="haui-login-forgot-timer">
          <div className="haui-login-forgot-timer-label">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>schedule</span>
            Hạn xác thực mã bảo mật
          </div>
          <div className="haui-login-forgot-timer-row">
            <span style={{ fontSize: '13px' }}>Thời gian hiệu lực còn lại</span>
            <span className="haui-login-forgot-timer-value">
              {timeLeft > 0 ? formatTime(timeLeft) : '00:00 (Hết hạn)'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
          <button
            type="button"
            className="haui-pill-btn-canvas"
            onClick={() => {
              setSubmitted(false);
              setEmail('');
            }}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>replay</span>
            <span>Thử lại bằng email khác</span>
          </button>
          <button
            type="button"
            className="haui-pill-btn-dark"
            onClick={onSwitchToLogin}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
            <span>Quay lại trang Đăng nhập</span>
          </button>
        </div>
      </div>
    );
  }

  // Trạng thái Form nhập Email yêu cầu đặt lại mật khẩu
  return (
    <div className="haui-login-forgot-request">
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div className="haui-login-forgot-icon-circle" style={{ margin: '0 auto 10px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>key</span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 4px', color: 'var(--color-ink)' }}>
          Quên mật khẩu?
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-mid-gray)', margin: 0 }}>
          Nhập email đã đăng ký để nhận hướng dẫn khôi phục mật khẩu tài khoản
        </p>
      </div>

      <form className="haui-login-form" onSubmit={handleSubmit} noValidate>
        <div className="haui-login-field">
          <label className="haui-login-label">
            <span>Email trường hoặc tài khoản sinh viên</span>
            <span className="haui-login-label-hint">@sv.haui.edu.vn</span>
          </label>
          <div className="haui-login-input-wrap">
            <span className="material-symbols-outlined haui-login-input-icon">mail</span>
            <input
              type="email"
              className="haui-login-input"
              placeholder="Ví dụ: 2020601234@sv.haui.edu.vn"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              required
            />
          </div>
          {error && (
            <p className="haui-login-field-error">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>error</span>
              <span>{error}</span>
            </p>
          )}
        </div>

        <div className="haui-login-info-note" style={{ marginTop: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-mid-gray)' }}>info</span>
          <p>
            Đường dẫn khôi phục sẽ có hiệu lực trong vòng <strong>15 phút</strong>. Vui lòng kiểm tra kỹ cả hộp thư <strong>Spam/Rác</strong> sau khi gửi yêu cầu.
          </p>
        </div>

        <button type="submit" className="haui-login-submit" disabled={loading} style={{ marginTop: '8px' }}>
          <span>{loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}</span>
          {loading ? (
            <span className="material-symbols-outlined haui-spin" style={{ fontSize: '18px' }}>
              progress_activity
            </span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              arrow_forward
            </span>
          )}
        </button>
      </form>

      <div style={{ textAlign: 'center', paddingTop: '12px' }}>
        <button type="button" className="haui-login-back-link" onClick={onSwitchToLogin}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          <span>Quay lại đăng nhập</span>
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
