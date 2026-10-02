import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_GROUPS = Object.freeze([
  {
    section: 'Học vụ & Kế hoạch (Core Academic)',
    items: [
      {
        to: '/',
        end: true,
        label: 'Dashboard (Tổng quan học tập)',
        icon: '📊',
        tag: 'Màn 1'
      },
      {
        to: '/progress',
        label: 'Bảng điểm & Học vụ',
        icon: '📑',
        tag: 'Hồ sơ'
      },
      {
        to: '/curriculum',
        label: 'CTĐT & Cây môn học',
        icon: '🌳',
        tag: 'Màn 4'
      },
      {
        to: '/planner',
        label: 'Kế hoạch học tập (Study Planner)',
        icon: '📅',
        tag: 'TV3'
      }
    ]
  },
  {
    section: 'Cố vấn AI & Giả lập (Smart Advisory)',
    items: [
      {
        to: '/chat',
        label: 'Cố vấn AI (AI Chatbot)',
        icon: '💬',
        tag: 'TV3'
      },
      {
        to: '/what-if',
        label: 'Mô phỏng & Cải thiện điểm (What-if)',
        icon: '🧮',
        tag: 'TV3'
      },
      {
        to: '/audit',
        label: 'Kiểm toán tốt nghiệp',
        icon: '🎓',
        tag: 'Màn 9'
      },
      {
        to: '/demo-ui',
        label: 'Demo UI & Mock API',
        icon: '🧩',
        tag: 'V0'
      }
    ]
  }
]);

/**
 * Sidebar Navigation Component của Web Host (TV2 — design-base-v1)
 * Hỗ trợ chế độ thu gọn (collapsed 72px) / mở rộng (expanded 268px)
 * và ánh xạ đầy đủ 7 hạng mục học vụ theo đặc tả Task 2.1:
 * 1. Dashboard (Tổng quan học tập)
 * 2. Bảng điểm & Học vụ (Hồ sơ, nhập bảng điểm, lịch sử kết quả)
 * 3. CTĐT & Cây môn học (Course Dependency Tree)
 * 4. Kế hoạch học tập (Study Planner)
 * 5. Cố vấn AI (AI Chatbot)
 * 6. Mô phỏng & Cải thiện điểm (What-if & Retake Calculator)
 * 7. Kiểm toán tốt nghiệp (Graduation Audit)
 *
 * @param {{ collapsed?: boolean }} props
 */
export function Sidebar({ collapsed = false }) {
  return (
    <aside
      className={`haui-sidebar ${collapsed ? 'haui-sidebar--collapsed' : ''}`}
      aria-label="Điều hướng chính HaUI Advisor"
    >
      <div className="haui-sidebar__brand">
        <div className="haui-sidebar__logo" title="HaUI Advisor" aria-hidden="true">
          H
        </div>
        {!collapsed && (
          <div className="haui-sidebar__brand-text">
            <h1 className="haui-sidebar__title">HaUI Advisor</h1>
            <p className="haui-sidebar__subtitle">Trợ lý Cố vấn Lộ trình Học tập</p>
          </div>
        )}
      </div>

      <nav className="haui-sidebar__nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            <div className="haui-sidebar__section-label" title={group.section}>
              {group.section}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `haui-sidebar__link ${isActive ? 'haui-sidebar__link--active' : ''}`.trim()
                }
              >
                <span className="haui-sidebar__link-left">
                  <span className="haui-sidebar__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="haui-sidebar__link-text">{item.label}</span>
                  )}
                </span>
                {!collapsed && item.tag && (
                  <span className="haui-sidebar__tag">{item.tag}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="haui-sidebar__footer">
          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
            Hệ thống: design-base-v1
          </div>
          <div>Student-Centric &bull; 9 Màn hình UI Flow</div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
