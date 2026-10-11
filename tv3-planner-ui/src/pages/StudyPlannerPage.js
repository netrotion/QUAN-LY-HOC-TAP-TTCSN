import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  plannerStore,
  PLAN_STATUSES,
  evaluatePlanRules,
  INITIAL_MULTI_SEMESTER_PLAN
} from '../services/plannerStore.js';
import { PlanHistoryModal } from '../components/PlanHistoryModal.js';
import { CurriculumTreeModal } from '../components/CurriculumTreeModal.js';

const h = React.createElement;

/**
 * Màn hình 5: Kế hoạch học tập cá nhân — Tùy chỉnh & Xác nhận (Study Planner) — TV3
 * Giao diện theo prototype `ke_hoach_hoc_tap_ca_nhan/code.html` (route `/planner`).
 *
 * Đáp ứng đầy đủ các yêu cầu nghiệp vụ:
 * 1. Kế hoạch nhiều kỳ (Kỳ 7, Kỳ 8, Kỳ hè...) lấy từ plannerStore: 4 thẻ KPI, thẻ cảnh báo quy chế HaUI
 *    10–24 TC (BR-03/BR-04), bảng môn từng học kỳ kèm điều kiện tiên quyết/ràng buộc/trạng thái môn.
 * 2. State machine DRAFT → VALIDATED → ACTIVE: "Kiểm tra điều kiện" thẩm định, chỉ kích hoạt khi VALIDATED
 *    (có modal xác nhận); mọi chỉnh sửa sau thẩm định đưa kế hoạch về DRAFT.
 * 3. Hội tụ đề xuất từ AI / What-if / Audit: banner đề xuất kèm nhánh Chấp nhận / Hủy.
 * 4. Nhận `?course_id=` từ màn Cây môn học để thêm nhanh môn vào học kỳ.
 * 5. Đầy đủ nhánh hành động: Lưu nháp, Hủy thay đổi, Thêm/Xóa môn, Thêm/Xóa học kỳ, Xem trước,
 *    Lịch sử kế hoạch (`/planner/history`), Xem cây môn học (modal tùy chọn).
 * 6. Đủ 3 trạng thái kiểm thử: Loading, Error, Empty (bộ chuyển trạng thái nằm trong panel công cụ dev).
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2 (dùng `ui.DevSlot` cho công cụ dev)
 */

// ==========================================
// DỮ LIỆU MẪU (store chưa cung cấp)
// ==========================================

// Nhãn khóa/ngành hiển thị cạnh tiêu đề (prototype)
const DEMO_COHORT_LABEL = 'Khóa 16 · CNTT';

// Học kỳ khởi đầu khi kế hoạch rỗng và cần tạo học kỳ đầu tiên
const DEMO_FIRST_SEMESTER = Object.freeze({ year: 2026, term: 1, ordinal: 7 });

// Giới hạn tín chỉ theo quy chế HaUI (đồng bộ với evaluatePlanRules trong plannerStore)
const MAIN_MIN_CREDITS = 10;
const MAIN_MAX_CREDITS = 24;
const SUMMER_MAX_CREDITS = 8;

// Quy chế tóm tắt hiển thị ở "Xem chi tiết quy chế"
const DEMO_HAUI_RULES = [
  { code: 'BR-03', text: 'Học kỳ chính đăng ký tối thiểu 10 tín chỉ.' },
  { code: 'BR-04', text: 'Học kỳ chính đăng ký tối đa 24 tín chỉ (từ 20 TC hệ thống cảnh báo tải cao).' },
  { code: 'Kỳ hè', text: 'Học kỳ phụ (kỳ hè) đăng ký tối đa 8 tín chỉ.' },
  { code: 'BR-01', text: 'Phải đạt học phần tiên quyết trước khi đăng ký học phần sau (không học cùng kỳ).' }
];

/**
 * Danh mục học phần mẫu (tiên quyết, điều kiện tín chỉ, kết quả đã học).
 * Khi API `academic.getCurriculum()` khả dụng, dữ liệu cây môn học thật được gộp đè lên danh mục này.
 * - prerequisites: phải đạt trước (BR-01) · coRequisites: được học song hành cùng kỳ
 * - minCredits: số tín chỉ tích lũy tối thiểu trước khi đăng ký
 */
const DEMO_COURSE_CATALOG = Object.freeze({
  MATH1001: { courseName: 'Giải tích 1', credits: 3, status: 'PASSED', letterGrade: 'B+' },
  IT1001: { courseName: 'Nhập môn lập trình', credits: 3, status: 'PASSED', letterGrade: 'A' },
  IT2002: { courseName: 'Cơ sở dữ liệu', credits: 3, status: 'PASSED', letterGrade: 'B+' },
  IT3001: { courseName: 'Mạng máy tính căn bản', credits: 3, status: 'PASSED', letterGrade: 'B' },
  IT6004: { courseName: 'Công nghệ phần mềm', credits: 3, status: 'PASSED', letterGrade: 'B+' },
  FL1002: { courseName: 'Tiếng Anh cơ bản 2', credits: 3, status: 'PASSED', letterGrade: 'B' },
  IT6055: { courseName: 'Mạng máy tính nâng cao', credits: 3, status: null },
  MATH1002: { courseName: 'Toán rời rạc', credits: 3, status: 'FAILED', letterGrade: 'F', prerequisites: ['MATH1001'], constraint: 'Học lại — gỡ nút thắt tiên quyết' },
  IT2001: { courseName: 'Lập trình hướng đối tượng', credits: 4, status: 'PASSED_LOW', letterGrade: 'D+', prerequisites: ['IT1001'], constraint: 'Học cải thiện (lấy điểm cao nhất)' },
  IT6002: { courseName: 'Lập trình mạng', credits: 3, prerequisites: ['IT3001', 'IT2001'], constraint: 'Bắt buộc chuyên ngành' },
  IT4001: { courseName: 'Cơ sở dữ liệu nâng cao', credits: 3, prerequisites: ['IT2002'], constraint: 'Cân bằng lý thuyết & thực hành' },
  IT6010: { courseName: 'Phát triển ứng dụng Web hiện đại', credits: 3, prerequisites: ['IT2001'], constraint: 'Tự chọn chuyên ngành' },
  FL2001: { courseName: 'Tiếng Anh Công nghệ thông tin', credits: 2, prerequisites: ['FL1002'], constraint: 'Chuẩn ngoại ngữ xét tốt nghiệp' },
  IT6080: { courseName: 'Đồ án chuyên ngành Kỹ thuật phần mềm', credits: 4, prerequisites: ['IT6004'], minCredits: 100 },
  IT6090: { courseName: 'Khóa luận tốt nghiệp KTPM', credits: 6, coRequisites: ['IT6080'], minCredits: 115, constraint: 'Cần CPA ≥ 2.50 & Tích lũy ≥ 115 TC' },
  IT6015: { courseName: 'Kiến trúc phần mềm & Mẫu thiết kế', credits: 3, prerequisites: ['IT2001'], constraint: 'Tự chọn chuyên ngành' },
  SK2001: { courseName: 'Kỹ năng làm việc chuyên nghiệp', credits: 2, constraint: 'Chuẩn đầu ra kỹ năng mềm' },
  IT6099: { courseName: 'Thực tập tốt nghiệp doanh nghiệp', credits: 4, minCredits: 100, constraint: 'Tối đa 8 TC/kỳ hè' },
  IT6001: { courseName: 'Cấu trúc dữ liệu & Giải thuật', credits: 4, prerequisites: ['MATH1002', 'IT1001'], constraint: 'Mở khóa chuỗi Thuật toán' },
  IT6005: { courseName: 'Phân tích & Thiết kế thuật toán', credits: 3, prerequisites: ['IT6001'], constraint: 'Bắt buộc chuyên ngành' },
  IT7001: { courseName: 'Trí tuệ nhân tạo căn bản', credits: 3, prerequisites: ['IT6001', 'MATH1002'], constraint: 'Tự chọn chuyên ngành' },
  IT7010: { courseName: 'An toàn thông tin ứng dụng', credits: 3, prerequisites: ['IT3001'], constraint: 'Tự chọn chuyên ngành' },
  ENG3001: { courseName: 'Tiếng Anh chuyên ngành nâng cao', credits: 2, prerequisites: ['FL2001'], constraint: 'Chuẩn ngoại ngữ xét tốt nghiệp' },
  IT6060: { courseName: 'Lập trình ứng dụng Web nâng cao (React/Node)', credits: 3, prerequisites: ['IT6010'], constraint: 'Tự chọn chuyên sâu' },
  IT6092: { courseName: 'An toàn và bảo mật hệ thống thông tin', credits: 3, prerequisites: ['IT3001'], constraint: 'Chuyên ngành' },
  IT6045: { courseName: 'DevOps và Tự động hóa triển khai phần mềm', credits: 3, constraint: 'Khuyến nghị học sau Hệ điều hành & Kiến trúc máy tính' },
  IT6095: { courseName: 'Nghiên cứu chuyên sâu Hệ phân tán nâng cao', credits: 3, prerequisites: ['IT6055'], constraint: 'Tự chọn chuyên sâu' }
});

// Danh mục môn có thể thêm vào kế hoạch (modal "Chọn môn học đưa vào kế hoạch")
const DEMO_ADD_COURSE_POOL = [
  { courseCode: 'IT6060', courseName: 'Lập trình ứng dụng Web nâng cao (React/Node)', credits: 3, courseType: 'Tự chọn chuyên ngành', group: 'Tự chọn' },
  { courseCode: 'IT6092', courseName: 'An toàn và bảo mật hệ thống thông tin', credits: 3, courseType: 'Chuyên ngành', group: 'Chuyên ngành' },
  { courseCode: 'IT6045', courseName: 'DevOps và Tự động hóa triển khai phần mềm', credits: 3, courseType: 'Tự chọn chuyên ngành', group: 'Tự chọn' },
  { courseCode: 'IT6001', courseName: 'Cấu trúc dữ liệu & Giải thuật', credits: 4, courseType: 'Chuẩn CTĐT', group: 'Chuyên ngành' },
  { courseCode: 'IT6005', courseName: 'Phân tích & Thiết kế thuật toán', credits: 3, courseType: 'Chuyên ngành', group: 'Chuyên ngành' },
  { courseCode: 'IT7001', courseName: 'Trí tuệ nhân tạo căn bản', credits: 3, courseType: 'Tự chọn chuyên ngành', group: 'Tự chọn' },
  { courseCode: 'IT7010', courseName: 'An toàn thông tin ứng dụng', credits: 3, courseType: 'Tự chọn chuyên ngành', group: 'Tự chọn' },
  { courseCode: 'ENG3001', courseName: 'Tiếng Anh chuyên ngành nâng cao', credits: 2, courseType: 'Bắt buộc chung', group: 'Đại cương' },
  { courseCode: 'IT6095', courseName: 'Nghiên cứu chuyên sâu Hệ phân tán nâng cao', credits: 3, courseType: 'Tự chọn chuyên ngành', group: 'Tự chọn' }
];

const ADD_COURSE_FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'Chuyên ngành', label: 'Chuyên ngành' },
  { key: 'Tự chọn', label: 'Tự chọn' },
  { key: 'Đại cương', label: 'Đại cương' }
];

// ==========================================
// LỚP GIAO DIỆN DÙNG CHUNG (theo prototype)
// ==========================================
const CARD_CLASS = 'bg-paper rounded-[24px] border border-hairline shadow-[0_1px_8px_rgba(0,0,0,0.02)]';
const KPI_CARD_CLASS =
  'bg-paper p-space-lg rounded-[24px] border border-hairline shadow-[0_1px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden group hover:border-ink transition-colors';
const BTN_OUTLINE =
  'inline-flex items-center gap-1.5 bg-paper hover:bg-canvas text-ink px-4 py-2 rounded-full font-body-medium text-body-medium border border-hairline transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST =
  'inline-flex items-center gap-1.5 bg-transparent hover:bg-canvas text-mid-gray hover:text-ink px-4 py-2 rounded-full font-body-medium text-body-medium transition-all';
