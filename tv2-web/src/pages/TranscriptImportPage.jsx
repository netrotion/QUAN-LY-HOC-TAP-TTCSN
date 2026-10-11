import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DevSlot } from '../components/dev/DevTools.jsx';
import {
  classifyAcademicRank,
  commitTranscriptRecords,
  convertScore10ToGrade,
  getAcademicSnapshot,
  subscribeAcademicStore
} from '../services/academicStore.js';
import { api } from '../services/apiClient.js';
import { MOCK_TRANSCRIPT_INGESTION_PREVIEW } from '../services/mockFixtures.js';

/**
 * Màn hình Nhập & Quản lý bảng điểm (`/transcript` & `/academic/import`) — Task 2.2a
 * Giao diện theo prototype `nhap_bang_diem` (thẻ chỉ số GPA/CPA/Tín chỉ, 2 phương thức nạp dữ liệu,
 * thanh "Bản xem trước & Kiểm tra tính hợp lệ", bảng học phần có tìm kiếm / lọc kỳ / phân trang).
 * Luồng 3 bước được giữ nguyên:
 * Bước 1: Nạp dữ liệu (Tải file PDF/Ảnh/CSV từ e-HaUI, kéo thả, xử lý lỗi định dạng sai, Nhập tay)
 * Bước 2: Xem lại & Điều chỉnh (Kiểm tra tính hợp lệ, sửa điểm trực tiếp trên từng dòng, thêm / xóa môn)
 * Bước 3: Xác nhận & Cập nhật kết quả (So sánh trước/sau -> Ghi vào Store -> Trạng thái thành công & điều hướng)
 * Các phím tắt kiểm thử (file demo e-HaUI, mô phỏng file sai định dạng) nằm trong panel công cụ dev (DevSlot).
 */

// File demo e-HaUI dùng cho phím tắt kiểm thử nhanh (panel dev)
const DEMO_FILE_NAME = 'Bang_Diem_eHaUI_Chuan_K17.pdf';
const DEMO_FILE_SIZE_LABEL = '245 KB';
const INVALID_DEMO_FILE_NAME = 'Bang_Diem_Khong_Hop_Le.docx';
const MANUAL_SOURCE_FILE_NAME = 'Nhap_Thu_Cong.csv';

// Định dạng tệp được chấp nhận (PDF/Ảnh xuất từ e-HaUI hoặc CSV theo file mẫu)
const ACCEPTED_FILE_PATTERN = /\.(pdf|png|jpg|jpeg|csv)$/i;
const ACCEPTED_FILE_INPUT = '.pdf,.png,.jpg,.jpeg,.csv,image/png,image/jpeg,text/csv';

const PAGE_SIZE = 7;
const DEFAULT_SEMESTER_CODE = '2025_1';

const GRADE_TO_SCORE4 = { A: 4.0, 'B+': 3.5, B: 3.0, 'C+': 2.5, C: 2.0, 'D+': 1.5, D: 1.0, F: 0.0 };
const LETTER_GRADES = Object.keys(GRADE_TO_SCORE4);

// Thang quy đổi điểm (khớp `convertScore10ToGrade` trong academicStore)
const GRADE_SCALE = [
  { range: '8.5 – 10', letter: 'A', score4: '4.0' },
  { range: '8.0 – 8.4', letter: 'B+', score4: '3.5' },
  { range: '7.0 – 7.9', letter: 'B', score4: '3.0' },
  { range: '6.5 – 6.9', letter: 'C+', score4: '2.5' },
  { range: '5.5 – 6.4', letter: 'C', score4: '2.0' },
  { range: '5.0 – 5.4', letter: 'D+', score4: '1.5' },
  { range: '4.0 – 4.9', letter: 'D', score4: '1.0' },
  { range: '0 – 3.9', letter: 'F', score4: '0.0' }
];

// Ngưỡng xếp loại học lực theo CPA (khớp `classifyAcademicRank`)
const CPA_THRESHOLDS = [
  { min: 2.0, label: 'Trung bình' },
  { min: 2.5, label: 'Khá' },
  { min: 3.2, label: 'Giỏi' },
  { min: 3.6, label: 'Xuất sắc' }
];

const WIZARD_STEPS = [
  { id: 1, title: 'Bước 1: Nạp Dữ Liệu', caption: 'Tải tệp hoặc nhập thủ công' },
  { id: 2, title: 'Bước 2: Xem Lại & Điều Chỉnh', caption: 'Kiểm tra & sửa điểm' },
  { id: 3, title: 'Bước 3: Xác Nhận & Cập Nhật', caption: 'Ghi nhận vào hồ sơ học vụ' }
];

// Hướng dẫn xuất bảng điểm từ cổng e-HaUI (hiển thị khi chưa chọn tệp)
const EHAUI_GUIDE_STEPS = [
  { title: 'Đăng nhập e-HaUI', desc: 'Cổng sinhvien.haui.edu.vn' },
  { title: 'Xuất bảng điểm', desc: 'Kết quả học tập → In → Lưu PDF' },
  { title: 'Tải lên tại đây', desc: 'Kéo thả PDF/Ảnh vào khung trên' }
];

// File mẫu nhập liệu (CSV mở được bằng Excel) — dữ liệu ví dụ lấy từ prototype
const CSV_TEMPLATE_FILE_NAME = 'Mau_Nhap_Bang_Diem_HaUI.csv';
const CSV_TEMPLATE_ROWS = [
  ['Mã môn', 'Tên môn học', 'Số TC', 'Mã học kỳ (YYYY_N)', 'Điểm 10'],
  ['IT6015', 'Lập trình Web nâng cao', '3', '2025_1', '8.8'],
  ['IT6018', 'Phân tích & Thiết kế hệ thống thông tin', '3', '2025_1', '8.2'],
  ['FL6005', 'Tiếng Anh chuyên ngành CNTT', '2', '2025_1', '8.0']
];

const EMPTY_COURSE_FORM = {
  courseCode: '',
  courseName: '',
  credits: 3,
  semesterCode: '',
  score10: '',
  letterGrade: ''
};

/* ---------------------------------------------------------------------------
   Hàm tiện ích tính toán / định dạng
   --------------------------------------------------------------------------- */

function isGraded(record) {
  return record.score4 !== null && record.score4 !== undefined && Boolean(record.letterGrade);
}

function isFailed(record) {
  return record.status === 'FAILED' || record.letterGrade === 'F';
}

function isLowGrade(record) {
  return record.letterGrade === 'D' || record.letterGrade === 'D+';
}

function isInProgress(record) {
  return record.status === 'IN_PROGRESS' || !isGraded(record);
}

function isRecordValid(record) {
  const score10Ok =
    record.score10 === null ||
    record.score10 === undefined ||
    (Number(record.score10) >= 0 && Number(record.score10) <= 10);
  return Boolean(record.courseCode && record.courseName) && Number(record.credits) > 0 && score10Ok && !isInProgress(record);
}

function weightedAverage(records) {
  const graded = records.filter(isGraded);
  const credits = graded.reduce((sum, r) => sum + Number(r.credits || 0), 0);
  if (credits === 0) return null;
  const points = graded.reduce((sum, r) => sum + Number(r.credits || 0) * Number(r.score4 || 0), 0);
  return Number((points / credits).toFixed(2));
}

function formatScore(value, digits = 1) {
  return value === null || value === undefined || value === '' ? '--' : Number(value).toFixed(digits);
}

