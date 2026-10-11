import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import { Button, EmptyState, Error as ErrorBox, Loading, Modal, Table } from '../components/ui/index.js';
import { DevSlot } from '../components/dev/DevTools.jsx';
import {
  classifyAcademicRank,
  getAcademicSnapshot,
  getDynamicAcademicStatus,
  getDynamicCurriculumTree,
  getDynamicGraduationAudit,
  subscribeAcademicStore
} from '../services/academicStore.js';

/**
 * Màn hình 1: Tổng quan học tập (`/` và `/dashboard`) — TV2 Web Host (prototype-v1)
 * Dựng theo prototype `tv3-planner-ui/design/prototype/tong_quan_hoc_tap`:
 * - Đầu trang: lời chào sinh viên (họ tên, mã SV, khóa, ngành) + 3 lối tắt (bảng điểm, kế hoạch, AI Cố Vấn).
 * - 4 thẻ chỉ số: GPA tích lũy (CPA), tín chỉ tích lũy, điểm rèn luyện, tiến độ chuẩn tốt nghiệp.
 * - Biểu đồ GPA & tín chỉ theo học kỳ (nhóm bảng điểm theo `semesterCode`) và tiến độ khối kiến thức.
 * - Bảng học phần đang học + môn nợ cần học lại gấp (MATH1002 với tài khoản có nguy cơ học vụ).
 * - Thẻ lời khuyên AI Advisor: cảnh báo học vụ, lộ trình đề xuất kỳ tới.
 * Số liệu lấy từ `academicStore` theo tài khoản đang chọn; khi gọi backend thật (LIVE) thì ưu tiên
 * `/academic/status`. Bộ chuyển trạng thái Loaded/Loading/Empty/Error, danh sách route TV3 đã mount,
 * thông tin runtime và modal Luồng phụ A nằm trong panel công cụ dev (DevSlot).
 */

/**
 * Mẫu dữ liệu Lộ trình đề xuất học kỳ kế tiếp (18 Tín chỉ — tuân thủ BR-03: 10–24 TC).
 * Môn đã đạt hoặc đang học trong bảng điểm được lọc bỏ khi hiển thị.
 */
const RECOMMENDED_NEXT_SEMESTER_COURSES = Object.freeze([
  {
    code: 'MATH1002',
    name: 'Toán rời rạc (Học lại gỡ nợ)',
    credits: 3,
    type: 'Tiên quyết / Gỡ gấp',
    reason: 'Gỡ môn nợ tiên quyết để mở khóa IT6001 và các môn sau'
  },
  {
    code: 'IT6001',
    name: 'Cấu trúc dữ liệu và Giải thuật',
    credits: 3,
    type: 'Bắt buộc ngành',
    reason: 'Môn cốt lõi Kỹ thuật phần mềm & CNTT'
  },
  {
    code: 'IT6005',
    name: 'Kiến trúc máy tính & Hợp ngữ',
    credits: 3,
    type: 'Cơ sở ngành',
    reason: 'Theo tiến độ chuẩn học kỳ 4'
  },
  {
    code: 'IT6012',
    name: 'Hệ điều hành',
    credits: 3,
    type: 'Cơ sở ngành',
    reason: 'Theo tiến độ chuẩn học kỳ 4'
  },
  {
    code: 'SE3001',
    name: 'Công nghệ phần mềm',
    credits: 3,
    type: 'Chuyên ngành',
    reason: 'Khởi đầu khối kiến thức chuyên sâu KTPM'
  },
  {
    code: 'EN2001',
    name: 'Tiếng Anh chuyên ngành CNTT 1',
    credits: 3,
    type: 'Điều kiện tốt nghiệp',
    reason: 'Đảm bảo tích lũy chuẩn đầu ra ngoại ngữ'
  }
]);

/**
 * Dữ liệu minh họa (DEMO) cho thông tin chưa có trong store: giảng viên phụ trách, đơn vị giảng dạy,
 * điểm đánh giá quá trình của học phần đang học.
 */
const DEMO_COURSE_META = Object.freeze({
  IT3004: { lecturer: 'ThS. Lê Hoàng Yến', unit: 'Khoa CNTT', processScore: 8.0 },
  IT3001: { lecturer: 'TS. Đỗ Ngọc Sơn', unit: 'Khoa CNTT', processScore: 7.5 },
  IT2001: { lecturer: 'TS. Trần Văn Minh', unit: 'Khoa CNTT', processScore: 8.5 },
  IT6001: { lecturer: 'PGS.TS. Phạm Quốc Hùng', unit: 'Khoa CNTT', processScore: null },
  MATH1001: { lecturer: 'ThS. Vũ Thị Mai', unit: 'Bộ môn Toán', processScore: null },
  MATH1002: { lecturer: 'ThS. Vũ Thị Mai', unit: 'Bộ môn Toán', processScore: null }
});
const DEMO_COURSE_META_FALLBACK = Object.freeze({ lecturer: null, unit: 'Khoa CNTT', processScore: null });

/** Lỗi minh họa khi xem trạng thái Error trong panel dev (không có lỗi thật từ API). */
const DEMO_SERVICE_ERROR = Object.freeze({
  title: 'Lỗi kết nối dịch vụ học vụ',
  message:
    'Máy chủ học vụ phản hồi mã lỗi 503 hoặc kết nối cơ sở dữ liệu tạm thời gián đoạn. Các tính năng tính toán CPA và kiểm tra điều kiện tiên quyết đang tạm dừng.',
  code: 'ACADEMIC_SERVICE_UNAVAILABLE',
  requestId: 'req-tv2-demo-err99',
  details: [
    'Backend Spring Boot: http://localhost:8080/api/v1/academic/status',
    'Database Connection Pool: Active (Retry queue: 1)',
    'Gợi ý: Nhấn "Thử lại kết nối" hoặc chuyển sang chế độ MOCK trong panel công cụ dev'
  ]
});

const DEV_STATES = Object.freeze([
  { id: 'loaded', label: 'Loaded' },
  { id: 'loading', label: 'Loading' },
  { id: 'empty', label: 'Empty' },
  { id: 'error', label: 'Error' }
]);

const COURSE_FILTERS = Object.freeze([
  { id: 'all', label: 'Tất cả học phần' },
  { id: 'in-progress', label: 'Đang học' },
  { id: 'attention', label: 'Cần chú ý (nợ môn)' }
]);

const CPA_WARNING_THRESHOLD = 2.0; // BR-07
const THESIS_MIN_CREDITS = 115; // BR-09
const CONDUCT_MIN_SCORE = 65;
const SEMESTER_MIN_CREDITS = 10; // BR-03
const SEMESTER_MAX_CREDITS = 24; // BR-03

const PILL_PRIMARY =
  'inline-flex items-center gap-2 bg-ink hover:bg-ink-soft text-paper px-4 py-2 rounded-full font-body-medium text-body-medium shadow-sm transition-all duration-150 active:scale-[0.98]';
const PILL_PAPER =
  'inline-flex items-center gap-2 bg-paper hover:bg-canvas text-ink px-4 py-2 rounded-full font-body-medium text-body-medium shadow-sm transition-all duration-150 border-0 active:scale-[0.98]';
