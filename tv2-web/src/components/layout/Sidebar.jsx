import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink, useAnimatedNavigate } from './animatedNavigation.jsx';
import { api } from '../../services/apiClient.js';
import { logoutStudent } from '../../services/academicStore.js';
import hauiLogo from '@haui/logo';

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
    to: '/chat',
    label: 'Tư vấn AI',
    icon: 'smart_toy'
  },
  {
    to: '/audit',
    label: 'Kiểm tra điều kiện tốt nghiệp',
    icon: 'verified'
  },
  {
    to: '/settings',
    label: 'Cài đặt',
    icon: 'settings'
  }
]);

/**
 * Sidebar Navigation Component của Web Host (TV2 — design-base-v1)
 * Phong cách "Clinical Blueprint on Frosted Paper" chuẩn xác theo prototype:
 * - Logo thương hiệu HaUI Advisor (SVG)
 * - 8 mục điều hướng với Material Symbols Outlined
 * - Thẻ sinh viên tinh gọn bo góc 24px ở đáy sidebar
 * - Hỗ trợ chế độ thu gọn (collapsed 72px) / mở rộng (expanded 268px)
 *
 * @param {{ collapsed?: boolean }} props
 */
export function Sidebar({ collapsed = false }) {
  const navigate = useAnimatedNavigate();
  const { pathname } = useLocation();
  const navRef = useRef(null);
  const activePillRef = useRef(null);
  const [student, setStudent] = useState(() => api.getConfig().sessionStudent);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const pill = activePillRef.current;
    if (!nav || !pill) return undefined;

    const positionPill = () => {
      const active = nav.querySelector('.haui-sidebar__link--active');
      if (!active) {
        pill.style.opacity = '0';
        return;
      }
      pill.style.setProperty('--haui-active-y', `${active.offsetTop}px`);
      pill.style.height = `${active.offsetHeight}px`;
      pill.style.opacity = '1';
    };

    positionPill();
    const readyFrame = nav.dataset.indicatorReady
      ? null
      : window.requestAnimationFrame(() => { nav.dataset.indicatorReady = 'true'; });
    window.addEventListener('resize', positionPill);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(positionPill) : null;
    if (observer) {
      observer.observe(nav);
      nav.querySelectorAll('.haui-sidebar__link').forEach((link) => observer.observe(link));
    }
    return () => {
      if (readyFrame !== null) window.cancelAnimationFrame(readyFrame);
      window.removeEventListener('resize', positionPill);
      observer?.disconnect();
    };
  }, [pathname, collapsed]);

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
      {/* 1. Logo Brand Header — matches prototype sidebar header */}
      <div className="haui-sidebar__brand">
        <NavLink to="/" className="haui-sidebar__brand-link" title="HaUI Advisor Dashboard">
          <img
            src={hauiLogo}
            alt=""
            className="haui-sidebar__brand-logo"
            style={{ height: '32px', width: 'auto', objectFit: 'contain', flexShrink: 0, borderRadius: '4px' }}
          />
          {!collapsed && (
            <div className="haui-sidebar__brand-text">
              <span className="haui-sidebar__brand-title">HAUI ADVISOR</span>
              <span className="haui-sidebar__brand-subtitle">Cổng Tư Vấn & Lộ Trình</span>
            </div>
          )}
        </NavLink>
      </div>

      {/* 2. Navigation Links */}
      <nav ref={navRef} className="haui-sidebar__nav">
        <span ref={activePillRef} className="haui-sidebar__active-pill" aria-hidden="true" />
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `haui-sidebar__link ${isActive || (item.to === '/' && pathname === '/dashboard') || (item.to === '/progress' && pathname === '/profile') ? 'haui-sidebar__link--active' : ''}`.trim()
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
                    {student?.studentId || '2024604757'} &bull; {student?.cohort?.split(' ')?.[0] || 'K17'} &bull; {student?.majorName || 'Sinh viên HaUI'}
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
