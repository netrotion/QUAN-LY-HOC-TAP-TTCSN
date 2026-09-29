import React, { useState } from 'react';
import { api } from '../services/apiClient.js';
import { Button, Card, EmptyState, Error as ErrorBox, Loading, Modal, Table } from '../components/ui/index.js';

const SAMPLE_COURSES = [
  {
    courseCode: 'IT1001',
    courseName: 'Nhập môn lập trình',
    credits: 3,
    prerequisite: 'Không',
    letterGrade: 'A',
    gradePoint: 4.0,
    status: 'PASSED'
  },
  {
    courseCode: 'MATH1002',
    courseName: 'Toán rời rạc',
    credits: 3,
    prerequisite: 'MATH1001',
    letterGrade: 'F',
    gradePoint: 0.0,
    status: 'FAILED'
  },
  {
    courseCode: 'IT6001',
    courseName: 'Cấu trúc dữ liệu và giải thuật',
    credits: 4,
    prerequisite: 'MATH1002, IT1001',
    letterGrade: null, // Chưa học -> giữ nguyên null theo Quy tắc 5 AGENTS.md
    gradePoint: null,
    status: 'BLOCKED'
  },
  {
    courseCode: 'PE1003',
    courseName: 'Giáo dục Quốc phòng - An ninh',
    credits: 0,
    prerequisite: 'Không',
    letterGrade: null,
    gradePoint: null,
    status: 'UNKNOWN'
  }
];

/**
 * Trang Demo UI & Mock API (`/demo-ui`) — Task 1.3a (`ui-api-v0`)
 * Showcase toàn bộ 7 thành phần Shared UI V0 và kiểm thử trực tiếp Singleton API Client.
 */
