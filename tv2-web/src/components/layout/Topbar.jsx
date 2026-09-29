import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/apiClient.js';
import { Button } from '../ui/Button.jsx';

const ROUTE_TITLES = Object.freeze({
  '/': 'Màn hình 1: Trang chủ Dashboard Sinh viên (Student Academic Dashboard)',
  '/chat': 'Màn hình 2: Trợ lý ảo AI Chatbot (AI Advisor Chat Interface — TV3)',
  '/recommendations': 'Màn hình 3: Kết quả Phân tích & Đề xuất Lộ trình Học tập (TV3)',
  '/curriculum': 'Màn hình 4: Chi tiết & Sơ đồ Cây Quan hệ Môn học (Course Dependency Tree)',
  '/planner': 'Màn hình 5: Tùy chỉnh & Xác nhận Kế hoạch Học tập (Plan Finalization — TV3)',
  '/what-if': 'Màn hình 6, 7, 8: Giả lập Điểm số, Tối ưu Học cải thiện & Tính điểm ngược (TV3)',
  '/progress': 'Màn hình 9: Bảng Kiểm toán Tốt nghiệp 100% (Graduation Degree Audit)',
  '/demo-ui': 'Showcase Shared UI Library V0 & Singleton Mock API Client (ui-api-v0)'
});

/**
 * Header / Topbar của Web Host (TV2)
 * Hiển thị tiêu đề màn hình theo UI Flow, công tắc chế độ Mock API (FIXTURE_ONLY) và thông tin sinh viên từ Session Context.
 */
export function Topbar() {
  const location = useLocation();
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
        <h2 className="haui-topbar__heading">{pageTitle}</h2>
        <span className="haui-badge haui-badge--primary">ui-api-v0</span>
      </div>

      <div className="haui-topbar__right">
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
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleMock}
              title="Bật/tắt chế độ Mock Interceptor cho phát triển cục bộ V0"
            >
              {apiConfig.mockEnabled ? 'Chuyển sang Live API' : 'Chuyển sang Mock API'}
            </Button>
          </div>
        )}

        <div
          className="haui-student-pill"
          title="Danh tính sinh viên được trích xuất từ Server Session Context (Quy tắc 6 AGENTS.md)"
        >
          <span className="haui-student-pill__avatar" aria-hidden="true">
            A
          </span>
          <div>
            <strong style={{ color: 'var(--color-text-primary)' }}>{student.fullName}</strong>
            <span style={{ marginLeft: '6px' }}>
              ({student.studentId} &bull; {student.majorName} &bull; {student.cohort})
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
