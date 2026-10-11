import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAcademicSnapshot,
  subscribeAcademicStore
} from '../../services/academicStore.js';

/**
 * Header / Topbar của Web Host (TV2 — prototype-v1)
 * Theo prototype: ô tìm kiếm, nút "Tư vấn lộ trình nhanh với AI", chuông thông báo và avatar.
 * Bổ sung nút thu gọn sidebar; chuông thông báo hiển thị Cảnh báo học vụ (BR-07 / US-12) khi có.
 *
 * @param {{ collapsed?: boolean, onToggleCollapse?: () => void }} props
 */
export function Topbar({ collapsed = false, onToggleCollapse }) {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(() => getAcademicSnapshot());
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => subscribeAcademicStore(setSnapshot), []);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const { student, metrics } = snapshot;
  const academicWarning = metrics.academicWarning;
  const missingTranscript = !student.hasTranscript;

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/curriculum?q=${encodeURIComponent(trimmed)}` : '/curriculum');
  };

  return (
    <header
      className={`haui-topbar fixed top-0 ${collapsed ? 'left-[72px]' : 'left-72'} right-0 h-16 bg-surface-alt/90 backdrop-blur-xl border-b border-hairline z-40 flex items-center justify-between px-space-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-[left] duration-200 print:hidden`}
    >
      <div className="flex items-center gap-space-md">
        {typeof onToggleCollapse === 'function' && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-9 h-9 -ml-space-sm rounded-full flex items-center justify-center text-mid-gray hover:text-ink hover:bg-canvas transition-colors"
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? 'left_panel_open' : 'left_panel_close'}
            </span>
          </button>
        )}
        <form className="relative flex items-center w-80 lg:w-96" onSubmit={handleSearch} role="search">
          <span className="material-symbols-outlined absolute left-space-md text-[18px] text-mid-gray pointer-events-none">
            search
          </span>
          <input
            className="w-full bg-surface-alt border border-hairline rounded-full pl-10 pr-12 py-2 font-body text-body text-ink placeholder:text-mid-gray focus:outline-none focus:border-ink transition-colors"
            placeholder="Tìm môn học, mã môn, chuẩn tốt nghiệp..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm môn học, mã môn, chuẩn tốt nghiệp"
          />
        </form>
      </div>

      <div className="flex items-center gap-space-md">
        <Link
          to="/chat"
          className="inline-flex items-center gap-space-xs bg-ink hover:bg-ink-soft text-paper px-space-md py-2 rounded-full font-body-medium text-body-medium transition-colors shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
        >
          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
          <span>Tư vấn lộ trình nhanh với AI</span>
        </Link>

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full border border-hairline bg-paper flex items-center justify-center text-ink hover:bg-canvas transition-colors relative"
            title="Thông báo"
            aria-expanded={notificationsOpen}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {(academicWarning || missingTranscript) && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-ember" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-11 w-80 bg-paper border border-hairline rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-space-md flex flex-col gap-space-sm">
              <span className="font-label text-label text-mid-gray uppercase tracking-wider">Thông báo</span>
              {academicWarning ? (
                <Link
                  to="/audit"
                  onClick={() => setNotificationsOpen(false)}
                  className="flex items-start gap-space-sm p-space-sm rounded-2xl hover:bg-canvas transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-ember">warning</span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-body-medium text-body-medium text-ink">Cảnh báo học vụ</span>
                    <span className="font-caption text-caption text-mid-gray">{academicWarning}</span>
                  </span>
                </Link>
              ) : missingTranscript ? (
                <Link
                  to="/transcript"
                  onClick={() => setNotificationsOpen(false)}
                  className="flex items-start gap-space-sm p-space-sm rounded-2xl hover:bg-canvas transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-ink">upload_file</span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-body-medium text-body-medium text-ink">Chưa nạp bảng điểm</span>
                    <span className="font-caption text-caption text-mid-gray">
                      Nhập bảng điểm để hệ thống tính CPA, tín chỉ và đề xuất lộ trình.
                    </span>
                  </span>
                </Link>
              ) : (
                <p className="font-body text-body text-mid-gray px-space-sm pb-space-xs">
                  Học vụ bình thường — không có thông báo mới.
                </p>
              )}
            </div>
          )}
        </div>

        <Link
          to="/profile"
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
          title={`${student.fullName} — Hồ sơ sinh viên`}
        >
          <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
        </Link>
      </div>
    </header>
  );
}

export default Topbar;
