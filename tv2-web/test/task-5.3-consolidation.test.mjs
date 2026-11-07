/**
 * HaUI Advisor — Task 5.3 Consolidation, Terminology & Contribution Verification Suite
 * Role: TV2 (Frontend Platform & Academic Engineer)
 * Folder: tv2-web/
 *
 * Requirements (§5.3):
 * 1. Final consolidation folder exists: tv2-web/docs/report/final/.
 * 2. Member contribution matrix covers all 5 roles (TV1 - TV5) and their assigned scopes.
 * 3. HaUI academic terminology reconciliation (CPA, GPA, DRL, CTDT, CDR, 7 graduation criteria).
 * 4. System & contract versions alignment (Contract 1.5.0, policy-haui-demo-2026@0.0.1-v0).
 * 5. Strict role ownership: TV3 retains its own reports in tv3-planner-ui/, TV2 strictly works in tv2-web/.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const TV2_ROOT = path.resolve(__dirname, '..');

test('Task 5.3 - Test 1: Thư mục tv2-web/docs/report/final/ và Hồ sơ hợp nhất tồn tại đầy đủ', () => {
  const finalDir = path.join(TV2_ROOT, 'docs/report/final');
  assert.ok(fs.existsSync(finalDir), 'Thư mục tv2-web/docs/report/final/ phải tồn tại');

  const dossierFile = path.join(finalDir, 'task-5.3-consolidation-dossier.md');
  assert.ok(fs.existsSync(dossierFile), 'Tệp task-5.3-consolidation-dossier.md phải tồn tại trong final/');

  const content = fs.readFileSync(dossierFile, 'utf-8');
  assert.ok(content.length > 1000, 'Hồ sơ hợp nhất phải có nội dung chi tiết');
  assert.ok(content.includes('Task 5.3'), 'Phải chứa mã nhiệm vụ Task 5.3');
});

test('Task 5.3 - Test 2: Ma trận phân công & đóng góp bao quát đầy đủ 5 thành viên (TV1..TV5)', () => {
  const dossierFile = path.join(TV2_ROOT, 'docs/report/final/task-5.3-consolidation-dossier.md');
  const content = fs.readFileSync(dossierFile, 'utf-8');

  // Kiểm tra 5 thành viên
  const roles = [
    { role: 'TV1', folder: 'tv1-ai/' },
    { role: 'TV2', folder: 'tv2-web/' },
    { role: 'TV3', folder: 'tv3-planner-ui/' },
    { role: 'TV4', folder: 'tv4-academic/' },
    { role: 'TV5', folder: 'tv5-platform/' }
  ];

  for (const r of roles) {
    assert.ok(content.includes(`**${r.role}**`), `Hồ sơ phải ghi nhận thành viên ${r.role}`);
    assert.ok(content.includes(`\`${r.folder}\``), `Hồ sơ phải ghi nhận thư mục của ${r.role} (${r.folder})`);
  }
});

test('Task 5.3 - Test 3: Rà soát & Chuẩn hóa thuật ngữ học vụ HaUI (CPA, GPA, ĐRL, CTĐT, CĐR, 7 tiêu chí)', () => {
  const dossierFile = path.join(TV2_ROOT, 'docs/report/final/task-5.3-consolidation-dossier.md');
  const content = fs.readFileSync(dossierFile, 'utf-8');

  // Thuật ngữ học vụ cốt lõi
  assert.ok(content.includes('CPA') && content.includes('Điểm trung bình chung tích lũy'));
  assert.ok(content.includes('GPA') && content.includes('Điểm trung bình học kỳ'));
  assert.ok(content.includes('ĐRL') && content.includes('Điểm rèn luyện'));
  assert.ok(content.includes('CTĐT') && content.includes('Chương trình đào tạo'));
  assert.ok(content.includes('CĐR') && content.includes('Chuẩn đầu ra'));

  // Trạng thái môn học & kế hoạch
  assert.ok(content.includes('PASSED') && content.includes('IN_PROGRESS') && content.includes('FAILED') && content.includes('BLOCKED'));
  assert.ok(content.includes('DRAFT') && content.includes('ACTIVE') && content.includes('ARCHIVED'));

  // 7 tiêu chuẩn đầu ra HaUI
  assert.ok(content.includes('Tổng số tín chỉ') || content.includes('Tín chỉ'));
  assert.ok(content.includes('Ngoại ngữ') && (content.includes('TOEIC') || content.includes('VSTEP')));
  assert.ok(content.includes('Tin học') && (content.includes('MOS') || content.includes('IC3')));
  assert.ok(content.includes('thể chất') || content.includes('Quốc phòng'));
});

test('Task 5.3 - Test 4: Đối chiếu phiên bản hợp đồng (Contract 1.5.0) & Chính sách (policy-haui-demo-2026@0.0.1-v0)', () => {
  const dossierFile = path.join(TV2_ROOT, 'docs/report/final/task-5.3-consolidation-dossier.md');
  const content = fs.readFileSync(dossierFile, 'utf-8');

  assert.ok(content.includes('contracts-v1 1.5.0') || content.includes('1.5.0'));
  assert.ok(content.includes('policy-haui-demo-2026@0.0.1-v0'));
  assert.ok(content.includes('dataRevision'));
});

test('Task 5.3 - Test 5: Ranh giới sở hữu — TV3 tiếp tục sở hữu phần riêng, TV2 chỉ tác động trong tv2-web/', () => {
  // TV3 vẫn sở hữu thư mục và báo cáo của TV3
  const tv3SmokeReport = path.join(REPO_ROOT, 'tv3-planner-ui/docs/smoke-report/BAO_CAO_SMOKE_TEST_TV3.md');
  const tv3Guide = path.join(REPO_ROOT, 'tv3-planner-ui/docs/smoke-report/HUONG_DAN_LUU_HUY_MO_LAI.md');

  assert.ok(fs.existsSync(tv3SmokeReport), 'Báo cáo của TV3 phải tồn tại nguyên vẹn trong tv3-planner-ui/');
  assert.ok(fs.existsSync(tv3Guide), 'Hướng dẫn của TV3 phải tồn tại nguyên vẹn trong tv3-planner-ui/');

  // TV2 không được sao chép hoặc ghi đè lên file của TV3
  const tv2ReportDir = path.join(TV2_ROOT, 'docs/report');
  assert.ok(!fs.existsSync(path.join(tv2ReportDir, 'BAO_CAO_SMOKE_TEST_TV3.md')), 'TV2 không được sao chép file của TV3 vào tv2-web/');
});
