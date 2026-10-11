import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import {
  getAcademicSnapshot,
  getDynamicCurriculumTree,
  subscribeAcademicStore
} from '../services/academicStore.js';
import { Modal } from '../components/ui/index.js';
import { DevSlot } from '../components/dev/DevTools.jsx';

/**
 * Màn hình 4 & Luồng phụ B: Cây môn học & Sơ đồ tiên quyết (`/curriculum`, `/curriculum/tree`) — TV2
 * Giao diện theo prototype `cay_mon_hoc` (prototype-v1, đơn sắc):
 * - Breadcrumb + tiêu đề, chuyển chế độ Sơ đồ luồng (Flowchart) / Dạng bảng, làm mới, Xuất lộ trình PDF (in trang).
 * - 4 thẻ thống kê: Đã hoàn thành / Đang theo học / Đủ điều kiện đăng ký / Chưa đủ điều kiện (Khóa).
 * - Thanh lọc (Học kỳ, Khối kiến thức, Chuyên ngành, Trạng thái, Tìm môn) + chú thích sơ đồ.
 * - Mạng lưới học phần theo kỳ có đường nối tiên quyết; panel Chi tiết học phần (tiên quyết, chuỗi ảnh hưởng,
 *   hành động Thêm vào Kế hoạch / Mô phỏng What-if / Tư vấn) và thẻ khuyến nghị cố vấn.
 * Dữ liệu: `api.academic.getCurriculum()`; ở chế độ MOCK trạng thái Node lấy từ `getDynamicCurriculumTree()` của store
 * để khớp bảng điểm/persona hiện hành. 4 màu Node (GREEN / YELLOW / GRAY / RED) được quy về ngôn ngữ trạng thái đơn sắc:
 * hoàn thành = dấu tích, đang học = chấm mực đặc, đủ điều kiện = vòng tròn rỗng, khóa / trượt = ổ khóa + điểm nhấn ember.
 * Mục 5 Edge Cases & AC-02: Popup cảnh báo và vô hiệu hóa nút [ Thêm môn ] khi vi phạm môn tiên quyết.
 * Ô tìm kiếm trên Topbar điều hướng tới `/curriculum?q=…` — trang điền sẵn ô tìm và chọn môn khớp đầu tiên.
 */

/** Khối kiến thức theo nhãn prototype ↔ giá trị `block` trong dữ liệu CTĐT */
const BLOCK_OPTIONS = Object.freeze([
  { value: 'ALL', label: 'Tất cả khối' },
  { value: 'Đại cương', label: 'Đại cương & Khoa học cơ bản' },
  { value: 'Cơ sở ngành', label: 'Cơ sở nhóm ngành CNTT' },
  { value: 'Chuyên ngành', label: 'Chuyên ngành Kỹ thuật Phần mềm' },
  { value: 'Tự chọn', label: 'Tự chọn chuyên ngành' },
  { value: 'Tốt nghiệp', label: 'Thực tập doanh nghiệp & Khóa luận' }
]);

/** Trạng thái học phần (quy đổi từ 4 màu Node) dùng cho bộ lọc */
const STATUS_OPTIONS = Object.freeze([
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'done', label: 'Đã hoàn thành' },
  { value: 'studying', label: 'Đang học' },
  { value: 'eligible', label: 'Đủ ĐK đăng ký' },
  { value: 'locked', label: 'Khóa (Thiếu môn trước)' },
  { value: 'failed', label: 'Trượt / Nợ môn (F)' }
]);

const STATUS_META = Object.freeze({
  done: { label: 'Đã hoàn thành', pill: 'bg-canvas text-ink' },
  studying: { label: 'Đang học', pill: 'bg-ink text-paper' },
  eligible: { label: 'Đủ điều kiện', pill: 'bg-paper text-ink ring-1 ring-ink' },
  locked: { label: 'Khóa', pill: 'bg-canvas text-ember' },
  failed: { label: 'Trượt (F)', pill: 'bg-paper text-ember ring-1 ring-ember' }
});

/** Quan hệ tiên quyết theo quy chế (BR-01 / BR-02 / BR-09) */
const RELATION_LABELS = Object.freeze({
  'PREREQUISITE (BR-01)': 'Môn tiên quyết bắt buộc',
  'PRIOR (BR-02)': 'Môn học trước',
  'PREREQUISITE (BR-09)': 'Điều kiện làm đồ án (BR-09)'
});

/** Cổng tra cứu CTĐT chính thức (nội dung tĩnh của prototype) */
const OFFICIAL_PORTAL = 'sv.haui.edu.vn';

/** Trạng thái hiển thị dùng để review giao diện (chỉ trong panel công cụ dev) */
const DEV_VIEW_STATES = Object.freeze([
  { key: 'live', label: 'Thực tế' },
  { key: 'loading', label: 'Đang tải' },
  { key: 'empty', label: 'Trống' },
  { key: 'error', label: 'Lỗi' }
]);

const INK = '#0a0a0a';
const EMBER = '#e7000b';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function isPassedRecord(record) {
  return Boolean(record) && (record.status === 'PASSED' || record.status === 'PASSED_LOW');
}

/**
 * Quy đổi trạng thái/màu Node của cây CTĐT về 5 nhóm hiển thị: done | studying | eligible | locked | failed
 * @param {Object} course
 * @param {Object|null} record - bản ghi bảng điểm của sinh viên cho môn này (nếu có)
 */
function deriveStatusKind(course, record) {
  switch (course?.status) {
    case 'BLOCKED':
      return 'locked';
    case 'FAILED':
      return 'failed';
    case 'IN_PROGRESS':
      return 'studying';
    case 'PASSED':
    case 'PASSED_LOW':
      return 'done';
    case 'AI_RECOMMENDED':
      // AI đề xuất: đã qua môn (học cải thiện) hoặc chưa học (đăng ký kỳ tới)
      return isPassedRecord(record) ? 'done' : 'eligible';
    case 'READY_TO_TAKE':
    case 'NOT_TAKEN':
      return 'eligible';
    default:
      return { GREEN: 'done', YELLOW: 'studying', GRAY: 'eligible', RED: 'locked' }[course?.nodeColor] || 'eligible';
  }
}

function countStudiedSemesters(records = []) {
  return new Set(records.map((r) => r.semesterCode).filter(Boolean)).size;
}

function formatScore(value) {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value).toFixed(1);
}

