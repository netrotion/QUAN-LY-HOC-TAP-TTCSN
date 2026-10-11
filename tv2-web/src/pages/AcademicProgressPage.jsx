import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HAUI_BUSINESS_RULES } from '../services/mockFixtures.js';
import { Modal } from '../components/ui/index.js';
import { DevSlot } from '../components/dev/DevTools.jsx';
import {
  getAcademicSnapshot,
  getDynamicAcademicStatus,
  getDynamicGraduationAudit,
  subscribeAcademicStore
} from '../services/academicStore.js';

/**
 * Màn hình 9: Rà soát & Kiểm tra điều kiện tốt nghiệp (`/audit` & `/progress`) — TV2
 * Giao diện theo prototype `kiem_tra_dieu_kien_tot_nghiep` (prototype-v1).
 * Căn cứ:
 * - Luồng chính 3 (Màn hình 9 UI Flow): Tổng tiến độ tốt nghiệp, 7 hạng mục Audit Checklist,
 *   cảnh báo đỏ chứng chỉ MOS/IC3 (AC-05) và nút lập kế hoạch bù đắp các điều kiện còn thiếu.
 * - PRD: G7, US-11, FR-17, FR-18, BR-08, BR-09, BR-10.
 * Dữ liệu lấy trực tiếp từ Academic Store (`getDynamicGraduationAudit`, `getAcademicSnapshot`,
 * `getDynamicAcademicStatus`) và tự cập nhật khi đổi persona / nhập bảng điểm mới.
 * Hỗ trợ in ấn / xuất PDF (@media print) với khối tiêu đề và khối chữ ký riêng cho bản in.
 */

/** Thời gian hiển thị trạng thái "Đang rà soát" khi bấm [Rà soát lại dữ liệu] */
const RECHECK_DELAY_MS = 450;
/** BR-10: CPA tối thiểu để xét tốt nghiệp */
const CPA_GRADUATION_MIN = 2.0;
/** BR-09: Tỷ lệ tín chỉ tối thiểu để nhận Đồ án tốt nghiệp */
const THESIS_CREDIT_RATIO = 0.85;
/** BR-08: Tỷ lệ tín chỉ học lại tối đa để không bị hạ bậc bằng */
const RETAKE_LIMIT_PERCENT = 5;
/** BR-08: Ngưỡng xếp loại theo CPA (dùng để gợi ý mục tiêu kế tiếp) */
const RANK_TARGETS = [
  { label: 'Trung bình', min: 2.0 },
  { label: 'Khá', min: 2.5 },
  { label: 'Giỏi', min: 3.2 },
  { label: 'Xuất sắc', min: 3.6 }
];
/** Các tiêu chí đã có việc cần làm riêng (tín chỉ còn thiếu / pendingActions) trong "Tổng hợp việc cần làm" */
const TODO_COVERED_CRITERIA = ['CHK-01', 'CHK-02', 'CHK-03', 'CHK-05'];

// --- Nội dung minh họa của prototype (store chưa cung cấp) ---
/** Đợt xét tốt nghiệp mặc định khi không suy ra được từ khóa học của sinh viên */
const DEMO_GRADUATION_TERM = '06/2025';
/** Mô tả chương trình GDQP-AN / GDTC (tiêu chí 6 chỉ có một cờ hoàn thành chung) */
const DEMO_DEFENSE_PE_ITEMS = [
  {
    key: 'gdqp',
    title: 'Chứng chỉ Giáo dục Quốc phòng - An ninh',
    chip: '3 học phần (QP6001, QP6002, QP6003)',
    requirement: '165 tiết tại Trung tâm GDQP-AN'
  },
  {
    key: 'gdtc',
    title: 'Chứng chỉ Giáo dục Thể chất',
    chip: '3 tín chỉ thể chất',
    requirement: 'các học phần thể dục cơ bản & thể thao tự chọn'
  }
];
const DEMO_OUTCOME_CATALOG_SIZE = '1.8 MB';
const DEMO_SUPPORT_NOTE =
  'Liên hệ Cố vấn học tập khoa CNTT hoặc phòng Đào tạo (Tầng 2 - Nhà A1, cơ sở 1) trong các ngày làm việc từ thứ 2 đến thứ 6.';
const PRINT_ADVISOR_SIGNATURE = 'Ban Cố Vấn Học Vụ HaUI';

const TRANSCRIPT_STATUS_LABELS = {
  PASSED: 'Đạt',
  PASSED_LOW: 'Đạt (điểm thấp)',
  FAILED: 'Nợ môn (F)',
  IN_PROGRESS: 'Đang học'
};

const DEV_VIEW_STATES = [
  { id: 'auto', label: 'Dữ liệu thật' },
  { id: 'loading', label: 'Đang tải' },
  { id: 'error', label: 'Lỗi' }
];

const PILL_STYLES = {
  done: 'bg-ink text-paper',
  pending: 'bg-canvas text-ink',
  alert: 'bg-canvas text-ember font-semibold',
  neutral: 'bg-canvas text-mid-gray'
};

const CHIP_STYLES = {
  muted: 'text-mid-gray',
  strong: 'text-ink font-semibold',
  alert: 'text-ember font-semibold'
};

/**
 * Tổng hợp dữ liệu rà soát từ Academic Store.
 * @returns {{ data: Object|null, error: Error|null }}
 */
