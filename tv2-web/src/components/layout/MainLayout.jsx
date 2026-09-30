import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

/**
 * Main Content Layout của Web Host (TV2)
 * Bao gồm Sidebar điều hướng bên trái, Topbar phía trên và vùng nội dung chính chứa `<Outlet />`.
 */
export function MainLayout({ children }) {
  return (
    <div className="haui-app-shell">
      <Sidebar />
      <div className="haui-main-wrapper">
        <Topbar />
        <main className="haui-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
