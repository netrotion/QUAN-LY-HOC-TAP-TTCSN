import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/apiClient.js';
import {
  STUDENT_PRESETS,
  selectStudentPreset
} from '../../services/academicStore.js';

/**
 * Topbar Component (TV2 — design-base-v1)
 * Chuẩn xác theo Stitch Prototype:
 * - Nút thu gọn / mở rộng menu (onToggleCollapse)
 * - Thanh tìm kiếm pill (left)
 * - Nút Tư vấn lộ trình nhanh với AI (dark pill)
 * - Chuông thông báo kèm chấm đỏ ember
 * - Huy hiệu trạng thái học vụ (BR-07: Cảnh báo học vụ / Học vụ bình thường)
 * - Avatar sinh viên
 * - Menu chuyển nhanh Persona mẫu cho reviewer
 *
 * @param {{ collapsed?: boolean, onToggleCollapse?: () => void }} props
 */
export function Topbar({ collapsed = false, onToggleCollapse }) {
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
      {/* 1. Left: Menu Toggle + Search Pill */}
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

      {/* 2. Right: AI CTA + Notifications + Academic Status + Avatar + Persona Switcher */}
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

        {/* Persona Switcher */}
        <select
          className="haui-topbar__persona-select"
          value={student?.id || 'normal'}
          onChange={(e) => {
            const presetKey = e.target.value;
            selectStudentPreset(presetKey);
            const p = STUDENT_PRESETS[presetKey];
            if (p) api.setSessionStudent(p);
          }}
          title="Chuyển nhanh tài khoản mẫu"
          style={{
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '9999px',
            border: '1px solid var(--color-hairline)',
            background: 'var(--color-canvas)',
            color: 'var(--color-mid-gray)',
            maxWidth: '120px'
          }}
        >
          <option value="normal">👤 Chuẩn</option>
          <option value="at-risk">🚨 Nguy cơ</option>
          <option value="empty">⚪ Trắng</option>
        </select>
      </div>
    </header>
  );
}

export default Topbar;
