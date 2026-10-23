import React, { useState, Component } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

/**
 * Error Boundary bảo vệ ứng dụng không bị trắng trang khi bất kỳ component con nào gặp sự cố
 */
class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PageErrorBoundary] Uncaught component error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', maxWidth: '600px', margin: '40px auto', textAlign: 'center', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #fee2e2', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
            Có sự cố khi hiển thị nội dung trang này
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
            {this.state.error?.message || 'Lỗi không xác định trong quá trình render giao diện.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              type="button"
              className="haui-pill-btn-dark"
              onClick={this.handleRetry}
            >
              Tải lại trang này
            </button>
            <button
              type="button"
              className="haui-pill-btn-paper"
              onClick={() => { window.location.href = '/dashboard'; }}
            >
              Về Trang chủ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
          <PageErrorBoundary>
            {children || <Outlet />}
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
