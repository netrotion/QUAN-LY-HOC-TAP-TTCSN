import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, Table } from '../components/ui/index.js';
import {
  commitTranscriptRecords,
  convertScore10ToGrade,
  getAcademicSnapshot
} from '../services/academicStore.js';
import { api } from '../services/apiClient.js';
import { MOCK_TRANSCRIPT_INGESTION_PREVIEW } from '../services/mockFixtures.js';

/**
 * Màn hình Bóc tách & Nhập Bảng điểm (`/transcript` & `/academic/import`) — Task 2.2a
 * Luồng 3 bước:
 * Bước 1: Nạp dữ liệu (Tải file PDF/Ảnh từ e-HaUI, Demo file mẫu, Xử lý lỗi định dạng sai, Nhập tay)
 * Bước 2: Xem lại & Điều chỉnh (Review & Inline Edit các môn điểm thấp / nghi ngờ)
 * Bước 3: Xác nhận & Cập nhật kết quả (Confirm -> Ghi vào Store -> Chuyển hướng Dashboard)
 */
export function TranscriptImportPage() {
  const navigate = useNavigate();
  const initialSnapshot = getAcademicSnapshot();

  // Wizard Step: 1 = Nạp dữ liệu, 2 = Xem lại (Review), 3 = Xác nhận (Confirm)
  const [currentStep, setCurrentStep] = useState(1);

  // Tab nạp dữ liệu ở Bước 1: 'upload' (Tải file) | 'manual' (Nhập tay)
  const [inputMethod, setInputMethod] = useState('upload');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Danh sách các môn bóc tách / nhập tay (Editable trong Bước 2)
  const [draftRecords, setDraftRecords] = useState(() => {
    // Nếu sinh viên đã có bảng điểm thì khởi tạo từ bảng điểm hiện hành, nếu chưa thì rỗng
    return initialSnapshot.transcriptRecords.length > 0
      ? [...initialSnapshot.transcriptRecords]
      : [];
  });

  // Form thêm nhanh môn học ở bước nhập tay / bước xem lại
  const [newCourseForm, setNewCourseForm] = useState({
    courseCode: '',
    courseName: '',
    credits: 3,
    letterGrade: 'B',
    score10: 7.5
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // Xử lý nạp file demo mẫu e-HaUI
  const handleUseDemoFile = async () => {
    setUploadError(null);
    setIsProcessingFile(true);
    try {
      const res = await api.academic.ingestTranscript({
        fileName: 'Bang_Diem_eHaUI_Chuan_K17.pdf'
      });
      setDraftRecords(res.records || MOCK_TRANSCRIPT_INGESTION_PREVIEW.records);
      setSelectedFile({ name: 'Bang_Diem_eHaUI_Chuan_K17.pdf', size: '245 KB' });
      setCurrentStep(2); // Chuyển sang Bước 2: Xem lại
    } catch (err) {
      setUploadError(err.message || 'Lỗi xử lý file bảng điểm');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Mô phỏng nhánh xử lý lỗi tải file không đúng định dạng (.docx / .exe / .zip)
  const handleSimulateInvalidFile = async () => {
    setUploadError(null);
    setIsProcessingFile(true);
    try {
      await api.academic.ingestTranscript({
        fileName: 'Bang_Diem_Khong_Hop_Le.docx',
        invalidFormat: true
      });
    } catch (err) {
      setUploadError(
        err.message ||
          'Không tải được bảng điểm do lỗi định dạng file (.docx). Hệ thống chỉ chấp nhận file PDF hoặc Ảnh (PNG/JPG) xuất từ cổng e-HaUI.'
      );
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Xử lý người dùng chọn file thật từ máy
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const validExtensions = /\.(pdf|png|jpg|jpeg)$/i;

    if (!validExtensions.test(file.name)) {
      setUploadError(
        `Định dạng file "${file.name}" không được hỗ trợ! Vui lòng chọn tệp tin định dạng PDF hoặc Ảnh (PNG, JPG) xuất từ portal e-HaUI.`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setIsProcessingFile(true);

    // Giả lập bóc tách sau 400ms
    setTimeout(() => {
      setIsProcessingFile(false);
      setDraftRecords(MOCK_TRANSCRIPT_INGESTION_PREVIEW.records);
      setCurrentStep(2);
    }, 450);
  };

  // Chỉnh sửa điểm trực tiếp trên bảng ở Bước 2
  const handleUpdateRecord = (index, field, value) => {
    setDraftRecords((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };

      if (field === 'score10') {
        const converted = convertScore10ToGrade(value);
        target.letterGrade = converted.letterGrade;
        target.score4 = converted.score4;
        target.status = converted.status;
      } else if (field === 'letterGrade') {
        const gradeMap = {
          A: 4.0, 'B+': 3.5, B: 3.0, 'C+': 2.5, C: 2.0, 'D+': 1.5, D: 1.0, F: 0.0
        };
        const valUpper = String(value).toUpperCase().trim();
        target.letterGrade = valUpper;
        target.score4 = gradeMap[valUpper] ?? 2.0;
        target.status = valUpper === 'F' ? 'FAILED' : (valUpper === 'D' || valUpper === 'D+') ? 'PASSED_LOW' : 'PASSED';
      }

      updated[index] = target;
      return updated;
    });
  };

  // Xóa một môn khỏi danh sách xem lại
  const handleDeleteRecord = (index) => {
    setDraftRecords((prev) => prev.filter((_, i) => i !== index));
  };

  // Thêm môn học thủ công
  const handleAddCourseSubmit = (e) => {
    if (e) e.preventDefault();
    if (!newCourseForm.courseCode || !newCourseForm.courseName) return;

    const converted = convertScore10ToGrade(newCourseForm.score10);
    const newRecord = {
      courseCode: newCourseForm.courseCode.toUpperCase().trim(),
      courseName: newCourseForm.courseName.trim(),
      credits: Number(newCourseForm.credits || 3),
      score10: Number(newCourseForm.score10),
      letterGrade: newCourseForm.letterGrade || converted.letterGrade || 'B',
      score4: converted.score4 ?? 3.0,
      status: converted.status || 'PASSED'
    };

    setDraftRecords((prev) => [...prev, newRecord]);
    setNewCourseForm({
      courseCode: '',
      courseName: '',
      credits: 3,
      letterGrade: 'B',
      score10: 7.5
    });
    setShowAddModal(false);
  };

  // Xử lý xác nhận bảng điểm ở Bước 3
  const handleConfirmAndSave = () => {
    commitTranscriptRecords(draftRecords, {
      sourceFileName: selectedFile?.name || 'Nhap_Thu_Cong.csv'
    });

    navigate('/dashboard');
  };

  // Tính toán tóm tắt trước khi lưu
  const totalEarnedCredits = draftRecords
    .filter((r) => r.status !== 'FAILED' && r.letterGrade !== 'F')
    .reduce((sum, r) => sum + Number(r.credits || 0), 0);

  const gradedRecords = draftRecords.filter((r) => r.score4 !== null && r.score4 !== undefined);
  const totalPoints = gradedRecords.reduce((sum, r) => sum + Number(r.credits || 0) * Number(r.score4 || 0), 0);
  const totalGradedCredits = gradedRecords.reduce((sum, r) => sum + Number(r.credits || 0), 0);
  const projectedCpa = totalGradedCredits > 0 ? Number((totalPoints / totalGradedCredits).toFixed(2)) : 0;
  const failedCourses = draftRecords.filter((r) => r.status === 'FAILED' || r.letterGrade === 'F');

  // Columns cấu hình cho Bảng xem lại & chỉnh sửa inline (Bước 2)
  const reviewColumns = [
    {
      key: 'courseCode',
      title: 'Mã HP',
      width: '120px',
      render: (val, row, idx) => (
        <code style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{val}</code>
      )
    },
    {
      key: 'courseName',
      title: 'Tên học phần',
      render: (val) => <strong>{val}</strong>
    },
    {
      key: 'credits',
      title: 'Số TC',
      width: '90px',
      align: 'center',
      render: (val, row, idx) => (
        <input
          type="number"
          min="1"
          max="12"
          className="haui-input"
          style={{ width: '60px', textAlign: 'center', padding: '4px' }}
          value={val}
          onChange={(e) => handleUpdateRecord(idx, 'credits', Number(e.target.value))}
        />
      )
    },
    {
      key: 'score10',
      title: 'Điểm 10',
      width: '95px',
      align: 'center',
      render: (val, row, idx) => (
        <input
          type="number"
          step="0.1"
          min="0"
          max="10"
          className="haui-input"
          style={{ width: '65px', textAlign: 'center', padding: '4px' }}
          value={val ?? ''}
          placeholder="N/A"
          onChange={(e) => handleUpdateRecord(idx, 'score10', e.target.value === '' ? null : Number(e.target.value))}
        />
      )
    },
    {
      key: 'letterGrade',
      title: 'Điểm chữ',
      width: '100px',
      align: 'center',
      render: (val, row, idx) => (
        <select
          className="haui-input"
          style={{ width: '70px', padding: '4px', textAlign: 'center' }}
          value={val || ''}
          onChange={(e) => handleUpdateRecord(idx, 'letterGrade', e.target.value)}
        >
          <option value="">N/A</option>
          <option value="A">A (4.0)</option>
          <option value="B+">B+ (3.5)</option>
          <option value="B">B (3.0)</option>
          <option value="C+">C+ (2.5)</option>
          <option value="C">C (2.0)</option>
          <option value="D+">D+ (1.5)</option>
          <option value="D">D (1.0)</option>
          <option value="F">F (0.0)</option>
        </select>
      )
    },
    {
      key: 'score4',
      title: 'Thang 4',
      width: '80px',
      align: 'center',
      render: (val) => <strong>{val !== null && val !== undefined ? val : '—'}</strong>
    },
    {
      key: 'status',
      title: 'Đánh giá / Tình trạng',
      width: '150px',
      render: (_, row) => {
        if (row.letterGrade === 'F' || row.status === 'FAILED') {
          return <span className="haui-badge haui-badge--error">🚨 Nợ môn (F)</span>;
        }
        if (row.letterGrade === 'D' || row.letterGrade === 'D+') {
          return <span className="haui-badge haui-badge--warning">⚠️ Cần cải thiện</span>;
        }
        if (row.status === 'IN_PROGRESS' || !row.letterGrade) {
          return <span className="haui-badge haui-badge--neutral">⏳ Đang học</span>;
        }
        return <span className="haui-badge haui-badge--success">✓ Đạt môn</span>;
      }
    },
    {
      key: 'actions',
      title: 'Thao tác',
      width: '85px',
      align: 'center',
      render: (_, __, idx) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteRecord(idx)}
          style={{ color: 'var(--color-error)', padding: '2px 8px' }}
          title="Xóa môn này khỏi bảng điểm"
        >
          ✕
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>
            Nạp & Bóc Tách Bảng Điểm Cá Nhân (Transcript Ingestion)
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Hỗ trợ nhập tự động từ tệp PDF/Ảnh cổng đào tạo e-HaUI hoặc nhập thủ công từng môn học
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            &larr; Về Dashboard
          </Button>
        </div>
      </div>

      {/* Wizard Step Indicator (3 bước) */}
      <div className="haui-stepper-container">
        <div className={`haui-stepper-step ${currentStep >= 1 ? 'haui-stepper-step--active' : ''}`}>
          <div className="haui-stepper-circle">1</div>
          <div className="haui-stepper-text">
            <strong>Bước 1: Nạp Dữ Liệu</strong>
            <span>Tải file hoặc Nhập tay</span>
          </div>
        </div>
        <div className="haui-stepper-divider" />
        <div className={`haui-stepper-step ${currentStep >= 2 ? 'haui-stepper-step--active' : ''}`}>
          <div className="haui-stepper-circle">2</div>
          <div className="haui-stepper-text">
            <strong>Bước 2: Xem Lại & Điều Chỉnh</strong>
            <span>Kiểm tra & Sửa điểm</span>
          </div>
        </div>
        <div className="haui-stepper-divider" />
        <div className={`haui-stepper-step ${currentStep >= 3 ? 'haui-stepper-step--active' : ''}`}>
          <div className="haui-stepper-circle">3</div>
          <div className="haui-stepper-text">
            <strong>Bước 3: Xác Nhận & Cập Nhật</strong>
            <span>Ghi nhận vào Hồ sơ</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BƯỚC 1: NẠP DỮ LIỆU (Tải File hoặc Nhập tay)
          ========================================================================= */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Hướng dẫn khi chưa có bảng điểm (Empty State Guide) */}
          <Card title="Hướng dẫn xuất bảng điểm từ Cổng thông tin e-HaUI (Dành cho Sinh viên)" variant="surface">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              <div className="haui-guide-step">
                <span className="haui-guide-step-badge">1</span>
                <div>
                  <strong>Đăng nhập e-HaUI</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Truy cập portal <code>portal.haui.edu.vn</code> bằng tài khoản sinh viên của bạn.
                  </p>
                </div>
              </div>
              <div className="haui-guide-step">
                <span className="haui-guide-step-badge">2</span>
                <div>
                  <strong>Xuất Bảng Điểm Toàn Khóa</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Vào mục <em>Tra cứu kết quả học tập &rarr; In Bảng Điểm &rarr; Lưu dạng PDF hoặc chụp ảnh rõ nét.</em>
                  </p>
                </div>
              </div>
              <div className="haui-guide-step">
                <span className="haui-guide-step-badge">3</span>
                <div>
                  <strong>Tải Lên HaUI Advisor</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Kéo thả tệp PDF vào khung bên dưới để AI tự động nhận dạng điểm số và lập kế hoạch.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Toggle Chọn Phương Thức: Tải File vs Nhập Tay */}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant={inputMethod === 'upload' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setInputMethod('upload')}
            >
              📄 Tải File Bảng Điểm (PDF / Ảnh)
            </Button>
            <Button
              variant={inputMethod === 'manual' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setInputMethod('manual')}
            >
              ✍️ Nhập Thủ Công Từng Môn Học
            </Button>
          </div>

          {/* Nhánh 1: Tải File */}
          {inputMethod === 'upload' && (
            <Card title="Kéo thả hoặc Chọn Tệp Bảng Điểm" variant="surface">
              {uploadError && (
                <div className="haui-callout haui-callout--error" style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ fontWeight: 600 }}>⚠️ Lỗi tải bảng điểm</div>
                  <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>{uploadError}</div>
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <Button variant="secondary" size="sm" onClick={() => setUploadError(null)}>
                      Thử lại với tệp khác
                    </Button>
                  </div>
                </div>
              )}

              <div className="haui-dropzone">
                <div style={{ fontSize: '36px', marginBottom: 'var(--space-2)' }}>📑</div>
                <strong style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-primary)' }}>
                  Chọn hoặc Kéo thả tệp bảng điểm tại đây
                </strong>
                <p style={{ margin: '4px 0 var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                  Hỗ trợ: PDF, PNG, JPG (Dung lượng tối đa 10MB) xuất từ hệ thống e-HaUI
                </p>

                <input
                  type="file"
                  id="transcriptFileInput"
                  style={{ display: 'none' }}
                  accept=".pdf,image/png,image/jpeg"
                  onChange={handleFileChange}
                />
                <Button
                  variant="primary"
                  size="md"
                  disabled={isProcessingFile}
                  onClick={() => document.getElementById('transcriptFileInput')?.click()}
                >
                  {isProcessingFile ? 'Đang bóc tách dữ liệu...' : 'Chọn Tệp Tin Từ Máy Tính'}
                </Button>
              </div>

              {/* Fast Test Action Buttons */}
              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  🧪 Phím tắt thử nghiệm nhanh cho Giảng viên & Hội đồng Đánh giá:
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUseDemoFile}
                    disabled={isProcessingFile}
                    title="Nạp ngay 7 môn học mẫu chuẩn K17 để test luồng review"
                  >
                    ⚡ Dùng File Demo Mẫu (e-HaUI PDF)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSimulateInvalidFile}
                    disabled={isProcessingFile}
                    style={{ color: 'var(--color-error)' }}
                    title="Kiểm thử nhánh bắt lỗi định dạng file sai quy chuẩn (.docx)"
                  >
                    ⚠️ Mô phỏng File Sai Định Dạng (.docx)
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Nhánh 2: Nhập Tay (Manual Entry) */}
          {inputMethod === 'manual' && (
            <Card title="Nhập Thủ Công Kết Quả Các Môn Học Đã Tích Lũy" variant="surface">
              <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Nếu chưa có file xuất từ e-HaUI, bạn có thể tự nhập danh sách các môn đã học.
                Sau đó chuyển sang Bước 2 để rà soát lại.
              </p>

              {draftRecords.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title="Chưa có môn học nào được thêm"
                  description="Hãy thêm môn học đầu tiên để bắt đầu tính toán điểm CPA và tín chỉ tích lũy."
                  actionLabel="+ Thêm Môn Học Đầu Tiên"
                  onAction={() => setShowAddModal(true)}
                />
              ) : (
                <div>
                  <Table
                    columns={reviewColumns.filter((c) => c.key !== 'actions')}
                    data={draftRecords}
                    rowKey="courseCode"
                  />
                  <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between' }}>
                    <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
                      + Thêm Môn Học Khác
                    </Button>
                    <Button variant="primary" size="md" onClick={() => setCurrentStep(2)}>
                      Tiếp Tục Sang Bước 2: Xem Lại &rarr;
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* =========================================================================
          BƯỚC 2: XEM LẠI & ĐIỀU CHỈNH (REVIEW STATE)
          ========================================================================= */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Banner Thông Báo Bóc Tách Thành Công */}
          <div className="haui-callout haui-callout--success">
            <div style={{ fontWeight: 600 }}>
              ✓ Bóc tách thành công {draftRecords.length} học phần từ nguồn dữ liệu!
            </div>
            <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
              Vui lòng kiểm tra lại điểm số. Bạn có thể <strong>sửa trực tiếp số tín chỉ, điểm chữ hoặc điểm 10</strong> trên từng dòng bên dưới trước khi xác nhận lưu vào hệ thống.
            </div>
          </div>

          {/* Cảnh báo các môn nợ / điểm thấp cần chú ý */}
          {failedCourses.length > 0 && (
            <div className="haui-callout haui-callout--warning">
              <strong>⚠️ Phát hiện {failedCourses.length} môn học nợ / điểm F:</strong>
              <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
                Học phần: {failedCourses.map((f) => `${f.courseCode} (${f.courseName})`).join(', ')}.
                Hệ thống sẽ tự động đưa các môn này vào danh sách ưu tiên gỡ nợ trong Kế hoạch học tập.
              </div>
            </div>
          )}

          {/* Bảng Dữ Liệu Review có khả năng Inline Edit */}
          <Card
            title={`Bảng Điểm Bóc Tách (${draftRecords.length} môn học)`}
            variant="surface"
            extra={
              <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
                + Thêm Học Phần Mới
              </Button>
            }
          >
            <Table columns={reviewColumns} data={draftRecords} rowKey="courseCode" />
          </Card>

          {/* Thanh Nút Điều Hướng Bước 2 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="secondary" size="md" onClick={() => setCurrentStep(1)}>
              &larr; Quay Lại Chọn Tệp Khác
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={draftRecords.length === 0}
              onClick={() => setCurrentStep(3)}
            >
              Tiếp Tục Sang Bước 3: Xác Nhận & Cập Nhật &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* =========================================================================
          BƯỚC 3: XÁC NHẬN & CẬP NHẬT KẾT QUẢ (CONFIRM STATE)
          ========================================================================= */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Card title="Xác Nhận & Cập Nhật Kết Quả Vào Hồ Sơ Học Vụ" variant="status-primary">
            <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Kiểm tra các chỉ số tổng hợp được tính toán tự động từ bảng điểm bạn vừa đối soát.
              Khi bấm <strong>"Xác nhận & Cập nhật kết quả"</strong>, dữ liệu Dashboard và Cây môn học sẽ đồng bộ ngay lập tức.
            </p>

            {/* Thẻ chỉ số tổng kết mới */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <div className="haui-metric-tile">
                <span className="haui-metric-tile__label">CPA Mới Tính Toán</span>
                <span className="haui-metric-tile__value" style={{ color: projectedCpa < 2.0 ? 'var(--color-error)' : 'var(--color-primary)' }}>
                  {projectedCpa.toFixed(2)}
                </span>
                <span className="haui-metric-tile__desc">
                  {projectedCpa >= 3.2 ? 'Giỏi' : projectedCpa >= 2.5 ? 'Khá' : projectedCpa >= 2.0 ? 'Trung bình' : 'Yếu (Cảnh báo)'}
                </span>
              </div>

              <div className="haui-metric-tile">
                <span className="haui-metric-tile__label">Tín Chỉ Đã Tích Lũy</span>
                <span className="haui-metric-tile__value">{totalEarnedCredits} / 135</span>
                <span className="haui-metric-tile__desc">
                  Đạt {((totalEarnedCredits / 135) * 100).toFixed(1)}% tiến độ CTĐT
                </span>
              </div>

              <div className="haui-metric-tile">
                <span className="haui-metric-tile__label">Tổng Số Môn Học</span>
                <span className="haui-metric-tile__value">{draftRecords.length}</span>
                <span className="haui-metric-tile__desc">
                  {draftRecords.filter((r) => r.status === 'PASSED').length} đạt &bull; {failedCourses.length} nợ
                </span>
              </div>

              <div className="haui-metric-tile">
                <span className="haui-metric-tile__label">Trạng Thái Học Vụ Dự Kiến</span>
                <span className="haui-metric-tile__value" style={{ fontSize: 'var(--text-lg)' }}>
                  {projectedCpa < 2.0 || failedCourses.length > 0 ? '⚠️ Cảnh báo Mức 1' : '✓ Bình thường'}
                </span>
                <span className="haui-metric-tile__desc">Theo quy chế HaUI BR-07</span>
              </div>
            </div>

            {/* Cảnh báo nợ môn nếu có */}
            {failedCourses.length > 0 && (
              <div className="haui-callout haui-callout--error" style={{ marginBottom: 'var(--space-4)' }}>
                <strong>Lưu ý quan trọng trước khi lưu:</strong>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)' }}>
                  Bạn đang có {failedCourses.length} môn học bị điểm F ({failedCourses.map((f) => f.courseCode).join(', ')}).
                  Sau khi lưu, hệ thống sẽ tự động cập nhật Sơ đồ Cây môn học sang trạng thái Đỏ (Blocked) cho các môn học sau môn này.
                </p>
              </div>
            )}

            {/* Nút Hành Động Xác Nhận */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
              <Button variant="secondary" size="md" onClick={() => setCurrentStep(2)}>
                &larr; Quay Lại Điều Chỉnh Thêm
              </Button>
              <Button variant="primary" size="md" onClick={handleConfirmAndSave}>
                ✓ Xác Nhận & Cập Nhật Kết Quả Ngay
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Thêm Môn Học Mới */}
      {showAddModal && (
        <div className="haui-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="haui-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="haui-modal-header">
              <h3>Thêm Môn Học Mới</h3>
              <button className="haui-modal-close" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCourseSubmit}>
              <div className="haui-modal-body">
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="haui-form-label">Mã học phần:</label>
                  <input
                    type="text"
                    className="haui-input"
                    value={newCourseForm.courseCode}
                    placeholder="VD: IT6001, MATH1002"
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, courseCode: e.target.value })}
                    required
                  />
                </div>
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="haui-form-label">Tên học phần:</label>
                  <input
                    type="text"
                    className="haui-input"
                    value={newCourseForm.courseName}
                    placeholder="VD: Cấu trúc dữ liệu và giải thuật"
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, courseName: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <label className="haui-form-label">Số tín chỉ:</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      className="haui-input"
                      value={newCourseForm.credits}
                      onChange={(e) => setNewCourseForm({ ...newCourseForm, credits: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="haui-form-label">Điểm 10:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      className="haui-input"
                      value={newCourseForm.score10}
                      onChange={(e) => setNewCourseForm({ ...newCourseForm, score10: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="haui-form-label">Điểm chữ:</label>
                    <select
                      className="haui-input"
                      value={newCourseForm.letterGrade}
                      onChange={(e) => setNewCourseForm({ ...newCourseForm, letterGrade: e.target.value })}
                    >
                      <option value="A">A (4.0)</option>
                      <option value="B+">B+ (3.5)</option>
                      <option value="B">B (3.0)</option>
                      <option value="C+">C+ (2.5)</option>
                      <option value="C">C (2.0)</option>
                      <option value="D+">D+ (1.5)</option>
                      <option value="D">D (1.0)</option>
                      <option value="F">F (0.0)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="haui-modal-footer">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Hủy
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Thêm Vào Bảng Điểm
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TranscriptImportPage;