function formatGrade(grade) {
  if (!grade) return null;
  const score = formatScore(grade.score10);
  if (score && grade.letterGrade) return `${score} (${grade.letterGrade})`;
  return grade.letterGrade || score;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

function sumCredits(list) {
  return list.reduce((total, item) => total + Number(item?.credits || 0), 0);
}

function bySemesterThenOrder(a, b) {
  return (a.semester || 0) - (b.semester || 0) || a.order - b.order;
}

function semesterTag(semester, currentSemester) {
  if (currentSemester && semester === currentSemester) return 'Hiện tại';
  if (currentSemester && semester === currentSemester + 1) return 'Kế tiếp';
  if (semester === 8) return 'Tốt nghiệp';
  return null;
}

/** Ký hiệu trạng thái theo chú thích sơ đồ của prototype */
function StatusGlyph({ kind }) {
  if (kind === 'done') {
    return (
      <span className="w-3 h-3 rounded-full bg-paper ring-1 ring-ink flex items-center justify-center text-[8px] font-bold text-ink shrink-0">
        ✓
      </span>
    );
  }
  if (kind === 'studying') return <span className="w-3 h-3 rounded-full bg-ink shrink-0" />;
  if (kind === 'eligible') return <span className="w-3 h-3 rounded-full bg-surface-container ring-1 ring-mid-gray shrink-0" />;
  return (
    <span className="material-symbols-outlined text-[14px] text-ember shrink-0">
      {kind === 'failed' ? 'error' : 'lock'}
    </span>
  );
}

/** Dòng trạng thái ở chân thẻ học phần */
function CourseCardStatus({ course }) {
  const grade = formatGrade(course.grade);
  switch (course.kind) {
    case 'done':
      return (
        <div className="flex items-center gap-1 text-ink font-caption text-caption min-w-0">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          <span className="truncate">{grade ? `Đạt điểm: ${grade}` : 'Đã hoàn thành'}</span>
        </div>
      );
    case 'studying':
      return (
        <div className="flex items-center gap-1.5 text-ink font-caption text-caption min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-ink shrink-0" />
          <span className="font-medium truncate">Đang học</span>
        </div>
      );
    case 'eligible':
      return (
        <div className="flex items-center gap-1.5 text-ink font-caption text-caption min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-surface-container ring-1 ring-mid-gray shrink-0" />
          <span className="font-medium truncate">Đủ điều kiện đăng ký</span>
        </div>
      );
    case 'failed':
      return (
        <div className="flex items-center gap-1 text-ember font-caption text-caption min-w-0">
          <span className="material-symbols-outlined text-[14px]">error</span>
          <span className="font-medium truncate">{grade ? `Trượt: ${grade} · Học lại` : 'Trượt · Cần học lại'}</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1 text-mid-gray font-caption text-caption min-w-0">
          <span className="material-symbols-outlined text-[14px] text-ember">lock</span>
          <span className="truncate">Chưa đủ điều kiện (Khóa)</span>
        </div>
      );
  }
}

/** Thẻ thống kê (4 thẻ đầu trang) */
function StatCard({ icon, iconFill = false, muted = false, label, value, detail, badge, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-left bg-paper p-space-md rounded-2xl border shadow-sm flex items-center gap-3.5 h-full transition-all hover:shadow ${
        active ? 'border-ink' : 'border-hairline'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full bg-canvas ${muted ? 'text-mid-gray' : 'text-ink'} flex items-center justify-center shrink-0`}
      >
        <span
          className="material-symbols-outlined text-[20px]"
          style={iconFill ? { fontVariationSettings: '"FILL" 1' } : undefined}
        >
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        {badge ? (
          <div className="flex items-center justify-between gap-1">
            <p className="font-label text-caption text-mid-gray uppercase tracking-wider truncate font-medium">{label}</p>
            <span className="bg-ink text-paper text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0">{badge}</span>
          </div>
        ) : (
          <p className="font-label text-caption text-mid-gray uppercase tracking-wider truncate font-medium">{label}</p>
        )}
        <p className="font-headline text-[24px] font-bold text-ink leading-none mt-1">{value}</p>
        <p className="font-caption text-caption text-mid-gray mt-1.5 flex items-center gap-1 font-medium truncate">{detail}</p>
      </div>
    </button>
  );
}

/** Ô chọn dạng viên thuốc của thanh lọc */
function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-1.5 bg-canvas px-3 py-1.5 rounded-full">
      <span className="font-caption text-caption text-mid-gray whitespace-nowrap">{label}</span>
      <select
        className="bg-transparent font-body-medium text-body-medium text-ink focus:outline-none cursor-pointer max-w-[240px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Thẻ trạng thái (đang tải / lỗi / trống) theo ngôn ngữ hình ảnh prototype */
function StateCard({ icon, iconClass = 'text-ink', spin = false, title, description, children }) {
  return (
    <div className="bg-paper p-space-xl rounded-[24px] border border-hairline shadow-sm flex flex-col items-center text-center gap-space-sm">
      <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center">
        <span className={`material-symbols-outlined text-[24px] ${iconClass} ${spin ? 'animate-spin' : ''}`}>{icon}</span>
      </div>
      <p className="font-subheading text-subheading text-ink font-semibold">{title}</p>
      {description && <p className="font-body text-body text-mid-gray max-w-xl">{description}</p>}
      {children}
    </div>
  );
}

export function CurriculumTreePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [curriculum, setCurriculum] = useState(null);
  const [snapshot, setSnapshot] = useState(() => getAcademicSnapshot());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devViewState, setDevViewState] = useState('live');

  // Chế độ xem & bộ lọc (Màn hình 4 UI Flow: theo kỳ, khối kiến thức, chuyên ngành hẹp, trạng thái Node, tìm môn)
  const [viewMode, setViewMode] = useState('flow'); // 'flow' | 'table'
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState(queryParam);

  // Học phần đang được chọn trên sơ đồ (lưu theo mã để giữ lựa chọn khi dữ liệu tải lại)
  const [selectedCode, setSelectedCode] = useState(null);

  // State kiểm tra điều kiện tiên quyết & Popup cảnh báo AC-02 (POST /api/v1/academic/eligibility)
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);
  const [eligibilityCourseCode, setEligibilityCourseCode] = useState(null);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(null);

  const requestIdRef = useRef(0);
  const pendingSearchSelectRef = useRef(Boolean(queryParam.trim()));
  const networkRef = useRef(null);
  const cardRefs = useRef(new Map());
  const [scrollTarget, setScrollTarget] = useState(null);
  const [edgeLayout, setEdgeLayout] = useState({ width: 0, height: 0, paths: [] });

  const loadCurriculum = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await api.academic.getCurriculum();
      if (requestId !== requestIdRef.current) return;
      // MOCK: trạng thái Node tính động từ bảng điểm trong store; LIVE: dùng phản hồi backend
      setCurriculum(api.isMockMode() ? getDynamicCurriculumTree() : response);
      setSnapshot(getAcademicSnapshot());
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurriculum();
    const unsubStore = subscribeAcademicStore(() => {
      loadCurriculum();
    });
    const unsubApi = api.subscribe(() => {
      loadCurriculum();
    });
    return () => {
      unsubStore();
      unsubApi();
    };
  }, [loadCurriculum]);

  // Ô tìm kiếm Topbar → `/curriculum?q=…`: điền sẵn ô tìm trên sơ đồ và chọn môn khớp đầu tiên
  useEffect(() => {
    setSearch(queryParam);
    pendingSearchSelectRef.current = Boolean(queryParam.trim());
  }, [queryParam, location.key]);

  const recordMap = useMemo(() => {
    const map = new Map();
    (snapshot.transcriptRecords || []).forEach((record) => map.set(record.courseCode, record));
    return map;
  }, [snapshot]);

  const courses = useMemo(() => {
    const list = Array.isArray(curriculum?.courses) ? curriculum.courses : [];
    return list.map((course, index) => {
      const record = recordMap.get(course.courseCode) || null;
      const kind = deriveStatusKind(course, record);
      const hasGrade = kind === 'done' || kind === 'failed';
      let grade = null;
      if (record && record.score4 !== null && record.score4 !== undefined) {
        grade = { score10: record.score10, letterGrade: record.letterGrade };
      } else if (hasGrade && course.letterGrade) {
        grade = { score10: course.score10, letterGrade: course.letterGrade };
      }
      return {
        ...course,
        prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites : [],
        unlocks: Array.isArray(course.unlocks) ? course.unlocks : [],
        order: index,
        record,
        kind,
        grade,
        aiRecommended: course.status === 'AI_RECOMMENDED'
      };
    });
  }, [curriculum, recordMap]);

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.courseCode, c])), [courses]);

  // Đồ thị phụ thuộc ngược: môn → các môn cần môn này làm tiên quyết (chuỗi ảnh hưởng)
  const dependentsMap = useMemo(() => {
    const map = new Map();
    const link = (from, to) => {
      if (!map.has(from)) map.set(from, new Set());
      map.get(from).add(to);
    };
    courses.forEach((course) => {
      course.prerequisites.forEach((code) => link(code, course.courseCode));
      course.unlocks.forEach((code) => link(course.courseCode, code));
    });
    return map;
  }, [courses]);

  const isPrereqSatisfied = useCallback(
    (code) => isPassedRecord(recordMap.get(code)) || courseMap.get(code)?.kind === 'done',
    [recordMap, courseMap]
  );

  const collectImpact = useCallback(
    (code) => {
      const direct = [...(dependentsMap.get(code) || [])];
      const seen = new Set([code, ...direct]);
      const queue = [...direct];
      const indirect = [];
      while (queue.length > 0) {
        const current = queue.shift();
        for (const next of dependentsMap.get(current) || []) {
          if (!seen.has(next)) {
            seen.add(next);
            indirect.push(next);
            queue.push(next);
          }
        }
      }
      return { direct, indirect };
    },
    [dependentsMap]
  );

  const metrics = snapshot.metrics || {};
  const student = snapshot.student || {};
  const studiedSemesters = countStudiedSemesters(snapshot.transcriptRecords || []);
  const currentSemester = studiedSemesters > 0 ? Math.min(8, studiedSemesters) : null;
  const nextSemester = Math.min(8, (currentSemester || 0) + 1);
  const cohortShort = String(student.cohort || '').split(' ')[0];

  const specializationOptions = useMemo(() => {
    const values = [...new Set(courses.map((c) => c.specialization).filter(Boolean))];
    return [{ value: 'ALL', label: 'Tất cả chuyên ngành' }, ...values.map((v) => ({ value: v, label: v }))];
  }, [courses]);

  const semesterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Tất cả kỳ (1 - 8)' },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
        value: String(sem),
        label: `Kỳ ${sem} (${semesterTag(sem, currentSemester) || `Năm ${Math.ceil(sem / 2)}`})`
      }))
    ],
    [currentSemester]
  );

  const filteredCourses = useMemo(
    () =>
      courses
        .filter((c) => {
          if (semesterFilter !== 'ALL' && String(c.semester) !== semesterFilter) return false;
          if (blockFilter !== 'ALL' && c.block !== blockFilter) return false;
          if (specializationFilter !== 'ALL' && c.specialization !== specializationFilter) return false;
          if (statusFilter !== 'ALL' && c.kind !== statusFilter) return false;
          return true;
        })
        .sort(bySemesterThenOrder),
    [courses, semesterFilter, blockFilter, specializationFilter, statusFilter]
  );

  const filtersActive =
    semesterFilter !== 'ALL' || blockFilter !== 'ALL' || specializationFilter !== 'ALL' || statusFilter !== 'ALL';

  const resetFilters = useCallback(() => {
    setSemesterFilter('ALL');
    setBlockFilter('ALL');
    setSpecializationFilter('ALL');
    setStatusFilter('ALL');
  }, []);

  const normalizedSearch = normalizeText(search);
  const matchesSearch = useCallback(
    (course) => !normalizedSearch || normalizeText(`${course.courseCode} ${course.courseName}`).includes(normalizedSearch),
    [normalizedSearch]
  );
  const searchMatchCount = normalizedSearch ? filteredCourses.filter(matchesSearch).length : 0;
  const tableRows = normalizedSearch ? filteredCourses.filter(matchesSearch) : filteredCourses;

  const semesterGroups = useMemo(() => {
    const semesters = [...new Set(filteredCourses.map((c) => c.semester))].sort((a, b) => a - b);
    return semesters.map((semester) => ({
      semester,
      courses: filteredCourses.filter((c) => c.semester === semester)
    }));
  }, [filteredCourses]);

  // Mặc định chọn môn "nút thắt" (môn trượt) → đang học → AI đề xuất → đủ điều kiện → môn đầu tiên
  useEffect(() => {
    if (courses.length === 0) return;
    if (selectedCode && courseMap.has(selectedCode)) return;
    const pick =
      courses.find((c) => c.kind === 'failed') ||
      courses.find((c) => c.kind === 'studying') ||
      courses.find((c) => c.kind === 'eligible' && c.aiRecommended) ||
      courses.find((c) => c.kind === 'eligible') ||
      courses[0];
    setSelectedCode(pick.courseCode);
  }, [courses, courseMap, selectedCode]);

  // Chọn môn khớp đầu tiên khi từ khóa tìm kiếm thay đổi
  useEffect(() => {
    if (!pendingSearchSelectRef.current || courses.length === 0) return;
    pendingSearchSelectRef.current = false;
    if (!normalizedSearch) return;
    const isMatch = (c) => normalizeText(`${c.courseCode} ${c.courseName}`).includes(normalizedSearch);
    let first = filteredCourses.find(isMatch);
    if (!first) {
      first = [...courses].sort(bySemesterThenOrder).find(isMatch);
      if (first) resetFilters();
    }
    if (first) {
      setSelectedCode(first.courseCode);
      setScrollTarget({ code: first.courseCode, smooth: false, at: Date.now() });
    }
  }, [normalizedSearch, courses, filteredCourses, resetFilters]);

  const selected = selectedCode ? courseMap.get(selectedCode) || null : null;

  const handleSelectCourse = useCallback((code, { scroll = false } = {}) => {
    setSelectedCode(code);
    if (scroll) setScrollTarget({ code, smooth: true, at: Date.now() });
  }, []);

  const handleCheckCourseEligibility = async (course) => {
    if (!course) return;
    setSelectedCode(course.courseCode);
    setEligibilityCourseCode(course.courseCode);
    setEligibilityModalOpen(true);
    setCheckingEligibility(true);
    setEligibilityError(null);
    setEligibilityResult(null);

    try {
      const res = await api.academic.checkEligibility({ courseCode: course.courseCode });
      setEligibilityResult(res);
    } catch (err) {
      setEligibilityError(err);
    } finally {
      setCheckingEligibility(false);
    }
  };

  // ---- Trạng thái hiển thị ----
  const showLoading = devViewState === 'loading' || (loading && !curriculum && !error);
  const showError = !showLoading && (devViewState === 'error' || (Boolean(error) && !loading));
  const showEmpty = !showLoading && !showError && (devViewState === 'empty' || (Boolean(curriculum) && courses.length === 0));
  const showContent = !showLoading && !showError && !showEmpty && Boolean(curriculum);
  const isRefreshing = loading && Boolean(curriculum);

  // ---- Đường nối tiên quyết giữa các thẻ (đo vị trí thực tế sau khi render) ----
  const visibleEdges = useMemo(() => {
    const visible = new Set(filteredCourses.map((c) => c.courseCode));
    const edges = [];
    filteredCourses.forEach((course) => {
      course.prerequisites.forEach((code) => {
        if (visible.has(code)) edges.push({ from: code, to: course.courseCode });
      });
    });
    return edges;
  }, [filteredCourses]);

  const measureEdges = useCallback(() => {
    const root = networkRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const paths = [];
    visibleEdges.forEach((edge) => {
      const fromEl = cardRefs.current.get(edge.from);
      const toEl = cardRefs.current.get(edge.to);
      if (!fromEl || !toEl) return;
      const a = fromEl.getBoundingClientRect();
      const b = toEl.getBoundingClientRect();
      const x1 = Math.round(a.right - rootRect.left);
      const y1 = Math.round(a.top + a.height / 2 - rootRect.top);
      const x2 = Math.round(b.left - rootRect.left - 3);
      const y2 = Math.round(b.top + b.height / 2 - rootRect.top);
      const bend = Math.max(20, Math.round((x2 - x1) / 2));
      paths.push({
        key: `${edge.from}->${edge.to}`,
        from: edge.from,
        to: edge.to,
        d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`
      });
    });
    const next = { width: Math.ceil(root.scrollWidth), height: Math.ceil(root.scrollHeight), paths };
    setEdgeLayout((prev) =>
      prev.width === next.width && prev.height === next.height && JSON.stringify(prev.paths) === JSON.stringify(next.paths)
        ? prev
        : next
    );
  }, [visibleEdges]);

  useLayoutEffect(() => {
    if (viewMode === 'flow' && showContent) measureEdges();
  }, [measureEdges, viewMode, showContent, selectedCode, normalizedSearch]);

  useEffect(() => {
    if (viewMode !== 'flow' || !showContent) return undefined;
    const root = networkRef.current;
    if (!root) return undefined;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureEdges);
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (observer) {
      observer.observe(root);
      cardRefs.current.forEach((el) => observer.observe(el));
    }
    window.addEventListener('resize', schedule);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(schedule).catch(() => {});
    }
    return () => {
      cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [measureEdges, viewMode, showContent]);

  // Cuộn thẻ được chọn (qua tìm kiếm / chuỗi ảnh hưởng) vào giữa sơ đồ
  useEffect(() => {
    if (!scrollTarget || viewMode !== 'flow') return;
    const el = cardRefs.current.get(scrollTarget.code);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: scrollTarget.smooth ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });
    }
  }, [scrollTarget, viewMode, showContent]);

  const setCardRef = (code) => (el) => {
    if (el) cardRefs.current.set(code, el);
    else cardRefs.current.delete(code);
  };

  // ---- Số liệu 4 thẻ thống kê ----
  const stats = useMemo(() => {
    const ofKind = (kind) => courses.filter((c) => c.kind === kind);
    const done = ofKind('done');
    const eligible = ofKind('eligible');
    const locked = ofKind('locked');
    const failed = ofKind('failed');
    const inProgress = Array.isArray(metrics.inProgressCourses) ? metrics.inProgressCourses : [];
    const rootBlockers = failed
      .filter((f) => locked.some((l) => l.prerequisites.includes(f.courseCode)))
      .map((f) => f.courseCode);
    return {
      doneCount: done.length,
      inProgressCount: inProgress.length,
      inProgressCredits: sumCredits(inProgress),
      eligibleCount: eligible.length,
      eligibleCredits: sumCredits(eligible),
      eligibleAiCount: eligible.filter((c) => c.aiRecommended).length,
      lockedCount: locked.length,
      lockedCredits: sumCredits(locked),
      rootBlockers
    };
  }, [courses, metrics.inProgressCourses]);

  const toggleStatusFilter = (kind) => setStatusFilter((prev) => (prev === kind ? 'ALL' : kind));

  // ---- Panel chi tiết học phần ----
  const selectedPrereqs = selected
    ? selected.prerequisites.map((code) => ({
        code,
        course: courseMap.get(code) || null,
        record: recordMap.get(code) || null,
        satisfied: isPrereqSatisfied(code)
      }))
    : [];
  const satisfiedPrereqCount = selectedPrereqs.filter((p) => p.satisfied).length;
  const selectedImpact = selected ? collectImpact(selected.courseCode) : { direct: [], indirect: [] };
  const selectedMeta = selected ? STATUS_META[selected.kind] : null;
  const selectedTag = selected ? semesterTag(selected.semester, currentSemester) : null;

  // ---- Popup kiểm tra điều kiện (AC-02) ----
  const eligibilityCourse = eligibilityCourseCode ? courseMap.get(eligibilityCourseCode) || null : null;
  const localMissing = eligibilityCourse
    ? eligibilityCourse.prerequisites.filter((code) => !isPrereqSatisfied(code))
    : [];
  const usingStoreRules = api.isMockMode();
  // MOCK: fixture Rule Engine tĩnh → điều kiện tiên quyết đối chiếu bảng điểm trong store; LIVE: tin phản hồi backend
  const eligibleToAdd = Boolean(eligibilityResult) &&
    (usingStoreRules ? localMissing.length === 0 : Boolean(eligibilityResult.eligible) && localMissing.length === 0);
  const ruleEngineAgrees = Boolean(eligibilityResult) && Boolean(eligibilityResult.eligible) === eligibleToAdd;
  const missingList = (() => {
    const local = localMissing.map((code) => {
      const c = courseMap.get(code);
      const grade = formatGrade(c?.grade);
      return `${code} - ${c?.courseName || 'Học phần tiên quyết'}${grade ? ` (Đang điểm ${grade})` : ' (Chưa hoàn thành)'}`;
    });
    if (usingStoreRules || !Array.isArray(eligibilityResult?.missingPrerequisites)) return local;
    return [...new Set([...eligibilityResult.missingPrerequisites, ...local])];
  })();

  const renderNetwork = () => (
    <div className="relative overflow-x-auto pb-4 pt-2 -mx-space-sm px-space-sm">
      <div ref={networkRef} className="relative flex gap-6 w-max min-w-full">
        <svg
          className="absolute left-0 top-0 pointer-events-none z-0"
          width={edgeLayout.width || 1}
          height={edgeLayout.height || 1}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <marker id="cm-arrow-ink" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="6" refY="5" viewBox="0 0 10 10">
              <path d="M 0 1 L 8 5 L 0 9 z" fill={INK} />
            </marker>
            <marker id="cm-arrow-muted" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="6" refY="5" viewBox="0 0 10 10">
              <path d="M 0 1 L 8 5 L 0 9 z" fill={INK} fillOpacity="0.3" />
            </marker>
            <marker id="cm-arrow-ember" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="6" refY="5" viewBox="0 0 10 10">
              <path d="M 0 1 L 8 5 L 0 9 z" fill={EMBER} />
            </marker>
          </defs>
          {edgeLayout.paths.map((path) => {
            const related = path.from === selectedCode || path.to === selectedCode;
            const unmet = !isPrereqSatisfied(path.from);
            const sourceKind = courseMap.get(path.from)?.kind;
            const warn =
              related && unmet && (sourceKind === 'failed' || sourceKind === 'locked') && courseMap.get(path.to)?.kind === 'locked';
            const marker = warn ? 'cm-arrow-ember' : related ? 'cm-arrow-ink' : 'cm-arrow-muted';
            return (
              <path
                key={path.key}
                d={path.d}
                fill="none"
                stroke={warn ? EMBER : INK}
                strokeOpacity={related ? 1 : 0.3}
                strokeWidth={related ? 2 : 1.5}
                strokeDasharray={related && !unmet ? undefined : '3 3'}
                markerEnd={`url(#${marker})`}
              />
            );
          })}
        </svg>

        {semesterGroups.map((group) => {
          const tag = semesterTag(group.semester, currentSemester);
          const isCurrent = tag === 'Hiện tại';
          const credits = sumCredits(group.courses);
          const allDone = group.courses.every((c) => c.kind === 'done');
          const title = `Học kỳ ${group.semester}${tag ? ` (${tag})` : ''}`;
          return (
            <div
              key={group.semester}
              className={`${
                isCurrent ? 'w-64 bg-canvas/60 p-2.5 rounded-2xl border-2 border-ink/10' : 'w-60'
              } flex flex-col gap-space-md shrink-0 relative z-10`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-hairline">
                {isCurrent ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-ink animate-ping" />
                    <span className="font-body-medium text-body-medium text-ink font-semibold">{title}</span>
                  </div>
                ) : (
                  <span
                    className={`font-body-medium text-body-medium font-semibold ${
                      group.semester === 8 ? 'text-mid-gray' : 'text-ink'
                    }`}
                  >
                    {title}
                  </span>
                )}
                {isCurrent ? (
                  <span className="font-label text-label px-2 py-0.5 rounded-full bg-ink text-paper">{credits} TC</span>
                ) : (
                  <span className="font-caption text-caption text-mid-gray">
                    {credits} TC{allDone ? ' (Xong)' : tag === 'Kế tiếp' ? ' (Dự kiến)' : ''}
                  </span>
                )}
              </div>

              {group.courses.map((course) => {
                const isSelected = course.courseCode === selectedCode;
                const matched = Boolean(normalizedSearch) && matchesSearch(course);
                const dimmed = Boolean(normalizedSearch) && !matched;
                const missing = course.prerequisites.filter((code) => !isPrereqSatisfied(code));
                const blocks = (dependentsMap.get(course.courseCode) || new Set()).size;
                let subtitle = course.block;
                if (course.kind === 'locked' && missing.length > 0) subtitle = `Tiên quyết: ${missing.join(', ')}`;
                else if (course.kind === 'failed' && blocks > 0) subtitle = `Đang chặn ${blocks} môn phía sau`;
                else if (course.aiRecommended && course.kind === 'eligible') subtitle = 'AI đề xuất đăng ký kỳ tới';
                else if (course.aiRecommended && course.kind === 'done') subtitle = 'AI đề xuất học cải thiện';
                const locked = course.kind === 'locked';
                const surface = locked ? 'bg-surface-alt' : 'bg-paper';
                const outline =
                  course.kind === 'eligible'
                    ? 'border border-dashed border-ink/40'
                    : course.kind === 'failed'
                      ? 'border border-ember/40'
                      : '';
                const elevation = isSelected
                  ? 'ring-2 ring-ink shadow-md'
                  : matched
                    ? 'ring-1 ring-ink/60 shadow-sm hover:shadow'
                    : 'shadow-sm hover:shadow';
                const fade = dimmed ? 'opacity-30' : '';
                return (
                  <div
                    key={course.courseCode}
                    ref={setCardRef(course.courseCode)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectCourse(course.courseCode)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectCourse(course.courseCode);
                      }
                    }}
                    className={`course-card p-3.5 ${surface} ${outline} ${elevation} ${fade} rounded-2xl transition-all cursor-pointer flex flex-col gap-2 relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-ink`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-caption text-caption font-semibold ${locked ? 'text-mid-gray' : 'text-ink'}`}>
                        {course.courseCode}
                      </span>
                      <span
                        className={`font-label text-label px-2 py-0.5 rounded-full ${
                          course.kind === 'studying' || (isCurrent && !locked)
                            ? 'bg-ink text-paper'
                            : locked
                              ? 'bg-surface-variant text-mid-gray'
                              : 'bg-canvas text-ink'
                        }`}
                      >
                        {course.credits} TC
                      </span>
                    </div>
                    <div>
                      <h4
                        className={`font-body-medium text-body-medium leading-snug ${
                          locked ? 'text-mid-gray' : 'text-ink'
                        } ${isSelected ? 'font-semibold' : 'font-medium'}`}
                      >
                        {course.courseName}
                      </h4>
                      <p className="font-caption text-caption text-mid-gray mt-0.5">{subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-hairline">
                      <CourseCardStatus course={course} />
                      {isSelected ? (
                        <span className="font-label text-label text-paper bg-ink px-1.5 rounded shrink-0">Xem</span>
                      ) : course.kind === 'eligible' ? (
                        <span className="material-symbols-outlined text-[14px] text-mid-gray">add_circle</span>
                      ) : locked ? (
                        <span className="material-symbols-outlined text-[14px] text-mid-gray">info</span>
                      ) : (
                        <span className="material-symbols-outlined text-[14px] text-mid-gray opacity-0 group-hover:opacity-100 transition-opacity">
                          arrow_forward
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTable = () => (
    <div className="overflow-x-auto -mx-space-sm px-space-sm">
      <table className="w-full min-w-[660px] text-left border-collapse">
        <thead>
          <tr className="border-b border-hairline">
            {['Kỳ', 'Học phần', 'TC', 'Tiên quyết', 'Mở khóa', 'Điểm', 'Trạng thái', ''].map((head, idx) => (
              <th
                key={head || `col-${idx}`}
                className={`py-2 px-1.5 font-label text-label text-mid-gray uppercase tracking-wider font-medium whitespace-nowrap ${
                  head === 'TC' || head === 'Kỳ' ? 'text-center' : ''
                }`}
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => {
            const isSelected = row.courseCode === selectedCode;
            const grade = formatGrade(row.grade);
            const isLockedRow = row.kind === 'locked';
            return (
              <tr
                key={row.courseCode}
                onClick={() => handleSelectCourse(row.courseCode)}
                aria-selected={isSelected}
                className={`border-b border-hairline cursor-pointer transition-colors ${
                  isSelected ? 'bg-canvas' : 'hover:bg-surface-alt'
                }`}
              >
                <td className="py-2.5 px-1.5 text-center font-caption text-caption text-mid-gray">{row.semester}</td>
                <td className="py-2.5 px-1.5">
                  <p className="font-caption text-caption font-semibold text-ink">{row.courseCode}</p>
                  <p className={`font-body-medium text-body-medium leading-snug ${isLockedRow ? 'text-mid-gray' : 'text-ink'}`}>
                    {row.courseName}
                  </p>
                  <p className="font-caption text-caption text-mid-gray">{row.block}</p>
                </td>
                <td className="py-2.5 px-1.5 text-center font-body text-body text-ink">{row.credits}</td>
                <td className="py-2.5 px-1.5">
                  {row.prerequisites.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {row.prerequisites.map((code) => (
                        <span
                          key={code}
                          className={`font-label text-label px-2 py-0.5 rounded-full ring-1 bg-paper ${
                            isPrereqSatisfied(code) ? 'text-ink ring-hairline' : 'text-ember ring-ember/40'
                          }`}
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="font-caption text-caption text-mid-gray">Không</span>
                  )}
                </td>
                <td className="py-2.5 px-1.5 font-caption text-caption text-mid-gray">
                  {row.unlocks.length > 0 ? (
                    <span title={`Là tiên quyết của: ${row.unlocks.join(', ')}`}>→ {row.unlocks.join(', ')}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td
                  className={`py-2.5 px-1.5 font-body-medium text-body-medium whitespace-nowrap ${
                    row.kind === 'failed' ? 'text-ember' : 'text-ink'
                  }`}
                >
                  {grade || <span className="font-caption text-caption text-mid-gray">—</span>}
                </td>
                <td className="py-2.5 px-1.5">
                  <span className="inline-flex items-center gap-1.5 font-caption text-caption text-ink whitespace-nowrap">
                    <StatusGlyph kind={row.kind} />
                    {STATUS_META[row.kind].label}
                  </span>
                </td>
                <td className="py-2.5 px-1.5 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckCourseEligibility(row);
                    }}
                    title={isLockedRow ? 'Kiểm tra chặn (AC-02)' : 'Thêm vào Kế hoạch học tập'}
                    aria-label={isLockedRow ? `Kiểm tra chặn ${row.courseCode}` : `Thêm ${row.courseCode} vào Kế hoạch`}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-canvas hover:bg-surface-variant text-ink transition-colors"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isLockedRow ? 'text-ember' : ''}`}>
                      {isLockedRow ? 'lock' : 'add_task'}
                    </span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderDetailPanel = () => {
    if (!selected) {
      return (
        <div className="bg-paper p-space-lg rounded-2xl shadow-sm flex flex-col items-center text-center gap-space-sm">
          <span className="material-symbols-outlined text-[24px] text-mid-gray">touch_app</span>
          <p className="font-body-medium text-body-medium text-ink">Chưa chọn học phần</p>
          <p className="font-caption text-caption text-mid-gray">Nhấp vào một thẻ môn trên sơ đồ để xem chi tiết và luồng tiên quyết.</p>
        </div>
      );
    }

    const grade = formatGrade(selected.grade);
    const isLocked = selected.kind === 'locked';
    return (
      <div className="bg-paper p-space-lg rounded-2xl shadow-sm flex flex-col gap-space-md">
        <div className="flex items-start justify-between gap-2 pb-space-sm border-b border-hairline">
          <div className="min-w-0">
            <span className="font-caption text-caption text-mid-gray uppercase tracking-wider">Chi tiết học phần</span>
            <h3 className="font-subheading text-subheading text-ink font-semibold mt-0.5 truncate" title={selected.courseName}>
              {selected.courseName}
            </h3>
            <p className="font-caption text-caption text-mid-gray mt-0.5">
              <span className="font-medium text-ink">{selected.courseCode}</span>
              {' • '}
              <span>
                {selected.credits} Tín chỉ ({selected.lectureHours ?? 0} LT + {selected.labHours ?? 0} TH tiết)
              </span>
            </p>
          </div>
          <span className={`px-space-sm py-0.5 rounded-full font-label text-label shrink-0 ${selectedMeta.pill}`}>
            {selectedMeta.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-canvas p-space-sm rounded-xl">
          <div>
            <p className="font-caption text-caption text-mid-gray">Điểm học phần</p>
            <p
              className={`font-body-medium text-body-medium font-semibold mt-0.5 ${
                selected.kind === 'failed' ? 'text-ember' : 'text-ink'
              }`}
            >
              {grade ? `${grade}` : selected.kind === 'studying' ? 'Đang học (chưa có điểm)' : 'Chưa có điểm'}
            </p>
          </div>
          <div>
            <p className="font-caption text-caption text-mid-gray">Độ khó đánh giá</p>
            <p className="font-body-medium text-body-medium text-ink font-semibold mt-0.5">{selected.difficulty || '—'}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 font-body text-body">
          <div className="flex items-center justify-between gap-2 text-mid-gray py-1 border-b border-hairline">
            <span className="font-caption text-caption shrink-0">Khối kiến thức:</span>
            <span className="font-body-medium text-body-medium text-ink text-right">{selected.block}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-mid-gray py-1 border-b border-hairline">
            <span className="font-caption text-caption shrink-0">Học kỳ đào tạo:</span>
            <span className="font-body-medium text-body-medium text-ink text-right">
              Học kỳ {selected.semester}
              {selectedTag ? ` (${selectedTag})` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-mid-gray py-1">
            <span className="font-caption text-caption shrink-0">Chuyên ngành:</span>
            <span className="font-body-medium text-body-medium text-ink text-right truncate">{selected.specialization || '—'}</span>
          </div>
        </div>

        {selected.description && (
          <div className="flex flex-col gap-1.5">
            <h5 className="font-label text-label text-mid-gray uppercase tracking-wider">Đề cương tóm tắt</h5>
            <p className="font-body text-body text-on-surface-variant bg-surface-alt p-3 rounded-xl leading-relaxed">
              {selected.description}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-label text-label text-mid-gray uppercase tracking-wider">MÔN TIÊN QUYẾT & MÔN HỌC TRƯỚC</h5>
            {selectedPrereqs.length > 0 && (
              <span
                className={`font-caption text-caption font-medium shrink-0 ${
                  satisfiedPrereqCount === selectedPrereqs.length ? 'text-ink' : 'text-ember'
                }`}
              >
                {satisfiedPrereqCount === selectedPrereqs.length
                  ? `Đã đáp ứng tất cả (${satisfiedPrereqCount}/${selectedPrereqs.length})`
                  : `Còn thiếu ${selectedPrereqs.length - satisfiedPrereqCount}/${selectedPrereqs.length}`}
              </span>
            )}
          </div>
          {selectedPrereqs.length > 0 ? (
            <div className="flex flex-col gap-2">
              {selectedPrereqs.map((prereq) => {
                const prereqGrade = formatGrade(
                  prereq.record && prereq.record.score4 !== null
                    ? { score10: prereq.record.score10, letterGrade: prereq.record.letterGrade }
                    : prereq.course?.grade
                );
                return (
                  <button
                    type="button"
                    key={prereq.code}
                    onClick={() => prereq.course && handleSelectCourse(prereq.code, { scroll: true })}
                    className="flex items-start justify-between gap-2 p-space-sm bg-canvas rounded-xl text-left hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <span className={`material-symbols-outlined text-[18px] ${prereq.satisfied ? 'text-ink' : 'text-ember'}`}>
                        {prereq.satisfied ? 'check_circle' : 'lock'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-body-medium text-body-medium text-ink truncate">
                          {prereq.code} - {prereq.course?.courseName || prereq.record?.courseName || 'Học phần ngoài sơ đồ'}
                        </p>
                        <p className="font-caption text-caption text-mid-gray">
                          {RELATION_LABELS[selected.relationType] || 'Môn tiên quyết'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-label text-label px-2 py-0.5 bg-paper rounded-full shrink-0 shadow-sm ${
                        prereq.satisfied ? 'text-ink' : 'text-ember'
                      }`}
                    >
                      {prereq.satisfied
                        ? prereqGrade
                          ? `${prereqGrade.replace(/\((.+)\)/, '(Điểm $1)')}`
                          : 'Đã đạt'
                        : prereqGrade
                          ? `${prereqGrade} · Chưa đạt`
                          : 'Chưa học'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="font-caption text-caption text-mid-gray p-space-sm bg-canvas rounded-xl">
              Không yêu cầu môn tiên quyết — có thể đăng ký ngay khi mở lớp.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-label text-label text-mid-gray uppercase tracking-wider">CHUỖI ẢNH HƯỞNG · MÔN MỞ KHÓA TIẾP THEO</h5>
            {selectedImpact.direct.length + selectedImpact.indirect.length > 0 && (
              <span className="font-caption text-caption text-ink font-medium shrink-0">
                {selectedImpact.direct.length + selectedImpact.indirect.length} môn
              </span>
            )}
          </div>
          {selectedImpact.direct.length > 0 ? (
            <div className="flex flex-col gap-2">
              {selectedImpact.direct.map((code) => {
                const target = courseMap.get(code);
                const selectedDone = isPrereqSatisfied(selected.courseCode);
                const blockedByThis =
                  Boolean(target) && !selectedDone && (selected.kind === 'failed' || selected.kind === 'locked');
                let icon = 'schedule';
                let condition = 'Học phần ngoài sơ đồ mẫu';
                if (target) {
                  if (target.kind === 'done') {
                    icon = 'check_circle';
                    condition = 'Đã hoàn thành';
                  } else if (target.kind === 'studying') {
                    icon = 'pending';
                    condition = `Đang học · Học kỳ ${target.semester}`;
                  } else if (blockedByThis) {
                    icon = 'lock';
                    condition = `Đang bị chặn bởi ${selected.courseCode} (Học kỳ ${target.semester})`;
                  } else if (!selectedDone) {
                    icon = 'schedule';
                    condition = `Mở khóa khi hoàn thành ${selected.courseCode} · Học kỳ ${target.semester}`;
                  } else if (target.kind === 'locked') {
                    icon = 'lock';
                    condition = `Còn thiếu tiên quyết khác (Học kỳ ${target.semester})`;
                  } else {
                    icon = 'lock_open';
                    condition = `Đủ điều kiện · Đăng ký Học kỳ ${target.semester}`;
                  }
                }
                return (
                  <button
                    type="button"
                    key={code}
                    disabled={!target}
                    onClick={() => target && handleSelectCourse(code, { scroll: true })}
                    className="flex items-center justify-between gap-2 p-space-sm bg-canvas rounded-xl text-left enabled:hover:bg-surface-container transition-colors disabled:cursor-default"
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          icon === 'lock' && blockedByThis ? 'text-ember' : 'text-mid-gray'
                        }`}
                      >
                        {icon}
                      </span>
                      <div className="min-w-0">
                        <p className="font-body-medium text-body-medium text-ink truncate">
                          {code} - {target?.courseName || 'Chưa có trong dữ liệu mẫu'}
                        </p>
                        <p className="font-caption text-caption text-mid-gray truncate">{condition}</p>
                      </div>
                    </div>
                    {target && <span className="material-symbols-outlined text-[16px] text-mid-gray">arrow_forward</span>}
                  </button>
                );
              })}
              {selectedImpact.indirect.length > 0 && (
                <p className="font-caption text-caption text-mid-gray">
                  Ảnh hưởng gián tiếp:{' '}
                  <span className="text-ink font-medium">{selectedImpact.indirect.join(' → ')}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="font-caption text-caption text-mid-gray p-space-sm bg-canvas rounded-xl">
              Không chặn môn tiếp theo trong chương trình đào tạo.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-space-xs border-t border-hairline">
          <button
            type="button"
            onClick={() => handleCheckCourseEligibility(selected)}
            className="w-full py-2.5 px-4 bg-ink hover:bg-ink-soft text-paper rounded-full font-body-medium text-body-medium flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">{isLocked ? 'lock' : 'add_task'}</span>
            <span>{isLocked ? 'Kiểm tra điều kiện đăng ký' : `Thêm vào Kế hoạch học kỳ ${nextSemester}`}</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/what-if?course_id=${encodeURIComponent(selected.courseCode)}`}
              className="py-2 px-3 bg-canvas hover:bg-surface-variant text-ink rounded-full font-label text-label flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">insights</span>
              <span>Mô phỏng What-if</span>
            </Link>
            <button
              type="button"
              onClick={() => navigate(`/chat?course_id=${encodeURIComponent(selected.courseCode)}`)}
              className="py-2 px-3 bg-canvas hover:bg-surface-variant text-ink rounded-full font-label text-label flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">support_agent</span>
              <span>Tư vấn giảng viên</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAdvisorTip = () => (
    <div className="bg-paper p-space-md rounded-2xl shadow-sm flex items-start gap-space-sm">
      <div className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center shrink-0 text-ink">
        <span className="material-symbols-outlined text-[18px]">tips_and_updates</span>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-body-medium text-body-medium text-ink font-semibold">Khuyến nghị từ cố vấn học tập HaUI</p>
        {selected ? (
          <p className="font-caption text-caption text-mid-gray leading-relaxed">
            {'Môn '}
            <strong className="text-ink">{selected.courseCode}</strong>
            {`: ${selected.instructorNote || 'Theo dõi tiến độ học phần theo kế hoạch học tập.'}`}
            {selected.kind === 'failed' && selectedImpact.direct.length + selectedImpact.indirect.length > 0 && (
              <>
                {` Ưu tiên học lại ở Học kỳ ${nextSemester} để mở khóa `}
                <strong className="text-ink">{selectedImpact.direct.length + selectedImpact.indirect.length} học phần</strong>
                {' phía sau.'}
              </>
            )}
          </p>
        ) : (
          <p className="font-caption text-caption text-mid-gray leading-relaxed">
            Chọn một học phần trên sơ đồ để nhận khuyến nghị theo luồng tiên quyết.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 pt-1">
          <Link to="/recommendations" className="inline-flex items-center gap-1 font-label text-label text-ink hover:underline">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Quay lại đề xuất
          </Link>
          <Link to="/planner" className="inline-flex items-center gap-1 font-label text-label text-ink hover:underline">
            Mở Kế hoạch học tập
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );

  const errorMessage = devViewState === 'error' ? 'Mô phỏng lỗi tải dữ liệu (công cụ dev).' : error?.message;

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg lg:p-space-xl flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
        {/* Breadcrumb + tiêu đề + hành động */}
        <div className="flex flex-col gap-space-xs">
          <nav className="flex items-center gap-space-xs font-caption text-caption text-mid-gray">
            <Link className="hover:text-ink transition-colors flex items-center gap-1" to="/">
              <span className="material-symbols-outlined text-[14px]">home</span>
              Trang chủ
            </Link>
            <span className="text-hairline">/</span>
            <span className="text-ink font-medium">Cây môn học & Lộ trình tiên quyết</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-xs">
            <div>
              <h1 className="font-headline text-headline text-ink tracking-tight font-semibold">Cây môn học & Sơ đồ tiên quyết</h1>
              <p className="font-body text-body text-mid-gray max-w-3xl mt-1">
                Trực quan hóa cấu trúc {curriculum?.totalCredits || student.totalCreditsRequired || 135} tín chỉ ngành{' '}
                {student.majorName || 'Công nghệ Thông tin'}
                {cohortShort ? ` - Khóa ${cohortShort} HaUI` : ''}, liên kết luồng môn học tiên quyết và tiến độ thực tế của
                sinh viên.
              </p>
            </div>
            <div className="flex items-center gap-space-sm shrink-0 print:hidden">
              <div className="inline-flex p-1 bg-surface-container rounded-full">
                <button
                  type="button"
                  title="Chế độ sơ đồ luồng"
                  aria-pressed={viewMode === 'flow'}
                  onClick={() => setViewMode('flow')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label text-label transition-all ${
                    viewMode === 'flow' ? 'bg-paper text-ink shadow-sm' : 'text-mid-gray hover:text-ink'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">account_tree</span>
                  <span>Sơ đồ luồng (Flowchart)</span>
                </button>
                <button
                  type="button"
                  title="Chuyển sang dạng bảng"
                  aria-pressed={viewMode === 'table'}
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label text-label transition-all ${
                    viewMode === 'table' ? 'bg-paper text-ink shadow-sm' : 'text-mid-gray hover:text-ink'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">view_list</span>
                  <span>Dạng bảng</span>
                </button>
              </div>
              <button
                type="button"
                title="Làm mới trạng thái"
                onClick={loadCurriculum}
                disabled={loading}
                className="p-2 rounded-full bg-paper hover:bg-canvas text-ink transition-colors shadow-sm disabled:cursor-wait"
              >
                <span className={`material-symbols-outlined text-[18px] block ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink hover:bg-ink-soft text-paper font-body-medium text-body-medium shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Xuất lộ trình PDF</span>
              </button>
            </div>
          </div>
        </div>

        <DevSlot title="Cây môn học">
          <div className="flex flex-wrap gap-1">
            {DEV_VIEW_STATES.map((state) => (
              <button
                key={state.key}
                type="button"
                onClick={() => setDevViewState(state.key)}
                className={`px-3 py-1 rounded-full font-label text-label transition-colors ${
                  devViewState === state.key ? 'bg-ink text-paper' : 'bg-canvas text-ink hover:bg-surface-variant'
                }`}
              >
                {state.label}
              </button>
            ))}
          </div>
          <p className="font-caption text-caption text-mid-gray">
            Nguồn: {usingStoreRules ? 'getDynamicCurriculumTree() (store)' : 'GET /academic/curriculum'}
            {curriculum?.programCode ? ` · ${curriculum.programCode}` : ''}
            {curriculum?.regulationTag ? ` · ${curriculum.regulationTag}` : ''}
          </p>
          {eligibilityResult && (
            <pre className="max-h-48 overflow-auto bg-canvas rounded-xl p-2 text-[11px] leading-4 text-ink">
              {JSON.stringify(eligibilityResult, null, 2)}
            </pre>
          )}
        </DevSlot>

        {showLoading && (
          <StateCard
            icon="progress_activity"
            spin
            title="Đang dựng Sơ đồ Cây quan hệ môn học..."
            description="Đang tải khung chương trình đào tạo và đối chiếu với bảng điểm của bạn."
          />
        )}

        {showError && (
          <StateCard
            icon="error"
            iconClass="text-ember"
            title="Không thể tải dữ liệu Sơ đồ Cây CTĐT"
            description={errorMessage || 'Đã xảy ra lỗi khi gọi GET /academic/curriculum.'}
          >
            {error?.code && devViewState !== 'error' && (
              <p className="font-caption text-caption text-mid-gray">
                Mã lỗi: {error.code}
                {error.requestId ? ` · ${error.requestId}` : ''}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setDevViewState('live');
                loadCurriculum();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink hover:bg-ink-soft text-paper font-body-medium text-body-medium transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Thử lại
            </button>
          </StateCard>
        )}

        {showEmpty && (
          <StateCard
            icon="account_tree"
            iconClass="text-mid-gray"
            title="Chưa có dữ liệu khung chương trình đào tạo"
            description="Hệ thống chưa nhận được danh mục học phần cho ngành của bạn. Hãy làm mới hoặc nạp bảng điểm để đối chiếu tiến độ."
          >
            <Link
              to="/transcript"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-canvas hover:bg-surface-variant text-ink font-body-medium text-body-medium transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              Nhập bảng điểm
            </Link>
          </StateCard>
        )}

        {showContent && (
          <>
            {/* 4 thẻ thống kê */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon="check_circle"
                iconFill
                label="Đã hoàn thành"
                value={`${stats.doneCount} môn`}
                detail={
                  <>
                    <span>{metrics.accumulatedCredits ?? 0} tín chỉ</span>
                    <span>·</span>
                    <span className="text-ink font-semibold">{formatPercent(metrics.progressPercent)}</span>
                  </>
                }
                active={statusFilter === 'done'}
                onClick={() => toggleStatusFilter('done')}
              />
              <StatCard
                icon="menu_book"
                label="Đang theo học"
                value={`${stats.inProgressCount} môn`}
                detail={`${stats.inProgressCredits} tín chỉ · ${
                  currentSemester ? `Kỳ ${currentSemester} hiện tại` : 'Chưa nạp bảng điểm'
                }`}
                active={statusFilter === 'studying'}
                onClick={() => toggleStatusFilter('studying')}
              />
              <StatCard
                icon="how_to_reg"
                label="Đủ điều kiện đăng ký"
                value={`${stats.eligibleCount} môn`}
                detail={`${stats.eligibleCredits} tín chỉ (${stats.eligibleAiCount} môn AI đề xuất)`}
                active={statusFilter === 'eligible'}
                onClick={() => toggleStatusFilter('eligible')}
              />
              <StatCard
                icon="lock"
                muted
                badge="Khóa"
                label="Chưa đủ điều kiện"
                value={`${stats.lockedCount} môn`}
                detail={
                  <>
                    <span>{stats.lockedCredits} tín chỉ</span>
                    <span>·</span>
                    {stats.rootBlockers.length > 0 ? (
                      <span className="text-ember">Do nợ {stats.rootBlockers.join(', ')}</span>
                    ) : (
                      <span>Thiếu tiên quyết</span>
                    )}
                  </>
                }
                active={statusFilter === 'locked'}
                onClick={() => toggleStatusFilter('locked')}
              />
            </div>

            {/* Thanh lọc + chú thích */}
            <div className="bg-paper p-space-md rounded-2xl shadow-sm flex flex-col gap-space-md print:hidden">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
                <div className="flex flex-wrap items-center gap-space-sm">
                  <FilterSelect label="Học kỳ:" value={semesterFilter} onChange={setSemesterFilter} options={semesterOptions} />
                  <FilterSelect label="Khối kiến thức:" value={blockFilter} onChange={setBlockFilter} options={BLOCK_OPTIONS} />
                  <FilterSelect
                    label="Chuyên ngành:"
                    value={specializationFilter}
                    onChange={setSpecializationFilter}
                    options={specializationOptions}
                  />
                  <FilterSelect label="Trạng thái:" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label text-label text-mid-gray hover:text-ink transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                      Đặt lại bộ lọc
                    </button>
                  )}
                </div>
                <div className="relative w-full lg:w-80 shrink-0">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-mid-gray">search</span>
                  <input
                    className="w-full bg-canvas text-ink placeholder:text-mid-gray pl-9 pr-9 py-2 rounded-full font-body text-body focus:outline-none focus:ring-1 focus:ring-ink transition-all"
                    placeholder="Tìm môn trên sơ đồ (VD: IT6001, Giải thuật...)"
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      pendingSearchSelectRef.current = true;
                    }}
                    aria-label="Tìm môn trên sơ đồ"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1.5 w-7 h-7 rounded-full flex items-center justify-center text-mid-gray hover:text-ink"
                      aria-label="Xóa từ khóa"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="pt-space-sm border-t border-hairline flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                <div className="flex flex-wrap items-center gap-space-md text-mid-gray font-caption text-caption">
                  <span className="font-medium text-ink">Chú thích sơ đồ:</span>
                  <div className="flex items-center gap-1.5">
                    <StatusGlyph kind="done" />
                    <span>Đã hoàn thành</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusGlyph kind="studying" />
                    <span>Đang học</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusGlyph kind="eligible" />
                    <span>Đủ điều kiện</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusGlyph kind="locked" />
                    <span>Khóa / Thiếu tiên quyết</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusGlyph kind="failed" />
                    <span>Trượt / Nợ môn</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-6 h-2 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 8">
                      <line strokeDasharray="2 2" strokeWidth="1.5" x1="0" x2="20" y1="4" y2="4" />
                      <polyline points="18,1 23,4 18,7" strokeWidth="1.5" />
                    </svg>
                    <span>Luồng môn tiên quyết</span>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 text-mid-gray font-caption text-caption"
                  title={curriculum?.programName || undefined}
                >
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  <span>
                    {`Dữ liệu mẫu CTĐT ${curriculum?.programCode || 'HaUI'}. Đối chiếu chính thức tại `}
                    <strong>{OFFICIAL_PORTAL}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Sơ đồ / Bảng + Panel chi tiết */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
              <div className="lg:col-span-8 bg-paper p-space-lg rounded-2xl shadow-sm flex flex-col gap-space-md overflow-hidden relative">
                <div className="flex items-center justify-between gap-space-sm pb-space-xs border-b border-hairline">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[20px] text-ink">
                      {viewMode === 'flow' ? 'device_hub' : 'view_list'}
                    </span>
                    <span className="font-subheading text-subheading text-ink font-semibold">
                      {viewMode === 'flow' ? 'Sơ đồ mạng lưới học phần (Theo kỳ)' : 'Danh mục học phần CTĐT (Dạng bảng)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs text-mid-gray font-caption text-caption shrink-0">
                    {selected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-canvas rounded-full">
                        <span className="w-2 h-2 rounded-full bg-ember animate-pulse" />
                        {` Đang chọn: ${selected.courseCode}`}
                      </span>
                    )}
                    <span className="hidden sm:inline">
                      {normalizedSearch
                        ? `${searchMatchCount} môn khớp “${search.trim()}”`
                        : viewMode === 'flow'
                          ? 'Nhấp vào thẻ môn để xem luồng'
                          : `${tableRows.length} học phần`}
                    </span>
                  </div>
                </div>

                {filteredCourses.length === 0 || (viewMode === 'table' && tableRows.length === 0) ? (
                  <div className="flex flex-col items-center text-center gap-space-sm py-space-xl">
                    <span className="material-symbols-outlined text-[24px] text-mid-gray">filter_alt_off</span>
                    <p className="font-body-medium text-body-medium text-ink">Không có học phần nào thuộc bộ lọc này</p>
                    <p className="font-caption text-caption text-mid-gray">
                      Hãy đặt lại bộ lọc về &ldquo;Tất cả&rdquo; để xem toàn bộ cây chương trình đào tạo.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        resetFilters();
                        setSearch('');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink hover:bg-ink-soft text-paper font-body-medium text-body-medium transition-all"
                    >
                      Đặt lại bộ lọc
                    </button>
                  </div>
                ) : viewMode === 'flow' ? (
                  renderNetwork()
                ) : (
                  renderTable()
                )}
              </div>

              <div className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-20">
                {renderDetailPanel()}
                {renderAdvisorTip()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Popup Kiểm tra Tiên quyết & Xử lý Ngoại lệ Mục 5 UI Flow / AC-02 */}
      <Modal
        isOpen={eligibilityModalOpen}
        onClose={() => setEligibilityModalOpen(false)}
        title={`Thẩm định điều kiện tiên quyết: ${eligibilityCourse?.courseCode || eligibilityCourseCode || ''} — ${
          eligibilityCourse?.courseName || ''
        }`}
        subtitle="Kết quả từ POST /api/v1/academic/eligibility (Kịch bản nghiệm thu AC-02 & Mục 5 Edge Cases)"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEligibilityModalOpen(false)}
              className="px-4 py-2 rounded-full bg-canvas hover:bg-surface-variant text-ink font-body-medium text-body-medium transition-colors"
            >
              Đóng (ESC)
            </button>
            {/* Mục 5 Edge Cases & AC-02: Nút [ Thêm môn ] bị vô hiệu hóa nếu vi phạm môn tiên quyết */}
            <button
              type="button"
              disabled={!eligibleToAdd || checkingEligibility}
              onClick={() => {
                setEligibilityModalOpen(false);
                navigate(`/planner?course_id=${encodeURIComponent(eligibilityCourseCode || '')}`);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink hover:bg-ink-soft text-paper font-body-medium text-body-medium transition-all disabled:bg-surface-variant disabled:text-mid-gray disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">{eligibleToAdd ? 'add_task' : 'block'}</span>
              {eligibleToAdd || checkingEligibility || !eligibilityResult
                ? `Thêm vào Kế hoạch học kỳ ${nextSemester}`
                : 'Đã khóa [Thêm môn] (Vi phạm tiên quyết BR-01)'}
            </button>
          </>
        }
      >
        {checkingEligibility && (
          <div className="flex items-center gap-space-sm py-space-md font-body text-body text-mid-gray">
            <span className="material-symbols-outlined text-[20px] animate-spin text-ink">progress_activity</span>
            Rule Engine đang kiểm tra điều kiện tiên quyết...
          </div>
        )}

        {eligibilityError && !checkingEligibility && (
          <div className="flex flex-col gap-space-sm p-space-md rounded-2xl border border-hairline">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px] text-ember">error</span>
              <p className="font-body-medium text-body-medium text-ink">Không thể kiểm tra điều kiện học phần</p>
            </div>
            <p className="font-caption text-caption text-mid-gray">{eligibilityError.message}</p>
            <button
              type="button"
              onClick={() => eligibilityCourse && handleCheckCourseEligibility(eligibilityCourse)}
              className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas hover:bg-surface-variant text-ink font-label text-label transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Thử lại
            </button>
          </div>
        )}

        {eligibilityResult && !checkingEligibility && (
          <div className="flex flex-col gap-space-md">
            {!eligibleToAdd ? (
              <div className="flex items-start gap-space-sm p-space-md rounded-2xl border border-ember/30 bg-paper">
                <span className="material-symbols-outlined text-[20px] text-ember">lock</span>
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-body-medium text-body-medium text-ember">Cảnh báo vi phạm tiên quyết (AC-02 / BR-01)</p>
                  <p className="font-body text-body text-ink">
                    AI gợi ý: <em>&ldquo;Bạn cần học và đạt {localMissing.length > 0 ? localMissing.join(', ') : 'các môn tiên quyết'} trước khi
                    đăng ký môn {eligibilityCourse?.courseName || eligibilityCourseCode}.&rdquo;</em>
                  </p>
                  <p className="font-caption text-caption text-mid-gray">Nút [ Thêm môn ] đã bị vô hiệu hóa tự động.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-space-sm p-space-md rounded-2xl bg-canvas">
                <span className="material-symbols-outlined text-[20px] text-ink">check_circle</span>
                <p className="font-body text-body text-ink">
                  <strong>Thỏa mãn điều kiện tiên quyết:</strong> Học phần này đủ điều kiện đưa vào Kế hoạch học tập học kỳ{' '}
                  {nextSemester}.
                </p>
              </div>
            )}

            {missingList.length > 0 && (
              <div className="flex flex-col gap-1">
                <h5 className="font-label text-label text-mid-gray uppercase tracking-wider">HỌC PHẦN TIÊN QUYẾT CÒN NỢ</h5>
                <ul className="list-disc pl-5 font-body text-body text-ember">
                  {missingList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {eligibilityCourse && (
              <div className="flex flex-col gap-1">
                <h5 className="font-label text-label text-mid-gray uppercase tracking-wider">CHUỖI ẢNH HƯỞNG</h5>
                {(() => {
                  const impact = collectImpact(eligibilityCourse.courseCode);
                  const all = [...impact.direct, ...impact.indirect];
                  return all.length > 0 ? (
                    <p className="font-body text-body text-ink">
                      {eligibilityCourse.courseCode} là tiên quyết (trực tiếp hoặc gián tiếp) của{' '}
                      <strong>{all.join(', ')}</strong>.
                    </p>
                  ) : (
                    <p className="font-body text-body text-mid-gray">Không chặn môn tiếp theo.</p>
                  );
                })()}
              </div>
            )}

            {Array.isArray(eligibilityResult.warnings) && eligibilityResult.warnings.length > 0 && ruleEngineAgrees && (
              <div className="flex flex-col gap-1">
                <h5 className="font-label text-label text-mid-gray uppercase tracking-wider">Chi tiết thẩm định từ Rule Engine</h5>
                <ul className="list-disc pl-5 font-body text-body text-mid-gray">
                  {eligibilityResult.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CurriculumTreePage;
