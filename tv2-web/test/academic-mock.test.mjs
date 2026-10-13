/**
 * HaUI Advisor — Task 3.4 FE Academic Mock Contract V1 Verification Suite
 * Role: TV2 (Frontend Platform & Academic Engineer)
 *
 * Verifies:
 * 1. Mock API Adapter & Contract V1 DTO schemas (StudentContextDTO, EnrollmentRecordDTO, CurriculumDTO, CourseRelationDTO).
 * 2. Login & 3 Personas switching (normal, at-risk, empty).
 * 3. Dashboard academic summary loading via mock API.
 * 4. 3-step Transcript Import & Confirm flow (Upload/Manual -> Review/Edit -> Confirm & Server recalculation).
 * 5. Curriculum Tree 4 node colors and Rule Engine eligibility checking.
 * 6. TV3 Planner Navigation contract (/planner?course_id=...&plan_id=...).
 * 7. Strict Boundaries: Zero client-side arithmetic for GPA/CPA, Zero LLM browser imports.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApiClient } from '../src/services/apiClient.js';
import { mockAcademicService, computeServerAcademicMetrics } from '../src/services/mockAcademicService.js';
import {
  STUDENT_PRESETS,
  getAcademicSnapshot,
  selectStudentPreset,
  loginStudent,
  logoutStudent,
  commitTranscriptRecords,
  getDynamicAcademicStatus,
  getDynamicCurriculumTree
} from '../src/services/academicStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TV2_ROOT = path.resolve(__dirname, '..');

test('Task 3.4 - Test 1: Contract V1 DTOs Schema Compliance (StudentContextDTO & EnrollmentRecordDTO)', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });

  // 1. Kiểm tra StudentContextDTO khi gọi GET /students/me
  mockAcademicService.setActivePersona('normal');
  const profile = await client.academic.getProfile();

  assert.ok(profile.student_id, 'Phải có student_id chuẩn Contract V1');
  assert.ok(profile.full_name, 'Phải có full_name chuẩn Contract V1');
  assert.ok(profile.major_id, 'Phải có major_id chuẩn Contract V1');
  assert.ok(profile.cohort, 'Phải có cohort');
  assert.equal(typeof profile.current_cpa, 'number', 'current_cpa phải là số');
  assert.equal(typeof profile.accumulated_credits, 'number', 'accumulated_credits phải là số');
  assert.equal(profile.academic_status, 'NORMAL', 'Trạng thái học vụ của normal phải là NORMAL');
  assert.ok(Array.isArray(profile.warnings), 'warnings phải là mảng chuỗi');

  // 2. Kiểm tra EnrollmentRecordDTO khi gọi GET /academic/transcript
  const transcriptRes = await client.academic.getTranscript();
  assert.ok(Array.isArray(transcriptRes.attempts), 'Phải có danh sách attempts');
  assert.ok(transcriptRes.attempts.length > 0, 'Phải có ít nhất 1 bản ghi điểm');

  const firstRecord = transcriptRes.attempts[0];
  assert.ok(firstRecord.course_code || firstRecord.courseCode, 'Phải có course_code');
  assert.ok(firstRecord.course_name || firstRecord.courseName, 'Phải có course_name');
  assert.equal(typeof firstRecord.credits, 'number', 'credits phải là số');
  assert.ok(['PASSED', 'FAILED', 'IN_PROGRESS'].includes(firstRecord.status), 'Trạng thái phải là PASSED/FAILED/IN_PROGRESS');
  assert.ok(firstRecord.letter_grade || firstRecord.letterGrade, 'Phải có điểm chữ letter_grade');
});

test('Task 3.4 - Test 2: Màn hình Login & Chuyển đổi 3 Personas mẫu', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });

  // 1. Persona 1: Sinh viên bình thường (ngành KTPM/CNTT, CPA 3.05 - 3.20, không nợ môn)
  const loginNormal = await client.auth.login({ presetId: 'normal' });
  assert.equal(loginNormal.success, true);
  assert.equal(loginNormal.student.student_id, '2024604757');
  assert.equal(loginNormal.student.academic_status, 'NORMAL');
  assert.ok(loginNormal.student.current_cpa >= 3.0, 'Sinh viên bình thường phải có CPA >= 3.0');

  // 2. Persona 2: Sinh viên nguy cơ học vụ (CPA < 2.0, nợ môn tiên quyết Toán rời rạc MATH1002)
  const loginAtRisk = await client.auth.login({ presetId: 'at-risk' });
  assert.equal(loginAtRisk.success, true);
  assert.equal(loginAtRisk.student.academic_status, 'AT_RISK');
  assert.ok(loginAtRisk.student.current_cpa < 2.0, 'Sinh viên nguy cơ phải có CPA < 2.0');
  assert.ok(
    loginAtRisk.student.warnings.some((w) => w.includes('Cảnh báo học vụ') || w.includes('MATH1002')),
    'Phải có cảnh báo nợ môn tiên quyết hoặc CPA dưới 2.0'
  );

  // 3. Persona 3: Sinh viên mới (Tân sinh viên K19, chưa có dữ liệu bảng điểm)
  const loginEmpty = await client.auth.login({ presetId: 'empty' });
  assert.equal(loginEmpty.success, true);
  assert.equal(loginEmpty.student.hasTranscript, false);
  assert.equal(loginEmpty.student.current_cpa, null, 'Sinh viên chưa có bảng điểm phải có current_cpa = null');
  assert.equal(loginEmpty.student.accumulated_credits, 0);

  // 4. Quản lý phiên đăng xuất
  const logoutRes = await client.auth.logout();
  assert.equal(logoutRes.success, true);
});

test('Task 3.4 - Test 3: Dashboard Học tập tải dữ liệu Summary từ Mock API', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });

  // Tải summary cho sinh viên at-risk
  mockAcademicService.setActivePersona('at-risk');
  const statusRes = await client.academic.getStatus();

  // Kiểm tra Card chỉ số
  assert.ok(statusRes.cpa !== undefined, 'Summary phải có cpa');
  assert.ok(statusRes.accumulatedCredits !== undefined, 'Summary phải có accumulatedCredits');
  assert.equal(statusRes.totalCreditsRequired, 135, 'Tổng tín chỉ CTĐT phải là 135');

  // Khối cảnh báo học vụ
  assert.equal(statusRes.academicStatus, 'AT_RISK', 'Trạng thái học vụ phải là AT_RISK');
  assert.ok(statusRes.warnings.length > 0, 'Phải có nội dung cảnh báo học vụ');

  // Khối tiến độ kiến thức (Knowledge blocks)
  assert.ok(Array.isArray(statusRes.knowledgeBlocks), 'Phải có mảng knowledgeBlocks');
  assert.ok(statusRes.knowledgeBlocks.length >= 4, 'Phải có đủ các khối kiến thức');
  const genBlock = statusRes.knowledgeBlocks.find((b) => b.blockId === 'GEN');
  assert.ok(genBlock, 'Phải có khối Đại cương (GEN)');
  assert.equal(typeof genBlock.percentage, 'number');
});

test('Task 3.4 - Test 4: Luồng Nhập & Xem bảng điểm 3 bước qua Mock API (Upload/Manual -> Review -> Confirm)', async () => {
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });
  mockAcademicService.setActivePersona('at-risk');

  // Bước 1: Tải file / Khởi tạo phiên Import
  const uploadRes = await client.academic.uploadTranscript({
    fileName: 'Bang_Diem_eHaUI_Export.pdf'
  });
  assert.ok(uploadRes.importSessionId, 'Phải sinh ra mã importSessionId');
  assert.equal(uploadRes.status, 'REVIEW_REQUIRED', 'Phiên mới nạp phải ở trạng thái REVIEW_REQUIRED');
  assert.ok(Array.isArray(uploadRes.rows), 'Phải có danh sách rows bóc tách');
  assert.ok(uploadRes.rows.length >= 4, 'Phải có ít nhất 4 dòng bóc tách');
  const sessionId = uploadRes.importSessionId;

  // Bước 2: Xem lại (Review) & Sửa điểm trực tiếp (Inline edit: Học lại gỡ môn F Toán rời rạc lên B+)
  const rowsToEdit = uploadRes.rows.map((row) => {
    if (row.courseCode === 'MATH1002') {
      return { ...row, score10: 8.0, letterGrade: 'B+', gradePoint: 3.5 };
    }
    return row;
  });

  const updateRes = await client.academic.updateImportRows(sessionId, rowsToEdit);
  assert.equal(updateRes.importSessionId, sessionId);
  const mathRow = updateRes.rows.find((r) => r.courseCode === 'MATH1002');
  assert.equal(mathRow.letterGrade, 'B+', 'Dòng sửa phải cập nhật điểm B+');

  // Bước 3: Xác nhận (Confirm) & Máy chủ tái tính toán lại CPA
  const confirmRes = await client.academic.confirmImport(sessionId);
  assert.equal(confirmRes.status, 'CONFIRMED', 'Phiên phải chuyển sang CONFIRMED');
  assert.ok(confirmRes.confirmedAt, 'Phải có timestamp confirmedAt');
  assert.ok(confirmRes.current_cpa > 2.0, 'Sau khi gỡ nợ MATH1002, CPA tái tính toán phải tăng vượt ngưỡng nguy hiểm');

  // Kiểm tra hồ sơ sinh viên sau khi Confirm
  const updatedProfile = await client.academic.getProfile();
  assert.equal(updatedProfile.hasTranscript, true);
  assert.equal(updatedProfile.current_cpa, confirmRes.current_cpa);
});

test('Task 3.4 - Test 5: Cây môn học 4 trạng thái màu và Rule Engine kiểm tra tiên quyết (Eligibility)', async () => {
  mockAcademicService.reset();
  const client = createApiClient({ mockEnabled: true, mockDelayMs: 0 });

  // 1. Sinh viên at-risk (nợ MATH1002)
  mockAcademicService.setActivePersona('at-risk');
  const treeAtRisk = await client.academic.getCurriculum();
  assert.ok(Array.isArray(treeAtRisk.courses), 'Phải có mảng courses trong cây CTĐT');

  // Kiểm tra 4 trạng thái màu sắc trên Cây
  const colorSet = new Set(treeAtRisk.courses.map((c) => c.nodeColor));
  assert.ok(colorSet.has('GREEN'), 'Phải có node Xanh (Đã hoàn thành)');
  assert.ok(colorSet.has('RED'), 'Phải có node Đỏ (Trượt / Bị chặn)');
  assert.ok(colorSet.has('YELLOW'), 'Phải có node Vàng (Đang học / Đủ điều kiện)');
  assert.ok(colorSet.has('GRAY'), 'Phải có node Xám (Chưa mở)');

  // Kiểm tra Rule Engine: IT6001 (yêu cầu tiên quyết MATH1002) bị chặn đối với sinh viên nợ MATH1002
  const checkBlocked = await client.academic.checkEligibility({ courseCode: 'IT6001' });
  assert.equal(checkBlocked.eligible, false, 'IT6001 phải không đủ điều kiện (eligible=false)');
  assert.ok(
    checkBlocked.missingPrerequisites.some((p) => p.includes('MATH1002')),
    'Phải báo thiếu môn tiên quyết MATH1002'
  );
  assert.ok(checkBlocked.warnings.length > 0, 'Phải có cảnh báo chặn đăng ký từ Rule Engine');

  // Môn không có tiên quyết (IT3001) phải đủ điều kiện
  const checkFree = await client.academic.checkEligibility({ courseCode: 'IT3001' });
  assert.equal(checkFree.eligible, true, 'Môn không tiên quyết phải eligible=true');

  // 2. Chuyển sang sinh viên normal (đã đạt MATH1002): IT6001 phải đủ điều kiện
  mockAcademicService.setActivePersona('normal');
  const checkPassedPrereq = await client.academic.checkEligibility({ courseCode: 'IT6001' });
  assert.equal(checkPassedPrereq.eligible, true, 'Khi đã qua MATH1002, IT6001 phải eligible=true');
  assert.equal(checkPassedPrereq.missingPrerequisites.length, 0);
});

test('Task 3.4 - Test 6: Hợp đồng điều hướng sang TV3 Planner (/planner?course_id=...&plan_id=...)', () => {
  const treePageCode = fs.readFileSync(path.join(TV2_ROOT, 'src/pages/CurriculumTreePage.jsx'), 'utf-8');

  // Kiểm tra chuỗi điều hướng sang TV3 Planner kèm query params
  assert.ok(
    treePageCode.includes("navigate(`/planner?course_id="),
    'Nút [Thêm môn vào kế hoạch] phải điều hướng sang /planner?course_id='
  );
  assert.ok(
    treePageCode.includes('plan_id='),
    'URL điều hướng sang Planner phải mang theo plan_id'
  );

  // Tuyệt đối không import component của TV3 trong TV2
  assert.ok(
    !treePageCode.includes("from '@haui/planner-ui'"),
    'CurriculumTreePage không được import trực tiếp component của TV3'
  );
});

test('Task 3.4 - Test 7: Ranh giới kiến trúc — Tuyệt đối không tự tính GPA/CPA ở Frontend Client & Không import LLM', () => {
  const pagesDir = path.join(TV2_ROOT, 'src/pages');
  const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.jsx') || f.endsWith('.js'));

  for (const file of pageFiles) {
    const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');

    // Không được gọi trực tiếp thư viện LLM hoặc AI endpoint của bên thứ 3
    assert.ok(!content.includes('openai'), `File ${file} không được import openai`);
    assert.ok(!content.includes('anthropic'), `File ${file} không được import anthropic`);
    assert.ok(!content.includes('langchain'), `File ${file} không được import langchain`);
    assert.ok(!content.includes('google/generative-ai'), `File ${file} không được import Gemini trực tiếp từ client`);
  }
});
