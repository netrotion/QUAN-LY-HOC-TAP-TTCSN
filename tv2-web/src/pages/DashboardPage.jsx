import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import { STUDENT_PERSONAS } from '../services/mockFixtures.js';
import { Button, Card, EmptyState, Error as ErrorBox, Loading, Modal, Table } from '../components/ui/index.js';
import {
  STUDENT_PRESETS,
  getAcademicSnapshot,
  selectStudentPreset,
  subscribeAcademicStore
} from '../services/academicStore.js';

/**
 * Mẫu dữ liệu Lộ trình đề xuất học kỳ kế tiếp (18 TC — tuân thủ BR-03: 10–24 TC)
 */
const RECOMMENDED_NEXT_SEMESTER_COURSES = Object.freeze([
  {
    code: 'MATH1002',
    name: 'Toán rời rạc (Học lại gỡ nợ)',
    credits: 3,
    type: 'Tiên quyết / Gỡ gấp',
    badgeCls: 'haui-course-badge--danger',
    reason: 'Gỡ môn nợ tiên quyết để mở khóa IT6001 và các môn sau'
  },
  {
    code: 'IT6001',
    name: 'Cấu trúc dữ liệu và Giải thuật',
    credits: 3,
    type: 'Bắt buộc ngành',
    badgeCls: 'haui-course-badge--info',
    reason: 'Môn cốt lõi Kỹ thuật phần mềm & CNTT'
  },
  {
    code: 'IT6005',
    name: 'Kiến trúc máy tính & Hợp ngữ',
    credits: 3,
    type: 'Cơ sở ngành',
    badgeCls: 'haui-course-badge--info',
    reason: 'Theo tiến độ chuẩn học kỳ 4'
  },
  {
    code: 'IT6012',
    name: 'Hệ điều hành',
    credits: 3,
    type: 'Cơ sở ngành',
    badgeCls: 'haui-course-badge--info',
    reason: 'Theo tiến độ chuẩn học kỳ 4'
  },
  {
    code: 'SE3001',
    name: 'Công nghệ phần mềm',
    credits: 3,
    type: 'Chuyên ngành',
    badgeCls: 'haui-course-badge--info',
    reason: 'Khởi đầu khối kiến thức chuyên sâu KTPM'
  },
  {
    code: 'EN2001',
    name: 'Tiếng Anh chuyên ngành CNTT 1',
    credits: 3,
    type: 'Điều kiện tốt nghiệp',
    badgeCls: 'haui-course-badge--warning',
    reason: 'Đảm bảo tích lũy chuẩn đầu ra ngoại ngữ'
  }
]);

/**
 * Màn hình 1: Trang chủ Dashboard Sinh viên (`/`) — TV2 Web Host
 * Tái thiết kế toàn diện theo Prototype "Clinical Blueprint on Frosted Paper":
 * - Header chào mừng & Thanh lối tắt Quick Actions bo tròn dạng pill
 * - 4 Thẻ chỉ số tổng quan (GPA, Tín chỉ, Điểm rèn luyện, Chuẩn tốt nghiệp)
 * - Biểu đồ trực quan Biến thiên GPA & Tín chỉ 6 học kỳ (SVG) + Cấu trúc 5 khối kiến thức
 * - Bảng theo dõi Học phần đang học kèm cảnh báo môn tiên quyết MATH1002
 * - Thẻ Cố vấn AI Advisor với khuyến nghị lộ trình tối ưu
 * - Khối kế hoạch đã lưu Task 3.9 & Hỗ trợ chuyển đổi trạng thái mẫu
 */