const PILL_CANVAS =
  'inline-flex items-center gap-2 bg-canvas hover:bg-surface-container text-ink px-4 py-2 rounded-full font-body-medium text-body-medium transition-all duration-150 active:scale-[0.98]';
const CARD = 'bg-paper rounded-[24px] shadow-sm';

/* ------------------------------------------------------------------------- */
/* Hàm tính toán thuần (không phụ thuộc React)                                 */
/* ------------------------------------------------------------------------- */

function round2(value) {
  return Math.round(value * 100) / 100;
}

function formatPercent(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
}

function isFailedRecord(rec) {
  return rec.status === 'FAILED' || rec.letterGrade === 'F';
}

/** `2025_2` → { year: 2025, term: 2 } */
function parseSemesterCode(code) {
  const match = /^(\d{4})_(\d)$/.exec(String(code || ''));
  return match ? { year: Number(match[1]), term: Number(match[2]) } : null;
}

function describeSemester(code) {
  const parsed = parseSemesterCode(code);
  return parsed ? `Kỳ ${parsed.term} - Năm học ${parsed.year} - ${parsed.year + 1}` : `Kỳ ${code}`;
}

/** Nhóm bảng điểm theo `semesterCode`: tín chỉ đăng ký, GPA kỳ (null nếu chưa có điểm — Rule 5). */
function buildSemesterSeries(records = []) {
  const groups = new Map();
  for (const rec of records) {
    const key = rec.semesterCode || 'N/A';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rec);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, recs], index) => {
      let credits = 0;
      let gradedCredits = 0;
      let weightedPoints = 0;
      for (const rec of recs) {
        const c = Number(rec.credits || 0);
        credits += c;
        if (rec.score4 !== null && rec.score4 !== undefined) {
          gradedCredits += c;
          weightedPoints += c * Number(rec.score4);
        }
      }
      return {
        code,
        order: index + 1,
        credits,
        gradedCredits,
        weightedPoints,
        gpa: gradedCredits > 0 ? round2(weightedPoints / gradedCredits) : null,
        hasFailed: recs.some(isFailedRecord)
      };
    });
}

/** Biến động CPA giữa hai học kỳ có điểm gần nhất (tính lũy kế từ bảng điểm). */
function computeCpaTrend(series) {
  let points = 0;
  let credits = 0;
  const cumulative = [];
  for (const sem of series) {
    if (sem.gradedCredits <= 0) continue;
    points += sem.weightedPoints;
    credits += sem.gradedCredits;
    cumulative.push(points / credits);
  }
  if (cumulative.length < 2) return null;
  return round2(cumulative[cumulative.length - 1] - cumulative[cumulative.length - 2]);
}

function describeCpaTarget(cpa) {
  if (cpa === null || cpa === undefined) return 'Mục tiêu: —';
  if (cpa >= 3.6) return 'Giữ vững ≥ 3.60';
  if (cpa >= 3.2) return 'Mục tiêu: 3.60 - 4.00';
  if (cpa >= 2.5) return 'Mục tiêu: 3.20 - 3.59';
  if (cpa >= 2.0) return 'Mục tiêu: 2.50 - 3.19';
  return 'Mục tiêu: ≥ 2.00';
}

function classifyConduct(score) {
  if (score === null || score === undefined) return null;
  if (score >= 90) return 'Xuất sắc';
  if (score >= 80) return 'Tốt';
  if (score >= 65) return 'Khá';
  if (score >= 50) return 'Trung bình';
  return 'Yếu';
}

/** Chuẩn hóa khối kiến thức từ store (`blockName`, `completionPercentage`) hoặc API cũ (`name`, `percentage`). */
function normalizeKnowledgeBlock(block, index) {
  const earned = Number(block.earnedCredits ?? 0);
  const required = Number(block.requiredCredits ?? 0);
  const rawPct = block.completionPercentage ?? block.percentage ?? (required ? (earned / required) * 100 : 0);
  const name = String(block.blockName || block.name || `Khối ${index + 1}`).replace(/^\d+\.\s*/, '');
  return {
    id: block.blockCode || block.blockId || name,
    name,
    earned,
    required,
    pct: Math.round(Number(rawPct) * 10) / 10
  };
}

/**
 * Gom toàn bộ số liệu hiển thị của màn Tổng quan từ snapshot store (+ `/academic/status` khi LIVE).
 * @param {ReturnType<typeof getAcademicSnapshot>} snapshot
 * @param {Object|null} academicStatus
 */
