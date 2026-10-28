import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Link, useAnimatedNavigate } from '../components/layout/animatedNavigation.jsx';
import { api } from '../services/apiClient.js';
import { STUDENT_PERSONAS } from '../services/mockFixtures.js';
import { Button, Card, EmptyState, Error as ErrorBox, Loading, Modal, Table } from '../components/ui/index.js';
import {
  STUDENT_PRESETS,
  getAcademicSnapshot,
  selectStudentPreset,
  subscribeAcademicStore
} from '../services/academicStore.js';
import { calculateSemesterGpaTrend } from '../services/mockAcademicService.js';
import { plannerStore } from '@haui/planner-ui';

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

const withoutParentheses = (value) => String(value ?? '').replace(/\s*\([^()]*\)/g, '').trim();

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
  const navigate = useAnimatedNavigate();

  // State quản lý chế độ xem thử nghiệm các Component States (Task 2.1)
  const [componentState, setComponentState] = useState('loaded'); // 'loaded' | 'loading' | 'empty' | 'error'

  const [academicStatus, setAcademicStatus] = useState(null);
  const [transcriptData, setTranscriptData] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [plannerState, setPlannerState] = useState(() => plannerStore.getState());
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
      const [statusRes, bootRes, healthRes, transcriptRes, auditRes] = await Promise.all([
        api.academic.getStatus(),
        api.system.getBootstrap(),
        api.system.getHealth(),
        api.academic.getTranscript().catch(() => null),
        api.audit.getGraduationAudit().catch(() => null)
      ]);
      setAcademicStatus(statusRes);
      setBootstrapInfo(bootRes);
      setHealthInfo(healthRes);
      setTranscriptData(transcriptRes);
      setAuditData(auditRes);
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
    const unsubPlanner = plannerStore.subscribe((newState) => {
      setPlannerState(newState);
    });

    const handleTranscriptUpdated = () => {
      loadDashboardData();
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
    }

    return () => {
      unsubStore();
      unsubApi();
      unsubPlanner();
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
      }
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
      : '—';

  const accumulatedCredits =
    academicStatus?.accumulatedCredits !== null && academicStatus?.accumulatedCredits !== undefined
      ? academicStatus.accumulatedCredits
      : (academicStatus ? 0 : '—');

  const totalRequiredCredits = academicStatus?.totalCreditsRequired || 135;

  const targetCpa = (() => {
    try {
      const s = localStorage.getItem('haui_settings');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.targetCpa) return Number(parsed.targetCpa);
      }
    } catch {}
    return 3.20;
  })();

  const cpaNum = cpaValue !== '—' ? Number(cpaValue) : null;
  const diffToTarget = cpaNum !== null ? Number((cpaNum - targetCpa).toFixed(2)) : null;
  const isCpaPositive = diffToTarget !== null ? diffToTarget >= 0 : true;

  const getCpaRank = (val) => {
    if (val === '—' || val === null || val === undefined) return 'Chưa có dữ liệu';
    const num = Number(val);
    if (isNaN(num)) return 'Chưa có dữ liệu';
    if (num >= 3.6) return 'Xuất sắc';
    if (num >= 3.2) return 'Giỏi';
    if (num >= 2.5) return 'Khá';
    if (num >= 2.0) return 'Trung bình';
    return 'Yếu (Cảnh báo)';
  };

  const semesterTrend = useMemo(() => {
    if (academicStatus?.semesterTrend && academicStatus.semesterTrend.length > 0) {
      return academicStatus.semesterTrend;
    }
    const rawAttempts =
      transcriptData?.attempts ||
      transcriptData?.records ||
      academicStatus?.attempts ||
      getAcademicSnapshot().transcriptRecords ||
      [];
    const overallCpa =
      academicStatus?.cpa !== null && academicStatus?.cpa !== undefined
        ? Number(academicStatus.cpa)
        : null;
    return calculateSemesterGpaTrend(rawAttempts, overallCpa);
  }, [academicStatus, transcriptData]);

  const failedCoursesList = useMemo(() => {
    if (academicStatus?.failedCourses && Array.isArray(academicStatus.failedCourses)) {
      return academicStatus.failedCourses;
    }
    const rawAttempts =
      transcriptData?.attempts ||
      transcriptData?.records ||
      getAcademicSnapshot().transcriptRecords ||
      [];
    return rawAttempts.filter((a) => a.letterGrade === 'F' || a.status === 'FAILED');
  }, [academicStatus, transcriptData]);

  const hasTranscript = Boolean(
    studentSession?.hasTranscript !== false &&
    academicStatus &&
    academicStatus.cpa !== null &&
    ((academicStatus.accumulatedCredits !== null && academicStatus.accumulatedCredits > 0) ||
      (transcriptData?.attempts && transcriptData.attempts.length > 0))
  );

  const inProgressCoursesList = useMemo(() => {
    if (!hasTranscript) return [];
    if (academicStatus?.inProgressCourses && Array.isArray(academicStatus.inProgressCourses)) {
      return academicStatus.inProgressCourses;
    }
    const rawAttempts =
      transcriptData?.attempts ||
      transcriptData?.records ||
      academicStatus?.attempts ||
      getAcademicSnapshot().transcriptRecords ||
      [];
    return rawAttempts.filter(
      (a) => a.status === 'IN_PROGRESS' || (a.letterGrade === null && (a.score10 === null || a.score10 === undefined))
    );
  }, [hasTranscript, academicStatus, transcriptData]);

  const nextSemesterPlan = useMemo(() => {
    if (!hasTranscript) return null;
    const sem0 = plannerState.plan?.semesters?.[0];
    if (sem0 && Array.isArray(sem0.courses) && sem0.courses.length > 0) {
      return {
        semesterName: sem0.semesterName || sem0.semesterCode || 'Học kỳ 1 (Năm học kế tiếp)',
        totalCredits: sem0.totalCredits || sem0.courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0),
        workloadAssessment: sem0.workloadAssessment || 'Cân bằng tải chuẩn HaUI (18 Tín chỉ tối đa)',
        courses: sem0.courses
      };
    }
    return null;
  }, [hasTranscript, plannerState]);

  const activePlanEntry = useMemo(() => {
    if (!hasTranscript) return null;
    const history = plannerState.history || [];
    return (
      history.find((h) => h.status === 'ACTIVE') ||
      (plannerState.plan?.status === 'ACTIVE' ? plannerState.plan : null) ||
      history[0] ||
      null
    );
  }, [hasTranscript, plannerState]);

  const trainingScore = hasTranscript
    ? (auditData?.trainingScore ?? academicStatus?.trainingScore ?? 84)
    : null;

  const completedChecklistCount = hasTranscript && auditData?.checklist
    ? auditData.checklist.filter((c) => c.completed).length
    : null;

  const totalChecklistCount = hasTranscript && auditData?.checklist
    ? auditData.checklist.length
    : null;

  const auditPercent = hasTranscript && auditData?.completedPercentage !== undefined
    ? auditData.completedPercentage
    : null;

  // Render Skeleton Layout khi xem trạng thái 'loading'
  if (componentState === 'loading' || (loading && componentState === 'loaded' && !academicStatus)) {
    return (
      <div className="haui-page-container">
        {/* State Switcher Bar */}
        <div className="haui-state-switcher" style={{ display: 'none' }}>
          <div className="haui-state-switcher__label">
            <span>Showcase Component States (design-base-v1):</span>
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
              Error State (Lỗi kết nối)
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
      <div className="haui-page-container">
        {/* State Switcher Bar */}
        <div className="haui-state-switcher" style={{ display: 'none' }}>
          <div className="haui-state-switcher__label">
            <span>Showcase Component States (design-base-v1):</span>
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
              Error State (Lỗi kết nối)
            </button>
          </div>
        </div>

        <Card title="Hồ sơ Học tập & Kế hoạch Sinh viên" subtitle="Trạng thái khởi tạo hồ sơ cá nhân">
          <EmptyState
            title="Chưa có dữ liệu bảng điểm hoặc kế hoạch học tập"
            description="Hệ thống chưa tìm thấy hồ sơ kết quả học tập của sinh viên. Vui lòng tải lên bảng điểm cá nhân từ e-HaUI (file PDF/ảnh) để bắt đầu phân tích và tạo lộ trình học tập tối ưu."
            actionLabel="Tải lên bảng điểm e-HaUI"
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

  // Render Error State khi xem trạng thái 'error' hoặc lỗi API thật
  if (componentState === 'error' || error) {
    const is503 = error?.status === 503 || error?.code === 'TOOL_NOT_READY';
    return (
      <div className="haui-page-container">
        {/* State Switcher Bar */}
        <div className="haui-state-switcher" style={{ display: 'none' }}>
          <div className="haui-state-switcher__label">
            <span>Showcase Component States (design-base-v1):</span>
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
              Error State (Lỗi kết nối)
            </button>
          </div>
        </div>

        <ErrorBox
          title={is503 ? 'Công cụ học vụ chưa sẵn sàng (503 TOOL_NOT_READY)' : 'Lỗi kết nối dịch vụ học vụ (Academic Service Unavailable — BR-503)'}
          message={
            is503
              ? 'Hệ thống đang chuẩn bị công cụ tính toán học vụ thật từ Rule Engine. Kết quả học vụ chưa có sẵn, không hiển thị số giả.'
              : error?.message || 'Máy chủ học vụ phản hồi mã lỗi 503 hoặc kết nối cơ sở dữ liệu tạm thời gián đoạn. Các tính năng tính toán CPA và kiểm tra điều kiện tiên quyết đang tạm dừng.'
          }
          code={error?.code || (is503 ? 'TOOL_NOT_READY' : 'ACADEMIC_SERVICE_UNAVAILABLE')}
          requestId={error?.requestId || `req-tv2-err-${Date.now()}`}
          details={
            error?.details?.length
              ? error.details
              : [
                  'Backend Spring Boot: http://localhost:8080/api/v1/academic/status',
                  'Database Connection Pool: Active (Retry queue: 1)',
                  'Gợi ý: Nhấn nút "Thử lại kết nối" hoặc chuyển sang chế độ Mock API tại Topbar'
                ]
          }
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
    <div className="haui-page-container">
      {/* 0. State Switcher Bar (Task 2.1 Showcase) */}
      <div className="haui-state-switcher" style={{ display: 'none' }} role="region" aria-label="Bộ chọn trạng thái giao diện mẫu">
        <div className="haui-state-switcher__label">
          <span>Showcase Component States (design-base-v1):</span>
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
            Error State (Lỗi hệ thống)
          </button>
        </div>
      </div>

      {/* SECTION 1: WELCOME & QUICK ACTIONS */}
      <section style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Tổng quan học tập
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-mid-gray)', maxWidth: '640px' }}>
            Chào <strong style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{studentSession?.fullName || 'Sinh viên'}</strong> &bull; MSSV: {studentSession?.studentId || '2024604757'} &bull; {studentSession?.cohort || 'Khóa đào tạo chính quy'} &bull; {studentSession?.majorName || 'Chương trình đào tạo Đại học'} &bull; {studentSession?.faculty || 'Đại học Công nghiệp Hà Nội'}
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
            {diffToTarget !== null && (
              <span
                className="haui-stat-trend"
                style={{
                  color: isCpaPositive ? '#16a34a' : 'var(--color-ember, #e7000b)',
                  backgroundColor: isCpaPositive ? '#f0fdf4' : '#fef2f2'
                }}
                title={`So với mục tiêu CPA ${targetCpa.toFixed(2)}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {isCpaPositive ? 'trending_up' : 'trending_down'}
                </span>
                {isCpaPositive ? `+${diffToTarget.toFixed(2)}` : `${diffToTarget.toFixed(2)}`}
              </span>
            )}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Dòng trên: Xếp hạng */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-mid-gray)' }}>Xếp loại học lực:</span>
              <span style={{ color: cpaNum !== null && cpaNum < 2.0 ? 'var(--color-ember, #e7000b)' : 'var(--color-ink)', fontWeight: 600 }}>
                {getCpaRank(cpaValue)}
              </span>
            </div>

            {/* Dòng dưới: Mục tiêu */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-mid-gray)' }}>Mục tiêu tốt nghiệp:</span>
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>
                {targetCpa.toFixed(2)} / 4.00 (Giỏi)
              </span>
            </div>

            {/* Thanh tiến độ */}
            <div className="haui-progress-bar-minimal" style={{ marginTop: '4px' }}>
              <div
                className="haui-progress-bar-fill"
                style={{
                  width: cpaNum !== null ? `${Math.min(100, (cpaNum / 4.0) * 100)}%` : '0%',
                  backgroundColor: cpaNum !== null && cpaNum < 2.0 ? 'var(--color-ember, #e7000b)' : 'var(--color-ink)'
                }}
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
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{studentSession?.majorName || 'Chương trình đào tạo HaUI'} ({studentSession?.cohort || 'Toàn khóa'})</span>
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
                  {trainingScore !== null ? trainingScore : '—'}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>
                  {trainingScore !== null ? '/ 100' : 'Chưa có'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>
                {trainingScore !== null ? 'Đạt điều kiện tốt nghiệp' : 'Chưa có điểm rèn luyện'}
              </span>
              <span style={{ color: 'var(--color-mid-gray)' }}>
                {trainingScore !== null ? `Mức điểm: ${trainingScore}/100` : 'Cần nạp bảng điểm'}
              </span>
            </div>
            <div className="haui-progress-bar-minimal">
              <div className="haui-progress-bar-fill" style={{ width: trainingScore !== null ? `${trainingScore}%` : '0%' }} />
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
                  {completedChecklistCount !== null ? completedChecklistCount : '—'}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>
                  {totalChecklistCount !== null ? `/ ${totalChecklistCount} điều kiện` : 'Chưa có'}
                </span>
              </div>
            </div>
            <span className="haui-stat-trend">
              {auditPercent !== null ? `${auditPercent}%` : 'Chưa có dữ liệu'}
            </span>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>
                {auditPercent !== null ? `${auditPercent}% tiêu chuẩn đạt` : 'Chưa có dữ liệu kiểm toán'}
              </span>
              <span style={{ color: 'var(--color-mid-gray)' }}>
                {auditPercent !== null ? `${completedChecklistCount}/${totalChecklistCount} tiêu chí` : 'Cần nạp bảng điểm'}
              </span>
            </div>
            <div className="haui-progress-bar-minimal">
              <div className="haui-progress-bar-fill" style={{ width: auditPercent !== null ? `${auditPercent}%` : '0%' }} />
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
                Biến thiên GPA &amp; CPA tích lũy qua các học kỳ
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                {semesterTrend.length > 0
                  ? `Quá trình tích lũy học tập qua ${semesterTrend.length} học kỳ đã hoàn thành`
                  : 'Tiến độ học tập và biến thiên chỉ số GPA/CPA'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-ink)' }} />
                CPA tích lũy
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--color-canvas)' }} />
                Cột mức điểm GPA
              </span>
            </div>
          </div>

          {/* Minimal SVG Visual Chart */}
          <div style={{ width: '100%', paddingTop: '16px', paddingBottom: '8px' }}>
            {semesterTrend.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-mid-gray)', backgroundColor: 'var(--color-canvas)', borderRadius: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '6px', opacity: 0.6 }}>query_stats</span>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-ink)', fontWeight: 500 }}>
                  Chưa có dữ liệu bảng điểm để biểu diễn biến thiên GPA &amp; CPA tích lũy.
                </p>
                <button type="button" className="haui-pill-btn-paper" onClick={() => navigate('/transcript')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload_file</span>
                  <span>Nạp bảng điểm e-HaUI ngay</span>
                </button>
              </div>
            ) : (() => {
              const N = semesterTrend.length;
              const svgWidth = 600;
              const padX = N > 1 ? 50 : 300;
              const availableW = svgWidth - 100;

              const points = semesterTrend.map((sem, idx) => {
                const x = N > 1 ? padX + (idx / (N - 1)) * availableW : 300;
                const cpaVal = sem.cumulativeCpa || 0;
                const gpaVal = sem.semesterGpa || 0;
                const displayGpa = cpaVal > 0 ? cpaVal : (gpaVal > 0 ? gpaVal : 0);
                const yCpa = 150 - (Math.min(4.0, Math.max(0, cpaVal)) / 4.0) * 115;
                // Chiều cao cột tỉ lệ thuận trực tiếp với GPA (GPA cao thì cột cao, GPA thấp hơn thì cột thấp hơn)
                const barHeight = Math.max(8, (Math.min(4.0, Math.max(0, displayGpa)) / 4.0) * 115);
                const barW = Math.min(36, Math.max(18, availableW / (N * 2)));
                const barX = x - barW / 2;
                const barY = 150 - barHeight;
                return { x, yCpa, barX, barY, barW, barHeight, sem };
              });

              // Chỉ 1 đường kẻ duy nhất cho CPA tích lũy
              const cpaPathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yCpa.toFixed(1)}`).join(' ');
              const cpaAreaD = `${cpaPathD} L ${points[points.length - 1].x.toFixed(1)} 155 L ${points[0].x.toFixed(1)} 155 Z`;

              return (
                <div>
                  <div style={{ position: 'relative', width: '100%', height: '190px' }}>
                    {/* Background Grid Lines */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', opacity: 0.3 }}>
                      <div style={{ width: '100%', borderTop: '1px solid var(--color-hairline)' }} />
                      <div style={{ width: '100%', borderTop: '1px solid var(--color-hairline)' }} />
                      <div style={{ width: '100%', borderTop: '1px solid var(--color-hairline)' }} />
                      <div style={{ width: '100%', borderTop: '1px solid var(--color-hairline)' }} />
                    </div>

                    <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none" viewBox="0 0 600 160">
                      <defs>
                        <linearGradient id="gpaGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Credit Volume Bars in Canvas Tone */}
                      {points.map((p, i) => (
                        <rect key={i} fill="var(--color-canvas, #f5f5f5)" height={p.barHeight} rx="5" width={p.barW} x={p.barX} y={p.barY} />
                      ))}

                      {/* CPA Path Area Fill */}
                      {N > 1 && <path d={cpaAreaD} fill="url(#gpaGradient)" />}

                      {/* 1 ĐƯỜNG KẺ DUY NHẤT: CPA Cumulative Polyline */}
                      {N > 1 && (
                        <path d={cpaPathD} fill="none" stroke="#0a0a0a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                      )}

                      {/* Node Points trên duy nhất 1 đường kẻ */}
                      {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.yCpa} fill="#0a0a0a" r={i === points.length - 1 ? 5.5 : 4.5} stroke="#ffffff" strokeWidth="2" />
                      ))}
                    </svg>
                  </div>

                  {/* Horizontal Label Axis */}
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${points.length}, 1fr)`, textAlign: 'center', paddingTop: '12px', fontSize: '12px', gap: '4px' }}>
                    {points.map((p, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: 'var(--color-ink)', fontWeight: 700 }}>
                          CPA {p.sem.cumulativeCpa > 0 ? p.sem.cumulativeCpa.toFixed(2) : '—'}
                        </span>
                        <span style={{ color: 'var(--color-mid-gray)', fontSize: '11px' }}>
                          {p.sem.displayLabel} ({p.sem.semesterCredits}TC)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-mid-gray)', flexWrap: 'wrap', gap: '8px' }}>
            <span>
              CPA tích lũy: <strong style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{cpaValue}</strong> ({getCpaRank(cpaValue)}) &bull; Tích lũy: <strong style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{accumulatedCredits}/{totalRequiredCredits} TC</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-ink)', fontWeight: 500 }}>
              Tiến độ: {creditPercent}% CTĐT
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
            </span>
          </div>
        </div>

        {/* Curriculum Knowledge Blocks (40% -> col-span-5) */}
        <div className="haui-stat-card" style={{ gridColumn: 'span 5' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em' }}>
                Cấu trúc môn kiến thức
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>Đã tích lũy: {accumulatedCredits}/{totalRequiredCredits} TC</span>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
              Tiến độ hoàn thành các môn kiến thức theo CTĐT ({studentSession?.faculty || 'Đại học Công nghiệp Hà Nội'})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(academicStatus?.knowledgeBlocks && academicStatus.knowledgeBlocks.length > 0 ? academicStatus.knowledgeBlocks : [
                { blockId: 'GEN', name: 'Môn kiến thức đại cương', accumulatedCredits: Math.min(accumulatedCredits, 32), totalCreditsRequired: 32, percentage: Math.min(100, Math.round((accumulatedCredits / 32) * 100)) },
                { blockId: 'CORE', name: 'Môn kiến thức cơ sở ngành', accumulatedCredits: Math.max(0, Math.min(accumulatedCredits - 32, 45)), totalCreditsRequired: 45, percentage: Math.min(100, Math.round((Math.max(0, accumulatedCredits - 32) / 45) * 100)) },
                { blockId: 'SPEC', name: 'Môn kiến thức chuyên ngành bắt buộc', accumulatedCredits: Math.max(0, Math.min(accumulatedCredits - 77, 38)), totalCreditsRequired: 38, percentage: Math.min(100, Math.round((Math.max(0, accumulatedCredits - 77) / 38) * 100)) },
                { blockId: 'ELEC', name: 'Môn kiến thức tự chọn & thực tập', accumulatedCredits: Math.max(0, Math.min(accumulatedCredits - 115, 20)), totalCreditsRequired: 20, percentage: Math.min(100, Math.round((Math.max(0, accumulatedCredits - 115) / 20) * 100)) },
                { blockId: 'GRAD', name: 'Môn kiến thức tốt nghiệp (Đồ án)', accumulatedCredits: 0, totalCreditsRequired: 10, percentage: 0 }
              ]).map((block) => (
                <div key={block.blockId || block.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{block.name}</span>
                    <span style={{ color: block.percentage >= 100 ? 'var(--color-ink)' : 'var(--color-mid-gray)', fontWeight: 600 }}>
                      {block.accumulatedCredits}/{block.totalCreditsRequired} TC ({block.percentage}%)
                    </span>
                  </div>
                  <div className="haui-progress-bar-minimal">
                    <div className="haui-progress-bar-fill" style={{ width: `${Math.min(100, block.percentage || 0)}%` }} />
                  </div>
                </div>
              ))}
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
                Học phần đang theo học
              </h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500, backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                {inProgressCoursesList.length} môn &bull; {inProgressCoursesList.reduce((sum, c) => sum + (Number(c.credits) || 0), 0)} TC
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
              Theo dõi tiến độ điểm đánh giá thành phần và học phần đang đăng ký trong học kỳ
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
          {inProgressCoursesList.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: 'var(--color-surface-alt)', borderRadius: '16px', border: '1px solid var(--color-hairline)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--color-mid-gray)', marginBottom: '8px' }}>school</span>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px' }}>Chưa có dữ liệu học phần đang học</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-mid-gray)', margin: '0 0 16px', maxWidth: '520px', marginInline: 'auto' }}>
                Hiện tại chưa ghi nhận học phần nào đang theo học trong học kỳ này. Khi bạn cập nhật bảng điểm từ cổng sv.haui.edu.vn hoặc đăng ký môn học mới, danh sách sẽ tự động hiển thị tại đây.
              </p>
              <button type="button" className="haui-pill-btn-paper" onClick={() => navigate('/transcript')}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload_file</span>
                <span>Cập nhật bảng điểm</span>
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ color: 'var(--color-mid-gray)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: '#fafafa' }}>
                  <th style={{ padding: '12px 16px', borderRadius: '12px 0 0 12px' }}>Mã &amp; Tên học phần</th>
                  <th style={{ padding: '12px 12px' }}>Tín chỉ</th>
                  <th style={{ padding: '12px 16px' }}>Học kỳ</th>
                  <th style={{ padding: '12px 16px' }}>Đánh giá quá trình</th>
                  <th style={{ padding: '12px 16px' }}>Trạng thái / Lưu ý</th>
                  <th style={{ padding: '12px 12px', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {inProgressCoursesList.map((course) => (
                  <tr key={course.courseCode} style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{course.courseName || course.courseCode}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)', fontFamily: 'var(--font-mono)' }}>{course.courseCode} &bull; {studentSession?.faculty || 'HaUI'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', color: 'var(--color-ink)', fontWeight: 500 }}>{course.credits} TC</td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-mid-gray)' }}>{course.semesterCode || 'Kỳ hiện tại'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', color: 'var(--color-ink)' }}>
                        <span>Quá trình:</span>
                        <strong>{course.score10 !== null && course.score10 !== undefined ? course.score10 : 'Đang cập nhật'}</strong>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                        Đang học
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="haui-sidebar__profile-logout"
                        title="Xem vị trí trên Cây môn học"
                        onClick={() => navigate('/curriculum')}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_tree</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                {academicStatus?.warnings?.length > 0 ? 'Cảnh báo học vụ' : 'Tối ưu hóa học kỳ'}
              </span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--color-mid-gray)' }}>
              {!hasTranscript ? (
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-mid-gray)', marginTop: '2px', flexShrink: 0 }}>info</span>
                  <span>
                    Chưa có dữ liệu bảng điểm cá nhân: Vui lòng nạp bảng điểm từ sv.haui.edu.vn để AI Advisor phân tích tiến độ, phát hiện môn tiên quyết và đề xuất lộ trình tối ưu cho bạn.
                  </span>
                </li>
              ) : academicStatus?.warnings?.length > 0 ? (
                academicStatus.warnings.map((w, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ember, #e7000b)', marginTop: '2px', flexShrink: 0 }}>warning</span>
                    <span style={{ color: 'var(--color-ink)' }}>{w}</span>
                  </li>
                ))
              ) : (
                <>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16a34a', marginTop: '2px', flexShrink: 0 }}>check_circle</span>
                    <span>
                      Tiến độ học tập bình thường: Bạn đã tích lũy <strong style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{accumulatedCredits} / {totalRequiredCredits} tín chỉ</strong> ({creditPercent}% CTĐT) và không có môn nợ học phần.
                    </span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0284c7', marginTop: '2px', flexShrink: 0 }}>trending_up</span>
                    <span>
                      Điểm tích lũy hiện tại đạt <strong style={{ color: 'var(--color-ink)', fontWeight: 600 }}>CPA {cpaValue}</strong>. Hãy duy trì và lập kế hoạch các học kỳ tiếp theo để đạt mục tiêu tốt nghiệp.
                    </span>
                  </li>
                </>
              )}
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
            <span>Lập kế hoạch kỳ tới</span>
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
      <div className="haui-dashboard-detail-grid">
        {/* Khối Môn Nợ Tiên Quyết */}
        <Card
          className="haui-dashboard-panel haui-dashboard-panel--attention"
          title="Học phần Cần lưu ý & Môn nợ Tiên quyết"
          variant="default"
          headerAction={
            !hasTranscript ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas)',
                  color: 'var(--color-mid-gray)',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                Chưa có dữ liệu
              </span>
            ) : failedCoursesList.length > 0 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas)',
                  color: 'var(--color-ink)',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-ink)' }} />
                {failedCoursesList.length} Môn nợ
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas)',
                  color: 'var(--color-ink)',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Không có môn nợ
              </span>
            )
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!hasTranscript ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: 'var(--color-surface-alt)', borderRadius: '16px', border: '1px solid var(--color-hairline)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--color-mid-gray)', marginBottom: '8px' }}>info</span>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px' }}>Chưa có dữ liệu bảng điểm</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-mid-gray)', margin: '0 0 16px', maxWidth: '440px', marginInline: 'auto' }}>
                  Hồ sơ hiện tại chưa có dữ liệu bảng điểm cá nhân. Vui lòng nạp bảng điểm từ cổng sv.haui.edu.vn để hệ thống rà soát môn nợ và môn tiên quyết.
                </p>
                <button type="button" className="haui-pill-btn-paper" onClick={() => navigate('/transcript')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload_file</span>
                  <span>Nạp bảng điểm ngay</span>
                </button>
              </div>
            ) : failedCoursesList.length > 0 ? (
              failedCoursesList.map((fc) => (
                <div
                  key={fc.courseCode}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-hairline)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'gap 8px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--color-canvas)',
                        color: 'var(--color-ink)',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {fc.courseCode}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 600 }}>
                      {fc.credits} Tín chỉ &bull; Điểm {fc.letterGrade || 'F'} · 0.0
                    </span>
                  </div>
                  <strong style={{ fontSize: '15px', color: 'var(--color-ink)' }}>
                    {withoutParentheses(fc.courseName || fc.courseCode)}
                  </strong>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-mid-gray)', lineHeight: 1.5 }}>
                    <strong>Cảnh báo tiên quyết:</strong> Học phần này đang bị điểm F và chặn các môn học tiếp theo. Cần đưa vào Kế hoạch học tập để học lại ngay.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="haui-pill-btn-dark"
                      style={{ fontSize: '13px', padding: '8px 16px' }}
                      onClick={() => navigate('/planner')}
                    >
                      Đưa vào Kế hoạch học kỳ tới &rarr;
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="haui-dashboard-empty-success">
                <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '6px' }}>task_alt</span>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Không có môn nợ học phần</div>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                  Bạn đang hoàn thành tốt tất cả các môn đã học, không có môn nào bị điểm F cần học lại.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Khối Lộ Trình Đề Xuất */}
        <Card
          className="haui-dashboard-panel haui-dashboard-panel--plan"
          title="Lộ trình Học kỳ Kế tiếp Đề xuất"
          variant="default"
          headerAction={
            <button
              type="button"
              className="haui-pill-btn-paper"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => navigate('/planner')}
            >
              Tùy chỉnh lộ trình &rarr;
            </button>
          }
        >
          {nextSemesterPlan && nextSemesterPlan.courses?.length > 0 ? (
            <div className="haui-dashboard-course-list">
              {nextSemesterPlan.courses.map((course) => {
                return (
                  <div
                    key={course.courseCode}
                    className="haui-dashboard-course-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-surface-alt)',
                      border: '1px solid var(--color-hairline)',
                      fontSize: '13px',
                      transition: 'all 150ms'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: 'var(--color-canvas)',
                          color: 'var(--color-ink)'
                        }}
                      >
                        {course.courseCode}
                      </span>
                      <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{withoutParentheses(course.courseName || course.name)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>{withoutParentheses(course.courseType || course.type || 'Kế hoạch')}</span>
                      <strong style={{ fontSize: '12px', color: 'var(--color-ink)' }}>{course.credits} TC</strong>
                    </div>
                  </div>
                );
              })}

              <div
                className="haui-dashboard-credit-total"
                style={{
                  marginTop: '4px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-canvas)',
                  border: '1px solid var(--color-hairline)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-ink)'
                }}
              >
                <span>Tổng số tín chỉ đề xuất kỳ tới:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ink)' }}>check_circle</span>
                  <span>{nextSemesterPlan.totalCredits} Tín chỉ · Hợp lệ BR-03: 10 - 24 TC</span>
                </span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: 'var(--color-surface-alt)', borderRadius: '16px', border: '1px solid var(--color-hairline)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--color-mid-gray)', marginBottom: '8px' }}>calendar_month</span>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px' }}>Chưa có lộ trình học kỳ kế tiếp</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-mid-gray)', margin: '0 0 16px', maxWidth: '440px', marginInline: 'auto' }}>
                Hệ thống chưa tìm thấy kế hoạch học tập cho học kỳ tới. Nhấn nút bên dưới để tạo phương án kế hoạch học tập tối ưu theo quy chế HaUI.
              </p>
              <button type="button" className="haui-pill-btn-dark" onClick={() => navigate('/planner')}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_add_on</span>
                <span>Lập kế hoạch kỳ tới ngay</span>
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* SECTION 7: TIẾN ĐỘ HỌC VỤ & KẾ HOẠCH HỌC TẬP ĐÃ LƯU (Task 3.9) */}
      <Card
        className="haui-dashboard-panel haui-dashboard-panel--overview"
        title="Tiến độ Học vụ & Kế hoạch Học tập Đã lưu"
        subtitle="Theo dõi tiến độ tích lũy thực tế và kế hoạch học tập đã đăng ký/lưu trữ gần nhất"
        variant="default"
        headerAction={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="haui-pill-btn-paper"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => navigate('/audit')}
              title="Mở bảng kiểm toán tốt nghiệp và in báo cáo"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>school</span>
              <span>{'Kiểm toán Tốt nghiệp & Báo cáo in'}</span>
            </button>
            <button
              type="button"
              className="haui-pill-btn-dark"
              style={{ fontSize: '12px', padding: '6px 16px' }}
              onClick={() => navigate(`/planner?plan_id=${activePlanEntry?.planId || 'plan-2026-9001'}`)}
              title="Mở kế hoạch học tập cũ đã lưu trên hệ thống"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>folder_open</span>
              <span>Mở Kế hoạch Học tập Đã lưu &rarr;</span>
            </button>
          </div>
        }
      >
        <div className="haui-dashboard-summary-grid">
          <div
            className="haui-dashboard-summary-card"
            style={{
              padding: '18px',
              backgroundColor: 'var(--color-surface-alt)',
              borderRadius: '16px',
              border: '1px solid var(--color-hairline)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--color-mid-gray)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              KẾ HOẠCH HỌC TẬP GẦN NHẤT
            </div>
            {activePlanEntry ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <strong style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                    {activePlanEntry.planId || 'plan-2026-9001'}
                  </strong>
                  <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, backgroundColor: activePlanEntry.status === 'ACTIVE' ? 'var(--color-ink)' : '#e0f2fe', color: activePlanEntry.status === 'ACTIVE' ? 'var(--color-paper)' : '#0369a1' }}>
                    {activePlanEntry.status || 'ACTIVE'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                  {withoutParentheses(activePlanEntry.name || 'Kế hoạch học tập')} &bull; {activePlanEntry.totalCredits || 18} tín chỉ &bull; {activePlanEntry.updatedAt || 'Vừa xong'}
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '4px' }}>
                  Chưa có kế hoạch đã lưu
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)', marginTop: '2px' }}>
                  Bạn chưa lưu bản kế hoạch nào trên hệ thống.
                </div>
              </div>
            )}
          </div>

          <div
            className="haui-dashboard-summary-card"
            style={{
              padding: '18px',
              backgroundColor: 'var(--color-surface-alt)',
              borderRadius: '16px',
              border: '1px solid var(--color-hairline)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--color-mid-gray)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TIẾN ĐỘ KIỂM TOÁN TỐT NGHIỆP
            </div>
            {hasTranscript && auditData?.checklist ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <strong style={{ fontSize: '18px', color: 'var(--color-ink)' }}>
                    {auditData.completedPercentage ?? 0}% Hoàn thành
                  </strong>
                  <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                    {auditData.checklist.filter((c) => c.completed).length}/{auditData.checklist.length} Đạt
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {auditData.eligibleForGraduation ? (
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Đủ điều kiện tốt nghiệp</span>
                  ) : (
                    <>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-ember)' }} />
                      <span>Còn {auditData.checklist.filter((c) => !c.completed).length} điều kiện cần bù đắp</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '4px' }}>
                  Chưa có dữ liệu kiểm toán
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)', marginTop: '2px' }}>
                  Vui lòng nạp bảng điểm để kích hoạt kiểm toán tốt nghiệp.
                </div>
              </div>
            )}
          </div>

          <div
            className="haui-dashboard-summary-card"
            style={{
              padding: '18px',
              backgroundColor: 'var(--color-surface-alt)',
              borderRadius: '16px',
              border: '1px solid var(--color-hairline)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--color-mid-gray)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              BÁO CÁO HỌC VỤ &amp; IN ẤN
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-mid-gray)' }}>
              Hỗ trợ xuất PDF chuẩn A4 · Thực tế &bull; Dự kiến
            </div>
            <div style={{ marginTop: '4px' }}>
              <button
                type="button"
                className="haui-pill-btn-paper"
                style={{ fontSize: '12px', padding: '6px 14px', width: 'fit-content' }}
                onClick={() => navigate('/audit')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
                <span>Xuất Báo Cáo Học Vụ &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal Luồng phụ A: Nhập & Đồng bộ Bảng điểm (FR-02 / AC-01) */}
      <Modal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        size="lg"
        title="Nhập & Đồng bộ Bảng điểm từ e-HaUI"
        subtitle="Bước A1 → A4: Tải file PDF/Ảnh bảng điểm e-HaUI, tự động bóc tách môn học & kiểm tra hợp lệ trước khi lưu"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsIngestModalOpen(false)}>
              Đóng
            </Button>
            {ingestResult && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIngestConfirmed(true)}
              >
                {ingestConfirmed ? 'Đã xác nhận lưu dữ liệu' : 'Bước A4: Xác nhận lưu dữ liệu'}
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
              Tải file PDF bảng điểm
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
              Mô phỏng lỗi định dạng file (Mục 5 Edge Case)
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
              Đã lưu bảng điểm. Hệ thống đã cập nhật CPA và phát hiện một môn nợ tiên quyết: MATH1002.
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
                        PASSED: { cls: 'haui-badge--success', text: 'Đạt' },
                        PASSED_LOW: { cls: 'haui-badge--warning', text: 'Điểm D/D+' },
                        FAILED: { cls: 'haui-badge--error', text: 'Nợ môn' },
                        IN_PROGRESS: { cls: 'haui-badge--info', text: 'Đang học' }
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
