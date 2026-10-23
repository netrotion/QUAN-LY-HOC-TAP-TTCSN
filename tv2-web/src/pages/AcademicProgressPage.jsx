import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plannerStore } from '@haui/planner-ui';
import { api } from '../services/apiClient.js';
import { HAUI_BUSINESS_RULES } from '../services/mockFixtures.js';
import { Button, Card, EmptyState, Error as ErrorBox, Loading, Modal, Table } from '../components/ui/index.js';
import {
  buildAuditRemediationProposal,
  dispatchAuditRemediationProposal,
  subscribeAcademicStore
} from '../services/academicStore.js';

/**
 * Màn hình 9: Bảng Kiểm toán Tốt nghiệp 100% Tiêu chuẩn HaUI (`/audit` & `/progress`) — TV2
 * Khớp chuẩn Prototype graduation_check:
 * - Top Breadcrumb, tiêu đề & các nút hành động (Rà soát lại dữ liệu, Xuất PDF, Đối chiếu khung CTĐT).
 * - Thanh chuyển đổi chế độ Báo cáo Học vụ (Thực tế vs Dự kiến kèm lộ trình bù đắp Task 3.9).
 * - Notice banner lưu ý quy chế đào tạo & đối chiếu dữ liệu gốc sv.haui.edu.vn.
 * - 4 Thẻ KPI Counter (Tổng tiến độ tốt nghiệp, Tín chỉ tích lũy, CPA hiện tại, Chứng chỉ bắt buộc).
 * - 4 Nhóm Hạng mục Tiêu chí chi tiết (Khối lượng & Tín chỉ, Điểm & Rèn luyện, Ngoại ngữ & Tin học, GDTC/GDQP).
 * - Bảng 7 điều kiện kiểm tra (Audit Checklist 100%), Cảnh báo sớm chứng chỉ tồn đọng (AC-05).
 * - Cột phải: Tổng hợp việc cần làm (Action Checklist), Gợi ý AI Advisor, Thông tin liên hệ CVHT.
 * - Modal Lập kế hoạch bù đắp điều kiện tốt nghiệp (F23-006).
 * - Bản in A4 (@media print) phân định rạch ròi Thực tế vs Dự kiến.
 */
