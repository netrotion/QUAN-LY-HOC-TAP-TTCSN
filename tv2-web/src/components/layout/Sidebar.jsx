import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_GROUPS = Object.freeze([
  {
    section: 'Nền tảng & Học vụ (TV2)',
    items: [
      {
        to: '/',
        end: true,
        label: 'Màn 1: Dashboard SV',
        icon: '📊',
        tag: 'TV2'
      },
      {
        to: '/curriculum',
        label: 'Màn 4: Sơ đồ Cây CTĐT',
        icon: '🌳',
        tag: 'CTĐT'
      },
      {
        to: '/progress',
        label: 'Màn 9: Audit Tốt nghiệp',
        icon: '🎓',
        tag: '100%'
      },
      {
        to: '/demo-ui',
        label: 'Demo UI & Mock API',
        icon: '🧩',
        tag: 'V0'
      }
    ]
  },
  {
    section: 'Lộ trình & Cố vấn AI (TV3)',
    items: [
      {
        to: '/chat',
        label: 'Màn 2: AI Advisor Chat',
        icon: '💬',
        tag: 'AI'
      },
      {
        to: '/recommendations',
        label: 'Màn 3: Đề xuất Lộ trình',
        icon: '✨',
        tag: 'TV3'
      },
      {
        to: '/planner',
        label: 'Màn 5: Xác nhận Kế hoạch',
        icon: '📅',
        tag: 'TV3'
      },
      {
        to: '/what-if',
        label: 'Màn 6-8: Giả lập What-if',
        icon: '🧮',
        tag: 'TV3'
      }
    ]
  }
]);

/**
 * Sidebar điều hướng chính của Web Host (TV2)
 * Ánh xạ đầy đủ 9 Màn hình trong Tài liệu Thiết kế UI Flow (Màn 1..9) + Trang Demo UI & Mock API V0.
 */
export function Sidebar() {
  return (
    <aside className="haui-sidebar" aria-label="Điều hướng chính HaUI Advisor">
      <div className="haui-sidebar__brand">
        <div className="haui-sidebar__logo" aria-hidden="true">
          H
        </div>
        <div>
          <h1 className="haui-sidebar__title">HaUI Advisor</h1>
          <p className="haui-sidebar__subtitle">Trợ lý Cố vấn Lộ trình Học tập</p>
        </div>
      </div>

      <nav className="haui-sidebar__nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            <div className="haui-sidebar__section-label">{group.section}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `haui-sidebar__link ${isActive ? 'haui-sidebar__link--active' : ''}`.trim()
                }
              >
                <span className="haui-sidebar__link-left">
                  <span className="haui-sidebar__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
                {item.tag && <span className="haui-sidebar__tag">{item.tag}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="haui-sidebar__footer">
        <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
          Hợp đồng: ui-api-v0
        </div>
        <div>Student-Centric &bull; 9 Màn hình UI Flow</div>
      </div>
    </aside>
  );
}

export default Sidebar;
