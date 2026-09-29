import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { REQUIRED_UI_COMPONENT_NAMES, UI_API_CONTRACT_VERSION } from '../routes/tv3RouteContract.js';
import { HAUI_GRADE_SCALE_BR05, OPTIMIZER_WEIGHTS } from '../services/mockFixtures.js';

/**
 * 4 Gợi ý câu hỏi thông minh (Quick Prompt Pills) chuẩn Màn hình 2 UI Flow
 */
const QUICK_PROMPTS_MAN_2 = Object.freeze([
  'Tư vấn lộ trình kỳ tới để kéo CPA lên >= 2.50 (bằng Khá).',
  'Tôi vừa trượt môn Giải tích 2 / Toán rời rạc, kỳ sau bị ảnh hưởng thế nào?',
  'Lên lộ trình học vượt 3.5 năm ngành CNTT.',
  'Kỳ này nên học cải thiện môn nào tốt nhất?'
]);

/**
 * Màn hình Fallback Placeholder thông minh cho các Route thuộc phạm vi TV3 (Màn 2, Màn 3, Màn 5, Màn 6-7-8)
 * khi gói `@haui/planner-ui` đang ở trạng thái V0 (`NOT_IMPLEMENTED`).
 *
 * Minh họa đầy đủ luồng UI Flow (Màn 2: AI Chat, Màn 3: Kết quả Đề xuất, Màn 5: Xác nhận Kế hoạch 10-24 TC,
 * Màn 6-7-8: What-if / Retake ROI / Tính điểm ngược) thông qua chính bộ `{ api, ui }` được truyền qua DI.
 */
