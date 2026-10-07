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
 * Đóng gói mốc bàn giao `design-base-v1` (Task 2.1):
 * - UI Shell & Hệ thống Design Tokens (18px pill / 24px cards).
 * - Interactive Prototype với thanh State Switcher (Loaded, Skeleton, Empty, Error).
 * - Đầy đủ 4 Metric Cards (CPA 2.45, GPA null/UNKNOWN, 102/135 TC progress bar, Cảnh báo học vụ).
 * - Khối môn nợ cần gỡ gấp và Lộ trình đề xuất học kỳ kế tiếp (18 TC).
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

  const creditPercent = academicStatus
    ? Number(
        (
          (academicStatus.accumulatedCredits / academicStatus.totalCreditsRequired) *
          100
        ).toFixed(1)
      )
    : 75.6;

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
      {/* 1. State Switcher Bar (Task 2.1 Showcase) */}
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

      {/* 2. Widget Cảnh báo rủi ro học vụ sớm (Early Warning Alert Box — US-12 / BR-01) */}
      <div className="haui-alert-box" role="region" aria-label="Cảnh báo rủi ro học vụ sớm">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }} aria-hidden="true">
              🚨
            </span>
            <strong style={{ fontSize: 'var(--text-base)', color: '#7c2d12' }}>
              Cảnh báo rủi ro học vụ sớm (Early Warning — US-12 / FR-18):
            </strong>
            <span className="haui-badge haui-badge--warning">BR-01 / BR-07</span>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--text-sm)', color: '#9a3412', lineHeight: 1.5 }}>
            Bạn đang nợ môn <strong>Toán rời rạc (3 TC — MATH1002)</strong> – Đây là môn tiên quyết trực tiếp của{' '}
            <strong>Cấu trúc dữ liệu &amp; Giải thuật (IT6001)</strong> ở học kỳ tới! Điểm CPA hiện tại là <strong>2.45</strong>,
            tiệm cận ngưỡng trung bình nguy hiểm. Nếu không học lại ngay, bạn sẽ bị hoãn dây chuyền ít nhất 3 môn chuyên ngành.
          </p>

          {/* Cụm Nút CTA nổi bật */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/transcript')}
              title="Mở luồng nạp và bóc tách bảng điểm 3 bước (Task 2.2a)"
            >
              📑 Nhập Bảng Điểm (3 Bước) &rarr;
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/chat')}>
              💬 Nhờ AI tư vấn kỳ mới
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/what-if')}>
              🧮 Mô phỏng điểm CPA (What-if)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/planner')}>
              📅 Xem lộ trình học tập
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsIngestModalOpen(true);
                if (!ingestResult && !ingestError) {
                  handleRunTranscriptIngestion({ fileName: 'Bang_Diem_eHaUI_std-2026-001.pdf' });
                }
              }}
            >
              📄 Cập nhật Bảng điểm (e-HaUI)
            </Button>
            <Link to="/demo-ui">
              <Button variant="ghost" size="sm">
                🧩 Mở Showcase Demo UI V0 &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Bốn Thẻ chỉ số tổng quan (Metric Cards) */}
      <div className="haui-grid haui-grid--4">
        {/* Thẻ 1: CPA Tích lũy */}
        <Card
          variant="status-info"
          title="CPA Tích lũy"
          subtitle="Thang điểm 4.0 (Quy chế BR-05)"
          headerAction={<span className="haui-badge haui-badge--info">CPA 4.0</span>}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {academicStatus?.cpa !== null && academicStatus?.cpa !== undefined
                ? Number(academicStatus.cpa).toFixed(2)
                : '2.45'}
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>/ 4.00</span>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="haui-badge haui-badge--warning">Trung bình</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Cách Khá (2.50) đúng 0.05 điểm
            </span>
          </div>
        </Card>

        {/* Thẻ 2: Tín chỉ tích lũy & Progress Bar */}
        <Card
          variant="status-success"
          title="Số tín chỉ tích lũy"
          subtitle="Tiến độ hoàn thành toàn khóa"
          headerAction={<span className="haui-badge haui-badge--success">{creditPercent}%</span>}
        >
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-success-text)' }}>
            {academicStatus?.accumulatedCredits || 102} / {academicStatus?.totalCreditsRequired || 135} TC
          </div>
          <div className="haui-progress-track" style={{ marginTop: '10px' }}>
            <div
              className="haui-progress-fill"
              style={{ width: `${creditPercent}%`, backgroundColor: 'var(--color-success)' }}
            />
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '6px' }}>
            Còn thiếu {(academicStatus?.totalCreditsRequired || 135) - (academicStatus?.accumulatedCredits || 102)} tín chỉ để tốt nghiệp
          </div>
        </Card>

        {/* Thẻ 3: Tình trạng học vụ (Academic Status) */}
        <Card
          variant="status-warning"
          title="Tình trạng Học vụ"
          subtitle="Đối chiếu ngưỡng cảnh báo BR-07"
          headerAction={<span className="haui-badge haui-badge--warning">Cảnh báo</span>}
        >
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-warning-text)' }}>
            Cảnh báo mức 1 (Đỏ cam)
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Nợ 1 môn tiên quyết (MATH1002 - 3 TC). Cần gỡ ngay học kỳ tới để tránh bị xử lý học vụ.
          </div>
        </Card>

        {/* Thẻ 4: GPA Học kỳ hiện tại (Bảo toàn dữ liệu khuyết Rule 5) */}
        <Card
          variant="default"
          title="GPA Học kỳ hiện tại"
          subtitle="Bảo toàn dữ liệu khuyết (Rule 5)"
          headerAction={<span className="haui-badge haui-badge--neutral">UNKNOWN</span>}
        >
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            {academicStatus?.gpa === null ? 'null (UNKNOWN)' : academicStatus?.gpa || 'null (UNKNOWN)'}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Chưa khóa sổ học kỳ hiện tại; hệ thống giữ nguyên <code>null</code> thay vì gán 0.
          </div>
        </Card>
      </div>

      {/* 4. Khối Môn học cần chú ý & Lộ trình đề xuất học kỳ kế tiếp */}
      <div className="haui-grid haui-grid--2">
        {/* Khối Môn nợ & Môn tiên quyết cần gỡ gấp */}
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

        {/* Khối Lộ trình đề xuất học kỳ kế tiếp */}
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

      {/* 5. Thanh tiến độ Chương trình đào tạo (Degree Progress Bar theo 5 Khối kiến thức) */}
      <Card
        title="Thanh Tiến độ Chương trình Đào tạo theo Khối Kiến thức (Degree Progress Bar)"
        subtitle="Phân rã tỷ lệ hoàn thành từng khối kiến thức ngành Kỹ thuật phần mềm / CNTT"
        headerAction={
          <Link to="/curriculum">
            <Button variant="secondary" size="sm">
              🌳 Xem Sơ đồ Cây Môn học (Màn hình 4) &rarr;
            </Button>
          </Link>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {(academicStatus?.knowledgeBlocks || []).map((blk) => (
            <div key={blk.blockId}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  fontSize: 'var(--text-sm)'
                }}
              >
                <strong>{blk.name}</strong>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                  Đã tích lũy: <strong>{blk.earnedCredits}</strong> / {blk.requiredCredits} TC ({blk.percentage}%)
                </span>
              </div>
              <div className="haui-progress-track">
                <div
                  className="haui-progress-fill"
                  style={{
                    width: `${blk.percentage}%`,
                    backgroundColor: blk.color || 'var(--color-primary)'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 6. 4 Phân khúc Sinh viên Mục tiêu từ 1-Page Brief & PRD Mục 2 */}
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

      {/* 7. Điểm nối TV2 -> TV3 và Trạng thái hệ thống */}
      <div className="haui-grid haui-grid--2">
        <Card
          title="Điểm nối Dependency Injection (TV2 → TV3)"
          subtitle="Danh sách các route sinh viên được mount qua createStudentRoutes({ api, ui })"
          headerAction={
            <span className="haui-badge haui-badge--success">
              {mountedRouteSummary?.routes?.length || 0} Routes Active
            </span>
          }
        >
          <Table
            columns={[
              {
                key: 'path',
                title: 'Đường dẫn Route',
                render: (val) => (
                  <Link to={val}>
                    <code style={{ fontWeight: 600 }}>{val}</code>
                  </Link>
                )
              },
              {
                key: 'title',
                title: 'Màn hình theo UI Flow'
              },
              {
                key: 'status',
                title: 'Trạng thái',
                render: (val) => (
                  <span className="haui-badge haui-badge--warning">{val}</span>
                )
              }
            ]}
            data={mountedRouteSummary?.routes || []}
            rowKey="path"
            striped
          />
        </Card>

        <Card
          title="Trạng thái Runtime & Hợp đồng Hệ thống"
          subtitle="Thông tin từ /api/v1/system/bootstrap & /api/v1/system/health"
          headerAction={
            <span className="haui-badge haui-badge--info">
              {healthInfo?.status || 'UNKNOWN'}
            </span>
          }
        >
          <pre className="haui-code-block">
            {JSON.stringify(
              {
                bootstrap: bootstrapInfo,
                health: healthInfo,
                contractHandoff: mountedRouteSummary?.contractStatus
              },
              null,
              2
            )}
          </pre>
        </Card>
      </div>

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
                  File nguồn: <code>{ingestResult.sourceFileName}</code>
                </span>
                <span>
                  CPA tính toán: <strong>{ingestResult.extractedCpa}</strong> &bull; Tín chỉ:{' '}
                  <strong>{ingestResult.extractedAccumulatedCredits} TC</strong>
                </span>
              </div>
              <Table
                columns={[
                  { key: 'courseCode', title: 'Mã môn', width: '100px' },
                  { key: 'courseName', title: 'Tên môn học' },
                  { key: 'credits', title: 'TC', align: 'center', width: '60px' },
                  { key: 'score10', title: 'Hệ 10', align: 'center', width: '80px' },
                  { key: 'letterGrade', title: 'Điểm chữ', align: 'center', width: '90px' },
                  { key: 'score4', title: 'Hệ 4', align: 'center', width: '80px' },
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
