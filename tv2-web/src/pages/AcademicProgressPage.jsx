import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import { HAUI_BUSINESS_RULES } from '../services/mockFixtures.js';
import { Button, Card, EmptyState, Error as ErrorBox, Loading, Modal, Table } from '../components/ui/index.js';
import { subscribeAcademicStore } from '../services/academicStore.js';

/**
 * Màn hình 9: Bảng Kiểm toán Tốt nghiệp 100% & Cảnh báo Sớm (`/progress` & `/audit`) — TV2
 * Căn cứ:
 * - Luồng chính 3 (Màn hình 9 UI Flow): Vòng tròn tiến độ tổng thể 82%, 7 hạng mục Audit Checklist,
 *   cảnh báo đỏ chứng chỉ MOS/IC3 (AC-05) và nút [ Lập kế hoạch bù đắp các điều kiện còn thiếu ].
 * - PRD: G7, US-11, FR-17, BR-08, BR-09, BR-10.
 */
export function AcademicProgressPage() {
  const navigate = useNavigate();
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRemediationModalOpen, setIsRemediationModalOpen] = useState(false);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.audit.getGraduationAudit();
      setAuditData(response);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
    const unsubStore = subscribeAcademicStore(() => {
      fetchAudit();
    });
    const unsubApi = api.subscribe(() => {
      fetchAudit();
    });
    return () => {
      unsubStore();
      unsubApi();
    };
  }, [fetchAudit]);

  const checklistColumns = [
    {
      key: 'category',
      title: 'Hạng mục kiểm toán (1-7)',
      width: '215px',
      render: (val) => <strong style={{ fontSize: 'var(--text-xs)' }}>{val}</strong>
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
        row.requiredCredits !== null && row.requiredCredits !== undefined ? (
          <span>
            <strong>{row.earnedCredits ?? 'null'}</strong> / {row.requiredCredits} TC
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
            Điều kiện chuẩn đầu ra
          </span>
        )
    },
    {
      key: 'completed',
      title: 'Trạng thái',
      align: 'center',
      width: '160px',
      render: (completed, row) => {
        if (completed === true) {
          return <span className="haui-badge haui-badge--success">✓ ĐẠT (Hợp lệ)</span>;
        }
        if (completed === false) {
          const isRedAlert = row.category.includes('TIN HỌC');
          return (
            <span className={`haui-badge ${isRedAlert ? 'haui-badge--error' : 'haui-badge--warning'}`}>
              {isRedAlert ? '🚨 CẢNH BÁO ĐỎ' : '⚠️ CÒN THIẾU'}
            </span>
          );
        }
        return <span className="haui-badge haui-badge--neutral">UNKNOWN (null)</span>;
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
                ? 'var(--color-error-text)'
                : 'var(--color-text-primary)',
            fontWeight: row.completed === false ? 600 : 400
          }}
        >
          {msg}
        </span>
      )
    }
  ];

  const pendingColumns = [
    {
      key: 'certificateType',
      title: 'Mã điều kiện',
      width: '150px',
      render: (val) => <code style={{ fontWeight: 700, color: 'var(--color-error)' }}>{val}</code>
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
      render: (val) => <strong style={{ color: 'var(--color-error-text)' }}>{val}</strong>
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '130px',
      render: (val) => (
        <span className={`haui-badge ${val === 'PENDING' ? 'haui-badge--error' : 'haui-badge--neutral'}`}>
          {val}
        </span>
      )
    }
  ];

  const pct = auditData?.completedPercentage ?? 82;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="haui-audit-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Khối Tiêu đề dành riêng cho Chế độ in ấn & Xuất PDF (@media print) */}
      <div className="haui-print-header">
        <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #000', paddingBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
            BỘ GIÁO DỤC VÀ ĐÀO TẠO &bull; TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI
          </div>
          <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#333' }}>
            Phòng Đào tạo &bull; Hệ thống Cố vấn Lộ trình Học tập HaUI Advisor
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: '10px 0 4px', textTransform: 'uppercase', color: '#0052cc' }}>
            BÁO CÁO KIỂM TOÁN TỐT NGHIỆP 100% TIÊU CHÍ (DEGREE AUDIT)
          </h1>
          <div style={{ fontSize: '11px', color: '#555' }}>
            Mã văn bản: AUDIT-HAUI-{Date.now().toString().slice(-6)} &bull; Trạng thái: DEMO_UNVERIFIED
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '16px', padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
          <div><strong>Họ và tên sinh viên:</strong> {api.getConfig().sessionStudent?.fullName || 'Nguyễn Văn An'}</div>
          <div><strong>Mã số sinh viên:</strong> {api.getConfig().sessionStudent?.studentId || 'std-2026-001'}</div>
          <div><strong>Ngành đào tạo:</strong> {api.getConfig().sessionStudent?.majorName || 'Kỹ thuật phần mềm (CNTT)'}</div>
          <div><strong>Khóa / Lớp:</strong> {api.getConfig().sessionStudent?.cohort || 'K17'} &bull; {api.getConfig().sessionStudent?.advisorClass || 'KTPM01-K17'}</div>
          <div><strong>Tín chỉ tích lũy:</strong> {auditData?.totalCreditsEarned ?? 112} / {auditData?.totalCreditsRequired ?? 135} TC ({pct}%)</div>
          <div><strong>Đủ ĐK Tốt nghiệp:</strong> {auditData?.eligibleForGraduation ? '✓ ĐẠT YÊU CẦU' : 'CHƯA ĐẠT (CÒN ĐIỀU KIỆN THIẾU)'}</div>
        </div>
      </div>

      {/* Màn hình 9: Header + Vòng tròn tiến độ tổng thể 82% + Nút Lập kế hoạch bù đắp */}
      <Card
        variant={auditData?.eligibleForGraduation ? 'status-success' : 'status-warning'}
        title="Màn hình 9: Bảng Kiểm toán Tốt nghiệp 100% (Graduation Degree Audit)"
        subtitle="Luồng chính 3: Tự động rà soát 100% điều kiện tốt nghiệp (G7, US-11, FR-17, BR-08..BR-10, AC-05)"
        headerAction={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              title="In báo cáo học vụ hoặc Lưu dưới dạng file PDF chuẩn A4"
            >
              🖨️ In Báo Cáo / Xuất PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRemediationModalOpen(true)}
            >
              🛠️ Lập kế hoạch bù đắp các điều kiện còn thiếu
            </Button>
            <Button variant="secondary" size="sm" loading={loading} onClick={fetchAudit}>
              Kiểm tra lại
            </Button>
          </div>
        }
      >
        {loading && <Loading label="Đang rà soát 100% hồ sơ điều kiện tốt nghiệp..." />}

        {error && !loading && (
          <ErrorBox
            title="Không thể tải kết quả rà soát tốt nghiệp"
            error={error}
            onRetry={fetchAudit}
          />
        )}

        {auditData && !loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr',
              gap: 'var(--space-6)',
              alignItems: 'center'
            }}
          >
            {/* Vòng tròn tiến độ tổng thể 82% (Màn hình 9 UI Flow) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg width="132" height="132" viewBox="0 0 132 132" aria-label={`Hoàn thành ${pct}% điều kiện tốt nghiệp`}>
                <circle
                  cx="66"
                  cy="66"
                  r={radius}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="12"
                />
                <circle
                  cx="66"
                  cy="66"
                  r={radius}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 66 66)"
                />
                <text
                  x="66"
                  y="62"
                  textAnchor="middle"
                  style={{ fontSize: '24px', fontWeight: 700, fill: 'var(--color-primary)' }}
                >
                  {pct}%
                </text>
                <text
                  x="66"
                  y="82"
                  textAnchor="middle"
                  style={{ fontSize: '11px', fill: 'var(--color-text-muted)', fontWeight: 600 }}
                >
                  HOÀN THÀNH
                </text>
              </svg>
            </div>

            <div className="haui-grid haui-grid--3">
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  TỔNG TÍN CHỈ TÍCH LŨY (BR-10)
                </div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: '4px' }}>
                  {auditData.totalCreditsEarned} / {auditData.totalCreditsRequired} TC
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-text)', marginTop: '4px' }}>
                  Còn thiếu {auditData.totalCreditsRequired - auditData.totalCreditsEarned} tín chỉ (gồm 6 TC tự chọn)
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  ĐIỀU KIỆN NHẬN ĐỒ ÁN TN (BR-09)
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-warning-text)', marginTop: '4px' }}>
                  Đạt 82.9% / Yêu cầu &ge; 85% CTĐT
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Cần tích lũy thêm tối thiểu 3 TC và gỡ nợ MATH1002 để nhận Đồ án.
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  ĐIỂM RÈN LUYỆN &amp; DỰ KIẾN XẾP LOẠI (BR-08)
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-success-text)', marginTop: '4px' }}>
                  Rèn luyện: {auditData.trainingScore ?? 78} điểm (Loại Khá)
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Tín chỉ học lại: {auditData.retakeCreditsPercentage ?? 2.2}% (&le; 5% nên không bị hạ bậc bằng).
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {auditData && !loading && (
        <>
          {/* Bảng 7 danh mục điều kiện kiểm tra (Audit Checklist 100% - Màn hình 9 UI Flow) */}
          <Card
            title="Danh mục 7 Điều kiện Kiểm tra Tốt nghiệp 100% (Audit Checklist)"
            subtitle="Theo dõi toàn diện: Tín chỉ tích lũy, Bắt buộc, Tự chọn chuyên ngành, Ngoại ngữ, Tin học, GDTC/GDQP-AN và Điểm rèn luyện"
            headerAction={
              <span className="haui-badge haui-badge--info">5/7 Hạng mục Đạt</span>
            }
          >
            <Table
              columns={checklistColumns}
              data={auditData.checklist || []}
              rowKey="category"
              striped
            />
          </Card>

          {/* Cảnh báo sớm chuẩn đầu ra & tín chỉ thiếu (AC-05) */}
          <Card
            variant="status-error"
            title="Cảnh báo Sớm Các Điều kiện & Chứng chỉ Tồn đọng (AC-05 / FR-18)"
            subtitle="Cần hoàn thành trước mốc xét tốt nghiệp để tránh chậm ra trường"
          >
            {Array.isArray(auditData.pendingActions) && auditData.pendingActions.length > 0 ? (
              <Table
                columns={pendingColumns}
                data={auditData.pendingActions}
                rowKey="certificateType"
                striped
              />
            ) : (
              <EmptyState
                title="Không có chứng chỉ tồn đọng"
                description="Sinh viên đã hoàn thành toàn bộ chứng chỉ điều kiện."
              />
            )}
          </Card>

          {/* Bảng tham chiếu Quy tắc Nghiệp vụ HaUI (BR-01 -> BR-10 từ PRD Mục 9) */}
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
        </>
      )}

      {/* Modal Lập kế hoạch bù đắp các điều kiện còn thiếu (Màn hình 9 -> Màn hình 5) */}
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
                setIsRemediationModalOpen(false);
                navigate('/planner');
              }}
            >
              Chuyển sang Màn hình 5 (Xác nhận Kế hoạch) &rarr;
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
          <p style={{ margin: 0 }}>
            Dựa trên kết quả Kiểm toán Tốt nghiệp (<strong>82%</strong>), hệ thống đề xuất tự động bổ sung vào lộ trình 2 học kỳ cuối:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
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
      {/* Khối Chữ ký dành riêng cho Chế độ in ấn (@media print) */}
      <div className="haui-print-signatures">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', marginTop: '36px', paddingTop: '16px' }}>
          <div>
            <strong style={{ fontSize: '13px' }}>SINH VIÊN XÁC NHẬN</strong>
            <div style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '4px' }}>(Ký và ghi rõ họ tên)</div>
            <div style={{ height: '70px' }} />
            <div style={{ fontWeight: 600 }}>{api.getConfig().sessionStudent?.fullName || 'Nguyễn Văn An'}</div>
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
