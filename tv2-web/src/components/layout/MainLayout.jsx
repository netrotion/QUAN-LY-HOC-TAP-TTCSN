import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

/**
 * Main Content Layout của Web Host (TV2 — prototype-v1)
 * Sidebar cố định bên trái (w-72 / thu gọn 72px), Topbar cố định cao 64px, vùng nội dung `main` nền canvas.
 * Mỗi màn hình tự dựng khung nội dung bên trong `main` theo đúng prototype của màn đó.
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
    <div className="haui-app-shell min-h-screen bg-canvas">
      <Sidebar collapsed={isCollapsed} />
      <div
        className={`haui-main-wrapper ${isCollapsed ? 'pl-[72px]' : 'pl-72'} flex flex-col min-h-screen transition-[padding] duration-200 print:pl-0`}
      >
        <Topbar collapsed={isCollapsed} onToggleCollapse={toggleSidebar} />
        <main className="w-full pt-16 bg-canvas flex-1 print:pt-0">{children || <Outlet />}</main>
      </div>
    </div>
  );
}

export default MainLayout;