export function DemoUiPage() {
  // 1. State điều khiển Button & Modal showcase
  const [btnLoading, setBtnLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [modalSize, setModalSize] = useState('md');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 2. State điều khiển Table / Loading / Error / EmptyState showcase
  const [tableViewMode, setTableViewMode] = useState('data'); // 'data' | 'empty' | 'loading' | 'error'
  const [retryCount, setRetryCount] = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);

  // 3. State điều khiển Mock API Client Playground
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiResult, setApiResult] = useState(null);
  const [activeEndpointLabel, setActiveEndpointLabel] = useState('GET /api/v1/academic/status');

  const handleOpenModal = (size = 'md') => {
    setModalSize(size);
    setIsModalOpen(true);
  };

  const handleInvokeApi = async (label, invoker) => {
    setActiveEndpointLabel(label);
    setApiLoading(true);
    setApiError(null);
    try {
      const response = await invoker();
      setApiResult(response);
    } catch (err) {
      setApiResult(null);
      setApiError(err);
    } finally {
      setApiLoading(false);
    }
  };

  const tableColumns = [
    {
      key: 'courseCode',
      title: 'Mã HP',
      width: '110px',
      render: (val) => <code style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{val}</code>
    },
    {
      key: 'courseName',
      title: 'Tên học phần'
    },
    {
      key: 'credits',
      title: 'Tín chỉ',
      align: 'center',
      width: '90px'
    },
    {
      key: 'prerequisite',
      title: 'Tiên quyết',
      width: '150px'
    },
    {
      key: 'letterGrade',
      title: 'Điểm chữ',
      align: 'center',
      width: '120px',
      render: (val) =>
        val === null ? (
          <span className="haui-badge haui-badge--neutral">null / UNKNOWN</span>
        ) : (
          <strong>{val}</strong>
        )
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '150px',
      render: (status) => {
        const map = {
          PASSED: { cls: 'haui-badge--success', text: 'Đạt (PASSED)' },
          FAILED: { cls: 'haui-badge--error', text: 'Học lại (FAILED)' },
          BLOCKED: { cls: 'haui-badge--warning', text: 'Chặn tiên quyết' },
          UNKNOWN: { cls: 'haui-badge--neutral', text: 'UNKNOWN' }
        };
        const badge = map[status] || { cls: 'haui-badge--info', text: status };
        return <span className={`haui-badge ${badge.cls}`}>{badge.text}</span>;
      }
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      width: '130px',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRow(row);
            setModalSize('md');
            setIsModalOpen(true);
          }}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Khu vực 1: Kiểm thử Singleton API Client & Mock Interceptor */}
      <Card
        variant="status-info"
        title="1. Singleton API Client & Mock Interceptor Playground (ui-api-v0)"
        subtitle="Kiểm thử gọi API kèm cookie session (credentials: 'include'), CSRF header (X-XSRF-TOKEN) và bộ lọc bảo mật studentId"
        headerAction={
          <span className="haui-badge haui-badge--warning">
            {api.isMockMode() ? 'FIXTURE_ONLY (Mock Enabled)' : 'LIVE BACKEND MODE'}
          </span>
        }
      >
        <p style={{ marginTop: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Bấm các nút bên dưới để gọi thử qua singleton <code>api</code> và xem kết quả phản hồi trực tiếp:
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <Button
            variant="primary"
            size="sm"
            loading={apiLoading && activeEndpointLabel === 'GET /api/v1/academic/status'}
            onClick={() =>
              handleInvokeApi('GET /api/v1/academic/status', () => api.academic.getStatus())
            }
          >
            GET /academic/status
          </Button>

          <Button
            variant="secondary"
            size="sm"
            loading={apiLoading && activeEndpointLabel === 'POST /api/v1/academic/transcript-ingest (AC-01)'}
            onClick={() =>
              handleInvokeApi('POST /api/v1/academic/transcript-ingest (AC-01)', () =>
                api.academic.ingestTranscript({
                  fileName: 'Bang_Diem_Ca_Nhan_eHaUI_K17.pdf'
                })
              )
            }
          >
            POST /academic/transcript-ingest (AC-01)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            loading={apiLoading && activeEndpointLabel === 'POST /api/v1/academic/eligibility'}
            onClick={() =>
              handleInvokeApi('POST /api/v1/academic/eligibility', () =>
                api.academic.checkEligibility({
                  courseCode: 'IT6001',
                  studentId: 'untrusted-client-id-will-be-stripped'
                })
              )
            }
          >
            POST /academic/eligibility (AC-02: Chặn IT6001)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            loading={apiLoading && activeEndpointLabel === 'POST /api/v1/planner/generate'}
            onClick={() =>
              handleInvokeApi('POST /api/v1/planner/generate', () =>
                api.planner.generate({ targetSemester: '2026_1' })
              )
            }
          >
            POST /planner/generate (AC-03: 18 TC)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            loading={apiLoading && activeEndpointLabel === 'POST /api/v1/planner/validate (BR-03/BR-04)'}
            onClick={() =>
              handleInvokeApi('POST /api/v1/planner/validate (BR-03/BR-04)', () =>
                api.planner.validate({ totalCredits: 6 })
              )
            }
          >
            POST /planner/validate (6 TC &lt; 10 TC)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            loading={apiLoading && activeEndpointLabel === 'POST /api/v1/simulation/grades (AC-04)'}
            onClick={() =>
              handleInvokeApi('POST /api/v1/simulation/grades (AC-04)', () =>
                api.simulation.simulateGrades({
                  courses: [{ courseCode: 'MATH1002', credits: 3, expectedGrade: 'B' }]
                })
              )
            }
          >
            POST /simulation/grades (AC-04: What-if)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            loading={apiLoading && activeEndpointLabel === 'GET /api/v1/audit/graduation'}
            onClick={() =>
              handleInvokeApi('GET /api/v1/audit/graduation', () => api.audit.getGraduationAudit())
            }
          >
            GET /audit/graduation (AC-05: 82%)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            loading={apiLoading && activeEndpointLabel === 'POST /api/v1/advisor/chat'}
            onClick={() =>
              handleInvokeApi('POST /api/v1/advisor/chat', () =>
                api.advisor.chat({
                  message: 'Tư vấn lộ trình kỳ tới để kéo CPA lên >= 2.50 (bằng Khá)'
                })
              )
            }
          >
            POST /advisor/chat (Màn hình 2)
          </Button>

          <Button
            variant="danger"
            size="sm"
            loading={apiLoading && activeEndpointLabel === 'SIMULATE 501 ERROR'}
            onClick={() =>
              handleInvokeApi('SIMULATE 501 ERROR', () =>
                api.get('/mock/error', { simulateError: true })
              )
            }
          >
            Mô phỏng lỗi 501 (Test Error &amp; Retry)
          </Button>
        </div>

        {apiLoading && <Loading label={`Đang thực thi ${activeEndpointLabel}...`} />}

        {apiError && !apiLoading && (
          <ErrorBox
            title={`Phản hồi lỗi từ ${activeEndpointLabel}`}
            error={apiError}
            onRetry={() =>
              handleInvokeApi('GET /api/v1/academic/status (Khôi phục sau Retry)', () =>
                api.academic.getStatus()
              )
            }
            retryLabel="Thử lại với GET /academic/status"
          />
        )}

        {apiResult && !apiLoading && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-2)',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                Kết quả phản hồi: <code>{activeEndpointLabel}</code>
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {apiResult.fixtureLabel && (
                  <span className="haui-badge haui-badge--warning">{apiResult.fixtureLabel}</span>
                )}
                {apiResult.regulationTag && (
                  <span className="haui-badge haui-badge--info">{apiResult.regulationTag}</span>
                )}
                {apiResult.__meta?.strippedUntrustedStudentId && (
                  <span className="haui-badge haui-badge--success">
                    Đã lọc bỏ studentId từ client body (Rule 6)
                  </span>
                )}
              </div>
            </div>
            <pre className="haui-code-block">{JSON.stringify(apiResult, null, 2)}</pre>
          </div>
        )}

        {!apiResult && !apiError && !apiLoading && (
          <EmptyState
            title="Chưa có lời gọi API nào được kích hoạt"
            description="Hãy chọn một trong các nút endpoint phía trên để kiểm tra luồng hoạt động của Singleton API Client."
            actionLabel="Gọi thử GET /academic/status ngay"
            onAction={() =>
              handleInvokeApi('GET /api/v1/academic/status', () => api.academic.getStatus())
            }
          />
        )}
      </Card>

      {/* Khu vực 2: Showcase Button & Modal */}
      <div className="haui-grid haui-grid--2">
        <Card
          title="2. Component: Button"
          subtitle="Hỗ trợ 4 variants (primary, secondary, danger, ghost), 3 kích cỡ (sm, md, lg), loading & disabled"
          footer={
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Số lần bấm thử nghiệm: <strong>{clickCount}</strong>
            </span>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
                VARIANTS (PRIMARY, SECONDARY, DANGER, GHOST)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <Button variant="primary" onClick={() => setClickCount((c) => c + 1)}>
                  Primary
                </Button>
                <Button variant="secondary" onClick={() => setClickCount((c) => c + 1)}>
                  Secondary
                </Button>
                <Button variant="danger" onClick={() => setClickCount((c) => c + 1)}>
                  Danger
                </Button>
                <Button variant="ghost" onClick={() => setClickCount((c) => c + 1)}>
                  Ghost
                </Button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
                KÍCH CỠ (SM, MD, LG)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Button variant="primary" size="sm" onClick={() => setClickCount((c) => c + 1)}>
                  Size SM
                </Button>
                <Button variant="primary" size="md" onClick={() => setClickCount((c) => c + 1)}>
                  Size MD
                </Button>
                <Button variant="primary" size="lg" onClick={() => setClickCount((c) => c + 1)}>
                  Size LG
                </Button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
                TRẠNG THÁI (LOADING & DISABLED)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <Button
                  variant="primary"
                  loading={btnLoading}
                  onClick={() => {
                    setBtnLoading(true);
                    setTimeout(() => setBtnLoading(false), 1200);
                  }}
                >
                  {btnLoading ? 'Đang xử lý...' : 'Bấm để thử Loading (1.2s)'}
                </Button>
                <Button variant="secondary" loading>
                  Đang tải cố định
                </Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="3. Component: Modal & Card"
          subtitle="Popup dialog hỗ trợ backdrop, nút đóng (×), phím tắt ESC và tự động khóa cuộn trang (scroll lock)"
          footer={
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Trạng thái Modal: <strong>{isModalOpen ? `Đang mở (${modalSize})` : 'Đang đóng'}</strong>
            </span>
          }
        >
          <p style={{ marginTop: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Chọn kích thước hộp thoại để kiểm tra khả năng khóa cuộn trang (<code>body overflow: hidden</code>) và đóng bằng phím <code>ESC</code>:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Button variant="primary" size="sm" onClick={() => handleOpenModal('sm')}>
              Mở Modal Nhỏ (SM)
            </Button>
            <Button variant="primary" size="sm" onClick={() => handleOpenModal('md')}>
              Mở Modal Vừa (MD)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleOpenModal('lg')}>
              Mở Modal Lớn (LG)
            </Button>
          </div>

          <div className="haui-grid haui-grid--2" style={{ gap: 'var(--space-3)' }}>
            <Card
              variant="status-success"
              padding="sm"
              title="Card thành công"
              subtitle="Biến thể status-success"
            >
              <span style={{ fontSize: 'var(--text-xs)' }}>Đã đạt chuẩn đầu ra Ngoại ngữ TOEIC 550.</span>
            </Card>
            <Card
              variant="status-warning"
              padding="sm"
              title="Card cảnh báo"
              subtitle="Biến thể status-warning"
            >
              <span style={{ fontSize: 'var(--text-xs)' }}>Nợ học phần tiên quyết Toán rời rạc (MATH1002).</span>
            </Card>
          </div>
        </Card>
      </div>

      {/* Khu vực 3: Showcase Table (kèm công tắc chuyển đổi Data / EmptyState / Loading / Error) */}
      <Card
        title="4. Component: Table (Tích hợp Custom Render, Loading, Error & EmptyState)"
        subtitle="Hiển thị bảng học phần mẫu, bảo toàn giá trị null/UNKNOWN theo Quy tắc 5 AGENTS.md"
        headerAction={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Button
              variant={tableViewMode === 'data' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTableViewMode('data')}
            >
              Có dữ liệu ({SAMPLE_COURSES.length})
            </Button>
            <Button
              variant={tableViewMode === 'empty' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTableViewMode('empty')}
            >
              Trạng thái Rỗng (EmptyState)
            </Button>
            <Button
              variant={tableViewMode === 'loading' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTableViewMode('loading')}
            >
              Trạng thái Loading
            </Button>
            <Button
              variant={tableViewMode === 'error' ? 'danger' : 'secondary'}
              size="sm"
              onClick={() => setTableViewMode('error')}
            >
              Trạng thái Error
            </Button>
          </div>
        }
      >
        <Table
          columns={tableColumns}
          data={tableViewMode === 'data' ? SAMPLE_COURSES : []}
          rowKey="courseCode"
          loading={tableViewMode === 'loading'}
          error={
            tableViewMode === 'error'
              ? {
                  code: 'DEMO_TABLE_TIMEOUT',
                  requestId: 'req-demo-9981',
                  message: 'Mô phỏng lỗi kết nối khi tải danh sách học phần để kiểm tra nút Retry trong Table.'
                }
              : null
          }
          onRetry={() => {
            setRetryCount((c) => c + 1);
            setTableViewMode('data');
          }}
          emptyTitle="Danh sách học phần đang trống"
          emptyDescription="Không tìm thấy học phần nào khớp với bộ lọc hiện tại."
          emptyAction={
            <Button variant="primary" size="sm" onClick={() => setTableViewMode('data')}>
              Khôi phục dữ liệu mẫu
            </Button>
          }
          striped
          hoverable
        />
      </Card>

      {/* Khu vực 4: Showcase độc lập Loading, Error, EmptyState */}
      <div className="haui-grid haui-grid--3">
        <Card title="5. Component: Loading" subtitle="Spinner (sm/md/lg) & Skeleton">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
              <Loading size="sm" label="SM" />
              <Loading size="md" label="MD" />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
                SKELETON PLACEHOLDER (3 DÒNG)
              </div>
              <Loading variant="skeleton" lines={3} />
            </div>
          </div>
        </Card>

        <Card
          title="6. Component: Error"
          subtitle="Thông báo lỗi kèm nút Retry"
          footer={
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Số lần bấm Retry: <strong>{retryCount}</strong>
            </span>
          }
        >
          <ErrorBox
            title="Lỗi đồng bộ điểm học kỳ"
            message="Không thể tải điểm GPA kỳ 2025_2 do cổng đào tạo đang bảo trì."
            code="UPSTREAM_UNAVAILABLE"
            requestId="req-audit-2026"
            details={['Dữ liệu GPA giữ trạng thái null / UNKNOWN theo Quy tắc 5']}
            onRetry={() => setRetryCount((c) => c + 1)}
          />
        </Card>

        <Card title="7. Component: EmptyState" subtitle="Hiển thị khi dữ liệu rỗng">
          <EmptyState
            title="Chưa có đề xuất học cải thiện"
            description="Sinh viên chưa chọn học kỳ mục tiêu để xếp hạng môn học cải thiện."
            actionLabel="Tạo dữ liệu mẫu"
            onAction={() =>
              handleInvokeApi('POST /api/v1/simulation/retake-ranking', () =>
                api.simulation.rankRetake({ maxCourses: 2 })
              )
            }
          />
        </Card>
      </div>

      {/* Modal hiển thị khi người dùng bấm mở trên trang Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRow(null);
        }}
        size={modalSize}
        title={
          selectedRow
            ? `Chi tiết Học phần: ${selectedRow.courseCode} — ${selectedRow.courseName}`
            : `Hộp thoại Modal mẫu (Kích thước: ${modalSize.toUpperCase()})`
        }
        subtitle="Nhấn phím ESC, bấm nút × hoặc click ra vùng nền tối bên ngoài để đóng"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedRow(null);
              }}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedRow(null);
              }}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        {selectedRow ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
            <div>
              <strong>Mã học phần:</strong> <code>{selectedRow.courseCode}</code>
            </div>
            <div>
              <strong>Tên học phần:</strong> {selectedRow.courseName}
            </div>
            <div>
              <strong>Số tín chỉ:</strong> {selectedRow.credits}
            </div>
            <div>
              <strong>Điều kiện tiên quyết:</strong> {selectedRow.prerequisite} (<code>DEMO_UNVERIFIED</code>)
            </div>
            <div>
              <strong>Điểm chữ ghi nhận:</strong>{' '}
              {selectedRow.letterGrade === null ? 'null / UNKNOWN (Chưa có dữ liệu điểm)' : selectedRow.letterGrade}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            <p style={{ marginTop: 0 }}>
              Component <code>&lt;Modal /&gt;</code> của bộ <strong>Shared UI V0</strong> đã tự động khóa thanh cuộn của trang chính (<code>document.body.style.overflow = &apos;hidden&apos;</code>) khi mở và khôi phục nguyên trạng khi đóng.
            </p>
            <p style={{ marginBottom: 0 }}>
              Thành phần này được xuất khẩu trong gói <code>&#123; api, ui &#125;</code> để TV3 tái sử dụng cho hộp thoại xác nhận kế hoạch học tập và chi tiết môn học.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DemoUiPage;
