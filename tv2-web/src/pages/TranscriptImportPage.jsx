import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, Table, Select } from '../components/ui/index.js';
import {
  commitTranscriptRecords,
  convertScore10ToGrade,
  getAcademicSnapshot
} from '../services/academicStore.js';
import { computeServerAcademicMetrics } from '../services/mockAcademicService.js';
import { api } from '../services/apiClient.js';
import { MOCK_TRANSCRIPT_INGESTION_PREVIEW } from '../services/mockFixtures.js';

/**
 * Màn hình Bóc tách & Nhập Bảng điểm (`/transcript` & `/academic/import`) — Task 2.2a
 * Tái thiết kế toàn diện theo Prototype "Clinical Blueprint on Frosted Paper":
 * - Stepper 3 bước với capsule pill layout
 * - Phương thức 1: Kéo thả Dropzone tệp (.xlsx, .csv, .pdf) có feedback tự động
 * - Phương thức 2: Nhập thủ công & bộ lọc giai đoạn đào tạo (Học kỳ 1..6)
 * - Validation Preview Banner Box đối soát dữ liệu & kiểm tra tính hợp lệ
 * - Bảng dữ liệu bảng điểm với chức năng Inline Edit (sửa điểm 10, điểm chữ, tín chỉ)
 * - Thẻ chỉ số tổng kết CPA & Tín chỉ tích lũy trước khi xác nhận cập nhật
 */