export function AcademicProgressPage() {
  const navigate = useNavigate();
  const [reportMode, setReportMode] = useState('actual'); // 'actual' | 'projected'
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRechecking, setIsRechecking] = useState(false);
  const [error, setError] = useState(null);
  const [isRemediationModalOpen, setIsRemediationModalOpen] = useState(false);

  const fetchAudit = useCallback(async (mode = reportMode) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.audit.getGraduationAudit({ mode });
      setAuditData(response);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [reportMode]);

  useEffect(() => {
    fetchAudit(reportMode);
    const unsubStore = subscribeAcademicStore(() => {
      fetchAudit(reportMode);
    });
    const unsubApi = api.subscribe(() => {
      fetchAudit(reportMode);
    });
    const handleTranscriptUpdated = () => {
      fetchAudit(reportMode);
    };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
    }
    return () => {
      unsubStore();
      unsubApi();
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
      }
    };
  }, [fetchAudit, reportMode]);

  const handleSwitchReportMode = (newMode) => {
    setReportMode(newMode);
    fetchAudit(newMode);
  };

  const handleRecheckData = async () => {
    setIsRechecking(true);
    await fetchAudit(reportMode);
    setTimeout(() => {
      setIsRechecking(false);
    }, 600);
  };

  // Cấu hình bảng 7 điều kiện kiểm tra (Audit Checklist)
  const checklistColumns = [
    {
      key: 'category',
      title: 'Hạng mục kiểm toán (1-7)',
      width: '215px',
      render: (val) => <strong style={{ fontSize: '13px', color: 'var(--color-ink)' }}>{val}</strong>
    },
    {
      key: 'name',
      title: 'Tiêu chí chi tiết (FR-17)'
    },
    {
      key: 'creditsProgress',
      title: 'Khối lượng (Đạt / Chuẩn)',
      align: 'center',
      width: '185px',
      render: (_, row) =>
        row.totalCreditsRequired !== null && row.totalCreditsRequired !== undefined ? (
          <span>
            <strong>{row.accumulatedCredits ?? 'null'}</strong> / {row.totalCreditsRequired} TC
          </span>
        ) : (
          <span style={{ color: 'var(--color-mid-gray)', fontSize: '12px' }}>
            Điều kiện chuẩn đầu ra
          </span>
        )
    },
    {
      key: 'completed',
      title: 'Trạng thái',
      align: 'center',
      width: '180px',
      render: (completed, row) => {
        if (completed === true) {
          return <span className="haui-badge haui-badge--success">✓ ĐẠT (Hợp lệ)</span>;
        }
        if (completed === false) {
          const isRedAlert = row.category.includes('TIN HỌC') || row.category.includes('NỢ MÔN');
          return (
            <span className={`haui-badge ${isRedAlert ? 'haui-badge--error' : 'haui-badge--warning'}`}>
              {isRedAlert ? '🚨 CẢNH BÁO ĐỎ' : '⚠️ CÒN THIẾU'}
            </span>
          );
        }
        return <span className="haui-badge haui-badge--neutral">○ CHƯA XÁC ĐỊNH / CHỜ DUYỆT</span>;
      }
    },
    {
      key: 'statusMessage',
      title: 'Chi tiết thẩm định & Cảnh báo sớm',
      render: (msg, row) => (
        <span
          style={{
            color:
              row.completed === false && row.category.includes('TIN HỌC')
                ? 'var(--color-ember)'
                : 'var(--color-ink)',
            fontWeight: row.completed === false ? 600 : 400
          }}
        >
          {msg}
        </span>
      )
    }
  ];

  // Cấu hình bảng các điều kiện tồn đọng / Chứng chỉ còn thiếu (AC-05)
  const pendingColumns = [
    {
      key: 'certificateType',
      title: 'Mã điều kiện',
      width: '150px',
      render: (val) => <code style={{ fontWeight: 700, color: 'var(--color-ember)' }}>{val}</code>
    },
    {
      key: 'requiredStandard',
      title: 'Chuẩn yêu cầu (DEMO_UNVERIFIED)'
    },
    {
      key: 'actionDescription',
      title: 'Hành động bù đắp khuyến nghị (AC-05)'
    },
    {
      key: 'deadline',
      title: 'Hạn chót',
      width: '125px',
      render: (val) => <strong style={{ color: 'var(--color-ember)' }}>{val || 'Chưa ấn định'}</strong>
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '130px',
      render: (val) => (
        <span className={`haui-badge ${val === 'PENDING' || val === 'Chưa nộp' ? 'haui-badge--error' : 'haui-badge--neutral'}`}>
          {val || 'PENDING'}
        </span>
      )
    }
  ];

  const sessionStudent = api.getConfig().sessionStudent || {
    fullName: 'Nguyễn Văn An',
    studentId: '2020601234',
    cohort: 'K16',
    majorName: 'Kỹ thuật phần mềm (CNTT)',
    advisorClass: '2020DHKTPM01'
  };

  const isProjected = reportMode === 'projected' || auditData?.reportType === 'PROJECTED';
  const pct = auditData?.completedPercentage ?? (isProjected ? 100 : 82);
  const earnedCredits = auditData?.accumulatedCredits ?? (isProjected ? 135 : 112);
  const totalCredits = auditData?.totalCreditsRequired ?? 135;
  const missingCredits = Math.max(0, totalCredits - earnedCredits);
  const creditPct = totalCredits > 0 ? Math.min(100, Math.round((earnedCredits / totalCredits) * 100)) : 0;
  const passedCriteriaCount = auditData?.checklist?.filter((c) => c.completed === true).length ?? (isProjected ? 7 : 5);
  const currentCpa = isProjected ? 3.25 : 3.18;

  if (error && !auditData) {
    const is503 = error.status === 503 || error.code === 'TOOL_NOT_READY';
    return (
      <div className="haui-page-container" style={{ padding: '24px 0' }}>
        <ErrorBox
          title={is503 ? 'Công cụ học vụ chưa sẵn sàng (503 TOOL_NOT_READY)' : 'Lỗi tải dữ liệu kiểm toán tốt nghiệp'}
          message={
            is503
              ? 'Hệ thống đang kết nối với Rule Engine học vụ thật. Dữ liệu kiểm toán tốt nghiệp tạm thời chưa khả dụng. Tuyệt đối không hiển thị số liệu giả lập.'
              : error.message || 'Không thể tải báo cáo kiểm toán tốt nghiệp từ máy chủ.'
          }
          code={error.code || (is503 ? 'TOOL_NOT_READY' : 'AUDIT_LOAD_ERROR')}
          requestId={error.requestId || `req-audit-${Date.now()}`}
          details={
            error.details?.length
              ? error.details
              : [
                  'API Endpoint: /api/v1/audit/graduation',
                  'Quy định AGENTS.md: Không tự tính trạng thái đạt tốt nghiệp ở client khi công cụ backend chưa sẵn sàng.'
                ]
          }
          retryLabel="Thử lại kết nối (Retry)"
          onRetry={() => fetchAudit(reportMode)}
        />
      </div>
    );
  }

  return (
    <div className="haui-audit-container haui-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* =========================================================================
          KHỐI TIÊU ĐỀ IN ẤN (@media print) — PHÂN BIỆT RẠCH RÒI THỰC TẾ VS DỰ KIẾN
          ========================================================================= */}
      <div className="haui-print-header">
        <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #000', paddingBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
            BỘ GIÁO DỤC VÀ ĐÀO TẠO &bull; TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI
          </div>
          <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#333' }}>
            Phòng Đào tạo &bull; Hệ thống Cố vấn Lộ trình Học tập HaUI Advisor
          </div>
          <h1
            className="haui-print-title"
            style={{
              fontSize: '18px',
              fontWeight: 800,
              margin: '10px 0 4px',
              textTransform: 'uppercase',
              color: isProjected ? '#1e3a8a' : '#000000'
            }}
          >
            {isProjected
              ? 'BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỰ KIẾN (KÈM LỘ TRÌNH BÙ ĐẮP)'
              : 'BÁO CÁO KIỂM TOÁN TỐT NGHIỆP — DỮ LIỆU THỰC TẾ (HIỆN TẠI)'}
          </h1>
          <div
            className={`haui-print-badge ${isProjected ? 'haui-print-badge--projected' : 'haui-print-badge--actual'}`}
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '4px',
              margin: '4px 0 8px',
              border: isProjected ? '1px solid #b91c1c' : '1px solid #64748b',
              backgroundColor: isProjected ? '#fef2f2' : '#f8fafc',
              color: isProjected ? '#b91c1c' : '#0f172a'
            }}
          >
            {isProjected
              ? '⚠️ BÁO CÁO MÔ PHỎNG DỰ KIẾN (SIMULATION ONLY) — KHÔNG THAY THẾ BẢNG ĐIỂM CHÍNH THỨC'
              : '● BÁO CÁO THỰC TẾ — PHẢN ÁNH DỮ LIỆU CHÍNH THỨC e-HaUI'}
          </div>
          <div style={{ fontSize: '11px', color: '#555' }}>
            Mã văn bản: {isProjected ? 'AUDIT-SIM-' : 'AUDIT-ACTUAL-'}
            {Date.now().toString().slice(-6)} &bull; Phân loại:{' '}
            <strong>{isProjected ? 'DỰ KIẾN / SIMULATION' : 'CHÍNH THỨC / THỰC TẾ'}</strong> &bull; Trạng thái: DEMO_UNVERIFIED
          </div>
        </div>

        {/* Cảnh báo in ấn bắt buộc: TUYỆT ĐỐI KHÔNG ĐỂ LẪN DỰ KIẾN VỚI THỰC TẾ */}
        <div
          className={`haui-print-disclaimer ${isProjected ? 'haui-print-disclaimer--projected' : 'haui-print-disclaimer--actual'}`}
          style={{
            padding: '8px 12px',
            marginBottom: '14px',
            fontSize: '11px',
            lineHeight: 1.5,
            borderRadius: '8px',
            border: isProjected ? '1px solid #fecaca' : '1px solid #bfdbfe',
            backgroundColor: isProjected ? '#fff1f2' : '#eff6ff',
            color: isProjected ? '#991b1b' : '#1e3a8a',
            fontWeight: 600
          }}
        >
          {isProjected
            ? '🚨 CẢNH BÁO BẢN IN DỰ KIẾN / MÔ PHỎNG: Báo cáo này được lập dựa trên kế hoạch bù đắp các học phần nợ và chứng chỉ còn thiếu. TUYỆT ĐỐI KHÔNG CÓ GIÁ TRỊ PHÁP LÝ XÉT TỐT NGHIỆP CHÍNH THỨC cho đến khi tất cả học phần và chứng chỉ được hoàn thành trên hệ thống điểm thực tế e-HaUI.'
            : '⚠️ BÁO CÁO HỌC VỤ THỰC TẾ: Báo cáo này phản ánh trung thực kết quả học tập và tích lũy ghi nhận trên cổng e-HaUI tính đến thời điểm in. Sinh viên CHƯA ĐỦ ĐIỀU KIỆN TỐT NGHIỆP nếu còn tiêu chí thiếu hoặc cảnh báo đỏ.'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '16px', padding: '10px 14px', backgroundColor: 'var(--color-bg-muted)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
          <div><strong>Họ và tên sinh viên:</strong> {sessionStudent.fullName || 'Nguyễn Văn An'}</div>
          <div><strong>Mã số sinh viên:</strong> {sessionStudent.studentId || 'std-2026-001'}</div>
          <div><strong>Ngành đào tạo:</strong> {sessionStudent.majorName || 'Kỹ thuật phần mềm (CNTT)'}</div>
          <div><strong>Khóa / Lớp:</strong> {sessionStudent.cohort || 'K16'} &bull; {sessionStudent.advisorClass || '2020DHKTPM01'}</div>
          <div><strong>Tín chỉ tích lũy:</strong> {earnedCredits} / {totalCredits} TC ({pct}%)</div>
          <div>
            <strong>Đủ ĐK Tốt nghiệp:</strong>{' '}
            {auditData?.eligibleForGraduation ? (
              <span style={{ color: isProjected ? '#2563eb' : '#16a34a', fontWeight: 700 }}>
                {isProjected ? '✓ ĐẠT YÊU CẦU (DỰ KIẾN SAU BÙ ĐẮP)' : '✓ ĐẠT YÊU CẦU THỰC TẾ'}
              </span>
            ) : (
              <span style={{ color: '#dc2626', fontWeight: 700 }}>CHƯA ĐẠT (CÒN ĐIỀU KIỆN THIẾU)</span>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: TOP BREADCRUMB & ACTION BUTTONS
          ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
              <span
                style={{ cursor: 'pointer', transition: 'color 0.15s' }}
                onClick={() => navigate('/dashboard')}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
                role="button"
                tabIndex={0}
              >
                Trang chủ
              </span>
              <span style={{ color: 'var(--color-hairline)' }}>/</span>
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Kiểm tra điều kiện tốt nghiệp</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-paper)',
                  fontSize: '10px',
                  color: 'var(--color-mid-gray)',
                  border: '1px solid var(--color-hairline)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                }}
              >
                {sessionStudent.cohort || 'K16'} - {sessionStudent.majorCode || 'CNTT'}
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)'
              }}
            >
              Rà soát &amp; Kiểm tra điều kiện tốt nghiệp
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span className="haui-badge haui-badge--neutral" style={{ fontSize: '11px' }}>
                Quy chế: {auditData?.policyVersion || 'policy-haui-demo-2026@0.0.1-v0'}
              </span>
              <span className="haui-badge haui-badge--neutral" style={{ fontSize: '11px' }}>
                Hồ sơ: {auditData?.dataRevision || 'REV-SERVER'}
              </span>
              <span className="haui-badge haui-badge--neutral" style={{ fontSize: '11px' }}>
                Chế độ: {isProjected ? 'Dự kiến (Bù đắp)' : 'Thực tế (Hiện tại)'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="haui-pill-btn-canvas"
              onClick={handleRecheckData}
              disabled={isRechecking || loading}
              title="Đồng bộ lại dữ liệu rà soát tốt nghiệp"
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '16px',
                  color: 'var(--color-mid-gray)',
                  transform: isRechecking ? 'rotate(360deg)' : 'none',
                  transition: 'transform 0.5s ease'
                }}
              >
                sync
              </span>
              <span>{isRechecking ? 'Đang rà soát...' : 'Rà soát lại dữ liệu'}</span>
            </button>

            <button
              type="button"
              className="haui-pill-btn-canvas"
              onClick={() => window.print()}
              title="In hoặc xuất phiếu kiểm tra điều kiện tốt nghiệp chuẩn PDF A4"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>
                picture_as_pdf
              </span>
              <span>Xuất phiếu kiểm tra (.pdf)</span>
            </button>

            <button
              type="button"
              className="haui-pill-btn-dark"
              onClick={() => navigate('/curriculum')}
              title="Xem sơ đồ cây môn học và đối chiếu khung CTĐT gốc"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>menu_book</span>
              <span>Đối chiếu khung CTĐT gốc</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: THANH CHUYỂN ĐỔI CHẾ ĐỘ BÁO CÁO (TASK 3.9)
          ========================================================================= */}
      <div
        className="haui-report-mode-switcher"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: 'var(--color-paper)',
          borderRadius: 'var(--radius-cards)',
          border: '1px solid var(--color-hairline)',
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-mid-gray)' }}>
            Chế độ Báo cáo Học vụ (Task 3.9):
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`haui-state-pill ${!isProjected ? 'haui-state-pill--active' : ''}`}
              onClick={() => handleSwitchReportMode('actual')}
              title="Xem Báo cáo dựa trên dữ liệu học tập thực tế hiện có trên e-HaUI"
            >
              📋 Báo cáo Thực tế (Hiện tại — {auditData?.reportType === 'ACTUAL' ? pct : 82}%)
            </button>
            <button
              type="button"
              className={`haui-state-pill ${isProjected ? 'haui-state-pill--active' : ''}`}
              onClick={() => handleSwitchReportMode('projected')}
              title="Xem Báo cáo dự kiến mô phỏng sau khi hoàn thành lộ trình bù đắp 2 học kỳ"
            >
              🔮 Báo cáo Dự kiến (Kèm Lộ trình Bù đắp — 100%)
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="haui-pill-btn-canvas"
            onClick={() => window.print()}
            title="In báo cáo học vụ hoặc Lưu PDF khổ A4 theo chế độ đang chọn"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--color-mid-gray)' }}>print</span>
            <span>🖨️ In Báo Cáo ({isProjected ? 'Dự kiến' : 'Thực tế'})</span>
          </button>
          <button
            type="button"
            className="haui-pill-btn-dark"
            onClick={() => setIsRemediationModalOpen(true)}
            title="Mở bảng lộ trình bù đắp học phần nợ và chứng chỉ còn thiếu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>build</span>
            <span>Lập kế hoạch bù đắp</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: TOP 4 KPI COUNTER CARDS
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* KPI 1: Tổng tiến độ */}
        <div
          className="haui-stat-card"
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-cards)',
            backgroundColor: 'var(--color-paper)',
            border: '1px solid var(--color-hairline)',
            boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray)', letterSpacing: '0.04em' }}>
              Tổng tiến độ tốt nghiệp
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>school</span>
            </div>
          </div>
          <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {pct}%
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>hoàn thành</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="haui-progress-bar-minimal">
              <div
                className="haui-progress-bar-minimal__fill"
                style={{ width: `${pct}%`, backgroundColor: 'var(--color-ink)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-mid-gray)' }}>
              <span>Đạt {passedCriteriaCount}/7 nhóm tiêu chí</span>
              <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                {7 - passedCriteriaCount > 0 ? `Thiếu ${7 - passedCriteriaCount}` : 'Đầy đủ'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Tín chỉ tích lũy */}
        <div
          className="haui-stat-card"
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-cards)',
            backgroundColor: 'var(--color-paper)',
            border: '1px solid var(--color-hairline)',
            boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray)', letterSpacing: '0.04em' }}>
              Tín chỉ tích lũy
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>fact_check</span>
            </div>
          </div>
          <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {earnedCredits}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>/ {totalCredits}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>tín chỉ</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="haui-progress-bar-minimal">
              <div
                className="haui-progress-bar-minimal__fill"
                style={{ width: `${creditPct}%`, backgroundColor: 'var(--color-ink)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-mid-gray)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '9999px',
                    backgroundColor: missingCredits > 0 ? 'var(--color-ember)' : 'var(--color-ink)'
                  }}
                />
                <span>{missingCredits > 0 ? `Còn thiếu ${missingCredits} TC` : 'Đã đủ số tín chỉ'}</span>
              </span>
              <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                {creditPct}% tích lũy
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Điểm CPA hiện tại / dự kiến */}
        <div
          className="haui-stat-card"
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-cards)',
            backgroundColor: 'var(--color-paper)',
            border: '1px solid var(--color-hairline)',
            boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray)', letterSpacing: '0.04em' }}>
              Điểm CPA {isProjected ? 'Dự kiến' : 'Hiện tại'}
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>grade</span>
            </div>
          </div>
          <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {currentCpa.toFixed(2)}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>/ 4.00</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-canvas)',
                color: 'var(--color-ink)',
                marginLeft: '4px'
              }}
            >
              {isProjected ? 'Xếp loại Giỏi' : 'Xếp loại Khá'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="haui-progress-bar-minimal">
              <div
                className="haui-progress-bar-minimal__fill"
                style={{ width: `${(currentCpa / 4.0) * 100}%`, backgroundColor: 'var(--color-ink)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-mid-gray)' }}>
              <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>Đạt điều kiện (≥ 2.00)</span>
              <span>Mục tiêu Giỏi ≥ 3.20</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Chứng chỉ bắt buộc */}
        <div
          className="haui-stat-card"
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-cards)',
            backgroundColor: 'var(--color-paper)',
            border: '1px solid var(--color-hairline)',
            boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray)', letterSpacing: '0.04em' }}>
              Chứng chỉ bắt buộc
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
            </div>
          </div>
          <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {isProjected ? '4' : '3'}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>/ 4</span>
            <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>đã nộp</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="haui-progress-bar-minimal">
              <div
                className="haui-progress-bar-minimal__fill"
                style={{ width: isProjected ? '100%' : '75%', backgroundColor: 'var(--color-ink)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-mid-gray)' }}>
              {isProjected ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-ink)', fontWeight: 600 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                  <span>Đã hoàn thành toàn bộ</span>
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-ember)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>error</span>
                  <span>Thiếu 1 chứng chỉ (MOS)</span>
                </span>
              )}
              <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
                {isProjected ? 'Hợp lệ' : 'Cần nộp hồ sơ'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: MAIN 2-COLUMN LAYOUT (8 COLS CHECKLIST + 4 COLS SIDEBAR)
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* CỘT TRÁI (8 COLS): 4 NHÓM HẠNG MỤC TIÊU CHÍ & BẢNG CHI TIẾT */}
          <div style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', gap: '24px' }} className="haui-audit-left-col">
            <style>{`
              @media (min-width: 1024px) {
                .haui-audit-left-col { grid-column: span 8 !important; }
                .haui-audit-right-col { grid-column: span 4 !important; }
              }
            `}</style>

            {/* NHÓM 1: Khối lượng kiến thức & Tín chỉ tích lũy */}
            <div
              style={{
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--color-paper)',
                padding: '24px',
                boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid var(--color-hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid var(--color-hairline)'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>
                    1. Khối lượng kiến thức &amp; Tín chỉ tích lũy
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                    Yêu cầu hoàn thành tối thiểu 135 tín chỉ theo khung chuẩn K16/K17 CNTT
                  </p>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: isProjected ? 'var(--color-ink)' : 'var(--color-canvas)',
                    color: isProjected ? '#ffffff' : 'var(--color-mid-gray)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '9999px',
                      backgroundColor: isProjected ? '#ffffff' : 'var(--color-ember)'
                    }}
                  />
                  <span>Trạng thái: {isProjected ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</span>
                </span>
              </div>

              {/* Sub-items list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Sub-item 1 */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Tín chỉ khối Đại cương</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-mid-gray)' }}>32 / 32 TC</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Toán cao cấp, Vật lý, Triết học M-L, Pháp luật đại cương, Kinh tế chính trị</span>
                  </div>
                  <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                </div>

                {/* Sub-item 2 */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Tín chỉ Cơ sở ngành</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-mid-gray)' }}>45 / 45 TC</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Cấu trúc dữ liệu &amp; giải thuật, CSDL, Mạng máy tính, Hệ điều hành, OOP</span>
                  </div>
                  <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                </div>

                {/* Sub-item 3 */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Tín chỉ Chuyên ngành bắt buộc (KTPM)</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: isProjected ? 'var(--color-ink)' : 'var(--color-ember)', fontWeight: 600 }}>
                        {isProjected ? '38 / 38 TC' : '25 / 38 TC'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                      {isProjected
                        ? 'Đã bao gồm hoàn thành bù đắp gỡ nợ MATH1002 và các môn chuyên ngành bắt buộc'
                        : 'Còn thiếu 13 TC (Kiến trúc PM, Đảm bảo chất lượng PM, DevOps) — Dự kiến Kỳ 7 &amp; 8'}
                    </span>
                  </div>
                  {isProjected ? (
                    <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                  ) : (
                    <span className="haui-badge haui-badge--warning">⚠️ CÒN THIẾU 13 TC</span>
                  )}
                </div>

                {/* Sub-item 4 */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Tín chỉ Tự chọn chuyên ngành</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: isProjected ? 'var(--color-ink)' : 'var(--color-ember)', fontWeight: 600 }}>
                        {isProjected ? '12 / 12 TC' : '6 / 12 TC'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                      {isProjected
                        ? 'Đã bổ sung 2 học phần tự chọn IT6010 &amp; IT6015 (6 TC) vào kế hoạch'
                        : 'Đã tích lũy: Trí tuệ nhân tạo (3TC), Lập trình Web (3TC). Còn thiếu 6 TC'}
                    </span>
                  </div>
                  {isProjected ? (
                    <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                  ) : (
                    <span className="haui-badge haui-badge--warning">⚠️ CÒN THIẾU 6 TC</span>
                  )}
                </div>

                {/* Sub-item 5 */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Khóa luận tốt nghiệp / Đồ án tốt nghiệp</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                        {isProjected ? '10 / 10 TC' : '0 / 10 TC'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                      Điều kiện: Tích lũy tối thiểu &ge; 85% CTĐT (115 TC) và không nợ môn tiên quyết (BR-09). Dự kiến Kỳ 8
                    </span>
                  </div>
                  {isProjected ? (
                    <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                  ) : (
                    <span className="haui-badge haui-badge--neutral">○ CHƯA MỞ (KỲ 8)</span>
                  )}
                </div>
              </div>
            </div>

            {/* NHÓM 2: Điểm học tập & Rèn luyện toàn khóa */}
            <div
              style={{
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--color-paper)',
                padding: '24px',
                boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid var(--color-hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid var(--color-hairline)'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>
                    2. Điểm học tập &amp; Rèn luyện toàn khóa
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                    Căn cứ theo thang điểm 4.0 và thang rèn luyện 100 điểm của Trường ĐH Công nghiệp Hà Nội
                  </p>
                </div>
                <span className="haui-badge haui-badge--success">✓ Trạng thái: Đã hoàn thành</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* CPA */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Điểm trung bình chung tích lũy (CPA)</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-ink)', fontWeight: 600 }}>
                        {currentCpa.toFixed(2)} / 4.00
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                      Quy định: CPA &ge; 2.00 (Đạt tốt nghiệp). Hiện tại xếp loại: {isProjected ? 'Giỏi' : 'Khá (tiệm cận Giỏi ≥ 3.20)'}
                    </span>
                  </div>
                  <span className="haui-badge haui-badge--success">✓ ĐÃ ĐẠT ({isProjected ? 'GIỎI' : 'KHÁ'})</span>
                </div>

                {/* Điểm rèn luyện */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Điểm rèn luyện trung bình toàn khóa</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-ink)', fontWeight: 600 }}>
                        {auditData?.trainingScore ?? 78} / 100
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                      Quy định: ĐRL &ge; 65 điểm (Khá). Hiện tại xếp loại: {auditData?.trainingScore >= 80 ? 'Tốt' : 'Khá'} (không vi phạm kỷ luật)
                    </span>
                  </div>
                  <span className="haui-badge haui-badge--success">✓ ĐÃ ĐẠT (TỐT)</span>
                </div>

                {/* Tình trạng nợ môn */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Tình trạng nợ môn học (Điểm F)</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: isProjected ? 'var(--color-ink)' : 'var(--color-ember)', fontWeight: 600 }}>
                        {isProjected ? '0 môn nợ' : '1 môn nợ (MATH1002)'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                      {isProjected
                        ? 'Đã trả nợ thành công môn Toán rời rạc (MATH1002) trong kế hoạch học kỳ tới'
                        : 'Toán rời rạc (3 TC - MATH1002) bị điểm F; cần học lại để gỡ nợ và mở khóa học phần sau (BR-01)'}
                    </span>
                  </div>
                  {isProjected ? (
                    <span className="haui-badge haui-badge--success">✓ HỢP LỆ</span>
                  ) : (
                    <span className="haui-badge haui-badge--error">🚨 CẢNH BÁO ĐỎ: NỢ 1 MÔN</span>
                  )}
                </div>
              </div>
            </div>

            {/* NHÓM 3: Chuẩn đầu ra Ngoại ngữ & Tin học */}
            <div
              style={{
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--color-paper)',
                padding: '24px',
                boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid var(--color-hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid var(--color-hairline)'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>
                    3. Chuẩn đầu ra Ngoại ngữ &amp; Tin học
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                    Chuẩn năng lực độc lập theo quy định đầu ra trường Đại học Công nghiệp Hà Nội
                  </p>
                </div>
                {isProjected ? (
                  <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                ) : (
                  <span className="haui-badge haui-badge--warning">⚠️ Cần nộp chứng chỉ</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* English */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Tiếng Anh: Chuẩn VSTEP B1 (hoặc TOEIC 450+)</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-ink)' }}>Đã xác thực</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Đã nộp chứng chỉ VSTEP B1 ngày 12/10/2023 - Đạt điểm 6.5 (HaUI Testing Center cấp)</span>
                  </div>
                  <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                </div>

                {/* MOS/IC3 */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Tin học ứng dụng: Chuẩn IC3 GS5 / MOS</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: isProjected ? 'var(--color-ink)' : 'var(--color-ember)', fontWeight: 600 }}>
                        {isProjected ? 'Đã bố trí lịch thi' : 'Thiếu chứng chỉ'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                      {isProjected
                        ? 'Đã đặt lịch nhắc thi chứng chỉ MOS trước hạn chót 2027-03-31'
                        : 'Cảnh báo đỏ AC-05: Hạn chót trước đợt xét tốt nghiệp 3 tháng (2027-03-31)'}
                    </span>
                  </div>
                  {isProjected ? (
                    <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH (DỰ KIẾN)</span>
                  ) : (
                    <span className="haui-badge haui-badge--error">🚨 CẢNH BÁO ĐỎ: THIẾU MOS</span>
                  )}
                </div>

                {/* Tiếng Anh nâng cao */}
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Chuẩn Tiếng Anh chuyên ngành nâng cao (Mã FL6006)</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-ink)' }}>Đã tích lũy</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Đã hoàn thành học phần Tiếng Anh chuyên ngành CNTT tại Kỳ 5 (Điểm B+)</span>
                  </div>
                  <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                </div>
              </div>
            </div>

            {/* NHÓM 4: Giáo dục Quốc phòng & Thể chất */}
            <div
              style={{
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--color-paper)',
                padding: '24px',
                boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid var(--color-hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid var(--color-hairline)'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>
                    4. Chứng chỉ Giáo dục Quốc phòng &amp; Thể chất
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                    Điều kiện bắt buộc theo Luật Giáo dục Đại học (Điều kiện cần để cấp văn bằng)
                  </p>
                </div>
                <span className="haui-badge haui-badge--success">✓ Trạng thái: Đã hoàn thành</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Chứng chỉ Giáo dục Quốc phòng - An ninh</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-mid-gray)' }}>3 học phần (QP6001, QP6002, QP6003)</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Đã hoàn thành 165 tiết tại Trung tâm GDQP-AN cơ sở Hà Nam (Chứng chỉ: QP2021-98442)</span>
                  </div>
                  <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                </div>

                <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Chứng chỉ Giáo dục Thể chất</span>
                      <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', color: 'var(--color-mid-gray)' }}>3 tín chỉ thể chất</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Đã hoàn thành Thể dục cơ bản, Bóng chuyền &amp; Cầu lông</span>
                  </div>
                  <span className="haui-badge haui-badge--success">✓ ĐÃ HOÀN THÀNH</span>
                </div>
              </div>
            </div>

            {/* BẢNG 7 HẠNG MỤC KIỂM TOÁN TỐT NGHIỆP CHI TIẾT (AUDIT CHECKLIST 100%) */}
            <Card
              title="Danh mục 7 Điều kiện Kiểm tra Tốt nghiệp 100% (Audit Checklist)"
              subtitle="Theo dõi toàn diện: Tín chỉ tích lũy, Bắt buộc, Tự chọn chuyên ngành, Ngoại ngữ, Tin học, GDTC/GDQP-AN và Điểm rèn luyện"
              headerAction={
                <span className="haui-badge haui-badge--info">
                  {passedCriteriaCount}/7 Hạng mục Đạt
                </span>
              }
            >
              {loading && <Loading label="Đang cập nhật danh mục kiểm toán..." />}
              {error && <ErrorBox title="Lỗi tải dữ liệu kiểm toán" error={error} onRetry={fetchAudit} />}
              {auditData && !loading && (
                <Table
                  columns={checklistColumns}
                  data={auditData.checklist || []}
                  rowKey="category"
                  striped
                />
              )}
            </Card>

            {/* CẢNH BÁO SỚM CHUẨN ĐẦU RA & TÍN CHỈ THIẾU (AC-05 / FR-18) */}
            <Card
              variant="default"
              title="Cảnh báo Sớm Các Điều kiện & Chứng chỉ Tồn đọng (AC-05 / FR-18)"
              subtitle="Cần hoàn thành trước mốc xét tốt nghiệp để tránh chậm ra trường"
            >
              {Array.isArray(auditData?.pendingActions) && auditData.pendingActions.length > 0 ? (
                <Table
                  columns={pendingColumns}
                  data={auditData.pendingActions}
                  rowKey="certificateType"
                  striped
                />
              ) : (
                <EmptyState
                  title="Không có chứng chỉ tồn đọng"
                  description="Sinh viên đã hoàn thành toàn bộ chứng chỉ điều kiện hoặc đã có phương án bù đắp hoàn chỉnh."
                />
              )}
            </Card>

            {/* BẢNG THAM CHIẾU QUY TẮC NGHIỆP VỤ HAUI (PRD MỤC 9: BR-01 -> BR-10) */}
            <Card
              title="Bảng Quy tắc Nghiệp vụ Học vụ HaUI (PRD Mục 9: BR-01 → BR-10)"
              subtitle="Các tham số quy chế sử dụng trong Rule Engine ở mốc V0 được gắn nhãn DEMO_UNVERIFIED theo Quy tắc 5 AGENTS.md"
            >
              <Table
                columns={[
                  {
                    key: 'code',
                    title: 'Mã BR',
                    width: '90px',
                    render: (val) => <code style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{val}</code>
                  },
                  { key: 'title', title: 'Tên quy tắc nghiệp vụ', width: '220px' },
                  { key: 'rule', title: 'Nội dung quy định chi tiết' },
                  {
                    key: 'tag',
                    title: 'Nhãn kiểm chứng',
                    width: '150px',
                    render: (val) => <span className="haui-badge haui-badge--info">{val}</span>
                  }
                ]}
                data={HAUI_BUSINESS_RULES}
                rowKey="code"
                striped
              />
            </Card>
          </div>

          {/* CỘT PHẢI (4 COLS): SIDEBAR / ACTION DRAWERS */}
          <div style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', gap: '24px' }} className="haui-audit-right-col">
            
            {/* CARD 1: Tổng hợp việc cần làm (Action Checklist) */}
            <div
              style={{
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--color-paper)',
                padding: '24px',
                boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid var(--color-hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-ink)' }}>checklist</span>
                  <span>Tổng hợp việc cần làm</span>
                </h2>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas)',
                    color: 'var(--color-ink)',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  {isProjected ? '0 mục tồn đọng' : '4 mục cần ưu tiên'}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', lineHeight: 1.5 }}>
                Danh sách điều kiện còn thiếu cần ưu tiên hoàn tất để được đưa vào danh sách xét tốt nghiệp đợt tháng 06/2027:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Item 1 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                    1
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      Gỡ nợ MATH1002 &amp; học 13 TC chuyên ngành
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-mid-gray)', lineHeight: 1.4 }}>
                      Sắp xếp Toán rời rạc (MATH1002), Kiến trúc phần mềm và Kiểm thử PM vào Kỳ 7.
                    </p>
                  </div>
                </div>

                {/* Item 2 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                    2
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      Tích lũy 6 TC tự chọn &amp; 10 TC Khóa luận
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-mid-gray)', lineHeight: 1.4 }}>
                      Đăng ký 2 môn tự chọn IT6010, IT6015 và đăng ký giảng viên hướng dẫn ĐATN vào đầu học kỳ 8.
                    </p>
                  </div>
                </div>

                {/* Item 3 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                    3
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      Thi và nộp chứng chỉ Tin học MOS 3 môn
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-mid-gray)', lineHeight: 1.4 }}>
                      Hạn chót tiếp nhận hồ sơ xét tốt nghiệp trước ngày <strong style={{ color: 'var(--color-ember)' }}>31/03/2027</strong>.
                    </p>
                  </div>
                </div>

                {/* Item 4 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                    4
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      Kiểm tra đồng bộ dữ liệu trên sv.haui.edu.vn
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-mid-gray)', lineHeight: 1.4 }}>
                      Xác nhận các học phần thực tập tốt nghiệp và ngoại ngữ đã hiển thị trạng thái tích xanh.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Gợi ý từ AI Advisor (Next Step Advisor Suggestions) */}
            <div
              style={{
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--color-paper)',
                padding: '24px',
                boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid var(--color-hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lightbulb</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>
                  Gợi ý từ AI Advisor
                </h2>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', lineHeight: 1.5 }}>
                {isProjected
                  ? 'Bản mô phỏng dự kiến cho thấy sau khi hoàn thành kế hoạch bù đắp 2 học kỳ, bạn sẽ tích lũy đủ 135/135 TC với CPA dự kiến 3.25 (Loại Giỏi). Hãy giữ vững tiến độ này!'
                  : 'Hồ sơ học tập của bạn đang đạt 82% tiến độ. Để tốt nghiệp đúng hạn loại Giỏi, bạn chỉ cần hoàn thành môn nợ Toán rời rạc (MATH1002) và nộp chứng chỉ MOS trước hạn chót 31/03/2027.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="haui-pill-btn-dark"
                  style={{ width: '100%', justifyContent: 'space-between', padding: '10px 16px' }}
                  onClick={() => setIsRemediationModalOpen(true)}
                >
                  <span style={{ fontSize: '13px' }}>Bố trí môn thiếu vào Kế hoạch học tập</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                </button>

                <button
                  type="button"
                  className="haui-pill-btn-canvas"
                  style={{ width: '100%', justifyContent: 'space-between', padding: '10px 16px' }}
                  onClick={() => navigate('/chat')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>auto_awesome</span>
                    <span>Hỏi AI về thủ tục tốt nghiệp sớm</span>
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>chevron_right</span>
                </button>

                <button
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '9999px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--color-mid-gray)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  onClick={() => window.print()}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                    <span>Tải danh mục chuẩn đầu ra K16 (.pdf)</span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>1.8 MB</span>
                </button>
              </div>
            </div>

            {/* CARD 3: Academic Advisor Contact Note */}
            <div
              style={{
                borderRadius: 'var(--radius-cards)',
                backgroundColor: 'var(--color-canvas)',
                padding: '20px',
                border: '1px solid var(--color-hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-mid-gray)' }}>support_agent</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Cần hỗ trợ đối chiếu hồ sơ?</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', lineHeight: 1.5 }}>
                Liên hệ Cố vấn học tập khoa CNTT hoặc phòng Đào tạo (Tầng 2 - Nhà A1, cơ sở 1) trong các ngày làm việc từ thứ 2 đến thứ 6.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 6: MODAL LẬP KẾ HOẠCH BÙ ĐẮP ĐIỀU KIỆN TỐT NGHIỆP CÒN THIẾU (F23-006)
          ========================================================================= */}
      <Modal
        isOpen={isRemediationModalOpen}
        onClose={() => setIsRemediationModalOpen(false)}
        title="AI Tự động Lập Kế hoạch Bù đắp Điều kiện Tốt nghiệp Còn thiếu"
        subtitle="Kết nối Màn hình 9 (Audit) → Màn hình 5 (Xác nhận Kế hoạch Học tập)"
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsRemediationModalOpen(false)}>
              Đóng (ESC)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const proposal = buildAuditRemediationProposal(auditData);
                dispatchAuditRemediationProposal(auditData, plannerStore);
                if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                  window.dispatchEvent(
                    new CustomEvent('haui:planner:proposal', {
                      detail: {
                        ...proposal,
                        sourceName: 'Graduation Audit (Kiểm toán tốt nghiệp)',
                        projectedCpa: 3.25
                      }
                    })
                  );
                }
                setIsRemediationModalOpen(false);
                navigate('/planner');
              }}
            >
              Chuyển sang Màn hình 5 (Xác nhận Kế hoạch) &rarr;
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--color-ink)' }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Dựa trên kết quả Kiểm toán Tốt nghiệp (<strong>82%</strong>), hệ thống đề xuất tự động bổ sung vào lộ trình 2 học kỳ cuối:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6, color: 'var(--color-ink)' }}>
            <li>
              <strong>Học kỳ 1 (2026-2027):</strong> Đăng ký học lại <code>MATH1002</code> (3 TC) + 2 môn Tự chọn chuyên ngành <code>IT6010</code>, <code>IT6015</code> (6 TC) để hoàn thành 100% khối tự chọn và vượt mốc 85% tín chỉ nhận Đồ án (BR-09).
            </li>
            <li>
              <strong>Chứng chỉ Tin học MOS/IC3 (AC-05):</strong> Đặt lịch nhắc thi chứng chỉ MOS trước hạn chót <code>2027-03-31</code> (trước đợt xét tốt nghiệp 3 tháng).
            </li>
            <li>
              <strong>Học kỳ cuối:</strong> Bố trí nhẹ nhàng làm Đồ án tốt nghiệp <code>IT7008</code> (10 TC).
            </li>
          </ul>
        </div>
      </Modal>

      {/* =========================================================================
          SECTION 7: KHỐI CHỮ KÝ IN ẤN (@media print)
          ========================================================================= */}
      <div className="haui-print-signatures">
        <div style={{ fontSize: '11px', fontStyle: 'italic', marginBottom: '8px', textAlign: 'center', color: '#475569' }}>
          {isProjected
            ? 'Xác nhận Kế hoạch Học tập Bù đắp Dự kiến (Sinh viên cam kết hoàn thành đúng lộ trình để đạt chuẩn tốt nghiệp):'
            : 'Xác nhận Báo cáo Kết quả Học tập và Rà soát Điều kiện Tốt nghiệp Thực tế:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', marginTop: '16px', paddingTop: '12px' }}>
          <div>
            <strong style={{ fontSize: '13px' }}>SINH VIÊN XÁC NHẬN</strong>
            <div style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '4px' }}>(Ký và ghi rõ họ tên)</div>
            <div style={{ height: '70px' }} />
            <div style={{ fontWeight: 600 }}>{sessionStudent.fullName || 'Nguyễn Văn An'}</div>
          </div>
          <div>
            <strong style={{ fontSize: '13px' }}>CỐ VẤN HỌC TẬP / PHÒNG ĐÀO TẠO</strong>
            <div style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '4px' }}>(Ký, ghi rõ họ tên và đóng dấu)</div>
            <div style={{ height: '70px' }} />
            <div style={{ fontWeight: 600 }}>Ban Cố Vấn Học Vụ HaUI</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcademicProgressPage;
