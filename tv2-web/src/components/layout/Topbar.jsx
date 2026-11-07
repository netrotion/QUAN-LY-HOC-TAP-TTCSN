import React, { useEffect, useState } from 'react';
import { Link } from './animatedNavigation.jsx';
import { api } from '../../services/apiClient.js';

/**
 * Topbar Component (TV2 — design-base-v1)
 * Chuẩn xác theo Stitch Prototype:
 * - Nút thu gọn / mở rộng menu (onToggleCollapse)
 * - Nút Tư vấn lộ trình nhanh với AI (dark pill)
 * - Avatar sinh viên
 *
 * @param {{ collapsed?: boolean, onToggleCollapse?: () => void }} props
 */
export function Topbar({ collapsed = false, onToggleCollapse }) {
  const [apiConfig, setApiConfig] = useState(() => api.getConfig());

  useEffect(() => {
    return api.subscribe((nextConfig) => {
      setApiConfig(nextConfig);
    });
  }, []);

  const student = apiConfig.sessionStudent;

  return (
    <header className="haui-topbar">
      {/* 1. Left: Menu Toggle */}
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
      </div>

      {/* 2. Right: AI CTA + Avatar */}
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