const LETTER_GRADE_TO_SCORE4 = Object.freeze({
  A: 4.0,
  'B+': 3.5,
  B: 3.0,
  'C+': 2.5,
  C: 2.0,
  'D+': 1.5,
  D: 1.0,
  F: 0.0
});

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

  // Search & Filter trong bảng dữ liệu
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('ALL');

  // Danh sách các môn bóc tách / nhập tay (Editable trong Bước 2)
  const [draftRecords, setDraftRecords] = useState(() => {
    return initialSnapshot.transcriptRecords.length > 0
      ? [...initialSnapshot.transcriptRecords]
      : [];
  });

  // Form thêm nhanh môn học ở bước nhập tay / bước xem lại
  const [newCourseForm, setNewCourseForm] = useState({
    courseCode: '',
    courseName: '',
    credits: 3,
    semester: 6,
    score4: 3.0,
    letterGrade: 'B'
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

  // Mô phỏng nhánh xử lý lỗi tải file không đúng định dạng (Mô phỏng File Sai Định Dạng - .docx / .exe / .zip)
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

  // Xử lý người dùng chọn file từ máy
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const validExtensions = /\.(pdf|png|jpg|jpeg|xlsx|xls|csv)$/i;

    if (!validExtensions.test(file.name)) {
      setUploadError(
        `Định dạng file "${file.name}" không được hỗ trợ! Vui lòng chọn tệp tin định dạng PDF, Excel (.xlsx, .csv) hoặc Ảnh xuất từ portal e-HaUI.`
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
        target.status = converted.status;
      } else if (field === 'letterGrade') {
        const valUpper = String(value).toUpperCase().trim();
        target.letterGrade = valUpper;
        target.status =
          valUpper === 'F' ? 'FAILED' : valUpper === 'D' || valUpper === 'D+' ? 'PASSED_LOW' : 'PASSED';
      }

      updated[index] = target;
      return updated;
    });
  };

  // Xóa một môn khỏi danh sách xem lại
  const handleDeleteRecord = (index) => {
    setDraftRecords((prev) => prev.filter((_, i) => i !== index));
  };

  // Xóa toàn bộ môn
  const handleClearAllRecords = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả môn học trong danh sách đối soát?')) {
      setDraftRecords([]);
    }
  };

  // Thêm môn học thủ công
  const handleAddCourseSubmit = (e) => {
    if (e) e.preventDefault();
    if (!newCourseForm.courseCode || !newCourseForm.courseName) return;

    const letter = newCourseForm.letterGrade || 'B';
    const score4Val = Number(newCourseForm.score4 !== undefined && newCourseForm.score4 !== '' ? newCourseForm.score4 : (LETTER_GRADE_TO_SCORE4[letter] ?? 3.0));
    const isFailed = letter === 'F' || score4Val === 0;

    const newRecord = {
      courseCode: newCourseForm.courseCode.toUpperCase().trim(),
      courseName: newCourseForm.courseName.trim(),
      credits: Number(newCourseForm.credits || 3),
      semester: Number(newCourseForm.semester || 6),
      score4: score4Val,
      gradePoint: score4Val,
      score10: Number((score4Val * 2.5).toFixed(1)),
      letterGrade: letter,
      status: isFailed ? 'FAILED' : 'PASSED'
    };

    setDraftRecords((prev) => [...prev, newRecord]);
    setNewCourseForm({
      courseCode: '',
      courseName: '',
      credits: 3,
      semester: 6,
      score4: 3.0,
      letterGrade: 'B'
    });
    setShowAddModal(false);
  };

  // Xử lý xác nhận bảng điểm ở Bước 3
  const handleConfirmAndSave = () => {
    commitTranscriptRecords(draftRecords, {
      fileName: selectedFile?.name || 'Nhap_Thu_Cong.csv'
    });
    navigate('/dashboard');
  };

  // Tính toán tóm tắt từ Server Mock Service (không tự tính toán ở client)
  const serverSummary = computeServerAcademicMetrics(draftRecords);
  const totalEarnedCredits = serverSummary.accumulatedCredits;
  const projectedCpa = serverSummary.cpa ?? 0;
  const failedCourses = serverSummary.failedCourses;

  // Lọc môn theo từ khóa tìm kiếm và học kỳ
  const filteredRecords = draftRecords.filter((rec) => {
    if (selectedSemesterFilter !== 'ALL' && rec.semester && String(rec.semester) !== String(selectedSemesterFilter)) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const codeMatch = rec.courseCode?.toLowerCase().includes(q);
      const nameMatch = rec.courseName?.toLowerCase().includes(q);
      return codeMatch || nameMatch;
    }
    return true;
  });

  return (
    <div className="haui-page-container">
      {/* 1. Header & Page Title */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
            <span
              style={{ cursor: 'pointer', color: 'var(--color-ink)' }}
              onClick={() => navigate('/dashboard')}
            >
              Trang chủ
            </span>
            <span>/</span>
            <span style={{ color: 'var(--color-mid-gray)' }}>Nhập bảng điểm cá nhân</span>
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Nhập &amp; Quản lý bảng điểm
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-mid-gray)', maxWidth: '680px' }}>
            Tải lên tệp bảng điểm cá nhân hoặc nhập điểm thủ công để hệ thống kiểm tra tính hợp lệ, tính toán GPA/CPA và tư vấn điều kiện học phần.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="haui-pill-btn-paper"
            onClick={() => navigate('/dashboard')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            <span>Về Dashboard</span>
          </button>
        </div>
      </div>

      {/* 2. Wizard Stepper Indicator (3 Bước) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: 'var(--color-paper)',
          borderRadius: 'var(--heroui-radius-xl, 24px)',
          border: '1px solid var(--color-hairline)',
          boxShadow: 'var(--heroui-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04))'
        }}
      >
        {/* Step 1 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            opacity: currentStep >= 1 ? 1 : 0.5,
            cursor: 'pointer'
          }}
          onClick={() => setCurrentStep(1)}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              backgroundColor: currentStep >= 1 ? 'var(--color-ink)' : 'var(--color-canvas)',
              color: currentStep >= 1 ? 'var(--color-paper)' : 'var(--color-mid-gray)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px'
            }}
          >
            1
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '14px', color: 'var(--color-ink)' }}>Bước 1: Nạp Dữ Liệu</strong>
            <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Tải file hoặc Nhập tay</span>
          </div>
        </div>

        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-hairline)', margin: '0 20px' }} />

        {/* Step 2 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            opacity: currentStep >= 2 ? 1 : 0.5,
            cursor: draftRecords.length > 0 ? 'pointer' : 'default'
          }}
          onClick={() => draftRecords.length > 0 && setCurrentStep(2)}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              backgroundColor: currentStep >= 2 ? 'var(--color-ink)' : 'var(--color-canvas)',
              color: currentStep >= 2 ? 'var(--color-paper)' : 'var(--color-mid-gray)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px'
            }}
          >
            2
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '14px', color: 'var(--color-ink)' }}>{'Bước 2: Xem Lại & Điều Chỉnh'}</strong>
            <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Kiểm tra &amp; Sửa điểm</span>
          </div>
        </div>

        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-hairline)', margin: '0 20px' }} />

        {/* Step 3 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            opacity: currentStep >= 3 ? 1 : 0.5
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              backgroundColor: currentStep >= 3 ? 'var(--color-ink)' : 'var(--color-canvas)',
              color: currentStep >= 3 ? 'var(--color-paper)' : 'var(--color-mid-gray)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px'
            }}
          >
            3
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '14px', color: 'var(--color-ink)' }}>{'Bước 3: Xác Nhận & Cập Nhật'}</strong>
            <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Ghi nhận vào Hồ sơ</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BƯỚC 1: NẠP DỮ LIỆU (Tải File hoặc Nhập tay)
          ========================================================================= */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 2 Cột Phương thức nạp dữ liệu */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            {/* Phương thức 1: Tải file tự động (7 cols) */}
            <div className="haui-stat-card" style={{ gridColumn: 'span 7', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                    Phương thức 1: Nhập bảng điểm tự động
                  </h2>
                </div>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-mid-gray)' }}>
                  Hỗ trợ .xlsx, .csv, .pdf
                </span>
              </div>

              {uploadError && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error-border)',
                    color: 'var(--color-error-text)',
                    fontSize: '13px'
                  }}
                >
                  <strong>⚠️ Lỗi tải bảng điểm:</strong> {uploadError}
                </div>
              )}

              {/* Dropzone Area */}
              <div
                style={{
                  borderRadius: '20px',
                  padding: '32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--color-surface-alt)',
                  border: '1px dashed var(--color-hairline)',
                  transition: 'background-color 0.15s ease'
                }}
                onClick={() => document.getElementById('transcriptFileInput')?.click()}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-paper)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-ink)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                    marginBottom: '12px'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>cloud_upload</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>
                  Kéo thả tệp tin hoặc nhấn để chọn
                </p>
                <input
                  type="file"
                  id="transcriptFileInput"
                  style={{ display: 'none' }}
                  accept=".pdf,image/png,image/jpeg,.xlsx,.xls,.csv"
                  onChange={handleFileChange}
                />
              </div>

              {/* Upload Simulated Status Card */}
              {selectedFile ? (
                <div style={{ backgroundColor: 'var(--color-surface-alt)', borderRadius: '18px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '9999px', backgroundColor: 'var(--color-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)', flexShrink: 0, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedFile.name}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                        Đã tải lên và trích xuất thành công {draftRecords.length} môn học
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)' }}>Sẵn sàng</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Phương thức 2: Nhập thủ công & Điều chỉnh (5 cols) */}
            <div className="haui-stat-card" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                    Phương thức 2: Nhập thủ công &amp; Điều chỉnh
                  </h2>
                </div>
                <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--color-mid-gray)', lineHeight: 1.5 }}>
                  Bổ sung môn học chuyển đổi điểm, môn học lại hoặc chỉnh sửa trực tiếp thông tin điểm từng học phần.
                </p>

                {/* Hộp thông tin tính năng nhập liệu */}
                <div
                  style={{
                    borderRadius: '18px',
                    padding: '16px 18px',
                    backgroundColor: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-hairline)',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--color-paper)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-ink)',
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_note</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>
                        Nhập điểm &amp; học phần cá nhân
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                        Hỗ trợ thang điểm 10, điểm chữ và tự động quy đổi hệ 4
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-mid-gray)', paddingTop: '4px', borderTop: '1px solid var(--color-hairline)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ink)' }}>task_alt</span>
                    <span>Đang có <strong>{draftRecords.length}</strong> học phần trong danh sách xem trước</span>
                  </div>
                </div>
              </div>

              {/* Các nút thao tác */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className="haui-pill-btn-dark"
                  style={{ justifyContent: 'center' }}
                  onClick={() => setShowAddModal(true)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  <span>Thêm môn học</span>
                </button>

                <button
                  type="button"
                  className="haui-pill-btn-canvas"
                  style={{ justifyContent: 'center' }}
                  onClick={() => {
                    if (draftRecords.length === 0) {
                      handleUseDemoFile();
                    } else {
                      setCurrentStep(2);
                    }
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
                  <span>Quy đổi thang điểm</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BƯỚC 2: XEM LẠI & ĐIỀU CHỈNH (REVIEW STATE)
          ========================================================================= */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Validation Preview Banner Box */}
          <div
            style={{
              backgroundColor: 'var(--color-paper)',
              padding: '20px 24px',
              borderRadius: 'var(--radius-cards)',
              border: '1px solid var(--color-hairline)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', maxWidth: '780px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas)',
                  color: 'var(--color-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>verified</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-ink)' }}>
                    Bản xem trước &amp; Kiểm tra tính hợp lệ
                  </span>
                  <span style={{ padding: '2px 10px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)' }}>
                    {draftRecords.filter((r) => r.status === 'PASSED').length}/{draftRecords.length} môn hợp lệ
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-mid-gray)' }}>
                  {failedCourses.length > 0 ? (
                    <>
                      Phát hiện <strong style={{ color: 'var(--color-ember)' }}>{failedCourses.length} môn nợ</strong> ({failedCourses.map((f) => f.courseCode).join(', ')}). Bạn có thể bấm vào dòng để sửa điểm nếu vừa thi lại đạt.
                    </>
                  ) : (
                    'Toàn bộ các học phần đã trích xuất hợp lệ theo chuẩn thang điểm 4.0 và 10 của Đại học Công nghiệp Hà Nội.'
                  )}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="haui-pill-btn-canvas"
                onClick={() => setCurrentStep(1)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="haui-pill-btn-dark"
                onClick={() => setCurrentStep(3)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span>
                <span>Xác nhận &amp; Cập nhật vào hệ thống</span>
              </button>
            </div>
          </div>

          {/* Data Table Container Card */}
          <div className="haui-stat-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Table Controls Toolbar */}
            <div style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--color-hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Search input */}
                <div style={{ position: 'relative', width: '280px' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: 'var(--color-mid-gray)' }}>
                    search
                  </span>
                  <input
                    type="text"
                    className="haui-input"
                    placeholder="Tìm theo mã hoặc tên môn..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 'var(--heroui-radius-full, 9999px)',
                      padding: '8px 14px 8px 36px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                {/* Term Select */}
                <Select
                  value={selectedSemesterFilter}
                  onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                  style={{ width: '220px' }}
                  triggerStyle={{
                    borderRadius: 'var(--heroui-radius-full, 9999px)',
                    padding: '8px 36px 8px 16px',
                    fontSize: '13px'
                  }}
                >
                  <option value="ALL">Tất cả các học kỳ</option>
                  <option value="6">Kỳ 6 - Năm học 2023-2024</option>
                  <option value="5">Kỳ 5 - Năm học 2022-2023</option>
                  <option value="4">Kỳ 4 - Năm học 2022-2023</option>
                  <option value="3">Kỳ 3 - Năm học 2021-2022</option>
                  <option value="2">Kỳ 2 - Năm học 2021-2022</option>
                  <option value="1">Kỳ 1 - Năm học 2021-2022</option>
                </Select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="haui-pill-btn-canvas"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setShowAddModal(true)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                  <span>Thêm môn</span>
                </button>
                <button
                  type="button"
                  className="haui-pill-btn-canvas"
                  style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--color-ember)' }}
                  onClick={handleClearAllRecords}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete_sweep</span>
                  <span>Xóa tất cả</span>
                </button>
              </div>
            </div>

            {/* Table Body */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-mid-gray)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 600 }}>Mã môn</th>
                    <th style={{ padding: '12px 18px', fontWeight: 600 }}>Tên môn học</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>Số TC</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>Học kỳ</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>Điểm 10</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>Điểm chữ</th>
                    <th style={{ padding: '12px 18px', fontWeight: 600 }}>Trạng thái dữ liệu</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((row, idx) => (
                    <tr
                      key={row.courseCode + idx}
                      style={{
                        borderBottom: '1px solid var(--color-hairline)',
                        backgroundColor: row.status === 'FAILED' ? 'rgba(231, 0, 11, 0.03)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-ink)' }}>
                        {row.courseCode}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 500, color: 'var(--color-ink)' }}>
                        {row.courseName}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={row.credits}
                          onChange={(e) => handleUpdateRecord(idx, 'credits', Number(e.target.value))}
                          style={{
                            width: '45px',
                            textAlign: 'center',
                            padding: '3px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-hairline)',
                            background: 'var(--color-canvas)',
                            fontSize: '12px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--color-mid-gray)' }}>
                        Kỳ {row.semester || 6}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={row.score10 ?? ''}
                          placeholder="N/A"
                          onChange={(e) => handleUpdateRecord(idx, 'score10', e.target.value === '' ? null : Number(e.target.value))}
                          style={{
                            width: '55px',
                            textAlign: 'center',
                            padding: '3px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-hairline)',
                            background: 'var(--color-canvas)',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <select
                          value={row.letterGrade || ''}
                          onChange={(e) => handleUpdateRecord(idx, 'letterGrade', e.target.value)}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-hairline)',
                            background: 'var(--color-canvas)',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
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
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {row.letterGrade === 'F' || row.status === 'FAILED' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ember)', fontWeight: 600 }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ember)' }} />
                            Nợ môn (F)
                          </span>
                        ) : row.letterGrade === 'D' || row.letterGrade === 'D+' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-mid-gray)' }} />
                            Điểm D (Cải thiện)
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink)' }} />
                            Hợp lệ
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="haui-sidebar__profile-logout"
                          style={{ color: 'var(--color-ember)' }}
                          title="Xóa môn này"
                          onClick={() => handleDeleteRecord(idx)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BƯỚC 3: XÁC NHẬN & CẬP NHẬT KẾT QUẢ (CONFIRM STATE)
          ========================================================================= */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="haui-stat-card" style={{ gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 6px' }}>
                Xác Nhận &amp; Cập Nhật Kết Quả Vào Hồ Sơ Học Vụ
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-mid-gray)' }}>
                Kiểm tra các chỉ số tổng hợp được tính toán tự động từ bảng điểm bạn vừa đối soát. Khi bấm <strong>"Xác nhận &amp; Cập nhật kết quả"</strong>, dữ liệu Dashboard và Cây môn học sẽ đồng bộ ngay lập tức.
              </p>
            </div>

            {/* 4 Thẻ chỉ số tổng kết mới */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-alt)', borderRadius: '16px', border: '1px solid var(--color-hairline)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  CPA Mới Tính Toán
                </span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: projectedCpa < 2.0 ? 'var(--color-ember)' : 'var(--color-ink)', marginTop: '4px' }}>
                  {projectedCpa.toFixed(2)}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                  {projectedCpa >= 3.2 ? 'Giỏi' : projectedCpa >= 2.5 ? 'Khá' : projectedCpa >= 2.0 ? 'Trung bình' : 'Yếu (Cảnh báo)'}
                </span>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-alt)', borderRadius: '16px', border: '1px solid var(--color-hairline)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tín Chỉ Đã Tích Lũy
                </span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-ink)', marginTop: '4px' }}>
                  {totalEarnedCredits} / 135
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                  Đạt {((totalEarnedCredits / 135) * 100).toFixed(1)}% tiến độ CTĐT
                </span>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-alt)', borderRadius: '16px', border: '1px solid var(--color-hairline)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tổng Số Môn Học
                </span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-ink)', marginTop: '4px' }}>
                  {draftRecords.length}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                  {draftRecords.filter((r) => r.status === 'PASSED').length} đạt &bull; {failedCourses.length} nợ
                </span>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-alt)', borderRadius: '16px', border: '1px solid var(--color-hairline)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Trạng Thái Học Vụ Dự Kiến
                </span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: projectedCpa < 2.0 || failedCourses.length > 0 ? 'var(--color-ember)' : 'var(--color-ink)', marginTop: '8px' }}>
                  {projectedCpa < 2.0 || failedCourses.length > 0 ? '⚠️ Cảnh báo Mức 1' : '✓ Bình thường'}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                  Theo quy chế HaUI BR-07
                </span>
              </div>
            </div>

            {/* Cảnh báo nợ môn nếu có */}
            {failedCourses.length > 0 && (
              <div style={{ padding: '14px 18px', backgroundColor: 'rgba(231, 0, 11, 0.05)', borderRadius: '16px', border: '1px solid rgba(231, 0, 11, 0.2)', color: 'var(--color-ink)', fontSize: '13px' }}>
                <strong style={{ color: 'var(--color-ember)' }}>Lưu ý quan trọng trước khi lưu:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--color-mid-gray)' }}>
                  Bạn đang có {failedCourses.length} môn học bị điểm F ({failedCourses.map((f) => f.courseCode).join(', ')}). Sau khi lưu, hệ thống sẽ tự động cập nhật Sơ đồ Cây môn học sang trạng thái Đỏ (Blocked) cho các môn học sau môn này.
                </p>
              </div>
            )}

            {/* Nút Hành Động Xác Nhận */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-hairline)' }}>
              <button
                type="button"
                className="haui-pill-btn-canvas"
                onClick={() => setCurrentStep(2)}
              >
                &larr; Quay Lại Điều Chỉnh Thêm
              </button>
              <button
                type="button"
                className="haui-pill-btn-dark"
                onClick={handleConfirmAndSave}
              >
                ✓ Xác Nhận &amp; Cập Nhật Kết Quả Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Môn Học Mới */}
      {showAddModal && (
        <div className="haui-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="haui-modal-box"
            style={{
              maxWidth: '520px',
              borderRadius: '24px',
              border: '1px solid var(--color-hairline)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="haui-modal-header"
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-ink)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>post_add</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  Thêm Môn Học Mới
                </h3>
              </div>
              <button
                type="button"
                className="haui-modal-close"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: 'var(--color-canvas)',
                  color: 'var(--color-mid-gray)',
                  fontSize: '16px'
                }}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCourseSubmit}>
              <div className="haui-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px', display: 'block' }}>
                    Mã môn học:
                  </label>
                  <input
                    type="text"
                    className="haui-input"
                    value={newCourseForm.courseCode}
                    placeholder="VD: IT6001, MATH1002"
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, courseCode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: 'var(--heroui-radius-md, 12px)',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px', display: 'block' }}>
                    Tên môn học:
                  </label>
                  <input
                    type="text"
                    className="haui-input"
                    value={newCourseForm.courseName}
                    placeholder="VD: Cấu trúc dữ liệu và giải thuật"
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, courseName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: 'var(--heroui-radius-md, 12px)',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px', display: 'block' }}>
                      Số tín chỉ:
                    </label>
                    <input
                      type="number"
                      className="haui-input"
                      min="1"
                      max="12"
                      value={newCourseForm.credits}
                      onChange={(e) => setNewCourseForm({ ...newCourseForm, credits: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--heroui-radius-md, 12px)',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px', display: 'block' }}>
                      Điểm (thang 4):
                    </label>
                    <input
                      type="number"
                      className="haui-input"
                      step="0.1"
                      min="0"
                      max="4.0"
                      value={newCourseForm.score4}
                      onChange={(e) => {
                        const val = e.target.value;
                        const num = Number(val);
                        let matchingLetter = newCourseForm.letterGrade;
                        if (!isNaN(num) && val !== '') {
                          if (num >= 3.8) matchingLetter = 'A';
                          else if (num >= 3.3) matchingLetter = 'B+';
                          else if (num >= 2.8) matchingLetter = 'B';
                          else if (num >= 2.3) matchingLetter = 'C+';
                          else if (num >= 1.8) matchingLetter = 'C';
                          else if (num >= 1.3) matchingLetter = 'D+';
                          else if (num >= 0.8) matchingLetter = 'D';
                          else matchingLetter = 'F';
                        }
                        setNewCourseForm({ ...newCourseForm, score4: val, letterGrade: matchingLetter });
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--heroui-radius-md, 12px)',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px', display: 'block' }}>
                      Điểm chữ:
                    </label>
                    <Select
                      value={newCourseForm.letterGrade}
                      onChange={(e) => {
                        const letter = e.target.value;
                        const mappedScore4 = LETTER_GRADE_TO_SCORE4[letter] ?? 3.0;
                        setNewCourseForm({
                          ...newCourseForm,
                          letterGrade: letter,
                          score4: mappedScore4
                        });
                      }}
                      triggerStyle={{
                        borderRadius: 'var(--heroui-radius-md, 12px)',
                        padding: '10px 36px 10px 14px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="A">A</option>
                      <option value="B+">B+</option>
                      <option value="B">B</option>
                      <option value="C+">C+</option>
                      <option value="C">C</option>
                      <option value="D+">D+</option>
                      <option value="D">D</option>
                      <option value="F">F</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div
                className="haui-modal-footer"
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  borderTop: '1px solid var(--color-hairline, #e5e5e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px'
                }}
              >
                <button
                  type="button"
                  className="haui-pill-btn-canvas"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="haui-pill-btn-dark"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  <span>Thêm Vào Bảng Điểm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TranscriptImportPage;