function buildDashboardView(snapshot, academicStatus) {
  const { student, metrics } = snapshot;
  const records = snapshot.transcriptRecords || [];
  const live = academicStatus && academicStatus.__mock === false ? academicStatus : null;

  const cpa = live?.cpa ?? metrics.cpa;
  const accumulatedCredits = Number(live?.accumulatedCredits ?? metrics.accumulatedCredits ?? 0);
  const totalCreditsRequired = Number(live?.totalCreditsRequired ?? metrics.totalCreditsRequired ?? 135);
  const progressPercent = totalCreditsRequired
    ? Number(((accumulatedCredits / totalCreditsRequired) * 100).toFixed(1))
    : 0;
  const rankInfo = live ? classifyAcademicRank(cpa) : metrics.rankInfo;
  const cpaBelowThreshold = cpa !== null && cpa !== undefined && cpa < CPA_WARNING_THRESHOLD;

  const hasTranscript = records.length > 0 || (Boolean(student.hasTranscript) && accumulatedCredits > 0);

  // Biểu đồ theo học kỳ
  const semesters = buildSemesterSeries(records);
  // Bình quân tín chỉ mỗi kỳ theo đúng các cột của biểu đồ (tổng tín chỉ đăng ký / số học kỳ)
  const avgCreditsPerSemester = semesters.length
    ? semesters.reduce((sum, s) => sum + s.credits, 0) / semesters.length
    : 0;
  const firstSem = parseSemesterCode(semesters[0]?.code);
  const lastSem = parseSemesterCode(semesters[semesters.length - 1]?.code);
  const chartYears = firstSem && lastSem ? `${firstSem.year} - ${lastSem.year + 1}` : null;
  const cohortEndYear = /(\d{4})\s*\)\s*$/.exec(String(student.cohort || ''))?.[1];

  // Học phần đang học & môn nợ (kèm môn bị chặn theo cây môn học)
  const tree = getDynamicCurriculumTree();
  const unlocksOf = (code) =>
    (tree.courses || [])
      .filter((course) => (course.prerequisites || []).includes(code))
      .map((course) => ({ code: course.courseCode, name: course.courseName }));
  const inProgressCourses = metrics.inProgressCourses || [];
  const failedCourses = (metrics.failedCourses || []).map((rec) => ({ ...rec, unlocks: unlocksOf(rec.courseCode) }));
  const currentSemesterCode =
    inProgressCourses[inProgressCourses.length - 1]?.semesterCode || semesters[semesters.length - 1]?.code;

  // Khối kiến thức
  const rawBlocks =
    Array.isArray(live?.knowledgeBlocks) && live.knowledgeBlocks.length
      ? live.knowledgeBlocks
      : getDynamicAcademicStatus().knowledgeBlocks || [];
  const knowledgeBlocks = rawBlocks.map(normalizeKnowledgeBlock);

  // Kiểm toán tốt nghiệp (cùng nguồn với màn /audit)
  const audit = getDynamicGraduationAudit();
  const checklist = audit.checklist || [];
  const findCheck = (id) => checklist.find((item) => item.id === id);
  const completedChecks = checklist.filter((item) => item.completed).length;
  const conductCheck = findCheck('CHK-07');
  const conductScore = conductCheck?.completed ? audit.trainingScore ?? null : null;

  // Lộ trình đề xuất kỳ tới
  const takenCodes = new Set(
    [...(metrics.passedCourses || []), ...inProgressCourses].map((rec) => rec.courseCode)
  );
  const failedCodes = new Set(failedCourses.map((rec) => rec.courseCode));
  const recommendedCourses = RECOMMENDED_NEXT_SEMESTER_COURSES.filter((c) => !takenCodes.has(c.code)).map(
    (c) => ({ ...c, urgent: failedCodes.has(c.code) })
  );
  const recommendedCredits = recommendedCourses.reduce((sum, c) => sum + c.credits, 0);

  const cohortShort = String(student.cohort || '').split(' ')[0] || '';
  const majorShort = String(student.advisorClass || '').split(/\d/)[0] || '';

  return {
    student,
    hasTranscript,
    cpa,
    cpaBelowThreshold,
    rankLabel: String(rankInfo?.rank || 'Chưa xếp loại').split(' (')[0],
    cpaTarget: describeCpaTarget(cpa),
    cpaTrend: computeCpaTrend(semesters),
    accumulatedCredits,
    totalCreditsRequired,
    progressPercent,
    remainingCredits: Math.max(0, totalCreditsRequired - accumulatedCredits),
    programLabel: `Chương trình ${majorShort} ${cohortShort}`.trim(),
    academicWarning: live?.academicWarning ?? metrics.academicWarning,
    semesters,
    avgCreditsPerSemester,
    chartYears,
    expectedGraduation: cohortEndYear ? `Tháng 06/${cohortEndYear}` : '—',
    currentSemesterLabel: currentSemesterCode ? describeSemester(currentSemesterCode) : 'Học kỳ hiện tại',
    nextSemesterNumber: semesters.length + 1,
    inProgressCourses,
    inProgressCredits: inProgressCourses.reduce((sum, rec) => sum + Number(rec.credits || 0), 0),
    failedCourses,
    knowledgeBlocks,
    graduation: {
      completed: completedChecks,
      total: checklist.length,
      pct: checklist.length ? Math.round((completedChecks / checklist.length) * 1000) / 10 : 0,
      foreignLanguageOk: Boolean(findCheck('CHK-04')?.completed),
      itStandardOk: Boolean(findCheck('CHK-05')?.completed),
      thesisEligible: Boolean(audit.eligibleForThesis)
    },
    conduct: {
      score: conductScore,
      rank: classifyConduct(conductScore),
      eligible: Boolean(conductCheck?.completed)
    },
    thesisGap: Math.max(0, THESIS_MIN_CREDITS - accumulatedCredits),
    recommendedCourses,
    recommendedCredits
  };
}

/* ------------------------------------------------------------------------- */
/* Thành phần trình bày                                                        */
/* ------------------------------------------------------------------------- */

function ProgressBar({ percent, height = 'h-1.5', fillClass = 'bg-ink' }) {
  const width = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className={`w-full bg-canvas ${height} rounded-full overflow-hidden`}>
      <div className={`${fillClass} h-full rounded-full transition-all duration-700`} style={{ width: `${width}%` }} />
    </div>
  );
}

function StatPill({ children, className = '', title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 font-label text-label bg-canvas px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${className || 'text-ink'}`}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, unit, badge, footLeft, footRight, percent }) {
  return (
    <div className={`${CARD} p-5 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-caption text-caption text-mid-gray uppercase tracking-wider">{label}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-headline text-headline text-ink font-semibold tracking-tight">{value}</span>
            <span className="font-body text-body text-mid-gray">{unit}</span>
          </div>
        </div>
        {badge}
      </div>
      <div className="mt-4 pt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 font-caption text-caption">
          {footLeft}
          {footRight}
        </div>
        <ProgressBar percent={percent} />
      </div>
    </div>
  );
}

function DashboardHeader({ student }) {
  const cohort = String(student?.cohort || '').replace(/^K/, '');
  return (
    <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
      <div className="flex flex-col gap-1.5">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ink" />
          <span className="font-label text-label uppercase tracking-widest text-mid-gray">
            Cổng Thông Tin Học Vụ Đại Học Công Nghiệp Hà Nội
          </span>
        </div>
        <h1 className="font-headline text-headline text-ink font-semibold tracking-tight">Tổng quan học tập</h1>
        <p className="font-body text-body text-mid-gray max-w-2xl">
          Chào <strong className="text-ink font-medium">{student?.fullName}</strong> (Mã SV: {student?.studentId}) ·
          Khóa {cohort} ngành {student?.majorName} · {student?.faculty}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Link to="/transcript" className={PILL_PRIMARY}>
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>Cập nhật bảng điểm</span>
        </Link>
        <Link to="/planner" className={PILL_PAPER}>
          <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
          <span>Lập kế hoạch kỳ tới</span>
        </Link>
        <Link to="/chat" className={PILL_CANVAS}>
          <span className="material-symbols-outlined text-[18px]">smart_toy</span>
          <span>Hỏi AI Cố Vấn</span>
        </Link>
      </div>
    </section>
  );
}

