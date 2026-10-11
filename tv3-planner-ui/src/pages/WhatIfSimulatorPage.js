import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { plannerStore } from '../services/plannerStore.js';

const h = React.createElement;

/**
 * Màn hình 6, 7, 8: Giả lập Điểm số & Tối ưu Học cải thiện (What-if Simulator) — TV3
 * Dựng theo prototype `what_if_mo_phong_diem/code.html` (route `/what-if`).
 *
 * Thực hiện yêu cầu nghiệp vụ:
 * 1. Hỗ trợ 4 kịch bản (bộ chọn chế độ dạng segmented control): Giả lập điểm kỳ tới, Xếp hạng ROI môn cải thiện,
 *    Tính điểm mục tiêu ngược và Lộ trình học vượt 3.5 năm.
 * 2. Mô phỏng tức thời trong trình duyệt (sandbox): thay đổi điểm chữ / khóa môn / thêm môn giả lập / chọn môn
 *    học cải thiện cập nhật ngay 4 thẻ chỉ số, biểu đồ tiến trình CPA, độ khả thi và lời khuyên.
 *    CPA & tín chỉ tích lũy hiện tại lấy từ `api.academic.getStatus()` (tải lại khi đổi tài khoản phiên qua
 *    `api.subscribe`; CPA null = chưa có bảng điểm được giữ nguyên, hiển thị "—").
 *    Học kỳ và danh sách môn dự kiến lấy từ kế hoạch hiện hành trong plannerStore.
 * 3. Nút "Tính toán kết quả" gọi API mô phỏng qua `api.simulation` (simulateGrades / rankRetake /
 *    calculateTargetGrades) theo chế độ đang chọn; không có API thì tính cục bộ cùng công thức sandbox.
 * 4. Nút "Áp dụng vào Kế hoạch học tập": đóng gói kết quả mô phỏng và nạp sang Study Planner
 *    (`plannerStore.setIncomingProposal` — phát sự kiện `haui:planner:proposal` — rồi `acceptProposal`).
 * 5. Lưu / áp dụng / xóa kịch bản trong phiên làm việc, xuất báo cáo dạng văn bản.
 * 6. Đủ trạng thái Loading / Error / Empty cho kết quả; nút giả lập Empty/Error nằm trong panel công cụ dev (`ui.DevSlot`).
 *
 * Dữ liệu chưa có store/API cung cấp (lịch sử CPA từng kỳ, môn đề xuất cải thiện ban đầu, các kịch bản mẫu) dùng
 * hằng số demo `DEMO_*` bên dưới, giữ nguyên nội dung prototype. Khi không có API học vụ (hoặc tải lỗi), CPA 3.18 và
 * lịch sử Kỳ 1-6 của prototype cùng số tín chỉ trong plannerStore được dùng làm số liệu mẫu.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2 (dùng `ui.DevSlot`)
 */

// ---------------------------------------------------------------------------
// Cấu hình chế độ mô phỏng
// ---------------------------------------------------------------------------

/**
 * 4 Kịch bản mô phỏng What-if chuẩn theo UI Flow (Màn hình 6, 7, 8) & Học vượt 3.5 năm
 */
const WHAT_IF_SCENARIOS = Object.freeze([
  {
    id: 'grades',
    label: 'Giả lập điểm kỳ tới',
    icon: 'tune',
    name: 'Màn 6: Giả lập điểm kỳ tới',
    description: 'Dự báo GPA học kỳ và biến thiên CPA tích lũy khi thay đổi điểm số các môn dự kiến.'
  },
  {
    id: 'retake',
    label: 'Tối ưu học cải thiện',
    icon: 'leaderboard',
    name: 'Màn 7: Xếp hạng tối ưu học cải thiện (ROI)',
    description: 'Xếp hạng các môn điểm D/D+/C theo độ nhạy tăng CPA (ROI) trên mỗi tín chỉ đăng ký (BR-06).'
  },
  {
    id: 'target',
    label: 'Điểm mục tiêu ngược',
    icon: 'flag',
    name: 'Màn 8: Tính điểm mục tiêu ngược',
    description: 'Tính toán phân bổ điểm số tối thiểu cần đạt trong các kỳ còn lại để đạt ngưỡng CPA mục tiêu (≥ 3.20).'
  },
  {
    id: 'accelerate',
    label: 'Học vượt 3.5 năm',
    icon: 'fast_forward',
    name: 'Học vượt: Rút ngắn 3.5 năm tốt nghiệp',
    description: 'Phân bổ học phần vào kỳ hè (tối đa 8 TC theo quy chế HaUI) để tốt nghiệp sớm 1 học kỳ.'
  }
]);

/** Thang điểm chữ → hệ 4 (quy chế đào tạo tín chỉ HaUI) */
const GRADE_SCALE = Object.freeze([
  { letter: 'A', point: 4.0 },
  { letter: 'B+', point: 3.5 },
  { letter: 'B', point: 3.0 },
  { letter: 'C+', point: 2.5 },
  { letter: 'C', point: 2.0 },
  { letter: 'D+', point: 1.5 },
  { letter: 'D', point: 1.0 },
  { letter: 'F', point: 0.0 }
]);

/** Ngưỡng xếp loại học lực theo CPA */
const ACADEMIC_RANKS = Object.freeze([
  { min: 3.6, label: 'Xuất sắc' },
  { min: 3.2, label: 'Giỏi' },
  { min: 2.5, label: 'Khá' },
  { min: 2.0, label: 'Trung bình' },
  { min: 0, label: 'Yếu' }
]);

/** Mốc mục tiêu nhanh cho chế độ tính điểm ngược */
const TARGET_PRESETS = Object.freeze([
  { value: 2.5, label: 'Khá' },
  { value: 3.2, label: 'Giỏi' },
  { value: 3.6, label: 'Xuất sắc' }
]);

const HONOR_THRESHOLD = 3.2; // Ngưỡng Giỏi trên biểu đồ
const SUMMER_MAX_CREDITS = 8; // Trần tín chỉ học kỳ phụ (quy chế HaUI)
const MAX_RETAKE_SUGGESTIONS = 5;

// ---------------------------------------------------------------------------
// Hằng số demo (dữ liệu prototype — chưa có store/API cung cấp)
// ---------------------------------------------------------------------------

/** Lịch sử CPA tích lũy Kỳ 1 → Kỳ 6 (prototype) — chỉ dùng khi không có API học vụ. Phần tử cuối là CPA hiện tại mẫu. */
const DEMO_CPA_HISTORY = Object.freeze([
  { label: 'Kỳ 1', cpa: 3.02 },
  { label: 'Kỳ 2', cpa: 3.08 },
  { label: 'Kỳ 3', cpa: 3.12 },
  { label: 'Kỳ 4', cpa: 3.05 },
  { label: 'Kỳ 5', cpa: 3.14 },
  { label: 'Kỳ 6', cpa: 3.18 }
]);

const DEMO_CURRENT_CPA = DEMO_CPA_HISTORY[DEMO_CPA_HISTORY.length - 1].cpa;

/** Môn đã hoàn thành có điểm C/D đề xuất học cải thiện (prototype) — thay bằng xếp hạng ROI từ API khi tính toán */
const DEMO_RETAKE_CANDIDATES = Object.freeze([
  {
    courseCode: 'IT6008',
    courseName: 'Mạng máy tính cơ sở',
    credits: 3,
    originSemester: 'Kỳ 4',
    currentGrade: 'C',
    targetGrade: 'A',
    rank: 1,
    badge: 'Đề xuất tối ưu',
    rationale: 'Môn 3 tín chỉ điểm C, cải thiện lên A thay thế hoàn toàn điểm cũ trong CPA.',
    selected: true
  }
]);

/** Kịch bản mẫu trong danh sách "Kịch bản đã lưu" (CPA dự kiến được tính lại trực tiếp) */
const DEMO_SAVED_SCENARIOS = Object.freeze([
  {
    id: 'demo-1',
    name: 'Kịch bản 1: Tối ưu hóa Kỳ 7 (Lên bằng Giỏi)',
    note: null,
    snapshot: { semesterCode: null, grades: null, gradeAll: null, customCourses: [], retakes: DEMO_RETAKE_CANDIDATES, targetCpa: null }
  },
  {
    id: 'demo-2',
    name: 'Kịch bản 2: Giữ nguyên kế hoạch (Không học cải thiện)',
    note: null,
    snapshot: {
      semesterCode: null,
      grades: null,
      gradeAll: null,
      customCourses: [],
      retakes: DEMO_RETAKE_CANDIDATES.map((c) => ({ ...c, selected: false })),
      targetCpa: null
    }
  },
  {
    id: 'demo-3',
    name: 'Kịch bản 3: Phương án an toàn (Giữ vững CPA hiện tại)',
    note: 'Điểm B toàn bộ các môn còn lại',
    snapshot: {
      semesterCode: null,
      grades: null,
      gradeAll: 'B',
      customCourses: [],
      retakes: DEMO_RETAKE_CANDIDATES.map((c) => ({ ...c, selected: false })),
      targetCpa: null
    }
  }
]);

// ---------------------------------------------------------------------------
// Hàm thuần: điểm số, học kỳ, công thức mô phỏng
// ---------------------------------------------------------------------------