const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 bg-[#0a0a0a] hover:bg-ink-soft text-paper px-5 py-2 rounded-full font-body-medium text-body-medium transition-all shadow-[0_4px_12px_rgba(0,0,0,0.12)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0a0a0a]';
const BTN_SOFT =
  'px-4 py-2 rounded-full bg-canvas hover:bg-surface-variant text-ink font-body-medium text-body-medium border border-hairline transition-colors';
const MODAL_OVERLAY = 'fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4';
const MODAL_PANEL =
  'bg-paper rounded-[24px] w-full p-space-xl border border-hairline shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col gap-space-md max-h-[90vh]';
const ICON_BTN =
  'w-8 h-8 rounded-full hover:bg-canvas flex items-center justify-center text-mid-gray hover:text-ink transition-colors';

const icon = (name, className = 'text-[18px]') => h('span', { className: `material-symbols-outlined ${className}` }, name);

// ==========================================
// HÀM THUẦN: HỌC KỲ & ĐIỀU KIỆN MÔN HỌC
// ==========================================
const isSummerSemester = (sem) => String(sem?.semesterCode || '').includes('SUMMER');

const sumCredits = (semesters) => semesters.reduce((sum, s) => sum + (Number(s.totalCredits) || 0), 0);

// Thứ tự thời gian: YYYY_1 (thu YYYY) < YYYY_2 (xuân YYYY+1) < (YYYY+1)_SUMMER < (YYYY+1)_1
const semesterSortKey = (code) => {
  let m = /^(\d{4})_(\d)$/.exec(code || '');
  if (m) return Number(m[1]) * 10 + Number(m[2]);
  m = /^(\d{4})_SUMMER$/.exec(code || '');
  if (m) return (Number(m[1]) - 1) * 10 + 3;
  return Number.MAX_SAFE_INTEGER;
};

const semesterShortLabel = (sem) => {
  if (!sem) return '';
  const code = String(sem.semesterCode || '');
  const summer = /^(\d{4})_SUMMER$/.exec(code);
  if (summer) return `Kỳ hè ${summer[1]}`;
  const ordinal = /Kỳ (\d+)/.exec(sem.semesterName || '');
  if (ordinal) return `Kỳ ${ordinal[1]}`;
  const main = /^(\d{4})_(\d)$/.exec(code);
  if (main) return `HK${main[2]} ${main[1]}–${Number(main[1]) + 1}`;
  return sem.semesterName || code;
};

const semesterBadge = (sem, idx) => {
  const ordinal = /Kỳ (\d+)/.exec(sem?.semesterName || '');
  return String(ordinal ? ordinal[1] : idx + 1).padStart(2, '0');
};

// "Học kỳ 1 (2026 - 2027) — Kỳ 7" → "Học kỳ 7 (Học kỳ 1 năm học 2026–2027)" như prototype
const formatSemesterTitle = (name) => {
  const m = /^Học kỳ (\d+) \((\d{4}) - (\d{4})\) — Kỳ (\d+)$/.exec(name || '');
  return m ? `Học kỳ ${m[4]} (Học kỳ ${m[1]} năm học ${m[2]}–${m[3]})` : name;
};

const semesterPeriod = (code) => {
  let m = /^(\d{4})_1$/.exec(code || '');
  if (m) return `08/${m[1]} – 12/${m[1]}`;
  m = /^(\d{4})_2$/.exec(code || '');
  if (m) return `01/${Number(m[1]) + 1} – 06/${Number(m[1]) + 1}`;
  m = /^(\d{4})_SUMMER$/.exec(code || '');
  if (m) return `07/${m[1]} – 08/${m[1]}`;
  return null;
};

// Nhãn đánh giá tải: dùng mô tả của store nếu còn khớp số tín chỉ hiện tại, ngược lại tự tính
const workloadLabel = (sem, credits) => {
  const m = /^(.*?)\s*\((\d+)\s*\/\s*\d+/.exec(sem?.workloadAssessment || '');
  if (m && Number(m[2]) === credits && m[1]) return m[1];
  if (isSummerSemester(sem)) return credits > SUMMER_MAX_CREDITS ? 'Vượt trần kỳ hè' : credits === 0 ? 'Chưa xếp môn' : 'Trong giới hạn kỳ hè';
  if (credits === 0) return 'Chưa xếp môn';
  if (credits < MAIN_MIN_CREDITS) return 'Dưới sàn tối thiểu';
  if (credits > MAIN_MAX_CREDITS) return 'Quá tải';
  if (credits >= 20) return 'Tải cao';
  if (credits >= 15) return 'Cân bằng';
  return 'Nhẹ';
};

// Tạo học kỳ chính kế tiếp (Học kỳ 9...) hoặc kỳ hè kế tiếp cho nút "Thêm học kỳ"
const buildNextSemester = (semesters, kind) => {
  const mains = semesters
    .map((s) => /^(\d{4})_(\d)$/.exec(s.semesterCode || ''))
    .filter(Boolean)
    .map((m) => ({ year: Number(m[1]), term: Number(m[2]) }));
  const ordinals = semesters
    .map((s) => /Kỳ (\d+)/.exec(s.semesterName || ''))
    .filter(Boolean)
    .map((m) => Number(m[1]));

  if (kind === 'summer') {
    const summers = new Set(
      semesters.map((s) => /^(\d{4})_SUMMER$/.exec(s.semesterCode || '')).filter(Boolean).map((m) => Number(m[1]))
    );
    let year = (mains.length ? Math.min(...mains.map((m) => m.year)) : DEMO_FIRST_SEMESTER.year) + 1;
    while (summers.has(year)) year += 1;
    return {
      semesterCode: `${year}_SUMMER`,
      semesterName: `Học kỳ phụ (Kỳ hè ${year})`,
      workloadAssessment: `Chưa xếp môn (0 / ${SUMMER_MAX_CREDITS} TC tối đa)`,
      totalCredits: 0,
      expectedGpa: null,
      courses: []
    };
  }

  let year = DEMO_FIRST_SEMESTER.year;
  let term = DEMO_FIRST_SEMESTER.term;
  if (mains.length) {
    const last = mains.reduce((a, b) => (a.year * 10 + a.term >= b.year * 10 + b.term ? a : b));
    year = last.term >= 2 ? last.year + 1 : last.year;
    term = last.term >= 2 ? 1 : 2;
  }
  const ordinal = ordinals.length ? Math.max(...ordinals) + 1 : DEMO_FIRST_SEMESTER.ordinal;
  return {
    semesterCode: `${year}_${term}`,
    semesterName: `Học kỳ ${term} (${year} - ${year + 1}) — Kỳ ${ordinal}`,
    workloadAssessment: `Chưa xếp môn (0 / ${MAIN_MAX_CREDITS} TC)`,
    totalCredits: 0,
    expectedGpa: null,
    courses: []
  };
};

// Kết quả học tập lấy theo trạng thái cây môn học. Chỉ tin `letterGrade` khi môn được AI đề xuất học cải thiện
// (đã có điểm D/D+) hoặc dữ liệu mẫu không có trạng thái — cây môn học động giữ điểm mẫu cho môn chưa học
// (READY_TO_TAKE / BLOCKED / NOT_TAKEN...), các trạng thái đó luôn tính là chưa đạt.
const isPassedCourse = (meta) => {
  if (!meta) return false;
  if (meta.status === 'PASSED' || meta.status === 'PASSED_LOW') return true;
  if (meta.status === 'AI_RECOMMENDED' || meta.status == null) {
    return Boolean(meta.letterGrade) && meta.letterGrade !== 'F';
  }
  return false;
};

const locateCourse = (semesters, code) =>
  semesters.findIndex((s) => (s.courses || []).some((c) => c.courseCode === code));

/**
 * Đánh giá điều kiện đăng ký của một học phần tại vị trí học kỳ `semIndex` trong kế hoạch:
 * tiên quyết (đã đạt / xếp ở kỳ trước / thiếu), song hành, và điều kiện tín chỉ tích lũy.
 */
function evaluateCourseEligibility({ courseCode, semIndex, semesters, catalog, earnedCredits }) {
  const meta = catalog[courseCode] || {};
  const nameOf = (code) => (catalog[code]?.courseName ? `${code} ${catalog[code].courseName}` : code);
  // waitIndex = -1: môn đang học ở học kỳ hiện tại (trước toàn bộ kế hoạch)
  const shortAt = (idx) => (idx < 0 ? 'kỳ hiện tại' : semesterShortLabel(semesters[idx]));
  const items = [];

  for (const code of meta.prerequisites || []) {
    const pm = catalog[code];
    if (isPassedCourse(pm)) {
      items.push({ state: 'met', code, text: `${nameOf(code)} (Đạt ${pm.letterGrade || 'yêu cầu'})` });
      continue;
    }
    if (pm?.status === 'IN_PROGRESS') {
      items.push({
        state: 'pending',
        code,
        waitIndex: -1,
        text: `${nameOf(code)} (Đang học)`,
        issue: `Yêu cầu đạt ${nameOf(code)} (đang học ở kỳ hiện tại) — chờ kết quả kỳ hiện tại để mở khóa.`
      });
      continue;
    }
    const at = locateCourse(semesters, code);
    if (at >= 0 && at < semIndex) {
      items.push({
        state: 'pending',
        code,
        waitIndex: at,
        text: `${nameOf(code)} (Học ở ${shortAt(at)})`,
        issue: `Yêu cầu đạt ${nameOf(code)} (đang xếp ở ${shortAt(at)}) — chờ kết quả ${shortAt(at)} để mở khóa.`
      });
    } else if (at >= 0) {
      items.push({
        state: 'missing',
        code,
        reason: at === semIndex ? `Phải đạt ${code} trước kỳ này` : `${code} đang xếp sau kỳ này`,
        text: `${nameOf(code)} (${at === semIndex ? 'Xếp cùng kỳ' : `Xếp ở ${shortAt(at)}`})`,
        issue: `${nameOf(code)} đang xếp ở ${shortAt(at)} — phải đạt môn tiên quyết trước khi đăng ký (BR-01).`
      });
    } else {
      const failed = pm?.status === 'FAILED';
      items.push({
        state: 'missing',
        code,
        reason: `Thiếu học phần tiên quyết ${code}`,
        text: `${nameOf(code)} (${failed ? 'Nợ môn F' : 'Chưa học'})`,
        issue: `Yêu cầu hoàn thành ${nameOf(code)} trước khi đăng ký (hiện ${failed ? 'đang nợ môn F' : 'chưa học'} và chưa có trong kế hoạch).`
      });
    }
  }

  for (const code of meta.coRequisites || []) {
    const pm = catalog[code];
    if (isPassedCourse(pm)) {
      items.push({ state: 'met', code, text: `${nameOf(code)} (Đạt ${pm.letterGrade || 'yêu cầu'})` });
      continue;
    }
    const at = locateCourse(semesters, code);
    if (at >= 0 && at <= semIndex) {
      items.push({ state: 'co', code, text: `${nameOf(code)} (${at === semIndex ? 'Học song hành' : `Học ở ${shortAt(at)}`})` });
    } else {
      items.push({
        state: 'missing',
        code,
        reason: `Thiếu học phần song hành ${code}`,
        text: `${nameOf(code)} (Chưa xếp lịch)`,
        issue: `Cần học song hành ${nameOf(code)} nhưng môn này chưa có trong kế hoạch (hoặc xếp sau).`
      });
    }
  }

  let credit = null;
  if (meta.minCredits) {
    const min = meta.minCredits;
    const before = earnedCredits + sumCredits(semesters.slice(0, Math.max(semIndex, 0)));
    if (earnedCredits >= min) {
      credit = { state: 'met', text: `Tích lũy ≥ ${min} TC (Hiện: ${earnedCredits} TC)` };
    } else if (before >= min) {
      let acc = earnedCredits;
      let waitIndex = semIndex - 1;
      for (let i = 0; i < semIndex; i += 1) {
        acc += Number(semesters[i].totalCredits) || 0;
        if (acc >= min) {
          waitIndex = i;
          break;
        }
      }
      credit = {
        state: 'pending',
        waitIndex,
        text: meta.constraint || `Tích lũy ≥ ${min} TC`,
        issue: `${meta.constraint || `Yêu cầu tích lũy ≥ ${min} TC`} (Hiện trạng: ${earnedCredits} TC, dự kiến ${before} TC sau ${shortAt(waitIndex)}) — chờ kết quả ${shortAt(waitIndex)} để mở khóa.`
      };
    } else {
      credit = {
        state: 'missing',
        reason: `Chưa đủ ${min} TC tích lũy`,
        text: `Cần tích lũy ≥ ${min} TC (Dự kiến: ${before} TC)`,
        issue: `Yêu cầu tích lũy ≥ ${min} TC nhưng dự kiến chỉ đạt ${before} TC trước học kỳ này.`
      };
    }
  }

  const missing = [...items.filter((i) => i.state === 'missing'), ...(credit?.state === 'missing' ? [credit] : [])];
  const pending = [...items.filter((i) => i.state === 'pending'), ...(credit?.state === 'pending' ? [credit] : [])];

  let status = 'ok';
  let statusLabel = 'Hợp lệ (Đủ điều kiện)';
  let statusNote = null;
  let shortNote = null;
  let issue = null;
  if (missing.length > 0) {
    status = 'blocked';
    statusLabel = 'Chưa đủ điều kiện';
    statusNote = missing[0].reason;
    shortNote = missing[0].reason;
    issue = missing[0].issue;
  } else if (pending.length > 0) {
    const wait = Math.max(...pending.map((p) => p.waitIndex));
    const label = shortAt(wait);
    status = 'warning';
    statusLabel = `Cảnh báo (Chờ xét ${label})`;
    statusNote = `Chờ kết quả ${label} để mở khóa`;
    shortNote = `chờ xét ${label}`;
    issue = pending[pending.length - 1].issue;
  }

  const prereqState =
    items.length === 0
      ? 'none'
      : items.some((i) => i.state === 'missing')
        ? 'missing'
        : items.every((i) => i.state === 'met')
          ? 'met'
          : 'pending';

  const constraintText = credit ? credit.text : meta.constraint || 'Không có ràng buộc phụ';

  return {
    status,
    statusLabel,
    statusNote,
    shortNote,
    issue,
    prereqItems: items,
    prereqState,
    prereqText: items.length ? items.map((i) => i.text).join(', ') : 'Không yêu cầu tiên quyết',
    constraintText,
    constraintState: credit?.state || 'none',
    meta
  };
}

// ==========================================
// COMPONENT
// ==========================================
export function StudyPlannerPage({ api, ui } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const incomingCourseId = (searchParams.get('course_id') || '').trim() || null;

  // State kế hoạch từ plannerStore
  const [storeState, setStoreState] = useState(() => plannerStore.getState());
  // `validationResult` do store quản lý: tự xóa khi kế hoạch bị chỉnh sửa, tránh hiển thị kết quả thẩm định cũ
  const { plan, incomingProposal, validation: validationResult } = storeState;
  const isValidated = plan?.status === PLAN_STATUSES.VALIDATED;
  const isActive = plan?.status === PLAN_STATUSES.ACTIVE;
  const activeEntry = storeState.history?.find((h) => h.status === PLAN_STATUSES.ACTIVE) || null;
  const savedEntry = storeState.history?.find((h) => h.planId === plan?.planId) || null;

  // Trạng thái giao diện
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { message, tone: 'ok' | 'warn' }
  const toastTimerRef = useRef(null);

  // Modals state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [selectedSemesterForAdd, setSelectedSemesterForAdd] = useState('2026_1');
  const [addCourseQuery, setAddCourseQuery] = useState('');
  const [addCourseFilter, setAddCourseFilter] = useState('ALL');
  const [pendingDelete, setPendingDelete] = useState(null); // { kind: 'course' | 'semester', semesterCode, courseCode?, title, semesterLabel }

  // Tương tác trên trang
  const [expandedCourseKey, setExpandedCourseKey] = useState(null);
  const [openSemesterMenu, setOpenSemesterMenu] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showRuleDetails, setShowRuleDetails] = useState(false);

  // Thẩm định quy chế
  const [validating, setValidating] = useState(false);

  // Cây môn học (tiên quyết thật từ API TV2, nếu có)
  const [curriculumCourses, setCurriculumCourses] = useState(null);

  const showToast = useCallback((message, tone = 'ok') => {
    setToast({ message, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Đăng ký lắng nghe thay đổi từ plannerStore
  useEffect(() => {
    const unsubscribe = plannerStore.subscribe((newState) => {
      setStoreState(newState);
    });
    return unsubscribe;
  }, []);

  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  // Thông báo chuyển tiếp từ màn Lịch sử kế hoạch (Mở lại / Kích hoạt): hiển thị một lần rồi xóa state
  // để không lặp lại khi tải lại trang. Dạng: chuỗi thông báo (hoặc { message, type }).
  useEffect(() => {
    const flash = location.state?.plannerFlash;
    if (!flash) return;
    const message = typeof flash === 'string' ? flash : flash.message;
    const isWarn = typeof flash === 'object' && (flash.type === 'error' || flash.type === 'warn' || flash.success === false);
    if (message) showToast(message, isWarn ? 'warn' : 'ok');
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [location.state, location.pathname, location.search, navigate, showToast]);

  // Lắng nghe custom event từ Chat / What-if nếu có
  useEffect(() => {
    const handleProposalEvent = (e) => {
      if (e.detail) {
        showToast(`Đã nhận phương án mới từ ${e.detail.sourceName || 'Hệ thống'}!`);
      }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('haui:planner:proposal', handleProposalEvent);
      return () => window.removeEventListener('haui:planner:proposal', handleProposalEvent);
    }
    return undefined;
  }, [showToast]);

  // Khóa tải lại cây môn học khi đổi sinh viên phiên (persona) hoặc chế độ MOCK/LIVE của api
  const sessionKeyOf = (config) => `${config?.sessionStudent?.studentId || ''}|${config?.mockEnabled ? 'mock' : 'live'}`;
  const [curriculumKey, setCurriculumKey] = useState(() =>
    typeof api?.getConfig === 'function' ? sessionKeyOf(api.getConfig()) : ''
  );
  useEffect(() => {
    if (typeof api?.subscribe !== 'function') return undefined;
    return api.subscribe((config) => setCurriculumKey(sessionKeyOf(config)));
  }, [api]);

  // Tải cây môn học để đối chiếu tiên quyết (không chặn giao diện; lỗi thì dùng danh mục mẫu)
  useEffect(() => {
    let cancelled = false;
    if (!api?.academic || typeof api.academic.getCurriculum !== 'function') {
      setCurriculumCourses([]);
      return undefined;
    }
    Promise.resolve()
      .then(() => api.academic.getCurriculum())
      .then((res) => {
        if (!cancelled) setCurriculumCourses(Array.isArray(res?.courses) ? res.courses : []);
      })
      .catch(() => {
        if (!cancelled) setCurriculumCourses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [api, curriculumKey]);

  // ESC đóng các modal / menu của trang
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setIsActivateModalOpen(false);
      setIsAddCourseModalOpen(false);
      setPendingDelete(null);
      setOpenSemesterMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ==========================================
  // DỮ LIỆU DẪN XUẤT
  // ==========================================
  const semesters = useMemo(() => (Array.isArray(plan?.semesters) ? plan.semesters : []), [plan]);

  // Tổng số tín chỉ trong toàn bộ kế hoạch
  const totalPlannedCredits = useMemo(() => sumCredits(semesters), [semesters]);

  const earnedCredits = Number(plan?.totalEarnedCredits) || 108;
  const requiredCredits = Number(plan?.totalRequiredCredits) || 145;
  const remainingCredits = Number(plan?.remainingCredits) || 37;
  const earnedPct = Math.min(100, Math.round((earnedCredits / requiredCredits) * 1000) / 10);

  const catalog = useMemo(() => {
    const apiCourses = curriculumCourses || [];
    // Sinh viên chưa có bảng điểm (cây môn học thật không có môn nào đã học): bỏ kết quả học tập mẫu
    const noTranscript =
      apiCourses.length > 0 &&
      !apiCourses.some((c) => ['PASSED', 'PASSED_LOW', 'FAILED', 'IN_PROGRESS'].includes(c?.status));
    const map = {};
    for (const [code, meta] of Object.entries(DEMO_COURSE_CATALOG)) {
      map[code] = noTranscript ? { ...meta, status: null, letterGrade: null } : { ...meta };
    }
    for (const c of apiCourses) {
      if (!c?.courseCode) continue;
      map[c.courseCode] = { ...(map[c.courseCode] || {}), ...c, courseType: c.block || map[c.courseCode]?.courseType };
    }
    return map;
  }, [curriculumCourses]);

  // Kiểm tra quy chế tín chỉ trực tiếp (xem trước) theo từng học kỳ
  const liveRules = useMemo(() => evaluatePlanRules({ semesters }), [semesters]);
  const semesterRules = useMemo(
    () =>
      semesters.map((sem) => {
        const res = evaluatePlanRules({ semesters: [sem] });
        return { ...res, valid: res.violations.length === 0 };
      }),
    [semesters]
  );

  // Đánh giá điều kiện từng môn trong kế hoạch
  const courseChecks = useMemo(() => {
    const map = {};
    semesters.forEach((sem, semIndex) => {
      for (const course of sem.courses || []) {
        map[`${sem.semesterCode}:${course.courseCode}`] = evaluateCourseEligibility({
          courseCode: course.courseCode,
          semIndex,
          semesters,
          catalog,
          earnedCredits
        });
      }
    });
    return map;
  }, [semesters, catalog, earnedCredits]);

  const courseIssues = useMemo(() => {
    const list = [];
    semesters.forEach((sem) => {
      for (const course of sem.courses || []) {
        const check = courseChecks[`${sem.semesterCode}:${course.courseCode}`];
        if (check && check.status !== 'ok') list.push({ semester: sem, course, check });
      }
    });
    return list;
  }, [semesters, courseChecks]);

  const totalCourses = semesters.reduce((sum, s) => sum + (s.courses || []).length, 0);
  const okCourses = totalCourses - courseIssues.length;
  const mainSemesters = semesters.filter((s) => !isSummerSemester(s));
  const summerSemesters = semesters.filter(isSummerSemester);
  const okSemesterCount = semesterRules.filter((r) => r.valid).length;
  const ruleWarnings = validationResult ? validationResult.warnings || [] : liveRules.warnings;
  const ruleViolations = validationResult ? validationResult.violations || [] : liveRules.violations;
  const warningCount = courseIssues.length + ruleWarnings.length;

  const semesterSummary = semesters
    .map((s) => `${isSummerSemester(s) ? 'Hè' : semesterShortLabel(s)}: ${Number(s.totalCredits) || 0} TC`)
    .join(' · ');

  // Môn được chuyển từ màn Cây môn học (?course_id=)
  const incomingCourse = useMemo(() => {
    if (!incomingCourseId) return null;
    const plannedAt = locateCourse(semesters, incomingCourseId);
    const meta = catalog[incomingCourseId];
    const poolItem = DEMO_ADD_COURSE_POOL.find((c) => c.courseCode === incomingCourseId);
    if (!meta && !poolItem) return { code: incomingCourseId, unknown: true, plannedAt };
    return {
      code: incomingCourseId,
      plannedAt,
      course: {
        courseCode: incomingCourseId,
        courseName: poolItem?.courseName || meta?.courseName || incomingCourseId,
        credits: Number(poolItem?.credits || meta?.credits) || 3,
        courseType: poolItem?.courseType || meta?.courseType || 'Tự chọn chuyên ngành',
        rationale: 'Bổ sung từ màn Cây môn học (Curriculum Explorer)'
      }
    };
  }, [incomingCourseId, semesters, catalog]);
  const highlightCourseCode = incomingCourse && incomingCourse.plannedAt >= 0 ? incomingCourse.code : null;

  // Cuộn tới môn được chọn từ Cây môn học nếu đã có trong kế hoạch
  useEffect(() => {
    if (!highlightCourseCode || typeof document === 'undefined') return;
    const row = document.getElementById(`planner-course-${highlightCourseCode}`);
    if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightCourseCode, curriculumCourses]);

  // ==========================================
  // HÀNH ĐỘNG
  // ==========================================

  // Gọi API tạo/tải lại kế hoạch học tập đề xuất từ backend
  const handleFetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (api && api.planner && typeof api.planner.generate === 'function') {
        const response = await api.planner.generate({ targetSemester: '2026_1' });
        if (response && response.semesters) {
          // Merge thông tin từ response vào store
          plannerStore.setIncomingProposal(response, 'Backend API');
          plannerStore.acceptProposal();
        }
      } else {
        // Khôi phục về dữ liệu chuẩn của store
        plannerStore.resetToDefault();
      }
      showToast('Đã tải lại kế hoạch học tập tối ưu!');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  // Hành động: Kiểm tra điều kiện (Thẩm định quy chế): DRAFT → VALIDATED
  // Store luôn là nơi chuyển trạng thái; kết quả backend (nếu có) chỉ được gộp thêm vi phạm/cảnh báo.
  const handleValidatePlan = useCallback(async () => {
    setValidating(true);
    let external = {};
    try {
      if (api && api.planner && typeof api.planner.validate === 'function') {
        const firstSem = plan?.semesters?.[0];
        const apiRes = await api.planner.validate({ totalCredits: Number(firstSem?.totalCredits) || 0 });
        external = {
          externalViolations: apiRes?.valid === false ? apiRes.violations || [] : [],
          externalWarnings: apiRes?.warnings || []
        };
      }
    } catch (err) {
      // Backend không phản hồi: vẫn thẩm định bằng bộ quy chế cục bộ
    } finally {
      const res = plannerStore.validatePlan(external);
      setValidating(false);
      showToast(
        res.valid
          ? 'Kế hoạch hợp lệ theo quy chế HaUI — đã chuyển sang VALIDATED, có thể kích hoạt.'
          : `Phát hiện ${res.violations.length} vi phạm quy chế — kế hoạch vẫn ở DRAFT.`,
        res.valid ? 'ok' : 'warn'
      );
    }
  }, [api, plan, showToast]);

  // Hành động: Lưu bản nháp (Save Draft)
  const handleSaveDraft = useCallback(() => {
    const res = plannerStore.saveDraft();
    showToast(res.message, res.success ? 'ok' : 'warn');
  }, [showToast]);

  // Hành động: Kích hoạt kế hoạch (Bắt đầu theo dõi)
  // F23-005: store từ chối nếu kế hoạch chưa VALIDATED hoặc còn vi phạm quy chế
  const handleConfirmActivate = useCallback(() => {
    setIsActivateModalOpen(false);
    const res = plannerStore.activatePlan();
    showToast(res.message, res.success ? 'ok' : 'warn');
  }, [showToast]);

  // Hành động: Chấp nhận đề xuất từ AI / What-if
  const handleAcceptProposal = useCallback(() => {
    plannerStore.acceptProposal();
    showToast('Đã chấp nhận và áp dụng phương án đề xuất vào Kế hoạch học tập!');
  }, [showToast]);

  // Hành động: Hủy đề xuất từ AI / What-if
  const handleDismissProposal = useCallback(() => {
    plannerStore.dismissProposal();
    showToast('Đã hủy bỏ phương án đề xuất.');
  }, [showToast]);

  // Hành động: Bỏ một môn học khỏi học kỳ
  const handleRemoveCourse = useCallback((semesterCode, courseCode) => {
    plannerStore.removeCourseFromSemester(semesterCode, courseCode);
    showToast(`Đã bỏ môn ${courseCode} khỏi kế hoạch và cập nhật lại số tín chỉ.`);
  }, [showToast]);

  // Thêm môn vào một học kỳ chỉ định
  const addCourseTo = useCallback((semesterCode, course) => {
    const success = plannerStore.addCourseToSemester(semesterCode, course);
    if (success) {
      showToast(`Đã thêm môn ${course.courseCode} vào học kỳ.`);
    } else {
      showToast(`Môn ${course.courseCode} đã có trong học kỳ này!`, 'warn');
    }
    return success;
  }, [showToast]);

  // Hành động: Thêm môn học (modal)
  const handleAddCourse = useCallback((course) => {
    setIsAddCourseModalOpen(false);
    addCourseTo(selectedSemesterForAdd, course);
  }, [selectedSemesterForAdd, addCourseTo]);

  const openAddCourseModal = useCallback((semesterCode) => {
    setSelectedSemesterForAdd(semesterCode);
    setAddCourseQuery('');
    setAddCourseFilter('ALL');
    setIsAddCourseModalOpen(true);
  }, []);

  // Hành động: Hủy thay đổi — F23-004: chỉ hoàn tác về mốc đã lưu/kích hoạt gần nhất, giữ nguyên lịch sử
  const handleDiscardChanges = useCallback(() => {
    const res = plannerStore.discardDraftChanges();
    showToast(res.message);
  }, [showToast]);

  // Thêm học kỳ chính / kỳ hè mới (qua setPlan: kế hoạch quay về DRAFT để thẩm định lại)
  const handleAddSemester = useCallback((kind) => {
    const current = plannerStore.getPlan()?.semesters || [];
    const next = buildNextSemester(current, kind);
    const ordered = [...current, next].sort((a, b) => semesterSortKey(a.semesterCode) - semesterSortKey(b.semesterCode));
    plannerStore.setPlan({ semesters: ordered });
    showToast(
      kind === 'summer'
        ? `Đã thêm ${next.semesterName} — tối đa ${SUMMER_MAX_CREDITS} TC.`
        : `Đã thêm ${formatSemesterTitle(next.semesterName)} — cần tối thiểu ${MAIN_MIN_CREDITS} TC trước khi thẩm định.`
    );
  }, [showToast]);

  // Xóa một học kỳ khỏi lộ trình
  const handleRemoveSemester = useCallback((semesterCode) => {
    const current = plannerStore.getPlan()?.semesters || [];
    const target = current.find((s) => s.semesterCode === semesterCode);
    plannerStore.setPlan({ semesters: current.filter((s) => s.semesterCode !== semesterCode) });
    showToast(`Đã xóa ${target ? semesterShortLabel(target) : semesterCode} khỏi lộ trình.`);
  }, [showToast]);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'semester') {
      handleRemoveSemester(pendingDelete.semesterCode);
    } else {
      handleRemoveCourse(pendingDelete.semesterCode, pendingDelete.courseCode);
    }
    setPendingDelete(null);
  }, [pendingDelete, handleRemoveSemester, handleRemoveCourse]);

  // Bỏ tham số ?course_id= sau khi xử lý
  const clearIncomingCourse = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('course_id');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleAddIncomingCourse = useCallback((semesterCode) => {
    if (!incomingCourse?.course) return;
    if (addCourseTo(semesterCode, incomingCourse.course)) clearIncomingCourse();
  }, [incomingCourse, addCourseTo, clearIncomingCourse]);

  // Thao tác mô phỏng Empty & Error state để phục vụ test
  const handleClearPlan = useCallback(() => {
    plannerStore.setPlan({ semesters: [] });
  }, []);

  const handleTriggerError = useCallback(() => {
    setError({
      code: 'PLANNER_API_ERROR',
      message: 'Mô phỏng lỗi kết nối máy chủ khi truy xuất kế hoạch học tập.',
      details: ['Endpoint POST /api/v1/planner/generate gặp sự cố', 'Bấm "Thử lại" để tải lại dữ liệu']
    });
  }, []);

  const handleSimulateLoading = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  }, []);

  const handleSimulateProposal = useCallback(() => {
    const base = INITIAL_MULTI_SEMESTER_PLAN;
    plannerStore.setIncomingProposal(
      {
        projectedCpa: 3.4,
        projectedRank: 'Bằng Giỏi (CPA ≥ 3.20)',
        semesters: base.semesters.map((s) => ({ ...s, courses: s.courses.map((c) => ({ ...c })) })),
        aiRiskAdvice: 'Phương án mẫu từ AI Advisor: giữ 3 học kỳ, ưu tiên gỡ MATH1002 ở Kỳ 7.'
      },
      'AI Advisor'
    );
  }, []);

  // ==========================================
  // 1. HEADER (breadcrumb + tiêu đề + trạng thái + hành động)
  // ==========================================
  const version = plan?.version || 'v2.4';
  const statusPill = isActive
    ? h(
        'span',
        { className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink text-paper font-label text-label border border-ink shadow-sm' },
        h('span', { className: 'w-1.5 h-1.5 rounded-full bg-paper' }),
        `${version} · Dữ liệu kế hoạch chính thức áp dụng`
      )
    : isValidated
      ? h(
          'span',
          { className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper text-ink font-label text-label border border-hairline shadow-sm' },
          h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ink' }),
          `Bản nháp ${version} (Đã thẩm định · Sẵn sàng kích hoạt)`
        )
      : h(
          'span',
          { className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-alt text-mid-gray font-label text-label border border-hairline shadow-sm' },
          h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ember animate-pulse' }),
          `Bản nháp ${version} (Chưa kích hoạt)`
        );

  const activateTitle = isActive
    ? 'Kế hoạch này đang được áp dụng chính thức'
    : isValidated
      ? undefined
      : 'Cần "Kiểm tra điều kiện" và đạt trạng thái VALIDATED trước khi kích hoạt';

  const headerSection = h(
    'div',
    { className: 'flex flex-col gap-space-sm' },
    h(
      'div',
      { className: 'flex items-center gap-2 font-caption text-caption text-mid-gray' },
      h(
        Link,
        { to: '/', className: 'hover:text-ink transition-colors flex items-center gap-1' },
        icon('home', 'text-[15px]'),
        h('span', null, 'Trang chủ')
      ),
      h('span', { className: 'text-hairline' }, '/'),
      h('span', { className: 'text-ink font-body-medium' }, 'Kế hoạch học tập cá nhân')
    ),
    h(
      'div',
      { className: 'flex flex-col xl:flex-row xl:items-center justify-between gap-space-md pb-space-xs' },
      h(
        'div',
        { className: 'flex flex-col gap-1 max-w-3xl' },
        h(
          'div',
          { className: 'flex flex-wrap items-center gap-space-sm' },
          h('h1', { className: 'font-headline text-headline text-ink tracking-tight' }, 'Kế hoạch học tập cá nhân'),
          statusPill,
          h(
            'span',
            { className: 'inline-flex items-center px-2.5 py-0.5 rounded-full bg-canvas text-ink-soft font-caption text-caption border border-hairline' },
            DEMO_COHORT_LABEL
          )
        ),
        h(
          'p',
          { className: 'font-body text-body text-mid-gray leading-relaxed' },
          'Xây dựng lộ trình đăng ký môn học cho các học kỳ tiếp theo. Hệ thống kiểm tra số tín chỉ tối đa/tối thiểu và điều kiện tiên quyết theo quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội (HaUI).'
        )
      ),
      h(
        'div',
        { className: 'flex flex-wrap items-center gap-space-xs lg:gap-space-sm self-start xl:self-center' },
        !isPreview
          ? h(
              'button',
              { type: 'button', className: BTN_OUTLINE, onClick: () => handleAddSemester('main') },
              icon('add_circle'),
              h('span', null, '+ Thêm học kỳ mới')
            )
          : null,
        h(
          'button',
          { type: 'button', id: 'btn-check-conditions', className: BTN_OUTLINE, disabled: validating, onClick: handleValidatePlan },
          icon(validating ? 'progress_activity' : 'verified', validating ? 'text-[18px] animate-spin' : 'text-[18px]'),
          h('span', null, validating ? 'Đang kiểm tra...' : 'Kiểm tra điều kiện')
        ),
        h(
          'button',
          { type: 'button', id: 'btn-save-draft', className: BTN_OUTLINE, onClick: handleSaveDraft },
          icon('save'),
          h('span', null, 'Lưu bản nháp')
        ),
        h(
          'button',
          {
            type: 'button',
            className: BTN_GHOST,
            'aria-pressed': isPreview,
            onClick: () => {
              setIsPreview((v) => !v);
              setOpenSemesterMenu(null);
            }
          },
          icon(isPreview ? 'edit' : 'visibility'),
          h('span', null, isPreview ? 'Thoát xem trước' : 'Xem trước')
        ),
        h(
          'button',
          {
            type: 'button',
            id: 'btn-activate-plan-top',
            className: BTN_PRIMARY,
            disabled: !isValidated,
            title: activateTitle,
            onClick: () => isValidated && setIsActivateModalOpen(true)
          },
          icon(isActive ? 'task_alt' : 'play_circle'),
          h('span', null, isActive ? 'Kế hoạch đang áp dụng' : 'Kích hoạt kế hoạch này')
        )
      )
    )
  );

  // ==========================================
  // TOAST THÔNG BÁO (prototype: viên thuốc nổi góc phải)
  // ==========================================
  const toastNode = toast
    ? h(
        'div',
        {
          id: 'app-toast',
          role: 'status',
          className:
            'fixed bottom-28 right-6 z-[80] max-w-md bg-paper border border-hairline text-ink rounded-full pl-5 pr-2 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3'
        },
        icon(toast.tone === 'warn' ? 'error' : 'check_circle', toast.tone === 'warn' ? 'text-ember text-[20px]' : 'text-ink text-[20px]'),
        h('span', { className: 'font-body-medium text-body-medium' }, toast.message),
        h('button', { type: 'button', className: ICON_BTN, title: 'Đóng thông báo', onClick: () => setToast(null) }, icon('close', 'text-[16px]'))
      )
    : null;

  // ==========================================
  // CÔNG CỤ DEV (chuyển trạng thái kiểm thử — không hiển thị ở production)
  // ==========================================
  const devButton = (label, onClick) =>
    h(
      'button',
      {
        type: 'button',
        onClick,
        className:
          'px-3 py-1.5 rounded-full bg-canvas hover:bg-surface-variant text-ink font-caption text-caption border border-hairline transition-colors'
      },
      label
    );
  const devSlot = ui?.DevSlot
    ? h(
        ui.DevSlot,
        { title: 'Kế hoạch học tập' },
        h(
          'div',
          { className: 'flex flex-wrap gap-space-xs' },
          devButton('Đang tải', handleSimulateLoading),
          devButton('Trạng thái Rỗng', handleClearPlan),
          devButton('Mô phỏng Lỗi', handleTriggerError),
          devButton('Tải lại kế hoạch', handleFetchPlan),
          devButton('Giả lập đề xuất AI', handleSimulateProposal),
          devButton('Lịch sử nhanh (modal)', () => setIsHistoryModalOpen(true))
        )
      )
    : null;

  const sharedModals = [
    h(PlanHistoryModal, {
      key: 'history-modal',
      isOpen: isHistoryModalOpen,
      onClose: () => setIsHistoryModalOpen(false),
      ui,
      onPlanChanged: () => {
        showToast('Kế hoạch đã được cập nhật từ Lịch sử!');
      }
    }),
    h(CurriculumTreeModal, {
      key: 'tree-modal',
      isOpen: isTreeModalOpen,
      onClose: () => setIsTreeModalOpen(false),
      ui,
      plannedCourseCodes: semesters.flatMap((s) => (s.courses || []).map((c) => c.courseCode)),
      onOpenFullTree: () => {
        setIsTreeModalOpen(false);
        navigate('/curriculum');
      }
    })
  ];

  const pageShell = (...children) =>
    h(
      'div',
      { className: 'flex flex-col w-full haui-planner-page' },
      h(
        'div',
        { className: 'w-full max-w-[1440px] mx-auto px-space-md lg:px-space-xl py-space-lg flex flex-col gap-space-lg' },
        headerSection,
        ...children
      ),
      toastNode,
      devSlot,
      ...sharedModals
    );

  // Banner nhận đề xuất từ AI Chat hoặc What-if (hiển thị cả khi kế hoạch đang rỗng)
  const proposalBanner = incomingProposal
    ? h(
        'div',
        { className: `${CARD_CLASS} border-ink p-space-lg flex flex-col lg:flex-row lg:items-center justify-between gap-space-md` },
        h(
          'div',
          { className: 'flex items-start gap-space-md min-w-0' },
          h(
            'div',
            { className: 'w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center shrink-0' },
            icon('auto_awesome', 'text-[20px]')
          ),
          h(
            'div',
            { className: 'flex flex-col gap-0.5 min-w-0' },
            h(
              'span',
              { className: 'font-body-medium text-body-medium text-ink font-semibold' },
              `Có phương án lộ trình đề xuất từ: ${incomingProposal.sourceName || 'AI Advisor'} (${incomingProposal.receivedAt || 'Vừa xong'})`
            ),
            h(
              'span',
              { className: 'font-caption text-caption text-mid-gray' },
              `CPA dự kiến: ${incomingProposal.projectedCpa || '3.25'} · Phân bổ: ${incomingProposal.semesters?.length || 2} học kỳ. Bạn có muốn nạp phương án này vào Kế hoạch học tập không?`
            )
          )
        ),
        h(
          'div',
          { className: 'flex items-center gap-space-xs shrink-0' },
          h('button', { type: 'button', className: BTN_SOFT, onClick: handleDismissProposal }, 'Hủy'),
          h('button', { type: 'button', className: BTN_PRIMARY, onClick: handleAcceptProposal }, icon('check_circle'), h('span', null, 'Chấp nhận phương án'))
        )
      )
    : null;

  // ==========================================
  // TRẠNG THÁI LOADING / ERROR / EMPTY
  // ==========================================
  if (loading) {
    return pageShell(
      h(
        'div',
        { className: `${CARD_CLASS} p-space-xl flex flex-col gap-space-md`, role: 'status', 'aria-live': 'polite' },
        h(
          'div',
          { className: 'flex items-center gap-space-sm text-ink' },
          icon('progress_activity', 'text-[22px] animate-spin'),
          h('span', { className: 'font-body-medium text-body-medium' }, 'Đang tải kế hoạch học tập đa kỳ...')
        ),
        h(
          'div',
          { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md' },
          [0, 1, 2, 3].map((i) => h('div', { key: i, className: 'h-24 rounded-[20px] bg-canvas animate-pulse' }))
        ),
        h('div', { className: 'h-40 rounded-[20px] bg-canvas animate-pulse' })
      )
    );
  }

  if (error) {
    const details = Array.isArray(error?.details) ? error.details : [];
    return pageShell(
      h(
        'div',
        { className: `${CARD_CLASS} p-space-xl flex flex-col sm:flex-row sm:items-start gap-space-md`, role: 'alert' },
        h(
          'div',
          { className: 'w-12 h-12 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ember shrink-0' },
          icon('error', 'text-[24px]')
        ),
        h(
          'div',
          { className: 'flex flex-col gap-1.5 flex-1 min-w-0' },
          h('h3', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Không thể truy xuất Kế hoạch học tập'),
          h('p', { className: 'font-body text-body text-mid-gray' }, error?.message || 'Đã xảy ra lỗi không xác định.'),
          error?.code ? h('span', { className: 'font-caption text-caption text-mid-gray' }, `Mã lỗi: ${error.code}`) : null,
          details.length
            ? h(
                'ul',
                { className: 'flex flex-col gap-1 mt-1' },
                details.map((d, i) =>
                  h(
                    'li',
                    { key: i, className: 'flex items-start gap-2 font-caption text-caption text-mid-gray' },
                    icon('error_outline', 'text-[16px] text-ember shrink-0'),
                    h('span', null, d)
                  )
                )
              )
            : null
        ),
        h(
          'button',
          { type: 'button', className: `${BTN_PRIMARY} self-start shrink-0`, onClick: handleFetchPlan },
          icon('refresh'),
          h('span', null, 'Thử lại')
        )
      )
    );
  }

  if (!plan || semesters.length === 0) {
    return pageShell(
      proposalBanner,
      h(
        'div',
        {
          className:
            'w-full rounded-[24px] border-2 border-dashed border-hairline p-space-xl bg-paper/50 flex flex-col items-center justify-center text-center gap-space-sm'
        },
        h(
          'div',
          { className: 'w-12 h-12 rounded-full bg-canvas border border-hairline flex items-center justify-center text-mid-gray' },
          icon('event_note', 'text-[24px]')
        ),
        h('h4', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Chưa có kế hoạch học tập nào'),
        h(
          'p',
          { className: 'font-caption text-caption text-mid-gray max-w-md mx-auto' },
          'Bạn chưa tạo lộ trình học tập hoặc đã xóa các môn. Nhấn nút bên dưới để khôi phục phương án mẫu, hoặc thêm học kỳ mới để tự xây dựng.'
        ),
        h(
          'div',
          { className: 'flex flex-wrap items-center justify-center gap-2 mt-2' },
          h('button', { type: 'button', className: BTN_PRIMARY, onClick: handleFetchPlan }, icon('auto_awesome'), h('span', null, 'Tạo kế hoạch học tập mới')),
          h('button', { type: 'button', className: BTN_OUTLINE, onClick: () => handleAddSemester('main') }, icon('add'), h('span', null, 'Thêm học kỳ đầu tiên'))
        )
      )
    );
  }

  // ==========================================
  // 2. BANNER: ĐỀ XUẤT TỪ AI / WHAT-IF & MÔN TỪ CÂY MÔN HỌC
  // ==========================================
  const incomingCourseBanner = incomingCourse
    ? (() => {
        const { code, unknown, plannedAt, course } = incomingCourse;
        const title = unknown
          ? `Không tìm thấy học phần ${code} trong danh mục CTĐT`
          : plannedAt >= 0
            ? `Môn ${code} · ${course.courseName} đã có trong ${semesterShortLabel(semesters[plannedAt])}`
            : `Thêm môn ${code} · ${course.courseName} (${course.credits} TC) từ Cây môn học`;
        const subtitle = unknown
          ? curriculumCourses === null
            ? 'Đang đối chiếu với cây môn học...'
            : 'Kiểm tra lại mã học phần trên màn Cây môn học.'
          : plannedAt >= 0
            ? 'Dòng môn học được đánh dấu trong bảng học kỳ bên dưới.'
            : 'Chọn học kỳ muốn đưa môn này vào lộ trình. Điều kiện tiên quyết được kiểm tra theo từng học kỳ.';
        return h(
          'div',
          { className: `${CARD_CLASS} p-space-lg flex flex-col gap-space-md` },
          h(
            'div',
            { className: 'flex items-start gap-space-md min-w-0' },
            h(
              'div',
              { className: 'w-10 h-10 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink shrink-0' },
              icon('account_tree', 'text-[20px]')
            ),
            h(
              'div',
              { className: 'flex flex-col gap-0.5 min-w-0' },
              h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, title),
              h('span', { className: 'font-caption text-caption text-mid-gray' }, subtitle)
            )
          ),
          h(
            'div',
            { className: 'flex flex-wrap items-center gap-space-xs pl-14' },
            !unknown && plannedAt < 0
              ? semesters.map((sem, idx) => {
                  const check = evaluateCourseEligibility({ courseCode: code, semIndex: idx, semesters, catalog, earnedCredits });
                  return h(
                    'button',
                    {
                      key: sem.semesterCode,
                      type: 'button',
                      className: BTN_OUTLINE,
                      title: check.status === 'ok' ? 'Đủ điều kiện đăng ký' : check.statusNote,
                      onClick: () => handleAddIncomingCourse(sem.semesterCode)
                    },
                    check.status === 'blocked'
                      ? icon('error_outline', 'text-[16px] text-ember')
                      : icon(check.status === 'warning' ? 'schedule' : 'add', 'text-[16px]'),
                    h('span', null, `Thêm vào ${semesterShortLabel(sem)}`)
                  );
                })
              : null,
            h('button', { type: 'button', className: BTN_SOFT, onClick: clearIncomingCourse }, plannedAt >= 0 || unknown ? 'Đóng' : 'Bỏ qua')
          )
        );
      })()
    : null;

  // ==========================================
  // 3. KPI CARDS
  // ==========================================
  const planCoversRemaining = totalPlannedCredits >= remainingCredits;
  const rankShort = String(plan.projectedRank || 'Bằng Giỏi (CPA ≥ 3.20)').split(' (')[0];
  const projectedCpaText = Number.isFinite(Number(plan.projectedCpa)) ? Number(plan.projectedCpa).toFixed(2) : '3.32';
  const firstIssue = courseIssues[0];
  const kpiFootIssue = ruleViolations.length
    ? ruleViolations[0]
    : firstIssue
      ? `Điều kiện ${firstIssue.course.courseCode} ${firstIssue.check.shortNote}`
      : ruleWarnings[0] || null;

  const kpiLabel = (text, iconName, iconClass = 'text-mid-gray text-[20px]') =>
    h(
      'div',
      { className: 'flex items-center justify-between' },
      h('span', { className: 'font-label text-label text-mid-gray uppercase tracking-wider font-semibold' }, text),
      icon(iconName, iconClass)
    );

  const kpiSection = h(
    'div',
    { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md' },
    // Thẻ 1: Tổng TC cần tích lũy
    h(
      'div',
      { className: KPI_CARD_CLASS },
      kpiLabel('TỔNG TC CẦN TÍCH LŨY', 'assignment_turned_in'),
      h(
        'div',
        { className: 'mt-space-md flex items-baseline gap-2' },
        h('span', { className: 'font-headline text-headline text-ink font-semibold' }, remainingCredits),
        h('span', { className: 'font-body text-body text-mid-gray' }, `/ ${requiredCredits} Tín chỉ`)
      ),
      h(
        'div',
        { className: 'mt-space-sm w-full bg-canvas rounded-full h-1.5 overflow-hidden' },
        h('div', { className: 'bg-ink h-full rounded-full transition-all duration-500', style: { width: `${earnedPct}%` } })
      ),
      h(
        'div',
        { className: 'mt-space-xs flex justify-between font-caption text-caption text-mid-gray' },
        h('span', null, `Đã hoàn thành ${earnedCredits} TC`),
        h('span', { className: 'font-medium text-ink' }, `${earnedPct}%`)
      )
    ),
    // Thẻ 2: Phân bổ lộ trình
    h(
      'div',
      { className: KPI_CARD_CLASS },
      kpiLabel('PHÂN BỔ LỘ TRÌNH', 'calendar_view_week'),
      h(
        'div',
        { className: 'mt-space-md' },
        h(
          'div',
          { className: 'flex items-baseline gap-1' },
          h('span', { className: 'font-headline text-headline text-ink font-semibold' }, mainSemesters.length),
          h(
            'span',
            { className: 'font-body text-body text-mid-gray' },
            summerSemesters.length ? `học kỳ chính + ${summerSemesters.length} kỳ hè` : 'học kỳ chính'
          )
        ),
        h('p', { className: 'font-caption text-caption text-mid-gray mt-1 truncate', title: semesterSummary }, semesterSummary)
      ),
      h(
        'div',
        { className: planCoversRemaining ? 'mt-space-xs flex items-center gap-1 font-caption text-caption text-ink font-medium' : 'mt-space-xs flex items-center gap-1 font-caption text-caption text-ember font-medium' },
        h('span', { className: planCoversRemaining ? 'w-2 h-2 rounded-full bg-ink' : 'w-2 h-2 rounded-full bg-ember' }),
        h(
          'span',
          null,
          planCoversRemaining
            ? `Đúng tiến độ chuẩn 4 năm · ${totalPlannedCredits} TC`
            : `Còn thiếu ${remainingCredits - totalPlannedCredits} TC chưa xếp lịch`
        )
      )
    ),
    // Thẻ 3: Mô phỏng GPA tốt nghiệp
    h(
      'div',
      { className: KPI_CARD_CLASS },
      kpiLabel('MÔ PHỎNG GPA TỐT NGHIỆP', 'trending_up'),
      h(
        'div',
        { className: 'mt-space-md flex items-baseline gap-2' },
        h('span', { className: 'font-headline text-headline text-ink font-semibold' }, projectedCpaText),
        h('span', { className: 'font-body text-body text-mid-gray' }, '/ 4.00 (Hệ 4)')
      ),
      h(
        'div',
        { className: 'mt-space-sm flex items-center gap-1.5' },
        h('span', { className: 'px-2 py-0.5 rounded-full bg-canvas text-ink font-label text-label border border-hairline font-semibold' }, rankShort),
        h('span', { className: 'font-caption text-caption text-mid-gray' }, 'Dựa trên kế hoạch dự phóng')
      )
    ),
    // Thẻ 4: Kiểm tra quy chế HaUI
    h(
      'div',
      { className: KPI_CARD_CLASS },
      kpiLabel(
        'KIỂM TRA QUY CHẾ HAUI',
        warningCount + ruleViolations.length > 0 ? 'notification_important' : 'verified',
        warningCount + ruleViolations.length > 0 ? 'text-ember text-[20px]' : 'text-mid-gray text-[20px]'
      ),
      h(
        'div',
        { className: 'mt-space-md flex flex-wrap items-baseline gap-x-2' },
        h(
          'span',
          {
            className: 'font-headline text-headline text-ink font-semibold',
            title: `${okSemesterCount}/${semesters.length} học kỳ thỏa mãn giới hạn tín chỉ`
          },
          `${okSemesterCount} Hợp lệ`
        ),
        ruleViolations.length
          ? h('span', { className: 'font-body text-body text-ember font-medium' }, `· ${ruleViolations.length} Vi phạm`)
          : null,
        warningCount
          ? h('span', { className: 'font-body text-body text-ember font-medium' }, `· ${warningCount} Cảnh báo`)
          : null
      ),
      h(
        'div',
        { className: 'mt-space-xs flex items-center gap-2' },
        h(
          'span',
          { className: 'inline-flex items-center gap-1 font-caption text-caption text-mid-gray min-w-0' },
          h('span', { className: kpiFootIssue ? 'w-1.5 h-1.5 rounded-full bg-ember shrink-0' : 'w-1.5 h-1.5 rounded-full bg-ink shrink-0' }),
          h(
            'span',
            { className: 'truncate', title: kpiFootIssue || undefined },
            kpiFootIssue ||
              (validationResult?.valid ? 'Đã thẩm định: thỏa mãn 10–24 TC (BR-03/04)' : 'Thỏa mãn quy định 10–24 TC (BR-03/04)')
          )
        )
      )
    )
  );

  // ==========================================
  // 4. THẺ CẢNH BÁO QUY CHẾ & ĐIỀU KIỆN TIÊN QUYẾT
  // ==========================================
  const ruleLine = (key, iconName, iconClass, content, textClass = 'flex items-start gap-2') =>
    h('div', { key, className: textClass }, icon(iconName, `text-[16px] shrink-0 mt-0.5 ${iconClass}`), h('span', null, ...content));

  const validationLines = [];
  if (!validationResult && isActive) {
    validationLines.push(
      ruleLine('validation-active', 'check_circle', 'text-ink', [
        h('strong', { key: 's' }, 'Kế hoạch đang được áp dụng chính thức:'),
        ' đã thẩm định đạt quy chế HaUI trước khi kích hoạt. Mọi chỉnh sửa sẽ tách thành bản nháp mới cần thẩm định lại.'
      ])
    );
  } else if (!validationResult) {
    validationLines.push(
      ruleLine('validation-pending', 'pending_actions', 'text-ink', [
        h('strong', { key: 's' }, 'Chưa thẩm định quy chế:'),
        ' Bấm “Kiểm tra điều kiện” để đối chiếu giới hạn 10–24 TC (BR-03/BR-04) và chuyển kế hoạch sang VALIDATED trước khi kích hoạt.'
      ])
    );
  } else if (validationResult.valid) {
    validationLines.push(
      ruleLine('validation-ok', 'check_circle', 'text-ink', [
        h('strong', { key: 's' }, 'Kế hoạch hợp lệ 100% theo quy chế HaUI:'),
        isActive ? ' kế hoạch đang được áp dụng chính thức.' : ` trạng thái ${plan.status} — có thể kích hoạt.`
      ])
    );
  }
  ruleViolations.forEach((v, i) =>
    validationLines.push(ruleLine(`violation-${i}`, 'error_outline', 'text-ember', [h('strong', { key: 's' }, 'Vi phạm quy chế: '), v]))
  );
  ruleWarnings.forEach((w, i) =>
    validationLines.push(ruleLine(`warning-${i}`, 'warning', 'text-ember', [h('strong', { key: 's' }, 'Cảnh báo quy chế: '), w]))
  );

  const courseIssueLines = courseIssues.slice(0, 3).map(({ course, check }, i) =>
    ruleLine(`course-issue-${i}`, 'error_outline', 'text-ember', [
      h('strong', { key: 's' }, `Lưu ý học phần ${course.courseCode} ${course.courseName}:`),
      ` ${check.issue || check.statusNote}`
    ])
  );
  if (courseIssues.length > 3) {
    courseIssueLines.push(
      h('div', { key: 'course-issue-more', className: 'pl-6 font-caption text-caption text-mid-gray' }, `… và ${courseIssues.length - 3} học phần khác cần lưu ý.`)
    );
  }

  const creditLimitLine =
    liveRules.violations.length === 0
      ? ruleLine('credit-limit', 'check_circle', 'text-ink', [
          h('strong', { key: 's' }, 'Giới hạn tín chỉ học kỳ an toàn:'),
          ` ${MAIN_MIN_CREDITS} - ${MAIN_MAX_CREDITS} TC, kỳ hè tối đa ${SUMMER_MAX_CREDITS} TC (${semesterSummary}: `,
          h('strong', { key: 'ok' }, 'Đạt chuẩn'),
          ').'
        ])
      : null;

  const regulationCard = h(
    'div',
    { className: `${CARD_CLASS} p-space-lg flex flex-col gap-space-md` },
    h(
      'div',
      { className: 'flex flex-col lg:flex-row lg:items-start justify-between gap-space-md' },
      h(
        'div',
        { className: 'flex items-start gap-space-md min-w-0' },
        h(
          'div',
          { className: 'w-10 h-10 rounded-full bg-canvas border border-hairline flex items-center justify-center shrink-0 text-ember mt-0.5' },
          icon('policy', 'text-[22px]')
        ),
        h(
          'div',
          { className: 'flex flex-col gap-1.5 min-w-0' },
          h(
            'div',
            { className: 'flex flex-wrap items-center gap-2' },
            h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, 'Cảnh báo quy chế & Điều kiện tiên quyết học vụ nổi bật'),
            h('span', { className: 'px-2 py-0.5 rounded-full bg-canvas text-ember text-[11px] font-medium border border-hairline' }, 'Quy chế 2024 HaUI')
          ),
          h(
            'div',
            { className: 'flex flex-col gap-1.5 text-mid-gray font-body text-body' },
            ...validationLines,
            ...courseIssueLines,
            creditLimitLine,
            plan.aiRiskAdvice
              ? ruleLine('ai-advice', 'auto_awesome', 'text-ink', [h('strong', { key: 's' }, 'Phân tích rủi ro từ AI Advisor:'), ` ${plan.aiRiskAdvice}`])
              : null,
            h(
              'div',
              { className: 'flex items-start gap-2' },
              icon('info', 'text-[16px] text-mid-gray shrink-0 mt-0.5'),
              h(
                'span',
                { className: 'text-caption text-mid-gray' },
                h('em', null, 'Ghi chú:'),
                ' Chỉnh sửa kế hoạch mang tính chất mô phỏng độc lập, không tự động thay đổi bảng điểm thật trên cổng đào tạo trường.'
              )
            )
          )
        )
      ),
      h(
        'div',
        { className: 'flex flex-wrap items-center gap-space-sm shrink-0 self-end lg:self-start' },
        h(
          'button',
          {
            type: 'button',
            className:
              'inline-flex items-center gap-1.5 bg-paper hover:bg-canvas text-ink px-4 py-2 rounded-full font-body-medium text-body-medium border border-hairline transition-colors',
            onClick: () => setIsTreeModalOpen(true)
          },
          icon('account_tree'),
          h('span', null, 'Xem cây môn học')
        ),
        h(
          'button',
          {
            type: 'button',
            'aria-expanded': showRuleDetails,
            className:
              'inline-flex items-center gap-1.5 bg-canvas hover:bg-surface-variant text-ink px-4 py-2 rounded-full font-body-medium text-body-medium border border-hairline transition-colors',
            onClick: () => setShowRuleDetails((v) => !v)
          },
          icon(showRuleDetails ? 'expand_less' : 'rule'),
          h('span', null, showRuleDetails ? 'Ẩn chi tiết quy chế' : 'Xem chi tiết quy chế')
        )
      )
    ),
    showRuleDetails
      ? h(
          'div',
          { className: 'grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-md border-t border-hairline' },
          h(
            'div',
            { className: 'flex flex-col gap-2' },
            h('span', { className: 'font-label text-label text-mid-gray uppercase tracking-wider font-semibold' }, 'Quy chế đào tạo tín chỉ áp dụng'),
            DEMO_HAUI_RULES.map((rule) =>
              h(
                'div',
                { key: rule.code, className: 'flex items-start gap-2 font-body text-body text-mid-gray' },
                h('span', { className: 'px-2 py-0.5 rounded-full bg-canvas text-ink font-label text-label border border-hairline shrink-0' }, rule.code),
                h('span', null, rule.text)
              )
            )
          ),
          h(
            'div',
            { className: 'flex flex-col gap-2' },
            h('span', { className: 'font-label text-label text-mid-gray uppercase tracking-wider font-semibold' }, 'Ghi chú từ phương án lộ trình'),
            (plan.warnings || []).length
              ? (plan.warnings || []).map((w, i) =>
                  h('div', { key: i, className: 'flex items-start gap-2 font-body text-body text-mid-gray' }, icon('info', 'text-[16px] text-mid-gray shrink-0 mt-0.5'), h('span', null, w))
                )
              : h('span', { className: 'font-caption text-caption text-mid-gray' }, 'Chưa có ghi chú bổ sung.'),
            h(
              'span',
              { className: 'font-caption text-caption text-mid-gray' },
              `Phiên bản ${version} · ${plan.planName || 'Kế hoạch học tập'}`
            )
          )
        )
      : null
  );

  // ==========================================
  // 5. DANH SÁCH CÁC HỌC KỲ TRONG KẾ HOẠCH
  // ==========================================
  const statusPillFor = (check) => {
    if (check.status === 'blocked') {
      return h(
        'div',
        { className: 'inline-flex flex-col items-center' },
        h(
          'span',
          { className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-paper text-ember font-caption text-caption border border-ember shadow-sm' },
          h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ember' }),
          ` ${check.statusLabel}`
        ),
        h('span', { className: 'text-[11px] text-ember mt-0.5 font-medium' }, check.statusNote)
      );
    }
    if (check.status === 'warning') {
      return h(
        'div',
        { className: 'inline-flex flex-col items-center' },
        h(
          'span',
          { className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-alt text-ember font-caption text-caption border border-hairline' },
          h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ember' }),
          ` ${check.statusLabel}`
        ),
        h('span', { className: 'text-[11px] text-mid-gray mt-0.5' }, check.statusNote)
      );
    }
    return h(
      'span',
      { className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-paper text-ink font-caption text-caption border border-hairline shadow-sm' },
      h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ink' }),
      ` ${check.statusLabel}`
    );
  };

  const prereqCell = (check) => {
    if (check.prereqState === 'none') {
      return h('td', { className: 'py-3.5 px-space-md font-caption text-caption text-mid-gray' }, 'Không yêu cầu tiên quyết');
    }
    if (check.prereqState === 'missing') {
      return h(
        'td',
        { className: 'py-3.5 px-space-md' },
        h('div', { className: 'flex items-center gap-1.5 text-ember font-caption text-caption' }, icon('cancel', 'text-[16px] text-ember shrink-0'), h('span', null, check.prereqText))
      );
    }
    if (check.prereqState === 'met') {
      return h(
        'td',
        { className: 'py-3.5 px-space-md' },
        h('div', { className: 'flex items-center gap-1.5 text-ink font-caption text-caption' }, icon('check_circle', 'text-[16px] text-ink shrink-0'), h('span', null, check.prereqText))
      );
    }
    return h('td', { className: 'py-3.5 px-space-md font-caption text-caption text-mid-gray' }, check.prereqText);
  };

  const semesterCards = semesters.map((semester, semIndex) => {
    const isSummer = isSummerSemester(semester);
    const courses = semester.courses || [];
    const credits = Number(semester.totalCredits) || 0;
    const rules = semesterRules[semIndex] || { valid: true, violations: [], warnings: [] };
    const maxCredits = isSummer ? SUMMER_MAX_CREDITS : MAIN_MAX_CREDITS;
    const loadPct = Math.min(100, Math.round((credits / maxCredits) * 1000) / 10);
    const period = semesterPeriod(semester.semesterCode);
    const isFirst = semIndex === 0;

    const semStatus = !rules.valid
      ? h(
          'span',
          { className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-paper text-ember font-label text-label border border-ember' },
          h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ember' }),
          ' Vi phạm quy chế'
        )
      : isActive
        ? h(
            'span',
            { className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-ink text-paper font-label text-label border border-ink' },
            h('span', { className: 'w-1.5 h-1.5 rounded-full bg-paper' }),
            ' Đang áp dụng'
          )
        : isValidated
          ? h(
              'span',
              { className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-paper text-ink font-label text-label border border-hairline' },
              h('span', { className: 'w-1.5 h-1.5 rounded-full bg-ink' }),
              ' Đã thẩm định'
            )
          : h(
              'span',
              { className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-canvas text-mid-gray font-label text-label border border-hairline' },
              h('span', { className: 'w-1.5 h-1.5 rounded-full bg-mid-gray' }),
              ' Đang lập kế hoạch'
            );

    const limitCaption = isSummer
      ? `Kỳ hè: ${credits}/${SUMMER_MAX_CREDITS} TC (Tối đa ${SUMMER_MAX_CREDITS} TC)`
      : `Mức an toàn: ${credits}/${MAIN_MAX_CREDITS} TC (Giới hạn: ${MAIN_MIN_CREDITS} - ${MAIN_MAX_CREDITS} TC)`;

    const header = h(
      'div',
      {
        className:
          'p-space-lg border-b border-hairline bg-surface-alt rounded-t-[24px] flex flex-col md:flex-row md:items-center justify-between gap-space-md'
      },
      h(
        'div',
        { className: 'flex items-center gap-space-md min-w-0' },
        h(
          'div',
          {
            className: isFirst
              ? 'w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center font-body-medium font-semibold text-[15px] shrink-0'
              : 'w-10 h-10 rounded-full bg-canvas text-ink border border-hairline flex items-center justify-center font-body-medium font-semibold text-[15px] shrink-0'
          },
          isSummer ? icon('wb_sunny', 'text-[18px]') : semesterBadge(semester, semIndex)
        ),
        h(
          'div',
          { className: 'min-w-0' },
          h(
            'div',
            { className: 'flex flex-wrap items-center gap-2' },
            h('h3', { className: 'font-subheading text-subheading text-ink font-semibold' }, formatSemesterTitle(semester.semesterName)),
            semStatus,
            period ? h('span', { className: 'font-caption text-caption text-mid-gray' }, `Dự kiến: ${period}`) : null
          ),
          h(
            'p',
            { className: 'font-caption text-caption text-mid-gray mt-0.5' },
            `Đánh giá tải: ${workloadLabel(semester, credits)}`,
            semester.expectedGpa ? ` · GPA dự kiến: ${semester.expectedGpa}` : ''
          ),
          rules.violations.map((v, i) =>
            h('p', { key: i, className: 'font-caption text-caption text-ember mt-0.5' }, v)
          )
        )
      ),
      h(
        'div',
        { className: 'flex items-center gap-space-md shrink-0' },
        h(
          'div',
          { className: 'text-right' },
          h('div', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, `${courses.length} môn · ${credits} Tín chỉ`),
          h('div', { className: rules.valid ? 'font-caption text-caption text-mid-gray' : 'font-caption text-caption text-ember' }, limitCaption)
        ),
        h(
          'div',
          { className: 'w-24 bg-canvas rounded-full h-2 hidden sm:block border border-hairline overflow-hidden' },
          h('div', { className: rules.valid ? 'bg-ink h-full rounded-full' : 'bg-ember h-full rounded-full', style: { width: `${loadPct}%` } })
        ),
        !isPreview
          ? h(
              'div',
              { className: 'flex items-center gap-1.5' },
              h(
                'button',
                {
                  type: 'button',
                  className:
                    'inline-flex items-center gap-1 bg-paper hover:bg-canvas text-ink px-3.5 py-1.5 rounded-full font-body-medium text-body-medium border border-hairline transition-colors shadow-sm',
                  onClick: () => openAddCourseModal(semester.semesterCode)
                },
                icon('add', 'text-[16px]'),
                h('span', null, '+ Thêm môn')
              ),
              h(
                'div',
                { className: 'relative inline-block text-left' },
                h(
                  'button',
                  {
                    type: 'button',
                    title: 'Thao tác khác',
                    'aria-haspopup': 'menu',
                    'aria-expanded': openSemesterMenu === semester.semesterCode,
                    className:
                      'w-8 h-8 rounded-full hover:bg-canvas flex items-center justify-center text-mid-gray hover:text-ink transition-colors border border-hairline',
                    onClick: () => setOpenSemesterMenu((cur) => (cur === semester.semesterCode ? null : semester.semesterCode))
                  },
                  icon('more_vert')
                ),
                openSemesterMenu === semester.semesterCode
                  ? h(
                      'div',
                      {
                        role: 'menu',
                        className:
                          'absolute right-0 top-10 z-40 w-56 bg-paper border border-hairline rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-1.5 flex flex-col'
                      },
                      h(
                        'button',
                        {
                          type: 'button',
                          role: 'menuitem',
                          className: 'flex items-center gap-2 px-3 py-2 rounded-xl text-left font-body text-body text-ink hover:bg-canvas transition-colors',
                          onClick: () => {
                            setOpenSemesterMenu(null);
                            openAddCourseModal(semester.semesterCode);
                          }
                        },
                        icon('library_add', 'text-[16px]'),
                        'Thêm môn học'
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          role: 'menuitem',
                          className: 'flex items-center gap-2 px-3 py-2 rounded-xl text-left font-body text-body text-ink hover:bg-canvas transition-colors',
                          onClick: () => {
                            setOpenSemesterMenu(null);
                            setIsTreeModalOpen(true);
                          }
                        },
                        icon('account_tree', 'text-[16px]'),
                        'Đối chiếu cây môn học'
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          role: 'menuitem',
                          className: 'flex items-center gap-2 px-3 py-2 rounded-xl text-left font-body text-body text-ember hover:bg-canvas transition-colors',
                          onClick: () => {
                            setOpenSemesterMenu(null);
                            setPendingDelete({
                              kind: 'semester',
                              semesterCode: semester.semesterCode,
                              title: formatSemesterTitle(semester.semesterName),
                              courseCount: courses.length
                            });
                          }
                        },
                        icon('delete', 'text-[16px]'),
                        'Xóa học kỳ này'
                      )
                    )
                  : null
              )
            )
          : null
      )
    );

    const rows = [];
    courses.forEach((course) => {
      const key = `${semester.semesterCode}:${course.courseCode}`;
      const check = courseChecks[key] || evaluateCourseEligibility({ courseCode: course.courseCode, semIndex, semesters, catalog, earnedCredits });
      const isExpanded = expandedCourseKey === key;
      const isHighlighted = highlightCourseCode === course.courseCode;
      const rowClass = isHighlighted
        ? 'bg-surface-alt ring-1 ring-inset ring-ink transition-colors group'
        : check.status === 'blocked'
          ? 'hover:bg-canvas/50 transition-colors group bg-surface-alt/40'
          : 'hover:bg-canvas/50 transition-colors group';

      rows.push(
        h(
          'tr',
          { key, id: `planner-course-${course.courseCode}`, className: rowClass },
          h(
            'td',
            { className: 'py-3.5 px-space-lg' },
            h(
              'div',
              { className: 'flex flex-col' },
              h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, `${course.courseCode} · ${course.courseName}`),
              h(
                'span',
                { className: 'font-caption text-caption text-mid-gray' },
                `${course.courseType || 'Chuẩn CTĐT'}${course.targetGrade ? ` · Mục tiêu ${course.targetGrade}` : ''}`
              )
            )
          ),
          h('td', { className: 'py-3.5 px-space-md text-center font-medium text-ink whitespace-nowrap' }, `${course.credits} TC`),
          prereqCell(check),
          h(
            'td',
            { className: check.constraintState === 'missing' ? 'py-3.5 px-space-md text-caption text-ember' : 'py-3.5 px-space-md text-caption text-mid-gray' },
            check.constraintText
          ),
          h('td', { className: 'py-3.5 px-space-md text-center' }, statusPillFor(check)),
          h(
            'td',
            { className: 'py-3.5 px-space-lg text-right' },
            h(
              'div',
              { className: 'flex items-center justify-end gap-1' },
              h(
                'button',
                {
                  type: 'button',
                  title: isExpanded ? 'Ẩn chi tiết môn' : 'Xem chi tiết môn',
                  'aria-expanded': isExpanded,
                  className: isExpanded
                    ? 'w-7 h-7 rounded-full bg-canvas flex items-center justify-center text-ink transition-colors'
                    : 'w-7 h-7 rounded-full hover:bg-canvas flex items-center justify-center text-mid-gray hover:text-ink transition-colors',
                  onClick: () => setExpandedCourseKey((cur) => (cur === key ? null : key))
                },
                icon(isExpanded ? 'visibility_off' : 'visibility', 'text-[16px]')
              ),
              !isPreview
                ? h(
                    'button',
                    {
                      type: 'button',
                      title: 'Xóa môn',
                      className: 'w-7 h-7 rounded-full hover:bg-canvas flex items-center justify-center text-mid-gray hover:text-ember transition-colors',
                      onClick: () =>
                        setPendingDelete({
                          kind: 'course',
                          semesterCode: semester.semesterCode,
                          courseCode: course.courseCode,
                          title: `${course.courseCode} · ${course.courseName}`,
                          semesterLabel: formatSemesterTitle(semester.semesterName)
                        })
                    },
                    icon('delete', 'text-[16px]')
                  )
                : null
            )
          )
        )
      );

      if (isExpanded) {
        rows.push(
          h(
            'tr',
            { key: `${key}:detail`, className: 'bg-surface-alt/60' },
            h(
              'td',
              { colSpan: 6, className: 'px-space-lg py-space-md' },
              h(
                'div',
                { className: 'grid grid-cols-1 md:grid-cols-3 gap-space-md font-caption text-caption text-mid-gray' },
                h(
                  'div',
                  { className: 'flex flex-col gap-1' },
                  h('span', { className: 'font-label text-label uppercase tracking-wider font-semibold' }, 'Lý do xếp lịch'),
                  h('span', { className: 'font-body text-body text-ink' }, course.rationale || 'Sinh viên chủ động bổ sung vào kế hoạch'),
                  check.meta?.description ? h('span', null, check.meta.description) : null
                ),
                h(
                  'div',
                  { className: 'flex flex-col gap-1' },
                  h('span', { className: 'font-label text-label uppercase tracking-wider font-semibold' }, 'Điều kiện tiên quyết'),
                  check.prereqItems.length
                    ? check.prereqItems.map((item) =>
                        h(
                          'span',
                          { key: item.code, className: item.state === 'missing' ? 'flex items-center gap-1.5 text-ember' : 'flex items-center gap-1.5 text-ink' },
                          icon(
                            item.state === 'met' ? 'check_circle' : item.state === 'missing' ? 'cancel' : 'schedule',
                            item.state === 'missing' ? 'text-[15px] text-ember' : 'text-[15px] text-ink'
                          ),
                          item.text
                        )
                      )
                    : h('span', null, 'Không yêu cầu tiên quyết'),
                  check.issue ? h('span', { className: check.status === 'blocked' ? 'text-ember' : 'text-mid-gray' }, check.issue) : null
                ),
                h(
                  'div',
                  { className: 'flex flex-col gap-1' },
                  h('span', { className: 'font-label text-label uppercase tracking-wider font-semibold' }, 'Mục tiêu & phân loại'),
                  h('span', { className: 'font-body text-body text-ink' }, `Điểm mục tiêu: ${course.targetGrade || 'B (3.0)'}`),
                  h('span', null, `${course.courseType || 'Chuẩn CTĐT'} · ${course.credits} tín chỉ`)
                )
              )
            )
          )
        );
      }
    });

    const table = courses.length
      ? h(
          'div',
          { className: 'overflow-x-auto rounded-b-[24px]' },
          h(
            'table',
            { className: 'w-full text-left border-collapse min-w-[800px]' },
            h(
              'thead',
              null,
              h(
                'tr',
                { className: 'border-b border-hairline font-label text-label text-mid-gray uppercase tracking-wider bg-canvas/40' },
                h('th', { className: 'py-3 px-space-lg' }, 'Mã & Tên môn học'),
                h('th', { className: 'py-3 px-space-md text-center' }, 'Tín chỉ'),
                h('th', { className: 'py-3 px-space-md' }, 'Điều kiện tiên quyết'),
                h('th', { className: 'py-3 px-space-md' }, 'Ràng buộc bổ sung'),
                h('th', { className: 'py-3 px-space-md text-center' }, 'Trạng thái môn học'),
                h('th', { className: 'py-3 px-space-lg text-right' }, 'Thao tác')
              )
            ),
            h('tbody', { className: 'divide-y divide-hairline font-body text-body' }, rows)
          )
        )
      : h(
          'div',
          { className: 'p-space-xl flex flex-col items-center justify-center text-center gap-space-sm' },
          h('span', { className: 'font-body text-body text-mid-gray' }, 'Học kỳ này chưa có môn học nào.'),
          !isPreview
            ? h(
                'button',
                { type: 'button', className: BTN_OUTLINE, onClick: () => openAddCourseModal(semester.semesterCode) },
                icon('add', 'text-[16px]'),
                h('span', null, '+ Thêm môn')
              )
            : null
        );

    // Không dùng overflow-hidden để menu "Thao tác khác" không bị cắt; góc bo do header/bảng tự đảm nhiệm
    return h('div', { key: semester.semesterCode, className: CARD_CLASS }, header, table);
  });

  const nextSummer = buildNextSemester(semesters, 'summer');
  const nextMain = buildNextSemester(semesters, 'main');
  const nextSummerYear = /^(\d{4})/.exec(nextSummer.semesterCode)?.[1] || '';

  const addSemesterCard = !isPreview
    ? h(
        'div',
        {
          id: 'add-semester-card',
          className:
            'w-full rounded-[24px] border-2 border-dashed border-hairline hover:border-mid-gray p-space-xl bg-paper/50 hover:bg-paper transition-all flex flex-col items-center justify-center text-center gap-space-sm group'
        },
        h(
          'div',
          {
            className:
              'w-12 h-12 rounded-full bg-canvas group-hover:bg-ink group-hover:text-paper border border-hairline flex items-center justify-center text-mid-gray transition-colors'
          },
          icon('add', 'text-[24px]')
        ),
        h(
          'div',
          null,
          h('h4', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Thêm Học kỳ bổ sung / Kỳ hè dự phòng'),
          h(
            'p',
            { className: 'font-caption text-caption text-mid-gray max-w-md mx-auto mt-1' },
            `Tạo thêm Kỳ phụ hè ${nextSummerYear} hoặc ${semesterShortLabel(nextMain)} để trả nợ môn, học cải thiện nâng điểm hoặc phân bổ lại khối lượng tốt nghiệp nhẹ nhàng hơn.`
          )
        ),
        h(
          'div',
          { className: 'flex flex-wrap items-center justify-center gap-2 mt-2' },
          h(
            'button',
            {
              type: 'button',
              className:
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-canvas hover:bg-ink hover:text-paper text-ink font-body-medium text-body-medium border border-hairline transition-all shadow-sm',
              onClick: () => handleAddSemester('summer')
            },
            icon('wb_sunny'),
            h('span', null, `Học kỳ hè ${nextSummerYear} (Tối đa ${SUMMER_MAX_CREDITS} TC)`)
          ),
          h(
            'button',
            {
              type: 'button',
              className:
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-paper hover:bg-canvas text-mid-gray hover:text-ink font-body-medium text-body-medium border border-hairline transition-all shadow-sm',
              onClick: () => handleAddSemester('main')
            },
            icon('add'),
            h('span', null, 'Tạo học kỳ tự chọn mới')
          )
        )
      )
    : null;

  const semestersSection = h(
    'div',
    { className: 'flex flex-col gap-space-lg' },
    h(
      'div',
      { className: 'flex flex-wrap items-center justify-between gap-space-sm' },
      h(
        'div',
        { className: 'flex items-center gap-space-sm' },
        h('h2', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Danh sách học kỳ trong lộ trình'),
        h(
          'span',
          { className: 'font-caption text-caption text-mid-gray px-2.5 py-0.5 bg-paper rounded-full border border-hairline' },
          `${mainSemesters.length} Kỳ chính · ${summerSemesters.length} Kỳ hè`
        ),
        isPreview
          ? h('span', { className: 'font-caption text-caption text-paper bg-ink px-2.5 py-0.5 rounded-full' }, 'Chế độ xem trước')
          : null
      ),
      !isPreview
        ? h(
            'button',
            {
              type: 'button',
              className:
                'inline-flex items-center gap-1.5 bg-paper hover:bg-canvas text-ink px-4 py-1.5 rounded-full font-body-medium text-body-medium border border-hairline transition-colors shadow-sm',
              onClick: () => handleAddSemester('main')
            },
            icon('add_circle'),
            h('span', null, '+ Thêm học kỳ mới')
          )
        : null
    ),
    ...semesterCards,
    addSemesterCard
  );

  // ==========================================
  // 6. THANH XÁC NHẬN CỐ ĐỊNH CUỐI TRANG
  // ==========================================
  const draftTitle = isActive ? `Kế hoạch ${version} đang áp dụng` : `Bản nháp ${version} đang mở`;
  const draftState = isActive ? 'Đang áp dụng chính thức' : isValidated ? 'Đã thẩm định — sẵn sàng kích hoạt' : 'Chưa kích hoạt';
  const stickyBar = h(
    'div',
    { className: 'sticky bottom-6 z-30 mt-space-md' },
    h(
      'div',
      {
        className:
          'w-full bg-paper/95 backdrop-blur-xl border border-hairline rounded-[24px] p-space-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row items-center justify-between gap-space-md'
      },
      h(
        'div',
        { className: 'flex items-center gap-space-md min-w-0 flex-1' },
        h(
          'button',
          {
            type: 'button',
            title: 'Xem lịch sử kế hoạch',
            className:
              'w-9 h-9 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink shrink-0 hover:bg-ink hover:text-paper transition-colors',
            onClick: () => navigate('/planner/history')
          },
          icon('history')
        ),
        h(
          'div',
          { className: 'flex flex-col min-w-0' },
          h(
            'div',
            { className: 'flex items-center gap-2' },
            h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold', title: plan.planName }, draftTitle),
            h('span', { className: isActive || isValidated ? 'w-2 h-2 rounded-full bg-ink' : 'w-2 h-2 rounded-full bg-ember animate-ping' }),
            h('span', { className: 'font-caption text-caption text-mid-gray' }, draftState)
          ),
          h(
            'span',
            { className: 'font-caption text-caption text-mid-gray' },
            'Tự động kiểm tra quy chế HaUI: ',
            h('strong', { className: 'text-ink' }, `${okCourses}/${totalCourses} môn Hợp lệ`),
            courseIssues.length ? ' · ' : null,
            courseIssues.length ? h('strong', { className: 'text-ember' }, `${courseIssues.length} môn Cảnh báo`) : null,
            ` · Lần lưu: ${savedEntry?.updatedAt || 'Chưa lưu'}`
          )
        )
      ),
      h(
        'div',
        { className: 'flex flex-wrap lg:flex-nowrap items-center gap-space-sm w-full sm:w-auto justify-end shrink-0' },
        h('button', { type: 'button', className: `${BTN_SOFT} whitespace-nowrap`, onClick: handleDiscardChanges }, 'Hủy thay đổi'),
        h(
          'button',
          {
            type: 'button',
            className:
              'px-4 py-2 rounded-full bg-paper hover:bg-canvas text-ink font-body-medium text-body-medium border border-hairline transition-colors shadow-sm whitespace-nowrap',
            onClick: handleSaveDraft
          },
          'Lưu bản nháp'
        ),
        h(
          'button',
          {
            type: 'button',
            className: `${BTN_PRIMARY.replace('gap-1.5', 'gap-2')} whitespace-nowrap`,
            disabled: !isValidated,
            title: activateTitle,
            onClick: () => isValidated && setIsActivateModalOpen(true)
          },
          icon('check_circle'),
          h('span', null, 'Xác nhận & Kích hoạt kế hoạch')
        )
      )
    )
  );

  // ==========================================
  // MODAL KÍCH HOẠT KẾ HOẠCH (ACTIVATE MODAL)
  // ==========================================
  const closeOnBackdrop = (close) => (e) => {
    if (e.target === e.currentTarget) close();
  };

  const activateModal = isActivateModalOpen
    ? h(
        'div',
        { className: MODAL_OVERLAY, role: 'dialog', 'aria-modal': 'true', id: 'modal-activate-plan', onClick: closeOnBackdrop(() => setIsActivateModalOpen(false)) },
        h(
          'div',
          { className: `${MODAL_PANEL} max-w-lg` },
          h(
            'div',
            { className: 'flex items-start justify-between' },
            h('div', { className: 'w-12 h-12 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink' }, icon('verified_user', 'text-[24px]')),
            h('button', { type: 'button', className: ICON_BTN, title: 'Đóng', onClick: () => setIsActivateModalOpen(false) }, icon('close', 'text-[20px]'))
          ),
          h(
            'div',
            null,
            h('h3', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Xác nhận kích hoạt kế hoạch học tập'),
            h(
              'p',
              { className: 'font-body text-body text-mid-gray mt-1 leading-relaxed' },
              'Hệ thống sẽ chuyển trạng thái từ ',
              h('strong', { className: 'text-ink' }, `Bản nháp ${version} (${isValidated ? 'Đã thẩm định' : 'Chưa kích hoạt'})`),
              ' sang ',
              h('strong', { className: 'text-ink' }, 'Dữ liệu kế hoạch chính thức áp dụng'),
              '. Hãy kiểm tra kỹ các nội dung sau:'
            )
          ),
          h(
            'div',
            { className: 'bg-surface-alt rounded-2xl p-space-md border border-hairline flex flex-col gap-2.5 text-caption font-caption' },
            h(
              'div',
              { className: 'flex items-start gap-2 text-ink' },
              icon('check_circle', 'text-[16px] text-ink shrink-0 mt-0.5'),
              h('span', null, `Đã rà soát ${totalPlannedCredits} tín chỉ trong ${semesters.length} học kỳ — ${plan.planName || 'Kế hoạch học tập'} (${version}).`)
            ),
            courseIssues.length
              ? h(
                  'div',
                  { className: 'flex items-start gap-2 text-ember' },
                  icon('error_outline', 'text-[16px] text-ember shrink-0 mt-0.5'),
                  h('span', null, `Còn ${courseIssues.length} học phần cần lưu ý điều kiện: ${courseIssues.map((i) => i.course.courseCode).join(', ')}.`)
                )
              : h(
                  'div',
                  { className: 'flex items-start gap-2 text-ink' },
                  icon('check_circle', 'text-[16px] text-ink shrink-0 mt-0.5'),
                  h('span', null, 'Đáp ứng điều kiện tiên quyết cho toàn bộ học phần trong kế hoạch.')
                ),
            h(
              'div',
              { className: 'flex items-start gap-2 text-mid-gray' },
              icon('info', 'text-[16px] text-mid-gray shrink-0 mt-0.5'),
              h(
                'span',
                null,
                activeEntry
                  ? `Bản kế hoạch ACTIVE trước đó (${activeEntry.version}) sẽ tự động được lưu trữ vào Lịch sử.`
                  : 'Đây sẽ là bản kế hoạch ACTIVE đầu tiên của bạn.'
              )
            ),
            h(
              'div',
              { className: 'flex items-start gap-2 text-mid-gray' },
              icon('info', 'text-[16px] text-mid-gray shrink-0 mt-0.5'),
              h('span', null, 'Sau khi kích hoạt, kế hoạch sẽ được gửi lưu trữ đồng bộ đến Cố vấn học tập khoa CNTT.')
            )
          ),
          h(
            'div',
            { className: 'flex items-center justify-end gap-space-xs' },
            h('button', { type: 'button', className: BTN_SOFT, onClick: () => setIsActivateModalOpen(false) }, 'Xem lại'),
            h(
              'button',
              {
                type: 'button',
                disabled: !isValidated,
                className:
                  'inline-flex items-center gap-2 px-5 py-2 rounded-full bg-ink hover:bg-ink-soft text-paper font-body-medium text-body-medium transition-all shadow-[0_4px_12px_rgba(0,0,0,0.12)] disabled:opacity-40 disabled:cursor-not-allowed',
                onClick: handleConfirmActivate
              },
              icon('task_alt'),
              h('span', null, 'Xác nhận áp dụng chính thức')
            )
          )
        )
      )
    : null;

  // ==========================================
  // MODAL THÊM MÔN HỌC (ADD COURSE MODAL)
  // ==========================================
  const addTargetIndex = semesters.findIndex((s) => s.semesterCode === selectedSemesterForAdd);
  const addTargetSemester = semesters[addTargetIndex] || null;
  const normalizedQuery = addCourseQuery.trim().toLowerCase();
  const addCandidates = DEMO_ADD_COURSE_POOL.filter(
    (c) =>
      (addCourseFilter === 'ALL' || c.group === addCourseFilter) &&
      (!normalizedQuery || c.courseCode.toLowerCase().includes(normalizedQuery) || c.courseName.toLowerCase().includes(normalizedQuery))
  );

  const addCourseModal = isAddCourseModalOpen
    ? h(
        'div',
        { className: MODAL_OVERLAY, role: 'dialog', 'aria-modal': 'true', id: 'modal-add-course', onClick: closeOnBackdrop(() => setIsAddCourseModalOpen(false)) },
        h(
          'div',
          { className: `${MODAL_PANEL} max-w-2xl` },
          h(
            'div',
            { className: 'flex items-start justify-between' },
            h(
              'div',
              { className: 'flex items-center gap-3' },
              h('div', { className: 'w-10 h-10 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink' }, icon('library_add', 'text-[22px]')),
              h(
                'div',
                null,
                h('h3', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Chọn môn học đưa vào kế hoạch'),
                h(
                  'p',
                  { className: 'font-caption text-caption text-mid-gray mt-0.5', id: 'modal-add-semester-name' },
                  `Thêm môn học vào ${addTargetSemester ? formatSemesterTitle(addTargetSemester.semesterName) : selectedSemesterForAdd}`
                )
              )
            ),
            h('button', { type: 'button', className: ICON_BTN, title: 'Đóng', onClick: () => setIsAddCourseModalOpen(false) }, icon('close', 'text-[20px]'))
          ),
          h(
            'div',
            { className: 'flex flex-col sm:flex-row gap-2' },
            h(
              'div',
              { className: 'relative flex-1' },
              h('span', { className: 'material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-mid-gray pointer-events-none' }, 'search'),
              h('input', {
                type: 'text',
                value: addCourseQuery,
                onChange: (e) => setAddCourseQuery(e.target.value),
                placeholder: 'Tìm theo mã học phần hoặc tên môn học...',
                className:
                  'w-full bg-canvas border border-hairline rounded-full pl-9 pr-4 py-2 font-body text-body text-ink placeholder:text-mid-gray focus:outline-none focus:border-ink transition-colors'
              })
            ),
            h(
              'div',
              { className: 'flex items-center gap-1.5 overflow-x-auto py-0.5' },
              ADD_COURSE_FILTERS.map((f) =>
                h(
                  'button',
                  {
                    key: f.key,
                    type: 'button',
                    'aria-pressed': addCourseFilter === f.key,
                    onClick: () => setAddCourseFilter(f.key),
                    className:
                      addCourseFilter === f.key
                        ? 'px-3 py-1.5 rounded-full bg-ink text-paper font-caption text-caption whitespace-nowrap'
                        : 'px-3 py-1.5 rounded-full bg-canvas hover:bg-surface-variant text-ink font-caption text-caption border border-hairline whitespace-nowrap'
                  },
                  f.label
                )
              )
            )
          ),
          h(
            'div',
            { className: 'flex flex-col gap-2.5 overflow-y-auto max-h-80 pr-1 divide-y divide-hairline' },
            addCandidates.length === 0
              ? h('p', { className: 'pt-2.5 font-body text-body text-mid-gray text-center' }, 'Không tìm thấy học phần phù hợp.')
              : addCandidates.map((c) => {
                  const plannedAt = locateCourse(semesters, c.courseCode);
                  const inThisSemester = plannedAt >= 0 && plannedAt === addTargetIndex;
                  const check =
                    addTargetIndex >= 0
                      ? evaluateCourseEligibility({ courseCode: c.courseCode, semIndex: addTargetIndex, semesters, catalog, earnedCredits })
                      : null;
                  const prereqLine = check && check.prereqItems.length ? `Tiên quyết: ${check.prereqText}` : check?.meta?.constraint || 'Không yêu cầu tiên quyết';
                  const statusText = inThisSemester
                    ? 'Trạng thái: Đã có trong học kỳ này'
                    : plannedAt >= 0
                      ? `Trạng thái: Đã xếp ở ${semesterShortLabel(semesters[plannedAt])}`
                      : !check || check.status === 'ok'
                        ? 'Trạng thái: Đủ điều kiện đăng ký'
                        : `Trạng thái: ${check.statusLabel} — ${check.statusNote}`;
                  const statusClass =
                    check && check.status === 'blocked' && plannedAt < 0
                      ? 'text-[11px] text-ember font-medium mt-0.5'
                      : 'text-[11px] text-ink font-medium mt-0.5';
                  return h(
                    'div',
                    { key: c.courseCode, className: 'pt-2.5 flex items-center justify-between gap-3' },
                    h(
                      'div',
                      { className: 'flex flex-col min-w-0' },
                      h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, `${c.courseCode} · ${c.courseName}`),
                      h('span', { className: 'font-caption text-caption text-mid-gray' }, `${c.credits} Tín chỉ · ${c.courseType} · ${prereqLine}`),
                      h('span', { className: statusClass }, statusText)
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        disabled: inThisSemester,
                        onClick: () => handleAddCourse(c),
                        className:
                          'shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-canvas hover:bg-ink hover:text-paper text-ink font-caption text-caption border border-hairline transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-canvas disabled:hover:text-ink'
                      },
                      icon('add', 'text-[15px]'),
                      h('span', null, '+ Chọn môn này')
                    )
                  );
                })
          ),
          h(
            'div',
            { className: 'flex items-center justify-end pt-2 border-t border-hairline' },
            h('button', { type: 'button', className: `${BTN_SOFT} px-5`, onClick: () => setIsAddCourseModalOpen(false) }, 'Đóng cửa sổ')
          )
        )
      )
    : null;

  // ==========================================
  // MODAL XÁC NHẬN XÓA MÔN / HỌC KỲ
  // ==========================================
  const deleteModal = pendingDelete
    ? h(
        'div',
        { className: MODAL_OVERLAY, role: 'dialog', 'aria-modal': 'true', id: 'modal-delete-course', onClick: closeOnBackdrop(() => setPendingDelete(null)) },
        h(
          'div',
          { className: `${MODAL_PANEL} max-w-md` },
          h(
            'div',
            { className: 'flex items-start justify-between' },
            h('div', { className: 'w-12 h-12 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ember' }, icon('warning', 'text-[24px]')),
            h('button', { type: 'button', className: ICON_BTN, title: 'Đóng', onClick: () => setPendingDelete(null) }, icon('close', 'text-[20px]'))
          ),
          h(
            'div',
            null,
            h(
              'h3',
              { className: 'font-subheading text-subheading text-ink font-semibold' },
              pendingDelete.kind === 'semester' ? 'Xác nhận xóa học kỳ khỏi kế hoạch' : 'Xác nhận xóa học phần khỏi kế hoạch'
            ),
            pendingDelete.kind === 'semester'
              ? h(
                  'p',
                  { className: 'font-body text-body text-mid-gray mt-1 leading-relaxed' },
                  'Bạn có chắc chắn muốn xóa ',
                  h('strong', null, pendingDelete.title),
                  ` cùng ${pendingDelete.courseCount} môn học khỏi lộ trình dự kiến?`
                )
              : h(
                  'p',
                  { className: 'font-body text-body text-mid-gray mt-1 leading-relaxed' },
                  'Bạn có chắc chắn muốn xóa môn ',
                  h('strong', null, pendingDelete.title),
                  ' khỏi ',
                  h('strong', null, pendingDelete.semesterLabel),
                  '?'
                )
          ),
          h(
            'div',
            { className: 'p-space-sm bg-surface-alt rounded-xl border border-hairline text-caption font-caption text-mid-gray flex items-center gap-2' },
            icon('info', 'text-[16px] text-ember'),
            h('span', null, 'Số tín chỉ học kỳ và cảnh báo tiên quyết sẽ tự động được tính toán lại sau khi xóa.')
          ),
          h(
            'div',
            { className: 'flex items-center justify-end gap-space-xs' },
            h('button', { type: 'button', className: BTN_SOFT, onClick: () => setPendingDelete(null) }, 'Hủy'),
            h(
              'button',
              {
                type: 'button',
                className:
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink hover:bg-ember text-paper font-body-medium text-body-medium transition-colors',
                onClick: handleConfirmDelete
              },
              icon('delete'),
              h('span', null, 'Đồng ý xóa')
            )
          )
        )
      )
    : null;

  // ==========================================
  // RENDER TỔNG THỂ TRANG
  // ==========================================
  return pageShell(
    incomingCourseBanner,
    proposalBanner,
    kpiSection,
    regulationCard,
    semestersSection,
    stickyBar,
    activateModal,
    addCourseModal,
    deleteModal
  );
}

export default StudyPlannerPage;