/** Biểu đồ SVG: cột = tín chỉ đăng ký mỗi kỳ, đường = GPA kỳ (hệ 4). Kỳ GPA < 2.00 đánh dấu ember. */
function GpaCreditChart({ semesters }) {
  const count = Math.max(1, semesters.length);
  const step = 600 / count;
  const maxCredits = Math.max(1, ...semesters.map((s) => s.credits));
  const gpaToY = (gpa) => 150 - (gpa / 4) * 130;

  const points = semesters
    .map((s, i) => ({ ...s, cx: step * (i + 0.5) }))
    .filter((s) => s.gpa !== null)
    .map((s) => ({ ...s, cy: gpaToY(s.gpa) }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].cx} 155 L ${points[0].cx} 155 Z`
    : '';

  return (
    <div className="w-full pt-4 pb-2">
      <div className="relative w-full h-48">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
          <div className="w-full border-t border-hairline" />
          <div className="w-full border-t border-hairline" />
          <div className="w-full border-t border-hairline" />
          <div className="w-full border-t border-hairline" />
        </div>
        <svg
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          viewBox="0 0 600 160"
          role="img"
          aria-label="Biểu đồ GPA kỳ và số tín chỉ theo học kỳ"
        >
          <defs>
            <linearGradient id="dashboardGpaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {semesters.map((s, i) => {
            const barHeight = Math.max(6, (s.credits / maxCredits) * 105);
            return (
              <rect
                key={s.code}
                fill="#f5f5f5"
                height={barHeight}
                rx="6"
                width="30"
                x={step * (i + 0.5) - 15}
                y={155 - barHeight}
              />
            );
          })}
          {points.length > 1 && <path d={areaPath} fill="url(#dashboardGpaGradient)" />}
          {points.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#0a0a0a"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          )}
          {points.map((p, i) => {
            const isLast = i === points.length - 1;
            const color = p.gpa < CPA_WARNING_THRESHOLD ? '#e7000b' : '#0a0a0a';
            return isLast ? (
              <circle key={p.code} cx={p.cx} cy={p.cy} fill={color} r="5.5" stroke="#ffffff" strokeWidth="2" />
            ) : (
              <circle key={p.code} cx={p.cx} cy={p.cy} fill={color} r="4.5" />
            );
          })}
        </svg>
      </div>
      <div
        className="grid text-center pt-3 font-caption text-caption"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {semesters.map((s) => (
          <div
            key={s.code}
            className="flex flex-col gap-0.5"
            title={
              s.gpa === null
                ? 'Đang học — GPA kỳ chưa khóa sổ (giữ null, không gán 0)'
                : s.gpa < CPA_WARNING_THRESHOLD
                  ? `Học kỳ ${s.code}: GPA kỳ dưới 2.00`
                  : `Học kỳ ${s.code}`
            }
          >
            <span
              className={`font-semibold ${
                s.gpa === null ? 'text-mid-gray' : s.gpa < CPA_WARNING_THRESHOLD ? 'text-ember' : 'text-ink'
              }`}
            >
              {s.gpa === null ? '—' : s.gpa.toFixed(2)}
            </span>
            <span className="text-mid-gray">
              HK {s.order} ({s.credits}TC)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col w-full gap-y-8" aria-busy="true" aria-label="Đang tải tổng quan học tập">
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="flex flex-col gap-2.5 w-full max-w-2xl">
          <div className="haui-skeleton-box h-3 w-72 rounded-full" />
          <div className="haui-skeleton-box h-8 w-80 rounded-full" />
          <div className="haui-skeleton-box h-4 w-full rounded-full" />
        </div>
        <div className="flex gap-2.5">
          <div className="haui-skeleton-box h-9 w-44 rounded-full" />
          <div className="haui-skeleton-box h-9 w-44 rounded-full" />
          <div className="haui-skeleton-box h-9 w-36 rounded-full" />
        </div>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className={`${CARD} p-5 flex flex-col gap-3`}>
            <div className="haui-skeleton-box h-3 w-28 rounded-full" />
            <div className="haui-skeleton-box h-9 w-24 rounded-full" />
            <div className="haui-skeleton-box h-3 w-full rounded-full mt-4" />
            <div className="haui-skeleton-box h-1.5 w-full rounded-full" />
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-7 ${CARD} p-6 flex flex-col gap-4`}>
          <div className="haui-skeleton-box h-5 w-72 rounded-full" />
          <div className="haui-skeleton-box h-3 w-96 max-w-full rounded-full" />
          <div className="haui-skeleton-box h-64 w-full rounded-[16px]" />
        </div>
        <div className={`lg:col-span-5 ${CARD} p-6 flex flex-col gap-4`}>
          <div className="haui-skeleton-box h-5 w-56 rounded-full" />
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <div className="haui-skeleton-box h-3 w-full rounded-full" />
              <div className="haui-skeleton-box h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </section>
      <section className={`${CARD} p-6 flex flex-col gap-4`}>
        <div className="haui-skeleton-box h-5 w-96 max-w-full rounded-full" />
        <div className="haui-skeleton-box h-11 w-full rounded-[16px]" />
        {[0, 1, 2].map((key) => (
          <div key={key} className="haui-skeleton-box h-10 w-full rounded-[12px]" />
        ))}
      </section>
      <section className={`${CARD} p-6 flex gap-4`}>
        <div className="haui-skeleton-box h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-2.5 w-full">
          <div className="haui-skeleton-box h-5 w-72 rounded-full" />
          <div className="haui-skeleton-box h-3 w-full rounded-full" />
          <div className="haui-skeleton-box h-3 w-2/3 rounded-full" />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Trang                                                                       */
/* ------------------------------------------------------------------------- */