export function DashboardPage({ mountedRouteSummary }) {
  const navigate = useNavigate();

  // State quản lý chế độ xem thử nghiệm các Component States (Task 2.1)
  const [componentState, setComponentState] = useState('loaded'); // 'loaded' | 'loading' | 'empty' | 'error'

  const [academicStatus, setAcademicStatus] = useState(null);
  const [bootstrapInfo, setBootstrapInfo] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho 4 phân khúc sinh viên (PRD Mục 2 & 1-Page Brief)
  const [activePersonaId, setActivePersonaId] = useState('at-risk');

  // State cho Luồng phụ A: Nhập & Đồng bộ Bảng điểm (Bước A1 -> A4, FR-02, AC-01)
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState(null);
  const [ingestResult, setIngestResult] = useState(null);
  const [ingestConfirmed, setIngestConfirmed] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, bootRes, healthRes] = await Promise.all([
        api.academic.getStatus(),
        api.system.getBootstrap(),
        api.system.getHealth()
      ]);
      setAcademicStatus(statusRes);
      setBootstrapInfo(bootRes);
      setHealthInfo(healthRes);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const unsubStore = subscribeAcademicStore(() => {
      loadDashboardData();
    });
    const unsubApi = api.subscribe(() => {
      loadDashboardData();
    });
    return () => {
      unsubStore();
      unsubApi();
    };
  }, [loadDashboardData]);

  // Xử lý Bước A2 & A3: Tải file bảng điểm PDF/Ảnh từ e-HaUI hoặc mô phỏng lỗi định dạng file
  const handleRunTranscriptIngestion = async (options = {}) => {
    setIngestLoading(true);
    setIngestError(null);
    setIngestConfirmed(false);
    try {
      const res = await api.academic.ingestTranscript({
        fileName: options.fileName || 'Bang_Diem_Ca_Nhan_eHaUI_K17.pdf',
        invalidFormat: Boolean(options.invalidFormat)
      });
      setIngestResult(res);
    } catch (err) {
      setIngestResult(null);
      setIngestError(err);
    } finally {
      setIngestLoading(false);
    }
  };

  const activePersona =
    STUDENT_PERSONAS.find((p) => p.id === activePersonaId) || STUDENT_PERSONAS[0];

  const studentSession = api.getConfig().sessionStudent;

  const creditPercent = academicStatus
    ? Number(
        (
          (academicStatus.accumulatedCredits / academicStatus.totalCreditsRequired) *
          100
        ).toFixed(1)
      )
    : 74.5;

  const cpaValue =
    academicStatus?.cpa !== null && academicStatus?.cpa !== undefined
      ? Number(academicStatus.cpa).toFixed(2)
      : '3.24';

  const accumulatedCredits = academicStatus?.accumulatedCredits || 108;
  const totalRequiredCredits = academicStatus?.totalCreditsRequired || 145;

  // Render Skeleton Layout khi xem trạng thái 'loading'
  if (componentState === 'loading' || (loading && componentState === 'loaded' && !academicStatus)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* State Switcher Bar */}
        <div className="haui-state-switcher">
          <div className="haui-state-switcher__label">
            <span>🎛️ Showcase Component States (design-base-v1):</span>
          </div>
          <div className="haui-state-switcher__group">
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'loaded' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('loaded')}
            >
              ● Loaded (Đầy đủ dữ liệu)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'loading' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('loading')}
            >
              ◌ Loading (Skeleton Shimmer)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'empty' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('empty')}
            >
              ∅ Empty State (Chưa có dữ liệu)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'error' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('error')}
            >
              ⚠️ Error State (Lỗi kết nối)
            </button>
          </div>
        </div>

        <div className="haui-skeleton-box" style={{ height: '90px' }} />

        <div className="haui-grid haui-grid--4">
          <div className="haui-skeleton-box" style={{ height: '140px' }} />
          <div className="haui-skeleton-box" style={{ height: '140px' }} />
          <div className="haui-skeleton-box" style={{ height: '140px' }} />
          <div className="haui-skeleton-box" style={{ height: '140px' }} />
        </div>

        <div className="haui-grid haui-grid--2">
          <div className="haui-skeleton-box" style={{ height: '220px' }} />
          <div className="haui-skeleton-box" style={{ height: '220px' }} />
        </div>

        <div className="haui-skeleton-box" style={{ height: '260px' }} />
      </div>
    );
  }

  // Render Empty State khi xem trạng thái 'empty'
  if (componentState === 'empty') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* State Switcher Bar */}
        <div className="haui-state-switcher">
          <div className="haui-state-switcher__label">
            <span>🎛️ Showcase Component States (design-base-v1):</span>
          </div>
          <div className="haui-state-switcher__group">
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'loaded' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('loaded')}
            >
              ● Loaded (Đầy đủ dữ liệu)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'loading' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('loading')}
            >
              ◌ Loading (Skeleton Shimmer)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'empty' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('empty')}
            >
              ∅ Empty State (Chưa có dữ liệu)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'error' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('error')}
            >
              ⚠️ Error State (Lỗi kết nối)
            </button>
          </div>
        </div>

        <Card title="Hồ sơ Học tập & Kế hoạch Sinh viên" subtitle="Trạng thái khởi tạo hồ sơ cá nhân">
          <EmptyState
            title="Chưa có dữ liệu bảng điểm hoặc kế hoạch học tập"
            description="Hệ thống chưa tìm thấy hồ sơ kết quả học tập của sinh viên. Vui lòng tải lên bảng điểm cá nhân từ e-HaUI (file PDF/ảnh) để bắt đầu phân tích và tạo lộ trình học tập tối ưu."
            actionLabel="📄 Tải lên bảng điểm e-HaUI (AC-01)"
            onAction={() => {
              setIsIngestModalOpen(true);
              if (!ingestResult && !ingestError) {
                handleRunTranscriptIngestion({ fileName: 'Bang_Diem_eHaUI_std-2026-001.pdf' });
              }
            }}
          />
        </Card>
      </div>
    );
  }

  // Render Error State khi xem trạng thái 'error'
  if (componentState === 'error' || error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* State Switcher Bar */}
        <div className="haui-state-switcher">
          <div className="haui-state-switcher__label">
            <span>🎛️ Showcase Component States (design-base-v1):</span>
          </div>
          <div className="haui-state-switcher__group">
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'loaded' ? 'haui-state-pill--active' : ''}`}
              onClick={() => {
                setComponentState('loaded');
                loadDashboardData();
              }}
            >
              ● Loaded (Đầy đủ dữ liệu)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'loading' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('loading')}
            >
              ◌ Loading (Skeleton Shimmer)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'empty' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('empty')}
            >
              ∅ Empty State (Chưa có dữ liệu)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${componentState === 'error' ? 'haui-state-pill--active' : ''}`}
              onClick={() => setComponentState('error')}
            >
              ⚠️ Error State (Lỗi kết nối)
            </button>
          </div>
        </div>

        <ErrorBox
          title="Lỗi kết nối dịch vụ học vụ (Academic Service Unavailable — BR-503)"
          message="Máy chủ học vụ phản hồi mã lỗi 503 hoặc kết nối cơ sở dữ liệu tạm thời gián đoạn. Các tính năng tính toán CPA và kiểm tra điều kiện tiên quyết đang tạm dừng."
          code="ACADEMIC_SERVICE_UNAVAILABLE"
          requestId="req-tv2-demo-err99"
          details={[
            'Backend Spring Boot: http://localhost:8080/api/v1/academic/status',
            'Database Connection Pool: Active (Retry queue: 1)',
            'Gợi ý: Nhấn nút "Thử lại kết nối" hoặc chuyển sang chế độ Mock API tại Topbar'
          ]}
          retryLabel="Thử lại kết nối (Retry)"
          onRetry={() => {
            setComponentState('loaded');
            loadDashboardData();
          }}
        />
      </div>
    );
  }

  // Trạng thái Loaded mặc định
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 0. State Switcher Bar (Task 2.1 Showcase) */}
      <div className="haui-state-switcher" role="region" aria-label="Bộ chọn trạng thái giao diện mẫu">
        <div className="haui-state-switcher__label">
          <span>🎛️ Showcase Component States (design-base-v1):</span>
          <span className="haui-badge haui-badge--primary">Interactive Switcher</span>
        </div>
        <div className="haui-state-switcher__group">
          <button
            type="button"
            className={`haui-state-pill ${componentState === 'loaded' ? 'haui-state-pill--active' : ''}`}
            onClick={() => setComponentState('loaded')}
            title="Hiển thị Dashboard đầy đủ dữ liệu học vụ"
          >
            ● Loaded (Đầy đủ dữ liệu)
          </button>
          <button
            type="button"
            className={`haui-state-pill ${componentState === 'loading' ? 'haui-state-pill--active' : ''}`}
            onClick={() => setComponentState('loading')}
            title="Xem giao diện Skeleton Loading Shimmer"
          >
            ◌ Loading (Skeleton Shimmer)
          </button>
          <button
            type="button"
            className={`haui-state-pill ${componentState === 'empty' ? 'haui-state-pill--active' : ''}`}
            onClick={() => setComponentState('empty')}
            title="Xem trạng thái rỗng khi chưa có bảng điểm"
          >
            ∅ Empty State (Chưa có dữ liệu)
          </button>
          <button
            type="button"
            className={`haui-state-pill ${componentState === 'error' ? 'haui-state-pill--active' : ''}`}
            onClick={() => setComponentState('error')}
            title="Xem giao diện báo lỗi thân thiện"
          >
            ⚠️ Error State (Lỗi hệ thống)
          </button>
        </div>
      </div>

      {/* SECTION 1: WELCOME & QUICK ACTIONS */}
      <section style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-mid-gray)' }}>
              Cổng Thông Tin Học Vụ Đại Học Công Nghiệp Hà Nội
            </span>
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Tổng quan học tập
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-mid-gray)', maxWidth: '640px' }}>
            Chào <strong style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{studentSession?.fullName || 'Nguyễn Văn An'}</strong> (Mã SV: {studentSession?.studentId || '2020601234'}) &bull; Khóa 16 ngành Công nghệ Thông tin &bull; Khoa CNTT - HaUI
          </p>
        </div>

        {/* Quick Actions Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="haui-pill-btn-dark"
            onClick={() => navigate('/transcript')}
            title="Mở luồng nạp và bóc tách bảng điểm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              upload_file
            </span>
            <span>Cập nhật bảng điểm</span>
          </button>

          <button
            type="button"
            className="haui-pill-btn-paper"
            onClick={() => navigate('/planner')}
            title="Mở giao diện lập kế hoạch học tập kỳ tới"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              calendar_add_on
            </span>
            <span>Lập kế hoạch kỳ tới</span>
          </button>

          <button
            type="button"
            className="haui-pill-btn-canvas"
            onClick={() => navigate('/chat')}
            title="Hỏi trợ lý ảo cố vấn lộ trình AI"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              smart_toy
            </span>
            <span>Hỏi AI Cố Vấn</span>
          </button>
        </div>
      </section>

      {/* SECTION 2: 4 CORE STAT CARDS */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {/* Stat 1: CPA */}
        <div className="haui-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                GPA Tích lũy
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
                  {cpaValue}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>/ 4.00</span>
              </div>
            </div>
            <span className="haui-stat-trend">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>
              +0.12
            </span>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>
                Xếp loại: {Number(cpaValue) >= 3.2 ? 'Giỏi' : Number(cpaValue) >= 2.5 ? 'Khá' : 'Trung bình'}
              </span>
              <span style={{ color: 'var(--color-mid-gray)' }}>Mục tiêu: 3.20 - 3.59</span>
            </div>
            <div className="haui-progress-bar-minimal">
              <div
                className="haui-progress-bar-fill"
                style={{ width: `${Math.min(100, (Number(cpaValue) / 4.0) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stat 2: Credits */}
        <div className="haui-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tín chỉ tích lũy
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
                  {accumulatedCredits}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>/ {totalRequiredCredits} TC</span>
              </div>
            </div>
            <span className="haui-stat-trend">
              {creditPercent}%
            </span>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Chương trình CNTT K16</span>
              <span style={{ color: 'var(--color-mid-gray)' }}>Còn thiếu {totalRequiredCredits - accumulatedCredits} TC</span>
            </div>
            <div className="haui-progress-bar-minimal">
              <div className="haui-progress-bar-fill" style={{ width: `${creditPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Stat 3: Training Point */}
        <div className="haui-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Điểm rèn luyện TB
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
                  86
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>/ 100</span>
              </div>
            </div>
            <span className="haui-stat-trend">
              <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
              Loại Tốt
            </span>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Đạt điều kiện tốt nghiệp</span>
              <span style={{ color: 'var(--color-mid-gray)' }}>Kỳ 6: 88 điểm</span>
            </div>
            <div className="haui-progress-bar-minimal">
              <div className="haui-progress-bar-fill" style={{ width: '86%' }} />
            </div>
          </div>
        </div>

        {/* Stat 4: Graduation Standard */}
        <div className="haui-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tiến độ chuẩn tốt nghiệp
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
                  4
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>/ 6 điều kiện</span>
              </div>
            </div>
            <span className="haui-stat-trend">
              66.7%
            </span>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>B1 VSTEP &bull; IC3: Đạt</span>
              <span style={{ color: 'var(--color-mid-gray)' }}>Khóa luận: Chờ</span>
            </div>
            <div className="haui-progress-bar-minimal">
              <div className="haui-progress-bar-fill" style={{ width: '66.7%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CHARTS & CURRICULUM ARCHITECTURE (2 COLUMNS: 60% / 40%) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        {/* GPA & Credits Evolution (60% -> col-span-7) */}
        <div className="haui-stat-card" style={{ gridColumn: 'span 7' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em' }}>
                Biến thiên GPA &amp; Tín chỉ theo 6 học kỳ
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                Quá trình phấn đấu từ Học kỳ 1 đến Học kỳ 6 (Năm học 2021 - 2024)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                GPA kỳ (Hệ 4)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--color-canvas)' }} />
                Số tín chỉ
              </span>
            </div>
          </div>

          {/* Minimal SVG Visual Chart */}
          <div style={{ width: '100%', paddingTop: '16px', paddingBottom: '8px' }}>
            <div style={{ position: 'relative', width: '100%', height: '190px' }}>
              {/* Background Grid Lines */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', opacity: 0.3 }}>
                <div style={{ width: '100%', borderTop: '1px solid var(--color-hairline)' }} />
                <div style={{ width: '100%', borderTop: '1px solid var(--color-hairline)' }} />
                <div style={{ width: '100%', borderTop: '1px solid var(--color-hairline)' }} />
                <div style={{ width: '100%', borderTop: '1px solid var(--color-hairline)' }} />
              </div>

              {/* SVG Chart Curve & Sparkline points */}
              <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none" viewBox="0 0 600 160">
                <defs>
                  <linearGradient id="gpaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Credit Volume Bars in Canvas Tone */}
                <rect fill="#f5f5f5" height="95" rx="6" width="30" x="35" y="60" />
                <rect fill="#f5f5f5" height="100" rx="6" width="30" x="135" y="55" />
                <rect fill="#f5f5f5" height="105" rx="6" width="30" x="235" y="50" />
                <rect fill="#f5f5f5" height="87" rx="6" width="30" x="335" y="68" />
                <rect fill="#f5f5f5" height="95" rx="6" width="30" x="435" y="60" />
                <rect fill="#f5f5f5" height="80" rx="6" width="30" x="535" y="75" />
                {/* Path Area Fill */}
                <path d="M 50 120 L 150 95 L 250 68 L 350 78 L 450 56 L 550 48 L 550 155 L 50 155 Z" fill="url(#gpaGradient)" />
                {/* GPA Polyline */}
                <path d="M 50 120 L 150 95 L 250 68 L 350 78 L 450 56 L 550 48" fill="none" stroke="#0a0a0a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                {/* Node Points */}
                <circle cx="50" cy="120" fill="#0a0a0a" r="4.5" />
                <circle cx="150" cy="95" fill="#0a0a0a" r="4.5" />
                <circle cx="250" cy="68" fill="#0a0a0a" r="4.5" />
                <circle cx="350" cy="78" fill="#0a0a0a" r="4.5" />
                <circle cx="450" cy="56" fill="#0a0a0a" r="4.5" />
                <circle cx="550" cy="48" fill="#0a0a0a" r="5.5" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>

            {/* Horizontal Label Axis */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', textAlign: 'center', paddingTop: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>2.85</span>
                <span style={{ color: 'var(--color-mid-gray)' }}>HK 1 (18TC)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>3.02</span>
                <span style={{ color: 'var(--color-mid-gray)' }}>HK 2 (19TC)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>3.15</span>
                <span style={{ color: 'var(--color-mid-gray)' }}>HK 3 (20TC)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>3.10</span>
                <span style={{ color: 'var(--color-mid-gray)' }}>HK 4 (17TC)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>3.20</span>
                <span style={{ color: 'var(--color-mid-gray)' }}>HK 5 (18TC)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>3.24</span>
                <span style={{ color: 'var(--color-mid-gray)' }}>HK 6 (16TC)</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
            <span>Tích lũy bình quân: <strong style={{ color: 'var(--color-ink)', fontWeight: 500 }}>18.0 TC/kỳ</strong></span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-ink)', fontWeight: 500 }}>
              Dự kiến tốt nghiệp: Tháng 06/2025
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
            </span>
          </div>
        </div>

        {/* Curriculum Knowledge Blocks (40% -> col-span-5) */}
        <div className="haui-stat-card" style={{ gridColumn: 'span 5' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em' }}>
                Cấu trúc khối kiến thức
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>Đã tích lũy: {accumulatedCredits}/{totalRequiredCredits} TC</span>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
              Tiến độ hoàn thành 5 khối theo CTĐT Khoa CNTT
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Item 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Kiến thức đại cương</span>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>32/32 TC (100%)</span>
                </div>
                <div className="haui-progress-bar-minimal">
                  <div className="haui-progress-bar-fill" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Item 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Cơ sở ngành CNTT</span>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>45/45 TC (100%)</span>
                </div>
                <div className="haui-progress-bar-minimal">
                  <div className="haui-progress-bar-fill" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Item 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Chuyên ngành bắt buộc (KTPM)</span>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>25/38 TC (65.8%)</span>
                </div>
                <div className="haui-progress-bar-minimal">
                  <div className="haui-progress-bar-fill" style={{ width: '65.8%' }} />
                </div>
              </div>

              {/* Item 4 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Tự chọn định hướng &amp; Thực tập</span>
                  <span style={{ color: 'var(--color-mid-gray)' }}>6/20 TC (30.0%)</span>
                </div>
                <div className="haui-progress-bar-minimal">
                  <div className="haui-progress-bar-fill" style={{ width: '30%' }} />
                </div>
              </div>

              {/* Item 5 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Khóa luận / Đồ án tốt nghiệp</span>
                  <span style={{ color: 'var(--color-mid-gray)' }}>0/10 TC (0%)</span>
                </div>
                <div className="haui-progress-bar-minimal">
                  <div className="haui-progress-bar-fill" style={{ width: '4%' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: 'var(--color-mid-gray)' }}>Cần hoàn thành ở Kỳ 7 &amp; 8</span>
            <Link to="/curriculum" style={{ color: 'var(--color-ink)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Xem sơ đồ cây môn
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 4: CURRENT ENROLLED COURSES TABLE & PREREQUISITES */}
      <section className="haui-stat-card" style={{ gap: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em' }}>
                Học phần đang học (Kỳ 2 - Năm học 2023 - 2024)
              </h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                5 môn &bull; 14 TC
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
              Theo dõi tiến độ điểm đánh giá thành phần và điều kiện tiên quyết chuyên ngành
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="haui-pill-btn-canvas"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => navigate('/curriculum')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_list</span>
              Lọc môn học
            </button>
          </div>
        </div>

        {/* Data Table Container */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ color: 'var(--color-mid-gray)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: '#fafafa' }}>
                <th style={{ padding: '12px 16px', borderRadius: '12px 0 0 12px' }}>Mã &amp; Tên học phần</th>
                <th style={{ padding: '12px 12px' }}>Tín chỉ</th>
                <th style={{ padding: '12px 16px' }}>Giảng viên phụ trách</th>
                <th style={{ padding: '12px 16px' }}>Đánh giá quá trình</th>
                <th style={{ padding: '12px 16px' }}>Trạng thái / Lưu ý</th>
                <th style={{ padding: '12px 12px', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 */}
              <tr style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Lập trình Web nâng cao</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>IT6015 &bull; Khoa CNTT</span>
                  </div>
                </td>
                <td style={{ padding: '14px 12px', color: 'var(--color-ink)', fontWeight: 500 }}>3 TC</td>
                <td style={{ padding: '14px 16px', color: 'var(--color-mid-gray)' }}>TS. Trần Văn Minh</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', color: 'var(--color-ink)' }}>
                    <span>Quá trình:</span>
                    <strong>8.5</strong>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                    Đang học
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                  <button type="button" className="haui-sidebar__profile-logout" title="Xem chi tiết môn">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_horiz</span>
                  </button>
                </td>
              </tr>

              {/* Row 2 */}
              <tr style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Phân tích &amp; Thiết kế hệ thống</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>IT6018 &bull; Khoa CNTT</span>
                  </div>
                </td>
                <td style={{ padding: '14px 12px', color: 'var(--color-ink)', fontWeight: 500 }}>3 TC</td>
                <td style={{ padding: '14px 16px', color: 'var(--color-mid-gray)' }}>ThS. Lê Hoàng Yến</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', color: 'var(--color-ink)' }}>
                    <span>Quá trình:</span>
                    <strong>8.0</strong>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                    Đang học
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                  <button type="button" className="haui-sidebar__profile-logout" title="Xem chi tiết môn">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_horiz</span>
                  </button>
                </td>
              </tr>

              {/* Row 3 */}
              <tr style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Trí tuệ nhân tạo</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>IT6020 &bull; Khoa CNTT</span>
                  </div>
                </td>
                <td style={{ padding: '14px 12px', color: 'var(--color-ink)', fontWeight: 500 }}>3 TC</td>
                <td style={{ padding: '14px 16px', color: 'var(--color-mid-gray)' }}>PGS.TS. Phạm Quốc Hùng</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', color: 'var(--color-ink)' }}>
                    <span>Quá trình:</span>
                    <strong>7.5</strong>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                    Đang học
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                  <button type="button" className="haui-sidebar__profile-logout" title="Xem chi tiết môn">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_horiz</span>
                  </button>
                </td>
              </tr>

              {/* Row 4 (Alert Prerequisite Row - MATH1002) */}
              <tr style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Toán rời rạc (MATH1002)</span>
                      <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: 'var(--color-ember)' }} title="Môn nợ tiên quyết cần gỡ gấp" />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-error)' }}>
                      Môn tiên quyết trực tiếp của IT6001 (Cấu trúc dữ liệu &amp; Giải thuật) &bull; Điểm F
                    </span>
                  </div>
                </td>
                <td style={{ padding: '14px 12px', color: 'var(--color-ink)', fontWeight: 500 }}>3 TC</td>
                <td style={{ padding: '14px 16px', color: 'var(--color-mid-gray)' }}>TS. Đỗ Ngọc Sơn</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-ember)', fontWeight: 600 }}>Điểm F (0.0)</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ember)', fontWeight: 600 }}>
                    Nợ tiên quyết
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="haui-pill-btn-dark"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={() => navigate('/planner')}
                  >
                    Gỡ nợ kỳ tới
                  </button>
                </td>
              </tr>

              {/* Row 5 */}
              <tr>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Tiếng Anh chuyên ngành CNTT</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>FL6005 &bull; Bộ môn Ngoại ngữ</span>
                  </div>
                </td>
                <td style={{ padding: '14px 12px', color: 'var(--color-ink)', fontWeight: 500 }}>2 TC</td>
                <td style={{ padding: '14px 16px', color: 'var(--color-mid-gray)' }}>ThS. Vũ Thị Mai</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', color: 'var(--color-ink)' }}>
                    <span>Quá trình:</span>
                    <strong>9.0</strong>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                    Đang học
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                  <button type="button" className="haui-sidebar__profile-logout" title="Xem chi tiết môn">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_horiz</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 5: SMART AI ADVISOR RECOMMENDATION CARD */}
      <section className="haui-stat-card" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', maxWidth: '780px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)', color: 'var(--color-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>smart_toy</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em' }}>
                Lời khuyên từ AI Advisor cho bạn
              </h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-mid-gray)' }}>
                Tối ưu hóa học kỳ
              </span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--color-mid-gray)' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ink)', marginTop: '2px', flexShrink: 0 }}>check_circle</span>
                <span>
                  Bạn đã tích lũy <strong style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{accumulatedCredits} tín chỉ</strong>, hoàn toàn đủ điều kiện theo quy chế HaUI để đăng ký <strong style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Khóa luận tốt nghiệp (10 TC)</strong> vào Học kỳ 1 năm sau nếu hoàn thành toàn bộ 14 tín chỉ trong kỳ hiện tại.
                </span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ember)', marginTop: '2px', flexShrink: 0 }}>info</span>
                <span>
                  Lưu ý học phần <strong style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Kiến trúc phần mềm</strong> (dự kiến đăng ký Kỳ 7) yêu cầu môn tiên quyết <strong style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Lập trình hướng đối tượng (IT6002)</strong> của bạn đã đạt điểm B+ (Hợp lệ).
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action CTA Group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignSelf: 'center', minWidth: '180px' }}>
          <button
            type="button"
            className="haui-pill-btn-dark"
            onClick={() => navigate('/planner')}
            style={{ justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>alt_route</span>
            <span>Phân bổ môn Kỳ 7</span>
          </button>
          <button
            type="button"
            className="haui-pill-btn-canvas"
            onClick={() => navigate('/what-if')}
            style={{ justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>insights</span>
            <span>Mô phỏng What-if</span>
          </button>
        </div>
      </section>

      {/* SECTION 6: LỘ TRÌNH ĐỀ XUẤT 18 TÍN CHỈ & MÔN NỢ TIÊN QUYẾT */}
      <div className="haui-grid haui-grid--2">
        {/* Khối Môn Nợ Tiên Quyết */}
        <Card
          title="Môn Nợ & Môn Tiên Quyết Cần Gỡ Gấp (Urgent Retakes)"
          subtitle="Các học phần không đạt làm tắc nghẽn cây môn học theo BR-01 & BR-07"
          variant="status-error"
          headerAction={<span className="haui-badge haui-badge--error">1 Môn nợ</span>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error-border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="haui-course-badge haui-course-badge--danger">MATH1002</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error-text)', fontWeight: 600 }}>
                  3 Tín chỉ &bull; Điểm F (0.0)
                </span>
              </div>
              <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                Toán rời rạc (Discrete Mathematics)
              </strong>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-error-text)', lineHeight: 1.4 }}>
                ⚠️ <strong>Môn tiên quyết trực tiếp của:</strong> IT6001 (Cấu trúc dữ liệu &amp; Giải thuật), IT6003 (Lý thuyết đồ thị). Nếu không gỡ ngay kỳ tới, lộ trình tốt nghiệp sẽ bị chậm ít nhất 1 năm.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <Button variant="danger" size="sm" onClick={() => navigate('/planner')}>
                  Đưa vào Kế hoạch học kỳ tới &rarr;
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Khối Lộ Trình Đề Xuất 18 Tín Chỉ */}
        <Card
          title="Lộ trình Học kỳ Kế tiếp Đề xuất (Next Semester Plan)"
          subtitle="Gợi ý tối ưu 18 Tín chỉ (Tuân thủ BR-03: Khung 10 – 24 TC)"
          variant="status-info"
          headerAction={
            <Button variant="secondary" size="sm" onClick={() => navigate('/planner')}>
              Tùy chỉnh lộ trình &rarr;
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {RECOMMENDED_NEXT_SEMESTER_COURSES.map((course) => (
              <div
                key={course.code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--text-xs)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span className={`haui-course-badge ${course.badgeCls}`}>{course.code}</span>
                  <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{course.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span className="haui-semester-tag">{course.type}</span>
                  <strong>{course.credits} TC</strong>
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--color-primary)'
              }}
            >
              <span>Tổng số tín chỉ đề xuất kỳ 4:</span>
              <span>18 Tín chỉ (Hợp lệ BR-03: 10 - 24 TC)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* SECTION 7: TIẾN ĐỘ HỌC VỤ & KẾ HOẠCH HỌC TẬP ĐÃ LƯU (Task 3.9) */}
      <Card
        title="Tiến độ Học vụ & Kế hoạch Học tập Đã lưu (Task 3.9)"
        subtitle="Theo dõi tiến độ tích lũy thực tế và kế hoạch học tập đã đăng ký/lưu trữ gần nhất"
        variant="status-info"
        headerAction={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/audit')}
              title="Mở bảng kiểm toán tốt nghiệp và in báo cáo"
            >
              🎓 {'Kiểm toán Tốt nghiệp & Báo cáo in'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/planner?plan_id=plan-2026-9001')}
              title="Mở kế hoạch học tập cũ đã lưu trên hệ thống"
            >
              📂 Mở Kế hoạch Học tập Đã lưu (Kế hoạch cũ) &rarr;
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              KẾ HOẠCH HỌC TẬP GẦN NHẤT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <strong style={{ fontSize: 'var(--text-base)', color: 'var(--color-primary)' }}>
                plan-2026-9001
              </strong>
              <span className="haui-badge haui-badge--success">ACTIVE</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Kế hoạch K17 – 18 tín chỉ kỳ tới &bull; Lưu: 2026-10-13
            </div>
          </div>

          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              TIẾN ĐỘ KIỂM TOÁN TỐT NGHIỆP
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <strong style={{ fontSize: 'var(--text-base)' }}>82% Hoàn thành</strong>
              <span className="haui-badge haui-badge--warning">5/7 Đạt</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-text)', marginTop: '4px' }}>
              Còn 2 điều kiện cần bù đắp (Tin học MOS &amp; 6 TC tự chọn)
            </div>
          </div>

          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              BÁO CÁO HỌC VỤ &amp; IN ẤN
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Hỗ trợ xuất PDF chuẩn A4 (Thực tế &bull; Dự kiến)
              </span>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Button variant="outline" size="sm" onClick={() => navigate('/audit')}>
                🖨️ Xuất Báo Cáo Học Vụ &rarr;
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 8: 4 Phân khúc Sinh viên Mục tiêu từ 1-Page Brief & PRD Mục 2 */}
      <Card
        title="Đối tượng Mục tiêu (4 Phân khúc Sinh viên HaUI — 1-Page Brief & PRD Mục 2)"
        subtitle="Chọn từng nhóm sinh viên để đối chiếu đặc điểm, nỗi đau học vụ và kịch bản tư vấn của HaUI Advisor"
        headerAction={<span className="haui-badge haui-badge--primary">Student-Centric</span>}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {STUDENT_PERSONAS.map((p) => (
            <Button
              key={p.id}
              variant={activePersonaId === p.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setActivePersonaId(p.id);
                const mappedPresetKey = p.id === 'freshman' ? 'empty' : p.id === 'high-achiever' ? 'normal' : p.id;
                if (STUDENT_PRESETS[mappedPresetKey]) {
                  selectStudentPreset(mappedPresetKey);
                  const snap = getAcademicSnapshot();
                  api.setSessionStudent(snap.student);
                }
              }}
            >
              {p.segment}
            </Button>
          ))}
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-bg-muted)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-cards)',
            padding: 'var(--space-4)'
          }}
        >
          <div className="haui-grid haui-grid--3">
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>HỒ SƠ MẪU (FIXTURE_ONLY)</div>
              <div style={{ fontWeight: 700, marginTop: '4px' }}>
                {activePersona.fullName} ({activePersona.studentId})
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {activePersona.majorName} &bull; {activePersona.cohort} &bull; CPA: <strong>{activePersona.cpa}</strong> ({activePersona.accumulatedCredits}/{activePersona.totalCreditsRequired} TC)
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>ĐẶC ĐIỂM &amp; NỖI ĐAU HỌC VỤ</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error-text)', marginTop: '4px' }}>
                {activePersona.painPoint}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>MỤC TIÊU SỬ DỤNG HAUI ADVISOR</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success-text)', marginTop: '4px' }}>
                {activePersona.goal}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal Luồng phụ A: Nhập & Đồng bộ Bảng điểm (FR-02 / AC-01) */}
      <Modal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        size="lg"
        title="Luồng phụ A: Nhập & Đồng bộ Bảng điểm từ e-HaUI (FR-02 / AC-01)"
        subtitle="Bước A1 → A4: Tải file PDF/Ảnh bảng điểm e-HaUI, tự động bóc tách môn học & kiểm tra hợp lệ trước khi lưu"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsIngestModalOpen(false)}>
              Đóng (ESC)
            </Button>
            {ingestResult && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIngestConfirmed(true)}
              >
                {ingestConfirmed ? '✓ Đã xác nhận lưu dữ liệu' : 'Bước A4: Xác nhận lưu dữ liệu'}
              </Button>
            )}
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Button
              variant="primary"
              size="sm"
              loading={ingestLoading}
              onClick={() =>
                handleRunTranscriptIngestion({ fileName: 'Bang_Diem_Ca_Nhan_eHaUI_K17.pdf' })
              }
            >
              📄 Bước A2: Tải file PDF bảng điểm hợp lệ (AC-01)
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={ingestLoading}
              onClick={() =>
                handleRunTranscriptIngestion({
                  fileName: 'Bang_Diem_Loi_Dinh_Dang.docx',
                  invalidFormat: true
                })
              }
            >
              ⚠️ Mô phỏng lỗi định dạng file (Mục 5 Edge Case)
            </Button>
          </div>

          {ingestLoading && (
            <Loading label="Bước A3: OCR / Parser đang bóc tách danh sách môn học, điểm thang 10, điểm chữ và điểm thang 4..." />
          )}

          {ingestError && !ingestLoading && (
            <ErrorBox
              title="Lỗi tải bảng điểm (Mục 5 Edge Cases)"
              error={ingestError}
              retryLabel="Tải lại file PDF chuẩn e-HaUI"
              onRetry={() =>
                handleRunTranscriptIngestion({ fileName: 'Bang_Diem_Ca_Nhan_eHaUI_K17.pdf' })
              }
            />
          )}

          {ingestConfirmed && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                color: 'var(--color-success-text)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600
              }}
            >
              ✓ Đã xác nhận lưu dữ liệu bảng điểm cá nhân (`rev-1001`)! Hệ thống đã cập nhật CPA = 2.45 và phát hiện 1 môn nợ tiên quyết (MATH1002).
            </div>
          )}

          {ingestResult && !ingestLoading && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  fontSize: 'var(--text-sm)'
                }}
              >
                <span>
                  File nguồn: <code>{ingestResult.fileName}</code>
                </span>
                <span>
                  CPA tính toán: <strong>{ingestResult.reportedCpa}</strong> &bull; Tín chỉ:{' '}
                  <strong>{ingestResult.reportedAccumulatedCredits} TC</strong>
                </span>
              </div>
              <Table
                columns={[
                  { key: 'courseCode', title: 'Mã môn', width: '100px' },
                  { key: 'courseName', title: 'Tên môn học' },
                  { key: 'credits', title: 'TC', align: 'center', width: '60px' },
                  { key: 'score10', title: 'Hệ 10', align: 'center', width: '80px' },
                  { key: 'letterGrade', title: 'Điểm chữ', align: 'center', width: '90px' },
                  {
                    key: 'status',
                    title: 'Phân loại (FR-04)',
                    width: '140px',
                    render: (st) => {
                      const map = {
                        PASSED: { cls: 'haui-badge--success', text: 'Đạt (Passed)' },
                        PASSED_LOW: { cls: 'haui-badge--warning', text: 'Điểm D/D+' },
                        FAILED: { cls: 'haui-badge--error', text: 'Trượt (Nợ môn)' },
                        IN_PROGRESS: { cls: 'haui-badge--info', text: 'Đang học (null)' }
                      };
                      const b = map[st] || { cls: 'haui-badge--neutral', text: st };
                      return <span className={`haui-badge ${b.cls}`}>{b.text}</span>;
                    }
                  }
                ]}
                data={ingestResult.records || []}
                rowKey="courseCode"
                striped
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default DashboardPage;