function formatCpa(value) {
  return value === null || value === undefined ? '—' : Number(value).toFixed(2);
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function nextSemesterCode(code) {
  const [year, term] = String(code).split('_').map(Number);
  if (!year) return DEFAULT_SEMESTER_CODE;
  return term >= 2 ? `${year + 1}_1` : `${year}_${(term || 0) + 1}`;
}

function academicYearOf(code) {
  const year = Number(String(code).split('_')[0]);
  return year ? `${year}-${year + 1}` : '';
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

function applyLetterGrade(record, letter) {
  const value = String(letter || '').toUpperCase().trim();
  if (!value) {
    return { ...record, letterGrade: null, score4: null, status: 'IN_PROGRESS' };
  }
  return {
    ...record,
    letterGrade: value,
    score4: GRADE_TO_SCORE4[value] ?? 2.0,
    status: value === 'F' ? 'FAILED' : value === 'D' || value === 'D+' ? 'PASSED_LOW' : 'PASSED'
  };
}

function splitCsvLine(line, separator) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === separator && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

// Đọc file CSV theo cấu trúc file mẫu: Mã môn, Tên môn, Số TC, Mã học kỳ, Điểm 10
function parseTranscriptCsv(text) {
  const lines = String(text || '')
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const separator = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';

  return lines
    .slice(1)
    .map((line) => {
      const [code = '', name = '', credits = '', semester = '', score = ''] = splitCsvLine(line, separator);
      const score10 = score === '' ? null : Number(score.replace(',', '.'));
      const converted = convertScore10ToGrade(Number.isNaN(score10) ? null : score10);
      return {
        courseCode: code.toUpperCase(),
        courseName: name,
        semesterCode: /^\d{4}_[12]$/.test(semester) ? semester : DEFAULT_SEMESTER_CODE,
        credits: Number(credits) || 3,
        score10: Number.isNaN(score10) ? null : score10,
        letterGrade: converted.letterGrade,
        score4: converted.score4,
        status: converted.status
      };
    })
    .filter((record) => record.courseCode && record.courseName);
}

function downloadCsvTemplate() {
  const csv = `﻿${CSV_TEMPLATE_ROWS.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = CSV_TEMPLATE_FILE_NAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getRowStatus(record) {
  if (isFailed(record)) {
    return { label: 'Nợ môn (F)', note: 'Cần học lại để gỡ nợ', badge: 'bg-surface-container', dot: 'bg-ember', highlight: true };
  }
  if (isInProgress(record)) {
    return { label: 'Đang học', note: 'Chưa có điểm tổng kết — không tính CPA', badge: 'bg-surface-container', dot: 'bg-ember', highlight: true, muted: true };
  }
  if (isLowGrade(record)) {
    return { label: 'Cần cải thiện', note: null, badge: 'bg-canvas', dot: 'bg-mid-gray', highlight: false };
  }
  return { label: 'Hợp lệ', note: null, badge: 'bg-canvas', dot: 'bg-ink', highlight: false };
}

/* ---------------------------------------------------------------------------
   Thành phần giao diện nhỏ theo prototype
   --------------------------------------------------------------------------- */

function Icon({ name, className = 'text-[18px]' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function MetricCard({ label, value, suffix, icon, children }) {
  return (
    <div className="bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col justify-between relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-caption text-caption uppercase tracking-wider text-mid-gray font-semibold">{label}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-headline text-headline text-ink font-semibold">{value}</span>
            <span className="font-caption text-caption text-mid-gray">{suffix}</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-ink">
          <Icon name={icon} className="text-[20px]" />
        </div>
      </div>
      {children}
    </div>
  );
}

function ModalShell({ onClose, maxWidth = 'max-w-lg', children }) {
  return (
    <div
      className="fixed inset-0 z-[55] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`bg-paper rounded-[24px] shadow-sm ${maxWidth} w-full border border-hairline overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

const FIELD_CLASS =
  'w-full bg-surface-alt border border-hairline rounded-[18px] px-3.5 py-2 font-body text-body text-ink placeholder:text-mid-gray focus:outline-none focus:border-ink transition-colors';
const CELL_INPUT_CLASS =
  'bg-surface-alt border border-hairline rounded-full px-2 py-1 font-mono text-body text-ink text-center focus:outline-none focus:border-ink transition-colors';
const DEV_BUTTON_CLASS =
  'inline-flex items-center gap-space-xs px-space-md py-1 rounded-full border border-hairline font-label text-label text-ink hover:bg-canvas transition-colors disabled:opacity-40 text-left';

export function TranscriptImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const parseTimerRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Snapshot học vụ hiện hành (đồng bộ khi đổi persona hoặc sau khi lưu)
  const [snapshot, setSnapshot] = useState(() => getAcademicSnapshot());
  const [apiConfig, setApiConfig] = useState(() => api.getConfig());

  // Wizard Step: 1 = Nạp dữ liệu, 2 = Xem lại (Review), 3 = Xác nhận (Confirm)
  const [currentStep, setCurrentStep] = useState(1);
  // Kết quả sau khi ghi vào Store (trạng thái thành công của Bước 3)
  const [commitResult, setCommitResult] = useState(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Danh sách các môn bóc tách / nhập tay (Editable trong Bước 2)
  const [draftRecords, setDraftRecords] = useState(() => {
    // Nếu sinh viên đã có bảng điểm thì khởi tạo từ bảng điểm hiện hành, nếu chưa thì rỗng
    const initial = getAcademicSnapshot().transcriptRecords;
    return initial.length > 0 ? initial.map((r) => ({ ...r })) : [];
  });

  // Bảng học phần: tìm kiếm, lọc kỳ, phân trang, dòng đang sửa
  const [searchQuery, setSearchQuery] = useState('');
  const [termFilter, setTermFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [editingIndex, setEditingIndex] = useState(null);

  // Modal: thêm môn, xác nhận xóa, quy đổi thang điểm
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState(EMPTY_COURSE_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertInput, setConvertInput] = useState('');

  // Toast thông báo góc phải dưới (giữ nội dung khi đang ẩn dần)
  const [toast, setToast] = useState({ visible: false, title: '', desc: '', tone: 'success' });

  useEffect(() => subscribeAcademicStore(setSnapshot), []);
  useEffect(() => api.subscribe(setApiConfig), []);
  useEffect(
    () => () => {
      clearTimeout(parseTimerRef.current);
      clearTimeout(toastTimerRef.current);
    },
    []
  );

  // Đổi tài khoản mẫu (panel dev) -> khởi tạo lại luồng nhập với bảng điểm của sinh viên mới
  const presetRef = useRef(snapshot.activePresetId);
  useEffect(() => {
    if (presetRef.current === snapshot.activePresetId) return;
    presetRef.current = snapshot.activePresetId;
    resetWizard(snapshot.transcriptRecords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.activePresetId]);

  const showToast = (title, desc, tone = 'success') => {
    clearTimeout(toastTimerRef.current);
    setToast({ visible: true, title, desc, tone });
    toastTimerRef.current = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3200);
  };

  const resetWizard = (records = getAcademicSnapshot().transcriptRecords) => {
    clearTimeout(parseTimerRef.current);
    setDraftRecords(records.map((r) => ({ ...r })));
    setSelectedFile(null);
    setUploadError(null);
    setIsProcessingFile(false);
    setCommitResult(null);
    setEditingIndex(null);
    setTermFilter('all');
    setSearchQuery('');
    setPage(1);
    setCurrentStep(1);
  };

  // Nạp kết quả bóc tách vào bảng xem lại và chuyển sang Bước 2
  const loadExtractedRecords = (records, fileInfo) => {
    const copy = records.map((r) => ({ ...r }));
    setDraftRecords(copy);
    setSelectedFile({ ...fileInfo, extractedCount: copy.length });
    setCommitResult(null);
    setEditingIndex(null);
    setTermFilter('all');
    setPage(1);
    setCurrentStep(2); // Chuyển sang Bước 2: Xem lại
  };

  // Xử lý nạp file demo mẫu e-HaUI
  const handleUseDemoFile = async () => {
    setUploadError(null);
    setIsProcessingFile(true);
    try {
      const res = await api.academic.ingestTranscript({
        fileName: DEMO_FILE_NAME
      });
      loadExtractedRecords(res.records || MOCK_TRANSCRIPT_INGESTION_PREVIEW.records, {
        name: DEMO_FILE_NAME,
        sizeLabel: DEMO_FILE_SIZE_LABEL
      });
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
        fileName: INVALID_DEMO_FILE_NAME,
        invalidFormat: true
      });
    } catch (err) {
      setSelectedFile(null);
      setCurrentStep(1);
      setUploadError(
        err.message ||
          'Không tải được bảng điểm do lỗi định dạng file (.docx). Hệ thống chỉ chấp nhận file PDF hoặc Ảnh (PNG/JPG) xuất từ cổng e-HaUI.'
      );
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Xử lý tệp người dùng chọn / kéo thả từ máy
  const processFile = (file) => {
    if (!file) return;
    setUploadError(null);

    if (!ACCEPTED_FILE_PATTERN.test(file.name)) {
      setUploadError(
        `Định dạng file "${file.name}" không được hỗ trợ! Vui lòng chọn tệp tin định dạng PDF hoặc Ảnh (PNG, JPG) xuất từ portal e-HaUI, hoặc file CSV theo mẫu.`
      );
      setSelectedFile(null);
      setCurrentStep(1);
      return;
    }

    const fileInfo = { name: file.name, sizeLabel: formatFileSize(file.size) };
    setSelectedFile({ ...fileInfo, extractedCount: null });
    setIsProcessingFile(true);

    // File CSV theo mẫu: đọc trực tiếp từng dòng học phần
    if (/\.csv$/i.test(file.name)) {
      file
        .text()
        .then((text) => {
          const records = parseTranscriptCsv(text);
          if (records.length === 0) {
            setSelectedFile(null);
            setUploadError(
              `Không đọc được học phần nào từ "${file.name}". Vui lòng dùng đúng cấu trúc file mẫu (Mã môn, Tên môn học, Số TC, Mã học kỳ, Điểm 10).`
            );
            return;
          }
          loadExtractedRecords(records, fileInfo);
        })
        .catch(() => {
          setSelectedFile(null);
          setUploadError(`Không đọc được nội dung tệp "${file.name}".`);
        })
        .finally(() => setIsProcessingFile(false));
      return;
    }

    // Giả lập bóc tách PDF/Ảnh sau 450ms
    clearTimeout(parseTimerRef.current);
    parseTimerRef.current = setTimeout(() => {
      setIsProcessingFile(false);
      loadExtractedRecords(MOCK_TRANSCRIPT_INGESTION_PREVIEW.records, fileInfo);
    }, 450);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    processFile(file);
  };

  const openFilePicker = () => {
    if (isProcessingFile) return;
    fileInputRef.current?.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessingFile) return;
    processFile(e.dataTransfer?.files?.[0]);
  };

  // Gỡ tệp đã tải -> trả bảng về dữ liệu hồ sơ hiện hành
  const handleRemoveFile = () => {
    resetWizard(snapshot.transcriptRecords);
  };

  // Chỉnh sửa điểm trực tiếp trên bảng ở Bước 2
  const handleUpdateRecord = (index, field, value) => {
    setDraftRecords((prev) => {
      const updated = [...prev];
      let target = { ...updated[index], [field]: value };

      if (field === 'score10') {
        const converted = convertScore10ToGrade(value);
        target.letterGrade = converted.letterGrade;
        target.score4 = converted.score4;
        target.status = converted.status;
      } else if (field === 'letterGrade') {
        target = applyLetterGrade(target, value);
      }

      updated[index] = target;
      return updated;
    });
  };

  // Xóa một môn / toàn bộ môn khỏi danh sách xem lại (sau khi xác nhận ở modal)
  const handleDeleteRecord = (index) => {
    setDraftRecords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'all') {
      setDraftRecords([]);
      showToast('Đã xóa toàn bộ học phần', 'Bảng xem trước đã được làm trống.');
    } else {
      const target = draftRecords[pendingDelete.index];
      handleDeleteRecord(pendingDelete.index);
      showToast('Đã xóa học phần', `${target?.courseCode || ''} đã bị loại khỏi danh sách tính điểm.`);
    }
    setEditingIndex(null);
    setPendingDelete(null);
  };

  // Danh sách học kỳ có trong bản nháp (để lọc & gán nhãn "Kỳ n")
  const semesters = useMemo(
    () => [...new Set(draftRecords.map((r) => r.semesterCode).filter(Boolean))].sort(),
    [draftRecords]
  );
  const termLabel = (code) => (semesters.includes(code) ? `Kỳ ${semesters.indexOf(code) + 1}` : '—');

  const termOptions = useMemo(() => {
    const latest = semesters[semesters.length - 1];
    const upcoming = latest ? nextSemesterCode(latest) : DEFAULT_SEMESTER_CODE;
    const existing = semesters
      .slice()
      .reverse()
      .map((code, i) => ({ code, label: `Kỳ ${semesters.length - i}${i === 0 ? ' (Hiện tại)' : ''}` }));
    return [{ code: upcoming, label: `Kỳ ${semesters.length + 1} (Mới)` }, ...existing];
  }, [semesters]);

  // Cập nhật một trường của form thêm môn và xóa lỗi cũ của trường đó
  const updateCourseForm = (patch) => {
    setNewCourseForm((prev) => ({ ...prev, ...patch }));
    setFormErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((key) => {
        next[key] = false;
      });
      return next;
    });
  };

  const openAddModal = () => {
    setNewCourseForm({
      ...EMPTY_COURSE_FORM,
      semesterCode: semesters[semesters.length - 1] || termOptions[0].code
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  // Thêm môn học thủ công
  const handleAddCourseSubmit = (e) => {
    if (e) e.preventDefault();
    const score10 = newCourseForm.score10 === '' ? NaN : Number(newCourseForm.score10);
    const errors = {
      courseCode: !newCourseForm.courseCode.trim(),
      courseName: !newCourseForm.courseName.trim(),
      score10: Number.isNaN(score10) || score10 < 0 || score10 > 10
    };
    setFormErrors(errors);
    if (errors.courseCode || errors.courseName || errors.score10) return;

    const converted = convertScore10ToGrade(score10);
    const newRecord = applyLetterGrade(
      {
        courseCode: newCourseForm.courseCode.toUpperCase().trim(),
        courseName: newCourseForm.courseName.trim(),
        semesterCode: newCourseForm.semesterCode || DEFAULT_SEMESTER_CODE,
        credits: Number(newCourseForm.credits || 3),
        score10
      },
      newCourseForm.letterGrade || converted.letterGrade || 'B'
    );

    setDraftRecords((prev) => [...prev, newRecord]);
    // Hiển thị trang chứa môn vừa thêm
    setTermFilter('all');
    setSearchQuery('');
    setPage(Math.ceil((draftRecords.length + 1) / PAGE_SIZE));
    setNewCourseForm(EMPTY_COURSE_FORM);
    setShowAddModal(false);
    showToast('Đã thêm học phần', `${newRecord.courseCode} — ${newRecord.courseName}`);
  };

  // Tính toán tóm tắt trước khi lưu (cập nhật trực tiếp khi sửa điểm)
  const totalCreditsRequired = snapshot.student.totalCreditsRequired || 135;
  const gradedRecords = draftRecords.filter(isGraded);
  const failedCourses = draftRecords.filter(isFailed);
  const inProgressCourses = draftRecords.filter((r) => !isFailed(r) && isInProgress(r));
  const lowGradeCourses = draftRecords.filter((r) => !isFailed(r) && isLowGrade(r));
  const passedCount = draftRecords.filter((r) => isGraded(r) && !isFailed(r)).length;
  const validCount = draftRecords.filter(isRecordValid).length;
  const totalEarnedCredits = draftRecords
    .filter((r) => isGraded(r) && !isFailed(r) && r.status !== 'IN_PROGRESS')
    .reduce((sum, r) => sum + Number(r.credits || 0), 0);
  const projectedCpa = weightedAverage(gradedRecords);
  const projectedRank = classifyAcademicRank(projectedCpa);
  const progressPercent = Math.min(100, Number(((totalEarnedCredits / totalCreditsRequired) * 100).toFixed(1)));
  const projectedWarning = (projectedCpa !== null && projectedCpa < 2.0) || failedCourses.length > 0;

  // Thẻ chỉ số: khi bảng nháp chưa chỉnh sửa và chưa từng nạp bảng điểm mới, store hiển thị số liệu chính thức
  // của hồ sơ (bảng điểm mẫu chỉ là một phần) — dùng đúng số đó để khớp Tổng quan/Sidebar.
  // Khi đã chỉnh sửa, thẻ chuyển sang số dự kiến sau khi lưu.
  const isPristineDraft = useMemo(
    () =>
      !snapshot.hasImportedNewTranscript &&
      JSON.stringify(draftRecords) === JSON.stringify(snapshot.transcriptRecords),
    [draftRecords, snapshot]
  );
  const cardCpa = isPristineDraft ? snapshot.metrics.cpa : projectedCpa;
  const cardRank = classifyAcademicRank(cardCpa);
  const cardCredits = isPristineDraft ? snapshot.metrics.accumulatedCredits : totalEarnedCredits;
  const cardProgress = isPristineDraft ? snapshot.metrics.progressPercent : progressPercent;
  const nextThreshold = cardCpa === null ? null : CPA_THRESHOLDS.find((t) => cardCpa < t.min);

  // GPA học kỳ gần nhất có điểm & so sánh với học kỳ trước đó
  const gradedSemesters = semesters.filter((code) => draftRecords.some((r) => r.semesterCode === code && isGraded(r)));
  const latestTerm = gradedSemesters[gradedSemesters.length - 1];
  const previousTerm = gradedSemesters[gradedSemesters.length - 2];
  const latestGpa = latestTerm ? weightedAverage(draftRecords.filter((r) => r.semesterCode === latestTerm)) : null;
  const previousGpa = previousTerm ? weightedAverage(draftRecords.filter((r) => r.semesterCode === previousTerm)) : null;
  const gpaDelta = latestGpa !== null && previousGpa !== null ? Number((latestGpa - previousGpa).toFixed(2)) : null;

  // Lọc / tìm kiếm / phân trang bảng học phần
  const filteredRows = draftRecords
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => termFilter === 'all' || record.semesterCode === termFilter)
    .filter(({ record }) => {
      if (!searchQuery.trim()) return true;
      const q = normalizeText(searchQuery.trim());
      return normalizeText(record.courseCode).includes(q) || normalizeText(record.courseName).includes(q);
    });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const isCommitted = Boolean(commitResult);
  const isEditable = !isCommitted && currentStep < 3;

  const changeTermFilter = (value) => {
    setTermFilter(value);
    setPage(1);
  };

  // Bước 1 -> Bước 2: Kiểm tra dữ liệu
  const handleValidateData = () => {
    if (draftRecords.length === 0) {
      showToast('Chưa có dữ liệu để kiểm tra', 'Hãy tải tệp bảng điểm hoặc thêm môn học thủ công.', 'error');
      return;
    }
    setCurrentStep(2);
    const issues = draftRecords.length - validCount;
    showToast(
      'Đã kiểm tra dữ liệu',
      `${validCount}/${draftRecords.length} môn hợp lệ${issues > 0 ? `, ${issues} môn cần chú ý` : ''}.`
    );
  };

  // Bước 2 -> Bước 3: Xác nhận
  const handleGoToConfirm = () => {
    if (draftRecords.length === 0) {
      showToast('Chưa có dữ liệu để lưu', 'Bảng điểm đang trống.', 'error');
      return;
    }
    setEditingIndex(null);
    setCurrentStep(3);
  };

  // Xử lý xác nhận bảng điểm ở Bước 3 -> ghi vào Store
  const handleConfirmAndSave = () => {
    const result = commitTranscriptRecords(draftRecords, {
      sourceFileName: selectedFile?.name || MANUAL_SOURCE_FILE_NAME
    });
    setCommitResult(result);
    setDraftRecords(result.transcriptRecords.map((r) => ({ ...r })));
    setEditingIndex(null);
    showToast('Cập nhật thành công', 'Dashboard, Cây môn học và Kế hoạch học tập đã đồng bộ bảng điểm mới.');
  };

  const handleHeaderSave = () => {
    if (isCommitted) return;
    if (currentStep === 3) handleConfirmAndSave();
    else handleGoToConfirm();
  };

  // Hủy bỏ bản xem trước -> khôi phục dữ liệu hồ sơ hiện hành và quay về Bước 1
  const handleCancelReview = () => {
    resetWizard(snapshot.transcriptRecords);
  };

  const goToStep = (stepId) => {
    if (isCommitted || stepId >= currentStep) return;
    setEditingIndex(null);
    setCurrentStep(stepId);
  };

  const convertPreview = convertInput === '' ? null : convertScore10ToGrade(Number(convertInput));
  const formPreview = (() => {
    if (newCourseForm.score10 === '' || Number.isNaN(Number(newCourseForm.score10))) return '-- / --';
    const converted = convertScore10ToGrade(Number(newCourseForm.score10));
    const letter = newCourseForm.letterGrade || converted.letterGrade;
    return `${letter} / ${formatScore(GRADE_TO_SCORE4[letter] ?? converted.score4)}`;
  })();

  const currentMetrics = snapshot.metrics;
  const comparisonRows = commitResult
    ? []
    : [
        {
          label: 'CPA tích lũy',
          before: formatCpa(currentMetrics.cpa),
          after: formatCpa(projectedCpa),
          note: projectedRank.rank,
          warn: projectedCpa !== null && projectedCpa < 2.0
        },
        {
          label: 'Tín chỉ đã tích lũy',
          before: `${currentMetrics.accumulatedCredits ?? 0} / ${totalCreditsRequired}`,
          after: `${totalEarnedCredits} / ${totalCreditsRequired}`,
          note: `Đạt ${progressPercent}% tiến độ CTĐT`
        },
        {
          label: 'Tổng số môn học',
          before: String(snapshot.transcriptRecords.length),
          after: String(draftRecords.length),
          note: `${passedCount} đạt • ${failedCourses.length} nợ • ${inProgressCourses.length} đang học`
        },
        {
          label: 'Trạng thái học vụ dự kiến',
          before: currentMetrics.academicWarning ? 'Cảnh báo' : 'Bình thường',
          after: projectedWarning ? 'Cảnh báo Mức 1' : 'Bình thường',
          note: 'Theo quy chế HaUI BR-07',
          warn: projectedWarning
        }
      ];

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg lg:p-space-xl flex flex-col gap-space-lg max-w-[1440px] mx-auto w-full">
        {/* Header & Page Title */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pb-space-sm">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <nav className="flex items-center gap-1.5 font-caption text-caption text-mid-gray">
                <Link className="hover:text-ink transition-colors" to="/">
                  Trang chủ
                </Link>
                <Icon name="chevron_right" className="text-[14px]" />
                <span className="text-ink font-medium">Nhập bảng điểm</span>
              </nav>
              <span className="inline-flex items-center gap-1 bg-surface-container px-2.5 py-0.5 rounded-full font-label text-label text-ink">
                <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                Dữ liệu thực tế tải lên / nhập tay
              </span>
              {apiConfig.mockEnabled && (
                <span className="inline-flex items-center gap-1 bg-surface-alt border border-hairline px-2.5 py-0.5 rounded-full font-label text-label text-mid-gray">
                  <Icon name="science" className="text-[14px]" />
                  Mô phỏng Sandbox
                </span>
              )}
            </div>
            <h1 className="font-headline text-headline text-ink tracking-tight">Nhập &amp; Quản lý bảng điểm</h1>
            <p className="font-body text-body text-mid-gray max-w-3xl">
              Tải lên tệp bảng điểm cá nhân hoặc nhập điểm thủ công để hệ thống kiểm tra tính hợp lệ, tính toán GPA/CPA và tư vấn điều kiện học phần.
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <button
              className="inline-flex items-center gap-1.5 bg-paper hover:bg-canvas text-ink px-4 py-2 rounded-full font-body-medium text-body-medium shadow-sm transition-all duration-150"
              type="button"
              onClick={() => {
                downloadCsvTemplate();
                showToast('Đã tải file mẫu', `${CSV_TEMPLATE_FILE_NAME} — mở bằng Excel, điền điểm rồi tải lên lại.`);
              }}
            >
              <Icon name="download" className="text-[18px] text-mid-gray" />
              <span>Tải file mẫu Excel</span>
            </button>
            <button
              className="inline-flex items-center gap-1.5 bg-surface-alt hover:bg-surface-container-high text-ink px-4 py-2 rounded-full font-body-medium text-body-medium shadow-sm transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
              type="button"
              onClick={handleValidateData}
              disabled={isCommitted || isProcessingFile}
            >
              <Icon name="fact_check" />
              <span>Kiểm tra dữ liệu</span>
            </button>
            <button
              className="inline-flex items-center gap-1.5 bg-ink hover:bg-ink-soft text-paper px-5 py-2 rounded-full font-body-medium text-body-medium shadow-sm transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
              type="button"
              onClick={handleHeaderSave}
              disabled={isCommitted || isProcessingFile || draftRecords.length === 0}
            >
              <Icon name="check_circle" />
              <span>Lưu bảng điểm</span>
            </button>
          </div>
        </header>

        {/* Wizard Step Indicator (3 bước) */}
        <section
          className="bg-paper rounded-[24px] shadow-sm px-space-lg py-space-md flex flex-col md:flex-row md:items-center gap-space-sm md:gap-space-md"
          aria-label="Tiến trình nhập bảng điểm"
        >
          {WIZARD_STEPS.map((step, i) => {
            const done = isCommitted || currentStep > step.id;
            const active = !isCommitted && currentStep === step.id;
            const canGoBack = !isCommitted && step.id < currentStep;
            return (
              <React.Fragment key={step.id}>
                {i > 0 && <div className={`hidden md:block flex-1 h-px ${done || active ? 'bg-ink' : 'bg-hairline'}`} />}
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  disabled={!canGoBack}
                  aria-current={active ? 'step' : undefined}
                  title={canGoBack ? `Quay lại ${step.title}` : undefined}
                  className="flex items-center gap-3 min-w-0 text-left rounded-full disabled:cursor-default enabled:hover:opacity-80 transition-opacity"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-body-medium text-body-medium ${
                      done || active ? 'bg-ink text-paper' : 'bg-surface-container text-mid-gray'
                    }`}
                  >
                    {done ? <Icon name="check" className="text-[18px]" /> : step.id}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className={`font-body-medium text-body-medium font-medium ${done || active ? 'text-ink' : 'text-mid-gray'}`}>
                      {step.title}
                    </span>
                    <span className="font-caption text-caption text-mid-gray">{step.caption}</span>
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </section>

        {/* Thẻ chỉ số (tính trực tiếp từ bảng điểm đang xem) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <MetricCard label="GPA Học kỳ gần nhất" value={formatCpa(latestGpa)} suffix="/ 4.00" icon="trending_up">
            <div className="flex items-center gap-2 mt-4 pt-3">
              {gpaDelta !== null ? (
                <>
                  <span className="inline-flex items-center gap-0.5 text-ink font-caption text-caption bg-surface-container px-2 py-0.5 rounded-full font-medium">
                    <Icon
                      name={gpaDelta > 0 ? 'arrow_upward' : gpaDelta < 0 ? 'arrow_downward' : 'remove'}
                      className="text-[14px]"
                    />
                    {`${gpaDelta > 0 ? '+' : ''}${gpaDelta.toFixed(2)}`}
                  </span>
                  <span className="font-caption text-caption text-mid-gray">
                    so với Học kỳ {semesters.indexOf(previousTerm) + 1} ({formatCpa(previousGpa)})
                  </span>
                </>
              ) : (
                <span className="font-caption text-caption text-mid-gray">
                  {latestTerm ? `Học kỳ ${semesters.indexOf(latestTerm) + 1} — học kỳ đầu tiên có điểm` : 'Chưa có học kỳ nào có điểm tổng kết'}
                </span>
              )}
            </div>
          </MetricCard>

          <MetricCard
            label={isPristineDraft ? 'CPA Tích lũy toàn khóa' : 'CPA Tích lũy (dự kiến sau khi lưu)'}
            value={formatCpa(cardCpa)}
            suffix="/ 4.00"
            icon="workspace_premium"
          >
            <div className="flex items-center gap-2 mt-4 pt-3 flex-wrap">
              <span className="inline-flex items-center gap-1 text-ink font-caption text-caption bg-surface-container px-2 py-0.5 rounded-full font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${cardCpa !== null && cardCpa < 2.0 ? 'bg-ember' : 'bg-ink'}`} />
                {cardCpa === null ? ' Chưa xếp loại' : ` Hạng ${cardRank.rank.split(' (')[0]}`}
              </span>
              <span className="font-caption text-caption text-mid-gray">
                {cardCpa === null
                  ? 'Chưa đủ dữ liệu để xếp loại'
                  : nextThreshold
                  ? `Tiếp cận ngưỡng ${nextThreshold.min.toFixed(2)} (${nextThreshold.label})`
                  : 'Đạt mức xếp loại cao nhất'}
              </span>
            </div>
          </MetricCard>

          <MetricCard
            label={isPristineDraft ? 'Tín chỉ hợp lệ tích lũy' : 'Tín chỉ tích lũy (dự kiến sau khi lưu)'}
            value={cardCredits}
            suffix={`/ ${totalCreditsRequired} tín chỉ`}
            icon="pie_chart"
          >
            <div className="flex flex-col gap-1.5 mt-4 pt-3">
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                <div className="bg-ink h-full rounded-full transition-all duration-500" style={{ width: `${cardProgress}%` }} />
              </div>
              <div className="flex justify-between items-center text-mid-gray font-caption text-caption">
                <span>Tiến độ chương trình</span>
                <span className="font-medium text-ink">{cardProgress}%</span>
              </div>
            </div>
          </MetricCard>
        </section>

        {/* =========================================================================
            BƯỚC 1 & 2: NẠP DỮ LIỆU (Tải tệp / Nhập thủ công)
            ========================================================================= */}
        {isEditable && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
            {/* Phương thức 1: Tải tệp */}
            <div className="lg:col-span-7 bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-ink" />
                  <h2 className="font-subheading text-subheading text-ink font-medium">Phương thức 1: Tải lên tệp bảng điểm</h2>
                </div>
                <span className="font-label text-label text-mid-gray bg-canvas px-2.5 py-1 rounded-full shrink-0">
                  Hỗ trợ .pdf, .png, .jpg, .csv
                </span>
              </div>

              <div
                className={`rounded-[20px] p-6 flex flex-col items-center justify-center text-center transition-colors ${
                  isProcessingFile ? 'cursor-wait bg-canvas' : isDragging ? 'cursor-pointer bg-canvas' : 'cursor-pointer bg-surface-alt hover:bg-canvas'
                }`}
                role="button"
                tabIndex={0}
                aria-disabled={isProcessingFile}
                onClick={openFilePicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openFilePicker();
                  }
                }}
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="w-12 h-12 rounded-full bg-paper flex items-center justify-center text-ink shadow-sm mb-3">
                  <Icon
                    name={isProcessingFile ? 'progress_activity' : 'cloud_upload'}
                    className={`text-[24px] ${isProcessingFile ? 'animate-spin' : ''}`}
                  />
                </div>
                <p className="font-body-medium text-body-medium text-ink font-medium">
                  {isProcessingFile ? 'Đang bóc tách dữ liệu...' : isDragging ? 'Thả tệp vào đây để tải lên' : 'Kéo thả tệp tin hoặc nhấn để chọn'}
                </p>
                <p className="font-caption text-caption text-mid-gray mt-1 max-w-sm">
                  Tự động nhận diện bảng điểm từ Cổng thông tin đào tạo HaUI (e-learning/sinhvien.haui.edu.vn)
                </p>
                <input
                  ref={fileInputRef}
                  accept={ACCEPTED_FILE_INPUT}
                  className="hidden"
                  id="transcriptFileInput"
                  type="file"
                  onChange={handleFileChange}
                />
              </div>

              {uploadError ? (
                <div className="bg-surface-alt rounded-[18px] p-3.5 flex flex-col gap-2.5" role="alert">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-paper flex items-center justify-center shrink-0 shadow-sm text-ember">
                      <Icon name="error" className="text-[20px]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-medium text-body-medium text-ink font-medium">Lỗi tải bảng điểm</span>
                      <span className="font-caption text-caption text-mid-gray">{uploadError}</span>
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 pl-12">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null);
                        openFilePicker();
                      }}
                      className="px-3 py-1.5 rounded-full bg-paper text-ink font-label text-label hover:bg-canvas transition-colors shadow-sm"
                    >
                      Thử lại với tệp khác
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError(null);
                        openAddModal();
                      }}
                      className="px-3 py-1.5 rounded-full text-mid-gray hover:text-ink font-label text-label hover:bg-canvas transition-colors"
                    >
                      Nhập thủ công
                    </button>
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="bg-surface-alt rounded-[18px] p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-paper flex items-center justify-center shrink-0 shadow-sm text-ink">
                      <Icon name="description" className="text-[20px]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-body-medium text-body-medium text-ink font-medium truncate">{selectedFile.name}</span>
                        <span className="font-caption text-caption text-mid-gray shrink-0">{selectedFile.sizeLabel}</span>
                      </div>
                      <span className="font-caption text-caption text-mid-gray truncate">
                        {isProcessingFile || selectedFile.extractedCount === null
                          ? 'Đang trích xuất dữ liệu bảng điểm...'
                          : `Đã tải lên và trích xuất thành công ${selectedFile.extractedCount} môn học`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${isProcessingFile ? 'bg-mid-gray' : 'bg-ink'}`} />
                    <span className="font-label text-label text-ink font-medium">{isProcessingFile ? 'Đang xử lý' : 'Sẵn sàng'}</span>
                    <button
                      className="ml-2 text-mid-gray hover:text-ink p-1 rounded-full hover:bg-canvas transition-colors"
                      title="Xóa tệp"
                      type="button"
                      onClick={handleRemoveFile}
                      disabled={isProcessingFile}
                    >
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-alt rounded-[18px] p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {EHAUI_GUIDE_STEPS.map((guide, i) => (
                    <div key={guide.title} className="flex items-start gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-paper shadow-sm flex items-center justify-center shrink-0 font-label text-label text-ink">
                        {i + 1}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-label text-label text-ink">{guide.title}</span>
                        <span className="font-caption text-caption text-mid-gray">{guide.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phương thức 2: Nhập thủ công & Điều chỉnh */}
            <div className="lg:col-span-5 bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col justify-between gap-space-md min-h-full">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-ink" />
                    <h2 className="font-subheading text-subheading text-ink font-medium">Phương thức 2: Nhập thủ công &amp; Điều chỉnh</h2>
                  </div>
                </div>
                <p className="font-body text-body text-mid-gray mb-space-md">
                  Bổ sung môn học chuyển đổi điểm, môn học lại hoặc chỉnh sửa trực tiếp thông tin điểm từng học phần.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-space-md">
                  <button
                    className="flex items-center justify-center gap-1.5 bg-ink text-paper py-2.5 px-3 rounded-full font-body-medium text-body-medium hover:bg-ink-soft transition-colors cursor-pointer"
                    type="button"
                    onClick={openAddModal}
                  >
                    <Icon name="add" />
                    <span>+ Thêm môn học</span>
                  </button>
                  <button
                    className="flex items-center justify-center gap-1.5 bg-canvas hover:bg-surface-container-high text-ink py-2.5 px-3 rounded-full font-body-medium text-body-medium transition-colors cursor-pointer"
                    type="button"
                    onClick={() => {
                      setConvertInput('');
                      setShowConvertModal(true);
                    }}
                  >
                    <Icon name="tune" />
                    <span>Quy đổi thang điểm</span>
                  </button>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <span className="font-label text-label text-mid-gray">Xem nhanh theo giai đoạn đào tạo:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => changeTermFilter('all')}
                      className={`px-3 py-1 rounded-full font-caption text-caption cursor-pointer transition-colors ${
                        termFilter === 'all' ? 'bg-ink text-paper font-medium' : 'bg-canvas text-mid-gray hover:text-ink'
                      }`}
                    >
                      Tất cả kỳ
                    </button>
                    {semesters.map((code, i) => {
                      const isLatest = i === semesters.length - 1;
                      const active = termFilter === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => changeTermFilter(code)}
                          title={`Năm học ${academicYearOf(code)}`}
                          className={`px-3 py-1 rounded-full font-caption text-caption cursor-pointer transition-colors ${
                            active
                              ? 'bg-ink text-paper font-medium'
                              : isLatest
                              ? 'bg-canvas text-ink font-medium'
                              : 'bg-canvas text-mid-gray hover:text-ink'
                          }`}
                        >
                          {`Học kỳ ${i + 1}${isLatest ? ' (Mới)' : ''}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="bg-surface-alt rounded-[18px] p-3 text-mid-gray font-caption text-caption flex items-center gap-2">
                <Icon name="info" className="text-[18px] text-ink shrink-0" />
                <span>Dữ liệu nhập thủ công sẽ tự động gộp vào thuật toán gợi ý môn học tự chọn KTPM/CNTT.</span>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            BƯỚC 1 & 2: BẢN XEM TRƯỚC & KIỂM TRA TÍNH HỢP LỆ
            ========================================================================= */}
        {isEditable && (
          <section className="bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-ink">
                <Icon name={currentStep === 1 ? 'pending_actions' : 'verified'} className="text-[20px]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-subheading text-subheading text-ink font-medium">Bản xem trước &amp; Kiểm tra tính hợp lệ</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-ink font-label text-label font-medium">
                    {currentStep === 1 ? `${draftRecords.length} môn chờ kiểm tra` : `${validCount}/${draftRecords.length} môn hợp lệ`}
                  </span>
                </div>
                {currentStep === 1 ? (
                  <p className="font-body text-body text-mid-gray mt-0.5">
                    {draftRecords.length === 0
                      ? 'Chưa có học phần nào. Tải tệp bảng điểm hoặc thêm môn học thủ công để bắt đầu tính CPA và tín chỉ tích lũy.'
                      : 'Tải tệp bảng điểm mới hoặc chỉnh sửa danh sách hiện có, sau đó kiểm tra dữ liệu trước khi cập nhật vào hệ thống.'}
                  </p>
                ) : failedCourses.length > 0 ? (
                  <p className="font-body text-body text-mid-gray mt-0.5">
                    {`Cảnh báo: Phát hiện ${failedCourses.length} môn nợ / điểm F: `}
                    <strong className="text-ink font-medium">
                      {failedCourses.map((f) => `${f.courseName} (${f.courseCode})`).join(', ')}
                    </strong>
                    {'. Hệ thống sẽ tự động đưa các môn này vào danh sách ưu tiên gỡ nợ trong Kế hoạch học tập.'}
                  </p>
                ) : inProgressCourses.length > 0 ? (
                  <p className="font-body text-body text-mid-gray mt-0.5">
                    {'Lưu ý: Môn '}
                    <strong className="text-ink font-medium">
                      {inProgressCourses.map((f) => `${f.courseName} (${f.courseCode})`).join(', ')}
                    </strong>
                    {' chưa có điểm tổng kết, chưa được tính vào CPA và tín chỉ tích lũy.'}
                  </p>
                ) : lowGradeCourses.length > 0 ? (
                  <p className="font-body text-body text-mid-gray mt-0.5">
                    {'Lưu ý: Môn '}
                    <strong className="text-ink font-medium">
                      {lowGradeCourses.map((f) => `${f.courseName} (${f.courseCode})`).join(', ')}
                    </strong>
                    {' đạt điểm D/D+, nên cân nhắc học cải thiện.'}
                  </p>
                ) : (
                  <p className="font-body text-body text-mid-gray mt-0.5">
                    Tất cả học phần đều hợp lệ. Nhấn biểu tượng bút trên từng dòng nếu cần sửa số tín chỉ hoặc điểm trước khi xác nhận.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {currentStep === 1 ? (
                <button
                  className="inline-flex items-center gap-1.5 bg-ink text-paper px-5 py-2 rounded-full font-body-medium text-body-medium hover:bg-ink-soft shadow-sm transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
                  type="button"
                  onClick={handleValidateData}
                  disabled={draftRecords.length === 0 || isProcessingFile}
                >
                  <Icon name="fact_check" className="text-[16px]" />
                  <span>Kiểm tra dữ liệu</span>
                </button>
              ) : (
                <>
                  <button
                    className="px-4 py-2 rounded-full font-body-medium text-body-medium text-mid-gray hover:text-ink hover:bg-canvas transition-colors"
                    type="button"
                    onClick={handleCancelReview}
                    title="Hủy bản xem trước, khôi phục bảng điểm hiện hành và quay lại Bước 1"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 bg-ink text-paper px-5 py-2 rounded-full font-body-medium text-body-medium hover:bg-ink-soft shadow-sm transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
                    type="button"
                    onClick={handleGoToConfirm}
                    disabled={draftRecords.length === 0}
                  >
                    <Icon name="sync" className="text-[16px]" />
                    <span>Xác nhận &amp; Cập nhật vào hệ thống</span>
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {/* =========================================================================
            BƯỚC 3: XÁC NHẬN & CẬP NHẬT KẾT QUẢ (CONFIRM STATE)
            ========================================================================= */}
        {currentStep === 3 && !isCommitted && (
          <section className="bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col gap-space-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-ink">
                <Icon name="sync" className="text-[20px]" />
              </div>
              <div className="flex flex-col">
                <span className="font-subheading text-subheading text-ink font-medium">Xác nhận &amp; Cập nhật kết quả vào hồ sơ học vụ</span>
                <p className="font-body text-body text-mid-gray mt-0.5">
                  Kiểm tra các chỉ số được tính tự động từ bảng điểm vừa đối soát. Sau khi xác nhận, Dashboard, Cây môn học và Kế hoạch học tập sẽ đồng bộ ngay lập tức.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-sm">
              {comparisonRows.map((row) => (
                <div key={row.label} className="bg-surface-alt rounded-[18px] p-4 flex flex-col gap-1">
                  <span className="font-caption text-caption uppercase tracking-wider text-mid-gray font-semibold">{row.label}</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-caption text-caption text-mid-gray line-through decoration-hairline">{row.before}</span>
                    <Icon name="arrow_forward" className="text-[14px] text-mid-gray" />
                    <span className="font-subheading text-subheading text-ink font-semibold">{row.after}</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 font-caption text-caption text-mid-gray">
                    {row.warn && <span className="w-1.5 h-1.5 rounded-full bg-ember shrink-0" />}
                    {row.note}
                  </span>
                </div>
              ))}
            </div>

            {failedCourses.length > 0 && (
              <div className="bg-surface-alt rounded-[18px] p-3.5 flex items-start gap-3">
                <Icon name="warning" className="text-[20px] text-ember shrink-0" />
                <div className="flex flex-col">
                  <span className="font-body-medium text-body-medium text-ink font-medium">Lưu ý quan trọng trước khi lưu</span>
                  <span className="font-caption text-caption text-mid-gray">
                    Bạn đang có {failedCourses.length} môn học bị điểm F ({failedCourses.map((f) => f.courseCode).join(', ')}). Sau khi lưu, Sơ đồ Cây môn học sẽ chuyển các môn học sau môn này sang trạng thái bị chặn (Blocked).
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-space-sm border-t border-hairline">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-full font-body-medium text-body-medium text-mid-gray hover:text-ink hover:bg-canvas transition-colors"
              >
                Quay lại điều chỉnh thêm
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="inline-flex items-center justify-center gap-1.5 bg-ink text-paper px-5 py-2 rounded-full font-body-medium text-body-medium hover:bg-ink-soft shadow-sm transition-all duration-150"
              >
                <Icon name="check_circle" className="text-[16px]" />
                <span>Xác nhận &amp; Cập nhật kết quả ngay</span>
              </button>
            </div>
          </section>
        )}

        {/* Trạng thái thành công sau khi ghi vào Store */}
        {isCommitted && (
          <section className="bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center shrink-0 text-paper">
                <Icon name="check" className="text-[20px]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-subheading text-subheading text-ink font-medium">Đã cập nhật bảng điểm vào hồ sơ học vụ</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-ink font-label text-label font-medium">
                    {commitResult.transcriptRecords.length} học phần
                  </span>
                </div>
                <p className="font-body text-body text-mid-gray mt-0.5">
                  {`Nguồn: ${selectedFile?.name || MANUAL_SOURCE_FILE_NAME}. CPA tích lũy `}
                  <strong className="text-ink font-medium">{formatCpa(commitResult.metrics.cpa)}</strong>
                  {` · ${commitResult.metrics.accumulatedCredits}/${commitResult.metrics.totalCreditsRequired} tín chỉ tích lũy.`}
                </p>
                {commitResult.metrics.academicWarning && (
                  <p className="font-caption text-caption text-mid-gray mt-1 inline-flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ember shrink-0 mt-1.5" />
                    {commitResult.metrics.academicWarning}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => resetWizard(commitResult.transcriptRecords)}
                className="px-4 py-2 rounded-full font-body-medium text-body-medium text-mid-gray hover:text-ink hover:bg-canvas transition-colors"
              >
                Nhập bảng điểm khác
              </button>
              <button
                type="button"
                onClick={() => navigate('/curriculum')}
                className="inline-flex items-center gap-1.5 bg-surface-alt hover:bg-surface-container-high text-ink px-4 py-2 rounded-full font-body-medium text-body-medium transition-colors"
              >
                <Icon name="account_tree" className="text-[16px]" />
                <span>Xem cây môn học</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 bg-ink text-paper px-5 py-2 rounded-full font-body-medium text-body-medium hover:bg-ink-soft shadow-sm transition-all duration-150"
              >
                <Icon name="dashboard" className="text-[16px]" />
                <span>Về Tổng quan học tập</span>
              </button>
            </div>
          </section>
        )}

        {/* =========================================================================
            BẢNG HỌC PHẦN (Xem lại & Điều chỉnh inline)
            ========================================================================= */}
        <section className="bg-paper rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-center flex-wrap gap-2">
              <div className="relative flex items-center w-64 md:w-80">
                <Icon name="search" className="absolute left-3 text-[18px] text-mid-gray pointer-events-none" />
                <input
                  className="w-full bg-surface-alt rounded-full pl-9 pr-4 py-2 font-body text-body text-ink placeholder:text-mid-gray focus:outline-none focus:bg-canvas transition-colors"
                  placeholder="Tìm theo mã hoặc tên môn..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="relative">
                <select
                  className="appearance-none bg-surface-alt rounded-full pl-3.5 pr-8 py-2 font-body text-body text-ink focus:outline-none focus:bg-canvas transition-colors cursor-pointer"
                  value={termFilter}
                  onChange={(e) => changeTermFilter(e.target.value)}
                >
                  {semesters
                    .slice()
                    .reverse()
                    .map((code) => (
                      <option key={code} value={code}>
                        {`${termLabel(code)} - Năm học ${academicYearOf(code)}`}
                      </option>
                    ))}
                  <option value="all">Tất cả các học kỳ</option>
                </select>
                <Icon name="expand_more" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-mid-gray pointer-events-none" />
              </div>
            </div>
            {isEditable && (
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  className="inline-flex items-center gap-1 bg-surface-alt hover:bg-surface-container text-ink px-3.5 py-2 rounded-full font-body-medium text-body-medium transition-colors"
                  type="button"
                  onClick={openAddModal}
                >
                  <Icon name="add" />
                  <span>Thêm môn</span>
                </button>
                <button
                  className="inline-flex items-center gap-1 text-mid-gray hover:text-ember px-3.5 py-2 rounded-full font-body-medium text-body-medium hover:bg-canvas transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  type="button"
                  onClick={() => setPendingDelete({ type: 'all' })}
                  disabled={draftRecords.length === 0}
                >
                  <Icon name="delete_sweep" />
                  <span>Xóa tất cả</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-alt font-caption text-caption uppercase tracking-wider text-mid-gray">
                  <th className="py-3 px-5 font-medium">Mã môn</th>
                  <th className="py-3 px-5 font-medium">Tên môn học</th>
                  <th className="py-3 px-4 font-medium text-center">Số TC</th>
                  <th className="py-3 px-4 font-medium text-center">Học kỳ</th>
                  <th className="py-3 px-4 font-medium text-right">Điểm 10</th>
                  <th className="py-3 px-4 font-medium text-center">Điểm chữ</th>
                  <th className="py-3 px-4 font-medium text-right">Điểm 4</th>
                  <th className="py-3 px-5 font-medium">Trạng thái dữ liệu</th>
                  {isEditable && <th className="py-3 px-5 font-medium text-center">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline font-body text-body text-ink">
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={isEditable ? 9 : 8} className="py-space-xl px-5">
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center text-mid-gray">
                          <Icon name={draftRecords.length === 0 ? 'post_add' : 'search_off'} className="text-[24px]" />
                        </div>
                        <span className="font-body-medium text-body-medium text-ink font-medium">
                          {draftRecords.length === 0 ? 'Chưa có môn học nào được thêm' : 'Không tìm thấy học phần phù hợp'}
                        </span>
                        <span className="font-caption text-caption text-mid-gray max-w-sm">
                          {draftRecords.length === 0
                            ? 'Hãy tải tệp bảng điểm hoặc thêm môn học đầu tiên để bắt đầu tính toán điểm CPA và tín chỉ tích lũy.'
                            : 'Thử từ khóa khác hoặc chọn "Tất cả các học kỳ".'}
                        </span>
                        {draftRecords.length === 0 && isEditable && (
                          <button
                            type="button"
                            onClick={openAddModal}
                            className="mt-1 inline-flex items-center gap-1.5 bg-ink text-paper px-4 py-2 rounded-full font-body-medium text-body-medium hover:bg-ink-soft transition-colors"
                          >
                            <Icon name="add" className="text-[16px]" />
                            <span>Thêm môn học đầu tiên</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {visibleRows.map(({ record, index }) => {
                  const status = getRowStatus(record);
                  const editing = isEditable && editingIndex === index;
                  const valueTone = status.muted ? 'text-mid-gray' : '';
                  return (
                    <tr
                      key={`${record.courseCode}-${index}`}
                      className={`${status.highlight ? 'bg-surface-alt/40 hover:bg-surface-alt' : 'hover:bg-surface-alt/70'} transition-colors`}
                    >
                      <td className="py-3.5 px-5 font-mono text-caption font-medium">{record.courseCode}</td>
                      <td className="py-3.5 px-5 font-medium">
                        {record.courseName}
                        {status.note && <span className="block font-caption text-caption text-mid-gray">{status.note}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {editing ? (
                          <input
                            type="number"
                            min="1"
                            max="12"
                            aria-label="Số tín chỉ"
                            className={`${CELL_INPUT_CLASS} w-14`}
                            value={record.credits}
                            onChange={(e) => handleUpdateRecord(index, 'credits', Number(e.target.value))}
                          />
                        ) : (
                          record.credits
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-mid-gray">{termLabel(record.semesterCode)}</td>
                      <td className={`py-3.5 px-4 text-right font-mono font-medium ${valueTone}`}>
                        {editing ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            aria-label="Điểm hệ 10"
                            placeholder="N/A"
                            className={`${CELL_INPUT_CLASS} w-16`}
                            value={record.score10 ?? ''}
                            onChange={(e) =>
                              handleUpdateRecord(index, 'score10', e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        ) : (
                          formatScore(record.score10)
                        )}
                      </td>
                      <td className={`py-3.5 px-4 text-center font-semibold ${valueTone}`}>
                        {editing ? (
                          <select
                            aria-label="Điểm chữ"
                            className={`${CELL_INPUT_CLASS} w-20 font-body`}
                            value={record.letterGrade || ''}
                            onChange={(e) => handleUpdateRecord(index, 'letterGrade', e.target.value)}
                          >
                            <option value="">N/A</option>
                            {LETTER_GRADES.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        ) : (
                          record.letterGrade || '--'
                        )}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-medium ${valueTone}`}>{formatScore(record.score4)}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label text-label text-ink whitespace-nowrap ${status.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {` ${status.label}`}
                        </span>
                      </td>
                      {isEditable && (
                        <td className="py-3.5 px-5 text-center">
                          <div className="inline-flex items-center gap-1 text-mid-gray">
                            <button
                              className={`p-1 rounded-full hover:bg-canvas transition-colors ${editing ? 'text-ink' : 'hover:text-ink'}`}
                              title={editing ? 'Xong' : 'Sửa'}
                              type="button"
                              onClick={() => setEditingIndex(editing ? null : index)}
                            >
                              <Icon name={editing ? 'check' : 'edit'} className="text-[16px]" />
                            </button>
                            <button
                              className="p-1 hover:text-ember rounded-full hover:bg-canvas transition-colors"
                              title="Xóa"
                              type="button"
                              onClick={() => setPendingDelete({ type: 'one', index })}
                            >
                              <Icon name="delete" className="text-[16px]" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-space-md flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-alt font-caption text-caption text-mid-gray">
            <div className="flex items-center gap-2">
              <span>
                {`Hiển thị ${visibleRows.length} trên tổng số ${draftRecords.length} môn đã ghi nhận`}
                {filteredRows.length !== draftRecords.length ? ` (${filteredRows.length} môn khớp bộ lọc)` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-canvas text-mid-gray hover:text-ink transition-colors disabled:opacity-40"
                disabled={safePage <= 1}
                type="button"
                onClick={() => setPage(safePage - 1)}
                aria-label="Trang trước"
              >
                <Icon name="chevron_left" className="text-[16px]" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
                p === safePage ? (
                  <span key={p} className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center font-medium">
                    {p}
                  </span>
                ) : (
                  <button
                    key={p}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-canvas text-mid-gray hover:text-ink transition-colors"
                    type="button"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-canvas text-mid-gray hover:text-ink transition-colors disabled:opacity-40"
                disabled={safePage >= totalPages}
                type="button"
                onClick={() => setPage(safePage + 1)}
                aria-label="Trang sau"
              >
                <Icon name="chevron_right" className="text-[16px]" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal Thêm Môn Học Mới */}
      {showAddModal && (
        <ModalShell onClose={() => setShowAddModal(false)}>
          <div className="p-space-lg border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-ink">
                <Icon name="library_add" className="text-[20px]" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-subheading text-subheading text-ink font-medium">Thêm môn học mới</h3>
                <span className="font-caption text-caption text-mid-gray">Nhập đầy đủ thông tin học phần để tính toán điểm số</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-mid-gray hover:text-ink p-1 rounded-full hover:bg-canvas transition-colors"
              aria-label="Đóng"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
          <form className="p-space-lg flex flex-col gap-space-md" onSubmit={handleAddCourseSubmit} noValidate>
            <div className="flex flex-col gap-1">
              <label className="font-label text-label text-mid-gray font-medium" htmlFor="input-course-code">
                {'Mã môn học '}
                <span className="text-ember">*</span>
              </label>
              <input
                id="input-course-code"
                type="text"
                placeholder="VD: IT6030, CN6012..."
                className={`${FIELD_CLASS} uppercase font-mono`}
                value={newCourseForm.courseCode}
                onChange={(e) => updateCourseForm({ courseCode: e.target.value })}
                autoFocus
              />
              {formErrors.courseCode && (
                <span className="font-caption text-caption text-ember">Vui lòng nhập mã môn học hợp lệ.</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label text-label text-mid-gray font-medium" htmlFor="input-course-name">
                {'Tên môn học '}
                <span className="text-ember">*</span>
              </label>
              <input
                id="input-course-name"
                type="text"
                placeholder="VD: Kiến trúc vi dịch vụ Microservices"
                className={FIELD_CLASS}
                value={newCourseForm.courseName}
                onChange={(e) => updateCourseForm({ courseName: e.target.value })}
              />
              {formErrors.courseName && (
                <span className="font-caption text-caption text-ember">Vui lòng không để trống tên môn.</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label text-label text-mid-gray font-medium" htmlFor="input-course-credits">
                  {'Số tín chỉ (TC) '}
                  <span className="text-ember">*</span>
                </label>
                <input
                  id="input-course-credits"
                  type="number"
                  min="1"
                  max="12"
                  className={FIELD_CLASS}
                  value={newCourseForm.credits}
                  onChange={(e) => updateCourseForm({ credits: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label text-label text-mid-gray font-medium" htmlFor="input-course-term">
                  Học kỳ
                </label>
                <select
                  id="input-course-term"
                  className={FIELD_CLASS}
                  value={newCourseForm.semesterCode}
                  onChange={(e) => updateCourseForm({ semesterCode: e.target.value })}
                >
                  {termOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label text-label text-mid-gray font-medium" htmlFor="input-course-score10">
                  {'Điểm tổng kết (hệ 10) '}
                  <span className="text-ember">*</span>
                </label>
                <input
                  id="input-course-score10"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="VD: 8.0"
                  className={FIELD_CLASS}
                  value={newCourseForm.score10}
                  onChange={(e) => updateCourseForm({ score10: e.target.value, letterGrade: '' })}
                />
                {formErrors.score10 && (
                  <span className="font-caption text-caption text-ember">Nhập điểm hợp lệ từ 0 đến 10.</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label text-label text-mid-gray font-medium" htmlFor="input-course-letter">
                  Điểm chữ
                </label>
                <select
                  id="input-course-letter"
                  className={FIELD_CLASS}
                  value={newCourseForm.letterGrade}
                  onChange={(e) => updateCourseForm({ letterGrade: e.target.value })}
                >
                  <option value="">Tự động theo điểm 10</option>
                  {LETTER_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {`${g} (${GRADE_TO_SCORE4[g].toFixed(1)})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-3 bg-surface-alt rounded-[18px] flex items-center justify-between text-mid-gray font-caption text-caption">
              <span>Ước tính điểm chữ / hệ 4:</span>
              <span className="font-mono font-medium text-ink">{formPreview}</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-full font-body-medium text-body-medium text-mid-gray hover:text-ink hover:bg-canvas transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-ink text-paper px-5 py-2 rounded-full font-body-medium text-body-medium hover:bg-ink-soft transition-colors"
              >
                <Icon name="save" className="text-[16px]" />
                <span>Lưu học phần</span>
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal Xác nhận xóa học phần */}
      {pendingDelete && (
        <ModalShell onClose={() => setPendingDelete(null)} maxWidth="max-w-md">
          <div className="p-space-lg flex flex-col gap-space-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-ember">
                <Icon name="warning" className="text-[22px]" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-subheading text-subheading text-ink font-semibold">
                  {pendingDelete.type === 'all' ? 'Xác nhận xóa tất cả học phần?' : 'Xác nhận xóa học phần?'}
                </h3>
                <p className="font-body text-body text-mid-gray mt-1">
                  Hành động này sẽ loại bỏ học phần khỏi danh sách tính điểm tạm thời và ảnh hưởng tới GPA/CPA ước tính.
                </p>
                <p className="font-caption font-mono text-ink mt-2 bg-surface-alt p-2 rounded-[12px]">
                  {pendingDelete.type === 'all'
                    ? `Tất cả ${draftRecords.length} học phần`
                    : `Học phần: ${draftRecords[pendingDelete.index]?.courseCode || ''}`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 rounded-full font-body-medium text-body-medium text-mid-gray hover:text-ink hover:bg-canvas transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 bg-ember text-on-error px-4 py-2 rounded-full font-body-medium text-body-medium hover:opacity-90 transition-opacity"
              >
                <Icon name="delete" className="text-[16px]" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Modal Quy đổi thang điểm */}
      {showConvertModal && (
        <ModalShell onClose={() => setShowConvertModal(false)} maxWidth="max-w-md">
          <div className="p-space-lg border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-ink">
                <Icon name="tune" className="text-[20px]" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-subheading text-subheading text-ink font-medium">Quy đổi thang điểm</h3>
                <span className="font-caption text-caption text-mid-gray">Điểm hệ 10 → Điểm chữ → Điểm hệ 4 (quy chế tín chỉ HaUI)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowConvertModal(false)}
              className="text-mid-gray hover:text-ink p-1 rounded-full hover:bg-canvas transition-colors"
              aria-label="Đóng"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
          <div className="p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="Nhập điểm hệ 10, VD: 7.8"
                className={FIELD_CLASS}
                value={convertInput}
                onChange={(e) => setConvertInput(e.target.value)}
                autoFocus
              />
              <span className="font-mono font-medium text-ink whitespace-nowrap">
                {convertPreview && convertPreview.letterGrade
                  ? `${convertPreview.letterGrade} / ${formatScore(convertPreview.score4)}`
                  : '-- / --'}
              </span>
            </div>
            <div className="rounded-[18px] border border-hairline overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-alt font-caption text-caption uppercase tracking-wider text-mid-gray">
                    <th className="py-2 px-4 font-medium">Điểm 10</th>
                    <th className="py-2 px-4 font-medium text-center">Điểm chữ</th>
                    <th className="py-2 px-4 font-medium text-right">Điểm 4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline font-body text-body text-ink">
                  {GRADE_SCALE.map((row) => (
                    <tr
                      key={row.letter}
                      className={convertPreview?.letterGrade === row.letter ? 'bg-surface-alt' : ''}
                    >
                      <td className="py-2 px-4 font-mono">{row.range}</td>
                      <td className="py-2 px-4 text-center font-semibold">{row.letter}</td>
                      <td className="py-2 px-4 text-right font-mono">{row.score4}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Toast thông báo */}
      <div
        className={`fixed bottom-6 right-6 z-50 max-w-md transition-all duration-300 ${
          toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="bg-ink text-paper rounded-[20px] shadow-sm p-4 flex items-center gap-3 border border-hairline">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toast.tone === 'error' ? 'bg-ember' : 'bg-paper/20'
            }`}
          >
            <Icon name={toast.tone === 'error' ? 'priority_high' : 'check'} className="text-[18px] text-paper" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="font-body-medium text-body-medium font-medium leading-tight">{toast.title || 'Thông báo'}</p>
            <p className="font-caption text-caption text-mid-gray leading-tight mt-0.5 truncate">
              {toast.desc || 'Hệ thống đã cập nhật thành công'}
            </p>
          </div>
          <button
            type="button"
            className="text-mid-gray hover:text-paper p-1"
            onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
            aria-label="Đóng thông báo"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      </div>

      {/* Phím tắt kiểm thử nhanh cho Giảng viên & Hội đồng Đánh giá (chỉ hiện trong panel dev) */}
      <DevSlot title="Nhập bảng điểm">
        <button
          type="button"
          className={DEV_BUTTON_CLASS}
          onClick={handleUseDemoFile}
          disabled={isProcessingFile}
          title="Nạp ngay 7 môn học mẫu chuẩn K17 để test luồng review"
        >
          <Icon name="bolt" className="text-[16px]" />
          {`Dùng file demo ${DEMO_FILE_NAME}`}
        </button>
        <button
          type="button"
          className={DEV_BUTTON_CLASS}
          onClick={handleSimulateInvalidFile}
          disabled={isProcessingFile}
          title="Kiểm thử nhánh bắt lỗi định dạng file sai quy chuẩn (.docx)"
        >
          <Icon name="error" className="text-[16px] text-ember" />
          Mô phỏng File Sai Định Dạng (.docx)
        </button>
        <button
          type="button"
          className={DEV_BUTTON_CLASS}
          onClick={() => resetWizard(snapshot.transcriptRecords)}
        >
          <Icon name="restart_alt" className="text-[16px]" />
          Làm lại từ Bước 1
        </button>
      </DevSlot>
    </div>
  );
}

export default TranscriptImportPage;
