import React, { useState } from 'react';
import { useAnimatedNavigate } from '../components/layout/animatedNavigation.jsx';
import { STUDENT_PRESETS, loginStudent, registerStudent, syncLiveSession } from '../services/academicStore.js';
import { api } from '../services/apiClient.js';
import hauiLogo from '@haui/logo';

/**
 * LoginPage — Thiết kế chuẩn HeroUI v3 & Stitch Prototype:
 * - Đồng bộ hoàn hảo giữa 2 trạng thái: Đăng nhập (Sign In) và Đăng ký (Register)
 * - Khung Card trung tâm bo góc 24px (rounded-[24px]) trên nền Canvas (#f5f5f5)
 * - Header logo thương hiệu HAUI ADVISOR với font Geist / Inter sắc nét
 * - Segmented Tab Bar 2 tab animated indicator: Đăng nhập · Đăng ký
 * - Form input pill rounded-full có icon đại diện chuẩn Material Symbols
 * - Tương thích hoàn toàn với kiểm thử tự động (handleLogin, studentIdInput, STUDENT_PRESETS)
 */
export function LoginPage() {
  const navigate = useAnimatedNavigate();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Form State cho Đăng nhập
  const isMock = api.isMockMode();
  const [selectedPresetId, setSelectedPresetId] = useState('at-risk');
  // Backend thật: không điền sẵn tài khoản mock (không tồn tại trên server)
  const [studentIdInput, setStudentIdInput] = useState(isMock ? STUDENT_PRESETS['at-risk'].studentId : '');
  const [passwordInput, setPasswordInput] = useState(isMock ? 'HaUI@2024Pass' : '');
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

    // Backend thật: lấy cookie XSRF-TOKEN rồi đăng nhập để có session JSESSIONID
    if (!isMock) {
      api.auth.getCsrfToken()
        .then(() => api.auth.login({ studentId: studentIdInput.trim(), password: passwordInput }))
        .then(() => syncLiveSession())
        .then(({ student }) => {
          setAlert({
            type: 'success',
            message: `Xác thực thành công! Xin chào ${student?.fullName || student?.studentId}.`
          });
          setTimeout(() => navigate('/dashboard'), 400);
        })
        .catch((err) => {
          setAlert({
            type: 'error',
            message: err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.'
          });
        })
        .finally(() => setLoading(false));
      return;
    }

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

          {/* Card Title & Subtitle theo từng Tab (Đồng bộ nội dung & Animation) */}
          <div className="haui-login-card-header haui-login-tab-pane" key={activeTab + '-header'}>
            <h1>{activeTab === 'login' ? 'Chào mừng đến với HAUI ADVISOR' : 'Tạo tài khoản HAUI ADVISOR'}</h1>
            <p>
              {activeTab === 'login'
                ? 'Đăng nhập để quản lý kết quả học tập và xây dựng lộ trình học tập cá nhân'
                : 'Đăng ký để quản lý kết quả học tập và xây dựng lộ trình học tập cá nhân'}
            </p>
          </div>

          {/* Segmented Tab Navigation 2 mục đồng bộ (HeroUI animated indicator) */}
          <div className="haui-login-tabs" role="tablist" aria-label="Hình thức đăng nhập hoặc đăng ký">
            <div
              className={`haui-login-tab-indicator ${activeTab === 'register' ? 'haui-login-tab-indicator--right' : 'haui-login-tab-indicator--left'}`}
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              className={`haui-login-tab ${activeTab === 'login' ? 'haui-login-tab--active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setAlert(null);
              }}
            >
              <span className="material-symbols-outlined haui-login-tab-icon">login</span>
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              className={`haui-login-tab ${activeTab === 'register' ? 'haui-login-tab--active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setAlert(null);
              }}
            >
              <span className="material-symbols-outlined haui-login-tab-icon">person_add</span>
              <span>Đăng ký</span>
            </button>
          </div>

          {/* =========================================================================
              TAB 1: ĐĂNG NHẬP (SIGN IN)
              ========================================================================= */}
          {activeTab === 'login' && (
            <div className="haui-login-tab-pane" key="login-form-pane">
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
                      <span
                        key={showPassword ? 'off' : 'on'}
                        className="material-symbols-outlined haui-login-eye-icon"
                        style={{ fontSize: '20px' }}
                      >
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Options Row (Ghi nhớ đăng nhập) */}
                <div className="haui-login-options">
                  <label className="haui-login-checkbox">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
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

                {/* Chuyển nhanh sang Đăng ký */}
                <div className="haui-login-switch">
                  <span>Chưa có tài khoản?</span>
                  <button
                    type="button"
                    className="haui-login-switch-btn"
                    onClick={() => {
                      setActiveTab('register');
                      setAlert(null);
                    }}
                  >
                    Đăng ký ngay
                  </button>
                </div>

                {/* Demo Quick Fill Helper Link (Chuẩn prototype) — chỉ có ở mock mode */}
                {isMock && (
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
                )}
              </form>
            </div>
          )}

          {/* =========================================================================
              TAB 2: ĐĂNG KÝ (REGISTER)
              ========================================================================= */}
          {activeTab === 'register' && (
            <div className="haui-login-tab-pane" key="register-form-pane">
              <RegisterForm onSwitchToLogin={() => setActiveTab('login')} onRegistered={() => navigate('/dashboard')} />
            </div>
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
const REGISTER_COHORTS = ['K16', 'K17', 'K18', 'K19', 'K20', 'K21'];

function RegisterForm({ onSwitchToLogin, onRegistered }) {
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [cohort, setCohort] = useState('');
  const [className, setClassName] = useState('');
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
    if (!cohort) {
      setAlert({ type: 'error', message: 'Vui lòng chọn khóa học của bạn.' });
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAlert({ type: 'error', message: 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.' });
      return;
    }
    if (password.length < 8) {
      setAlert({ type: 'error', message: 'Mật khẩu phải chứa ít nhất 8 ký tự.' });
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

    // Backend thật: tạo tài khoản và đăng nhập luôn; lỗi (trùng mã sinh viên...) hiển thị nguyên thông báo của server
    if (!api.isMockMode()) {
      setAlert(null);
      registerStudent({ studentId: studentCode, password, fullName, email, className, cohort })
        .then(() => {
          setAlert({ type: 'success', message: 'Tạo tài khoản thành công! Đang vào hệ thống...' });
          setTimeout(() => onRegistered(), 400);
        })
        .catch((err) => {
          setAlert({ type: 'error', message: err?.message || 'Không tạo được tài khoản. Vui lòng thử lại.' });
        })
        .finally(() => setLoading(false));
      return;
    }

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

      {/* Grid: Khóa & Lớp */}
      <div className="haui-login-field-grid">
        <div className="haui-login-field">
          <label className="haui-login-label" htmlFor="registerCohort">
            <span>Khóa <span className="haui-login-required">*</span></span>
          </label>
          <div className="haui-login-input-wrap">
            <span className="material-symbols-outlined haui-login-input-icon">school</span>
            <select
              id="registerCohort"
              className="haui-login-input"
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              required
            >
              <option value="">Chọn khóa</option>
              {REGISTER_COHORTS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="haui-login-field">
          <label className="haui-login-label" htmlFor="registerClassName">
            <span>Lớp</span>
          </label>
          <div className="haui-login-input-wrap">
            <span className="material-symbols-outlined haui-login-input-icon">groups</span>
            <input
              id="registerClassName"
              className="haui-login-input"
              value={className}
              maxLength={50}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="VD: 2024DHKTPM01"
            />
          </div>
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
              aria-label="Ẩn hoặc hiện mật khẩu"
            >
              <span
                key={showPassword ? 'off' : 'on'}
                className="material-symbols-outlined haui-login-eye-icon"
                style={{ fontSize: '18px' }}
              >
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
              aria-label="Ẩn hoặc hiện mật khẩu xác nhận"
            >
              <span
                key={showConfirmPassword ? 'off' : 'on'}
                className="material-symbols-outlined haui-login-eye-icon"
                style={{ fontSize: '18px' }}
              >
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

      {/* Chuyển nhanh sang Đăng nhập */}
      <div className="haui-login-switch">
        <span>Đã có tài khoản?</span>
        <button type="button" className="haui-login-switch-btn" onClick={onSwitchToLogin}>
          Đăng nhập ngay
        </button>
      </div>
    </form>
  );
}

export default LoginPage;
