import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui/index.js';
import { STUDENT_PRESETS, loginStudent } from '../services/academicStore.js';
import { api } from '../services/apiClient.js';

/**
 * Màn hình Xác thực / Login (`/login`) — Task 2.2a
 * Cung cấp:
 * 1. Form đăng nhập sinh viên (Mã SV & Mật khẩu)
 * 2. 3 Preset chọn nhanh tài khoản mẫu:
 *    - Sinh viên bình thường (ngành CNTT/KTPM, tiến độ chuẩn, CPA 3.20)
 *    - Sinh viên có nguy cơ học vụ (CPA < 2.0, nợ môn tiên quyết MATH1002)
 *    - Sinh viên chưa có bảng điểm (tài khoản trắng K19, chưa có dữ liệu điểm)
 * 3. Chuyển hướng sang /dashboard sau khi đăng nhập thành công
 */
export function LoginPage() {
  const navigate = useNavigate();

  const [selectedPresetId, setSelectedPresetId] = useState('at-risk');
  const [studentIdInput, setStudentIdInput] = useState(STUDENT_PRESETS['at-risk'].studentId);
  const [passwordInput, setPasswordInput] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSelectPreset = (presetId) => {
    setSelectedPresetId(presetId);
    const preset = STUDENT_PRESETS[presetId];
    if (preset) {
      setStudentIdInput(preset.studentId);
      setPasswordInput('••••••••');
    }
  };

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      loginStudent({
        presetId: selectedPresetId,
        studentId: studentIdInput
      });

      // Đồng bộ thông tin sinh viên sang Singleton API Client
      const preset = STUDENT_PRESETS[selectedPresetId];
      if (preset) {
        api.setSessionStudent(preset);
      }

      setSuccessMessage(`Đăng nhập thành công với vai trò: ${preset?.fullName || studentIdInput}`);
      setLoading(false);

      setTimeout(() => {
        navigate('/dashboard');
      }, 350);
    }, 200);
  };

  return (
    <div className="haui-login-container">
      <div className="haui-login-card">
        {/* Brand Header */}
        <div className="haui-login-header">
          <div className="haui-login-logo" aria-hidden="true">
            H
          </div>
          <div>
            <h1 className="haui-login-title">HaUI Advisor</h1>
            <p className="haui-login-subtitle">
              Cổng Đăng nhập Cố vấn Lộ trình Học tập Sinh viên (flow-approved-v1)
            </p>
          </div>
        </div>

        {/* Prototype Banner */}
        <div className="haui-callout haui-callout--info" style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>
            🧪 Chế độ Trải nghiệm Prototype (Task 2.2a)
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Hệ thống hỗ trợ 3 tài khoản sinh viên mẫu đại diện cho 3 phân khúc thực tế tại HaUI.
            Chọn tài khoản bên dưới để tự động điền và đăng nhập ngay.
          </div>
        </div>

        {/* 3 Quick-Select Student Presets */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <label className="haui-form-label" style={{ marginBottom: 'var(--space-2)' }}>
            Chọn tài khoản sinh viên mẫu:
          </label>
          <div className="haui-preset-grid">
            {Object.values(STUDENT_PRESETS).map((p) => {
              const isSelected = selectedPresetId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`haui-preset-card ${isSelected ? 'haui-preset-card--selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelectPreset(p.id);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className={`haui-badge haui-badge--${p.badgeType}`} style={{ fontSize: '11px' }}>
                      {p.presetLabel}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      {p.id === 'at-risk' ? '🚨 At-Risk' : p.id === 'empty' ? '⚪ New' : '🟢 Standard'}
                    </span>
                  </div>
                  <strong style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                    {p.fullName} ({p.cohort.split(' ')[0]})
                  </strong>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {p.majorName} &bull; {p.studentId}
                  </div>
                  <div style={{ fontSize: '11px', color: p.academicWarning ? 'var(--color-error-text)' : 'var(--color-text-muted)', marginTop: '4px' }}>
                    {p.id === 'at-risk'
                      ? 'CPA 1.85 • Nợ Toán rời rạc (MATH1002)'
                      : p.id === 'empty'
                      ? '0 Tín chỉ • Chưa có bảng điểm'
                      : 'CPA 3.20 • 102/135 TC • Tiến độ chuẩn'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <label className="haui-form-label" htmlFor="studentIdInput">
              Mã sinh viên:
            </label>
            <input
              id="studentIdInput"
              type="text"
              className="haui-input"
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value)}
              placeholder="VD: std-2026-001 hoặc 2022601234"
              required
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label className="haui-form-label" htmlFor="passwordInput">
              Mật khẩu e-HaUI:
            </label>
            <input
              id="passwordInput"
              type="password"
              className="haui-input"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Nhập mật khẩu tài khoản trường"
              required
            />
          </div>

          {successMessage && (
            <div className="haui-callout haui-callout--success" style={{ marginBottom: 'var(--space-3)' }}>
              {successMessage}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập vào Hệ thống'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => handleLogin()}
              title="Đăng nhập ngay với tài khoản mẫu đã chọn"
            >
              Vào thẳng Dashboard &rarr;
            </Button>
          </div>
        </form>

        <div className="haui-login-footer">
          Đại học Công nghiệp Hà Nội &bull; HaUI Advisor &bull; Trợ lý Cố vấn Học tập Thông minh
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
