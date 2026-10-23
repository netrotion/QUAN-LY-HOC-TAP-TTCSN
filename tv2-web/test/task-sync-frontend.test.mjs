import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  selectStudentPreset,
  commitTranscriptRecords,
  getAcademicSnapshot,
  getDynamicAcademicStatus,
  getDynamicGraduationAudit
} from '../src/services/academicStore.js';
import {
  calculateSemesterGpaTrend,
  mockAcademicService
} from '../src/services/mockAcademicService.js';
import { api } from '../src/services/apiClient.js';
import { plannerStore } from '@haui/planner-ui';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * KIỂM THỬ ĐỒNG BỘ FRONTEND TOÀN HỆ THỐNG & BIỂU ĐỒ GPA TÍCH LŨY
 * Căn cứ yêu cầu:
 * - Biểu đồ GPA phải theo GPA tích lũy (CPA)
 * - Khi nhập bảng điểm thì đồng bộ toàn bộ các task khác (Dashboard, Cây môn học, Audit, Planner, What-if)
 */

test('1. Biểu đồ GPA tính toán chuẩn xác theo CPA tích lũy (Cumulative CPA) qua từng học kỳ', () => {
  // Bảng điểm mẫu 3 học kỳ:
  // HK1: 2 môn A (4.0 * 6 = 24), 1 môn B (3.0 * 3 = 9) -> 9 TC, GPA: 33/9 = 3.67, CPA: 3.67
  // HK2: 1 môn F (0.0 * 3 = 0), 1 môn D+ (1.5 * 4 = 6) -> 7 TC, GPA: 6/7 = 0.86, CPA: (33 + 6) / 16 = 39/16 = 2.44
  // HK3: 1 môn B (3.0 * 3 = 9) -> 3 TC, GPA: 9/3 = 3.00, CPA: (39 + 9) / 19 = 48/19 = 2.53
  const attempts = [
    { courseCode: 'MATH1001', semesterCode: '2024_1', credits: 3, letterGrade: 'A', status: 'PASSED' },
    { courseCode: 'IT1001', semesterCode: '2024_1', credits: 3, letterGrade: 'A', status: 'PASSED' },
    { courseCode: 'ML1001', semesterCode: '2024_1', credits: 3, letterGrade: 'B', status: 'PASSED' },
    { courseCode: 'MATH1002', semesterCode: '2024_2', credits: 3, letterGrade: 'F', status: 'FAILED' },
    { courseCode: 'IT2001', semesterCode: '2024_2', credits: 4, letterGrade: 'D+', status: 'PASSED_LOW' },
    { courseCode: 'IT3001', semesterCode: '2025_1', credits: 3, letterGrade: 'B', status: 'PASSED' }
  ];

  const trend = calculateSemesterGpaTrend(attempts);

  assert.equal(trend.length, 3);

  // Học kỳ 1:
  assert.equal(trend[0].semesterCode, '2024_1');
  assert.equal(trend[0].displayLabel, 'HK 1');
  assert.equal(trend[0].semesterGpa, 3.67);
  assert.equal(trend[0].cumulativeCpa, 3.67);
  assert.equal(trend[0].semesterCredits, 9);
  assert.equal(trend[0].cumCredits, 9);

  // Học kỳ 2: Có môn F làm GPA học kỳ sụt xuống 0.86 và kéo CPA tích lũy xuống 2.44
  assert.equal(trend[1].semesterCode, '2024_2');
  assert.equal(trend[1].displayLabel, 'HK 2');
  assert.equal(trend[1].semesterGpa, 0.86);
  assert.equal(trend[1].cumulativeCpa, 2.44);
  assert.equal(trend[1].failedCount, 1);
  assert.equal(trend[1].passedCount, 1);

  // Học kỳ 3: Học tiếp kéo nhẹ CPA lên 2.53
  assert.equal(trend[2].semesterCode, '2025_1');
  assert.equal(trend[2].displayLabel, 'HK 1'); // 2025_1
  assert.equal(trend[2].semesterGpa, 3.00);
  assert.equal(trend[2].cumulativeCpa, 2.53);

  // Sinh viên mới (empty) chưa có bảng điểm -> trend rỗng
  assert.deepEqual(calculateSemesterGpaTrend([]), []);
});

