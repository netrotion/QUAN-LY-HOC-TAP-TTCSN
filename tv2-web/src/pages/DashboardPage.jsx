import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import { STUDENT_PERSONAS } from '../services/mockFixtures.js';
import { Button, Card, Error as ErrorBox, Loading, Modal, Table } from '../components/ui/index.js';

/**
 * Màn hình 1: Trang chủ Dashboard Sinh viên (`/`) — TV2 Web Host
 * Căn cứ: Tài liệu Thiết kế UI Flow (Màn hình 1 & Luồng phụ A), 1-Page Brief & PRD (G1..G10, FR-01..FR-04, BR-01..BR-10, AC-01).
 */
export function DashboardPage({ mountedRouteSummary }) {
  const navigate = useNavigate();
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
    return api.subscribe(() => {
      loadDashboardData();
    });
  }, [loadDashboardData]);

  // Xử lý Bước A2 & A3: Tải file bảng điểm PDF/Ảnh từ e-HaUI hoặc mô phỏng lỗi định dạng file (Mục 5 Edge Cases)
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
    : 50.4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Màn hình 1: Widget Cảnh báo rủi ro học vụ sớm (Alert Box) + Cụm nút CTA nổi bật */}
      <div className="haui-alert-box" role="region" aria-label="Cảnh báo rủi ro học vụ sớm">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }} aria-hidden="true">
              🚨
            </span>
            <strong style={{ fontSize: 'var(--text-base)', color: '#7c2d12' }}>
              Cảnh báo rủi ro học vụ sớm (Early Warning — US-12 / FR-18):
            </strong>
            <span className="haui-badge haui-badge--warning">DEMO_UNVERIFIED</span>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--text-sm)', color: '#9a3412' }}>
            Bạn đang nợ môn <strong>Toán rời rạc (3 TC — MATH1002)</strong> – Đây là môn tiên quyết trực tiếp của{' '}
            <strong>Cấu trúc dữ liệu &amp; Giải thuật (IT6001)</strong> ở học kỳ tới! Nếu không học lại ngay, bạn sẽ bị hoãn dây chuyền ít nhất 3 môn chuyên ngành.
          </p>

          {/* Cụm Nút CTA nổi bật đúng chuẩn Màn hình 1 UI Flow */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Button variant="primary" size="sm" onClick={() => navigate('/chat')}>
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

      {loading && <Loading label="Đang tải dữ liệu tổng quan học vụ sinh viên..." />}

      {error && !loading && (
        <ErrorBox
          title="Không thể tải dữ liệu Dashboard"
          error={error}
          onRetry={loadDashboardData}
        />
      )}

      {academicStatus && !loading && (
        <>
          {/* 4 Thẻ chỉ số KPI Học tập (Màn hình 1 UI Flow) */}
          <div className="haui-grid haui-grid--4">
            <Card
              variant="status-info"
              title="CPA Tích lũy"
              subtitle="Thang điểm 4.0 (BR-05 / BR-08)"
              headerAction={<span className="haui-badge haui-badge--info">CPA</span>}
            >
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
                {academicStatus.cpa !== null && academicStatus.cpa !== undefined
                  ? `${Number(academicStatus.cpa).toFixed(2)} / 4.0`
                  : 'null / UNKNOWN'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-text)', fontWeight: 600, marginTop: '6px' }}>
                Trung bình — Cách ngưỡng bằng Khá (2.50) đúng 0.05 điểm
              </div>
            </Card>

            <Card
              variant="status-success"
              title="Số tín chỉ tích lũy"
              subtitle="Tiến độ hoàn thành toàn khóa"
              headerAction={<span className="haui-badge haui-badge--success">{creditPercent}%</span>}
            >
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-success-text)' }}>
                {academicStatus.accumulatedCredits} / {academicStatus.totalCreditsRequired} TC
              </div>
              <div className="haui-progress-track" style={{ marginTop: '10px' }}>
                <div
                  className="haui-progress-fill"
                  style={{ width: `${creditPercent}%`, backgroundColor: 'var(--color-success)' }}
                />
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                Còn thiếu {academicStatus.totalCreditsRequired - academicStatus.accumulatedCredits} tín chỉ để đủ chuẩn 135 TC
              </div>
            </Card>

            <Card
              variant="status-warning"
              title="Tình trạng Học vụ"
              subtitle="Đối chiếu ngưỡng cảnh báo BR-07"
              headerAction={<span className="haui-badge haui-badge--warning">{academicStatus.riskLevel}</span>}
            >
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-warning-text)' }}>
                Cảnh báo mức 1 (Đỏ cam)
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
                Nợ 1 học phần tiên quyết cốt lõi (MATH1002 - 3 TC). Cần ưu tiên học lại kỳ tới.
              </div>
            </Card>

            <Card
              variant="default"
              title="GPA Học kỳ hiện tại"
              subtitle="Bảo toàn dữ liệu khuyết (Rule 5)"
              headerAction={<span className="haui-badge haui-badge--neutral">UNKNOWN</span>}
            >
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                {academicStatus.gpa === null ? 'null (UNKNOWN)' : academicStatus.gpa}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                Chưa khóa sổ điểm học kỳ hiện tại; hệ thống giữ nguyên <code>null</code> thay vì gán 0.
              </div>
            </Card>
          </div>

          {/* Thanh tiến độ Chương trình đào tạo (Degree Progress Bar theo 5 Khối kiến thức — Màn hình 1 UI Flow) */}
          <Card
            title="Thanh Tiến độ Chương trình Đào tạo theo Khối Kiến thức (Degree Progress Bar)"
            subtitle="Phân rã tỷ lệ hoàn thành từng khối kiến thức ngành Kỹ thuật phần mềm / CNTT (DEMO_UNVERIFIED)"
            headerAction={
              <Link to="/curriculum">
                <Button variant="secondary" size="sm">
                  🌳 Xem Sơ đồ Cây Môn học (Màn hình 4) &rarr;
                </Button>
              </Link>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {(academicStatus.knowledgeBlocks || []).map((blk) => (
                <div key={blk.blockId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: 'var(--text-sm)' }}>
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

          {/* 4 Phân khúc Sinh viên Mục tiêu từ 1-Page Brief & PRD Mục 2 */}
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
                  onClick={() => setActivePersonaId(p.id)}
                >
                  {p.segment}
                </Button>
              ))}
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-bg-muted)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
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

          {/* Điểm nối TV2 -> TV3 và Trạng thái hệ thống */}
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
                    title: 'Trạng thái V0',
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
        </>
      )}

      {/* Modal Luồng phụ A: Nhập & Đồng bộ Bảng điểm (Academic Record Ingestion — Bước A1 -> A4, FR-02, AC-01) */}
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

          {ingestLoading && <Loading label="Bước A3: OCR / Parser đang bóc tách danh sách môn học, điểm thang 10, điểm chữ và điểm thang 4..." />}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: 'var(--text-sm)' }}>
                <span>
                  File nguồn: <code>{ingestResult.sourceFileName}</code>
                </span>
                <span>
                  CPA tính toán: <strong>{ingestResult.extractedCpa}</strong> &bull; Tín chỉ: <strong>{ingestResult.extractedAccumulatedCredits} TC</strong>
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
