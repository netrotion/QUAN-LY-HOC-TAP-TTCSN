import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from './BrandLogo.jsx';
import {
  getAcademicSnapshot,
  logoutStudent,
  subscribeAcademicStore
} from '../../services/academicStore.js';

/**
 * Menu điều hướng theo prototype-v1 (tv3-planner-ui/design/prototype — sidebar dùng chung các màn).
 * `alsoActiveFor`: các route cũ vẫn được đánh dấu active ở mục tương ứng.
 */
const NAV_ITEMS = Object.freeze([
  { to: '/', end: true, label: 'Tổng quan', icon: 'grid_view', alsoActiveFor: ['/dashboard'] },
  { to: '/profile', label: 'Hồ sơ sinh viên', icon: 'badge' },
  { to: '/transcript', label: 'Nhập bảng điểm', icon: 'upload_file' },
  { to: '/curriculum', label: 'Cây môn học', icon: 'account_tree' },
  { to: '/planner', end: true, label: 'Kế hoạch học tập', icon: 'event_note' },
  { to: '/planner/history', label: 'Lịch sử kế hoạch', icon: 'history' },
  { to: '/chat', label: 'Tư vấn AI', icon: 'smart_toy' },
  { to: '/what-if', label: 'What-if mô phỏng điểm', icon: 'insights' },
  {
    to: '/audit',
    label: 'Kiểm tra điều kiện tốt nghiệp',
    icon: 'verified',
    alsoActiveFor: ['/progress']
  }
]);

const LINK_BASE =
  'flex items-center gap-space-sm px-space-md py-space-sm rounded-full transition-all duration-150';
const LINK_ACTIVE = 'bg-ink text-paper font-medium shadow-[0_1px_8px_rgba(0,0,0,0.04)]';
const LINK_IDLE = 'text-mid-gray hover:text-ink hover:bg-canvas font-body text-body';

function countStudiedSemesters(records = []) {
  return new Set(records.map((r) => r.semesterCode).filter(Boolean)).size;
}

/**
 * Sidebar Navigation Component của Web Host (TV2 — prototype-v1)
 * Mở rộng w-72 theo prototype; thu gọn (collapsed 72px) chỉ còn icon.
 *
 * @param {{ collapsed?: boolean }} props
 */
export function Sidebar({ collapsed = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(() => getAcademicSnapshot());

  useEffect(() => subscribeAcademicStore(setSnapshot), []);

  const { student, transcriptRecords } = snapshot;
  const cohortShort = student.cohort?.split(' ')?.[0] || '';
  const majorShort = student.advisorClass?.split(/\d/)?.[0] || '';
  const studiedSemesters = countStudiedSemesters(transcriptRecords);

  const handleLogout = () => {
    logoutStudent();
    navigate('/login');
  };

  return (
    <aside
      className={`haui-sidebar ${collapsed ? 'haui-sidebar--collapsed w-[72px]' : 'w-72'} fixed left-0 top-0 h-screen bg-surface-alt z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-hairline transition-[width] duration-200 print:hidden`}
      aria-label="Điều hướng chính HaUI Advisor"
    >
      <div className={`flex flex-col flex-1 overflow-y-auto scrollbar-none pt-space-lg ${collapsed ? 'px-space-sm' : 'px-space-md'}`}>
        <Link
          to="/"
          className={`flex items-center gap-space-sm pb-space-lg mb-space-sm border-b border-hairline hover:opacity-80 transition-opacity ${
            collapsed ? 'justify-center' : 'px-space-xs'
          }`}
        >
          <BrandLogo compact={collapsed} className="h-8 w-auto shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-subheading text-subheading text-ink font-semibold tracking-tight truncate leading-tight">
                HAUI ADVISOR
              </span>
              <span className="font-caption text-caption text-mid-gray truncate">
                Cổng Tư Vấn &amp; Lộ Trình KTPM/CNTT
              </span>
            </div>
          )}
        </Link>

        <nav className="flex flex-col gap-1 w-full">
          {NAV_ITEMS.map((item) => {
            const aliasActive = item.alsoActiveFor?.includes(location.pathname);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `${LINK_BASE} ${isActive || aliasActive ? LINK_ACTIVE : LINK_IDLE} ${
                    collapsed ? 'justify-center px-0' : ''
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
          <button
            type="button"
            title="Cài đặt (sắp ra mắt)"
            className={`${LINK_BASE} ${LINK_IDLE} ${collapsed ? 'justify-center px-0' : ''} text-left`}
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            {!collapsed && <span className="truncate">Cài đặt</span>}
          </button>
        </nav>
      </div>

      {collapsed ? (
        <div className="flex flex-col items-center gap-space-sm p-space-sm pb-space-md">
          <Link
            to="/profile"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
            title={`${student.fullName} — Xem hồ sơ sinh viên`}
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-mid-gray hover:text-ink p-1 rounded-full hover:bg-canvas transition-colors"
            title="Đăng xuất"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      ) : (
        <div className="p-space-md m-space-sm bg-paper rounded-[24px] border border-hairline shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-space-xs">
            <Link
              to="/profile"
              className="flex items-center gap-space-sm min-w-0 hover:opacity-80 transition-opacity"
              title="Xem hồ sơ sinh viên"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <div className="min-w-0">
                <p className="font-body-medium text-body-medium text-ink font-medium truncate">
                  {student.fullName}
                </p>
                <p className="font-caption text-caption text-mid-gray truncate">
                  {student.studentId} • {cohortShort} {majorShort}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-mid-gray hover:text-ink p-1 rounded-full hover:bg-canvas transition-colors"
              title="Chuyển đổi tài khoản / Đăng xuất"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 pt-space-xs border-t border-hairline">
            <span className={`w-2 h-2 rounded-full ${student.academicWarning ? 'bg-ember' : 'bg-ink'}`} />
            <span className="font-label text-label text-mid-gray">
              {studiedSemesters > 0 ? `Đang học kỳ ${studiedSemesters}/8` : 'Chưa nạp bảng điểm'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
