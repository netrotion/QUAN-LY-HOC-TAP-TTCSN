import React, { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import { Link } from 'react-router-dom';
import { plannerStore, PLAN_STATUSES } from '../services/plannerStore.js';

const h = React.createElement;

/**
 * Màn hình Hồ sơ Sinh viên & Tùy chọn Học tập cá nhân (Student Profile) — TV3
 * Dựng theo prototype `ho_so_sinh_vien/code.html` (route `/profile`).
 *
 * Thực hiện yêu cầu nghiệp vụ:
 * 1. Thẻ tóm tắt hồ sơ (ảnh đại diện chữ cái, MSSV, lớp, mức hoàn thiện hồ sơ) lấy từ phiên đăng nhập
 *    (`api.getConfig().sessionStudent`) và tự tải lại khi phiên / chế độ API thay đổi (`api.subscribe`).
 * 2. Chỉ số học vụ (CPA, GPA, tín chỉ tích lũy, cảnh báo) lấy từ `api.academic.getStatus()` —
 *    giá trị null (chưa khóa sổ) được giữ nguyên và hiển thị "—", không mặc định thành số.
 * 3. Biểu mẫu Nhóm 01 (cá nhân & liên hệ), Nhóm 02 (chương trình đào tạo & ngành) và Nhóm 03
 *    (mục tiêu CPA, tiến độ 4 năm / 3.5 năm, chuyên ngành hẹp) có kiểm tra hợp lệ, xác nhận trước khi lưu,
 *    hoàn tác thay đổi và lưu cục bộ trên trình duyệt theo từng sinh viên.
 * 4. Kế hoạch đang theo dõi trích từ plannerStore (cập nhật trực tiếp) và liên kết sang Study Planner.
 * 5. Đủ trạng thái Loading / Error / Empty; bộ chuyển trạng thái kiểm thử nằm trong panel công cụ dev (`ui.DevSlot`).
 *
 * Các trường không có API cung cấp (ngày sinh, giới tính, liên hệ cá nhân, cơ sở đào tạo, cố vấn học tập…)
 * dùng hằng số demo `DEMO_*` bên dưới, giữ nguyên nội dung prototype.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2 (dùng `ui.DevSlot`)
 */

// ---------------------------------------------------------------------------
// Hằng số demo (dữ liệu prototype — chưa có API cung cấp)
// ---------------------------------------------------------------------------

/** Giá trị dự phòng khi không có phiên đăng nhập / API học vụ (giữ như phiên bản trước) */
const DEMO_PROFILE = Object.freeze({
  studentCode: '2020601234',
  fullName: 'Nguyễn Văn An',
  universityEmail: '2020601234@sv.haui.edu.vn',
  majorName: 'Kỹ thuật phần mềm (Khoa CNTT)',
  majorCode: '7480103',
  cohort: 'Khóa 16 (2020 - 2024)',
  faculty: 'Trường Công nghệ Thông tin & Truyền thông (SICT - HaUI)',
  advisorClass: 'KTPM01-K16',
  cpa: 3.18,
  gpa: 3.32,
  accumulatedCredits: 108,
  totalCreditsRequired: 145,
  riskLevel: 'SAFE',
  warningMessages: ['Cần hoàn thành môn Toán rời rạc (MATH1002) trước khi đăng ký đồ án.']
});

const DEMO_ENROLLMENT_STATUS = 'Đang theo học - Kỳ 6/8';
const DEMO_IDENTITY_STATUS = 'Đã đồng bộ HaUI Portal';
const DEMO_CAMPUS = 'Trường Đại học Công nghiệp Hà Nội - Cơ sở 1 (Nhổn, Bắc Từ Liêm, Hà Nội)';
const DEMO_PROGRAM = Object.freeze({
  type: 'Hệ đào tạo Kỹ sư',
  note: 'Khung kỹ sư định hướng ứng dụng POHE'
});
const DEMO_ADVISOR = Object.freeze({
  initials: 'TM',
  name: 'TS. Trần Văn Minh',
  unit: 'Khoa Công nghệ Thông tin',
  email: 'minhtv@haui.edu.vn',
  officeHours: 'Lịch hẹn tư vấn: Thứ 4 (09:00 - 11:30)',
  changeNote: 'Liên hệ đổi cố vấn qua VP Khoa CNTT (Tầng 5 - A1)'
});
const DEMO_PERSONAL = Object.freeze({
  dob: '2002-08-15',
  gender: 'Nam',
  personalEmail: 'vanan.dev@gmail.com',
  phone: '0987 654 321',
  address: 'Bắc Ninh, Việt Nam'
});
const DEMO_SPECIALIZATION = 'Kỹ thuật phần mềm Web & Di động';

// ---------------------------------------------------------------------------
// Tùy chọn biểu mẫu
// ---------------------------------------------------------------------------

const GENDER_OPTIONS = ['Nam', 'Nữ', 'Khác'];

const TRACK_OPTIONS = [
  { value: 'ktpm-httt', label: 'Kỹ thuật phần mềm & Hệ thống thông tin (SE & IS Track)' },
  { value: 'khmt-ai', label: 'Khoa học máy tính & Trí tuệ nhân tạo (CS & AI Track)' },
  { value: 'mmt-attt', label: 'Mạng máy tính & An toàn không gian số (Network & Security)' }
];

const TARGET_CPA_OPTIONS = [
  { value: '2.50', label: 'CPA ≥ 2.50 (Xếp loại Khá)' },
  { value: '3.20', label: 'CPA ≥ 3.20 (Xếp loại Giỏi)' },
  { value: '3.60', label: 'CPA ≥ 3.60 (Xếp loại Xuất sắc)' }
];

const PACE_OPTIONS = [
  { value: 'STANDARD', label: 'Chuẩn 4 năm', detail: 'Chuẩn 4 năm (2 kỳ chính + 1 kỳ hè nhẹ)' },
  { value: 'FAST', label: 'Rút ngắn 3.5 năm', detail: 'Rút ngắn 3.5 năm (Học vượt, tối đa 8 TC kỳ hè)' }
];

const FIELD_LABELS = Object.freeze({
  fullName: 'Họ và tên',
  dob: 'Ngày sinh',
  gender: 'Giới tính',
  personalEmail: 'Email cá nhân',
  phone: 'Số điện thoại',
  address: 'Địa chỉ liên hệ / Quê quán',
  className: 'Lớp sinh hoạt hành chính',
  track: 'Chuyên ngành định hướng',
  targetCpa: 'Mục tiêu CPA tốt nghiệp',
  graduationPace: 'Tiến độ mong muốn',
  specialization: 'Định hướng chuyên ngành hẹp'
});
const FORM_FIELDS = Object.keys(FIELD_LABELS);

/** Các trường tính vào "Tiến độ hoàn thành hồ sơ" */
const COMPLETENESS_FIELDS = ['fullName', 'dob', 'gender', 'personalEmail', 'phone', 'address', 'className', 'track', 'specialization'];

const PLAN_STATUS_LABELS = Object.freeze({
  [PLAN_STATUSES.DRAFT]: 'Bản nháp',
  [PLAN_STATUSES.VALIDATED]: 'Đã thẩm định',
  [PLAN_STATUSES.ACTIVE]: 'Đang áp dụng',
  [PLAN_STATUSES.ARCHIVED]: 'Lưu trữ'
});

const RISK_LABELS = Object.freeze({
  SAFE: 'An toàn',
  WARNING_LEVEL_1: 'Cảnh báo mức 1',
  WARNING_LEVEL_2: 'Cảnh báo mức 2',
  WARNING_LEVEL_3: 'Cảnh báo mức 3'
});

const STORAGE_PREFIX = 'haui-advisor.tv3.student-profile.';

// ---------------------------------------------------------------------------
// Lớp Tailwind dùng chung (theo prototype)
// ---------------------------------------------------------------------------

const CARD = 'bg-paper border border-hairline rounded-[24px] p-space-lg shadow-sm flex flex-col gap-space-lg';
const SIDE_CARD = 'bg-paper border border-hairline rounded-[24px] p-space-lg shadow-sm flex flex-col gap-space-sm';
const INPUT_BASE = 'w-full bg-surface-alt border rounded-full px-4 py-2 font-body text-body';
const INPUT_EDITABLE = `${INPUT_BASE} text-ink placeholder:text-mid-gray focus:outline-none focus:border-ink transition-colors`;
const INPUT_LOCKED = `${INPUT_BASE} border-hairline text-on-surface-variant cursor-not-allowed focus:outline-none`;
const LABEL = 'font-body-medium text-body-medium text-ink font-medium';
const HINT = 'font-caption text-caption text-mid-gray';
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-canvas hover:bg-surface-variant text-ink rounded-full font-body-medium text-body-medium transition-colors border border-hairline whitespace-nowrap';
const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-ink hover:bg-ink-soft text-paper rounded-full font-body-medium text-body-medium shadow-sm transition-all whitespace-nowrap';
const DEV_BTN =
  'inline-flex items-center px-space-md py-1 rounded-full border font-label text-label transition-colors';

// ---------------------------------------------------------------------------
// Hàm tiện ích
// ---------------------------------------------------------------------------

function icon(name, className = '') {
  return h('span', { className: `material-symbols-outlined ${className}`.trim(), 'aria-hidden': 'true' }, name);
}

function getInitials(fullName) {
  const words = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'SV';
  const first = words[0][0] || '';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

function getCohortLabel(cohort) {
  const text = String(cohort || '');
  const kMatch = text.match(/K\s*(\d+)/i);
  if (kMatch) return `Khóa ${kMatch[1]}`;
  const khoaMatch = text.match(/Khóa\s*\d+/i);
  return khoaMatch ? khoaMatch[0] : 'Khóa 16';
}

function formatScore(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';
}

function formatSyncTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return sameDay ? `Hôm nay, ${time}` : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${time}`;
}

function configKey(config) {
  const student = config?.sessionStudent || {};
  return `${student.studentId || ''}|${student.fullName || ''}|${config?.mockEnabled ? 'mock' : 'live'}`;
}

function readLocalProfile(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalProfile(key, payload) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function clearLocalProfile(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Trình duyệt chặn lưu trữ cục bộ — bỏ qua
  }
}

/** Gộp dữ liệu phiên đăng nhập + trạng thái học vụ thành hồ sơ hiển thị */
function buildProfile(sessionStudent, academicStatus) {
  const s = sessionStudent || {};
  const hasStatus = Boolean(academicStatus && typeof academicStatus === 'object');
  const studentCode = s.studentCode || s.studentId || academicStatus?.studentId || DEMO_PROFILE.studentCode;

  const warnings = [];
  if (hasStatus) {
    if (Array.isArray(academicStatus.warningMessages)) warnings.push(...academicStatus.warningMessages);
    if (academicStatus.academicWarning && !warnings.includes(academicStatus.academicWarning)) {
      warnings.push(academicStatus.academicWarning);
    }
  } else {
    warnings.push(...DEMO_PROFILE.warningMessages);
  }

  return {
    storageKey: s.studentId || studentCode,
    studentCode,
    fullName: s.fullName || DEMO_PROFILE.fullName,
    // Email trường cấp theo MSSV khi phiên không có email; chỉ dùng demo khi không có phiên đăng nhập
    universityEmail: s.email || (s.studentId || s.studentCode ? `${studentCode}@sv.haui.edu.vn` : DEMO_PROFILE.universityEmail),
    majorName: s.majorName || DEMO_PROFILE.majorName,
    majorCode: s.majorCode || DEMO_PROFILE.majorCode,
    cohort: s.cohort || DEMO_PROFILE.cohort,
    faculty: s.faculty || DEMO_PROFILE.faculty,
    advisorClass: s.advisorClass || DEMO_PROFILE.advisorClass,
    // Giữ nguyên null (chưa có dữ liệu) khi API đã trả về, chỉ dùng demo khi không có API học vụ
    cpa: hasStatus ? academicStatus.cpa ?? null : DEMO_PROFILE.cpa,
    gpa: hasStatus ? academicStatus.gpa ?? null : DEMO_PROFILE.gpa,
    accumulatedCredits: hasStatus ? academicStatus.accumulatedCredits ?? null : DEMO_PROFILE.accumulatedCredits,
    totalCreditsRequired: hasStatus
      ? academicStatus.totalCreditsRequired ?? DEMO_PROFILE.totalCreditsRequired
      : DEMO_PROFILE.totalCreditsRequired,
    riskLevel: (hasStatus && academicStatus.riskLevel) || (warnings.length ? 'WARNING' : DEMO_PROFILE.riskLevel),
    warningMessages: warnings,
    enrollmentStatus: buildEnrollmentStatus(s)
  };
}

/** Kỳ đang học = số học kỳ khác nhau trong bảng điểm của phiên (cùng quy tắc với Sidebar của Web Host) */
function buildEnrollmentStatus(sessionStudent) {
  if (!Array.isArray(sessionStudent?.records)) return DEMO_ENROLLMENT_STATUS;
  const semesterCount = new Set(sessionStudent.records.map((r) => r.semesterCode).filter(Boolean)).size;
  return semesterCount > 0 ? `Đang theo học - Kỳ ${semesterCount}/8` : 'Đang theo học - Chưa có bảng điểm';
}

function buildDefaultForm(profile, plan) {
  const planTarget = typeof plan?.targetCpa === 'number' ? plan.targetCpa.toFixed(2) : '3.20';
  return {
    fullName: profile.fullName,
    dob: DEMO_PERSONAL.dob,
    gender: DEMO_PERSONAL.gender,
    personalEmail: DEMO_PERSONAL.personalEmail,
    phone: DEMO_PERSONAL.phone,
    address: DEMO_PERSONAL.address,
    className: profile.advisorClass,
    track: TRACK_OPTIONS[0].value,
    targetCpa: TARGET_CPA_OPTIONS.some((o) => o.value === planTarget) ? planTarget : '3.20',
    graduationPace: 'STANDARD',
    specialization: DEMO_SPECIALIZATION
  };
}

function pickFormFields(source) {
  const result = {};
  for (const field of FORM_FIELDS) {
    if (typeof source?.[field] === 'string') result[field] = source[field];
  }
  return result;
}

function validateForm(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên của sinh viên';
  const phoneDigits = form.phone.replace(/[\s.-]/g, '');
  if (!/^(0|\+84)\d{9,10}$/.test(phoneDigits)) errors.phone = 'Vui lòng nhập số điện thoại hợp lệ';
  const email = form.personalEmail.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.personalEmail = 'Vui lòng nhập email cá nhân hợp lệ';
  return errors;
}

function changedFields(form, baseline) {
  if (!form || !baseline) return [];
  return FORM_FIELDS.filter((field) => form[field] !== baseline[field]);
}

// ---------------------------------------------------------------------------
// Thành phần trình bày (theo markup prototype)
// ---------------------------------------------------------------------------

function SectionHeader({ iconName, title, subtitle, group }) {
  return h(
    'div',
    { className: 'flex items-center justify-between gap-space-sm border-b border-hairline pb-space-md' },
    h(
      'div',
      { className: 'flex items-center gap-space-sm min-w-0' },
      icon(iconName, 'text-ink text-[22px] shrink-0'),
      h(
        'div',
        { className: 'flex flex-col min-w-0' },
        h('h3', { className: 'font-subheading text-subheading text-ink font-semibold' }, title),
        h('p', { className: HINT }, subtitle)
      )
    ),
    h(
      'span',
      {
        className:
          'inline-flex items-center px-2.5 py-0.5 rounded-full font-label text-label bg-canvas text-mid-gray border border-hairline shrink-0'
      },
      group
    )
  );
}

function Field({ label, htmlFor, aside, hint, error, wide, children }) {
  return h(
    'div',
    { className: `flex flex-col gap-1.5${wide ? ' md:col-span-2' : ''}` },
    aside
      ? h(
          'div',
          { className: 'flex items-center justify-between' },
          h('label', { className: LABEL, htmlFor }, label),
          h('span', { className: HINT }, aside)
        )
      : h('label', { className: LABEL, htmlFor }, label),
    children,
    error ? h('p', { className: 'font-caption text-caption text-ember', id: `${htmlFor}-error`, role: 'alert' }, error) : null,
    hint ? h('p', { className: HINT }, hint) : null
  );
}

function LockedInput({ id, value, type = 'text', iconName = 'lock' }) {
  return h(
    'div',
    { className: 'relative' },
    h('input', { className: `${INPUT_LOCKED} pr-10`, id, readOnly: true, type, value: value ?? '', title: value ?? '' }),
    icon(iconName, 'absolute right-3.5 top-2.5 text-[18px] text-mid-gray')
  );
}

function SegmentedChoice({ name, options, value, onChange, columns }) {
  return h(
    'div',
    { className: `grid ${columns} gap-2`, role: 'radiogroup' },
    options.map((option) => {
      const selected = option.value === value;
      return h(
        'label',
        {
          key: option.value,
          className: `flex items-center justify-center gap-2 p-2 rounded-full border cursor-pointer transition-colors ${
            selected ? 'bg-ink text-paper border-ink' : 'bg-surface-alt text-ink border-hairline hover:bg-canvas'
          }`
        },
        h('input', {
          className: 'sr-only',
          type: 'radio',
          name,
          value: option.value,
          checked: selected,
          onChange: () => onChange(option.value)
        }),
        h('span', { className: 'font-body text-body font-medium' }, option.label)
      );
    })
  );
}

function SidePanelTitle({ title, iconName }) {
  return h(
    'div',
    { className: 'flex items-center justify-between pb-space-xs' },
    h('span', { className: 'font-label text-label uppercase tracking-wider text-mid-gray' }, title),
    icon(iconName, 'text-mid-gray text-[18px]')
  );
}

function InfoRow({ iconName, label, value }) {
  return h(
    'div',
    { className: 'flex items-center gap-space-sm min-w-0' },
    h(
      'div',
      {
        className:
          'w-8 h-8 rounded-full bg-surface-alt border border-hairline flex items-center justify-center shrink-0 text-mid-gray'
      },
      icon(iconName, 'text-[18px]')
    ),
    h(
      'div',
      { className: 'min-w-0 flex flex-col' },
      h('span', { className: HINT }, label),
      h('span', { className: 'text-ink font-body-medium text-body-medium truncate', title: value }, value)
    )
  );
}

function StatusCard({ iconName, iconClass = 'text-ink', title, description, children }) {
  return h(
    'div',
    { className: `${CARD} items-center text-center py-space-xl` },
    h(
      'div',
      { className: 'w-12 h-12 rounded-full bg-surface-container border border-hairline flex items-center justify-center' },
      icon(iconName, `text-[24px] ${iconClass}`)
    ),
    h(
      'div',
      { className: 'flex flex-col gap-1 max-w-xl' },
      h('h3', { className: 'font-subheading text-subheading text-ink font-semibold' }, title),
      description ? h('p', { className: 'font-body text-body text-mid-gray leading-relaxed' }, description) : null
    ),
    children
  );
}

function LoadingSkeleton() {
  const bar = (width, extra = '') => h('div', { className: `h-3 rounded-full bg-surface-container animate-pulse ${width} ${extra}` });
  return h(
    'div',
    { className: 'grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start', role: 'status', 'aria-live': 'polite' },
    h(
      'div',
      { className: 'lg:col-span-4 flex flex-col gap-space-lg' },
      h(
        'div',
        { className: `${CARD} items-center` },
        h('div', { className: 'w-24 h-24 rounded-full bg-surface-container animate-pulse' }),
        bar('w-40'),
        bar('w-24'),
        h('div', { className: 'h-px bg-hairline w-full' }),
        bar('w-full'),
        bar('w-3/4')
      )
    ),
    h(
      'div',
      { className: 'lg:col-span-8 flex flex-col gap-space-xl' },
      h(
        'div',
        { className: CARD },
        h(
          'div',
          { className: 'flex items-center gap-space-sm text-mid-gray' },
          icon('progress_activity', 'animate-spin text-[20px] text-ink'),
          h('span', { className: 'font-body-medium text-body-medium text-ink' }, 'Đang tải thông tin hồ sơ sinh viên...')
        ),
        h(
          'div',
          { className: 'grid grid-cols-1 md:grid-cols-2 gap-space-md' },
          [0, 1, 2, 3].map((i) =>
            h(
              'div',
              { key: i, className: 'flex flex-col gap-2' },
              bar('w-1/3'),
              h('div', { className: 'h-9 rounded-full bg-surface-container animate-pulse' })
            )
          )
        )
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Trang chính
// ---------------------------------------------------------------------------

export function StudentProfilePage({ api, ui } = {}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Kế hoạch đang theo dõi: đọc trực tiếp từ plannerStore, render lại khi store thay đổi
  const [, refreshPlan] = useReducer((n) => n + 1, 0);
  const currentPlan = plannerStore.getPlan();

  const toastTimerRef = useRef(null);
  const requestIdRef = useRef(0);

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      requestIdRef.current += 1; // Bỏ qua phản hồi tới sau khi rời trang
    },
    []
  );

  useEffect(() => plannerStore.subscribe(() => refreshPlan()), []);

  // Tải dữ liệu hồ sơ sinh viên (phiên đăng nhập + trạng thái học vụ + hiệu chỉnh cục bộ đã lưu)
  const handleFetchProfile = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      let academicStatus = null;
      if (api && api.academic && typeof api.academic.getStatus === 'function') {
        academicStatus = await api.academic.getStatus();
      }

      const sessionStudent = api?.getConfig?.()?.sessionStudent || null;
      const nextProfile = buildProfile(sessionStudent, academicStatus);
      const defaults = buildDefaultForm(nextProfile, plannerStore.getPlan());
      const stored = readLocalProfile(nextProfile.storageKey);
      const savedForm = stored?.form ? { ...defaults, ...pickFormFields(stored.form) } : defaults;

      if (requestId !== requestIdRef.current) return;
      setProfile(nextProfile);
      setBaseline(savedForm);
      setForm(savedForm);
      setFieldErrors({});
      setSavedAt(stored?.savedAt ? new Date(stored.savedAt) : null);
      setLoadedAt(new Date());
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError({
        code: err?.code || 'PROFILE_FETCH_FAILED',
        message: err?.message || 'Không thể tải thông tin hồ sơ sinh viên.',
        details:
          Array.isArray(err?.details) && err.details.length
            ? err.details
            : ['Kiểm tra kết nối tới Backend Spring Boot hoặc mock mode.']
      });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    handleFetchProfile();
  }, [handleFetchProfile]);

  // Tải lại khi đổi tài khoản phiên (persona) hoặc chế độ API MOCK/LIVE
  useEffect(() => {
    if (!api || typeof api.subscribe !== 'function') return undefined;
    let lastKey = configKey(api.getConfig?.());
    const unsubscribe = api.subscribe((config) => {
      const nextKey = configKey(config);
      if (nextKey !== lastKey) {
        lastKey = nextKey;
        handleFetchProfile();
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [api, handleFetchProfile]);

  // ----- Biểu mẫu -----
  const pendingChanges = changedFields(form, baseline);
  const isDirty = pendingChanges.length > 0;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleRequestSave = (event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (!form) return;
    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast('Vui lòng kiểm tra lại các trường được đánh dấu đỏ.', 'error');
      return;
    }
    if (!isDirty) {
      showToast('Không có thay đổi mới để lưu.', 'info');
      return;
    }
    setToast(null);
    setConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    if (!form || !profile) return;
    const now = new Date();
    const persisted = writeLocalProfile(profile.storageKey, { form, savedAt: now.toISOString() });
    setBaseline(form);
    setSavedAt(now);
    setConfirmOpen(false);
    showToast(
      persisted
        ? 'Đã lưu cập nhật thông tin hồ sơ sinh viên thành công!'
        : 'Đã lưu trong phiên làm việc (trình duyệt đang chặn lưu trữ cục bộ).',
      persisted ? 'success' : 'info'
    );
  };

  const handleCancelChanges = () => {
    if (!baseline) return;
    const hadChanges = isDirty || Object.keys(fieldErrors).length > 0;
    setForm(baseline);
    setFieldErrors({});
    if (hadChanges) showToast('Đã hoàn tác các thay đổi chưa lưu.', 'info');
  };

  const handleResetLocalData = () => {
    if (profile) clearLocalProfile(profile.storageKey);
    handleFetchProfile();
  };

  // ----- Phần đầu trang -----
  const breadcrumb = h(
    'nav',
    { 'aria-label': 'Breadcrumb', className: 'flex items-center gap-space-xs text-mid-gray font-caption text-caption' },
    h(Link, { className: 'hover:text-ink transition-colors flex items-center gap-1', to: '/' }, icon('home', 'text-[16px]'), h('span', null, 'Trang chủ')),
    icon('chevron_right', 'text-[14px]'),
    h('span', { className: 'text-ink font-body-medium text-body-medium' }, 'Hồ sơ sinh viên')
  );

  const isLoaded = !loading && !error && Boolean(profile && form);

  const headerSection = h(
    'header',
    { className: 'flex flex-col gap-space-sm pb-space-md' },
    breadcrumb,
    h(
      'div',
      { className: 'flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-space-xs' },
      h(
        'div',
        { className: 'flex flex-col gap-1.5' },
        h(
          'div',
          { className: 'flex flex-wrap items-center gap-space-sm' },
          h('h1', { className: 'font-headline text-headline text-ink tracking-tight font-semibold' }, 'Hồ sơ sinh viên'),
          isLoaded
            ? [
                h(
                  'span',
                  {
                    key: 'enroll',
                    className:
                      'inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container text-ink rounded-full font-label text-label border border-hairline shadow-sm'
                  },
                  h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ink' }),
                  profile.enrollmentStatus
                ),
                h(
                  'span',
                  {
                    key: 'official',
                    className:
                      'inline-flex items-center gap-1.5 px-3 py-1 bg-surface-alt text-mid-gray rounded-full font-label text-label border border-hairline'
                  },
                  icon('verified', 'text-[14px] text-ink'),
                  'Dữ liệu hồ sơ gốc (Chính thức)'
                ),
                h(
                  'span',
                  {
                    key: 'local',
                    className:
                      'inline-flex items-center gap-1.5 px-3 py-1 bg-paper text-on-surface-variant rounded-full font-label text-label border border-hairline'
                  },
                  h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ember' }),
                  'Dữ liệu hiệu chỉnh cục bộ (Chưa đồng bộ sv.haui)'
                )
              ]
            : null
        ),
        h(
          'p',
          { className: 'font-body text-body text-mid-gray max-w-3xl leading-relaxed' },
          'Quản lý và cập nhật thông tin cá nhân, định hướng ngành và chương trình đào tạo tại Trường Đại học Công nghiệp Hà Nội.'
        )
      ),
      isLoaded
        ? h(
            'div',
            { className: 'flex items-center gap-space-sm shrink-0' },
            h('button', { className: BTN_SECONDARY, type: 'button', onClick: handleCancelChanges }, 'Hủy thay đổi'),
            h(
              'button',
              { className: BTN_PRIMARY, type: 'button', onClick: handleRequestSave },
              icon('check', 'text-[18px]'),
              h('span', null, 'Lưu thay đổi')
            )
          )
        : null
    )
  );

  // ----- Nội dung theo trạng thái -----
  let content;
  if (loading) {
    content = h(LoadingSkeleton);
  } else if (error) {
    content = h(
      StatusCard,
      { iconName: 'error', iconClass: 'text-ember', title: 'Lỗi tải hồ sơ sinh viên', description: error.message },
      h(
        'div',
        { className: 'flex flex-col items-center gap-1' },
        h('span', { className: 'font-label text-label text-mid-gray uppercase tracking-wider' }, `Mã lỗi: ${error.code || 'UNKNOWN'}`),
        Array.isArray(error.details)
          ? error.details.map((detail, index) => h('p', { key: index, className: HINT }, detail))
          : null
      ),
      h('button', { className: BTN_PRIMARY, type: 'button', onClick: handleFetchProfile }, icon('refresh', 'text-[18px]'), 'Thử lại')
    );
  } else if (!profile || !form) {
    content = h(
      StatusCard,
      {
        iconName: 'person_off',
        iconClass: 'text-mid-gray',
        title: 'Chưa có thông tin hồ sơ sinh viên',
        description: 'Không tìm thấy dữ liệu sinh viên trong phiên làm việc.'
      },
      h('button', { className: BTN_SECONDARY, type: 'button', onClick: handleFetchProfile }, icon('refresh', 'text-[18px]'), 'Tải lại')
    );
  } else {
    content = renderLoaded();
  }

  function renderLoaded() {
    const completedCount = COMPLETENESS_FIELDS.filter((field) => String(form[field] || '').trim()).length;
    const completeness = Math.round((completedCount / COMPLETENESS_FIELDS.length) * 100);
    const creditsTotal = profile.totalCreditsRequired;
    const creditsDone = profile.accumulatedCredits;
    const creditsPercent =
      typeof creditsDone === 'number' && creditsTotal ? Math.min(100, Math.round((creditsDone / creditsTotal) * 100)) : 0;
    const paceOption = PACE_OPTIONS.find((o) => o.value === form.graduationPace) || PACE_OPTIONS[0];
    const planStatus = currentPlan?.status;
    const planIsActive = planStatus === PLAN_STATUSES.ACTIVE;
    const inputClass = (field) => `${INPUT_EDITABLE} ${fieldErrors[field] ? 'border-ember' : 'border-hairline'}`;

    // ---- Cột trái: thẻ hồ sơ, chỉ số học vụ, kế hoạch, cố vấn ----
    const profileCard = h(
      'div',
      { className: CARD },
      h(
        'div',
        { className: 'flex flex-col items-center text-center' },
        h(
          'div',
          { className: 'relative group mb-space-md' },
          h(
            'div',
            {
              className:
                'w-24 h-24 rounded-full bg-ink text-paper font-display text-headline flex items-center justify-center font-bold tracking-tight shadow-md'
            },
            getInitials(baseline.fullName)
          ),
          h(
            'button',
            {
              className:
                'absolute bottom-0 right-0 w-8 h-8 rounded-full bg-paper border border-hairline shadow-sm flex items-center justify-center text-ink hover:bg-canvas transition-colors',
              title: 'Thay đổi ảnh đại diện',
              type: 'button',
              onClick: () => showToast('Ảnh đại diện được đồng bộ từ HaUI Portal, chưa hỗ trợ thay đổi tại đây.', 'info')
            },
            icon('photo_camera', 'text-[16px]')
          )
        ),
        h('h2', { className: 'font-subheading text-subheading text-ink font-semibold' }, baseline.fullName),
        h('p', { className: 'font-body text-body text-mid-gray mt-0.5' }, profile.studentCode),
        h(
          'div',
          {
            className:
              'mt-space-sm inline-flex items-center gap-1 px-3 py-1 bg-surface-container-low rounded-full font-label text-label text-on-surface-variant border border-hairline'
          },
          icon('school', 'text-[14px]'),
          h('span', null, baseline.className || profile.advisorClass)
        )
      ),
      h('div', { className: 'h-px bg-hairline w-full' }),
      h(
        'div',
        { className: 'flex flex-col gap-space-sm' },
        h(
          'div',
          { className: 'flex items-center justify-between text-caption font-caption' },
          h('span', { className: 'text-mid-gray font-medium' }, 'Tiến độ hoàn thành hồ sơ'),
          h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, `${completeness}%`)
        ),
        h(
          'div',
          { className: 'w-full bg-surface-container rounded-full h-1.5 overflow-hidden' },
          h('div', { className: 'bg-ink h-full rounded-full transition-all duration-500', style: { width: `${completeness}%` } })
        ),
        h(
          'p',
          { className: `${HINT} pt-1` },
          completeness === 100
            ? 'Hồ sơ chuẩn hóa đã sẵn sàng cho cổng thẩm định tốt nghiệp và What-if.'
            : `Còn ${COMPLETENESS_FIELDS.length - completedCount} trường trống — bổ sung để hoàn thiện hồ sơ cho thẩm định tốt nghiệp và What-if.`
        )
      ),
      h('div', { className: 'h-px bg-hairline w-full' }),
      h(
        'div',
        { className: 'flex flex-col gap-space-md font-body text-body' },
        h(InfoRow, { iconName: 'domain', label: 'Khoa / Viện', value: profile.faculty }),
        h(InfoRow, { iconName: 'mail', label: 'Email trường', value: profile.universityEmail }),
        h(InfoRow, { iconName: 'verified_user', label: 'Trạng thái định danh', value: DEMO_IDENTITY_STATUS })
      ),
      h(
        'button',
        {
          className: `${BTN_SECONDARY} w-full mt-space-xs py-2.5`,
          type: 'button',
          onClick: () => showToast('Chức năng xuất sơ yếu lý lịch (.pdf) đang được phát triển.', 'info')
        },
        icon('file_download', 'text-[16px]'),
        h('span', null, 'Tải bản sơ yếu lý lịch (.pdf)')
      )
    );

    const metricsCard = h(
      'div',
      { className: SIDE_CARD },
      h(SidePanelTitle, { title: 'Chỉ số học vụ', iconName: 'monitoring' }),
      h(
        'div',
        { className: 'grid grid-cols-3 gap-space-sm' },
        [
          { key: 'cpa', label: 'CPA tích lũy', value: formatScore(profile.cpa), suffix: profile.cpa == null ? 'Chưa có dữ liệu' : '/ 4.00' },
          { key: 'gpa', label: 'GPA kỳ gần nhất', value: formatScore(profile.gpa), suffix: profile.gpa == null ? 'Chưa khóa sổ' : '/ 4.00' },
          { key: 'credits', label: 'Tín chỉ', value: creditsDone ?? '—', suffix: `/ ${creditsTotal} TC` }
        ].map((stat) =>
          h(
            'div',
            { key: stat.key, className: 'flex flex-col gap-0.5 min-w-0' },
            h('span', { className: `${HINT} truncate` }, stat.label),
            h('span', { className: 'font-subheading text-subheading text-ink font-semibold leading-tight' }, stat.value),
            h('span', { className: `${HINT} truncate` }, stat.suffix)
          )
        )
      ),
      h(
        'div',
        { className: 'flex flex-col gap-1.5 pt-1' },
        h(
          'div',
          { className: 'flex items-center justify-between font-caption text-caption' },
          h('span', { className: 'text-mid-gray' }, 'Tiến độ tích lũy tín chỉ'),
          h('span', { className: 'text-ink font-medium' }, `${creditsPercent}%`)
        ),
        h(
          'div',
          { className: 'w-full bg-surface-container rounded-full h-1.5 overflow-hidden' },
          h('div', { className: 'bg-ink h-full rounded-full transition-all duration-500', style: { width: `${creditsPercent}%` } })
        )
      ),
      profile.warningMessages.length > 0
        ? h(
            'div',
            { className: 'pt-2 border-t border-hairline mt-1 flex flex-col gap-1.5' },
            h(
              'span',
              { className: 'font-label text-label text-ink inline-flex items-center gap-1.5' },
              h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ember' }),
              RISK_LABELS[profile.riskLevel] || 'Cảnh báo học vụ'
            ),
            profile.warningMessages.map((message, index) =>
              h('p', { key: index, className: `${HINT} leading-relaxed` }, message)
            )
          )
        : h(
            'div',
            { className: 'pt-2 border-t border-hairline mt-1 flex items-center gap-1.5 font-caption text-caption text-mid-gray' },
            icon('check_circle', 'text-[14px] text-ink'),
            'Không có cảnh báo học vụ.'
          )
    );

    const planCard = h(
      'div',
      { className: SIDE_CARD },
      h(SidePanelTitle, { title: 'Kế hoạch đang theo dõi', iconName: 'event_note' }),
      h(
        'div',
        { className: 'flex items-start justify-between gap-space-sm' },
        h('p', { className: 'font-body-medium text-body-medium text-ink font-semibold min-w-0' }, currentPlan?.planName || 'Chưa có kế hoạch'),
        planStatus
          ? h(
              'span',
              {
                className: `inline-flex items-center px-2.5 py-0.5 rounded-full font-label text-label border shrink-0 ${
                  planIsActive ? 'bg-ink text-paper border-ink' : 'bg-canvas text-mid-gray border-hairline'
                }`,
                title: planStatus
              },
              PLAN_STATUS_LABELS[planStatus] || planStatus
            )
          : null
      ),
      h(
        'p',
        { className: HINT },
        `Phiên bản: ${currentPlan?.version || '—'} · Gồm ${currentPlan?.semesters?.length || 3} học kỳ (${
          currentPlan?.remainingCredits || 37
        } TC) · CPA dự phóng: ${currentPlan?.projectedCpa || '3.32'}`
      ),
      h(
        'div',
        { className: 'flex flex-col gap-space-xs pt-1' },
        h(
          Link,
          { className: `${BTN_SECONDARY} w-full`, to: '/planner' },
          icon('edit_calendar', 'text-[16px]'),
          h('span', null, 'Mở trong Study Planner')
        ),
        h(
          Link,
          {
            className: 'inline-flex items-center justify-center gap-1 font-caption text-caption text-mid-gray hover:text-ink transition-colors',
            to: '/planner/history'
          },
          icon('history', 'text-[14px]'),
          'Xem lịch sử kế hoạch'
        )
      )
    );

    const advisorCard = h(
      'div',
      { className: SIDE_CARD },
      h(SidePanelTitle, { title: 'Cố vấn học tập', iconName: 'supervised_user_circle' }),
      h(
        'div',
        { className: 'flex items-center gap-space-sm' },
        h(
          'div',
          {
            className:
              'w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-ink font-subheading text-subheading shrink-0 font-semibold border border-hairline'
          },
          DEMO_ADVISOR.initials
        ),
        h(
          'div',
          { className: 'min-w-0' },
          h('p', { className: 'font-body-medium text-body-medium text-ink font-semibold truncate' }, DEMO_ADVISOR.name),
          h('p', { className: `${HINT} truncate` }, DEMO_ADVISOR.unit)
        )
      ),
      h(
        'div',
        { className: 'pt-2 text-caption font-caption text-mid-gray flex flex-col gap-1 border-t border-hairline mt-1' },
        h(
          'a',
          { className: 'hover:text-ink transition-colors flex items-center gap-1.5 truncate', href: `mailto:${DEMO_ADVISOR.email}` },
          icon('alternate_email', 'text-[14px]'),
          h('span', null, DEMO_ADVISOR.email)
        ),
        h('span', { className: 'flex items-center gap-1.5 text-mid-gray' }, icon('schedule', 'text-[14px]'), h('span', null, DEMO_ADVISOR.officeHours))
      )
    );

    // ---- Cột phải: biểu mẫu hồ sơ ----
    const personalCard = h(
      'div',
      { className: CARD },
      h(SectionHeader, {
        iconName: 'id_card',
        title: 'Thông tin cá nhân & Liên hệ',
        subtitle: 'Thông tin phục vụ liên lạc trực tiếp và lưu trữ học bạ',
        group: 'Nhóm 01'
      }),
      h(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-2 gap-space-md' },
        h(
          Field,
          { label: 'Mã sinh viên', htmlFor: 'student-id', aside: 'Cố định', hint: 'Được cấp cố định bởi Phòng Đào tạo HaUI' },
          h(LockedInput, { id: 'student-id', value: profile.studentCode })
        ),
        h(
          Field,
          { label: 'Họ và tên', htmlFor: 'student-fullname', error: fieldErrors.fullName, hint: 'Khớp chính xác với thẻ CCCD gắn chip' },
          h('input', {
            className: inputClass('fullName'),
            id: 'student-fullname',
            type: 'text',
            value: form.fullName,
            'aria-invalid': fieldErrors.fullName ? 'true' : undefined,
            onChange: (e) => updateField('fullName', e.target.value)
          })
        ),
        h(
          Field,
          { label: 'Ngày sinh', htmlFor: 'student-dob', hint: 'Định dạng Ngày/Tháng/Năm' },
          h('input', {
            className: inputClass('dob'),
            id: 'student-dob',
            type: 'date',
            value: form.dob,
            onChange: (e) => updateField('dob', e.target.value)
          })
        ),
        h(
          Field,
          { label: 'Giới tính', hint: 'Thông tin hồ sơ bảo hiểm y tế' },
          h(SegmentedChoice, {
            name: 'gender',
            columns: 'grid-cols-3',
            options: GENDER_OPTIONS.map((g) => ({ value: g, label: g })),
            value: form.gender,
            onChange: (value) => updateField('gender', value)
          })
        ),
        h(
          Field,
          { label: 'Email trường cấp', htmlFor: 'university-email', aside: 'Office 365', hint: 'Dùng để nhận thông báo đào tạo và xác thực' },
          h(LockedInput, { id: 'university-email', type: 'email', value: profile.universityEmail })
        ),
        h(
          Field,
          {
            label: 'Email cá nhân',
            htmlFor: 'personal-email',
            error: fieldErrors.personalEmail,
            hint: 'Nhận thông báo khẩn cấp và kết nối tuyển dụng'
          },
          h('input', {
            className: inputClass('personalEmail'),
            id: 'personal-email',
            type: 'email',
            value: form.personalEmail,
            'aria-invalid': fieldErrors.personalEmail ? 'true' : undefined,
            onChange: (e) => updateField('personalEmail', e.target.value)
          })
        ),
        h(
          Field,
          { label: 'Số điện thoại', htmlFor: 'student-phone', error: fieldErrors.phone, hint: 'Số di động đăng ký nhận mã OTP' },
          h('input', {
            className: inputClass('phone'),
            id: 'student-phone',
            type: 'tel',
            value: form.phone,
            'aria-invalid': fieldErrors.phone ? 'true' : undefined,
            onChange: (e) => updateField('phone', e.target.value)
          })
        ),
        h(
          Field,
          { label: 'Địa chỉ liên hệ / Quê quán', htmlFor: 'student-address', hint: 'Địa chỉ thường trú theo sổ hộ khẩu/CCCD' },
          h('input', {
            className: inputClass('address'),
            id: 'student-address',
            type: 'text',
            value: form.address,
            onChange: (e) => updateField('address', e.target.value)
          })
        )
      )
    );

    const programCard = h(
      'div',
      { className: CARD },
      h(SectionHeader, {
        iconName: 'account_tree',
        title: 'Thông tin chương trình đào tạo & Ngành học',
        subtitle: `Cấu trúc quy chuẩn của ${getCohortLabel(profile.cohort)} - Trường Đại học Công nghiệp Hà Nội`,
        group: 'Nhóm 02'
      }),
      h(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-2 gap-space-md' },
        h(Field, { label: 'Cơ sở đào tạo', htmlFor: 'campus', wide: true }, h(LockedInput, { id: 'campus', value: DEMO_CAMPUS, iconName: 'apartment' })),
        h(Field, { label: 'Khoa / Viện đào tạo', htmlFor: 'faculty' }, h('input', { className: INPUT_LOCKED, id: 'faculty', readOnly: true, type: 'text', value: profile.faculty, title: profile.faculty })),
        h(
          Field,
          { label: 'Ngành đào tạo & Mã ngành', htmlFor: 'major' },
          h('input', {
            className: INPUT_LOCKED,
            id: 'major',
            readOnly: true,
            type: 'text',
            value: `${profile.majorName} (Mã ngành: ${profile.majorCode})`,
            title: `${profile.majorName} (Mã ngành: ${profile.majorCode})`
          })
        ),
        h(Field, { label: 'Khóa học', htmlFor: 'cohort' }, h('input', { className: INPUT_LOCKED, id: 'cohort', readOnly: true, type: 'text', value: profile.cohort })),
        h(
          Field,
          { label: 'Lớp sinh hoạt hành chính', htmlFor: 'class-name' },
          h('input', {
            className: inputClass('className'),
            id: 'class-name',
            type: 'text',
            value: form.className,
            onChange: (e) => updateField('className', e.target.value)
          })
        ),
        h(
          Field,
          {
            label: 'Chuyên ngành định hướng',
            htmlFor: 'track-direction',
            wide: true,
            hint: 'Định hướng này quyết định các nhóm học phần tự chọn khuyến nghị trên Cây môn học và AI Advisor'
          },
          h(
            'select',
            {
              className: `${inputClass('track')} cursor-pointer`,
              id: 'track-direction',
              value: form.track,
              onChange: (e) => updateField('track', e.target.value)
            },
            TRACK_OPTIONS.map((o) => h('option', { key: o.value, value: o.value }, o.label))
          )
        ),
        h(
          Field,
          { label: 'Chương trình đào tạo (CTĐT)', htmlFor: 'curriculum', hint: DEMO_PROGRAM.note },
          h('input', {
            className: INPUT_LOCKED,
            id: 'curriculum',
            readOnly: true,
            type: 'text',
            value: `${profile.totalCreditsRequired} Tín chỉ (${DEMO_PROGRAM.type})`
          })
        ),
        h(
          Field,
          { label: 'Cố vấn học tập chủ nhiệm', htmlFor: 'advisor', hint: DEMO_ADVISOR.changeNote },
          h('input', {
            className: INPUT_LOCKED,
            id: 'advisor',
            readOnly: true,
            type: 'text',
            value: `${DEMO_ADVISOR.name} (${DEMO_ADVISOR.email})`
          })
        )
      )
    );

    const goalsCard = h(
      'div',
      { className: CARD },
      h(SectionHeader, {
        iconName: 'flag',
        title: 'Mục tiêu & Tùy chọn học tập cá nhân',
        subtitle: 'AI và công cụ học vụ sẽ dựa vào đây để tối ưu hóa lộ trình',
        group: 'Nhóm 03'
      }),
      h(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-2 gap-space-md' },
        h(
          Field,
          {
            label: 'Mục tiêu CPA tốt nghiệp mong muốn',
            htmlFor: 'target-cpa',
            hint: profile.cpa == null ? 'CPA tích lũy hiện tại: chưa có dữ liệu (cần nhập bảng điểm)' : `CPA tích lũy hiện tại: ${formatScore(profile.cpa)} / 4.00`
          },
          h(
            'select',
            {
              className: `${inputClass('targetCpa')} cursor-pointer`,
              id: 'target-cpa',
              value: form.targetCpa,
              onChange: (e) => updateField('targetCpa', e.target.value)
            },
            TARGET_CPA_OPTIONS.map((o) => h('option', { key: o.value, value: o.value }, o.label))
          )
        ),
        h(
          Field,
          { label: 'Tiến độ mong muốn', hint: paceOption.detail },
          h(SegmentedChoice, {
            name: 'graduation-pace',
            columns: 'grid-cols-2',
            options: PACE_OPTIONS,
            value: form.graduationPace,
            onChange: (value) => updateField('graduationPace', value)
          })
        ),
        h(
          Field,
          {
            label: 'Định hướng chuyên ngành hẹp',
            htmlFor: 'specialization',
            wide: true,
            hint: 'Dùng để ưu tiên học phần tự chọn khi Study Planner và AI Advisor đề xuất lộ trình'
          },
          h('input', {
            className: inputClass('specialization'),
            id: 'specialization',
            type: 'text',
            value: form.specialization,
            onChange: (e) => updateField('specialization', e.target.value)
          })
        )
      )
    );

    const noticeCard = h(
      'div',
      { className: 'bg-surface-alt border border-hairline rounded-[24px] p-space-lg flex items-start gap-space-md shadow-sm' },
      icon('info', 'text-ink text-[24px] shrink-0 mt-0.5'),
      h(
        'div',
        { className: 'flex flex-col gap-1 min-w-0' },
        h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, 'Lưu ý về quy chế cập nhật dữ liệu'),
        h(
          'p',
          { className: 'font-body text-body text-mid-gray leading-relaxed' },
          'Dữ liệu này được lưu trữ cục bộ phục vụ việc tư vấn môn học, tự động xếp lịch và tính toán mô phỏng What-if trên HAUI ADVISOR. Để thay đổi các thông tin định danh pháp lý (Họ tên, Ngày sinh, CCCD, Điểm thi), sinh viên vui lòng liên hệ trực tiếp ',
          h('span', { className: 'text-ink font-medium' }, 'Phòng Đào tạo HaUI (Tầng 1, Nhà A1)'),
          ' hoặc cổng quản trị ',
          h('span', { className: 'underline text-ink' }, 'sv.haui.edu.vn'),
          '.'
        )
      )
    );

    const saveBar = h(
      'div',
      {
        className:
          'bg-paper border border-hairline rounded-[24px] p-space-md lg:p-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md shadow-sm'
      },
      h(
        'div',
        { className: 'flex items-center gap-space-sm text-mid-gray font-caption text-caption min-w-0' },
        h(
          'span',
          {
            className:
              'inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-full text-ink font-label text-label border border-hairline'
          },
          h('span', { className: `w-2 h-2 rounded-full shrink-0 ${isDirty ? 'bg-ember' : 'bg-ink'}` }),
          isDirty ? ` ${pendingChanges.length} thay đổi chưa lưu` : ' Dữ liệu lưu trữ cục bộ trên trình duyệt'
        ),
        h('span', { className: 'hidden md:inline' }, `• Đồng bộ lần cuối: ${formatSyncTime(savedAt || loadedAt)}`)
      ),
      h(
        'div',
        { className: 'flex items-center gap-space-sm w-full sm:w-auto justify-end' },
        h('button', { className: `${BTN_SECONDARY} px-5`, type: 'button', onClick: handleCancelChanges }, 'Hủy bỏ'),
        h('button', { className: `${BTN_PRIMARY} px-6`, type: 'submit' }, icon('save', 'text-[18px]'), h('span', null, 'Lưu thay đổi'))
      )
    );

    return h(
      'div',
      { className: 'grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start' },
      h('aside', { className: 'lg:col-span-4 flex flex-col gap-space-lg' }, profileCard, metricsCard, planCard, advisorCard),
      h(
        'section',
        { className: 'lg:col-span-8 flex flex-col gap-space-xl', 'aria-label': 'Biểu mẫu hồ sơ sinh viên' },
        h(
          'form',
          { className: 'flex flex-col gap-space-xl', id: 'student-profile-form', noValidate: true, onSubmit: handleRequestSave },
          personalCard,
          programCard,
          goalsCard,
          noticeCard,
          saveBar
        )
      )
    );
  }

  // ----- Hộp thoại xác nhận lưu -----
  const confirmModal = confirmOpen
    ? h(
        'div',
        {
          className: 'fixed inset-0 z-50 bg-ink/40 backdrop-blur-xl flex items-center justify-center p-space-md',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'profile-confirm-title',
          onClick: (e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          },
          onKeyDown: (e) => {
            if (e.key === 'Escape') setConfirmOpen(false);
          }
        },
        h(
          'div',
          { className: 'bg-paper border border-hairline rounded-[24px] max-w-md w-full p-space-lg shadow-xl flex flex-col gap-space-md' },
          h(
            'div',
            { className: 'flex items-center gap-space-sm' },
            h(
              'div',
              { className: 'w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0' },
              icon('help_outline', 'text-[22px] text-ink')
            ),
            h(
              'div',
              { className: 'flex flex-col' },
              h('h3', { className: 'font-subheading text-subheading text-ink font-semibold', id: 'profile-confirm-title' }, 'Xác nhận lưu thay đổi'),
              h('span', { className: HINT }, 'Cập nhật hồ sơ sinh viên cục bộ')
            )
          ),
          h(
            'p',
            { className: 'font-body text-body text-mid-gray leading-relaxed' },
            'Bạn có chắc chắn muốn lưu các thông tin hiệu chỉnh này? Dữ liệu này sẽ được dùng cho mô phỏng tiến độ và kế hoạch học tập cá nhân.'
          ),
          pendingChanges.length > 0
            ? h(
                'div',
                { className: 'flex flex-wrap gap-1.5' },
                pendingChanges.map((field) =>
                  h(
                    'span',
                    {
                      key: field,
                      className:
                        'inline-flex items-center px-2.5 py-0.5 rounded-full font-label text-label bg-canvas text-on-surface-variant border border-hairline'
                    },
                    FIELD_LABELS[field]
                  )
                )
              )
            : null,
          h(
            'div',
            { className: 'flex items-center justify-end gap-space-sm pt-2' },
            h('button', { className: BTN_SECONDARY, type: 'button', onClick: () => setConfirmOpen(false) }, 'Xem lại'),
            h(
              'button',
              { className: BTN_PRIMARY, type: 'button', onClick: handleConfirmSave, autoFocus: true },
              icon('check', 'text-[16px]'),
              h('span', null, 'Xác nhận lưu')
            )
          )
        )
      )
    : null;

  // ----- Thông báo nổi -----
  const toastIcon = toast?.tone === 'error' ? 'error' : toast?.tone === 'info' ? 'info' : 'task_alt';
  const toastNode = toast
    ? h(
        'div',
        { className: 'fixed bottom-6 right-6 z-50 transition-all duration-300', role: 'status', 'aria-live': 'polite' },
        h(
          'div',
          { className: 'bg-ink text-paper px-space-md py-3 rounded-full shadow-xl flex items-center gap-space-sm border border-hairline' },
          icon(toastIcon, `text-[20px] ${toast.tone === 'error' ? 'text-ember' : 'text-paper'}`),
          h('span', { className: 'font-body-medium text-body-medium text-paper' }, toast.message),
          h(
            'button',
            { className: 'ml-2 text-mid-gray hover:text-paper', type: 'button', onClick: () => setToast(null), 'aria-label': 'Đóng thông báo' },
            icon('close', 'text-[16px]')
          )
        )
      )
    : null;

  // ----- Điều khiển dev (portal vào panel công cụ dev, ẩn khi production) -----
  const viewState = loading ? 'loading' : error ? 'error' : profile ? 'loaded' : 'empty';
  const devButton = (key, label, onClick) =>
    h(
      'button',
      {
        key,
        type: 'button',
        onClick,
        className: `${DEV_BTN} ${viewState === key ? 'bg-ink text-paper border-ink' : 'border-hairline text-ink hover:bg-canvas'}`
      },
      label
    );
  const devControls = ui?.DevSlot
    ? h(
        ui.DevSlot,
        { title: 'Hồ sơ sinh viên' },
        h(
          'div',
          { className: 'flex flex-wrap gap-space-xs' },
          devButton('loaded', 'Loaded', handleFetchProfile),
          devButton('loading', 'Loading', () => {
            requestIdRef.current += 1;
            setError(null);
            setLoading(true);
          }),
          devButton('empty', 'Empty', () => {
            requestIdRef.current += 1;
            setLoading(false);
            setError(null);
            setProfile(null);
          }),
          devButton('error', 'Error', () => {
            requestIdRef.current += 1;
            setLoading(false);
            setError({
              code: 'ERR_PROFILE',
              message: 'Mô phỏng lỗi máy chủ.',
              details: ['Kiểm tra kết nối tới Backend Spring Boot hoặc mock mode.']
            });
          })
        ),
        h(
          'button',
          {
            type: 'button',
            onClick: handleResetLocalData,
            className: `${DEV_BTN} border-hairline text-ink hover:bg-canvas self-start gap-space-xs`
          },
          icon('delete_sweep', 'text-[14px]'),
          'Xóa hiệu chỉnh cục bộ đã lưu'
        )
      )
    : null;

  return h(
    'div',
    { className: 'flex flex-col w-full' },
    h('div', { className: 'w-full max-w-7xl mx-auto px-space-md lg:px-space-xl py-space-lg flex flex-col gap-space-xl' }, headerSection, content),
    confirmModal,
    toastNode,
    devControls
  );
}

export default StudentProfilePage;
