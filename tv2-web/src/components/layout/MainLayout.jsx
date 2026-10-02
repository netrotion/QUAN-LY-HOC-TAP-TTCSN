import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

/**
 * Main Content Layout của Web Host (TV2 — design-base-v1)
 * Quản lý trạng thái thu gọn Sidebar (72px / 268px), đồng bộ cùng Topbar và vùng nội dung chính.
 */
export function MainLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('haui_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('haui_sidebar_collapsed', String(next));
      } catch {
        // Safe fallback when localStorage is restricted
      }
      return next;
    });
  };

  return (
    <div className="haui-app-shell">
      <Sidebar collapsed={isCollapsed} />
      <div className="haui-main-wrapper">
        <Topbar collapsed={isCollapsed} onToggleCollapse={toggleSidebar} />
        <main className="haui-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
