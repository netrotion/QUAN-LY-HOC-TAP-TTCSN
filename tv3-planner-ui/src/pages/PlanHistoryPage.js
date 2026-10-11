import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { plannerStore, PLAN_STATUSES, evaluatePlanRules } from '../services/plannerStore.js';

const h = React.createElement;

/**
 * Màn hình Lịch sử & Quản lý các phiên bản kế hoạch học tập (prototype: lich_su_ke_hoach) — TV3
 * Dựng theo `tv3-planner-ui/design/prototype/lich_su_ke_hoach/code.html`, dữ liệu thật lấy từ plannerStore.
 *
 * Tính năng chính:
 * 1. 4 thẻ tổng quan: Đang áp dụng (ACTIVE) / Bản nháp (DRAFT) / Đã kiểm tra quy chế / Lưu trữ (ARCHIVED).
 * 2. So sánh nhanh 2 phiên bản được chọn (mặc định: bản ACTIVE vs bản nháp mới nhất) + khác biệt môn học từng kỳ.
 * 3. Bộ lọc trạng thái, sắp xếp, danh sách phiên bản kèm chi tiết học kỳ/môn học mở rộng ngay trên thẻ.
 * 4. Hành động theo State Machine của store (giống PlanHistoryModal):
 *    - "Tạo bản mới từ bản này" / "Nhánh hóa" / "Khôi phục thành bản nháp": restorePlan() nhân bản thành bản nháp mới
 *      (bản ghi lịch sử giữ nguyên, bất biến) rồi chuyển sang /planner.
 *    - "Kích hoạt áp dụng": activatePlan(planId) — chỉ bản DRAFT hợp lệ quy chế; bản đang mở phải VALIDATED;
 *      bản lưu trữ không kích hoạt trực tiếp. Thành công → /planner; bị từ chối → thông báo kèm lý do & hướng xử lý.
 * 5. Xuất lịch sử phiên bản ra file CSV.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2 (dùng `ui.DevSlot` cho công cụ dev)
 */

// Nội dung tĩnh của prototype mà store chưa cung cấp (hằng demo)
const DEMO_COHORT_LABEL = 'Khóa K16 CNTT';
const UNSUPPORTED_HINT = 'Chưa hỗ trợ trong bản prototype — store kế hoạch chưa có thao tác này.';
const CSV_FILENAME = 'lich-su-ke-hoach.csv';

const STATUS_META = {
  [PLAN_STATUSES.ACTIVE]: { filter: 'active', lower: 'đang áp dụng', role: 'Bản đang áp dụng', csv: 'Đang áp dụng (ACTIVE)' },
  [PLAN_STATUSES.DRAFT]: { filter: 'draft', lower: 'bản nháp', role: 'Bản nháp mới', csv: 'Bản nháp (DRAFT)' },
  [PLAN_STATUSES.VALIDATED]: { filter: 'verified', lower: 'đã kiểm duyệt', role: 'Bản đã kiểm duyệt', csv: 'Đã kiểm duyệt (VALIDATED)' },
  [PLAN_STATUSES.ARCHIVED]: { filter: 'archived', lower: 'lưu trữ', role: 'Bản lưu trữ', csv: 'Lưu trữ (ARCHIVED)' }
};

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang áp dụng' },
  { key: 'draft', label: 'Bản nháp' },
  { key: 'verified', label: 'Đã kiểm duyệt' },
  { key: 'archived', label: 'Lưu trữ' }
];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Thời gian gần nhất' }, // Bản ACTIVE luôn ghim đầu danh sách như prototype
  { key: 'version', label: 'Phiên bản mới nhất' },
  { key: 'cpa', label: 'CPA dự phóng cao nhất' }
];

// Class dùng lại từ prototype
const BTN_SOFT = 'px-4 py-2 bg-canvas hover:bg-surface-container text-ink rounded-full font-body-medium text-body-medium transition-colors';
const BTN_SOFT_ICON = `${BTN_SOFT} flex items-center gap-1`;
const BTN_INK = 'px-4 py-2 bg-ink hover:bg-ink-soft text-paper rounded-full font-body-medium text-body-medium transition-colors flex items-center gap-1 shadow-sm';
const BADGE = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label text-label';
const SUB_BADGE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label text-label';
const BTN_SMALL_SOFT = 'inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-canvas hover:bg-surface-container text-ink rounded-full font-label text-label transition-colors';
const BTN_SMALL_INK = 'inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-ink hover:bg-ink-soft text-paper rounded-full font-label text-label transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed';
const DEV_BTN = 'inline-flex items-center gap-space-xs px-space-md py-1 rounded-full border border-hairline font-label text-label text-ink hover:bg-canvas transition-colors text-left';

const icon = (name, className = 'text-[16px]') =>
  h('span', { className: `material-symbols-outlined ${className}`, 'aria-hidden': 'true' }, name);

// ---------- Hàm thuần đọc dữ liệu phiên bản ----------

const getSemesters = (entry) => entry?.snapshot?.semesters || [];
const semesterCredits = (sem) => Number(sem?.totalCredits) || 0;
const entryCredits = (entry) =>
  entry?.snapshot
    ? getSemesters(entry).reduce((sum, sem) => sum + semesterCredits(sem), 0)
    : Number(entry?.totalCredits) || 0;
const isSummerCode = (code) => String(code || '').includes('SUMMER');

const semesterShortLabel = (sem) => {
  if (isSummerCode(sem?.semesterCode)) return 'Kỳ hè';
  const match = /—\s*(.+)$/.exec(sem?.semesterName || '');
  return match ? match[1].trim() : sem?.semesterName || sem?.semesterCode || '';
};

const semesterRowLabel = (sem) => {
  if (isSummerCode(sem?.semesterCode)) return 'Đăng ký Học kỳ hè';
  const short = semesterShortLabel(sem);
  const match = /Kỳ\s*(\d+)/.exec(short);
  return match ? `Phân bổ Học kỳ ${match[1]}` : `Phân bổ ${short}`;
};