const clone = (value) => JSON.parse(JSON.stringify(value));
const sumBy = (items, fn) => (items || []).reduce((sum, item) => sum + (Number(fn(item)) || 0), 0);
const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const fmt2 = (n) => (Number.isFinite(Number(n)) && n !== null && n !== '' ? Number(n).toFixed(2) : '—');
const fmtSigned = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}`;

const gradePoint = (letter) => GRADE_SCALE.find((g) => g.letter === letter)?.point ?? 0;
const formatGrade = (letter) => `${letter} (${gradePoint(letter).toFixed(1)})`;
const letterOfPoint = (point) => GRADE_SCALE.find((g) => Math.abs(g.point - point) < 1e-9)?.letter || '';

/** 'B+ (3.5)' | 'B+' | 'A (8.5)' → 'B+' */
function parseGradeLetter(text) {
  const match = /^\s*([A-F]\+?)/.exec(String(text || ''));
  return match && GRADE_SCALE.some((g) => g.letter === match[1]) ? match[1] : null;
}

function rankOf(cpa) {
  const value = round2(Number(cpa) || 0);
  return ACADEMIC_RANKS.find((r) => value >= r.min) || ACADEMIC_RANKS[ACADEMIC_RANKS.length - 1];
}

const findSemester = (plan, semesterCode) => (plan?.semesters || []).find((s) => s.semesterCode === semesterCode) || null;
const isSummerSemester = (sem) => String(sem?.semesterCode || '').includes('SUMMER');

/** 'Học kỳ 1 (2026 - 2027) — Kỳ 7' → 'Kỳ 7'; học kỳ phụ → 'Kỳ hè' */
function semesterShortName(sem) {
  if (!sem) return 'học kỳ dự phóng';
  if (isSummerSemester(sem)) return 'Kỳ hè';
  const match = /Kỳ\s*(\d+)\s*$/.exec(sem.semesterName || '');
  return match ? `Kỳ ${match[1]}` : sem.semesterName || sem.semesterCode;
}

const semesterCredits = (sem) => sumBy(sem?.courses, (c) => c.credits);
const semesterPlanPoints = (sem) =>
  sumBy(sem?.courses, (c) => (Number(c.credits) || 0) * gradePoint(parseGradeLetter(c.targetGrade) || 'B'));

/** Dựng danh sách môn mô phỏng từ học kỳ của kế hoạch (điểm mặc định = điểm mục tiêu trong kế hoạch) */
function buildSimCourses(plan, semesterCode, { grades = null, gradeAll = null, customCourses = [] } = {}) {
  const sem = findSemester(plan, semesterCode);
  const base = (sem?.courses || []).map((c) => {
    const defaultGrade = parseGradeLetter(c.targetGrade) || 'B';
    return {
      courseCode: c.courseCode,
      courseName: c.courseName,
      credits: Number(c.credits) || 0,
      courseType: c.courseType || '',
      defaultGrade,
      expectedGrade: gradeAll || grades?.[c.courseCode] || defaultGrade,
      locked: false,
      custom: false
    };
  });
  return [...base, ...clone(customCourses || [])];
}

function retakeDeltaOf(candidate) {
  return (Number(candidate.credits) || 0) * (gradePoint(candidate.targetGrade) - gradePoint(candidate.currentGrade));
}

/**
 * Công thức mô phỏng sandbox (giống prototype): CPA mới = (điểm tích lũy hiện tại + Δ cải thiện + điểm kỳ mô phỏng)
 * / (tín chỉ tích lũy + tín chỉ kỳ mô phỏng). Các học kỳ khác của kế hoạch dùng điểm mục tiêu đã lập.
 *
 * @param {Object} args
 * @param {{cpa: number|null, credits: number, totalRequired: number}} args.base - CPA & tín chỉ tích lũy hiện tại
 *   (CPA null = chưa có bảng điểm: tính như sinh viên chưa tích lũy tín chỉ nào)
 */
function computeScenario({ base, plan, semesterCode, courses, retakes, targetCpa }) {
  const baseCpa = base?.cpa ?? null;
  const earned = baseCpa === null ? 0 : Number(base?.credits) || 0;
  const basePoints = earned * (baseCpa ?? 0);
  const simCredits = sumBy(courses, (c) => c.credits);
  const simPoints = sumBy(courses, (c) => (Number(c.credits) || 0) * gradePoint(c.expectedGrade));
  const selectedRetakes = baseCpa === null ? [] : (retakes || []).filter((r) => r.selected);
  const retakeDelta = sumBy(selectedRetakes, retakeDeltaOf);
  const semesterGpa = simCredits > 0 ? simPoints / simCredits : null;

  let credits = earned;
  let points = basePoints;
  let simCpa = null;
  let creditsAtSim = earned + simCredits;
  let pointsAtSim = basePoints + retakeDelta + simPoints;
  const timeline = [];

  for (const sem of plan?.semesters || []) {
    const isSim = sem.semesterCode === semesterCode;
    if (isSim) {
      credits += simCredits;
      points += simPoints + retakeDelta;
    } else {
      credits += semesterCredits(sem);
      points += semesterPlanPoints(sem);
    }
    const cpa = credits > 0 ? points / credits : null;
    timeline.push({ semesterCode: sem.semesterCode, label: semesterShortName(sem), cpa, isSim });
    if (isSim) {
      simCpa = cpa;
      creditsAtSim = credits;
      pointsAtSim = points;
    }
  }

  if (simCpa === null) {
    simCpa = creditsAtSim > 0 ? pointsAtSim / creditsAtSim : null;
  }

  const finalCredits = Math.max(credits, creditsAtSim);
  const finalPoints = timeline.length ? points : pointsAtSim;
  const finalCpa = finalCredits > 0 ? finalPoints / finalCredits : null;
  // Mốc tốt nghiệp: tổng tín chỉ chuẩn của CTĐT (hoặc hết kế hoạch nếu kế hoạch dài hơn)
  const graduationCredits = Math.max(Number(base?.totalRequired) || 0, finalCredits);
  const remainingCredits = graduationCredits - earned;
  const target = Number(targetCpa) || HONOR_THRESHOLD;

  // GPA trung bình tối thiểu trên toàn bộ tín chỉ còn lại để đạt mục tiêu (đã tính môn cải thiện đang chọn)
  const reqAll = remainingCredits > 0 ? (target * graduationCredits - basePoints - retakeDelta) / remainingCredits : null;
  // GPA cần đạt ở các học kỳ sau kỳ mô phỏng
  const creditsAfter = graduationCredits - creditsAtSim;
  const reqAfter = creditsAfter > 0 ? (target * graduationCredits - pointsAtSim) / creditsAfter : null;

  // Độ khả thi: áp lực học tập = mức GPA cao nhất phải giữ (kỳ mô phỏng hoặc các kỳ còn lại) so với năng lực hiện tại
  // (chưa có CPA thì lấy mức B 3.0 làm năng lực tham chiếu)
  let reachable;
  let pressure = semesterGpa ?? 0;
  if (reqAfter !== null) {
    reachable = reqAfter <= 4 + 1e-9;
    pressure = Math.max(pressure, reqAfter);
  } else {
    reachable = simCpa !== null && round2(simCpa) >= round2(target);
  }
  const ability = baseCpa ?? 3.0;
  const feasibility = reachable ? clamp(Math.round(95 - Math.max(0, pressure - ability) * 75), 3, 99) : 0;

  return {
    baseCpa,
    earned,
    basePoints,
    simCredits,
    simPoints,
    semesterGpa,
    retakeDelta,
    selectedRetakes,
    simCpa,
    creditsAtSim,
    pointsAtSim,
    finalCpa,
    finalCredits,
    graduationCredits,
    remainingCredits,
    target,
    reqAll,
    reqAfter,
    feasibility,
    reachable,
    timeline
  };
}

function feasibilityLabel(pct) {
  if (pct >= 80) return 'Khả thi cao';
  if (pct >= 60) return 'Khả thi';
  if (pct >= 40) return 'Cân bằng';
  if (pct >= 20) return 'Nhiều áp lực';
  if (pct > 0) return 'Khó khả thi';
  return 'Không khả thi';
}

/** Phân bổ điểm tối thiểu theo GPA trung bình cần đạt */
function allocationSummary(req) {
  if (req === null || req === undefined) return 'Kế hoạch không còn tín chỉ nào để phân bổ điểm.';
  if (req <= 0) return 'Mục tiêu đã được đảm bảo — chỉ cần hoàn thành (đạt) các học phần còn lại.';
  if (req > 4 + 1e-9) {
    return `Cần GPA trung bình ${req.toFixed(2)} > 4.00 trên các tín chỉ còn lại — mục tiêu vượt quá khả năng, hãy giảm mục tiêu hoặc bổ sung môn học cải thiện.`;
  }
  const points = GRADE_SCALE.map((g) => g.point).sort((a, b) => a - b);
  const upper = points.find((p) => p >= req - 1e-9);
  const lower = [...points].reverse().find((p) => p < upper - 1e-9) ?? upper;
  if (Math.abs(upper - req) < 1e-9 || upper === lower) {
    return `Cần đạt tối thiểu ${formatGrade(letterOfPoint(upper))} ở toàn bộ các môn còn lại.`;
  }
  const upperShare = Math.ceil(((req - lower) / (upper - lower)) * 100);
  return `Cần tối thiểu ${upperShare}% tín chỉ đạt điểm ${formatGrade(letterOfPoint(upper))}, ${100 - upperShare}% còn lại đạt ${formatGrade(
    letterOfPoint(lower)
  )}, không có môn nào dưới ${letterOfPoint(lower)} (${lower.toFixed(1)}).`;
}

/** Chuẩn hóa một đề xuất cải thiện (API rankRetake hoặc demo) */
function normalizeCandidate(item, idx, previouslySelected) {
  const rank = Number(item.rank) || idx + 1;
  return {
    courseCode: item.courseCode,
    courseName: item.courseName,
    credits: Number(item.credits) || 0,
    originSemester: item.originSemester || item.semesterName || null,
    currentGrade: parseGradeLetter(item.currentGrade) || 'D',
    targetGrade: parseGradeLetter(item.targetGrade) || 'A',
    rank,
    badge: item.badge || null,
    rationale: item.rationale || '',
    serverGain: Number.isFinite(Number(item.potentialCpaGain)) ? Number(item.potentialCpaGain) : null,
    selected: previouslySelected.has(item.courseCode) || rank === 1
  };
}

/** Xếp hạng cục bộ theo ROI: độ tăng điểm trên mỗi tín chỉ, rồi tổng điểm tăng */
function rankCandidatesLocally(candidates) {
  return [...candidates]
    .sort((a, b) => {
      const roiDiff = gradePoint(b.targetGrade) - gradePoint(b.currentGrade) - (gradePoint(a.targetGrade) - gradePoint(a.currentGrade));
      return Math.abs(roiDiff) > 1e-9 ? roiDiff : retakeDeltaOf(b) - retakeDeltaOf(a);
    })
    .map((c, idx) => ({ ...c, rank: idx + 1 }));
}

const nowLabel = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// ---------------------------------------------------------------------------
// Mảnh giao diện dùng chung (Tailwind theo prototype)
// ---------------------------------------------------------------------------

const CARD = 'rounded-3xl bg-paper p-space-lg shadow-sm space-y-space-md';
const BTN_SOFT =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body-medium text-body-medium text-ink bg-canvas hover:bg-surface-variant transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_PRIMARY =
  'inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-body-medium text-body-medium text-paper bg-ink hover:bg-ink-soft transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed';
const PILL = 'px-2.5 py-1 rounded-full bg-canvas text-ink font-label text-label font-medium';
const DEV_BTN =
  'inline-flex items-center justify-center gap-space-xs px-space-md py-1.5 rounded-full border border-hairline font-label text-label text-ink hover:bg-canvas transition-colors';

const icon = (name, className = 'text-[18px]') =>
  h('span', { className: `material-symbols-outlined ${className}`, 'aria-hidden': 'true' }, name);
const strong = (text) => h('strong', { className: 'text-ink font-semibold' }, text);

function sectionHeader({ title, subtitle, right, bordered = false }) {
  return h(
    'div',
    {
      className: bordered
        ? 'flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-canvas'
        : 'flex items-center justify-between gap-space-sm'
    },
    h(
      'div',
      { className: 'space-y-0.5 min-w-0' },
      h('h2', { className: 'font-subheading text-subheading font-semibold text-ink' }, title),
      subtitle ? h('p', { className: 'font-caption text-caption text-mid-gray' }, subtitle) : null
    ),
    right || null
  );
}

/** Ô chỉ số nhỏ trong thẻ kết quả */
function statBlock(label, value, hint) {
  return h(
    'div',
    { className: 'p-space-md rounded-2xl bg-canvas space-y-1 min-w-0' },
    h('span', { className: 'font-caption text-caption text-mid-gray uppercase tracking-wider block' }, label),
    h('span', { className: 'font-subheading text-subheading font-semibold text-ink block' }, value),
    hint ? h('span', { className: 'font-caption text-caption text-mid-gray block' }, hint) : null
  );
}

/**
 * Biểu đồ tiến trình CPA (SVG thuần, đơn sắc theo prototype): đường liền = thực tế, đường đứt = kịch bản What-if.
 * Rê chuột lên từng điểm để xem giá trị.
 */
function renderProgressChart({ points, focusIndex, hoverIndex, onHover }) {
  const X0 = 45;
  const X1 = 430;
  const YT = 20;
  const YB = 140;
  const BASE_Y = 170;
  const n = points.length;
  const hi = 4.0;
  const lo = Math.min(2.5, Math.floor(Math.min(...points.map((p) => p.cpa)) * 2) / 2);
  const x = (i) => (n > 1 ? X0 + (i * (X1 - X0)) / (n - 1) : (X0 + X1) / 2);
  const y = (v) => YT + ((hi - clamp(v, lo, hi)) / (hi - lo)) * (YB - YT);

  const gridValues = [];
  for (let v = hi; v >= lo - 1e-9; v -= 0.5) gridValues.push(Number(v.toFixed(1)));

  const currentIdx = Math.max(0, points.findIndex((p) => p.kind === 'current'));
  const toPoints = (list, offset) => list.map((p, i) => `${x(i + offset).toFixed(1)},${y(p.cpa).toFixed(1)}`).join(' ');
  const actual = points.slice(0, currentIdx + 1);
  const projection = points.slice(currentIdx);
  const areaPoints =
    projection.length > 1
      ? `${toPoints(projection, currentIdx)} ${x(n - 1).toFixed(1)},${BASE_Y} ${x(currentIdx).toFixed(1)},${BASE_Y}`
      : '';

  const calloutIdx = hoverIndex ?? focusIndex;
  const callout = points[calloutIdx];
  const calloutX = callout ? clamp(x(calloutIdx) - 26, 0, 460 - 52) : 0;
  const calloutY = callout ? Math.max(0, y(callout.cpa) - 33) : 0;

  const dot = (p, i) => {
    const cx = x(i);
    const cy = y(p.cpa);
    if (p.kind === 'current') {
      return h('circle', { key: `dot-${i}`, cx, cy, r: 4.5, fill: '#0a0a0a', stroke: '#ffffff', strokeWidth: 2 });
    }
    if (p.kind === 'sim') {
      return h('circle', { key: `dot-${i}`, cx, cy, r: 5, fill: '#0a0a0a', stroke: '#ffffff', strokeWidth: 2.5 });
    }
    if (p.kind === 'projected') {
      return h('circle', { key: `dot-${i}`, cx, cy, r: 4, fill: '#ffffff', stroke: '#0a0a0a', strokeDasharray: '2 2', strokeWidth: 2 });
    }
    return h('circle', { key: `dot-${i}`, cx, cy, r: 3.5, fill: '#ffffff', stroke: '#0a0a0a', strokeWidth: 2 });
  };

  return h(
    'svg',
    {
      className: 'w-full h-auto overflow-visible',
      viewBox: '0 0 460 220',
      role: 'img',
      'aria-label': `Biểu đồ tiến trình CPA: ${points.map((p) => `${p.label} ${p.cpa.toFixed(2)}`).join(', ')}`
    },
    h(
      'defs',
      null,
      h(
        'linearGradient',
        { id: 'whatifSimulatedArea', x1: 0, x2: 0, y1: 0, y2: 1 },
        h('stop', { offset: '0%', stopColor: '#0a0a0a', stopOpacity: 0.08 }),
        h('stop', { offset: '100%', stopColor: '#0a0a0a', stopOpacity: 0 })
      )
    ),
    // Đường lưới tham chiếu
    gridValues.map((v) =>
      h(
        'g',
        { key: `grid-${v}` },
        h('line', { x1: 35, x2: 445, y1: y(v), y2: y(v), stroke: '#f0f0f0', strokeWidth: 1 }),
        h('text', { x: 5, y: y(v) + 4, fill: '#737373', fontSize: 10 }, v.toFixed(1))
      )
    ),
    // Ngưỡng Giỏi
    h('line', {
      x1: 35,
      x2: 445,
      y1: y(HONOR_THRESHOLD),
      y2: y(HONOR_THRESHOLD),
      stroke: '#e5e5e5',
      strokeDasharray: '3 3',
      strokeWidth: 1
    }),
    h(
      'text',
      {
        x: 445,
        y: (points[n - 1]?.cpa ?? 0) >= HONOR_THRESHOLD ? y(HONOR_THRESHOLD) + 11 : y(HONOR_THRESHOLD) - 4,
        fill: '#737373',
        fontSize: 9,
        fontWeight: 500,
        textAnchor: 'end'
      },
      `Ngưỡng Giỏi (${HONOR_THRESHOLD.toFixed(2)})`
    ),
    areaPoints ? h('polygon', { points: areaPoints, fill: 'url(#whatifSimulatedArea)' }) : null,
    h('polyline', {
      points: toPoints(actual, 0),
      fill: 'none',
      stroke: '#0a0a0a',
      strokeWidth: 2.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }),
    projection.length > 1
      ? h('polyline', {
          points: toPoints(projection, currentIdx),
          fill: 'none',
          stroke: '#0a0a0a',
          strokeWidth: 2.5,
          strokeDasharray: '4 4',
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        })
      : null,
    points.map(dot),
    // Nhãn giá trị tại điểm đang xem
    callout
      ? h(
          'g',
          { transform: `translate(${calloutX.toFixed(1)}, ${calloutY.toFixed(1)})`, pointerEvents: 'none' },
          h('rect', { x: 0, y: 0, width: 52, height: 20, rx: 10, fill: '#0a0a0a' }),
          h(
            'text',
            { x: 26, y: 14, fill: '#ffffff', fontSize: 11, fontWeight: 600, textAnchor: 'middle' },
            callout.cpa.toFixed(2)
          )
        )
      : null,
    // Nhãn trục X (2 dòng để tránh chồng chữ)
    points.map((p, i) => {
      const emphasized = p.kind === 'current' || p.kind === 'sim';
      return h(
        'g',
        { key: `label-${i}` },
        h(
          'text',
          { x: x(i), y: 195, fill: emphasized ? '#0a0a0a' : '#737373', fontSize: 11, fontWeight: emphasized ? 600 : 400, textAnchor: 'middle' },
          p.label
        ),
        p.sub
          ? h(
              'text',
              { x: x(i), y: 208, fill: emphasized ? '#0a0a0a' : '#737373', fontSize: 9, fontWeight: emphasized ? 600 : 400, textAnchor: 'middle' },
              p.sub
            )
          : null
      );
    }),
    // Vùng rê chuột (lớn hơn điểm dữ liệu)
    points.map((p, i) =>
      h(
        'circle',
        {
          key: `hit-${i}`,
          cx: x(i),
          cy: y(p.cpa),
          r: 14,
          fill: 'transparent',
          style: { cursor: 'pointer' },
          onMouseEnter: () => onHover(i),
          onMouseLeave: () => onHover(null)
        },
        h('title', null, `${p.label}${p.sub ? ` ${p.sub}` : ''}: CPA ${p.cpa.toFixed(2)}`)
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Trang
// ---------------------------------------------------------------------------

export function WhatIfSimulatorPage({ api, ui } = {}) {
  const DevSlot = ui?.DevSlot;

  // Kế hoạch hiện hành (nguồn tín chỉ, học kỳ, môn dự kiến)
  const [plan, setPlan] = useState(() => plannerStore.getPlan());
  useEffect(() => plannerStore.subscribe((state) => setPlan({ ...state.plan })), []);

  const defaultSemesterCode = plan?.semesters?.[0]?.semesterCode || null;
  const defaultTarget = Number(plan?.targetCpa ?? HONOR_THRESHOLD).toFixed(2);

  // Kịch bản đang chọn
  const [activeScenario, setActiveScenario] = useState('grades');

  // Tham số kịch bản 1: Giả lập điểm
  const [semesterCode, setSemesterCode] = useState(defaultSemesterCode);
  const [simCourses, setSimCourses] = useState(() => buildSimCourses(plan, defaultSemesterCode));
  const [retakeCandidates, setRetakeCandidates] = useState(() => clone(DEMO_RETAKE_CANDIDATES));

  // Tham số kịch bản 2, 3 & 4
  const [targetCpaInput, setTargetCpaInput] = useState(defaultTarget);
  const [maxRetakeCourses, setMaxRetakeCourses] = useState(3);
  const [enableSummerAccelerate, setEnableSummerAccelerate] = useState(true);

  // Trạng thái kết quả mô phỏng (giữ riêng theo từng chế độ)
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Biểu đồ & kịch bản đã lưu
  const [hoverIndex, setHoverIndex] = useState(null);
  const [savedScenarios, setSavedScenarios] = useState(() => clone(DEMO_SAVED_SCENARIOS));
  const [activeSavedId, setActiveSavedId] = useState('demo-1');
  const [manageScenarios, setManageScenarios] = useState(false);

  // Trạng thái học vụ hiện tại (CPA, tín chỉ tích lũy) từ API
  const hasAcademicApi = typeof api?.academic?.getStatus === 'function';
  const [academic, setAcademic] = useState(() => ({ state: hasAcademicApi ? 'loading' : 'none' }));
  const academicRequestRef = useRef(0);

  const loadAcademicStatus = useCallback(async () => {
    if (typeof api?.academic?.getStatus !== 'function') {
      setAcademic({ state: 'none' });
      return;
    }
    const requestId = ++academicRequestRef.current;
    setAcademic((prev) => ({ ...prev, state: 'loading' }));
    try {
      const status = await api.academic.getStatus();
      if (requestId !== academicRequestRef.current) return;
      const cpa = status?.cpa === null || status?.cpa === undefined || status?.cpa === '' ? null : Number(status.cpa);
      setAcademic({
        state: 'ready',
        cpa: Number.isFinite(cpa) ? cpa : null,
        credits: Number(status?.accumulatedCredits) || 0,
        totalRequired: Number(status?.totalCreditsRequired) || null
      });
    } catch (err) {
      if (requestId !== academicRequestRef.current) return;
      setAcademic({ state: 'error', message: err?.message || 'Không tải được trạng thái học vụ.' });
    }
  }, [api]);

  useEffect(() => {
    loadAcademicStatus();
  }, [loadAcademicStatus]);

  // Tải lại khi đổi tài khoản phiên (persona), CPA/tín chỉ của phiên hoặc chế độ API MOCK/LIVE
  useEffect(() => {
    if (typeof api?.subscribe !== 'function') return undefined;
    const keyOf = (config) => {
      const student = config?.sessionStudent || {};
      return [student.studentId, student.cpa, student.accumulatedCredits, config?.mockEnabled ? 'mock' : 'live'].join('|');
    };
    let lastKey = keyOf(api.getConfig?.());
    const unsubscribe = api.subscribe((config) => {
      const nextKey = keyOf(config);
      if (nextKey !== lastKey) {
        lastKey = nextKey;
        // Kết quả máy chủ và xếp hạng cải thiện thuộc về sinh viên trước — bỏ đi khi đổi tài khoản / dữ liệu
        setResults({});
        setError(null);
        setRetakeCandidates(clone(DEMO_RETAKE_CANDIDATES));
        loadAcademicStatus();
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [api, loadAcademicStatus]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((message, link = null) => {
    clearTimeout(toastTimer.current);
    setToast({ message, link });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Mục tiêu CPA hợp lệ (2.00 – 4.00), sai định dạng thì dùng mục tiêu của kế hoạch
  const parsedTarget = Number(targetCpaInput);
  const targetValid = targetCpaInput !== '' && Number.isFinite(parsedTarget) && parsedTarget >= 2 && parsedTarget <= 4;
  const targetCpa = targetValid ? parsedTarget : Number(plan?.targetCpa) || HONOR_THRESHOLD;

  const activeMeta = WHAT_IF_SCENARIOS.find((s) => s.id === activeScenario) || WHAT_IF_SCENARIOS[0];
  const simSemester = findSemester(plan, semesterCode);
  const semShort = semesterShortName(simSemester);
  const summerSemester = (plan?.semesters || []).find(isSummerSemester) || null;
  const summerCredits = Number(summerSemester?.totalCredits) || semesterCredits(summerSemester);
  const summerCourse = summerSemester?.courses?.[0] || null;

  // Mốc tính toán: dữ liệu học vụ thật từ API; không có API / lỗi / đang tải → số liệu mẫu của prototype
  const useApiBase = academic.state === 'ready';
  const baseLoading = academic.state === 'loading';
  const base = useMemo(
    () =>
      useApiBase
        ? {
            cpa: academic.cpa,
            credits: academic.credits,
            totalRequired: academic.totalRequired || Number(plan?.totalRequiredCredits) || 0
          }
        : {
            cpa: DEMO_CURRENT_CPA,
            credits: Number(plan?.totalEarnedCredits) || 0,
            totalRequired: Number(plan?.totalRequiredCredits) || 0
          },
    [useApiBase, academic, plan]
  );
  const currentCpa = base.cpa;
  // Chưa có bảng điểm (CPA null) thì không có môn đã hoàn thành để học cải thiện
  const visibleRetakes = currentCpa === null ? [] : retakeCandidates;

  // Tính toán sandbox tức thời
  const calc = useMemo(
    () => computeScenario({ base, plan, semesterCode, courses: simCourses, retakes: retakeCandidates, targetCpa }),
    [base, plan, semesterCode, simCourses, retakeCandidates, targetCpa]
  );

  const currentRank = currentCpa === null ? null : rankOf(currentCpa);
  const simRank = calc.simCpa === null ? null : rankOf(calc.simCpa);
  const targetRank = rankOf(targetCpa);
  const cpaDelta = currentCpa !== null && calc.simCpa !== null ? round2(calc.simCpa) - round2(currentCpa) : null;
  const targetGap = calc.simCpa !== null ? round2(calc.simCpa) - round2(targetCpa) : null;
  const totalRequired = calc.graduationCredits;

  // Môn cải thiện dùng cho lời khuyên: ưu tiên môn đang chọn, nếu không lấy đề xuất số 1
  const adviceCandidate = calc.selectedRetakes[0] || visibleRetakes[0] || null;
  const advicePct = useMemo(() => {
    if (!adviceCandidate || calc.simCredits <= 0) return 0;
    const otherDelta = calc.retakeDelta - (adviceCandidate.selected ? retakeDeltaOf(adviceCandidate) : 0);
    const pointsBefore = calc.pointsAtSim - calc.simPoints - calc.retakeDelta;
    const reqBase = (targetCpa * calc.creditsAtSim - pointsBefore - otherDelta) / calc.simCredits;
    if (reqBase <= 0) return 0;
    return Math.max(0, Math.round((retakeDeltaOf(adviceCandidate) / calc.simCredits / reqBase) * 100));
  }, [adviceCandidate, calc, targetCpa]);

  // Các điểm của biểu đồ: thực tế (số liệu mẫu Kỳ 1-6, hoặc CPA hiện tại từ API — API chưa trả lịch sử từng kỳ)
  // + các học kỳ của kế hoạch (kỳ mô phỏng & dự kiến)
  const chartPoints = useMemo(() => {
    let actual;
    if (!useApiBase) {
      actual = DEMO_CPA_HISTORY.map((p, i) => ({
        label: p.label,
        sub: i === DEMO_CPA_HISTORY.length - 1 ? '(Hiện tại)' : null,
        cpa: p.cpa,
        kind: i === DEMO_CPA_HISTORY.length - 1 ? 'current' : 'actual'
      }));
    } else {
      actual = currentCpa === null ? [] : [{ label: 'Hiện tại', sub: `(${base.credits} TC)`, cpa: currentCpa, kind: 'current' }];
    }
    const projected = calc.timeline
      .filter((t) => t.cpa !== null)
      .map((t) => ({
        label: t.label,
        sub: t.isSim ? '(Sim)' : '(Dự kiến)',
        cpa: t.cpa,
        kind: t.isSim ? 'sim' : 'projected'
      }));
    return [...actual, ...projected];
  }, [useApiBase, currentCpa, base.credits, calc.timeline]);
  const actualLegend = !useApiBase ? 'Thực tế (Kỳ 1-6)' : currentCpa === null ? 'Chưa có dữ liệu thực tế' : 'Thực tế (hiện tại)';
  const chartFocusIndex = Math.max(0, chartPoints.findIndex((p) => p.kind === 'sim'));
  const projectionLegend = useMemo(() => {
    const numbers = calc.timeline.map((t) => /Kỳ (\d+)/.exec(t.label)?.[1]).filter(Boolean).map(Number);
    const hasSummer = calc.timeline.some((t) => t.label === 'Kỳ hè');
    const range = numbers.length ? `Kỳ ${Math.min(...numbers)}${numbers.length > 1 ? `-${Math.max(...numbers)}` : ''}` : '';
    return `Kịch bản What-if (${[range, hasSummer ? 'hè' : ''].filter(Boolean).join(' + ') || 'dự kiến'})`;
  }, [calc.timeline]);

  // ----- Thao tác trên tham số -----

  const markEdited = () => setActiveSavedId(null);

  // Xử lý thay đổi điểm số từng môn trong kịch bản giả lập điểm
  const handleGradeChange = (courseCode, newGrade) => {
    markEdited();
    setSimCourses((prev) => prev.map((c) => (c.courseCode === courseCode ? { ...c, expectedGrade: newGrade } : c)));
  };

  const handleCreditsChange = (courseCode, credits) => {
    markEdited();
    setSimCourses((prev) => prev.map((c) => (c.courseCode === courseCode ? { ...c, credits: Number(credits) || 1 } : c)));
  };

  const handleToggleLock = (courseCode) => {
    setSimCourses((prev) => prev.map((c) => (c.courseCode === courseCode ? { ...c, locked: !c.locked } : c)));
  };

  const handleAddCourse = () => {
    markEdited();
    setSimCourses((prev) => {
      const used = new Set(prev.map((c) => c.courseCode));
      let idx = 1;
      while (used.has(`GL${String(idx).padStart(2, '0')}`)) idx += 1;
      return [
        ...prev,
        {
          courseCode: `GL${String(idx).padStart(2, '0')}`,
          courseName: `Môn học giả lập ${idx}`,
          credits: 3,
          courseType: 'Môn bổ sung giả lập',
          defaultGrade: 'B',
          expectedGrade: 'B',
          locked: false,
          custom: true
        }
      ];
    });
  };

  const handleRemoveCourse = (courseCode) => {
    markEdited();
    setSimCourses((prev) => prev.filter((c) => c.courseCode !== courseCode));
  };

  const handleSemesterChange = (code) => {
    markEdited();
    setSemesterCode(code);
    setSimCourses(buildSimCourses(plan, code));
  };

  const handleToggleRetake = (courseCode) => {
    markEdited();
    setRetakeCandidates((prev) => prev.map((c) => (c.courseCode === courseCode ? { ...c, selected: !c.selected } : c)));
  };

  const handleTargetChange = (value) => {
    markEdited();
    setTargetCpaInput(value);
  };

  const handleSelectScenario = (id) => {
    setActiveScenario(id);
    setError(null);
  };

  // Đặt lại điểm các môn chưa khóa và lựa chọn học cải thiện về ban đầu
  const handleResetGrades = () => {
    markEdited();
    setSimCourses((prev) => prev.map((c) => (c.locked ? c : { ...c, expectedGrade: c.defaultGrade })));
    setRetakeCandidates((prev) =>
      prev.map((c) => {
        const demo = DEMO_RETAKE_CANDIDATES.find((d) => d.courseCode === c.courseCode);
        return { ...c, selected: demo ? demo.selected : c.rank === 1 };
      })
    );
  };

  // Đặt lại toàn bộ trang về mặc định
  const handleResetAll = () => {
    const firstCode = plan?.semesters?.[0]?.semesterCode || null;
    setSemesterCode(firstCode);
    setSimCourses(buildSimCourses(plan, firstCode));
    setRetakeCandidates(clone(DEMO_RETAKE_CANDIDATES));
    setTargetCpaInput(Number(plan?.targetCpa ?? HONOR_THRESHOLD).toFixed(2));
    setMaxRetakeCourses(3);
    setEnableSummerAccelerate(true);
    setResults({});
    setError(null);
    setActiveSavedId('demo-1');
    showToast('Đã đặt lại kịch bản mô phỏng về mặc định.');
  };

  // ----- Kịch bản đã lưu -----

  const buildSnapshot = () => ({
    semesterCode,
    grades: Object.fromEntries(simCourses.filter((c) => !c.custom).map((c) => [c.courseCode, c.expectedGrade])),
    gradeAll: null,
    customCourses: simCourses.filter((c) => c.custom).map((c) => ({ ...c, locked: false })),
    retakes: clone(retakeCandidates),
    targetCpa: targetCpaInput
  });

  const resolveSnapshot = (snapshot) => {
    const code = snapshot.semesterCode && findSemester(plan, snapshot.semesterCode) ? snapshot.semesterCode : defaultSemesterCode;
    return {
      semesterCode: code,
      courses: buildSimCourses(plan, code, snapshot),
      retakes: clone(snapshot.retakes || []),
      targetCpa: snapshot.targetCpa ?? Number(plan?.targetCpa ?? HONOR_THRESHOLD).toFixed(2)
    };
  };

  const handleSaveScenario = () => {
    const id = `saved-${Date.now()}`;
    const index = savedScenarios.length + 1;
    const entry = {
      id,
      name: `Kịch bản ${index}: ${activeMeta.label} – ${semShort} (GPA ${fmt2(calc.semesterGpa)})`,
      note: null,
      savedAt: nowLabel(),
      snapshot: buildSnapshot()
    };
    setSavedScenarios((prev) => [entry, ...prev]);
    setActiveSavedId(id);
    showToast(`Đã lưu "${entry.name}" vào danh sách kịch bản.`);
  };

  const handleApplyScenario = (scenario) => {
    const resolved = resolveSnapshot(scenario.snapshot);
    setSemesterCode(resolved.semesterCode);
    setSimCourses(resolved.courses);
    setRetakeCandidates(resolved.retakes);
    setTargetCpaInput(resolved.targetCpa);
    setActiveSavedId(scenario.id);
    showToast(`Đã áp dụng ${scenario.name.split(':')[0]}.`);
  };

  const handleDeleteScenario = (id) => {
    setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
    if (activeSavedId === id) setActiveSavedId(null);
  };

  const scenarioSummary = (scenario) => {
    const resolved = resolveSnapshot(scenario.snapshot);
    const result = computeScenario({
      base,
      plan,
      semesterCode: resolved.semesterCode,
      courses: resolved.courses,
      retakes: resolved.retakes,
      targetCpa: Number(resolved.targetCpa) || targetCpa
    });
    const note =
      scenario.note ||
      `${result.simCredits} TC mô phỏng${result.selectedRetakes.length ? ` + ${result.selectedRetakes.length} môn cải thiện` : ''}${
        scenario.savedAt ? ` • Lưu lúc ${scenario.savedAt}` : ''
      }`;
    return `Dự kiến CPA: ${fmt2(result.simCpa)} • ${note}`;
  };

  // ----- Kích hoạt mô phỏng (API theo chế độ, dự phòng tính cục bộ) -----

  const handleRunSimulation = useCallback(async () => {
    const mode = activeScenario;
    setLoading(true);
    setError(null);
    setResults((prev) => ({ ...prev, [mode]: null }));

    try {
      let res = null;
      let source = 'local';

      if (mode === 'grades') {
        if (api?.simulation?.simulateGrades) {
          res = await api.simulation.simulateGrades({
            semesterCode,
            courses: simCourses.map(({ courseCode, courseName, credits, expectedGrade }) => ({
              courseCode,
              courseName,
              credits,
              expectedGrade
            }))
          });
          source = 'server';
        } else {
          res = {
            projectedSemesterGpa: calc.semesterGpa === null ? null : round2(calc.semesterGpa),
            currentCpa,
            projectedNewCpa: calc.simCpa === null ? null : round2(calc.simCpa),
            cpaDifference: cpaDelta === null ? null : round2(cpaDelta),
            rankChange: `Từ ${currentRank ? `${currentRank.label} (${fmt2(currentCpa)})` : 'chưa có CPA'} → ${
              simRank ? `${simRank.label} (${fmt2(calc.simCpa)})` : 'chưa đủ dữ liệu'
            }`,
            totalCredits: calc.simCredits,
            courses: simCourses
          };
        }
      } else if (mode === 'retake') {
        const maxCourses = Number(maxRetakeCourses) || 3;
        if (api?.simulation?.rankRetake) {
          res = await api.simulation.rankRetake({ maxCourses });
          source = 'server';
        } else {
          res = {
            recommendations: rankCandidatesLocally(retakeCandidates)
              .slice(0, maxCourses)
              .map((c) => ({
                ...c,
                potentialCpaGain: calc.graduationCredits > 0 ? round2(retakeDeltaOf(c) / calc.graduationCredits) : 0,
                badge: c.rank === 1 ? 'Khuyên dùng số 1 (ROI cao nhất)' : `Khuyên dùng số ${c.rank}`
              }))
          };
        }
        if (Array.isArray(res?.recommendations)) {
          const recommendations = res.recommendations;
          setRetakeCandidates((prev) => {
            const previouslySelected = new Set(prev.filter((c) => c.selected).map((c) => c.courseCode));
            return recommendations.slice(0, maxCourses).map((r, idx) => normalizeCandidate(r, idx, previouslySelected));
          });
        }
      } else if (mode === 'target') {
        if (api?.simulation?.calculateTargetGrades) {
          res = await api.simulation.calculateTargetGrades({ targetCpa });
          source = 'server';
        } else {
          res = {
            targetCpa,
            targetRankLabel: `Bằng ${targetRank.label} (CPA ≥ ${targetRank.min.toFixed(2)})`,
            remainingCredits: calc.remainingCredits,
            requiredAverageGpa: calc.reqAll === null ? null : round2(calc.reqAll),
            achievable: calc.reqAll === null || calc.reqAll <= 4,
            allocationSummary: allocationSummary(calc.reqAll)
          };
        }
      } else if (mode === 'accelerate') {
        const regularSemesters = (plan?.semesters || []).filter((s) => !isSummerSemester(s)).length;
        const courseLabel = summerCourse ? `${summerCourse.courseName} (${summerCredits} TC)` : `Thực tập doanh nghiệp (${summerCredits} TC)`;
        res = enableSummerAccelerate
          ? {
              mode: 'ACCELERATED_3_5_YEARS',
              targetTimeline: '3.5 năm (Tốt nghiệp sớm 1 học kỳ chính)',
              summerCredits,
              maxSummerCredits: SUMMER_MAX_CREDITS,
              regularSemesters,
              savedMonths: 6,
              rationale: `Đẩy học phần ${courseLabel} vào kỳ hè giúp giải phóng thời gian làm Khóa luận ở Kỳ 8.`
            }
          : {
              mode: 'STANDARD_4_YEARS',
              targetTimeline: '4 năm (Lộ trình chuẩn 8 học kỳ chính)',
              summerCredits: 0,
              maxSummerCredits: SUMMER_MAX_CREDITS,
              regularSemesters,
              savedMonths: 0,
              rationale: `Không đăng ký học phần vào kỳ hè — ${courseLabel} được học trong học kỳ chính theo tiến độ chuẩn.`
            };
      }

      setResults((prev) => ({ ...prev, [mode]: { data: res || {}, source, at: nowLabel() } }));
      showToast('Đã hoàn tất tính toán mô phỏng What-if!');
    } catch (err) {
      setError({
        mode,
        code: err?.code || 'SIMULATION_ERROR',
        message: err?.message || 'Có lỗi xảy ra trong quá trình mô phỏng kịch bản.',
        details: Array.isArray(err?.details) ? err.details : [err?.message].filter(Boolean)
      });
    } finally {
      setLoading(false);
    }
  }, [
    activeScenario,
    api,
    calc,
    cpaDelta,
    currentRank,
    enableSummerAccelerate,
    maxRetakeCourses,
    plan,
    retakeCandidates,
    semesterCode,
    showToast,
    simCourses,
    simRank,
    summerCourse,
    summerCredits,
    targetCpa,
    targetRank
  ]);

  // Hành động: Áp dụng kết quả mô phỏng vào Study Planner (Hội tụ về Planner)
  const handleApplyToPlanner = useCallback(() => {
    const result = results[activeScenario]?.data;
    if (!result) return;

    const basePlan = plannerStore.getPlan();
    const updatedPlan = JSON.parse(JSON.stringify(basePlan));

    if (activeScenario === 'grades') {
      // Cập nhật điểm mục tiêu của học kỳ mô phỏng (mặc định Kỳ 7)
      const sem = updatedPlan.semesters?.find((s) => s.semesterCode === semesterCode) || updatedPlan.semesters?.[0];
      if (sem) {
        sem.expectedGpa = Number(result.projectedSemesterGpa ?? result.projectedGpa) || round2(calc.semesterGpa ?? 0);
        sem.courses = (sem.courses || []).map((c) => {
          const sim = simCourses.find((s) => s.courseCode === c.courseCode);
          return sim ? { ...c, targetGrade: formatGrade(sim.expectedGrade) } : c;
        });
      }
      updatedPlan.projectedCpa = Number(result.projectedNewCpa ?? result.projectedCpa) || round2(calc.simCpa ?? 0);
      updatedPlan.projectedRank = result.rankChange || (simRank ? `Bằng ${simRank.label} (CPA ≥ ${simRank.min.toFixed(2)})` : updatedPlan.projectedRank);
    } else if (activeScenario === 'target') {
      updatedPlan.targetCpa = Number(result.targetCpa) || targetCpa;
      updatedPlan.projectedCpa = Number(result.targetCpa) || targetCpa;
    } else if (activeScenario === 'accelerate') {
      // Đảm bảo có kỳ hè trong kế hoạch
      if (result.mode === 'ACCELERATED_3_5_YEARS') {
        updatedPlan.version = 'v2.4 (Học vượt 3.5 năm)';
      }
    }

    plannerStore.setIncomingProposal(updatedPlan, 'What-if Simulator');
    plannerStore.acceptProposal();
    showToast('Đã áp dụng thành công kết quả mô phỏng What-if vào Kế hoạch học tập!', { to: '/planner', label: 'Mở kế hoạch' });
  }, [activeScenario, calc, results, semesterCode, showToast, simCourses, simRank, targetCpa]);

  // ----- Xuất báo cáo (tệp văn bản, chạy hoàn toàn trên trình duyệt) -----

  const handleExportReport = () => {
    const lines = [
      'BÁO CÁO MÔ PHỎNG WHAT-IF — HAUI ADVISOR',
      `Thời điểm: ${new Date().toLocaleString('vi-VN')}`,
      `Chế độ: ${activeMeta.name}`,
      '',
      `CPA thực tế: ${fmt2(currentCpa)} / 4.00 (${base.credits} TC, ${currentRank ? `xếp loại ${currentRank.label}` : 'chưa có bảng điểm'})${
        useApiBase ? '' : ' — số liệu mẫu'
      }`,
      `CPA mô phỏng dự kiến: ${fmt2(calc.simCpa)} / 4.00${cpaDelta === null ? '' : ` (${fmtSigned(cpaDelta)})`}${
        simRank ? `, xếp loại ${simRank.label}` : ''
      }`,
      `Mục tiêu đặt ra: ${fmt2(targetCpa)} / 4.00${targetGap === null ? '' : ` (${targetGap >= 0 ? 'vượt' : 'thiếu'} ${Math.abs(targetGap).toFixed(2)})`}`,
      `Tổng tín chỉ tính toán: ${calc.creditsAtSim} / ${totalRequired} TC`,
      `Độ khả thi kịch bản: ${feasibilityLabel(calc.feasibility)} (${calc.feasibility}%)`,
      '',
      `Học kỳ dự phóng: ${simSemester?.semesterName || semShort} — GPA dự phóng ${fmt2(calc.semesterGpa)}`,
      ...simCourses.map((c) => `  • ${c.courseCode} - ${c.courseName} (${c.credits} TC): ${formatGrade(c.expectedGrade)}${c.locked ? ' [khóa]' : ''}`),
      '',
      'Môn học cải thiện được chọn:',
      ...(calc.selectedRetakes.length
        ? calc.selectedRetakes.map(
            (r) => `  • ${r.courseCode} - ${r.courseName} (${r.credits} TC): ${formatGrade(r.currentGrade)} → ${formatGrade(r.targetGrade)}`
          )
        : ['  (không có)']),
      '',
      `GPA trung bình tối thiểu cho ${calc.remainingCredits} TC còn lại: ${fmt2(calc.reqAll)}`,
      allocationSummary(calc.reqAll),
      '',
      'Lưu ý: Kết quả chỉ là kịch bản giả lập, không thay đổi bảng điểm chính thức trên cổng đào tạo HaUI.'
    ];

    if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL?.createObjectURL !== 'function') return;
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bao-cao-what-if-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast('Đã xuất báo cáo mô phỏng What-if.');
  };

  // =========================================================================
  // Render
  // =========================================================================

  // Tiêu đề trang + nút thao tác
  const headerSection = h(
    'div',
    { className: 'flex flex-col md:flex-row md:items-end justify-between gap-space-md' },
    h(
      'div',
      { className: 'space-y-space-xs' },
      h(
        'div',
        { className: 'flex items-center gap-space-xs text-mid-gray font-caption text-caption' },
        h(Link, { to: '/', className: 'hover:text-ink transition-colors flex items-center gap-1' }, icon('home', 'text-[14px]'), 'Trang chủ'),
        h('span', null, '/'),
        h('span', { className: 'text-ink font-medium' }, 'What-if mô phỏng điểm')
      ),
      h('h1', { className: 'font-headline text-headline text-ink tracking-tight font-semibold' }, 'What-if – Mô phỏng kịch bản điểm & Học lực'),
      h(
        'p',
        { className: 'font-body text-body text-mid-gray max-w-3xl leading-relaxed' },
        'Thử nghiệm các kịch bản cải thiện điểm, dự báo điểm học kỳ tới và đánh giá tác động lên CPA tốt nghiệp mà không làm ảnh hưởng đến bảng điểm thật trên hệ thống.'
      )
    ),
    h(
      'div',
      { className: 'flex items-center flex-wrap gap-space-xs shrink-0' },
      h('button', { type: 'button', className: BTN_SOFT, onClick: handleResetAll }, icon('restart_alt'), h('span', null, 'Đặt lại mặc định')),
      h(
        'button',
        {
          type: 'button',
          className:
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body-medium text-body-medium text-ink bg-paper shadow-sm hover:bg-canvas transition-colors',
          onClick: handleExportReport
        },
        icon('file_download'),
        h('span', null, 'Xuất báo cáo')
      ),
      h(
        'button',
        {
          type: 'button',
          className:
            'inline-flex items-center gap-1.5 px-5 py-2 rounded-full font-body-medium text-body-medium text-paper bg-ink hover:bg-ink-soft transition-colors shadow-sm',
          onClick: handleSaveScenario
        },
        icon('bookmark_added'),
        h('span', null, 'Lưu kịch bản')
      )
    )
  );

  // Thẻ chế độ sandbox an toàn
  const sandboxNotice = h(
    'div',
    { className: 'rounded-2xl bg-paper p-space-md shadow-sm flex items-start gap-space-md' },
    h('div', { className: 'w-10 h-10 rounded-full bg-canvas flex items-center justify-center shrink-0 text-ink' }, icon('science', 'text-[20px]')),
    h(
      'div',
      { className: 'space-y-0.5 min-w-0 flex-1' },
      h(
        'div',
        { className: 'flex items-center gap-2 flex-wrap' },
        h('span', { className: 'font-body-medium text-body-medium font-semibold text-ink' }, 'Chế độ mô phỏng an toàn (Sandbox Mode)'),
        h('span', { className: 'px-2 py-0.5 rounded-full font-label text-label bg-canvas text-mid-gray font-medium' }, 'Bảo vệ dữ liệu')
      ),
      h(
        'p',
        { className: 'font-body text-body text-mid-gray leading-normal' },
        'Mọi tính toán điểm số tại đây chỉ là kịch bản giả lập chạy độc lập trong phiên làm việc hiện tại, tuyệt đối không gửi yêu cầu thay đổi dữ liệu bảng điểm chính thức trên cổng đào tạo HaUI.'
      )
    )
  );

  // 4 thẻ chỉ số
  const metricLabel = (text, className = 'text-mid-gray') =>
    h('span', { className: `font-caption text-caption font-medium uppercase tracking-wider ${className}` }, text);
  const metricIcon = (name) =>
    h('span', { className: 'w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-mid-gray shrink-0' }, icon(name, 'text-[16px]'));
  // Khung chờ khi đang tải dữ liệu học vụ
  const skeleton = (className) => h('span', { className: `inline-block rounded-full animate-pulse ${className}`, 'aria-hidden': 'true' });
  const metricValue = (text, className = 'text-ink', skeletonClass = 'bg-canvas') =>
    baseLoading
      ? skeleton(`h-9 w-20 ${skeletonClass}`)
      : h('span', { className: `font-headline text-headline font-semibold ${className}` }, text);
  const baseCaption =
    academic.state === 'error'
      ? h('p', { className: 'font-caption text-caption text-ember mt-1' }, 'Không tải được dữ liệu học vụ — đang dùng số liệu mẫu.')
      : null;
  const creditsCaption = (() => {
    const sem = semShort.toLowerCase();
    if (calc.earned === 0) return `${calc.simCredits} TC ${sem}${currentCpa === null ? ' • chưa có bảng điểm' : ''}`;
    return calc.creditsAtSim - calc.earned === calc.simCredits
      ? `${calc.earned} TC hiện tại + ${calc.simCredits} TC ${sem}`
      : `${calc.earned} TC hiện tại + ${calc.creditsAtSim - calc.earned} TC đến hết ${sem}`;
  })();

  const metricsGrid = h(
    'div',
    { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md' },
    // CPA thực tế
    h(
      'div',
      { className: 'rounded-3xl bg-paper p-space-lg shadow-sm flex flex-col justify-between space-y-space-md' },
      h('div', { className: 'flex items-center justify-between' }, metricLabel('CPA Thực tế'), metricIcon('school')),
      h(
        'div',
        null,
        h(
          'div',
          { className: 'flex items-baseline gap-1.5' },
          metricValue(fmt2(currentCpa), currentCpa === null ? 'text-mid-gray' : 'text-ink'),
          h('span', { className: 'font-body text-body text-mid-gray' }, '/ 4.00')
        ),
        h(
          'div',
          { className: 'flex items-center gap-1.5 mt-2' },
          h('span', { className: 'px-2 py-0.5 rounded-full bg-canvas font-label text-label text-ink font-medium whitespace-nowrap' }, `${baseLoading ? '—' : base.credits} Tín chỉ`),
          h(
            'span',
            { className: 'font-caption text-caption text-mid-gray' },
            baseLoading ? '• Đang tải...' : currentRank ? `• Xếp loại ${currentRank.label}` : '• Chưa có bảng điểm'
          )
        ),
        baseCaption
      )
    ),
    // CPA mô phỏng
    h(
      'div',
      { className: 'rounded-3xl bg-ink text-paper p-space-lg shadow-sm flex flex-col justify-between space-y-space-md relative overflow-hidden' },
      h('div', { className: 'absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-ink-soft/40 pointer-events-none' }),
      h(
        'div',
        { className: 'flex items-center justify-between relative z-10' },
        metricLabel('CPA Mô phỏng dự kiến', 'text-hairline'),
        h(
          'span',
          { className: 'w-7 h-7 rounded-full bg-ink-soft flex items-center justify-center text-paper shrink-0' },
          icon(cpaDelta !== null && cpaDelta < 0 ? 'trending_down' : 'trending_up', 'text-[16px]')
        )
      ),
      h(
        'div',
        { className: 'relative z-10' },
        h(
          'div',
          { className: 'flex items-baseline gap-2' },
          metricValue(fmt2(calc.simCpa), 'text-paper', 'bg-ink-soft'),
          h('span', { className: 'font-body text-body text-secondary-fixed' }, '/ 4.00'),
          cpaDelta !== null && !baseLoading
            ? h('span', { className: 'ml-auto font-label text-label font-semibold text-paper bg-ink-soft px-2 py-0.5 rounded-full' }, fmtSigned(cpaDelta))
            : null
        ),
        h(
          'div',
          { className: 'flex items-center gap-1.5 mt-2' },
          h('span', { className: 'w-2 h-2 rounded-full bg-paper animate-pulse shrink-0' }),
          h(
            'span',
            { className: 'font-caption text-caption text-paper font-semibold tracking-wide uppercase' },
            baseLoading
              ? 'Đang tải dữ liệu học vụ...'
              : !simRank
              ? 'Chưa đủ dữ liệu xếp loại'
              : simRank.min > 0
                ? `Đạt xếp loại ${simRank.label} (≥ ${simRank.min.toFixed(2)})`
                : `Xếp loại ${simRank.label} (< 2.00)`
          )
        )
      )
    ),
    // Mục tiêu
    h(
      'div',
      { className: 'rounded-3xl bg-paper p-space-lg shadow-sm flex flex-col justify-between space-y-space-md' },
      h('div', { className: 'flex items-center justify-between' }, metricLabel('Mục tiêu đặt ra'), metricIcon('flag')),
      h(
        'div',
        null,
        h(
          'div',
          { className: 'flex items-baseline gap-1.5' },
          h('span', { className: 'font-headline text-headline font-semibold text-ink' }, fmt2(targetCpa)),
          h('span', { className: 'font-body text-body text-mid-gray' }, '/ 4.00')
        ),
        h(
          'div',
          { className: 'flex items-center gap-1.5 mt-2' },
          baseLoading || targetGap === null
            ? h(
                'span',
                { className: 'px-2 py-0.5 rounded-full bg-canvas font-label text-label font-semibold text-mid-gray' },
                baseLoading ? 'Đang tính...' : 'Chưa đủ dữ liệu'
              )
            : h(
                'span',
                { className: `px-2 py-0.5 rounded-full bg-canvas font-label text-label font-semibold ${targetGap >= 0 ? 'text-ink' : 'text-ember'}` },
                targetGap >= 0 ? `Vượt mục tiêu ${fmtSigned(targetGap)}` : `Còn thiếu ${Math.abs(targetGap).toFixed(2)}`
              ),
          baseLoading || targetGap === null
            ? null
            : h('span', { className: 'font-caption text-caption text-mid-gray' }, targetGap >= 0 ? 'Thỏa mãn điều kiện' : 'Chưa đạt mục tiêu')
        )
      )
    ),
    // Tổng tín chỉ
    h(
      'div',
      { className: 'rounded-3xl bg-paper p-space-lg shadow-sm flex flex-col justify-between space-y-space-md' },
      h('div', { className: 'flex items-center justify-between' }, metricLabel('Tổng tín chỉ tính toán'), metricIcon('layers')),
      h(
        'div',
        null,
        h(
          'div',
          { className: 'flex items-baseline gap-1.5' },
          metricValue(String(calc.creditsAtSim)),
          h('span', { className: 'font-body text-body text-mid-gray' }, `/ ${totalRequired} TC chuẩn`)
        ),
        h('div', { className: 'flex items-center gap-1.5 mt-2' }, h('span', { className: 'font-caption text-caption text-mid-gray' }, creditsCaption))
      )
    )
  );

  // Bộ chọn chế độ mô phỏng (segmented control)
  const modeSwitcher = h(
    'div',
    { className: 'flex flex-wrap items-center justify-between gap-x-space-md gap-y-space-xs' },
    h(
      'div',
      {
        role: 'tablist',
        'aria-label': 'Chế độ mô phỏng',
        className: 'inline-flex items-center gap-1 p-1 rounded-full bg-paper shadow-sm max-w-full overflow-x-auto shrink-0'
      },
      WHAT_IF_SCENARIOS.map((sc) => {
        const isActive = sc.id === activeScenario;
        return h(
          'button',
          {
            key: sc.id,
            type: 'button',
            role: 'tab',
            'aria-selected': isActive,
            title: sc.name,
            onClick: () => handleSelectScenario(sc.id),
            className: `inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body-medium text-body-medium whitespace-nowrap shrink-0 transition-colors ${
              isActive ? 'bg-ink text-paper shadow-sm' : 'text-mid-gray hover:text-ink hover:bg-canvas'
            }`
          },
          icon(sc.icon),
          h('span', null, sc.label)
        );
      })
    ),
    h('p', { className: 'flex-1 min-w-[240px] font-caption text-caption text-mid-gray lg:text-right' }, activeMeta.description)
  );

  // Thẻ thiết lập tham số kịch bản
  const parameterCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Thiết lập tham số kịch bản',
      subtitle: 'Điều chỉnh mục tiêu và học kỳ tác động',
      bordered: true,
      right: h(
        'div',
        { className: 'flex items-center gap-2' },
        h('span', { className: 'px-3 py-1 rounded-full bg-canvas font-caption text-caption font-medium text-ink' }, simSemester?.semesterName || 'Chưa có học kỳ')
      )
    }),
    h(
      'div',
      { className: 'grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-space-xs' },
      h(
        'div',
        { className: 'space-y-1.5' },
        h('label', { htmlFor: 'whatif-target-cpa', className: 'font-caption text-caption text-mid-gray uppercase tracking-wider block' }, 'Mục tiêu CPA mong muốn'),
        h(
          'div',
          { className: 'flex items-center gap-2' },
          h(
            'div',
            { className: 'relative flex-1' },
            h('input', {
              id: 'whatif-target-cpa',
              type: 'number',
              min: '2.00',
              max: '4.00',
              step: '0.01',
              value: targetCpaInput,
              onChange: (e) => handleTargetChange(e.target.value),
              className: `w-full bg-surface-alt rounded-full px-4 py-2 pr-16 font-body text-body text-ink focus:outline-none focus:bg-paper transition-all ${
                targetValid ? '' : 'ring-1 ring-ember'
              }`
            }),
            h('span', { className: 'absolute right-4 top-2 text-mid-gray font-caption text-caption pointer-events-none' }, '/ 4.00')
          ),
          h('span', { className: 'px-2.5 py-1.5 rounded-full bg-canvas text-ink font-label text-label font-medium whitespace-nowrap' }, `Bằng ${targetRank.label}`)
        ),
        targetValid
          ? null
          : h('p', { className: 'font-caption text-caption text-ember' }, `CPA mục tiêu phải nằm trong khoảng 2.00 – 4.00 (đang dùng ${fmt2(targetCpa)}).`)
      ),
      h(
        'div',
        { className: 'space-y-1.5' },
        h('label', { htmlFor: 'whatif-semester', className: 'font-caption text-caption text-mid-gray uppercase tracking-wider block' }, 'Học kỳ dự phóng'),
        h(
          'div',
          { className: 'relative' },
          h(
            'select',
            {
              id: 'whatif-semester',
              value: semesterCode || '',
              onChange: (e) => handleSemesterChange(e.target.value),
              className:
                'w-full appearance-none bg-surface-alt rounded-full pl-4 pr-10 py-2 font-body text-body text-ink truncate cursor-pointer focus:outline-none focus:bg-paper transition-all'
            },
            (plan?.semesters || []).map((s) =>
              h('option', { key: s.semesterCode, value: s.semesterCode }, `${semesterShortName(s)} • ${(s.courses || []).length} môn (${semesterCredits(s)} TC)`)
            )
          ),
          h('span', { className: 'material-symbols-outlined text-[18px] text-mid-gray absolute right-4 top-2 pointer-events-none', 'aria-hidden': 'true' }, 'calendar_month')
        )
      )
    )
  );

  // Thanh hành động cuối khu vực trái
  const actionBar = h(
    'div',
    { className: 'flex flex-wrap items-center justify-between gap-space-sm pt-space-xs' },
    h(
      'button',
      {
        type: 'button',
        onClick: handleResetGrades,
        className: 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body-medium text-body-medium text-mid-gray hover:text-ink transition-colors'
      },
      icon('replay'),
      h('span', null, 'Đặt lại bảng điểm ban đầu')
    ),
    h(
      'button',
      { type: 'button', onClick: handleRunSimulation, disabled: loading, className: BTN_PRIMARY },
      icon(loading ? 'progress_activity' : 'calculate', loading ? 'text-[18px] animate-spin' : 'text-[18px]'),
      h('span', null, loading ? 'Đang tính toán...' : 'Tính toán kết quả')
    )
  );

  // ----- Chế độ 1: bảng điểm giả lập -----

  const gradeTableCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Danh sách môn học dự kiến & Điểm giả lập',
      subtitle: 'Thay đổi thang điểm dự phóng để kiểm tra biến thiên kết quả',
      bordered: true,
      right: h('span', { className: `${PILL} whitespace-nowrap` }, `${simCourses.length} Môn • ${calc.simCredits} TC`)
    }),
    simCourses.length === 0
      ? h(
          'div',
          { className: 'py-space-xl flex flex-col items-center text-center gap-space-xs' },
          h('span', { className: 'w-10 h-10 rounded-full bg-canvas flex items-center justify-center text-mid-gray' }, icon('playlist_add', 'text-[20px]')),
          h('p', { className: 'font-body-medium text-body-medium text-ink' }, 'Học kỳ này chưa có môn học nào'),
          h('p', { className: 'font-caption text-caption text-mid-gray' }, 'Thêm môn học giả lập để bắt đầu mô phỏng điểm.')
        )
      : h(
          'div',
          { className: 'overflow-x-auto' },
          h(
            'table',
            { className: 'w-full text-left border-collapse' },
            h(
              'thead',
              null,
              h(
                'tr',
                { className: 'text-mid-gray font-caption text-caption uppercase tracking-wider bg-canvas/60 rounded-xl' },
                h('th', { className: 'py-2.5 px-3 rounded-l-xl font-medium' }, 'Mã môn'),
                h('th', { className: 'py-2.5 px-3 font-medium' }, 'Tên môn học'),
                h('th', { className: 'py-2.5 px-2 text-center font-medium' }, 'Số TC'),
                h('th', { className: 'py-2.5 px-3 font-medium' }, 'Điểm chữ'),
                h('th', { className: 'py-2.5 px-2 text-right font-medium' }, 'Hệ 4'),
                h('th', { className: 'py-2.5 px-3 rounded-r-xl text-center font-medium' }, 'Thao tác')
              )
            ),
            h(
              'tbody',
              { className: 'divide-y divide-canvas font-body text-body text-ink' },
              simCourses.map((c) =>
                h(
                  'tr',
                  { key: c.courseCode, className: 'hover:bg-surface-alt/70 transition-colors group' },
                  h('td', { className: 'py-3 px-3 font-medium text-ink font-label text-label' }, c.courseCode),
                  h(
                    'td',
                    { className: 'py-3 px-3' },
                    h('p', { className: 'font-body-medium text-body-medium text-ink leading-tight' }, c.courseName),
                    h('span', { className: 'font-caption text-caption text-mid-gray' }, c.courseType || 'Môn học dự kiến')
                  ),
                  h(
                    'td',
                    { className: 'py-3 px-2 text-center font-medium' },
                    c.custom
                      ? h(
                          'select',
                          {
                            value: c.credits,
                            'aria-label': `Số tín chỉ ${c.courseName}`,
                            disabled: c.locked,
                            onChange: (e) => handleCreditsChange(c.courseCode, e.target.value),
                            className:
                              'bg-surface-alt hover:bg-canvas rounded-full px-2 py-1 text-ink font-body-medium text-body-medium focus:outline-none transition-colors disabled:opacity-60'
                          },
                          [1, 2, 3, 4, 5, 6].map((n) => h('option', { key: n, value: n }, n))
                        )
                      : c.credits
                  ),
                  h(
                    'td',
                    { className: 'py-3 px-3' },
                    h(
                      'select',
                      {
                        value: c.expectedGrade,
                        'aria-label': `Điểm giả lập ${c.courseName}`,
                        disabled: c.locked,
                        onChange: (e) => handleGradeChange(c.courseCode, e.target.value),
                        className:
                          'bg-surface-alt hover:bg-canvas rounded-full px-3 py-1 text-ink font-body-medium text-body-medium focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
                      },
                      GRADE_SCALE.map((g) => h('option', { key: g.letter, value: g.letter }, formatGrade(g.letter)))
                    )
                  ),
                  h('td', { className: 'py-3 px-2 text-right font-body-medium text-body-medium font-semibold' }, gradePoint(c.expectedGrade).toFixed(1)),
                  h(
                    'td',
                    { className: 'py-3 px-3 text-center whitespace-nowrap' },
                    h(
                      'button',
                      {
                        type: 'button',
                        onClick: () => handleToggleLock(c.courseCode),
                        title: c.locked ? 'Mở khóa môn học' : 'Khóa môn học',
                        'aria-pressed': c.locked,
                        className: `p-1 rounded-full hover:bg-canvas transition-colors ${c.locked ? 'text-ink' : 'text-mid-gray hover:text-ink'}`
                      },
                      icon(c.locked ? 'lock' : 'lock_open')
                    ),
                    c.custom
                      ? h(
                          'button',
                          {
                            type: 'button',
                            onClick: () => handleRemoveCourse(c.courseCode),
                            title: 'Xóa môn học giả lập',
                            className: 'p-1 rounded-full text-mid-gray hover:text-ink hover:bg-canvas transition-colors'
                          },
                          icon('delete')
                        )
                      : null
                  )
                )
              )
            )
          )
        ),
    h(
      'div',
      { className: 'flex flex-wrap items-center justify-between gap-space-sm pt-space-xs' },
      h('button', { type: 'button', className: BTN_SOFT, onClick: handleAddCourse }, icon('add_circle'), h('span', null, 'Thêm môn học giả lập')),
      h(
        'div',
        { className: 'flex items-center gap-2' },
        h('span', { className: 'font-caption text-caption text-mid-gray' }, `Dự phóng GPA ${semShort}:`),
        h('span', { className: 'font-body-medium text-body-medium font-semibold text-ink px-2.5 py-0.5 rounded-full bg-canvas' }, `${fmt2(calc.semesterGpa)} / 4.00`)
      )
    )
  );

  // Một dòng môn học cải thiện (dùng cho chế độ 1 và 2)
  const retakeRow = (c, { detailed = false } = {}) => {
    const gain = calc.graduationCredits > 0 ? retakeDeltaOf(c) / calc.graduationCredits : 0;
    const inputId = `whatif-retake-${c.courseCode}`;
    const gainPill = h(
      'span',
      { className: 'shrink-0 px-2.5 py-1 rounded-full bg-paper font-label text-label font-semibold text-ink shadow-sm whitespace-nowrap' },
      `${fmtSigned(round2(gain))} CPA toàn khóa`
    );
    const gradeCaption = h(
      'p',
      { className: 'font-caption text-caption text-mid-gray' },
      `Điểm gốc${c.originSemester ? ` ${c.originSemester}` : ''}: `,
      h('span', { className: 'text-ember font-medium' }, formatGrade(c.currentGrade)),
      ' ➔ Giả lập cải thiện thành công lên ',
      h('span', { className: 'text-ink font-semibold' }, formatGrade(c.targetGrade))
    );
    const checkbox = h('input', {
      id: inputId,
      type: 'checkbox',
      checked: Boolean(c.selected),
      onChange: () => handleToggleRetake(c.courseCode),
      className: 'w-4 h-4 accent-ink cursor-pointer rounded shrink-0 mt-0.5'
    });
    const label = h(
      'label',
      { htmlFor: inputId, className: 'font-body-medium text-body-medium font-semibold text-ink cursor-pointer block' },
      `${c.courseCode} - ${c.courseName} (${c.credits} TC)`
    );

    if (!detailed) {
      return h(
        'div',
        { key: c.courseCode, className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm' },
        h('div', { className: 'flex items-start gap-space-sm min-w-0' }, checkbox, h('div', { className: 'min-w-0' }, label, gradeCaption)),
        h('div', { className: 'shrink-0 flex items-center gap-2' }, gainPill)
      );
    }

    // Dạng xếp hạng ROI: hạng + chọn đưa vào mô phỏng, lý do và nhãn đề xuất bên dưới
    const roiPerCredit = gradePoint(c.targetGrade) - gradePoint(c.currentGrade);
    return h(
      'div',
      { key: c.courseCode, className: 'flex items-start gap-space-sm' },
      h(
        'span',
        {
          className: `w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-label text-label font-semibold ${
            c.rank === 1 ? 'bg-ink text-paper' : 'bg-paper text-ink'
          }`
        },
        `#${c.rank || 1}`
      ),
      h(
        'div',
        { className: 'min-w-0 flex-1 space-y-1' },
        h(
          'div',
          { className: 'flex items-start justify-between gap-space-sm' },
          h('div', { className: 'flex items-start gap-space-sm min-w-0' }, checkbox, h('div', { className: 'min-w-0' }, label, gradeCaption)),
          gainPill
        ),
        c.rationale ? h('p', { className: 'pl-6 font-caption text-caption text-mid-gray' }, c.rationale) : null,
        h(
          'div',
          { className: 'pl-6 flex flex-wrap items-center gap-2' },
          c.badge ? h('span', { className: 'px-2.5 py-0.5 rounded-full bg-paper font-label text-label text-ink' }, c.badge) : null,
          h('span', { className: 'font-caption text-caption text-mid-gray' }, `ROI +${roiPerCredit.toFixed(1)} điểm/TC`),
          c.serverGain !== null && c.serverGain !== undefined
            ? h('span', { className: 'font-caption text-caption text-mid-gray' }, `• Máy chủ ước tính +${Number(c.serverGain).toFixed(2)} CPA`)
            : null
        )
      )
    );
  };

  const retakeNote = h(
    'div',
    { className: 'pl-7 text-mid-gray font-caption text-caption' },
    '* Khi học cải thiện, điểm mới sẽ thay thế hoàn toàn điểm cũ trong việc tính toán điểm trung bình tích lũy CPA.'
  );

  const retakeEmpty = h(
    'div',
    { className: 'p-space-md rounded-2xl bg-canvas flex items-center gap-space-sm text-mid-gray font-caption text-caption' },
    icon(currentCpa === null ? 'info' : 'task_alt'),
    currentCpa === null
      ? 'Chưa có bảng điểm — chưa có môn học đã hoàn thành để học lại / cải thiện điểm.'
      : 'Không có môn học nào cần học lại hoặc cải thiện điểm.'
  );

  const retakeCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Môn học cần học lại / Cải thiện điểm (Tùy chọn)',
      subtitle: 'Mô phỏng nâng điểm các môn đã hoàn thành ở kỳ trước có điểm C hoặc D',
      right: h(
        'span',
        { className: 'px-2.5 py-1 rounded-full bg-canvas text-mid-gray font-label text-label whitespace-nowrap' },
        `${visibleRetakes.length} đề xuất tối ưu`
      )
    }),
    visibleRetakes.length
      ? h(
          'div',
          { className: 'p-space-md rounded-2xl bg-canvas space-y-space-sm' },
          visibleRetakes.map((c) => retakeRow(c)),
          retakeNote
        )
      : retakeEmpty,
    actionBar
  );

  // ----- Chế độ 2: xếp hạng ROI học cải thiện -----

  const retakeRankingCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Xếp hạng tối ưu học cải thiện (ROI)',
      subtitle: 'Xếp hạng các môn điểm D/D+/C theo độ nhạy tăng CPA trên mỗi tín chỉ đăng ký (BR-06)',
      bordered: true,
      right: h('span', { className: `${PILL} whitespace-nowrap` }, `${calc.selectedRetakes.length}/${visibleRetakes.length} môn đang chọn`)
    }),
    h(
      'div',
      { className: 'flex flex-wrap items-center justify-between gap-space-sm' },
      h(
        'div',
        { className: 'space-y-0.5' },
        h('span', { className: 'font-caption text-caption text-mid-gray uppercase tracking-wider block' }, 'Số môn tối đa cần gợi ý cải thiện'),
        h('span', { className: 'font-caption text-caption text-mid-gray block' }, 'Nhấn "Tính toán kết quả" để lấy xếp hạng ROI mới nhất')
      ),
      h(
        'div',
        { className: 'inline-flex items-center gap-1 p-1 rounded-full bg-surface-alt' },
        h(
          'button',
          {
            type: 'button',
            title: 'Giảm',
            disabled: Number(maxRetakeCourses) <= 1,
            onClick: () => setMaxRetakeCourses((v) => Math.max(1, Number(v) - 1)),
            className: 'w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-canvas transition-colors disabled:opacity-40'
          },
          icon('remove')
        ),
        h('input', {
          type: 'number',
          min: 1,
          max: MAX_RETAKE_SUGGESTIONS,
          value: maxRetakeCourses,
          'aria-label': 'Số môn tối đa cần gợi ý cải thiện',
          onChange: (e) => setMaxRetakeCourses(e.target.value),
          className: 'w-10 bg-transparent text-center font-body-medium text-body-medium text-ink focus:outline-none'
        }),
        h(
          'button',
          {
            type: 'button',
            title: 'Tăng',
            disabled: Number(maxRetakeCourses) >= MAX_RETAKE_SUGGESTIONS,
            onClick: () => setMaxRetakeCourses((v) => Math.min(MAX_RETAKE_SUGGESTIONS, Number(v) + 1)),
            className: 'w-8 h-8 rounded-full flex items-center justify-center text-ink hover:bg-canvas transition-colors disabled:opacity-40'
          },
          icon('add')
        )
      )
    ),
    visibleRetakes.length
      ? h(
          'div',
          { className: 'space-y-space-xs' },
          [...visibleRetakes]
            .sort((a, b) => (a.rank || 0) - (b.rank || 0))
            .map((c) => h('div', { key: c.courseCode, className: 'p-space-md rounded-2xl bg-canvas' }, retakeRow(c, { detailed: true }))),
          retakeNote
        )
      : retakeEmpty,
    actionBar
  );

  // ----- Chế độ 3: tính điểm mục tiêu ngược -----

  const reqAll = calc.reqAll;
  const reqReachable = reqAll === null || reqAll <= 4 + 1e-9;
  const targetCalculatorCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Tính điểm mục tiêu ngược',
      subtitle: 'Phân bổ điểm tối thiểu cần đạt trong các kỳ còn lại để đạt CPA mục tiêu',
      bordered: true,
      right: h('span', { className: `${PILL} whitespace-nowrap` }, `${calc.remainingCredits} TC còn lại`)
    }),
    h(
      'div',
      { className: 'space-y-space-sm' },
      h(
        'div',
        { className: 'flex items-end justify-between gap-space-sm' },
        h(
          'div',
          null,
          h('label', { htmlFor: 'whatif-target-slider', className: 'font-caption text-caption text-mid-gray uppercase tracking-wider block' }, 'CPA mục tiêu cần đạt khi tốt nghiệp'),
          h(
            'div',
            { className: 'flex items-baseline gap-1.5 mt-1' },
            h('span', { className: 'font-headline text-headline font-semibold text-ink' }, fmt2(targetCpa)),
            h('span', { className: 'font-body text-body text-mid-gray' }, `/ 4.00 • Bằng ${targetRank.label}`)
          )
        ),
        h(
          'div',
          { className: 'flex items-center gap-1 flex-wrap justify-end' },
          TARGET_PRESETS.map((p) => {
            const isActive = Math.abs(targetCpa - p.value) < 1e-9;
            return h(
              'button',
              {
                key: p.value,
                type: 'button',
                onClick: () => handleTargetChange(p.value.toFixed(2)),
                className: `px-3 py-1 rounded-full font-label text-label font-medium transition-colors ${
                  isActive ? 'bg-ink text-paper' : 'bg-canvas text-ink hover:bg-surface-variant'
                }`
              },
              `${p.label} ${p.value.toFixed(2)}`
            );
          })
        )
      ),
      h('input', {
        id: 'whatif-target-slider',
        type: 'range',
        min: 2,
        max: 4,
        step: 0.01,
        value: targetCpa,
        onChange: (e) => handleTargetChange(Number(e.target.value).toFixed(2)),
        className: 'w-full accent-ink cursor-pointer'
      }),
      h(
        'div',
        { className: 'flex justify-between font-caption text-caption text-mid-gray' },
        h('span', null, '2.00'),
        h('span', null, 'Khá 2.50'),
        h('span', null, 'Giỏi 3.20'),
        h('span', null, 'Xuất sắc 3.60'),
        h('span', null, '4.00')
      )
    ),
    h(
      'div',
      { className: 'p-space-md rounded-2xl bg-canvas space-y-2' },
      h(
        'div',
        { className: 'flex items-center justify-between gap-space-sm font-body-medium text-body-medium' },
        h('span', { className: 'text-ink font-medium' }, `GPA trung bình tối thiểu cho ${calc.remainingCredits} TC còn lại`),
        h('span', { className: `font-semibold whitespace-nowrap ${reqReachable ? 'text-ink' : 'text-ember'}` }, reqAll === null ? '—' : `${Math.max(0, reqAll).toFixed(2)} / 4.00`)
      ),
      h(
        'div',
        { className: 'w-full h-2 rounded-full bg-hairline overflow-hidden' },
        h('div', {
          className: `h-full rounded-full ${reqReachable ? 'bg-ink' : 'bg-ember'}`,
          style: { width: `${clamp(((reqAll ?? 0) / 4) * 100, 0, 100)}%` }
        })
      ),
      h(
        'p',
        { className: `font-caption text-caption ${reqReachable ? 'text-mid-gray' : 'text-ember'}` },
        allocationSummary(reqAll)
      ),
      calc.retakeDelta > 0
        ? h(
            'p',
            { className: 'font-caption text-caption text-mid-gray' },
            `Đã tính ${calc.selectedRetakes.length} môn học cải thiện đang chọn (+${calc.retakeDelta.toFixed(1)} điểm tích lũy).`
          )
        : null
    ),
    h(
      'div',
      { className: 'space-y-space-xs' },
      (plan?.semesters || []).map((s) =>
        h(
          'div',
          { key: s.semesterCode, className: 'flex items-center justify-between gap-space-sm px-space-md py-2.5 rounded-2xl bg-surface-alt' },
          h(
            'div',
            { className: 'min-w-0' },
            h('p', { className: 'font-body-medium text-body-medium text-ink truncate' }, s.semesterName),
            h('p', { className: 'font-caption text-caption text-mid-gray' }, `${(s.courses || []).length} môn • ${semesterCredits(s)} TC • Kế hoạch: GPA ${fmt2(s.expectedGpa)}`)
          ),
          h(
            'span',
            {
              className: `shrink-0 px-2.5 py-1 rounded-full bg-paper font-label text-label font-semibold shadow-sm ${
                reqAll !== null && Number(s.expectedGpa) + 1e-9 < reqAll ? 'text-ember' : 'text-ink'
              }`
            },
            reqAll === null ? '—' : `Cần ≥ ${Math.max(0, reqAll).toFixed(2)}`
          )
        )
      )
    ),
    actionBar
  );

  // ----- Chế độ 4: học vượt 3.5 năm -----

  const summerToggleId = 'whatif-summer-accelerate';
  const accelerateCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Học vượt: Rút ngắn 3.5 năm tốt nghiệp',
      subtitle: 'Phân bổ học phần vào kỳ hè để tốt nghiệp sớm 1 học kỳ chính',
      bordered: true,
      right: h('span', { className: `${PILL} whitespace-nowrap` }, `Tối đa ${SUMMER_MAX_CREDITS} TC/kỳ phụ`)
    }),
    h(
      'div',
      { className: 'p-space-md rounded-2xl bg-canvas space-y-space-sm' },
      h(
        'div',
        { className: 'flex items-start gap-space-sm' },
        h('input', {
          id: summerToggleId,
          type: 'checkbox',
          checked: enableSummerAccelerate,
          onChange: (e) => setEnableSummerAccelerate(e.target.checked),
          className: 'w-4 h-4 accent-ink cursor-pointer rounded shrink-0 mt-0.5'
        }),
        h(
          'div',
          { className: 'min-w-0' },
          h(
            'label',
            { htmlFor: summerToggleId, className: 'font-body-medium text-body-medium font-semibold text-ink cursor-pointer block' },
            `Đăng ký học phần ${summerCourse?.courseName || 'Thực tập doanh nghiệp'} (${summerCredits} TC) vào ${
              summerSemester?.semesterName || 'kỳ hè'
            } (Tối đa ${SUMMER_MAX_CREDITS} TC/kỳ phụ)`
          ),
          h(
            'p',
            { className: 'font-caption text-caption text-mid-gray' },
            'Bật tùy chọn phân bổ tín chỉ vào kỳ hè để rút ngắn thời gian đào tạo từ 4 năm xuống 3.5 năm.'
          )
        )
      ),
      h(
        'div',
        { className: 'pl-7 space-y-1.5' },
        h(
          'div',
          { className: 'flex justify-between font-caption text-caption text-mid-gray' },
          h('span', null, 'Tải kỳ hè'),
          h('span', { className: 'text-ink font-medium' }, `${enableSummerAccelerate ? summerCredits : 0} / ${SUMMER_MAX_CREDITS} TC`)
        ),
        h(
          'div',
          { className: 'w-full h-2 rounded-full bg-hairline overflow-hidden' },
          h('div', {
            className: `h-full rounded-full ${summerCredits > SUMMER_MAX_CREDITS ? 'bg-ember' : 'bg-ink'}`,
            style: { width: `${clamp(((enableSummerAccelerate ? summerCredits : 0) / SUMMER_MAX_CREDITS) * 100, 0, 100)}%` }
          })
        )
      )
    ),
    h(
      'div',
      { className: 'flex flex-wrap items-center gap-2' },
      (plan?.semesters || [])
        .filter((s) => enableSummerAccelerate || !isSummerSemester(s))
        .map((s, idx, list) =>
          h(
            React.Fragment,
            { key: s.semesterCode },
            h(
              'span',
              { className: `px-3 py-1.5 rounded-full font-label text-label font-medium ${isSummerSemester(s) ? 'bg-ink text-paper' : 'bg-canvas text-ink'}` },
              `${semesterShortName(s)} • ${semesterCredits(s)} TC`
            ),
            idx < list.length - 1 ? icon('arrow_forward', 'text-[16px] text-mid-gray') : null
          )
        ),
      h(
        'span',
        { className: 'font-caption text-caption text-mid-gray ml-auto' },
        enableSummerAccelerate ? 'Tốt nghiệp sau 3.5 năm' : 'Tiến độ chuẩn 4 năm'
      )
    ),
    actionBar
  );

  // ----- Thẻ kết quả từ máy chủ (Loading / Error / Empty / Kết quả) -----

  const activeResult = results[activeScenario] || null;
  const activeError = error && error.mode === activeScenario ? error : null;
  const resultData = activeResult?.data || null;

  const renderResultBody = () => {
    if (activeScenario === 'grades') {
      const gpa = resultData.projectedSemesterGpa ?? resultData.projectedGpa;
      const newCpa = resultData.projectedNewCpa ?? resultData.projectedCpa;
      const diff = Number(resultData.cpaDifference);
      return h(
        'div',
        { className: 'space-y-space-sm' },
        h(
          'div',
          { className: 'grid grid-cols-1 sm:grid-cols-3 gap-space-sm' },
          statBlock('GPA học kỳ dự phóng', fmt2(gpa)),
          statBlock('CPA tích lũy mới', fmt2(newCpa), Number.isFinite(diff) ? `${fmtSigned(diff)} so với hiện tại` : null),
          statBlock('CPA hiện tại', fmt2(resultData.currentCpa !== undefined ? resultData.currentCpa : currentCpa))
        ),
        resultData.rankChange
          ? h(
              'div',
              { className: 'flex items-start gap-2 font-body text-body text-ink' },
              icon('workspace_premium', 'text-[18px] text-ink'),
              h('span', null, resultData.rankChange)
            )
          : null,
        h(
          'p',
          { className: 'font-caption text-caption text-mid-gray' },
          'Bấm "Áp dụng vào Kế hoạch học tập" để lưu các mức điểm mục tiêu này vào Study Planner.'
        )
      );
    }

    if (activeScenario === 'retake') {
      const recs = Array.isArray(resultData.recommendations) ? resultData.recommendations : [];
      if (!recs.length) {
        return h('p', { className: 'font-body text-body text-mid-gray' }, 'Không có môn học nào cần cải thiện theo xếp hạng ROI hiện tại.');
      }
      const totalGain = sumBy(recs, (r) => r.potentialCpaGain);
      const top = recs[0];
      return h(
        'div',
        { className: 'space-y-space-sm' },
        h(
          'div',
          { className: 'grid grid-cols-1 sm:grid-cols-3 gap-space-sm' },
          statBlock('Môn được đề xuất', String(recs.length)),
          statBlock('CPA tăng tối đa', Number.isFinite(totalGain) ? `+${totalGain.toFixed(2)}` : '—'),
          statBlock('Khuyên dùng số 1', top.courseCode || '—', top.courseName)
        ),
        h(
          'div',
          { className: 'space-y-space-xs' },
          recs.map((r, idx) =>
            h(
              'div',
              { key: r.courseCode || idx, className: 'flex items-center justify-between gap-space-sm px-space-md py-2.5 rounded-2xl bg-surface-alt' },
              h(
                'div',
                { className: 'min-w-0' },
                h('p', { className: 'font-body-medium text-body-medium text-ink truncate' }, `${r.courseName} (${r.courseCode})`),
                h(
                  'p',
                  { className: 'font-caption text-caption text-mid-gray' },
                  `${r.credits} tín chỉ · Cải thiện từ ${r.currentGrade} lên ${r.targetGrade}${r.rationale ? ` · ${r.rationale}` : ''}`
                )
              ),
              h(
                'div',
                { className: 'shrink-0 text-right' },
                h('p', { className: 'font-body-medium text-body-medium font-semibold text-ink' }, Number.isFinite(Number(r.potentialCpaGain)) ? `+${Number(r.potentialCpaGain).toFixed(2)} CPA` : '—'),
                r.badge ? h('p', { className: 'font-caption text-caption text-mid-gray' }, r.badge) : null
              )
            )
          )
        )
      );
    }

    if (activeScenario === 'target') {
      const achievable = resultData.achievable !== undefined ? Boolean(resultData.achievable) : Number(resultData.requiredAverageGpa) <= 4;
      const requirements = Array.isArray(resultData.courseRequirements) ? resultData.courseRequirements : [];
      const warnings = Array.isArray(resultData.feasibilityWarnings) ? resultData.feasibilityWarnings : [];
      return h(
        'div',
        { className: 'space-y-space-sm' },
        h(
          'div',
          { className: 'grid grid-cols-1 sm:grid-cols-3 gap-space-sm' },
          statBlock('CPA mục tiêu', fmt2(resultData.targetCpa ?? targetCpa), resultData.targetRankLabel),
          statBlock('GPA tối thiểu cần đạt', fmt2(resultData.requiredAverageGpa)),
          statBlock('Tín chỉ còn lại', resultData.remainingCredits !== undefined ? `${resultData.remainingCredits} TC` : '—')
        ),
        h(
          'div',
          { className: `flex items-start gap-2 font-body-medium text-body-medium ${achievable ? 'text-ink' : 'text-ember'}` },
          icon(achievable ? 'check_circle' : 'warning', 'text-[18px]'),
          h(
            'span',
            null,
            achievable
              ? `Cần đạt GPA trung bình tối thiểu ${fmt2(resultData.requiredAverageGpa)} trong ${resultData.remainingCredits ?? calc.remainingCredits} tín chỉ còn lại.`
              : 'Mục tiêu hiện không khả thi với số tín chỉ còn lại.'
          )
        ),
        resultData.allocationSummary ? h('p', { className: 'font-body text-body text-mid-gray' }, resultData.allocationSummary) : null,
        requirements.length
          ? h(
              'div',
              { className: 'space-y-space-xs' },
              requirements.map((r, idx) =>
                h(
                  'div',
                  { key: r.courseCode || idx, className: 'flex items-center justify-between gap-space-sm px-space-md py-2.5 rounded-2xl bg-surface-alt' },
                  h(
                    'div',
                    { className: 'min-w-0' },
                    h('p', { className: 'font-body-medium text-body-medium text-ink truncate' }, `${r.courseName} (${r.courseCode})`),
                    r.rationale ? h('p', { className: 'font-caption text-caption text-mid-gray' }, r.rationale) : null
                  ),
                  h('span', { className: 'shrink-0 px-2.5 py-1 rounded-full bg-paper font-label text-label font-semibold text-ink shadow-sm' }, r.requiredGrade || '—')
                )
              )
            )
          : null,
        warnings.map((w, idx) =>
          h(
            'div',
            { key: idx, className: 'flex items-start gap-2 font-caption text-caption text-ember' },
            icon('warning', 'text-[16px]'),
            h('span', null, w)
          )
        )
      );
    }

    // Học vượt
    const accelerated = resultData.mode === 'ACCELERATED_3_5_YEARS';
    return h(
      'div',
      { className: 'space-y-space-sm' },
      h(
        'div',
        { className: 'flex items-start gap-2 font-body-medium text-body-medium text-ink' },
        icon(accelerated ? 'check_circle' : 'info', 'text-[18px]'),
        h('span', null, accelerated ? `Khả thi tốt nghiệp trong ${resultData.targetTimeline}` : `Giữ lộ trình ${resultData.targetTimeline}`)
      ),
      h(
        'div',
        { className: 'grid grid-cols-1 sm:grid-cols-3 gap-space-sm' },
        statBlock('Tín chỉ kỳ hè', `${resultData.summerCredits ?? 0} / ${resultData.maxSummerCredits ?? SUMMER_MAX_CREDITS} TC`),
        statBlock('Học kỳ chính còn lại', String(resultData.regularSemesters ?? '—')),
        statBlock('Thời gian rút ngắn', `${resultData.savedMonths ?? 0} tháng`)
      ),
      resultData.rationale ? h('p', { className: 'font-body text-body text-mid-gray' }, resultData.rationale) : null,
      accelerated
        ? h(
            'p',
            { className: 'font-caption text-caption text-mid-gray' },
            `Đăng ký ${resultData.summerCredits} TC học phần Thực tập doanh nghiệp vào kỳ hè giúp rút ngắn 1 kỳ học chính.`
          )
        : null
    );
  };

  const resultCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Kết quả phân tích & dự báo mô phỏng',
      subtitle: activeResult
        ? `Kết quả dựa trên thuật toán tối ưu học vụ HaUI • Cập nhật lúc ${activeResult.at}`
        : 'Kết quả dựa trên thuật toán tối ưu học vụ HaUI',
      right: activeResult && !loading && !activeError
        ? h(
            'span',
            { className: `${PILL} whitespace-nowrap` },
            activeResult.source === 'server' ? 'Máy chủ' : 'Cục bộ'
          )
        : null
    }),
    loading
      ? h(
          'div',
          { className: 'py-space-xl flex flex-col items-center text-center gap-space-sm', role: 'status' },
          icon('progress_activity', 'text-[28px] text-ink animate-spin'),
          h('p', { className: 'font-body text-body text-mid-gray' }, 'Đang tính toán mô phỏng kịch bản What-if...')
        )
      : activeError
        ? h(
            'div',
            { className: 'p-space-md rounded-2xl bg-canvas flex items-start gap-space-md', role: 'alert' },
            h('span', { className: 'w-10 h-10 rounded-full bg-paper flex items-center justify-center shrink-0 text-ember' }, icon('error', 'text-[20px]')),
            h(
              'div',
              { className: 'min-w-0 flex-1 space-y-1' },
              h('p', { className: 'font-body-medium text-body-medium font-semibold text-ember' }, 'Lỗi mô phỏng kịch bản What-if'),
              h('p', { className: 'font-body text-body text-ink' }, activeError.message),
              (activeError.details || [])
                .filter((d) => d && d !== activeError.message)
                .map((d, idx) => h('p', { key: idx, className: 'font-caption text-caption text-mid-gray' }, d)),
              h('p', { className: 'font-caption text-caption text-mid-gray' }, `Mã lỗi: ${activeError.code}`),
              h(
                'button',
                { type: 'button', onClick: handleRunSimulation, className: `${BTN_SOFT} mt-space-xs bg-paper` },
                icon('refresh'),
                h('span', null, 'Thử lại')
              )
            )
          )
        : !resultData
          ? h(
              'div',
              { className: 'py-space-lg flex flex-col items-center text-center gap-space-xs' },
              h('span', { className: 'w-10 h-10 rounded-full bg-canvas flex items-center justify-center text-mid-gray' }, icon('query_stats', 'text-[20px]')),
              h('p', { className: 'font-body-medium text-body-medium text-ink' }, 'Chưa có kết quả mô phỏng'),
              h('p', { className: 'font-caption text-caption text-mid-gray max-w-sm' }, 'Nhấn nút "Tính toán kết quả" để hệ thống xử lý số liệu cho chế độ đang chọn.'),
              h(
                'button',
                { type: 'button', onClick: handleRunSimulation, className: `${BTN_SOFT} mt-space-xs` },
                icon('calculate'),
                h('span', null, 'Tính toán ngay')
              )
            )
          : renderResultBody(),
    activeResult && !loading && !activeError
      ? h(
          'div',
          { className: 'flex flex-wrap items-center justify-between gap-space-sm pt-space-sm border-t border-canvas' },
          h('span', { className: 'font-caption text-caption text-mid-gray' }, 'Nạp kết quả này thành đề xuất cho Kế hoạch học tập (bản nháp).'),
          h(
            'button',
            { type: 'button', onClick: handleApplyToPlanner, className: `${BTN_PRIMARY} ml-auto` },
            icon('playlist_add_check'),
            h('span', null, 'Áp dụng vào Kế hoạch học tập')
          )
        )
      : null
  );

  // ----- Cột phải: biểu đồ, độ khả thi, kịch bản đã lưu -----

  const chartCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Tiến trình CPA: Thực tế vs Mô phỏng',
      subtitle: 'Xu hướng tích lũy từ HK1 đến kết thúc khóa học',
      right: h('span', { className: 'w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-ink shrink-0' }, icon('show_chart'))
    }),
    h(
      'div',
      { className: 'relative w-full pt-space-sm pb-space-xs' },
      baseLoading
        ? h('div', { className: 'w-full aspect-[46/22] rounded-2xl bg-canvas animate-pulse', 'aria-hidden': 'true' })
        : chartPoints.length
          ? renderProgressChart({ points: chartPoints, focusIndex: chartFocusIndex, hoverIndex, onHover: setHoverIndex })
          : h(
              'div',
              { className: 'w-full aspect-[46/22] rounded-2xl bg-surface-alt flex flex-col items-center justify-center gap-space-xs text-center' },
              icon('show_chart', 'text-[20px] text-mid-gray'),
              h('p', { className: 'font-caption text-caption text-mid-gray' }, 'Chưa có dữ liệu CPA để vẽ biểu đồ.')
            )
    ),
    h(
      'div',
      { className: 'flex flex-wrap items-center justify-between gap-x-space-sm gap-y-1 pt-space-xs border-t border-canvas font-caption text-caption text-mid-gray' },
      h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'w-3.5 h-0.5 bg-ink rounded-full' }), h('span', { className: 'text-ink font-medium' }, actualLegend)),
      h(
        'div',
        { className: 'flex items-center gap-2' },
        h('span', { className: 'w-3.5 h-0.5 border-b-2 border-dashed border-ink' }),
        h('span', { className: 'text-ink font-medium' }, projectionLegend)
      ),
      h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'w-2 h-2 rounded-full bg-mid-gray' }), h('span', null, `Ngưỡng Giỏi: ${HONOR_THRESHOLD.toFixed(2)}`))
    )
  );

  // Lời khuyên tối ưu lộ trình (sinh từ kết quả sandbox)
  const coursePoints = simCourses.map((c) => gradePoint(c.expectedGrade));
  const adviceChildren = [
    ...(coursePoints.length
      ? [
          calc.simCpa === null ? 'Để hoàn thành học kỳ' : 'Để đạt CPA ',
          calc.simCpa === null ? '' : strong(fmt2(calc.simCpa)),
          ', bạn chỉ cần giữ mức điểm từ ',
          strong(`${Math.min(...coursePoints).toFixed(1)} – ${Math.max(...coursePoints).toFixed(1)}`),
          ` ở ${coursePoints.length} môn của ${semShort}. `
        ]
      : ['Chưa có môn học nào trong học kỳ dự phóng — hãy thêm môn học giả lập để bắt đầu. ']),
    ...(adviceCandidate && advicePct > 0
      ? [
          adviceCandidate.selected ? 'Nhờ kết hợp học lại môn ' : 'Nếu kết hợp học lại môn ',
          h('em', { className: 'text-ink font-medium not-italic' }, `${adviceCandidate.courseName} (${adviceCandidate.courseCode})`),
          `, áp lực điểm ở ${semShort} ${adviceCandidate.selected ? 'đã giảm' : 'sẽ giảm'} đi `,
          strong(`${advicePct}%`),
          '. '
        ]
      : []),
    ...(targetGap === null
      ? []
      : targetGap >= 0
      ? ['Kịch bản này đáp ứng mục tiêu CPA ', strong(fmt2(targetCpa)), ` (bằng ${targetRank.label}).`]
      : [
          'Kịch bản còn thiếu ',
          strong(Math.abs(targetGap).toFixed(2)),
          ` so với mục tiêu ${fmt2(targetCpa)} — hãy nâng điểm các môn nhiều tín chỉ hoặc học cải thiện thêm.`
        ])
  ];
  const feasibilityCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Phân tích độ nhạy & Khả thi',
      subtitle: 'Đánh giá áp lực học tập và tỷ lệ hoàn thành mục tiêu',
      right: icon('psychology', 'text-mid-gray text-[20px]')
    }),
    h(
      'div',
      { className: 'p-space-md rounded-2xl bg-canvas space-y-2' },
      h(
        'div',
        { className: 'flex items-center justify-between font-body-medium text-body-medium' },
        h('span', { className: 'text-ink font-medium' }, 'Độ khả thi kịch bản'),
        baseLoading
          ? skeleton('h-4 w-28 bg-hairline')
          : h(
              'span',
              { className: `font-semibold ${calc.feasibility < 40 ? 'text-ember' : 'text-ink'}` },
              `${feasibilityLabel(calc.feasibility)} (${calc.feasibility}%)`
            )
      ),
      h(
        'div',
        {
          className: 'w-full h-2 rounded-full bg-hairline overflow-hidden',
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': calc.feasibility
        },
        h('div', { className: 'h-full bg-ink rounded-full transition-all', style: { width: `${baseLoading ? 0 : calc.feasibility}%` } })
      ),
      h(
        'div',
        { className: 'flex justify-between font-caption text-caption text-mid-gray pt-1' },
        h('span', null, 'Thấp (0%)'),
        h('span', null, 'Cân bằng (50%)'),
        h('span', null, 'Rất tự tin (100%)')
      )
    ),
    h(
      'div',
      { className: 'p-space-md rounded-2xl bg-surface-alt space-y-space-xs' },
      h('div', { className: 'flex items-center gap-2 text-ink font-body-medium text-body-medium font-semibold' }, icon('lightbulb'), h('span', null, 'Lời khuyên tối ưu lộ trình')),
      baseLoading
        ? h('div', { className: 'space-y-2 pt-1', 'aria-hidden': 'true' }, skeleton('block h-3 w-full bg-hairline'), skeleton('block h-3 w-4/5 bg-hairline'))
        : h('p', { className: 'font-body text-body text-mid-gray leading-relaxed' }, ...adviceChildren)
    )
  );

  const savedScenariosCard = h(
    'div',
    { className: CARD },
    sectionHeader({
      title: 'Kịch bản đã lưu',
      right: savedScenarios.length
        ? h(
            'button',
            {
              type: 'button',
              onClick: () => setManageScenarios((v) => !v),
              className: 'font-caption text-caption font-medium text-mid-gray hover:text-ink transition-colors'
            },
            manageScenarios ? 'Xong' : `Quản lý (${savedScenarios.length})`
          )
        : null
    }),
    savedScenarios.length
      ? h(
          'div',
          { className: 'space-y-space-xs' },
          savedScenarios.map((s) => {
            const isActive = s.id === activeSavedId;
            return h(
              'div',
              {
                key: s.id,
                role: 'button',
                tabIndex: 0,
                onClick: () => !manageScenarios && handleApplyScenario(s),
                onKeyDown: (e) => {
                  if (!manageScenarios && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleApplyScenario(s);
                  }
                },
                className: `p-3.5 rounded-2xl flex items-center justify-between gap-space-sm cursor-pointer transition-colors ${
                  isActive ? 'bg-canvas hover:bg-surface-variant' : 'bg-surface-alt hover:bg-canvas'
                }`
              },
              h(
                'div',
                { className: 'flex items-center gap-space-sm min-w-0' },
                h('span', { className: `w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-ink' : 'bg-mid-gray'}` }),
                h(
                  'div',
                  { className: 'min-w-0' },
                  h('p', { className: `font-body-medium text-body-medium text-ink truncate ${isActive ? 'font-semibold' : 'font-medium'}` }, s.name),
                  h('p', { className: 'font-caption text-caption text-mid-gray truncate' }, scenarioSummary(s))
                )
              ),
              manageScenarios
                ? h(
                    'button',
                    {
                      type: 'button',
                      title: 'Xóa kịch bản',
                      onClick: (e) => {
                        e.stopPropagation();
                        handleDeleteScenario(s.id);
                      },
                      className: 'shrink-0 p-1 text-mid-gray hover:text-ember transition-colors'
                    },
                    icon('delete')
                  )
                : isActive
                  ? h('span', { className: 'shrink-0 px-2.5 py-1 rounded-full bg-paper text-ink font-label text-label font-medium shadow-sm' }, 'Đang xem')
                  : h(
                      'button',
                      {
                        type: 'button',
                        title: 'Áp dụng kịch bản',
                        onClick: (e) => {
                          e.stopPropagation();
                          handleApplyScenario(s);
                        },
                        className: 'shrink-0 p-1 text-mid-gray hover:text-ink transition-colors'
                      },
                      icon('play_circle')
                    )
            );
          })
        )
      : h(
          'div',
          { className: 'p-space-md rounded-2xl bg-surface-alt font-caption text-caption text-mid-gray' },
          'Chưa có kịch bản nào được lưu. Nhấn "Lưu kịch bản" để lưu thiết lập hiện tại.'
        )
  );

  // Bố cục cột trái theo chế độ
  const leftColumn =
    activeScenario === 'retake'
      ? [parameterCard, retakeRankingCard, resultCard]
      : activeScenario === 'target'
        ? [parameterCard, targetCalculatorCard, resultCard]
        : activeScenario === 'accelerate'
          ? [parameterCard, accelerateCard, resultCard]
          : [parameterCard, gradeTableCard, retakeCard, resultCard];

  // Thông báo nhanh
  const toastBar = toast
    ? h(
        'div',
        {
          role: 'status',
          className:
            'fixed bottom-space-xl left-1/2 -translate-x-1/2 z-50 flex items-center gap-space-sm max-w-[calc(100vw-2rem)] pl-4 pr-2 py-2 rounded-full bg-ink text-paper shadow-[0_8px_30px_rgba(0,0,0,0.16)] font-body-medium text-body-medium'
        },
        icon('check_circle'),
        h('span', { className: 'min-w-0' }, toast.message),
        toast.link
          ? h(Link, { to: toast.link.to, className: 'shrink-0 px-3 py-1 rounded-full bg-ink-soft hover:bg-paper hover:text-ink transition-colors font-label text-label' }, toast.link.label)
          : null,
        h(
          'button',
          {
            type: 'button',
            title: 'Đóng',
            onClick: () => setToast(null),
            className: 'shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-ink-soft transition-colors'
          },
          icon('close', 'text-[16px]')
        )
      )
    : null;

  // Điều khiển dev/kiểm thử (chỉ hiện trong panel công cụ dev)
  const devControls = DevSlot
    ? h(
        DevSlot,
        { title: 'What-if mô phỏng điểm' },
        h(
          'div',
          { className: 'flex flex-wrap gap-space-xs' },
          h(
            'button',
            {
              type: 'button',
              className: DEV_BTN,
              onClick: () => {
                setResults((prev) => ({ ...prev, [activeScenario]: null }));
                setError(null);
              }
            },
            'Xóa kết quả (Empty)'
          ),
          h(
            'button',
            {
              type: 'button',
              className: DEV_BTN,
              onClick: () => setError({ mode: activeScenario, code: 'ERR_SIM', message: 'Mô phỏng lỗi tính toán kịch bản.', details: [] })
            },
            'Mô phỏng Lỗi'
          )
        )
      )
    : null;

  return h(
    'div',
    { className: 'flex flex-col w-full' },
    h(
      'div',
      { className: 'w-full max-w-7xl mx-auto px-space-md lg:px-margin-desktop py-space-lg space-y-space-lg' },
      headerSection,
      sandboxNotice,
      metricsGrid,
      modeSwitcher,
      h(
        'div',
        { className: 'grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start' },
        h('div', { className: 'lg:col-span-7 space-y-space-lg' }, leftColumn.map((el, idx) => h(React.Fragment, { key: idx }, el))),
        h('div', { className: 'lg:col-span-5 space-y-space-lg' }, chartCard, feasibilityCard, savedScenariosCard)
      )
    ),
    toastBar,
    devControls
  );
}

export default WhatIfSimulatorPage;
