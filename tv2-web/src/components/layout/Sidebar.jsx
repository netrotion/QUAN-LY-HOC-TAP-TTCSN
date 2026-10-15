import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient.js';
import { logoutStudent } from '../../services/academicStore.js';

const NAV_ITEMS = Object.freeze([
  {
    to: '/',
    end: true,
    label: 'Tổng quan',
    icon: 'grid_view'
  },
  {
    to: '/progress',
    label: 'Hồ sơ sinh viên',
    icon: 'badge'
  },
  {
    to: '/transcript',
    label: 'Nhập bảng điểm',
    icon: 'upload_file'
  },
  {
    to: '/curriculum',
    label: 'Cây môn học',
    icon: 'account_tree'
  },
  {
    to: '/planner',
    label: 'Kế hoạch học tập',
    icon: 'event_note'
  },
  {
    to: '/planner?view=history',
    label: 'Lịch sử kế hoạch',
    icon: 'history'
  },
  {
    to: '/chat',
    label: 'Tư vấn AI',
    icon: 'smart_toy'
  },
  {
    to: '/what-if',
    label: 'What-if mô phỏng điểm',
    icon: 'insights'
  },
  {
    to: '/audit',
    label: 'Kiểm tra điều kiện tốt nghiệp',
    icon: 'verified'
  },
  {
    to: '/demo-ui',
    label: 'Cài đặt & Mock',
    icon: 'settings'
  }
]);

/**
 * Sidebar Navigation Component của Web Host (TV2 — design-base-v1)
 * Phong cách "Clinical Blueprint on Frosted Paper" chuẩn xác theo prototype:
 * - Logo thương hiệu HaUI Advisor (SVG)
 * - 10 mục điều hướng với Material Symbols Outlined
 * - Thẻ sinh viên tinh gọn bo góc 24px ở đáy sidebar
 * - Hỗ trợ chế độ thu gọn (collapsed 72px) / mở rộng (expanded 268px)
 *
 * @param {{ collapsed?: boolean }} props
 */
export function Sidebar({ collapsed = false }) {
  const navigate = useNavigate();
  const [student, setStudent] = useState(() => api.getConfig().sessionStudent);

  useEffect(() => {
    return api.subscribe((config) => {
      setStudent(config.sessionStudent);
    });
  }, []);

  const handleLogout = () => {
    logoutStudent();
    navigate('/login');
  };

  return (
    <aside
      className={`haui-sidebar ${collapsed ? 'haui-sidebar--collapsed' : ''}`}
      aria-label="Điều hướng chính HaUI Advisor"
    >
      {/* 1. Logo Brand Header */}
      <div className="haui-sidebar__brand">
        <NavLink to="/" className="haui-sidebar__brand-link" title="HaUI Advisor Dashboard">
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40" fill="none">
              <rect x="2" y="6" width="28" height="28" rx="8" fill="#0a0a0a" />
              <path d="M9 13v14M23 13v14M9 20h14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="23" cy="13" r="2.5" fill="#e7000b" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40" fill="none">
              <rect x="2" y="6" width="28" height="28" rx="8" fill="#0a0a0a" />
              <path d="M9 13v14M23 13v14M9 20h14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="23" cy="13" r="2.5" fill="#e7000b" />
              <text x="38" y="22" fontFamily="Geist, -apple-system, sans-serif" fontSize="14" fontWeight="700" fill="#0a0a0a" letterSpacing="-0.5px">HAUI</text>
              <text x="38" y="31" fontFamily="Geist, -apple-system, sans-serif" fontSize="9" fontWeight="500" fill="#737373" letterSpacing="0.5px">ADVISOR</text>
            </svg>
          )}
        </NavLink>
      </div>

      {/* 2. Navigation Links */}
      <nav className="haui-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `haui-sidebar__link ${isActive ? 'haui-sidebar__link--active' : ''}`.trim()
            }
          >
            <span className="material-symbols-outlined haui-sidebar__icon" aria-hidden="true">
              {item.icon}
            </span>
            {!collapsed && (
              <span className="haui-sidebar__link-text">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 3. Bottom Profile Card */}
      <div className="haui-sidebar__bottom">
        {collapsed ? (
          <button
            type="button"
            className="haui-sidebar__collapsed-avatar"
            onClick={handleLogout}
            title={`${student?.fullName || 'Sinh viên'} — Nhấn để đăng xuất`}
          >
            <span className="material-symbols-outlined">person</span>
          </button>
        ) : (
          <div className="haui-sidebar__profile-card">
            <div className="haui-sidebar__profile-row">
              <NavLink
                to="/progress"
                className="haui-sidebar__profile-left"
                title="Xem hồ sơ sinh viên"
              >
                <div className="haui-sidebar__profile-avatar">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    person
                  </span>
                </div>
                <div className="haui-sidebar__profile-info">
                  <p className="haui-sidebar__profile-name">{student?.fullName || 'Nguyễn Văn An'}</p>
                  <p className="haui-sidebar__profile-meta">
                    {student?.studentId || '2020601234'} &bull; {student?.cohort?.split(' ')?.[0] || 'K16'} {student?.majorName?.includes('CNTT') ? 'CNTT' : 'KTPM'}
                  </p>
                </div>
              </NavLink>
              <button
                type="button"
                className="haui-sidebar__profile-logout"
                title="Đăng xuất"
                onClick={handleLogout}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  logout
                </span>
              </button>
            </div>
            <div className="haui-sidebar__profile-status">
              <span className="haui-sidebar__status-dot"></span>
              <span className="haui-sidebar__status-text">Đang học kỳ 6/8</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
