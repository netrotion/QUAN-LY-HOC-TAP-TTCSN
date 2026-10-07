import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient.js';
import { Button } from '../ui/Button.jsx';
import {
  STUDENT_PRESETS,
  logoutStudent,
  selectStudentPreset
} from '../../services/academicStore.js';

const ROUTE_TITLES = Object.freeze({
  '/': 'Màn hình 1: Trang chủ Dashboard Sinh viên (Student Academic Dashboard)',
  '/dashboard': 'Màn hình 1: Trang chủ Dashboard Sinh viên (Student Academic Dashboard)',
  '/login': 'Xác thực & Đăng nhập Sinh viên (Student Authentication)',
  '/transcript': 'Nạp & Bóc tách Bảng điểm Cá nhân (Transcript Ingestion Wizard)',
  '/chat': 'Màn hình 2: Trợ lý ảo AI Chatbot (AI Advisor Chat Interface — TV3)',
  '/recommendations': 'Màn hình 3: Kết quả Phân tích & Đề xuất Lộ trình Học tập (TV3)',
  '/curriculum': 'Màn hình 4: Chi tiết & Sơ đồ Cây Quan hệ Môn học (Course Dependency Tree)',
  '/curriculum/tree': 'Màn hình 4: Chi tiết & Sơ đồ Cây Quan hệ Môn học (Course Dependency Tree)',
  '/planner': 'Màn hình 5: Tùy chỉnh & Xác nhận Kế hoạch Học tập (Plan Finalization — TV3)',
  '/what-if': 'Màn hình 6, 7, 8: Giả lập Điểm số, Tối ưu Học cải thiện & Tính điểm ngược (TV3)',
  '/progress': 'Màn hình 9: Bảng Điểm & Học vụ / Kiểm toán Tốt nghiệp (Degree Audit)',
  '/audit': 'Màn hình 9: Bảng Kiểm toán Tốt nghiệp 100% (Graduation Degree Audit)',
  '/demo-ui': 'Showcase Shared UI Library V0 & Singleton Mock API Client (ui-api-v0)'
});

/**
 * Header / Topbar của Web Host (TV2 — design-base-v1)
 * Hiển thị nút thu gọn sidebar, tiêu đề màn hình, huy hiệu trạng thái học tập (Academic Status),
 * công tắc chế độ Mock API (FIXTURE_ONLY) và tóm tắt thông tin sinh viên từ Session Context.
 *
 * @param {{ collapsed?: boolean, onToggleCollapse?: () => void }} props
 */
export function Topbar({ collapsed = false, onToggleCollapse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [apiConfig, setApiConfig] = useState(() => api.getConfig());

  useEffect(() => {
    return api.subscribe((nextConfig) => {
      setApiConfig(nextConfig);
    });
  }, []);

  const pageTitle =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/planner')
      ? 'Màn hình 5: Tùy chỉnh & Xác nhận Kế hoạch Học tập (TV3)'
      : 'HaUI Advisor — Hệ thống Trợ lý Ảo Tư vấn Lộ trình Học tập');

  const student = apiConfig.sessionStudent;

  const handleToggleMock = () => {
    if (apiConfig.isProduction) return;
    api.setMockMode(!apiConfig.mockEnabled);
  };

  return (
    <header className="haui-topbar">
      <div className="haui-topbar__left">
        {typeof onToggleCollapse === 'function' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            title={collapsed ? 'Mở rộng menu (268px)' : 'Thu gọn menu (72px)'}
            style={{ fontSize: '15px', padding: '0 8px', minWidth: '32px' }}
          >
            {collapsed ? '☰' : '⇤'}
          </Button>
        )}
        <h2 className="haui-topbar__heading">{pageTitle}</h2>
        <span className="haui-badge haui-badge--primary">design-base-v1</span>
      </div>

      <div className="haui-topbar__right">
        {/* Academic Status Badge (BR-07 / US-12) */}
        <span
          className={`haui-badge ${
            student?.id === 'empty'
              ? 'haui-badge--neutral'
              : (student?.cpa !== null && student?.cpa < 2.0) || student?.id === 'at-risk'
              ? 'haui-badge--warning'
              : 'haui-badge--success'
          }`}
          title="Quy chế BR-07: Sinh viên có CPA 2.45 và đang nợ môn tiên quyết (MATH1002)"
        >
          {student?.id === 'empty'
            ? 'ℹ️ Chưa nạp bảng điểm'
            : (student?.cpa !== null && student?.cpa < 2.0) || student?.id === 'at-risk'
            ? '⚠️ Cảnh báo học vụ: Mức 1'
            : '✓ Học vụ: Bình thường'}
        </span>

        {/* Quick Persona Switcher for Reviewers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select
            className="haui-input"
            style={{ padding: '2px 8px', height: '28px', fontSize: '11px', fontWeight: 600 }}
            value={student?.id || 'at-risk'}
            onChange={(e) => {
              const presetKey = e.target.value;
              selectStudentPreset(presetKey);
              const p = STUDENT_PRESETS[presetKey];
              if (p) api.setSessionStudent(p);
            }}
            title="Chuyển nhanh tài khoản mẫu (Prototype Task 2.2a)"
          >
            <option value="normal">👤 Chuẩn (KTPM K17 - CPA 3.2)</option>
            <option value="at-risk">🚨 Nguy cơ (KTPM K17 - CPA 1.85)</option>
            <option value="empty">⚪ Trắng (CNTT K19 - 0 TC)</option>
          </select>
        </div>

        {!apiConfig.isProduction && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span
              className={`haui-badge ${
                apiConfig.mockEnabled ? 'haui-badge--warning' : 'haui-badge--success'
              }`}
              title={
                apiConfig.mockEnabled
                  ? 'Đang sử dụng Mock Interceptor cục bộ (FIXTURE_ONLY)'
                  : 'Đang gọi trực tiếp tới Spring Boot Backend (/api/v1)'
              }
            >
              {apiConfig.mockEnabled ? 'API: MOCK (FIXTURE_ONLY)' : 'API: LIVE (/api/v1)'}
            </span>
          </div>
        )}

        {/* Student Profile Capsule (Session Identity) */}
        <div
          className="haui-student-pill"
          title="Danh tính sinh viên được trích xuất từ Server Session Context (Quy tắc 6 AGENTS.md)"
        >
          <span className="haui-student-pill__avatar" aria-hidden="true">
            {student?.avatarChar || (student?.fullName ? student.fullName.charAt(0) : 'A')}
          </span>
          <div>
            <strong style={{ color: 'var(--color-text-primary)' }}>{student.fullName}</strong>
            <span style={{ marginLeft: '6px' }}>
              ({student.studentId} &bull; {student.cohort?.split(' ')?.[0] || 'K17'})
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logoutStudent();
            navigate('/login');
          }}
          title="Đăng xuất khỏi phiên làm việc hiện tại"
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          Đăng xuất
        </Button>
      </div>
    </header>
  );
}

export default Topbar;