export function DashboardPage({ mountedRouteSummary }) {
  const navigate = useNavigate();

  // Trạng thái xem thử của màn (điều khiển từ panel dev): 'loaded' | 'loading' | 'empty' | 'error'
  const [componentState, setComponentState] = useState('loaded');

  const [snapshot, setSnapshot] = useState(() => getAcademicSnapshot());
  const [academicStatus, setAcademicStatus] = useState(null);
  const [bootstrapInfo, setBootstrapInfo] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bộ lọc bảng học phần
  const [courseFilter, setCourseFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Luồng phụ A: Nhập & Đồng bộ Bảng điểm (Bước A1 -> A4, FR-02, AC-01) — mở từ panel dev
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState(null);
  const [ingestResult, setIngestResult] = useState(null);
  const [ingestConfirmed, setIngestConfirmed] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, bootRes, healthRes] = await Promise.all([
        api.academic.getStatus(),
        api.system.getBootstrap(),
        api.system.getHealth()
      ]);
      setAcademicStatus(statusRes);
      setBootstrapInfo(bootRes);
      setHealthInfo(healthRes);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const unsubStore = subscribeAcademicStore((nextSnapshot) => {
      setSnapshot(nextSnapshot || getAcademicSnapshot());
      loadDashboardData();
    });
    const unsubApi = api.subscribe(() => {
      loadDashboardData();
    });
    return () => {
      unsubStore();
      unsubApi();
    };
  }, [loadDashboardData]);

  // Xử lý Bước A2 & A3: Tải file bảng điểm PDF/Ảnh từ e-HaUI hoặc mô phỏng lỗi định dạng file
  const handleRunTranscriptIngestion = async (options = {}) => {
    setIngestLoading(true);
    setIngestError(null);
    setIngestConfirmed(false);
    try {
      const res = await api.academic.ingestTranscript({
        fileName: options.fileName || 'Bang_Diem_Ca_Nhan_eHaUI_K17.pdf',
        invalidFormat: Boolean(options.invalidFormat)
      });
      setIngestResult(res);
    } catch (err) {
      setIngestResult(null);
      setIngestError(err);
    } finally {
      setIngestLoading(false);
    }
  };

  const handleOpenIngestModal = () => {
    setIsIngestModalOpen(true);
    if (!ingestResult && !ingestError) {
      handleRunTranscriptIngestion({ fileName: 'Bang_Diem_eHaUI_std-2026-001.pdf' });
    }
  };

  const handleSwitchState = (nextState) => {
    setComponentState(nextState);
    if (nextState === 'loaded' && error) {
      loadDashboardData();
    }
  };

  const handleRetry = () => {
    setComponentState('loaded');
    loadDashboardData();
  };

  const view = useMemo(() => buildDashboardView(snapshot, academicStatus), [snapshot, academicStatus]);

  const courseRows = useMemo(() => {
    const rows = [
      ...view.inProgressCourses.map((record) => ({ kind: 'in-progress', record })),
      ...view.failedCourses.map((record) => ({ kind: 'failed', record }))
    ];
    if (courseFilter === 'in-progress') return rows.filter((row) => row.kind === 'in-progress');
    if (courseFilter === 'attention') return rows.filter((row) => row.kind === 'failed');
    return rows;
  }, [view, courseFilter]);

  const routes = mountedRouteSummary?.routes || [];

  /* ---------------------------- Panel dev ---------------------------- */
  const devControls = (
    <DevSlot title="Trạng thái màn Tổng quan">
      <div
        className="haui-state-switcher flex-col items-stretch gap-space-sm p-0 bg-transparent border-0 rounded-none shadow-none"
        role="group"
        aria-label="Bộ chọn trạng thái giao diện mẫu"
      >
        <div className="haui-state-switcher__group grid grid-cols-4 gap-1">
          {DEV_STATES.map((state) => {
            const active = componentState === state.id;
            return (
              <button
                key={state.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleSwitchState(state.id)}
                className={`inline-flex items-center justify-center px-2 py-1 rounded-full font-label text-label border transition-colors ${
                  active ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink border-hairline hover:bg-canvas'
                }`}
              >
                {state.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleOpenIngestModal}
          className="inline-flex items-center gap-space-xs font-body text-body text-mid-gray hover:text-ink transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[16px]">document_scanner</span>
          Luồng phụ A: bóc tách bảng điểm nhanh
        </button>
        <details className="font-caption text-caption text-mid-gray">
          <summary className="cursor-pointer hover:text-ink">Route TV3 đã mount ({routes.length})</summary>
          <ul className="mt-1 flex flex-col gap-0.5 max-h-40 overflow-y-auto">
            {routes.map((route) => (
              <li key={route.path} className="flex items-center justify-between gap-2">
                <Link to={route.path} className="text-ink hover:underline truncate" title={route.title}>
                  {route.path}
                </Link>
                <span className="shrink-0">{route.status}</span>
              </li>
            ))}
          </ul>
        </details>
        <details className="font-caption text-caption text-mid-gray">
          <summary className="cursor-pointer hover:text-ink">
            Runtime: {healthInfo?.status || 'UNKNOWN'} (bootstrap / health)
          </summary>
          <pre className="mt-1 max-h-48 overflow-auto bg-canvas rounded-[12px] p-2 text-[11px] leading-4 text-ink whitespace-pre">
            {JSON.stringify(
              {
                bootstrap: bootstrapInfo,
                health: healthInfo,
                contractHandoff: mountedRouteSummary?.contractStatus
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>
    </DevSlot>
  );

  /* ------------------------ Modal Luồng phụ A ------------------------ */
  const ingestStatusPill = (status) => {
    const map = {
      PASSED: { text: 'Đạt', cls: 'text-ink', dot: 'bg-ink' },
      PASSED_LOW: { text: 'Điểm D/D+', cls: 'text-mid-gray', dot: 'bg-mid-gray' },
      FAILED: { text: 'Trượt (Nợ môn)', cls: 'text-ember font-medium', dot: 'bg-ember' },
      IN_PROGRESS: { text: 'Đang học (null)', cls: 'text-mid-gray', dot: 'bg-mid-gray/40' }
    };
    const pill = map[status] || { text: status, cls: 'text-mid-gray', dot: 'bg-mid-gray' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label text-label bg-canvas ${pill.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
        {pill.text}
      </span>
    );
  };

  const ingestModal = (
    <Modal
      isOpen={isIngestModalOpen}
      onClose={() => setIsIngestModalOpen(false)}
      size="lg"
      title="Luồng phụ A: Nhập & Đồng bộ Bảng điểm từ e-HaUI (FR-02 / AC-01)"
      subtitle="Bước A1 → A4: Tải file PDF/Ảnh bảng điểm e-HaUI, tự động bóc tách môn học & kiểm tra hợp lệ trước khi lưu"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => setIsIngestModalOpen(false)}>
            Đóng (ESC)
          </Button>
          {ingestResult && (
            <Button variant="primary" size="sm" onClick={() => setIngestConfirmed(true)}>
              {ingestConfirmed ? '✓ Đã xác nhận lưu dữ liệu' : 'Bước A4: Xác nhận lưu dữ liệu'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-space-md">
        <div className="flex flex-wrap gap-space-sm">
          <Button
            variant="primary"
            size="sm"
            loading={ingestLoading}
            onClick={() => handleRunTranscriptIngestion({ fileName: 'Bang_Diem_Ca_Nhan_eHaUI_K17.pdf' })}
          >
            Bước A2: Tải file PDF bảng điểm hợp lệ (AC-01)
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={ingestLoading}
            onClick={() =>
              handleRunTranscriptIngestion({ fileName: 'Bang_Diem_Loi_Dinh_Dang.docx', invalidFormat: true })
            }
          >
            Mô phỏng lỗi định dạng file (Mục 5 Edge Case)
          </Button>
          <Link to="/transcript" className={`${PILL_CANVAS} !py-1.5`} onClick={() => setIsIngestModalOpen(false)}>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Mở màn Nhập bảng điểm
          </Link>
        </div>

        {ingestLoading && (
          <Loading label="Bước A3: OCR / Parser đang bóc tách danh sách môn học, điểm thang 10, điểm chữ và điểm thang 4..." />
        )}

        {ingestError && !ingestLoading && (
          <ErrorBox
            title="Lỗi tải bảng điểm (Mục 5 Edge Cases)"
            error={ingestError}
            retryLabel="Tải lại file PDF chuẩn e-HaUI"
            onRetry={() => handleRunTranscriptIngestion({ fileName: 'Bang_Diem_Ca_Nhan_eHaUI_K17.pdf' })}
          />
        )}

        {ingestConfirmed && ingestResult && (
          <div className="flex items-start gap-2 bg-canvas rounded-[16px] px-4 py-3 font-body text-body text-ink">
            <span className="material-symbols-outlined text-[18px] mt-0.5">check_circle</span>
            <span>
              Đã xác nhận lưu dữ liệu bảng điểm cá nhân (<code>{ingestResult.dataRevision || 'rev-1001'}</code>). CPA tính
              toán = <strong className="font-medium">{ingestResult.extractedCpa}</strong>
              {(ingestResult.records || []).some(isFailedRecord) && (
                <>
                  {' '}
                  · phát hiện môn nợ:{' '}
                  <strong className="font-medium text-ember">
                    {(ingestResult.records || [])
                      .filter(isFailedRecord)
                      .map((rec) => rec.courseCode)
                      .join(', ')}
                  </strong>
                </>
              )}
              .
            </span>
          </div>
        )}

        {ingestResult && !ingestLoading && (
          <div className="flex flex-col gap-space-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 font-body text-body text-mid-gray">
              <span>
                File nguồn: <code className="text-ink">{ingestResult.sourceFileName}</code>
              </span>
              <span>
                CPA tính toán: <strong className="text-ink font-medium">{ingestResult.extractedCpa}</strong> · Tín chỉ:{' '}
                <strong className="text-ink font-medium">{ingestResult.extractedAccumulatedCredits} TC</strong>
              </span>
            </div>
            <Table
              columns={[
                { key: 'courseCode', title: 'Mã môn', width: '100px' },
                { key: 'courseName', title: 'Tên môn học' },
                { key: 'credits', title: 'TC', align: 'center', width: '60px' },
                { key: 'score10', title: 'Hệ 10', align: 'center', width: '80px' },
                { key: 'letterGrade', title: 'Điểm chữ', align: 'center', width: '90px' },
                { key: 'score4', title: 'Hệ 4', align: 'center', width: '80px' },
                { key: 'status', title: 'Phân loại (FR-04)', width: '150px', render: ingestStatusPill }
              ]}
              data={ingestResult.records || []}
              rowKey="courseCode"
              striped
            />
          </div>
        )}
      </div>
    </Modal>
  );

  /* ------------------------- Nội dung theo trạng thái ------------------------- */
  const isLoadingView = componentState === 'loading' || (loading && componentState === 'loaded' && !academicStatus && !error);
  const isEmptyView = componentState === 'empty' || (componentState === 'loaded' && !error && !view.hasTranscript);
  const isErrorView = componentState === 'error' || (componentState === 'loaded' && Boolean(error));

  let content;
  if (isLoadingView) {
    content = <DashboardSkeleton />;
  } else if (isErrorView) {
    const shown = error
      ? {
          title: 'Không tải được dữ liệu tổng quan học tập',
          message: error.message,
          code: error.code,
          requestId: error.requestId,
          details: error.details || []
        }
      : DEMO_SERVICE_ERROR;
    content = (
      <div className="flex flex-col w-full gap-y-8">
        <DashboardHeader student={view.student} />
        <section
          className={`${CARD} border border-hairline p-6 flex flex-col md:flex-row gap-6 items-start justify-between`}
          role="alert"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-canvas text-ember flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">cloud_off</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-subheading text-subheading text-ink font-semibold tracking-tight">{shown.title}</h2>
                {shown.code && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label text-label bg-canvas text-ember">
                    <span className="w-1.5 h-1.5 rounded-full bg-ember" />
                    {shown.code}
                  </span>
                )}
              </div>
              <p className="font-body text-body text-mid-gray max-w-3xl">{shown.message}</p>
              {shown.details.length > 0 && (
                <ul className="flex flex-col gap-1 font-caption text-caption text-mid-gray">
                  {shown.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-mid-gray mt-1.5 shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
              {shown.requestId && (
                <span className="font-caption text-caption text-mid-gray">Request ID: {shown.requestId}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={handleRetry} className={`${PILL_PRIMARY} shrink-0 self-end md:self-center`}>
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Thử lại kết nối</span>
          </button>
        </section>
      </div>
    );
  } else if (isEmptyView) {
    content = (
      <div className="flex flex-col w-full gap-y-8">
        <DashboardHeader student={view.student} />
        <section className={`${CARD} p-6`}>
          <EmptyState
            className="bg-paper border-0 rounded-none py-12 gap-3 [&>div:first-child]:bg-canvas [&>div:first-child]:text-ink [&_h4]:font-subheading [&_h4]:text-subheading [&_h4]:text-ink [&_h4]:font-semibold [&_h4]:tracking-tight [&_p]:font-body [&_p]:text-body [&_p]:text-mid-gray [&_p]:max-w-xl"
            icon={<span className="material-symbols-outlined text-[26px]">upload_file</span>}
            title="Chưa có dữ liệu bảng điểm"
            description="Hệ thống chưa tìm thấy kết quả học tập của bạn. Tải lên bảng điểm cá nhân từ e-HaUI (PDF/ảnh) để HaUI Advisor tính GPA, tín chỉ tích lũy, tiến độ khối kiến thức và đề xuất lộ trình học tập."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <Link to="/transcript" className={PILL_PRIMARY}>
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  <span>Cập nhật bảng điểm</span>
                </Link>
                <Link to="/curriculum" className={PILL_CANVAS}>
                  <span className="material-symbols-outlined text-[18px]">account_tree</span>
                  <span>Xem sơ đồ cây môn</span>
                </Link>
              </div>
            }
          />
        </section>
      </div>
    );
  } else {
    const trend = view.cpaTrend;
    const filterLabel = COURSE_FILTERS.find((f) => f.id === courseFilter)?.label;
    const firstFailed = view.failedCourses[0];

    content = (
      <div className="flex flex-col w-full gap-y-8">
        <DashboardHeader student={view.student} />

        {/* 4 thẻ chỉ số */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            label="GPA Tích lũy"
            value={view.cpa !== null && view.cpa !== undefined ? Number(view.cpa).toFixed(2) : '—'}
            unit="/ 4.00"
            badge={
              trend !== null && (
                <StatPill title="Biến động CPA so với học kỳ trước (tính từ bảng điểm)">
                  <span className="material-symbols-outlined text-[14px]">
                    {trend >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  {trend >= 0 ? `+${trend.toFixed(2)}` : trend.toFixed(2)}
                </StatPill>
              )
            }
            footLeft={
              view.cpaBelowThreshold ? (
                <span
                  className="inline-flex items-center gap-1.5 text-ember font-medium"
                  title={view.academicWarning || 'CPA dưới 2.00 (BR-07)'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-ember shrink-0" />
                  Xếp loại: {view.rankLabel}
                </span>
              ) : (
                <span className="text-ink font-medium">Xếp loại: {view.rankLabel}</span>
              )
            }
            footRight={<span className="text-mid-gray text-right">{view.cpaTarget}</span>}
            percent={view.cpa ? (view.cpa / 4) * 100 : 0}
          />
          <StatCard
            label="Tín chỉ tích lũy"
            value={view.accumulatedCredits}
            unit={`/ ${view.totalCreditsRequired} TC`}
            badge={<StatPill>{formatPercent(view.progressPercent)}</StatPill>}
            footLeft={<span className="text-ink font-medium">{view.programLabel}</span>}
            footRight={<span className="text-mid-gray text-right">Còn thiếu {view.remainingCredits} TC</span>}
            percent={view.progressPercent}
          />
          <StatCard
            label="Điểm rèn luyện TB"
            value={view.conduct.score ?? '—'}
            unit="/ 100"
            badge={
              view.conduct.rank && (
                <StatPill>
                  <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                  Loại {view.conduct.rank}
                </StatPill>
              )
            }
            footLeft={
              view.conduct.eligible ? (
                <span className="text-ink font-medium">Đạt điều kiện tốt nghiệp</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-ember font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember shrink-0" />
                  Chưa đạt điều kiện
                </span>
              )
            }
            footRight={<span className="text-mid-gray text-right">Yêu cầu ≥ {CONDUCT_MIN_SCORE}</span>}
            percent={view.conduct.score ?? 0}
          />
          <StatCard
            label="Tiến độ chuẩn tốt nghiệp"
            value={view.graduation.completed}
            unit={`/ ${view.graduation.total} điều kiện`}
            badge={<StatPill>{formatPercent(view.graduation.pct)}</StatPill>}
            footLeft={
              <span className="text-ink font-medium">
                Ngoại ngữ: {view.graduation.foreignLanguageOk ? 'Đạt' : 'Chưa đạt'}
                <br />
                Tin học:{' '}
                {view.graduation.itStandardOk ? (
                  'Đạt'
                ) : (
                  <span className="text-ember">Chưa nộp</span>
                )}
              </span>
            }
            footRight={
              <span className="text-mid-gray text-right">
                Khóa luận: {view.graduation.thesisEligible ? 'Đủ ĐK' : 'Chờ'}
              </span>
            }
            percent={view.graduation.pct}
          />
        </section>

        {/* Biểu đồ GPA & tín chỉ + Cấu trúc khối kiến thức */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className={`lg:col-span-7 ${CARD} p-6 flex flex-col justify-between`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <h2 className="font-subheading text-subheading text-ink font-semibold tracking-tight">
                  Biến thiên GPA &amp; Tín chỉ theo {view.semesters.length} học kỳ
                </h2>
                <p className="font-caption text-caption text-mid-gray mt-0.5">
                  Quá trình phấn đấu từ Học kỳ 1 đến Học kỳ {view.semesters.length}
                  {view.chartYears ? ` (Năm học ${view.chartYears})` : ''}
                </p>
              </div>
              <div className="flex items-center gap-4 text-caption font-caption text-mid-gray self-start sm:self-auto">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-ink" />
                  GPA kỳ (Hệ 4)
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-sm bg-canvas" />
                  Số tín chỉ
                </span>
              </div>
            </div>
            <GpaCreditChart semesters={view.semesters} />
            <div className="pt-4 flex items-center justify-between gap-4 text-caption font-caption text-mid-gray">
              <span>
                Tích lũy bình quân:{' '}
                <strong className="text-ink font-medium">{view.avgCreditsPerSemester.toFixed(1)} TC/kỳ</strong>
              </span>
              <Link
                to="/audit"
                className="inline-flex items-center gap-1 text-ink font-medium hover:underline"
                title={
                  view.failedCourses.length
                    ? 'Đang nợ môn tiên quyết — nguy cơ chậm tiến độ tốt nghiệp nếu không học lại kỳ tới'
                    : 'Kiểm tra điều kiện tốt nghiệp'
                }
              >
                {view.failedCourses.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-ember" />}
                Dự kiến tốt nghiệp: {view.expectedGraduation}
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className={`lg:col-span-5 ${CARD} p-6 flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h2 className="font-subheading text-subheading text-ink font-semibold tracking-tight">
                  Cấu trúc khối kiến thức
                </h2>
                <span className="font-caption text-caption text-mid-gray whitespace-nowrap">
                  Đã tích lũy: {view.accumulatedCredits}/{view.totalCreditsRequired} TC
                </span>
              </div>
              <p className="font-caption text-caption text-mid-gray mb-5">
                Tiến độ hoàn thành {view.knowledgeBlocks.length} khối theo CTĐT ngành {view.student.majorName}
              </p>
              <div className="flex flex-col gap-4">
                {view.knowledgeBlocks.map((block) => {
                  const strong = block.pct >= 50;
                  return (
                    <div key={block.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2 font-caption text-caption">
                        <span className="text-ink font-medium">{block.name}</span>
                        <span className={`whitespace-nowrap ${strong ? 'text-ink font-semibold' : 'text-mid-gray'}`}>
                          {block.earned}/{block.required} TC ({formatPercent(block.pct)})
                        </span>
                      </div>
                      {block.pct > 0 ? (
                        <ProgressBar percent={block.pct} height="h-2" />
                      ) : (
                        <ProgressBar percent={4} height="h-2" fillClass="bg-mid-gray/40" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-4 flex items-center justify-between gap-2 font-caption text-caption">
              <span className="text-mid-gray">
                {view.knowledgeBlocks.some((b) => b.pct < 100)
                  ? `Còn ${view.knowledgeBlocks.filter((b) => b.pct < 100).length} khối chưa hoàn thành`
                  : 'Đã hoàn thành toàn bộ khối kiến thức'}
              </span>
              <Link to="/curriculum" className="text-ink font-medium hover:underline inline-flex items-center gap-1">
                Xem sơ đồ cây môn
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Học phần đang học & môn nợ cần học lại */}
        <section className={`${CARD} p-6 flex flex-col gap-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-subheading text-subheading text-ink font-semibold tracking-tight">
                  Học phần đang học ({view.currentSemesterLabel})
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label text-label bg-canvas text-ink">
                  {view.inProgressCourses.length} môn · {view.inProgressCredits} TC
                </span>
                {view.failedCourses.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label text-label bg-canvas text-ember">
                    <span className="w-1.5 h-1.5 rounded-full bg-ember" />
                    {view.failedCourses.length} môn nợ cần học lại
                  </span>
                )}
              </div>
              <p className="font-caption text-caption text-mid-gray mt-0.5">
                Theo dõi tiến độ điểm đánh giá thành phần và điều kiện tiên quyết chuyên ngành
              </p>
            </div>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isFilterOpen}
                onClick={() => setIsFilterOpen((open) => !open)}
                className={`inline-flex items-center gap-1 ${
                  courseFilter === 'all' ? 'text-mid-gray' : 'text-ink'
                } hover:text-ink font-caption text-caption px-3 py-1.5 bg-canvas rounded-full transition-colors`}
              >
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
                {courseFilter === 'all' ? 'Lọc môn học' : `Lọc: ${filterLabel}`}
              </button>
              {isFilterOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 z-10 w-56 bg-paper border border-hairline rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-1.5 flex flex-col"
                >
                  {COURSE_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={courseFilter === filter.id}
                      onClick={() => {
                        setCourseFilter(filter.id);
                        setIsFilterOpen(false);
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-full font-body text-body text-left transition-colors hover:bg-canvas ${
                        courseFilter === filter.id ? 'text-ink font-medium' : 'text-mid-gray'
                      }`}
                    >
                      {filter.label}
                      {courseFilter === filter.id && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left font-body text-body">
              <thead>
                <tr className="text-mid-gray font-caption text-caption uppercase tracking-wider bg-canvas/70">
                  <th className="py-3 px-4 rounded-l-xl font-medium">Mã &amp; Tên học phần</th>
                  <th className="py-3 px-3 font-medium">Tín chỉ</th>
                  <th className="py-3 px-4 font-medium">Giảng viên phụ trách</th>
                  <th className="py-3 px-4 font-medium">Đánh giá quá trình</th>
                  <th className="py-3 px-4 font-medium">Trạng thái / Lưu ý</th>
                  <th className="py-3 px-3 text-right rounded-r-xl font-medium">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {courseRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 px-4 text-center font-caption text-caption text-mid-gray">
                      {courseFilter === 'all'
                        ? 'Chưa có học phần đang học trong kỳ này.'
                        : 'Không có học phần phù hợp bộ lọc.'}
                    </td>
                  </tr>
                )}
                {courseRows.map(({ kind, record }) => {
                  const meta = DEMO_COURSE_META[record.courseCode] || DEMO_COURSE_META_FALLBACK;
                  const failed = kind === 'failed';
                  const unlocks = record.unlocks || [];
                  return (
                    <tr key={`${kind}-${record.courseCode}`} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-ink font-medium">{record.courseName}</span>
                            {failed && (
                              <span
                                className="w-2 h-2 rounded-full bg-ember inline-block shrink-0"
                                title="Môn tiên quyết quan trọng"
                              />
                            )}
                          </div>
                          <span className="font-caption text-caption text-mid-gray">
                            {record.courseCode} ·{' '}
                            {failed && unlocks.length
                              ? `Tiên quyết của ${unlocks.map((u) => u.code).join(', ')}`
                              : meta.unit}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-ink font-medium whitespace-nowrap">{record.credits} TC</td>
                      <td className="py-3.5 px-4 text-mid-gray">
                        {meta.lecturer || <span className="italic">Chưa phân công</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        {failed ? (
                          <div className="inline-flex items-center gap-1.5 bg-canvas px-2.5 py-1 rounded-full font-label text-label text-ink whitespace-nowrap">
                            <span>Tổng kết:</span>
                            <strong className="font-semibold text-ember">
                              {record.letterGrade || 'F'}
                              {record.score10 !== null && record.score10 !== undefined ? ` (${record.score10})` : ''}
                            </strong>
                          </div>
                        ) : meta.processScore !== null && meta.processScore !== undefined ? (
                          <div className="inline-flex items-center gap-1.5 bg-canvas px-2.5 py-1 rounded-full font-label text-label text-ink whitespace-nowrap">
                            <span>Quá trình:</span>
                            <strong className="font-semibold">{meta.processScore.toFixed(1)}</strong>
                          </div>
                        ) : (
                          <span className="font-caption text-caption text-mid-gray italic">Chưa công bố</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {failed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label text-label bg-canvas text-ember font-medium whitespace-nowrap">
                            Nợ môn · Học lại gấp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label text-label bg-canvas text-ink whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                            Đang học
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(failed ? '/planner' : '/curriculum')}
                          className="text-mid-gray hover:text-ink p-1 rounded-full hover:bg-canvas transition-colors"
                          title={failed ? 'Đưa vào Kế hoạch học kỳ tới' : 'Xem trên sơ đồ cây môn học'}
                          aria-label={`${failed ? 'Đưa vào kế hoạch' : 'Xem chi tiết'} ${record.courseCode}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Lời khuyên AI Advisor */}
        <section
          className={`${CARD} p-6 flex flex-col md:flex-row gap-6 items-start justify-between relative overflow-hidden`}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-subheading text-subheading text-ink font-semibold tracking-tight">
                  Lời khuyên từ AI Advisor cho bạn
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label text-label bg-canvas text-mid-gray">
                  Tối ưu hóa học kỳ
                </span>
              </div>
              <ul className="flex flex-col gap-2 font-body text-body text-mid-gray max-w-3xl">
                {view.failedCourses.slice(0, 2).map((rec) => (
                  <li key={`retake-${rec.courseCode}`} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-ember mt-0.5 shrink-0">info</span>
                    <span>
                      Bạn đang nợ học phần{' '}
                      <strong className="text-ink font-medium">
                        {rec.courseName} ({rec.courseCode})
                      </strong>
                      {rec.unlocks.length > 0 && (
                        <>
                          {' '}
                          – môn tiên quyết trực tiếp của{' '}
                          {rec.unlocks.map((u, index) => (
                            <React.Fragment key={u.code}>
                              {index > 0 && ', '}
                              <strong className="text-ink font-medium">
                                {u.name} ({u.code})
                              </strong>
                            </React.Fragment>
                          ))}
                        </>
                      )}
                      . Hãy học lại ngay kỳ tới để không bị hoãn dây chuyền các môn chuyên ngành.
                    </span>
                  </li>
                ))}
                {view.cpaBelowThreshold && (
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-ember mt-0.5 shrink-0">info</span>
                    <span>
                      CPA tích lũy <strong className="text-ink font-medium">{Number(view.cpa).toFixed(2)}</strong> đang
                      dưới ngưỡng <strong className="text-ink font-medium">2.00</strong> – Cảnh báo học vụ Mức 1
                      (BR-07). Dùng What-if để tính điểm mục tiêu cần đạt ở kỳ tới.
                    </span>
                  </li>
                )}
                {!firstFailed && !view.cpaBelowThreshold && view.academicWarning && (
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-ember mt-0.5 shrink-0">info</span>
                    <span>{view.academicWarning}</span>
                  </li>
                )}
                {!firstFailed && !view.cpaBelowThreshold && (
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-ink mt-0.5 shrink-0">check_circle</span>
                    <span>
                      Bạn đã tích lũy{' '}
                      <strong className="text-ink font-medium">{view.accumulatedCredits} tín chỉ</strong>
                      {view.thesisGap > 0 ? (
                        <>
                          , cần thêm <strong className="text-ink font-medium">{view.thesisGap} TC</strong> để đủ điều
                          kiện theo quy chế HaUI đăng ký{' '}
                          <strong className="text-ink font-medium">Khóa luận tốt nghiệp (10 TC)</strong> (≥{' '}
                          {THESIS_MIN_CREDITS} TC – BR-09).
                        </>
                      ) : (
                        <>
                          , hoàn toàn đủ điều kiện theo quy chế HaUI để đăng ký{' '}
                          <strong className="text-ink font-medium">Khóa luận tốt nghiệp (10 TC)</strong>.
                        </>
                      )}
                    </span>
                  </li>
                )}
                {view.recommendedCourses.length > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-ink mt-0.5 shrink-0">check_circle</span>
                    <span className="flex flex-col gap-2">
                      <span>
                        Lộ trình đề xuất Kỳ {view.nextSemesterNumber}:{' '}
                        <strong className="text-ink font-medium">{view.recommendedCredits} Tín chỉ</strong> gồm{' '}
                        {view.recommendedCourses.length} học phần
                        {view.recommendedCredits >= SEMESTER_MIN_CREDITS &&
                        view.recommendedCredits <= SEMESTER_MAX_CREDITS
                          ? ` (hợp lệ BR-03: ${SEMESTER_MIN_CREDITS} – ${SEMESTER_MAX_CREDITS} TC)`
                          : ` (cần điều chỉnh về khung BR-03: ${SEMESTER_MIN_CREDITS} – ${SEMESTER_MAX_CREDITS} TC)`}
                        {firstFailed && view.recommendedCourses.some((c) => c.code === firstFailed.courseCode) && (
                          <>
                            , ưu tiên học lại{' '}
                            <strong className="text-ink font-medium">
                              {firstFailed.courseName} ({firstFailed.courseCode})
                            </strong>{' '}
                            trước tiên
                          </>
                        )}
                        .
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {view.recommendedCourses.map((course) => (
                          <span
                            key={course.code}
                            title={`${course.name} · ${course.type} — ${course.reason}`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label text-label bg-canvas ${
                              course.urgent ? 'text-ember font-medium' : 'text-ink'
                            }`}
                          >
                            {course.urgent && <span className="w-1.5 h-1.5 rounded-full bg-ember" />}
                            {course.code} · {course.credits} TC
                          </span>
                        ))}
                      </span>
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="flex flex-row md:flex-col shrink-0 gap-2.5 w-full md:w-auto self-end md:self-center">
            <Link to="/planner" className={`${PILL_PRIMARY} justify-center text-center`}>
              <span className="material-symbols-outlined text-[16px]">alt_route</span>
              <span>Phân bổ môn Kỳ {view.nextSemesterNumber}</span>
            </Link>
            <Link to="/what-if" className={`${PILL_CANVAS} justify-center text-center`}>
              <span className="material-symbols-outlined text-[16px]">insights</span>
              <span>Mô phỏng What-if</span>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto p-8">
      {content}
      {devControls}
      {ingestModal}
    </div>
  );
}

export default DashboardPage;