function tryBuildAuditView() {
  try {
    const audit = getDynamicGraduationAudit();
    const snapshot = getAcademicSnapshot();
    const academicStatus = getDynamicAcademicStatus();
    return {
      data: {
        audit,
        snapshot,
        knowledgeBlocks: academicStatus.knowledgeBlocks || [],
        checkedAt: new Date()
      },
      error: null
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/** Tách nhãn DEMO_UNVERIFIED khỏi chuỗi để hiển thị thành tag riêng */
function splitDemoLabel(text) {
  const raw = String(text ?? '');
  const demo = raw.includes('DEMO_UNVERIFIED');
  const clean = raw
    .replace(/\s*-\s*DEMO_UNVERIFIED/g, '')
    .replace(/\s*\(DEMO_UNVERIFIED\)/g, '')
    .replace(/\s*DEMO_UNVERIFIED/g, '')
    .trim();
  return { text: clean, demo };
}

/** "1. TÍN CHỈ TÍCH LŨY" -> "Tiêu chí 1/7 · TÍN CHỈ TÍCH LŨY" */
function criterionEyebrow(item, total) {
  const match = /^(\d+)\.\s*(.*)$/.exec(String(item?.category || ''));
  if (!match) return item?.category || '';
  return `Tiêu chí ${match[1]}/${total} · ${match[2]}`;
}

function isRedAlert(item) {
  return item?.completed === false && String(item?.category || '').includes('TIN HỌC');
}

function criterionPill(item) {
  if (item?.completed === true) return { tone: 'done', icon: 'check_circle', label: 'ĐÃ HOÀN THÀNH' };
  if (item?.completed === false) {
    return isRedAlert(item)
      ? { tone: 'alert', icon: 'error', label: 'CẢNH BÁO ĐỎ' }
      : { tone: 'pending', label: 'CHƯA HOÀN THÀNH' };
  }
  return { tone: 'neutral', icon: 'help', label: 'CHƯA XÁC ĐỊNH' };
}

function creditsChip(item) {
  if (item?.requiredCredits === null || item?.requiredCredits === undefined) return null;
  return {
    label: `${item.earnedCredits ?? '—'} / ${item.requiredCredits} TC`,
    tone: item.completed ? 'muted' : 'alert'
  };
}

function clampPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function shortRank(rank) {
  return String(rank || 'Chưa xếp loại').split(' (')[0];
}

function trainingClass(score) {
  if (score === null || score === undefined) return null;
  if (score >= 90) return 'Xuất sắc';
  if (score >= 80) return 'Tốt';
  if (score >= 65) return 'Khá';
  if (score >= 50) return 'Trung bình';
  return 'Yếu';
}

function formatSemester(code) {
  const match = /^(\d{4})_(\d)$/.exec(String(code || ''));
  return match ? `HK${match[2]} · ${match[1]}-${Number(match[1]) + 1}` : code || '—';
}

function formatScore(value, digits = 1) {
  return value === null || value === undefined ? '—' : Number(value).toFixed(digits);
}

function StatusPill({ tone = 'pending', icon, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-caption text-caption font-medium whitespace-nowrap ${
        PILL_STYLES[tone] || PILL_STYLES.pending
      }`}
    >
      {icon ? (
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-ember" />
      )}
      <span>{label}</span>
    </span>
  );
}

function SectionStatus({ done, doneLabel = 'Trạng thái: Đã hoàn thành', pendingLabel = 'Trạng thái: Chưa hoàn thành' }) {
  if (done) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink text-paper font-caption text-caption font-medium self-start sm:self-center shrink-0">
        <span className="material-symbols-outlined text-[14px]">verified</span>
        <span>{doneLabel}</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-canvas text-mid-gray font-caption text-caption font-medium self-start sm:self-center shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-ember" />
      <span>{pendingLabel}</span>
    </div>
  );
}

function AuditSection({ title, subtitle, status, children }) {
  return (
    <section className="rounded-[24px] bg-paper p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 bg-canvas/30 -mx-6 -mt-6 p-6 rounded-t-[24px] break-after-avoid">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-subheading text-subheading text-ink font-semibold">{title}</span>
          </div>
          <p className="font-caption text-caption text-mid-gray">{subtitle}</p>
        </div>
        {status}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function AuditRow({ eyebrow, title, chip, demoTag = false, description, pill }) {
  return (
    <div className="p-4 rounded-[18px] bg-surface-alt shadow-sm hover:shadow transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-3 break-inside-avoid">
      <div className="space-y-1 min-w-0">
        {eyebrow && (
          <span className="block font-label text-[10px] leading-4 text-mid-gray uppercase tracking-wider">{eyebrow}</span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body-medium text-body-medium text-ink font-medium">{title}</span>
          {chip && (
            <span
              className={`px-2 py-0.5 rounded-full bg-canvas font-caption text-[11px] ${CHIP_STYLES[chip.tone] || CHIP_STYLES.muted}`}
            >
              {chip.label}
            </span>
          )}
          {demoTag && (
            <span className="px-2 py-0.5 rounded-full border border-hairline text-mid-gray font-caption text-[10px] tracking-wide">
              DEMO_UNVERIFIED
            </span>
          )}
        </div>
        {description && <p className="font-caption text-caption text-mid-gray">{description}</p>}
      </div>
      {pill && (
        <div className="flex items-center gap-3 shrink-0">
          <StatusPill {...pill} />
        </div>
      )}
    </div>
  );
}

/** Hàng tiêu chí lấy trực tiếp từ checklist 7 hạng mục của store */
function CriterionRow({ item, total, title, chip, description, pill }) {
  if (!item) return null;
  const name = splitDemoLabel(item.name);
  const message = splitDemoLabel(item.statusMessage);
  return (
    <AuditRow
      eyebrow={criterionEyebrow(item, total)}
      title={title ?? name.text}
      chip={chip === undefined ? creditsChip(item) : chip}
      demoTag={name.demo || message.demo}
      description={description ?? message.text}
      pill={pill ?? criterionPill(item)}
    />
  );
}

function KpiCard({ label, icon, barPct, footer, children }) {
  return (
    <div className="rounded-[24px] bg-paper p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow break-inside-avoid">
      <div className="flex items-center justify-between">
        <span className="font-caption text-caption text-mid-gray font-medium uppercase tracking-wider">{label}</span>
        <span className="p-1.5 rounded-full bg-canvas text-ink">
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </span>
      </div>
      <div className="mt-4 mb-3 flex items-baseline gap-1.5">{children}</div>
      <div className="space-y-1.5">
        <div className="w-full bg-canvas h-2 rounded-full overflow-hidden">
          <div
            className="bg-ink h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${clampPct(barPct)}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 font-caption text-caption text-mid-gray pt-0.5">{footer}</div>
      </div>
    </div>
  );
}

function StateCard({ icon, iconClassName = 'text-ink', title, description, action, spin = false }) {
  return (
    <div className="rounded-[24px] bg-paper border border-hairline shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className={`p-2 rounded-full bg-canvas shrink-0 self-start sm:self-center ${iconClassName}`}>
        <span className={`material-symbols-outlined text-[20px] block ${spin ? 'animate-spin' : ''}`}>{icon}</span>
      </div>
      <div className="flex-1 space-y-1">
        <p className="font-body-medium text-body-medium text-ink font-semibold">{title}</p>
        {description && <p className="font-caption text-caption text-mid-gray leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AcademicProgressPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState(() => tryBuildAuditView());
  const [checking, setChecking] = useState(false);
  const [devState, setDevState] = useState('auto');
  const [showRules, setShowRules] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isRemediationModalOpen, setIsRemediationModalOpen] = useState(false);
  const recheckTimer = useRef(null);
  const printDocCode = useMemo(() => Date.now().toString().slice(-6), []);

  const refresh = useCallback(() => {
    setResult(tryBuildAuditView());
  }, []);

  /** [Rà soát lại dữ liệu]: chạy lại toàn bộ 7 tiêu chí từ store hiện hành */
  const recheck = useCallback(() => {
    setChecking(true);
    clearTimeout(recheckTimer.current);
    recheckTimer.current = setTimeout(() => {
      setResult(tryBuildAuditView());
      setChecking(false);
    }, RECHECK_DELAY_MS);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAcademicStore(() => refresh());
    return () => {
      unsubscribe();
      clearTimeout(recheckTimer.current);
    };
  }, [refresh]);

  const data = result.data;
  const audit = data?.audit || {};
  const snapshot = data?.snapshot || {};
  const student = snapshot.student || {};
  const metrics = snapshot.metrics || {};
  const transcriptRecords = snapshot.transcriptRecords || [];
  const knowledgeBlocks = data?.knowledgeBlocks || [];
  const checklist = Array.isArray(audit.checklist) ? audit.checklist : [];
  const pendingActions = Array.isArray(audit.pendingActions) ? audit.pendingActions : [];
  const criteriaTotal = checklist.length || 7;
  const pick = (id, index) => checklist.find((c) => c.id === id) || checklist[index] || null;
  const chkCredits = pick('CHK-01', 0);
  const chkMandatory = pick('CHK-02', 1);
  const chkElective = pick('CHK-03', 2);
  const chkLanguage = pick('CHK-04', 3);
  const chkIt = pick('CHK-05', 4);
  const chkDefensePe = pick('CHK-06', 5);
  const chkTraining = pick('CHK-07', 6);

  // --- Số liệu tổng hợp ---
  const earned = audit.totalCreditsEarned ?? metrics.accumulatedCredits ?? 0;
  const totalRequired = audit.totalCreditsRequired ?? metrics.totalCreditsRequired ?? 135;
  const pct = audit.completedPercentage ?? Math.round((earned / totalRequired) * 100);
  const missingCredits = Math.max(0, totalRequired - earned);
  const remainingPct = totalRequired > 0 ? ((missingCredits / totalRequired) * 100).toFixed(1) : '0.0';
  const passedCriteria = checklist.filter((c) => c.completed === true).length;
  const missingCriteria = Math.max(0, criteriaTotal - passedCriteria);

  const cpa = metrics.cpa ?? student.cpa ?? null;
  const rankInfo = metrics.rankInfo || { rank: 'Chưa xếp loại' };
  const rankLabel = shortRank(rankInfo.rank);
  const nextRank = cpa === null ? null : RANK_TARGETS.find((r) => r.min > cpa) || null;
  const cpaTarget = cpa === null ? RANK_TARGETS[0] : nextRank;
  const cpaPassed = cpa !== null && cpa >= CPA_GRADUATION_MIN;

  const failedCourses = metrics.failedCourses || [];
  const passedCourses = metrics.passedCourses || [];
  const failedCredits = failedCourses.reduce((sum, c) => sum + Number(c.credits || 0), 0);
  const retakePercent = totalRequired > 0 ? Number(((failedCredits / totalRequired) * 100).toFixed(1)) : 0;
  const hasTranscript = transcriptRecords.length > 0;

  const thesisMin = Math.ceil(totalRequired * THESIS_CREDIT_RATIO);
  const programPct = totalRequired > 0 ? ((earned / totalRequired) * 100).toFixed(1) : '0.0';
  const eligibleForThesis = audit.eligibleForThesis ?? earned >= thesisMin;

  const trainingScore = chkTraining?.completed ? audit.trainingScore ?? null : null;
  const trainingRank = trainingClass(trainingScore);

  // Chứng chỉ bắt buộc: Ngoại ngữ, Tin học, GDQP-AN, GDTC (tiêu chí 6 gồm 2 chứng chỉ)
  const certificates = [
    chkLanguage?.completed === true,
    chkIt?.completed === true,
    chkDefensePe?.completed === true,
    chkDefensePe?.completed === true
  ];
  const certDone = certificates.filter(Boolean).length;
  const certMissing = certificates.length - certDone;

  const cohortShort = String(student.cohort || '').split(' ')[0] || '—';
  const majorAbbrev =
    (/\(([^)]+)\)/.exec(String(student.majorName || '')) || [])[1] ||
    String(student.advisorClass || '').replace(/\d.*$/, '') ||
    'CNTT';
  const graduationYear = (/(\d{4})\s*\)\s*$/.exec(String(student.cohort || '')) || [])[1];
  const graduationTerm = graduationYear ? `06/${graduationYear}` : DEMO_GRADUATION_TERM;

  // --- Tổng hợp việc cần làm (môn nợ + chứng chỉ tồn đọng AC-05 + tiêu chí còn thiếu) ---
  const todos = [];
  failedCourses.forEach((course) => {
    todos.push({
      key: `retake-${course.courseCode}`,
      urgent: true,
      title: `Đăng ký học lại ${course.courseName} (${course.courseCode})`,
      detail: `Đang nợ điểm F (${course.credits} TC). Ưu tiên học lại ở kỳ gần nhất để gỡ nợ và mở khóa các môn phía sau.`
    });
  });
  pendingActions.forEach((action) => {
    const standard = splitDemoLabel(action.requiredStandard);
    todos.push({
      key: `pending-${action.certificateType}`,
      urgent: action.status === 'PENDING',
      title: standard.text,
      detail: /[.!?]$/.test(String(action.actionDescription || '').trim())
        ? action.actionDescription
        : `${action.actionDescription || ''}.`,
      deadline: action.deadline,
      meta: `${action.certificateType} · ${action.status}${standard.demo ? ' · DEMO_UNVERIFIED' : ''}`
    });
  });
  if (missingCredits > 0) {
    todos.push({
      key: 'credits',
      urgent: false,
      title: `Tích lũy thêm ${missingCredits} TC còn thiếu`,
      detail: `Theo khung ${totalRequired} TC của CTĐT. Bố trí các học phần còn thiếu vào Kế hoạch học tập các kỳ còn lại.`
    });
  }
  checklist
    .filter((c) => c.completed === false && !TODO_COVERED_CRITERIA.includes(c.id))
    .forEach((c) => {
      todos.push({
        key: `criterion-${c.id}`,
        urgent: false,
        title: `Hoàn thiện ${String(c.category || '').replace(/^\d+\.\s*/, '').toLowerCase()}`,
        detail: splitDemoLabel(c.statusMessage).text
      });
    });
  todos.sort((a, b) => Number(b.urgent) - Number(a.urgent));

  // --- Gợi ý từ AI Advisor (suy ra từ dữ liệu store) ---
  let advice;
  if (!hasTranscript) {
    advice = 'Chưa có dữ liệu bảng điểm. Hãy nạp bảng điểm từ cổng e-HaUI để AI Advisor rà soát đầy đủ 7 tiêu chí và đề xuất lộ trình tốt nghiệp.';
  } else if (metrics.academicWarning) {
    advice = `${metrics.academicWarning} Nên ưu tiên gỡ nợ trước, sau đó bố trí các học phần còn thiếu vào kế hoạch học tập.`;
  } else if (nextRank) {
    advice = `Hồ sơ học tập của bạn đang đạt đúng tiến độ chuẩn của ${cohortShort}. Để đảm bảo tốt nghiệp loại ${nextRank.label}, bạn cần nâng CPA thêm ${(nextRank.min - cpa).toFixed(2)} điểm qua các học phần còn lại.`;
  } else {
    advice = `Hồ sơ học tập của bạn đang đạt đúng tiến độ chuẩn của ${cohortShort} với CPA ở mức xếp loại cao nhất. Hãy duy trì phong độ ở các học phần còn lại.`;
  }

  const viewState = devState !== 'auto' ? devState : result.error || !data ? 'error' : 'ready';
  const viewError =
    devState === 'error'
      ? new Error('Mô phỏng lỗi rà soát tốt nghiệp (công cụ dev) để kiểm thử trạng thái lỗi & thử lại.')
      : result.error;
  const checkedAtLabel = data?.checkedAt
    ? data.checkedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const sectionCreditsDone = [chkCredits, chkMandatory, chkElective].every((c) => c?.completed === true);
  const sectionScoresDone = cpaPassed && chkTraining?.completed === true && failedCourses.length === 0 && hasTranscript;
  const sectionCertsDone = chkLanguage?.completed === true && chkIt?.completed === true;
  const sectionDefenseDone = chkDefensePe?.completed === true;

  return (
    <div className="haui-audit-container flex flex-col w-full">
      {/* Khối Tiêu đề dành riêng cho Chế độ in ấn & Xuất PDF (@media print) */}
      <div className="haui-print-header">
        <div className="text-center mb-4 pb-3 border-b-2 border-ink">
          <div className="text-[13px] font-bold uppercase text-ink">
            BỘ GIÁO DỤC VÀ ĐÀO TẠO &bull; TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP HÀ NỘI
          </div>
          <div className="text-[12px] italic text-on-surface-variant">
            Phòng Đào tạo &bull; Hệ thống Cố vấn Lộ trình Học tập HaUI Advisor
          </div>
          <h1 className="text-[18px] font-extrabold uppercase text-ink mt-2.5 mb-1">
            BÁO CÁO KIỂM TOÁN TỐT NGHIỆP 100% TIÊU CHÍ (DEGREE AUDIT)
          </h1>
          <div className="text-[11px] text-mid-gray">
            Mã văn bản: AUDIT-HAUI-{printDocCode} &bull; Trạng thái: DEMO_UNVERIFIED
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px] text-ink mb-4 px-3.5 py-2.5 border border-hairline rounded">
          <div><strong>Họ và tên sinh viên:</strong> {student.fullName || '—'}</div>
          <div><strong>Mã số sinh viên:</strong> {student.studentId || '—'}</div>
          <div><strong>Ngành đào tạo:</strong> {student.majorName || '—'}</div>
          <div><strong>Khóa / Lớp:</strong> {student.cohort || '—'} &bull; {student.advisorClass || '—'}</div>
          <div><strong>Tín chỉ tích lũy:</strong> {earned} / {totalRequired} TC ({pct}%)</div>
          <div><strong>CPA / Xếp loại:</strong> {cpa === null ? '—' : cpa.toFixed(2)} / 4.00 &bull; {rankLabel}</div>
          <div><strong>Tiêu chí đạt:</strong> {passedCriteria} / {criteriaTotal} hạng mục</div>
          <div><strong>Đủ ĐK Tốt nghiệp:</strong> {audit.eligibleForGraduation ? '✓ ĐẠT YÊU CẦU' : 'CHƯA ĐẠT (CÒN ĐIỀU KIỆN THIẾU)'}</div>
        </div>
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* Tiêu đề trang + hành động */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-caption text-caption text-mid-gray">
              <Link to="/" className="hover:text-ink transition-colors cursor-pointer">Trang chủ</Link>
              <span className="text-hairline">/</span>
              <span className="text-ink font-medium">Kiểm tra điều kiện tốt nghiệp</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-paper text-[10px] text-mid-gray tracking-wide ml-1 shadow-sm">
                {cohortShort} - {majorAbbrev}
              </span>
            </div>
            <h1 className="font-headline text-headline text-ink tracking-tight font-semibold">
              Rà soát &amp; Kiểm tra điều kiện tốt nghiệp
            </h1>
            <p className="font-body text-body text-mid-gray max-w-3xl leading-relaxed">
              {student.fullName ? `${student.fullName} · ${student.studentId} · ${student.majorName}` : ''}
              {checkedAtLabel && <span className="print:hidden">{` · Rà soát lúc ${checkedAtLabel}`}</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
            <button
              className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-canvas text-ink font-body-medium text-body-medium shadow-sm hover:bg-surface-alt transition-all active:scale-95 disabled:opacity-60"
              id="btn-recheck"
              type="button"
              onClick={recheck}
              disabled={checking}
            >
              <span
                className={`material-symbols-outlined text-[16px] text-mid-gray transition-transform duration-500 ${
                  checking ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              >
                sync
              </span>
              <span>{checking ? 'Đang rà soát...' : 'Rà soát lại dữ liệu'}</span>
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-canvas text-ink font-body-medium text-body-medium shadow-sm hover:bg-surface-alt transition-all active:scale-95"
              id="btn-export"
              type="button"
              onClick={() => window.print()}
              title="In báo cáo kiểm tra tốt nghiệp hoặc lưu thành file PDF khổ A4"
            >
              <span className="material-symbols-outlined text-[16px] text-mid-gray">print</span>
              <span>Xuất / In báo cáo</span>
            </button>
            <Link
              to="/curriculum"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-paper font-body-medium text-body-medium shadow-sm hover:bg-ink-soft transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              <span>Đối chiếu khung CTĐT gốc</span>
            </Link>
          </div>
        </div>

        {/* Lưu ý dữ liệu minh họa & Quy chế xét tốt nghiệp (BR-01 → BR-10, DEMO_UNVERIFIED) */}
        <div className="relative overflow-hidden rounded-[24px] bg-paper shadow-sm p-4 sm:p-5 flex items-start gap-3.5">
          <div className="w-1.5 absolute inset-y-0 left-0 bg-ink" />
          <div className="p-2 rounded-full bg-canvas text-ink shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px] block">info</span>
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-body-medium text-body-medium text-ink font-semibold">
                Lưu ý dữ liệu minh họa &amp; Quy chế xét tốt nghiệp
              </span>
              <span className="px-2 py-0.5 rounded-full bg-canvas text-mid-gray font-caption text-[11px] font-medium">
                Tự động đối chiếu
              </span>
            </div>
            <p className="font-caption text-caption text-mid-gray leading-relaxed">
              {'Kết quả rà soát dưới đây được tổng hợp từ dữ liệu bảng điểm tự nhập và quy chế đào tạo mẫu CNTT. Hệ thống không khẳng định các tiêu chí minh họa là quyết định công nhận tốt nghiệp chính thức của Hội đồng xét tốt nghiệp Nhà trường. Sinh viên cần theo dõi thông báo chính thức và đối chiếu hồ sơ gốc tại cổng thông tin '}
              <a
                className="text-ink font-medium underline underline-offset-2 hover:opacity-80"
                href="https://sv.haui.edu.vn"
                target="_blank"
                rel="noreferrer"
              >
                sv.haui.edu.vn
              </a>
              .
            </p>
            <button
              type="button"
              onClick={() => setShowRules((prev) => !prev)}
              className="inline-flex items-center gap-1 pt-1 font-caption text-caption text-ink font-medium hover:opacity-80 transition-opacity"
              aria-expanded={showRules}
            >
              <span className="material-symbols-outlined text-[16px]">{showRules ? 'expand_less' : 'expand_more'}</span>
              {showRules ? 'Ẩn quy chế áp dụng' : `Xem quy chế áp dụng (BR-01 → BR-10, ${HAUI_BUSINESS_RULES[0]?.tag || 'DEMO_UNVERIFIED'})`}
            </button>
            {showRules && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                {HAUI_BUSINESS_RULES.map((rule) => (
                  <div key={rule.code} className="p-3 rounded-[18px] bg-surface-alt space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-caption text-caption text-ink font-semibold">{rule.code}</span>
                      <span className="font-caption text-caption text-ink">{rule.title}</span>
                      <span className="px-2 py-0.5 rounded-full border border-hairline text-mid-gray font-caption text-[10px] tracking-wide">
                        {rule.tag}
                      </span>
                    </div>
                    <p className="font-caption text-caption text-mid-gray leading-relaxed">{rule.rule}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {viewState === 'loading' && (
          <StateCard
            icon="progress_activity"
            spin
            title="Đang rà soát 100% hồ sơ điều kiện tốt nghiệp..."
            description="Hệ thống đang đối chiếu bảng điểm, khối kiến thức và chứng chỉ chuẩn đầu ra với 7 tiêu chí xét tốt nghiệp."
          />
        )}

        {viewState === 'error' && (
          <StateCard
            icon="error"
            iconClassName="text-ember"
            title="Không thể tải kết quả rà soát tốt nghiệp"
            description={viewError?.message || 'Đã xảy ra lỗi không xác định khi tổng hợp dữ liệu học vụ.'}
            action={
              <button
                type="button"
                onClick={() => {
                  setDevState('auto');
                  recheck();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-paper font-body-medium text-body-medium shadow-sm hover:bg-ink-soft transition-all active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Thử lại</span>
              </button>
            }
          />
        )}

        {viewState === 'ready' && (
          <>
            {!hasTranscript && (
              <StateCard
                icon="upload_file"
                title="Chưa có dữ liệu bảng điểm"
                description={`Kết quả rà soát hiện chỉ dựa trên hồ sơ ban đầu (${earned} tín chỉ). Nạp bảng điểm từ cổng e-HaUI để hệ thống đối chiếu đầy đủ ${criteriaTotal} tiêu chí tốt nghiệp.`}
                action={
                  <Link
                    to="/transcript"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-paper font-body-medium text-body-medium shadow-sm hover:bg-ink-soft transition-all active:scale-95 shrink-0 print:hidden"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    <span>Nhập bảng điểm</span>
                  </Link>
                }
              />
            )}

            {/* 4 chỉ số tổng quan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Tổng tiến độ tốt nghiệp"
                icon="school"
                barPct={pct}
                footer={
                  <>
                    <span>Đạt {passedCriteria}/{criteriaTotal} nhóm tiêu chí</span>
                    <span className="text-ink font-medium">
                      {audit.eligibleForGraduation ? 'Đủ điều kiện' : `Thiếu ${missingCriteria}`}
                    </span>
                  </>
                }
              >
                <span className="font-headline text-headline text-ink font-bold tracking-tight">{pct}%</span>
                <span className="font-caption text-caption text-mid-gray ml-0.5">hoàn thành</span>
              </KpiCard>

              <KpiCard
                label="Tín chỉ tích lũy"
                icon="fact_check"
                barPct={totalRequired > 0 ? (earned / totalRequired) * 100 : 0}
                footer={
                  <>
                    {missingCredits > 0 ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-ember inline-block" />
                        <span>Còn thiếu {missingCredits} TC</span>
                      </span>
                    ) : (
                      <span>Đã tích lũy đủ</span>
                    )}
                    <span className="text-ink font-medium">{remainingPct}% còn lại</span>
                  </>
                }
              >
                <span className="font-headline text-headline text-ink font-bold tracking-tight">{earned}</span>
                <span className="font-subheading text-subheading text-mid-gray">/ {totalRequired}</span>
                <span className="font-caption text-caption text-mid-gray ml-1">tín chỉ</span>
              </KpiCard>

              <KpiCard
                label="Điểm CPA hiện tại"
                icon="grade"
                barPct={cpa === null ? 0 : (cpa / 4) * 100}
                footer={
                  <>
                    <span className={cpaPassed ? 'text-ink font-medium' : 'text-ember font-medium'}>
                      {cpaPassed ? 'Đạt điều kiện' : cpa === null ? 'Chưa có CPA' : 'Chưa đạt'}
                      <br />
                      {` (≥ ${CPA_GRADUATION_MIN.toFixed(2)})`}
                    </span>
                    <span className="text-mid-gray text-right">
                      {cpaTarget ? 'Mục tiêu ' : 'Đã đạt mức '}
                      <br />
                      {cpaTarget ? `${cpaTarget.label} ≥ ${cpaTarget.min.toFixed(2)}` : 'cao nhất'}
                    </span>
                  </>
                }
              >
                <span className="font-headline text-headline text-ink font-bold tracking-tight">
                  {cpa === null ? '—' : cpa.toFixed(2)}
                </span>
                <span className="font-subheading text-subheading text-mid-gray">/ 4.00</span>
                <span className="font-caption text-caption text-ink font-medium px-2 py-0.5 bg-canvas rounded-full ml-1">
                  Xếp loại {rankLabel}
                </span>
              </KpiCard>

              <KpiCard
                label="Chứng chỉ bắt buộc"
                icon="verified"
                barPct={(certDone / certificates.length) * 100}
                footer={
                  certMissing > 0 ? (
                    <>
                      <span className="flex items-center gap-1 text-ember">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>Thiếu {certMissing} chứng chỉ</span>
                      </span>
                      <span className="text-ink font-medium">Cần nộp hồ sơ</span>
                    </>
                  ) : (
                    <>
                      <span>Đã nộp đủ chứng chỉ</span>
                      <span className="text-ink font-medium">Hợp lệ</span>
                    </>
                  )
                }
              >
                <span className="font-headline text-headline text-ink font-bold tracking-tight">{certDone}</span>
                <span className="font-subheading text-subheading text-mid-gray">/ {certificates.length}</span>
                <span className="font-caption text-caption text-mid-gray ml-1">đã nộp</span>
              </KpiCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-6">
                {/* 1. Khối lượng kiến thức & Tín chỉ tích lũy (Tiêu chí 1-3 + BR-09) */}
                <AuditSection
                  title="1. Khối lượng kiến thức & Tín chỉ tích lũy"
                  subtitle={`Yêu cầu hoàn thành tối thiểu ${totalRequired} tín chỉ theo khung chuẩn ${cohortShort} ${majorAbbrev}`}
                  status={<SectionStatus done={sectionCreditsDone} />}
                >
                  <CriterionRow item={chkCredits} total={criteriaTotal} />
                  <CriterionRow item={chkMandatory} total={criteriaTotal} />
                  <CriterionRow item={chkElective} total={criteriaTotal} />
                  <AuditRow
                    eyebrow="BR-09 · Điều kiện nhận đồ án"
                    title="Khóa luận tốt nghiệp / Đồ án tốt nghiệp"
                    chip={{ label: `${programPct}% / ≥ ${Math.round(THESIS_CREDIT_RATIO * 100)}% CTĐT`, tone: eligibleForThesis ? 'muted' : 'alert' }}
                    description={`Điều kiện: Tích lũy tối thiểu ≥ ${thesisMin} TC (${Math.round(THESIS_CREDIT_RATIO * 100)}% CTĐT) và không nợ môn tiên quyết của đồ án. ${
                      eligibleForThesis
                        ? 'Đã đủ số tín chỉ để nhận đồ án.'
                        : `Cần tích lũy thêm ${Math.max(0, thesisMin - earned)} TC${
                            failedCourses.length ? ` và gỡ nợ ${failedCourses.map((c) => c.courseCode).join(', ')}` : ''
                          }.`
                    }`}
                    pill={
                      eligibleForThesis
                        ? { tone: 'done', icon: 'check_circle', label: 'ĐỦ ĐIỀU KIỆN' }
                        : { tone: 'neutral', icon: 'schedule', label: 'CHƯA MỞ' }
                    }
                  />

                  {knowledgeBlocks.length > 0 && (
                    <div className="p-4 rounded-[18px] bg-surface-alt shadow-sm space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-body-medium text-body-medium text-ink font-medium">
                          Phân bổ tín chỉ theo khối kiến thức
                        </span>
                        <span className="font-caption text-caption text-mid-gray">{earned} / {totalRequired} TC</span>
                      </div>
                      <div className="space-y-2.5">
                        {knowledgeBlocks.map((block) => {
                          const dotClass = block.isCompleted
                            ? 'bg-ink'
                            : block.earnedCredits > 0
                            ? 'bg-ember'
                            : 'bg-hairline';
                          return (
                            <div
                              key={block.blockCode}
                              className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_5.5rem] items-center gap-x-3 gap-y-1"
                            >
                              <span className="flex items-center gap-2 font-caption text-caption text-ink min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                                <span className="truncate">{String(block.blockName || '').replace(/^\d+\.\s*/, '')}</span>
                              </span>
                              <div className="hidden sm:block w-full bg-hairline h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-ink h-full rounded-full transition-all duration-700 ease-out"
                                  style={{ width: `${clampPct(block.completionPercentage)}%` }}
                                />
                              </div>
                              <span className="font-caption text-caption text-mid-gray text-right whitespace-nowrap">
                                {block.earnedCredits} / {block.requiredCredits} TC
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </AuditSection>

                {/* 2. Điểm học tập & Rèn luyện toàn khóa (CPA, Tiêu chí 7, nợ môn, bảng điểm) */}
                <AuditSection
                  title="2. Điểm học tập & Rèn luyện toàn khóa"
                  subtitle="Căn cứ theo thang điểm 4.0 và thang rèn luyện 100 điểm của Trường ĐH Công nghiệp Hà Nội"
                  status={<SectionStatus done={sectionScoresDone} />}
                >
                  <AuditRow
                    eyebrow="BR-10 · Điểm trung bình tích lũy"
                    title="Điểm trung bình chung tích lũy (CPA)"
                    chip={{
                      label: cpa === null ? 'Chưa có CPA' : `${cpa.toFixed(2)} / 4.00`,
                      tone: cpaPassed ? 'strong' : 'alert'
                    }}
                    description={`Quy định: CPA ≥ ${CPA_GRADUATION_MIN.toFixed(2)} (Đạt tốt nghiệp). Hiện tại xếp loại: ${rankLabel}${
                      nextRank ? ` (mục tiêu kế tiếp: ${nextRank.label} ≥ ${nextRank.min.toFixed(2)})` : ''
                    }`}
                    pill={
                      cpa === null
                        ? { tone: 'neutral', icon: 'schedule', label: 'CHƯA CÓ DỮ LIỆU' }
                        : cpaPassed
                        ? { tone: 'done', icon: 'check', label: `ĐÃ ĐẠT (${rankLabel.toUpperCase()})` }
                        : { tone: 'alert', icon: 'error', label: 'CHƯA ĐẠT' }
                    }
                  />
                  <CriterionRow
                    item={chkTraining}
                    total={criteriaTotal}
                    chip={{ label: `${trainingScore ?? '—'} / 100`, tone: chkTraining?.completed ? 'strong' : 'alert' }}
                    description={`Quy định: ĐRL ≥ 65 điểm (Khá). ${splitDemoLabel(chkTraining?.statusMessage).text}`}
                    pill={
                      chkTraining?.completed
                        ? { tone: 'done', icon: 'check', label: trainingRank ? `ĐÃ ĐẠT (${trainingRank.toUpperCase()})` : 'ĐÃ ĐẠT' }
                        : undefined
                    }
                  />
                  <AuditRow
                    eyebrow="BR-08 · Học lại & hạ bậc bằng"
                    title="Tình trạng nợ môn học (Điểm F)"
                    chip={{ label: `${failedCourses.length} môn nợ`, tone: failedCourses.length ? 'alert' : 'strong' }}
                    description={
                      !hasTranscript
                        ? 'Chưa có dữ liệu bảng điểm để đối chiếu học phần nợ.'
                        : failedCourses.length
                        ? `Đang nợ ${failedCourses.map((c) => `${c.courseCode} (${c.courseName})`).join(', ')}. Tín chỉ học lại: ${retakePercent}% CTĐT (${
                            retakePercent <= RETAKE_LIMIT_PERCENT ? '≤ 5% nên không bị hạ bậc bằng' : '> 5% sẽ bị hạ 1 bậc bằng'
                          }).`
                        : `Tất cả ${passedCourses.length} môn đã học đã hoàn thành qua điểm, không còn học phần F chưa trả`
                    }
                    pill={
                      !hasTranscript
                        ? { tone: 'neutral', icon: 'schedule', label: 'CHƯA CÓ DỮ LIỆU' }
                        : failedCourses.length
                        ? { tone: 'alert', icon: 'error', label: 'CÒN NỢ MÔN' }
                        : { tone: 'done', icon: 'check', label: 'HỢP LỆ' }
                    }
                  />

                  {hasTranscript && (
                    <div className="rounded-[18px] bg-surface-alt shadow-sm overflow-hidden print:overflow-visible">
                      <button
                        type="button"
                        onClick={() => setShowTranscript((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-canvas transition-colors"
                        aria-expanded={showTranscript}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-mid-gray">table_rows</span>
                          <span className="font-body-medium text-body-medium text-ink font-medium">Bảng điểm đối chiếu</span>
                          <span className="px-2 py-0.5 rounded-full bg-canvas text-mid-gray font-caption text-[11px]">
                            {transcriptRecords.length} học phần
                          </span>
                        </span>
                        <span
                          className={`material-symbols-outlined text-[18px] text-mid-gray transition-transform ${
                            showTranscript ? 'rotate-180' : ''
                          }`}
                        >
                          expand_more
                        </span>
                      </button>
                      <div className={showTranscript ? 'block' : 'hidden print:block'}>
                        <p className="hidden print:block px-4 pt-3 font-body-medium text-body-medium text-ink font-medium">
                          Bảng điểm đối chiếu ({transcriptRecords.length} học phần)
                        </p>
                        <div className="overflow-x-auto print:overflow-visible px-4 pb-4">
                          <table className="w-full min-w-[640px] print:min-w-0 text-left border-collapse">
                            <thead>
                              <tr className="border-b border-hairline">
                                {['Mã HP', 'Tên học phần', 'Học kỳ', 'TC', 'Điểm 10', 'Điểm chữ', 'Điểm 4', 'Trạng thái'].map((col) => (
                                  <th
                                    key={col}
                                    className="py-2 pr-3 font-label text-label text-mid-gray uppercase tracking-wider font-medium whitespace-nowrap print:whitespace-normal"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {transcriptRecords.map((rec) => {
                                const failed = rec.status === 'FAILED' || rec.letterGrade === 'F';
                                return (
                                  <tr
                                    key={rec.id || `${rec.courseCode}-${rec.semesterCode}`}
                                    className="border-b border-hairline last:border-0 font-caption text-caption text-ink"
                                  >
                                    <td className="py-2 pr-3 font-medium whitespace-nowrap print:whitespace-normal">{rec.courseCode}</td>
                                    <td className="py-2 pr-3">{rec.courseName}</td>
                                    <td className="py-2 pr-3 text-mid-gray whitespace-nowrap print:whitespace-normal">{formatSemester(rec.semesterCode)}</td>
                                    <td className="py-2 pr-3">{rec.credits}</td>
                                    <td className="py-2 pr-3">{formatScore(rec.score10)}</td>
                                    <td className={`py-2 pr-3 font-medium ${failed ? 'text-ember' : ''}`}>{rec.letterGrade || '—'}</td>
                                    <td className="py-2 pr-3">{formatScore(rec.score4)}</td>
                                    <td className={`py-2 pr-3 whitespace-nowrap print:whitespace-normal ${failed ? 'text-ember font-medium' : 'text-mid-gray'}`}>
                                      {TRANSCRIPT_STATUS_LABELS[rec.status] || rec.status || '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </AuditSection>

                {/* 3. Chuẩn đầu ra Ngoại ngữ & Tin học (Tiêu chí 4-5, cảnh báo đỏ AC-05) */}
                <AuditSection
                  title="3. Chuẩn đầu ra Ngoại ngữ & Tin học"
                  subtitle="Chuẩn năng lực độc lập theo quy định đầu ra trường Đại học Công nghiệp Hà Nội"
                  status={<SectionStatus done={sectionCertsDone} pendingLabel="Cần nộp chứng chỉ" />}
                >
                  <CriterionRow
                    item={chkLanguage}
                    total={criteriaTotal}
                    chip={{ label: chkLanguage?.completed ? 'Đã nộp' : 'Thiếu kết quả', tone: chkLanguage?.completed ? 'strong' : 'alert' }}
                  />
                  <CriterionRow
                    item={chkIt}
                    total={criteriaTotal}
                    chip={{ label: chkIt?.completed ? 'Đã nộp' : 'Chưa nộp', tone: chkIt?.completed ? 'strong' : 'alert' }}
                  />
                </AuditSection>

                {/* 4. Chứng chỉ Giáo dục Quốc phòng & Thể chất (Tiêu chí 6) */}
                <AuditSection
                  title="4. Chứng chỉ Giáo dục Quốc phòng & Thể chất"
                  subtitle="Điều kiện bắt buộc theo Luật Giáo dục Đại học (Điều kiện cần để cấp văn bằng)"
                  status={<SectionStatus done={sectionDefenseDone} />}
                >
                  {chkDefensePe &&
                    DEMO_DEFENSE_PE_ITEMS.map((entry) => (
                      <AuditRow
                        key={entry.key}
                        eyebrow={criterionEyebrow(chkDefensePe, criteriaTotal)}
                        title={entry.title}
                        chip={{ label: entry.chip, tone: 'muted' }}
                        description={`${chkDefensePe.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'} ${entry.requirement}.`}
                        pill={criterionPill(chkDefensePe)}
                      />
                    ))}
                </AuditSection>
              </div>

              <div className="lg:col-span-4 space-y-6">
                {/* Tổng hợp việc cần làm (AC-05 / FR-18) */}
                <div className="rounded-[24px] bg-paper p-6 shadow-sm space-y-4 break-inside-avoid">
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <h2 className="font-subheading text-subheading text-ink font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-ink text-[20px]">checklist</span>
                      <span>Tổng hợp việc cần làm</span>
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-canvas text-ink font-caption text-caption font-bold whitespace-nowrap">
                      {todos.length} mục
                    </span>
                  </div>
                  <p className="font-caption text-caption text-mid-gray">
                    Danh sách điều kiện còn thiếu cần ưu tiên hoàn tất để được đưa vào danh sách xét tốt nghiệp đợt tháng {graduationTerm}:
                  </p>
                  {todos.length > 0 ? (
                    <div className="space-y-3 pt-1">
                      {todos.map((todo, index) => (
                        <div key={todo.key} className="flex items-start gap-3 p-3 rounded-[18px] bg-surface-alt shadow-sm">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-caption text-[11px] font-bold mt-0.5 ${
                              todo.urgent ? 'bg-ink text-paper' : 'bg-canvas text-ink'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="space-y-0.5 text-left min-w-0">
                            <p className="font-body-medium text-body-medium text-ink font-medium leading-snug">{todo.title}</p>
                            <p className="font-caption text-caption text-mid-gray leading-normal">
                              {todo.detail}
                              {todo.deadline && (
                                <>
                                  {' Hạn chót '}
                                  <span className="text-ink font-medium">{todo.deadline}</span>.
                                </>
                              )}
                            </p>
                            {todo.meta && (
                              <p className="font-caption text-[10px] text-mid-gray uppercase tracking-wider pt-0.5">{todo.meta}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-3 rounded-[18px] bg-surface-alt shadow-sm">
                      <span className="material-symbols-outlined text-[20px] text-ink">task_alt</span>
                      <p className="font-caption text-caption text-mid-gray leading-normal">
                        Không còn điều kiện hay chứng chỉ tồn đọng. Hồ sơ đã sẵn sàng cho đợt xét tốt nghiệp.
                      </p>
                    </div>
                  )}
                </div>

                {/* Gợi ý từ AI Advisor */}
                <div className="rounded-[24px] bg-paper p-6 shadow-sm space-y-4 print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-full bg-canvas text-ink">
                      <span className="material-symbols-outlined text-[18px] block">lightbulb</span>
                    </span>
                    <h2 className="font-subheading text-subheading text-ink font-semibold">Gợi ý từ AI Advisor</h2>
                  </div>
                  <p className="font-caption text-caption text-mid-gray leading-relaxed">{advice}</p>
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRemediationModalOpen(true)}
                      className="w-full inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-full bg-ink hover:bg-ink-soft text-paper font-body-medium text-body-medium transition-all shadow-sm group"
                    >
                      <span className="truncate">Bố trí môn thiếu vào Kế hoạch học tập</span>
                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </button>
                    <Link
                      to="/chat"
                      className="w-full inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-full bg-canvas hover:bg-surface-alt text-ink font-body-medium text-body-medium transition-all shadow-sm group"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-mid-gray">auto_awesome</span>
                        <span>Hỏi AI về thủ tục tốt nghiệp sớm</span>
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-mid-gray group-hover:translate-x-0.5 transition-transform">
                        chevron_right
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-disabled="true"
                      title="Tài liệu minh họa — chưa có file đính kèm ở mốc prototype"
                      className="w-full inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-full bg-transparent hover:bg-canvas text-mid-gray hover:text-ink font-body-medium text-body-medium transition-colors cursor-not-allowed"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>Tải danh mục chuẩn đầu ra {cohortShort} (.pdf)</span>
                      </span>
                      <span className="font-caption text-caption text-mid-gray">{DEMO_OUTCOME_CATALOG_SIZE}</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] bg-canvas p-5 shadow-sm space-y-2 print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-mid-gray">support_agent</span>
                    <span className="font-body-medium text-body-medium text-ink font-medium">Cần hỗ trợ đối chiếu hồ sơ?</span>
                  </div>
                  <p className="font-caption text-caption text-mid-gray leading-relaxed">{DEMO_SUPPORT_NOTE}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Khối Chữ ký dành riêng cho Chế độ in ấn (@media print) */}
      <div className="haui-print-signatures">
        <div className="grid grid-cols-2 text-center mt-9 pt-4 text-ink">
          <div>
            <strong className="text-[13px]">SINH VIÊN XÁC NHẬN</strong>
            <div className="text-[11px] italic mt-1">(Ký và ghi rõ họ tên)</div>
            <div className="h-[70px]" />
            <div className="font-semibold">{student.fullName || '—'}</div>
          </div>
          <div>
            <strong className="text-[13px]">CỐ VẤN HỌC TẬP / PHÒNG ĐÀO TẠO</strong>
            <div className="text-[11px] italic mt-1">(Ký, ghi rõ họ tên và đóng dấu)</div>
            <div className="h-[70px]" />
            <div className="font-semibold">{PRINT_ADVISOR_SIGNATURE}</div>
          </div>
        </div>
      </div>

      {/* Modal Lập kế hoạch bù đắp các điều kiện còn thiếu (Màn hình 9 -> Màn hình 5) */}
      <Modal
        isOpen={isRemediationModalOpen}
        onClose={() => setIsRemediationModalOpen(false)}
        title="AI Tự động Lập Kế hoạch Bù đắp Điều kiện Tốt nghiệp Còn thiếu"
        subtitle="Kết nối Màn hình 9 (Kiểm tra tốt nghiệp) → Màn hình 5 (Xác nhận Kế hoạch Học tập)"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsRemediationModalOpen(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-canvas text-ink font-body-medium text-body-medium hover:bg-surface-alt transition-all"
            >
              Đóng (ESC)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRemediationModalOpen(false);
                navigate('/planner');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-paper font-body-medium text-body-medium hover:bg-ink-soft transition-all"
            >
              <span>Chuyển sang Kế hoạch học tập</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3 font-body text-body text-ink">
          <p className="m-0">
            Dựa trên kết quả kiểm tra tốt nghiệp (<strong>{pct}%</strong>, đạt {passedCriteria}/{criteriaTotal} tiêu chí), hệ thống đề xuất tự
            động bổ sung vào lộ trình 2 học kỳ cuối:
          </p>
          <ul className="m-0 pl-5 list-disc space-y-1.5 leading-relaxed">
            <li>
              <strong>Học kỳ 1 (2026-2027):</strong> Đăng ký học lại <code>MATH1002</code> (3 TC) + 2 môn Tự chọn chuyên ngành{' '}
              <code>IT6010</code>, <code>IT6015</code> (6 TC) để hoàn thành 100% khối tự chọn và vượt mốc 85% tín chỉ nhận Đồ án (BR-09).
            </li>
            <li>
              <strong>Chứng chỉ Tin học MOS/IC3 (AC-05):</strong> Đặt lịch nhắc thi chứng chỉ MOS trước hạn chót <code>2027-03-31</code>{' '}
              (trước đợt xét tốt nghiệp 3 tháng).
            </li>
            <li>
              <strong>Học kỳ cuối:</strong> Bố trí nhẹ nhàng làm Đồ án tốt nghiệp <code>IT7008</code> (10 TC).
            </li>
          </ul>
        </div>
      </Modal>

      <DevSlot title="Kiểm tra tốt nghiệp — trạng thái">
        <div className="flex flex-wrap gap-space-xs">
          {DEV_VIEW_STATES.map((state) => (
            <button
              key={state.id}
              type="button"
              onClick={() => setDevState(state.id)}
              className={`px-space-md py-1 rounded-full border font-label text-label transition-colors ${
                devState === state.id ? 'bg-ink text-paper border-ink' : 'border-hairline text-ink hover:bg-canvas'
              }`}
            >
              {state.label}
            </button>
          ))}
        </div>
      </DevSlot>
    </div>
  );
}

export default AcademicProgressPage;
