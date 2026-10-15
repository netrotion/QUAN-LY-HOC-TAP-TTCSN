import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/apiClient.js';
import {
  STUDENT_PRESETS,
  logoutStudent,
  selectStudentPreset
} from '../../services/academicStore.js';

const ROUTE_TITLES = Object.freeze({
  '/': 'Tổng quan học tập',
  '/dashboard': 'Tổng quan học tập',
  '/login': 'Xác thực & Đăng nhập Sinh viên',
  '/transcript': 'Nhập & Bóc tách Bảng điểm Cá nhân',
  '/chat': 'Trợ lý ảo AI Chatbot (AI Advisor)',
  '/recommendations': 'Kết quả Phân tích & Đề xuất Lộ trình',
  '/curriculum': 'Cây môn học & Chuỗi quan hệ tiên quyết',
  '/curriculum/tree': 'Cây môn học & Chuỗi quan hệ tiên quyết',
  '/planner': 'Kế hoạch học tập (Study Planner)',
  '/what-if': 'What-if mô phỏng điểm & Tối ưu học cải thiện',
  '/progress': 'Hồ sơ sinh viên & Bảng điểm học vụ',
  '/audit': 'Kiểm toán tốt nghiệp 100% tiêu chí',
  '/demo-ui': 'Cài đặt hệ thống & Mock API Showcase'
});

/**
 * Topbar / Header Component của Web Host (TV2 — design-base-v1)
 * Phong cách "Clinical Blueprint on Frosted Paper" chuẩn xác theo prototype:
 * - Search bar pill bo góc tròn với placeholder tìm kiếm môn học
 * - Nút AI Advisor pill "Tư vấn lộ trình nhanh với AI"
 * - Nút thông báo với ember dot cảnh báo
 * - Badge Cảnh báo học vụ (BR-07)
 * - Persona Switcher chuyển đổi nhanh 3 tài khoản mẫu
 * - Nút thu gọn / mở rộng sidebar
 *
 * @param {{ collapsed?: boolean, onToggleCollapse?: () => void }} props
 */
export function Topbar({ collapsed = false, onToggleCollapse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [apiConfig, setApiConfig] = useState(() => api.getConfig());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    return api.subscribe((nextConfig) => {
      setApiConfig(nextConfig);
    });
  }, []);

  const student = apiConfig.sessionStudent;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/curriculum?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="haui-topbar">
      {/* 1. Left: Collapse Button + Search Bar Pill */}
      <div className="haui-topbar__left">
        {typeof onToggleCollapse === 'function' && (
          <button
            type="button"
            className="haui-topbar__collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {collapsed ? 'menu' : 'menu_open'}
            </span>
          </button>
        )}

        <form onSubmit={handleSearchSubmit} className="haui-topbar__search-form">
          <span className="material-symbols-outlined haui-topbar__search-icon">
            search
          </span>
          <input
            type="text"
            className="haui-topbar__search-input"
            placeholder="Tìm môn học, mã môn, chuẩn tốt nghiệp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {/* 2. Right: AI Action + Notification + Academic Status + Persona Switcher + Profile */}
      <div className="haui-topbar__right">
        {/* Quick AI Action Pill */}
        <Link
          to="/chat"
          className="haui-topbar__ai-btn"
          title="Tư vấn lộ trình nhanh với AI"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            auto_awesome
          </span>
          <span className="haui-topbar__ai-text">Tư vấn lộ trình nhanh với AI</span>
        </Link>

        {/* Notification Button with Ember Dot */}
        <button
          type="button"
          className="haui-topbar__icon-btn"
          title="Thông báo học vụ"
          onClick={() => navigate('/audit')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            notifications
          </span>
          <span className="haui-topbar__ember-dot" />
        </button>

        {/* Academic Status Badge (BR-07 / US-12) */}
        <span
          className={`haui-badge ${
            student?.id === 'empty'
              ? 'haui-badge--neutral'
              : (student?.cpa !== null && student?.cpa < 2.0) || student?.id === 'at-risk'
              ? 'haui-badge--warning'
              : 'haui-badge--success'
          }`}
          title="Quy chế BR-07: Sinh viên có CPA 2.45 và đang nợ môn tiên quyết (MATH1002)"
        >
          {student?.id === 'empty'
            ? 'ℹ️ Chưa nạp bảng điểm'
            : (student?.cpa !== null && student?.cpa < 2.0) || student?.id === 'at-risk'
            ? '⚠️ Cảnh báo học vụ: Mức 1'
            : '✓ Học vụ: Bình thường'}
        </span>

        {/* Quick Persona Switcher for Reviewers */}
        <select
          className="haui-input haui-topbar__persona-select"
          value={student?.id || 'at-risk'}
          onChange={(e) => {
            const presetKey = e.target.value;
            selectStudentPreset(presetKey);
            const p = STUDENT_PRESETS[presetKey];
            if (p) api.setSessionStudent(p);
          }}
          title="Chuyển nhanh tài khoản mẫu (Task 2.2a)"
        >
          <option value="normal">👤 Chuẩn (KTPM K17 - CPA 3.2)</option>
          <option value="at-risk">🚨 Nguy cơ (KTPM K17 - CPA 1.85)</option>
          <option value="empty">⚪ Trắng (CNTT K19 - 0 TC)</option>
        </select>

        {/* Student Avatar */}
        <Link
          to="/progress"
          className="haui-topbar__avatar-btn"
          title={`Hồ sơ: ${student?.fullName || 'Sinh viên'}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            person
          </span>
        </Link>
      </div>
    </header>
  );
}

export default Topbar;