test('2. Đồng bộ toàn hệ thống khi xác nhận Bảng điểm mới (/transcript)', async () => {
  // 1. Chuyển sang sinh viên at-risk ban đầu (CPA 1.85, nợ MATH1002)
  selectStudentPreset('at-risk');
  const initialStatus = getDynamicAcademicStatus();
  assert.equal(initialStatus.cpa, 1.85);
  assert.ok(initialStatus.failedCourses.some((c) => c.courseCode === 'MATH1002'));

  const createdWindow = typeof globalThis.window === 'undefined';
  if (createdWindow) {
    globalThis.window = new EventTarget();
  }

  let eventFired = false;
  let eventDetail = null;
  const listener = (e) => {
    eventFired = true;
    eventDetail = e.detail;
  };

  globalThis.window.addEventListener('haui:academic:transcript-updated', listener);

  // 2. Sinh viên nhập bảng điểm mới: Học lại MATH1002 đạt A (4.0), học thêm IT3004 đạt A (4.0)
  const updatedRecords = [
    { courseCode: 'MATH1001', courseName: 'Giải tích 1', credits: 3, semesterCode: '2024_1', letterGrade: 'A', status: 'PASSED' },
    { courseCode: 'IT1001', courseName: 'Nhập môn lập trình', credits: 3, semesterCode: '2024_1', letterGrade: 'A', status: 'PASSED' },
    { courseCode: 'ML1001', courseName: 'Triết học Mác - Lênin', credits: 3, semesterCode: '2024_1', letterGrade: 'B', status: 'PASSED' },
    { courseCode: 'MATH1002', courseName: 'Toán rời rạc (Đã học lại)', credits: 3, semesterCode: '2024_2', letterGrade: 'A', status: 'PASSED' },
    { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', credits: 4, semesterCode: '2024_2', letterGrade: 'B+', status: 'PASSED' },
    { courseCode: 'IT3001', courseName: 'Mạng máy tính căn bản', credits: 3, semesterCode: '2025_1', letterGrade: 'B', status: 'PASSED' },
    { courseCode: 'IT6001', courseName: 'Cấu trúc dữ liệu & giải thuật', credits: 3, semesterCode: '2025_1', letterGrade: 'A', status: 'PASSED' }
  ];

  commitTranscriptRecords(updatedRecords);

  // 3. Kiểm tra CustomEvent 'haui:academic:transcript-updated' được phát
  assert.equal(eventFired, true);
  assert.ok(eventDetail);
  assert.equal(eventDetail.records.length, 7);

  // 4. Kiểm tra Dashboard & Academic Status cập nhật tức thì:
  const newStatus = getDynamicAcademicStatus();
  // CPA mới tính từ 22 tín chỉ: (3*4 + 3*4 + 3*3 + 3*4 + 4*3.5 + 3*3 + 3*4) / 22 = (12+12+9+12+14+9+12)/22 = 80/22 = 3.64 (Xuất sắc)
  assert.equal(newStatus.cpa, 3.64);
  assert.equal(newStatus.accumulatedCredits, 22);
  // Không còn môn nợ F nào:
  assert.equal(newStatus.failedCourses.length, 0);

  // 5. Kiểm tra Cây môn học (Curriculum Tree) phản ánh tức thì:
  const tree = mockAcademicService.getCurriculumTree();
  const math1002Node = tree.courses.find((c) => c.courseCode === 'MATH1002');
  assert.equal(math1002Node.status, 'PASSED');
  assert.equal(math1002Node.letterGrade, 'A');

  // Môn IT6005 (có tiên quyết là IT6001 và MATH1002) trước đây bị BLOCKED nay đã chuyển sang ELIGIBLE
  const it6005Node = tree.courses.find((c) => c.courseCode === 'IT6005');
  assert.equal(it6005Node.eligible, true);
  assert.equal(it6005Node.status, 'ELIGIBLE');

  // 6. Kiểm tra Kiểm toán tốt nghiệp (Graduation Audit) cập nhật tức thì:
  const audit = getDynamicGraduationAudit();
  assert.equal(audit.accumulatedCredits, 22);
  assert.equal(audit.eligibleForGraduation, false); // 22/135 TC chưa đủ

  globalThis.window.removeEventListener('haui:academic:transcript-updated', listener);
  if (createdWindow) {
    delete globalThis.window;
  }
});

test('3. DashboardPage chứa mã nguồn xử lý biểu đồ GPA/CPA tích lũy và đồng bộ sự kiện bảng điểm', () => {
  const dashFile = path.resolve(__dirname, '../src/pages/DashboardPage.jsx');
  const code = fs.readFileSync(dashFile, 'utf-8');

  // Kiểm tra biểu đồ GPA/CPA tích lũy chỉ có 1 đường kẻ duy nhất
  assert.ok(code.includes('Biến thiên GPA & CPA tích lũy qua các học kỳ') || code.includes('Biến thiên GPA &amp; CPA tích lũy qua các học kỳ'));
  assert.ok(code.includes('calculateSemesterGpaTrend'));
  assert.ok(code.includes('CPA tích lũy'));
  assert.ok(code.includes('1 ĐƯỜNG KẺ DUY NHẤT'));
  assert.ok(code.includes('haui:academic:transcript-updated'));
  assert.ok(code.includes('failedCoursesList'));
});