const joinVi = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}`;

const formatCpa = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
};

const lowerFirst = (text) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : '');

const versionRank = (version) => {
  const match = /^v(\d+)\.(\d+)/.exec(version || '');
  return match ? Number(match[1]) * 1000 + Number(match[2]) : -1;
};

// Kiểm tra quy chế tín chỉ HaUI trên snapshot của phiên bản (dùng chung evaluatePlanRules của store)
const checkEntry = (entry) =>
  entry?.snapshot ? evaluatePlanRules(entry.snapshot) : { valid: null, violations: [], warnings: [] };

// "Đã kiểm duyệt": bản VALIDATED hoặc bản còn dùng được (không lưu trữ) đạt quy chế
const isVerifiedEntry = (entry, check) =>
  entry.status === PLAN_STATUSES.VALIDATED || (entry.status !== PLAN_STATUSES.ARCHIVED && check.valid === true);

const matchesFilter = (entry, filterKey) => {
  if (filterKey === 'all') return true;
  if (filterKey === 'verified') return isVerifiedEntry(entry, checkEntry(entry));
  return (STATUS_META[entry.status]?.filter || '') === filterKey;
};

const sortEntries = (entries, sortKey) =>
  entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (sortKey === 'version') return versionRank(b.entry.version) - versionRank(a.entry.version) || a.index - b.index;
      if (sortKey === 'cpa') return (Number(b.entry.projectedCpa) || 0) - (Number(a.entry.projectedCpa) || 0) || a.index - b.index;
      // Thời gian gần nhất: ghim bản đang áp dụng lên đầu, còn lại giữ thứ tự store (bản mới nhất ở đầu)
      const pinA = a.entry.status === PLAN_STATUSES.ACTIVE ? 0 : 1;
      const pinB = b.entry.status === PLAN_STATUSES.ACTIVE ? 0 : 1;
      return pinA - pinB || a.index - b.index;
    })
    .map((item) => item.entry);

// Cặp so sánh mặc định giống prototype: bản ACTIVE vs bản nháp mới nhất
const defaultCompareIds = (history) => {
  const active = history.find((e) => e.status === PLAN_STATUSES.ACTIVE);
  const draft = history.find((e) => e.status === PLAN_STATUSES.DRAFT);
  const ids = [active, draft].filter(Boolean).map((e) => e.planId);
  for (const entry of history) {
    if (ids.length >= 2) break;
    if (!ids.includes(entry.planId)) ids.push(entry.planId);
  }
  return ids;
};

// Bản ACTIVE luôn ở cột trái; còn lại bản cũ hơn (đứng sau trong lịch sử) ở cột trái
const orderPair = (entries, history) =>
  [...entries].sort((a, b) => {
    if (a.status === PLAN_STATUSES.ACTIVE) return -1;
    if (b.status === PLAN_STATUSES.ACTIVE) return 1;
    return history.indexOf(b) - history.indexOf(a);
  });

const semesterCodesOf = (a, b) =>
  [...new Set([...getSemesters(a), ...getSemesters(b)].map((s) => s.semesterCode))].sort();

const courseDiffBySemester = (a, b) =>
  semesterCodesOf(a, b).map((code) => {
    const semA = getSemesters(a).find((s) => s.semesterCode === code);
    const semB = getSemesters(b).find((s) => s.semesterCode === code);
    const coursesA = semA?.courses || [];
    const coursesB = semB?.courses || [];
    const codesA = new Set(coursesA.map((c) => c.courseCode));
    const codesB = new Set(coursesB.map((c) => c.courseCode));
    return {
      code,
      label: semesterShortLabel(semB || semA),
      added: coursesB.filter((c) => !codesA.has(c.courseCode)),
      removed: coursesA.filter((c) => !codesB.has(c.courseCode))
    };
  });

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const buildHistoryCsv = (history) => {
  const header = ['Phiên bản', 'Tên kế hoạch', 'Trạng thái', 'Số học kỳ', 'Tổng tín chỉ', 'CPA dự phóng', 'Kiểm tra quy chế', 'Cập nhật', 'Ghi chú'];
  const rows = history.map((entry) => {
    const check = checkEntry(entry);
    const rule = check.valid === null ? 'Không có dữ liệu' : check.valid ? 'Hợp lệ' : `Vi phạm: ${check.violations.join('; ')}`;
    return [
      entry.version,
      entry.name,
      STATUS_META[entry.status]?.csv || entry.status,
      getSemesters(entry).length || entry.totalSemesters || 0,
      entryCredits(entry),
      formatCpa(entry.projectedCpa),
      rule,
      entry.updatedAt,
      entry.note || ''
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
};

const downloadTextFile = (filename, text, type) => {
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false;
  }
  const url = URL.createObjectURL(new Blob(['﻿', text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
};

// ---------- Ô hiển thị dùng trong bảng so sánh ----------

const semesterCell = (sem, code) => {
  if (!sem) {
    return h(
      'span',
      { className: 'inline-flex items-center gap-1 text-mid-gray font-caption text-caption' },
      icon('block', 'text-[15px]'),
      isSummerCode(code) ? ' Không đăng ký' : ' Không bố trí'
    );
  }
  const tc = semesterCredits(sem);
  const courses = sem.courses || [];
  if (isSummerCode(code)) {
    return h(
      'span',
      { className: 'inline-flex items-center gap-1 text-ink font-body-medium text-body-medium' },
      icon('check_circle', 'text-[16px] text-ink'),
      ` ${tc} TC (${courses.map((c) => c.courseName).join(', ') || 'chưa có môn'})`
    );
  }
  return h(
    React.Fragment,
    null,
    h('span', { className: 'font-medium' }, `${tc} TC`),
    ' ',
    h('span', { className: 'text-mid-gray text-caption font-caption' }, `(${courses.length} học phần)`)
  );
};

const ruleCell = (check) => {
  if (check.valid === null) return h('span', { className: 'text-mid-gray' }, '—');
  if (check.valid) {
    return h(
      'span',
      { className: 'inline-flex items-center gap-1' },
      icon('verified', 'text-[16px] text-ink'),
      ' Hợp lệ quy chế tín chỉ',
      check.warnings.length
        ? h('span', { className: 'text-mid-gray text-caption font-caption' }, ` (${check.warnings.length} cảnh báo tải cao)`)
        : null
    );
  }
  return h(
    'span',
    { className: 'inline-flex items-start gap-1 text-ember' },
    icon('error', 'text-[16px] mt-0.5'),
    h('span', null, ` ${check.violations.length} vi phạm — ${check.violations[0]}`)
  );
};

const buildCompareRows = (a, b) => {
  const rows = [
    {
      key: 'credits',
      label: 'Tổng tín chỉ còn lại',
      a: `${entryCredits(a)} Tín chỉ`,
      b: `${entryCredits(b)} Tín chỉ`,
      aClass: 'font-semibold',
      bClass: 'font-semibold'
    }
  ];

  for (const code of semesterCodesOf(a, b)) {
    const semA = getSemesters(a).find((s) => s.semesterCode === code);
    const semB = getSemesters(b).find((s) => s.semesterCode === code);
    rows.push({ key: `sem-${code}`, label: semesterRowLabel(semA || semB), a: semesterCell(semA, code), b: semesterCell(semB, code) });
  }

  rows.push(
    { key: 'cpa', label: 'CPA dự phóng', a: formatCpa(a.projectedCpa), b: formatCpa(b.projectedCpa), aClass: 'font-medium', bClass: 'font-medium' },
    { key: 'rank', label: 'Xếp loại dự kiến', a: a.snapshot?.projectedRank || '—', b: b.snapshot?.projectedRank || '—', aClass: 'font-medium', bClass: 'font-medium' },
    { key: 'rules', label: 'Kiểm tra quy chế', a: ruleCell(checkEntry(a)), b: ruleCell(checkEntry(b)) },
    {
      key: 'risk',
      label: 'Đánh giá rủi ro',
      a: a.snapshot?.aiRiskAdvice || a.note || '—',
      b: b.snapshot?.aiRiskAdvice || b.note || '—',
      aClass: 'text-mid-gray',
      bClass: 'text-ink font-medium'
    }
  );
  return rows;
};

export function PlanHistoryPage({ api, ui } = {}) {
  const navigate = useNavigate();

  const [storeState, setStoreState] = useState(() => plannerStore.getState());
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => defaultCompareIds(plannerStore.getHistory()));
  const [showCourseDiff, setShowCourseDiff] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tone: 'error'|'success'|'info', title, message, violations?, action? }
  const [previewEmpty, setPreviewEmpty] = useState(false); // Dev: xem trạng thái trống
  const compareRef = useRef(null);

  // Sinh viên phiên làm việc (theo persona đang chọn) — dùng cho nhãn khóa học
  const [sessionStudent, setSessionStudent] = useState(() =>
    typeof api?.getConfig === 'function' ? api.getConfig()?.sessionStudent || null : null
  );

  // Đăng ký lắng nghe thay đổi từ plannerStore
  useEffect(() => plannerStore.subscribe(setStoreState), []);

  // Cập nhật nhãn khóa học khi đổi persona / cấu hình API
  useEffect(() => {
    if (typeof api?.subscribe !== 'function') return undefined;
    const unsubscribe = api.subscribe((config) => setSessionStudent(config?.sessionStudent || null));
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [api]);

  // Thông báo thành công/thông tin tự ẩn; thông báo từ chối giữ đến khi người dùng đóng
  useEffect(() => {
    if (!feedback || feedback.tone === 'error') return undefined;
    const timer = setTimeout(() => setFeedback(null), 4500);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Đóng menu/thông báo bằng phím ESC
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpenMenuId(null);
      setSortOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const storeHistory = storeState.history || [];
  const history = previewEmpty ? [] : storeHistory;
  const currentPlan = storeState.plan;
  const activeEntry = history.find((e) => e.status === PLAN_STATUSES.ACTIVE) || null;
  const draftEntries = history.filter((e) => e.status === PLAN_STATUSES.DRAFT);
  const archivedEntries = history.filter((e) => e.status === PLAN_STATUSES.ARCHIVED);
  const usableEntries = history.filter((e) => e.status !== PLAN_STATUSES.ARCHIVED);
  const verifiedEntries = history.filter((e) => isVerifiedEntry(e, checkEntry(e)));
  const invalidUsable = usableEntries.filter((e) => checkEntry(e).valid === false);

  const counts = {
    all: history.length,
    active: history.filter((e) => e.status === PLAN_STATUSES.ACTIVE).length,
    draft: draftEntries.length,
    verified: verifiedEntries.length,
    archived: archivedEntries.length
  };

  const visibleEntries = sortEntries(history.filter((e) => matchesFilter(e, filter)), sortKey);
  const selectedEntries = selectedIds.map((id) => history.find((e) => e.planId === id)).filter(Boolean);
  const pair = selectedEntries.length === 2 ? orderPair(selectedEntries, history) : null;
  const openPlanInHistory = currentPlan ? storeHistory.some((e) => e.planId === currentPlan.planId) : true;

  const cohortLabel = sessionStudent?.cohort ? `Khóa ${String(sessionStudent.cohort).split(' ')[0]}` : DEMO_COHORT_LABEL;

  // ---------- Hành động ----------

  const goToPlanner = (message) => navigate('/planner', { state: { plannerFlash: message } });

  // Mở lại / Nhánh hóa / Khôi phục: nhân bản đúng dữ liệu bản được chọn thành bản nháp mới (F23-003)
  const handleRestore = (entry) => {
    setOpenMenuId(null);
    const res = plannerStore.restorePlan(entry.planId);
    if (res.success) {
      goToPlanner(res.message);
      return;
    }
    setFeedback({ tone: 'error', title: `Không thể mở lại ${entry.version}`, message: res.message });
  };

  // Kích hoạt đúng bản được chọn trong lịch sử (F23-002) — store tự chặn bản lưu trữ / chưa thẩm định / vi phạm quy chế
  const handleActivate = (entry) => {
    setOpenMenuId(null);
    const res = plannerStore.activatePlan(entry.planId);
    if (res.success) {
      goToPlanner(res.message);
      return;
    }

    if (res.code === 'ALREADY_ACTIVE') {
      setFeedback({ tone: 'info', title: `${entry.version} đang được áp dụng`, message: res.message });
    } else if (res.code === 'INVALID_TRANSITION') {
      setFeedback({
        tone: 'error',
        title: `Không thể kích hoạt trực tiếp ${entry.version}`,
        message: res.message,
        action: { label: 'Khôi phục thành bản nháp', icon: 'restore', run: () => handleRestore(entry) }
      });
    } else if (res.code === 'PLAN_RULE_VIOLATION') {
      setFeedback({
        tone: 'error',
        title: `Không thể kích hoạt ${entry.version}: vi phạm quy chế`,
        message: 'Kế hoạch chưa thỏa quy chế đào tạo tín chỉ HaUI (BR-03/BR-04). Hãy nhánh hóa thành bản nháp mới để điều chỉnh rồi thẩm định lại.',
        violations: res.violations || [],
        action: { label: 'Nhánh hóa để chỉnh sửa', icon: 'fork_right', run: () => handleRestore(entry) }
      });
    } else if (res.code === 'PLAN_NOT_VALIDATED') {
      setFeedback({
        tone: 'error',
        title: `Bản nháp ${entry.version} chưa được thẩm định`,
        message: res.message,
        action: { label: 'Mở Planner để thẩm định', icon: 'fact_check', run: () => navigate('/planner') }
      });
    } else {
      setFeedback({ tone: 'error', title: `Không thể kích hoạt ${entry.version}`, message: res.message });
    }
  };

  const toggleSelect = (planId) => {
    setSelectedIds((prev) => (prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId].slice(-2)));
  };

  const handleCompareShortcut = () => {
    if (selectedEntries.length === 2) {
      setShowCourseDiff(true);
      compareRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      return;
    }
    setFeedback({
      tone: 'info',
      title: 'Chọn 2 phiên bản để so sánh',
      message: `Đánh dấu đúng 2 phiên bản ở ô chọn bên trái danh sách (đang chọn ${selectedEntries.length}).`
    });
  };

  const handleExportCsv = () => {
    if (history.length === 0) {
      setFeedback({ tone: 'info', title: 'Chưa có phiên bản nào để xuất' });
      return;
    }
    const ok = downloadTextFile(CSV_FILENAME, buildHistoryCsv(history), 'text/csv;charset=utf-8');
    setFeedback(
      ok
        ? { tone: 'success', title: 'Đã xuất lịch sử kế hoạch', message: `${history.length} phiên bản đã được lưu vào ${CSV_FILENAME}.` }
        : { tone: 'error', title: 'Không thể xuất file CSV', message: 'Trình duyệt hiện tại không hỗ trợ tải file.' }
    );
  };

  // ---------- Công cụ dev (portal vào panel dev, ẩn ở production) ----------

  const handleDevTryArchived = () => {
    const archived = storeHistory.find((e) => e.status === PLAN_STATUSES.ARCHIVED);
    if (!archived) {
      setFeedback({ tone: 'info', title: 'Không có bản lưu trữ nào để thử' });
      return;
    }
    handleActivate(archived);
  };

  // Tái hiện kịch bản F23-002: bản nháp trong lịch sử vi phạm sàn 10 TC, kế hoạch đang mở là bản khác
  const handleDevInvalidDraft = () => {
    const source = storeHistory.find((e) => e.planId === 'plan-haui-2026-v2.1') || storeHistory.find((e) => e.snapshot);
    if (!source) return;
    plannerStore.restorePlan(source.planId);
    const firstSemester = plannerStore.getPlan().semesters?.[0];
    if (firstSemester) {
      for (const course of firstSemester.courses.slice(0, 3)) {
        plannerStore.removeCourseFromSemester(firstSemester.semesterCode, course.courseCode);
      }
    }
    plannerStore.saveDraft('Bản nháp vi phạm quy chế (dev)');
    const invalidId = plannerStore.getPlan().planId;
    const active = plannerStore.getActiveEntry();
    if (active) plannerStore.restorePlan(active.planId);

    setPreviewEmpty(false);
    setFilter('draft');
    setExpandedId(invalidId);
    setFeedback({
      tone: 'info',
      title: 'Đã tạo bản nháp vi phạm quy chế',
      message: 'Bấm "Kích hoạt áp dụng" trên bản nháp này để xem thông báo từ chối.'
    });
  };

  const handleDevReset = () => {
    plannerStore.resetToDefault();
    setSelectedIds(defaultCompareIds(plannerStore.getHistory()));
    setFilter('all');
    setExpandedId(null);
    setPreviewEmpty(false);
    setFeedback({ tone: 'info', title: 'Đã đặt lại dữ liệu mẫu', message: 'Kế hoạch và lịch sử phiên bản quay về fixture mặc định.' });
  };

  // ---------- Khối giao diện ----------

  const headerBlock = h(
    'div',
    { className: 'flex flex-col gap-space-md pb-space-sm' },
    h(
      'nav',
      { className: 'flex items-center gap-2 text-mid-gray font-label text-label tracking-wide uppercase', 'aria-label': 'Breadcrumb' },
      h(Link, { to: '/', className: 'hover:text-ink transition-colors flex items-center gap-1' }, icon('home', 'text-[14px]'), h('span', null, 'Trang chủ')),
      h('span', { className: 'text-hairline' }, '/'),
      h('span', { className: 'text-ink font-medium' }, 'Lịch sử kế hoạch học tập')
    ),
    h(
      'div',
      { className: 'flex flex-col lg:flex-row lg:items-center justify-between gap-space-md' },
      h(
        'div',
        { className: 'space-y-1 max-w-3xl' },
        h('h1', { className: 'font-headline text-headline text-ink tracking-tight' }, 'Lịch sử & Quản lý các phiên bản kế hoạch')
      ),
      h(
        'div',
        { className: 'flex flex-wrap items-center gap-2 shrink-0' },
        h(
          'button',
          {
            type: 'button',
            onClick: handleExportCsv,
            className: 'inline-flex items-center gap-1.5 px-4 py-2 bg-paper text-mid-gray hover:text-ink hover:bg-surface-container rounded-full font-body-medium text-body-medium transition-colors shadow-sm'
          },
          icon('ios_share', 'text-[18px]'),
          h('span', null, 'Xuất lịch sử (.csv)')
        ),
        h(
          'button',
          {
            type: 'button',
            onClick: handleCompareShortcut,
            className: 'inline-flex items-center gap-1.5 px-4 py-2 bg-canvas text-ink hover:bg-surface-container-high rounded-full font-body-medium text-body-medium transition-colors shadow-sm'
          },
          icon('compare_arrows', 'text-[18px]'),
          h('span', null, 'So sánh 2 phiên bản')
        ),
        h(
          'button',
          {
            type: 'button',
            onClick: () => navigate('/planner'),
            className: 'inline-flex items-center gap-1.5 px-4 py-2 bg-ink hover:bg-ink-soft text-paper rounded-full font-body-medium text-body-medium transition-all shadow-md'
          },
          icon('add', 'text-[18px]'),
          h('span', null, 'Tạo kế hoạch mới từ đầu')
        )
      )
    )
  );

  const countChip = (count, { verified = false, muted = false } = {}) =>
    h(
      'span',
      { className: `${BADGE} bg-canvas ${muted ? 'text-mid-gray' : 'text-ink'}` },
      verified ? icon('verified', 'text-[13px] text-ink') : null,
      `${count} bản`
    );

  const metricCard = ({ key, label, chip, value, sub, footLeft, footRight, decor = false }) =>
    h(
      'div',
      {
        key,
        className: `bg-paper p-space-lg rounded-[24px] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group${decor ? ' relative overflow-hidden' : ''}`
      },
      decor
        ? h('div', { className: 'absolute -right-6 -bottom-6 w-24 h-24 bg-surface-alt rounded-full pointer-events-none transition-transform group-hover:scale-110' })
        : null,
      h(
        'div',
        { className: `flex items-center justify-between mb-space-sm${decor ? ' relative z-10' : ''}` },
        h('span', { className: 'font-caption text-caption text-mid-gray uppercase tracking-wider font-medium' }, label),
        chip || null
      ),
      h(
        'div',
        { className: decor ? 'relative z-10' : undefined },
        h('div', { className: 'font-headline text-headline text-ink tracking-tight font-semibold' }, value),
        h('p', { className: 'font-body text-body text-mid-gray mt-1 line-clamp-1', title: sub }, sub)
      ),
      h(
        'div',
        { className: `pt-space-md mt-space-md flex items-center justify-between text-mid-gray${decor ? ' relative z-10' : ''}` },
        h('span', { className: 'font-label text-label' }, footLeft),
        h('span', { className: 'font-label text-label text-ink font-medium' }, footRight)
      )
    );

  const verifiedPct = usableEntries.length
    ? Math.round(((usableEntries.length - invalidUsable.length) / usableEntries.length) * 100)
    : null;

  const metricsBlock = h(
    'div',
    { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md' },
    metricCard({
      key: 'active',
      decor: true,
      label: 'Đang áp dụng (Active)',
      value: activeEntry ? activeEntry.version : '—',
      sub: activeEntry ? activeEntry.name : 'Chưa kích hoạt kế hoạch nào',
      footLeft: cohortLabel,
      footRight: activeEntry ? 'Chính thức' : 'Chưa áp dụng'
    }),
    metricCard({
      key: 'draft',
      label: 'Bản nháp (Draft)',
      chip: countChip(draftEntries.length),
      value: `${draftEntries.length} phương án`,
      sub: draftEntries.length ? joinVi(draftEntries.map((e) => e.name)) : 'Chưa có bản nháp nào',
      footLeft: 'Chưa áp dụng',
      footRight: 'Đang thử nghiệm'
    }),
    metricCard({
      key: 'verified',
      label: 'Đã kiểm tra (Verified)',
      chip: countChip(verifiedEntries.length, { verified: true }),
      value: verifiedPct === null ? '—' : `${verifiedPct}% hợp lệ`,
      sub: invalidUsable.length
        ? `${invalidUsable.length} bản vi phạm quy chế số TC`
        : 'Đủ điều kiện tiên quyết & số TC',
      footLeft: 'HAUI Advisor Check',
      footRight: 'Chuẩn quy chế'
    }),
    metricCard({
      key: 'archived',
      label: 'Bản lưu trữ (Archived)',
      chip: countChip(archivedEntries.length, { muted: true }),
      value: `${archivedEntries.length} mốc lịch sử`,
      sub: archivedEntries.length ? `Phiên bản ${joinVi(archivedEntries.map((e) => e.version))}` : 'Chưa có bản lưu trữ',
      footLeft: 'Lưu trữ tự động',
      footRight: 'Chỉ đọc (Read-only)'
    })
  );

  // So sánh nhanh 2 phiên bản đang chọn
  let compareBody;
  let compareTitle = 'So sánh nhanh 2 phiên bản kế hoạch';
  let compareActions = null;

  if (pair) {
    const [a, b] = pair;
    const metaA = STATUS_META[a.status] || STATUS_META[PLAN_STATUSES.DRAFT];
    const metaB = STATUS_META[b.status] || STATUS_META[PLAN_STATUSES.DRAFT];
    compareTitle = `So sánh nhanh: ${metaA.role} (${a.version}) VS ${metaB.role} (${b.version})`;

    compareActions = h(
      'div',
      { className: 'flex items-center gap-2 shrink-0' },
      h(
        'button',
        {
          type: 'button',
          className: BTN_SMALL_SOFT,
          'aria-expanded': showCourseDiff,
          onClick: () => setShowCourseDiff((v) => !v)
        },
        h('span', null, 'Chi tiết môn học'),
        icon(showCourseDiff ? 'expand_less' : 'open_in_new', 'text-[14px]')
      ),
      h(
        'button',
        {
          type: 'button',
          className: BTN_SMALL_INK,
          disabled: b.status === PLAN_STATUSES.ACTIVE,
          onClick: () => handleActivate(b)
        },
        icon('published_with_changes', 'text-[14px]'),
        h('span', null, `Áp dụng thay thế bằng ${b.version}`)
      )
    );

    const rows = buildCompareRows(a, b);
    const table = h(
      'div',
      { className: 'overflow-x-auto rounded-[16px] bg-surface-alt p-space-sm' },
      h(
        'table',
        { className: 'w-full text-left font-body text-body' },
        h(
          'thead',
          null,
          h(
            'tr',
            { className: 'text-mid-gray font-label text-label uppercase tracking-wider' },
            h('th', { className: 'py-2.5 px-space-md w-1/4' }, 'Tiêu chí phân bổ'),
            h(
              'th',
              { className: 'py-2.5 px-space-md w-[37.5%] text-ink font-semibold bg-paper/60 rounded-l-xl' },
              `Bản ${a.version} `,
              h('span', { className: 'text-mid-gray font-normal lowercase' }, `(${metaA.lower})`)
            ),
            h(
              'th',
              { className: 'py-2.5 px-space-md w-[37.5%] text-ink font-semibold bg-canvas rounded-r-xl' },
              `Bản ${b.version} `,
              h('span', { className: 'text-mid-gray font-normal lowercase' }, `(${metaB.lower})`)
            )
          )
        ),
        h(
          'tbody',
          { className: 'divide-y divide-transparent text-ink' },
          rows.map((row) =>
            h(
              'tr',
              { key: row.key, className: 'hover:bg-paper/40 transition-colors' },
              h('td', { className: 'py-2.5 px-space-md font-body-medium text-body-medium text-mid-gray' }, row.label),
              h('td', { className: `py-2.5 px-space-md bg-paper/60 ${row.aClass || ''}` }, row.a),
              h('td', { className: `py-2.5 px-space-md bg-canvas ${row.bClass || ''}` }, row.b)
            )
          )
        )
      )
    );

    let diffBlock = null;
    if (showCourseDiff) {
      const diffs = courseDiffBySemester(a, b);
      const changed = diffs.filter((d) => d.added.length || d.removed.length);
      const addedCount = diffs.reduce((sum, d) => sum + d.added.length, 0);
      const removedCount = diffs.reduce((sum, d) => sum + d.removed.length, 0);
      const chip = (course, added) =>
        h(
          'span',
          {
            key: `${added ? 'add' : 'rm'}-${course.courseCode}`,
            className: added
              ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper text-ink font-label text-label shadow-sm'
              : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-hairline text-mid-gray font-label text-label line-through'
          },
          icon(added ? 'add' : 'remove', 'text-[14px]'),
          `${course.courseCode} · ${course.courseName} (${course.credits} TC)`
        );

      diffBlock = h(
        'div',
        { className: 'rounded-[16px] bg-surface-alt p-space-md space-y-space-sm' },
        h(
          'div',
          { className: 'flex flex-wrap items-center justify-between gap-space-sm' },
          h('span', { className: 'font-body-medium text-body-medium text-ink' }, `Khác biệt môn học: ${b.version} so với ${a.version}`),
          h('span', { className: 'font-caption text-caption text-mid-gray' }, `+${addedCount} môn thêm · −${removedCount} môn bớt`)
        ),
        changed.length === 0
          ? h('p', { className: 'font-body text-body text-mid-gray' }, 'Hai phiên bản có cùng danh sách môn học ở mọi học kỳ.')
          : changed.map((d) =>
              h(
                'div',
                { key: d.code, className: 'flex flex-col sm:flex-row sm:items-start gap-2 pt-space-sm border-t border-hairline' },
                h('span', { className: 'w-20 shrink-0 font-label text-label text-mid-gray uppercase tracking-wider pt-1' }, d.label),
                h('div', { className: 'flex flex-wrap gap-1.5' }, d.added.map((c) => chip(c, true)), d.removed.map((c) => chip(c, false)))
              )
            )
      );
    }

    compareBody = [h(React.Fragment, { key: 'table' }, table), diffBlock ? h(React.Fragment, { key: 'diff' }, diffBlock) : null];
  } else {
    compareBody = h(
      'div',
      { className: 'rounded-[16px] bg-surface-alt p-space-md flex items-center gap-2 font-body text-body text-mid-gray' },
      icon('touch_app', 'text-[18px]'),
      history.length < 2
        ? 'Cần ít nhất 2 phiên bản trong lịch sử để so sánh.'
        : `Chọn 2 phiên bản trong danh sách bên dưới (ô chọn bên trái mỗi phiên bản) để so sánh nhanh — đang chọn ${selectedEntries.length}.`
    );
  }

  const compareBlock = h(
    'div',
    { ref: compareRef, className: 'bg-paper p-space-lg rounded-[24px] shadow-sm overflow-hidden space-y-space-md scroll-mt-24' },
    h(
      'div',
      { className: 'flex flex-col md:flex-row md:items-center justify-between gap-space-sm' },
      h(
        'div',
        { className: 'flex items-center gap-space-sm' },
        h('div', { className: 'w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-ink shrink-0' }, icon('difference', 'text-[18px]')),
        h(
          'div',
          null,
          h('h2', { className: 'font-subheading text-subheading text-ink font-semibold tracking-tight' }, compareTitle),
          h(
            'p',
            { className: 'font-caption text-caption text-mid-gray' },
            'Đối chiếu thông số tải tín chỉ và thời lượng tốt nghiệp trước khi quyết định thay thế.'
          )
        )
      ),
      compareActions
    ),
    compareBody
  );

  // Kế hoạch đang mở trên Planner nhưng chưa lưu vào lịch sử (ví dụ vừa khôi phục)
  const openPlanBanner =
    currentPlan && !openPlanInHistory && !previewEmpty
      ? h(
          'div',
          { className: 'bg-paper p-space-md rounded-[24px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm' },
          h(
            'div',
            { className: 'flex items-center gap-space-sm min-w-0' },
            h('div', { className: 'w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-ink shrink-0' }, icon('edit_note', 'text-[18px]')),
            h(
              'div',
              { className: 'min-w-0' },
              h(
                'p',
                { className: 'font-body-medium text-body-medium text-ink truncate' },
                `Đang mở trên Planner: ${currentPlan.planName} (${currentPlan.version} · ${currentPlan.status})`
              ),
              h(
                'p',
                { className: 'font-caption text-caption text-mid-gray' },
                'Bản này chưa được lưu vào lịch sử — hãy "Lưu nháp" trên Planner để giữ lại thành một phiên bản.'
              )
            )
          ),
          h('button', { type: 'button', className: `${BTN_SOFT_ICON} shrink-0 self-end sm:self-center`, onClick: () => navigate('/planner') }, h('span', null, 'Tiếp tục chỉnh sửa'), icon('arrow_forward', 'text-[16px]'))
        )
      : null;

  const filterRow = h(
    'div',
    { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm' },
    h(
      'div',
      { className: 'flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none', role: 'tablist', 'aria-label': 'Lọc theo trạng thái' },
      FILTERS.map((f) =>
        h(
          'button',
          {
            key: f.key,
            type: 'button',
            role: 'tab',
            'aria-selected': filter === f.key,
            'data-filter': f.key,
            onClick: () => setFilter(f.key),
            className: `plan-filter-pill px-3.5 py-1.5 rounded-full font-label text-label transition-colors shrink-0 shadow-sm ${
              filter === f.key ? 'bg-ink text-paper' : 'bg-paper text-mid-gray hover:text-ink'
            }`
          },
          `${f.label} (${counts[f.key]})`
        )
      )
    ),
    h(
      'div',
      { className: 'flex items-center gap-2' },
      h('span', { className: 'font-caption text-caption text-mid-gray' }, 'Sắp xếp:'),
      h(
        'div',
        { className: 'relative' },
        h(
          'button',
          {
            type: 'button',
            'aria-haspopup': 'listbox',
            'aria-expanded': sortOpen,
            onClick: () => setSortOpen((v) => !v),
            className: 'inline-flex items-center gap-1 px-3 py-1 bg-paper text-ink font-label text-label rounded-full shadow-sm hover:bg-canvas'
          },
          h('span', null, (SORT_OPTIONS.find((o) => o.key === sortKey) || SORT_OPTIONS[0]).label),
          icon('expand_more', 'text-[14px]')
        ),
        sortOpen
          ? h(
              'div',
              { role: 'listbox', className: 'absolute right-0 mt-2 w-52 bg-paper rounded-2xl shadow-xl py-2 z-20 font-body text-body text-ink' },
              SORT_OPTIONS.map((o) =>
                h(
                  'button',
                  {
                    key: o.key,
                    type: 'button',
                    role: 'option',
                    'aria-selected': o.key === sortKey,
                    onClick: () => {
                      setSortKey(o.key);
                      setSortOpen(false);
                    },
                    className: 'w-full text-left flex items-center justify-between gap-2 px-4 py-2 hover:bg-canvas'
                  },
                  o.label,
                  o.key === sortKey ? icon('check', 'text-[16px]') : null
                )
              )
            )
          : null
      )
    )
  );

  const renderMenu = (entry, items) => {
    const open = openMenuId === entry.planId;
    return h(
      'div',
      { className: 'relative' },
      h(
        'button',
        {
          type: 'button',
          title: 'Tùy chọn khác',
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          onClick: () => setOpenMenuId(open ? null : entry.planId),
          className: 'w-9 h-9 rounded-full bg-canvas hover:bg-surface-container flex items-center justify-center text-ink transition-colors'
        },
        icon('more_vert', 'text-[18px]')
      ),
      open
        ? h(
            'div',
            { role: 'menu', className: 'absolute right-0 mt-2 w-56 bg-paper rounded-2xl shadow-xl py-2 z-20 font-body text-body text-ink' },
            items.map((item) =>
              h(
                'button',
                {
                  key: item.label,
                  type: 'button',
                  role: 'menuitem',
                  disabled: !item.run,
                  title: item.run ? undefined : item.hint || UNSUPPORTED_HINT,
                  onClick: () => {
                    setOpenMenuId(null);
                    if (item.run) item.run();
                  },
                  className: `w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                    item.danger ? 'text-error' : ''
                  }`
                },
                icon(item.icon),
                ` ${item.label}`
              )
            )
          )
        : null
    );
  };

  const statusBadge = (entry) => {
    switch (entry.status) {
      case PLAN_STATUSES.ACTIVE:
        return h(
          'span',
          { key: 'status', className: `${BADGE} bg-ink text-paper font-medium` },
          h('span', { className: 'w-1.5 h-1.5 rounded-full bg-emerald-400' }),
          'Đang áp dụng'
        );
      case PLAN_STATUSES.VALIDATED:
        return h('span', { key: 'status', className: `${BADGE} bg-canvas text-ink` }, icon('verified', 'text-[13px] text-ink'), 'Đã kiểm duyệt');
      case PLAN_STATUSES.ARCHIVED:
        return h('span', { key: 'status', className: `${BADGE} bg-canvas text-mid-gray font-medium` }, icon('archive', 'text-[13px]'), 'Lưu trữ');
      default:
        return h('span', { key: 'status', className: `${BADGE} bg-canvas text-ink font-medium` }, 'Bản nháp (Draft)');
    }
  };

  const renderDetail = (entry, check, { isOpen, openValidated }) => {
    const semesters = getSemesters(entry);
    const invalid = check.valid === false;
    return h(
      'div',
      { className: 'mt-space-md pt-space-md border-t border-hairline space-y-space-sm' },
      semesters.length === 0
        ? h('p', { className: 'font-body text-body text-mid-gray' }, 'Phiên bản này không có dữ liệu chi tiết học kỳ/môn học.')
        : h(
            'div',
            { className: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-sm' },
            semesters.map((sem) =>
              h(
                'div',
                { key: sem.semesterCode, className: 'rounded-[16px] bg-surface-alt p-space-md space-y-space-sm' },
                h(
                  'div',
                  { className: 'flex items-start justify-between gap-2' },
                  h(
                    'div',
                    { className: 'min-w-0' },
                    h('p', { className: 'font-body-medium text-body-medium text-ink truncate', title: sem.semesterName }, sem.semesterName),
                    sem.workloadAssessment ? h('p', { className: 'font-caption text-caption text-mid-gray' }, sem.workloadAssessment) : null
                  ),
                  h('span', { className: 'shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full bg-paper text-ink font-label text-label shadow-sm' }, `${semesterCredits(sem)} TC`)
                ),
                h(
                  'ul',
                  { className: 'divide-y divide-hairline' },
                  (sem.courses || []).map((course) =>
                    h(
                      'li',
                      { key: course.courseCode, className: 'flex items-start justify-between gap-2 py-1.5' },
                      h(
                        'div',
                        { className: 'min-w-0' },
                        h('p', { className: 'font-body text-body text-ink truncate', title: course.courseName }, course.courseName),
                        h('p', { className: 'font-caption text-caption text-mid-gray truncate' }, `${course.courseCode}${course.courseType ? ` · ${course.courseType}` : ''}`)
                      ),
                      h('span', { className: 'shrink-0 font-label text-label text-mid-gray pt-0.5' }, `${course.credits} TC`)
                    )
                  )
                )
              )
            )
          ),
      h(
        'div',
        { className: `rounded-[16px] p-space-md flex items-start gap-space-sm ${invalid ? 'bg-paper border border-ember/30' : 'bg-surface-alt'}` },
        icon(invalid ? 'error' : 'verified', `text-[18px] ${invalid ? 'text-ember' : 'text-ink'}`),
        h(
          'div',
          { className: 'space-y-1 min-w-0' },
          h(
            'p',
            { className: 'font-body-medium text-body-medium text-ink' },
            check.valid === null
              ? 'Chưa thể kiểm tra quy chế (thiếu dữ liệu chi tiết)'
              : invalid
                ? 'Phiên bản vi phạm quy chế tín chỉ HaUI — không thể kích hoạt'
                : 'Đạt quy chế tín chỉ HaUI (10–24 TC mỗi kỳ chính, tối đa 8 TC kỳ hè)'
          ),
          check.violations.map((v) => h('p', { key: v, className: 'font-caption text-caption text-ember' }, `• ${v}`)),
          check.warnings.map((w) => h('p', { key: w, className: 'font-caption text-caption text-mid-gray' }, `• ${w}`)),
          entry.status === PLAN_STATUSES.ARCHIVED
            ? h(
                'p',
                { className: 'font-caption text-caption text-mid-gray' },
                'Bản lưu trữ chỉ đọc: hãy "Khôi phục thành bản nháp" rồi thẩm định trên Planner trước khi kích hoạt.'
              )
            : null,
          isOpen && entry.status === PLAN_STATUSES.DRAFT && !openValidated
            ? h(
                'p',
                { className: 'font-caption text-caption text-mid-gray' },
                'Bản nháp đang mở trên Planner cần "Kiểm tra điều kiện" (VALIDATED) trước khi kích hoạt.'
              )
            : null
        )
      )
    );
  };

  const renderVersionCard = (entry) => {
    const meta = STATUS_META[entry.status] || STATUS_META[PLAN_STATUSES.DRAFT];
    const check = checkEntry(entry);
    const isOpen = currentPlan?.planId === entry.planId;
    const openValidated = isOpen && currentPlan.status === PLAN_STATUSES.VALIDATED;
    const archived = entry.status === PLAN_STATUSES.ARCHIVED;
    const expanded = expandedId === entry.planId;
    const semesters = getSemesters(entry);
    const semesterCount = semesters.length || Number(entry.totalSemesters) || 0;
    const semesterLabels = semesters.map(semesterShortLabel).filter(Boolean);

    const badges = [statusBadge(entry)];
    if (check.valid === false) {
      badges.push(
        h(
          'span',
          { key: 'rules', className: `${SUB_BADGE} bg-paper border border-ember/30 text-ember`, title: check.violations.join('\n') },
          icon('error', 'text-[13px]'),
          `Vi phạm quy chế (${check.violations.length})`
        )
      );
    } else if (entry.status !== PLAN_STATUSES.VALIDATED && (openValidated || (!archived && check.valid))) {
      badges.push(
        h(
          'span',
          { key: 'rules', className: `${SUB_BADGE} bg-canvas text-mid-gray` },
          icon('verified', 'text-[13px] text-ink'),
          openValidated ? 'Đã thẩm định trên Planner' : 'Đã kiểm tra hợp lệ'
        )
      );
    }
    if (isOpen) {
      badges.push(h('span', { key: 'open', className: `${SUB_BADGE} bg-canvas text-ink` }, icon('edit_note', 'text-[13px]'), 'Đang mở trên Planner'));
    }

    const metaItems = [
      h(
        'span',
        { key: 'sem', className: 'flex items-center gap-1' },
        icon('calendar_today', 'text-[14px]'),
        semesterLabels.length ? `${semesterCount} học kỳ (${joinVi(semesterLabels)})` : `${semesterCount} học kỳ`
      ),
      h(
        'span',
        { key: 'tc', className: `flex items-center gap-1${archived ? '' : ' font-medium text-ink'}` },
        icon('auto_stories', 'text-[14px]'),
        `Tổng ${entryCredits(entry)} Tín chỉ`
      ),
      h('span', { key: 'cpa', className: 'flex items-center gap-1' }, icon('grade', 'text-[14px]'), `CPA dự phóng: ${formatCpa(entry.projectedCpa)}`),
      h('span', { key: 'time', className: 'flex items-center gap-1' }, icon('schedule', 'text-[14px]'), `Cập nhật ${lowerFirst(entry.updatedAt || '')}`),
      entry.note ? h('span', { key: 'note', className: 'flex items-center gap-1' }, icon('push_pin', 'text-[14px]'), entry.note) : null
    ]
      .filter(Boolean)
      .flatMap((item, index) => (index === 0 ? [item] : [h('span', { key: `dot-${index}` }, '•'), item]));

    const detailButton = h(
      'button',
      {
        type: 'button',
        className: BTN_SOFT,
        'aria-expanded': expanded,
        onClick: () => setExpandedId(expanded ? null : entry.planId)
      },
      expanded ? 'Thu gọn' : archived ? 'Xem lại bản gốc' : 'Xem chi tiết'
    );

    let actions;
    if (entry.status === PLAN_STATUSES.ACTIVE) {
      actions = [
        detailButton,
        h('button', { key: 'fork', type: 'button', className: BTN_INK, onClick: () => handleRestore(entry) }, icon('fork_right'), h('span', null, 'Tạo bản mới từ bản này')),
        renderMenu(entry, [
          { label: 'Đổi tên kế hoạch', icon: 'edit' },
          { label: 'Xuất file PDF', icon: 'picture_as_pdf' },
          { label: 'Khóa chỉnh sửa', icon: 'lock_reset', hint: 'Bản đang áp dụng vốn bất biến — mọi chỉnh sửa tự tách thành bản nháp mới.' }
        ])
      ];
    } else if (entry.status === PLAN_STATUSES.DRAFT) {
      actions = [
        detailButton,
        h(
          'button',
          {
            key: 'activate',
            type: 'button',
            className: BTN_INK,
            title: isOpen && !openValidated ? 'Bản nháp đang mở cần "Kiểm tra điều kiện" (VALIDATED) trước khi kích hoạt' : undefined,
            onClick: () => handleActivate(entry)
          },
          icon('check'),
          h('span', null, 'Kích hoạt áp dụng')
        ),
        renderMenu(entry, [
          { label: 'Nhánh hóa kế hoạch', icon: 'fork_right', run: () => handleRestore(entry) },
          isOpen ? { label: 'Mở trên Planner', icon: 'open_in_new', run: () => navigate('/planner') } : null,
          { label: 'Đổi tên', icon: 'edit' },
          { label: 'Xóa bản nháp này', icon: 'delete', danger: true }
        ].filter(Boolean))
      ];
    } else if (entry.status === PLAN_STATUSES.VALIDATED) {
      actions = [
        detailButton,
        h('button', { key: 'fork', type: 'button', className: BTN_SOFT_ICON, onClick: () => handleRestore(entry) }, icon('fork_right'), h('span', null, 'Nhánh hóa')),
        renderMenu(entry, [
          { label: 'Áp dụng kế hoạch này', icon: 'check', run: () => handleActivate(entry) },
          { label: 'Xuất file PDF', icon: 'picture_as_pdf' },
          { label: 'Chuyển vào lưu trữ', icon: 'archive' }
        ])
      ];
    } else {
      actions = [
        detailButton,
        h('button', { key: 'restore', type: 'button', className: BTN_SOFT_ICON, onClick: () => handleRestore(entry) }, icon('restore'), h('span', null, 'Khôi phục thành bản nháp'))
      ];
    }

    return h(
      'div',
      {
        key: entry.planId,
        'data-status': meta.filter,
        className: `plan-version-card p-space-lg rounded-[24px] shadow-sm hover:shadow-md transition-all ${
          archived ? 'bg-paper/70 opacity-85 hover:opacity-100' : 'bg-paper'
        }`
      },
      h(
        'div',
        { className: 'flex flex-col lg:flex-row lg:items-center justify-between gap-space-md' },
        h(
          'div',
          { className: 'flex items-start gap-space-md min-w-0' },
          h(
            'div',
            { className: 'mt-1' },
            h('input', {
              type: 'checkbox',
              className: 'w-4 h-4 rounded accent-ink cursor-pointer',
              title: 'Chọn so sánh',
              'aria-label': `Chọn ${entry.version} để so sánh`,
              checked: selectedIds.includes(entry.planId),
              onChange: () => toggleSelect(entry.planId)
            })
          ),
          h(
            'div',
            { className: 'space-y-2 min-w-0' },
            h(
              'div',
              { className: 'flex flex-wrap items-center gap-2' },
              h('span', { className: 'font-subheading text-subheading text-ink font-semibold tracking-tight' }, `${entry.name} (${entry.version})`),
              badges
            ),
            h(
              'p',
              { className: 'font-body text-body text-mid-gray leading-normal' },
              `Chiến lược: ${entry.snapshot?.aiRiskAdvice || entry.note || 'Chưa có mô tả chiến lược.'}`
            ),
            h('div', { className: 'flex flex-wrap items-center gap-x-4 gap-y-1 text-mid-gray font-caption text-caption pt-1' }, metaItems)
          )
        ),
        h(
          'div',
          { className: 'flex items-center gap-2 shrink-0 pt-2 lg:pt-0 self-end lg:self-center' },
          actions.map((action, index) => h(React.Fragment, { key: index }, action))
        )
      ),
      expanded ? renderDetail(entry, check, { isOpen, openValidated }) : null
    );
  };

  const listBlock = h(
    'div',
    { className: 'space-y-space-md' },
    visibleEntries.length > 0
      ? visibleEntries.map(renderVersionCard)
      : h(
          'div',
          { className: 'bg-paper p-space-xl rounded-[24px] shadow-sm border border-hairline flex flex-col items-center text-center gap-space-sm' },
          h('div', { className: 'w-10 h-10 rounded-full bg-canvas flex items-center justify-center text-mid-gray' }, icon('inventory_2', 'text-[20px]')),
          h(
            'p',
            { className: 'font-body-medium text-body-medium text-ink' },
            history.length === 0 ? 'Chưa có phiên bản kế hoạch nào' : 'Không có phiên bản nào trong mục này'
          ),
          h(
            'p',
            { className: 'font-body text-body text-mid-gray max-w-md' },
            history.length === 0
              ? 'Lập kế hoạch trên Planner và bấm "Lưu nháp" để tạo phiên bản đầu tiên.'
              : 'Thử chọn bộ lọc khác để xem các phiên bản còn lại.'
          ),
          history.length === 0
            ? h('button', { type: 'button', className: `${BTN_INK} mt-space-xs`, onClick: () => navigate('/planner') }, icon('add'), h('span', null, 'Tạo kế hoạch mới từ đầu'))
            : h('button', { type: 'button', className: `${BTN_SOFT} mt-space-xs`, onClick: () => setFilter('all') }, 'Xem tất cả phiên bản')
        )
  );

  const auditBanner = h(
    'div',
    { className: 'bg-surface-alt p-space-lg rounded-[24px] flex items-start gap-space-md shadow-sm' },
    h('div', { className: 'w-10 h-10 rounded-full bg-paper flex items-center justify-center text-ink shrink-0 shadow-sm' }, icon('history_edu', 'text-[20px]')),
    h(
      'div',
      { className: 'space-y-1' },
      h(
        'h3',
        { className: 'font-body-medium text-body-medium text-ink font-semibold tracking-tight' },
        'Cơ chế bảo toàn dữ liệu bất biến (Immutable Versioning Engine)'
      ),
      h(
        'p',
        { className: 'font-body text-body text-mid-gray leading-relaxed' },
        'Hệ thống HAUI ADVISOR bảo lưu toàn bộ lịch sử kế hoạch theo cơ chế bất biến. Bất kỳ thao tác điều chỉnh môn học, đổi học kỳ hay mô phỏng điểm số nào cũng sẽ tự động sinh ra phiên bản mới (v2.5, v2.6...) mà không bao giờ ghi đè lên các kế hoạch cũ, giúp sinh viên an tâm thử nghiệm các phương án tối ưu.'
      )
    )
  );

  // Lớp phủ trong suốt để đóng menu khi bấm ra ngoài
  const menuOverlay =
    openMenuId || sortOpen
      ? h('div', {
          className: 'fixed inset-0 z-10',
          'aria-hidden': 'true',
          onClick: () => {
            setOpenMenuId(null);
            setSortOpen(false);
          }
        })
      : null;

  const isError = feedback?.tone === 'error';
  const feedbackToast = feedback
    ? h(
        'div',
        {
          role: isError ? 'alert' : 'status',
          className: 'fixed top-20 right-space-md lg:right-space-xl z-50 w-[440px] max-w-[calc(100vw-2rem)]'
        },
        h(
          'div',
          {
            className: `bg-paper rounded-[24px] border p-space-md flex items-start gap-space-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${
              isError ? 'border-ember/30' : 'border-hairline'
            }`
          },
          h(
            'div',
            { className: `w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isError ? 'bg-ember/10 text-ember' : 'bg-canvas text-ink'}` },
            icon(isError ? 'block' : feedback.tone === 'success' ? 'check_circle' : 'info', 'text-[18px]')
          ),
          h(
            'div',
            { className: 'flex-1 min-w-0 space-y-1' },
            h('p', { className: 'font-body-medium text-body-medium text-ink' }, feedback.title),
            feedback.message ? h('p', { className: 'font-caption text-caption text-mid-gray' }, feedback.message) : null,
            feedback.violations?.length
              ? h(
                  'ul',
                  { className: 'space-y-0.5 pt-1' },
                  feedback.violations.map((v) =>
                    h('li', { key: v, className: 'flex items-start gap-1 font-caption text-caption text-ember' }, icon('error', 'text-[14px]'), h('span', null, v))
                  )
                )
              : null,
            feedback.action
              ? h(
                  'div',
                  { className: 'pt-space-xs' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: BTN_SMALL_INK,
                      onClick: () => {
                        const { run } = feedback.action;
                        setFeedback(null);
                        run();
                      }
                    },
                    icon(feedback.action.icon, 'text-[14px]'),
                    h('span', null, feedback.action.label)
                  )
                )
              : null
          ),
          h(
            'button',
            {
              type: 'button',
              title: 'Đóng thông báo',
              'aria-label': 'Đóng thông báo',
              onClick: () => setFeedback(null),
              className: 'text-mid-gray hover:text-ink p-1 rounded-full hover:bg-canvas transition-colors shrink-0'
            },
            icon('close', 'text-[16px]')
          )
        )
      )
    : null;

  const devSlot = ui?.DevSlot
    ? h(
        ui.DevSlot,
        { title: 'Lịch sử kế hoạch' },
        h('button', { type: 'button', className: DEV_BTN, onClick: handleDevTryArchived }, icon('block', 'text-[14px]'), 'Thử kích hoạt trực tiếp bản lưu trữ'),
        h('button', { type: 'button', className: DEV_BTN, onClick: handleDevInvalidDraft }, icon('rule', 'text-[14px]'), 'Tạo bản nháp vi phạm quy chế'),
        h(
          'button',
          { type: 'button', className: DEV_BTN, onClick: () => setPreviewEmpty((v) => !v) },
          icon(previewEmpty ? 'visibility' : 'visibility_off', 'text-[14px]'),
          previewEmpty ? 'Hiện lại dữ liệu lịch sử' : 'Xem trạng thái trống (Empty)'
        ),
        h('button', { type: 'button', className: DEV_BTN, onClick: handleDevReset }, icon('restart_alt', 'text-[14px]'), 'Đặt lại dữ liệu mẫu')
      )
    : null;

  return h(
    'div',
    { className: 'flex flex-col w-full' },
    h(
      'div',
      { className: 'max-w-[1400px] w-full mx-auto px-space-md lg:px-space-xl py-space-lg space-y-space-xl' },
      headerBlock,
      metricsBlock,
      compareBlock,
      openPlanBanner,
      filterRow,
      listBlock,
      auditBanner
    ),
    menuOverlay,
    feedbackToast,
    devSlot
  );
}

export default PlanHistoryPage;