export function Tv3FallbackPage({ routeSpec, api, ui, contractStatus }) {
  const navigate = useNavigate();
  const { Button, Card, Table, Loading, Error: ErrorBox, EmptyState, Modal } = ui;

  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  // State cho Màn hình 2 (Quick Prompt)
  const [selectedPrompt, setSelectedPrompt] = useState(QUICK_PROMPTS_MAN_2[0]);

  // State cho Màn hình 5 (Kiểm tra giới hạn tín chỉ 10 - 24 TC theo BR-03 / BR-04)
  const [plannedCredits, setPlannedCredits] = useState(18);
  const [planCommitted, setPlanCommitted] = useState(false);

  // State cho Màn hình 6-7-8 (Chọn kịch bản What-if)
  const [whatIfMode, setWhatIfMode] = useState('grades'); // 'grades' | 'retake' | 'target'

  const handlePreviewContractApi = async (customPayload = {}) => {
    setLoading(true);
    setError(null);
    try {
      let result;
      switch (routeSpec.key) {
        case 'chat':
          result = await api.advisor.chat({
            message: customPayload.message || selectedPrompt
          });
          break;
        case 'recommendations':
          result = await api.planner.generate({ targetSemester: '2026_1' });
          break;
        case 'what-if':
          if ( (customPayload.mode || whatIfMode) === 'retake') {
            result = await api.simulation.rankRetake({ maxCourses: 3 });
          } else if ((customPayload.mode || whatIfMode) === 'target') {
            result = await api.simulation.calculateTargetGrades({ targetCpa: 3.2 });
          } else {
            result = await api.simulation.simulateGrades({
              courses: [{ courseCode: 'MATH1002', credits: 3, expectedGrade: 'B' }]
            });
          }
          break;
        case 'planner':
        default:
          if (customPayload.action === 'validate') {
            result = await api.planner.validate({
              totalCredits: customPayload.totalCredits ?? plannedCredits
            });
          } else {
            result = await api.planner.generate({ targetSemester: '2026_1' });
          }
          break;
      }
      setPreviewData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const contractRows = REQUIRED_UI_COMPONENT_NAMES.map((name) => ({
    id: name,
    componentName: `<${name} />`,
    injected: typeof ui?.[name] === 'function' ? 'READY' : 'MISSING',
    purpose: {
      Button: 'Nút tương tác (primary, secondary, danger, ghost; sm, md, lg; loading, disabled)',
      Card: 'Khung nội dung phân vùng (header, body, footer, status variants)',
      Table: 'Bảng dữ liệu học phần/kế hoạch hỗ trợ custom column render & EmptyState',
      Modal: 'Hộp thoại popup có backdrop, phím ESC và khóa cuộn trang',
      Loading: 'Trạng thái chờ dữ liệu (spinner, skeleton, inline)',
      Error: 'Hiển thị lỗi chuẩn hóa kèm mã requestId và nút Retry',
      EmptyState: 'Minh họa trạng thái danh sách rỗng kèm nút hành động'
    }[name]
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <Card
        variant="status-info"
        title={routeSpec.title}
        subtitle={`Route: ${routeSpec.path} • Phụ trách: ${routeSpec.owner}`}
        headerAction={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span className="haui-badge haui-badge--warning">TV3 FALLBACK ({routeSpec.status})</span>
            <span className="haui-badge haui-badge--primary">{UI_API_CONTRACT_VERSION}</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Mount tự động qua <code>createStudentRoutes(&#123; api, ui &#125;)</code> không vòng phụ thuộc.
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="secondary" size="sm" onClick={() => setIsContractModalOpen(true)}>
                Kiểm tra DI Contract &#123; api, ui &#125;
              </Button>
              <Link to="/demo-ui">
                <Button variant="ghost" size="sm">
                  Mở trang Demo UI V0 &rarr;
                </Button>
              </Link>
            </div>
          </div>
        }
      >
        {/* Giao diện chuyên biệt theo từng Màn hình trong Tài liệu Thiết kế UI Flow */}
        {routeSpec.key === 'chat' && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              MÀN HÌNH 2 UI FLOW — KHỐI GỢI Ý CÂU HỎI THÔNG MINH (QUICK PROMPT PILLS):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {QUICK_PROMPTS_MAN_2.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="haui-prompt-pill"
                  onClick={() => {
                    setSelectedPrompt(prompt);
                    handlePreviewContractApi({ message: prompt });
                  }}
                >
                  ✨ {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {routeSpec.key === 'recommendations' && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              MÀN HÌNH 3 UI FLOW &amp; PHỤ LỤC 13.1 — TRỌNG SỐ THUẬT TOÁN XẾP LỊCH MÔN HỌC TỐI ƯU:
            </div>
            <Table
              columns={[
                { key: 'criterion', title: 'Tiêu chí ưu tiên' },
                {
                  key: 'weight',
                  title: 'Trọng số',
                  width: '110px',
                  align: 'center',
                  render: (w) => <span className="haui-badge haui-badge--primary">{w}</span>
                },
                { key: 'purpose', title: 'Mục đích nghiệp vụ' }
              ]}
              data={OPTIMIZER_WEIGHTS}
              rowKey="criterion"
              striped
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: '12px', flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm" onClick={() => navigate('/curriculum')}>
                🌳 Xem Sơ đồ cây môn học (Màn hình 4)
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/planner')}>
                ✏️ Tùy chỉnh &amp; Xác nhận kế hoạch (Màn hình 5)
              </Button>
            </div>
          </div>
        )}

        {routeSpec.key === 'planner' && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              MÀN HÌNH 5 UI FLOW &amp; PHỤ LỤC 13.2 — TRÌNH THẨM ĐỊNH QUY CHẾ TỨC THỜI (10 – 24 TÍN CHỈ / BR-03 &amp; BR-04):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center', marginBottom: '12px' }}>
              <Button
                variant={plannedCredits === 18 ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setPlannedCredits(18);
                  handlePreviewContractApi({ action: 'validate', totalCredits: 18 });
                }}
              >
                ✓ Thử 18/24 TC (Hợp lệ cân bằng)
              </Button>
              <Button
                variant={plannedCredits === 6 ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => {
                  setPlannedCredits(6);
                  handlePreviewContractApi({ action: 'validate', totalCredits: 6 });
                }}
              >
                ⚠️ Thử 6 TC (&lt; 10 TC: Vi phạm sàn BR-03)
              </Button>
              <Button
                variant={plannedCredits === 27 ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => {
                  setPlannedCredits(27);
                  handlePreviewContractApi({ action: 'validate', totalCredits: 27 });
                }}
              >
                ⚠️ Thử 27 TC (&gt; 24 TC: Vượt trần BR-04)
              </Button>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', marginLeft: '8px' }}>
                <input
                  type="checkbox"
                  checked={planCommitted}
                  onChange={(e) => setPlanCommitted(e.target.checked)}
                />
                <strong>Tôi đồng ý với kế hoạch học tập này</strong>
              </label>
            </div>
          </div>
        )}

        {routeSpec.key === 'what-if' && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              LUỒNG CHÍNH 2 (MÀN HÌNH 6, 7, 8 UI FLOW) — MÔ PHỎNG &amp; TỐI ƯU ĐIỂM SỐ WHAT-IF:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: '12px' }}>
              <Button
                variant={whatIfMode === 'grades' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setWhatIfMode('grades');
                  handlePreviewContractApi({ mode: 'grades' });
                }}
              >
                Màn hình 6: Giả lập điểm kỳ tới (CPA 2.45 → 2.58)
              </Button>
              <Button
                variant={whatIfMode === 'retake' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setWhatIfMode('retake');
                  handlePreviewContractApi({ mode: 'retake' });
                }}
              >
                Màn hình 7: Tối ưu học cải thiện (Retake ROI - BR-06)
              </Button>
              <Button
                variant={whatIfMode === 'target' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setWhatIfMode('target');
                  handlePreviewContractApi({ mode: 'target' });
                }}
              >
                Màn hình 8: Tính điểm mục tiêu ngược (CPA &ge; 3.20)
              </Button>
            </div>

            <Table
              columns={[
                { key: 'letter', title: 'Điểm chữ', width: '90px', align: 'center' },
                {
                  key: 'score10Range',
                  title: 'Thang điểm 10',
                  width: '140px',
                  align: 'center',
                  render: (_, row) => `${row.minScore10} – ${row.maxScore10}`
                },
                { key: 'score4', title: 'Thang điểm 4', width: '120px', align: 'center' },
                { key: 'classification', title: 'Phân loại & Quy định học cải thiện (BR-05 / BR-06)' }
              ]}
              data={HAUI_GRADE_SCALE_BR05}
              rowKey="letter"
              striped
            />
          </div>
        )}

        <EmptyState
          title={`Phân hệ "${routeSpec.title}" đang chạy ở chế độ Fallback V0`}
          description={`${routeSpec.description} Web Host (TV2) đã truyền sẵn { api, ui } qua createStudentRoutes({ api, ui }) để TV3 triển khai chi tiết tại Task 1.4.`}
          action={
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="primary"
                loading={loading}
                onClick={() => handlePreviewContractApi()}
              >
                Gọi thử API hợp đồng ({routeSpec.endpointPreview})
              </Button>
              {previewData && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPreviewData(null);
                    setError(null);
                  }}
                >
                  Xóa kết quả thử nghiệm
                </Button>
              )}
            </div>
          }
        />

        {loading && (
          <Loading
            label={
              routeSpec.key === 'chat'
                ? 'AI đang đối chiếu khung CTĐT và bảng điểm cá nhân...'
                : `Đang gọi ${routeSpec.endpointPreview} qua Singleton API Client...`
            }
          />
        )}

        {error && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <ErrorBox
              title={`Lỗi khi gọi ${routeSpec.endpointPreview}`}
              error={error}
              onRetry={() => handlePreviewContractApi()}
            />
          </div>
        )}

        {previewData && !loading && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: 'var(--text-sm)' }}>
                Phản hồi từ Singleton API Client ({previewData.__meta?.mode || 'MOCK'}):
              </strong>
              {previewData.fixtureLabel && (
                <span className="haui-badge haui-badge--warning">{previewData.fixtureLabel}</span>
              )}
            </div>
            <pre className="haui-code-block">{JSON.stringify(previewData, null, 2)}</pre>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        title="Chi tiết Hợp đồng Bàn giao ui-api-v0 (TV2 → TV3)"
        subtitle="Danh sách các thành phần được truyền vào createStudentRoutes({ api, ui })"
        size="lg"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsContractModalOpen(false)}>
            Đóng (ESC)
          </Button>
        }
      >
        <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
          Trạng thái kiểm định hợp đồng:{' '}
          <span className={`haui-badge ${contractStatus?.valid ? 'haui-badge--success' : 'haui-badge--error'}`}>
            {contractStatus?.valid ? 'PASS (Đầy đủ 7 UI Components & Singleton API)' : 'INVALID'}
          </span>
        </div>
        <Table
          columns={[
            { key: 'componentName', title: 'Component UI', width: '160px' },
            {
              key: 'injected',
              title: 'Trạng thái DI',
              width: '130px',
              render: (val) => (
                <span className={`haui-badge ${val === 'READY' ? 'haui-badge--success' : 'haui-badge--error'}`}>
                  {val}
                </span>
              )
            },
            { key: 'purpose', title: 'Mô tả kỹ thuật' }
          ]}
          data={contractRows}
          striped
        />
      </Modal>
    </div>
  );
}

export default Tv3FallbackPage;
