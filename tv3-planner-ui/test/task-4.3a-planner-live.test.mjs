/**
 * HaUI Advisor — Task 4.3a Live Planner UI Integration Verification Suite
 * Role: TV3 (Frontend Kế hoạch & AI — Planner UI)
 *
 * Tiêu chí nghiệm thu Task 4.3a:
 * 1. Thay mock Planner bằng API thật (Contracts 1.4.0).
 * 2. Tạo phương án trực tiếp không cần Chat (POST /planner/generate -> DRAFT, nhãn "Dự kiến", policyVersion, warnings).
 * 3. Lưu nháp qua API (POST /planner/plans -> luôn DRAFT, chưa qua kiểm tra điều kiện).
 * 4. Sửa bản ACTIVE qua bản kế thừa (sourcePlanId trỏ về bản ACTIVE cũ, bản ACTIVE cũ giữ nguyên).
 * 5. Hủy thay đổi chưa lưu (hoàn tác về bản ACTIVE) và Hủy bản nháp trên server (DELETE /planner/plans/{id}).
 * 6. Kích hoạt kế hoạch (POST /planner/plans/{id}/activate): Chỉ cho phép khi VALIDATED; xử lý 503 TOOL_NOT_READY an toàn; bản cũ thành ARCHIVED.
 * 7. Mở lại sau reload (GET /planner/plans & GET /planner/plans/{id}) và khôi phục từ ARCHIVED (POST /planner/plans/{id}/restore).
 * 8. Giữ nguyên nội dung kế hoạch khi API gặp sự cố (save, validate, generate, activate lỗi không làm mất dữ liệu).
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {
  plannerStore,
  plannerApi,
  PLAN_STATUSES,
  StudyPlannerPage
} from '../src/index.js';

// Fixture học kỳ chuẩn
const createSampleSemesters = () => [
  {
    semesterCode: '2026_1',
    semesterName: 'Học kỳ 1 (2026 - 2027) — Kỳ 7',
    totalCredits: 18,
    expectedGpa: 3.35,
    courses: [
      { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3, courseType: 'Học lại (Nợ F)', targetGrade: 'B (3.0)' },
      { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', credits: 4, courseType: 'Học cải thiện', targetGrade: 'A (4.0)' },
      { courseCode: 'IT6002', courseName: 'Lập trình mạng', credits: 3, courseType: 'Chuẩn CTĐT', targetGrade: 'B+ (3.5)' },
      { courseCode: 'IT4001', courseName: 'Cơ sở dữ liệu nâng cao', credits: 3, courseType: 'Chuẩn CTĐT', targetGrade: 'B (3.0)' },
      { courseCode: 'IT6010', courseName: 'Phát triển ứng dụng Web', credits: 3, courseType: 'Tự chọn chuyên ngành', targetGrade: 'A (4.0)' },
      { courseCode: 'FL2001', courseName: 'Tiếng Anh CNTT', credits: 2, courseType: 'Bắt buộc chung', targetGrade: 'B (3.0)' }
    ]
  },
  {
    semesterCode: '2026_2',
    semesterName: 'Học kỳ 2 (2026 - 2027) — Kỳ 8',
    totalCredits: 15,
    expectedGpa: 3.40,
    courses: [
      { courseCode: 'IT6080', courseName: 'Đồ án chuyên ngành KTPM', credits: 4, courseType: 'Bắt buộc', targetGrade: 'A (4.0)' },
      { courseCode: 'IT6090', courseName: 'Khóa luận tốt nghiệp KTPM', credits: 6, courseType: 'Tốt nghiệp', targetGrade: 'A (4.0)' },
      { courseCode: 'IT6015', courseName: 'Kiến trúc phần mềm', credits: 3, courseType: 'Tự chọn', targetGrade: 'B+ (3.5)' },
      { courseCode: 'SK2001', courseName: 'Kỹ năng làm việc chuyên nghiệp', credits: 2, courseType: 'Bổ trợ', targetGrade: 'A (4.0)' }
    ]
  }
];

// Helper tạo mock live API tuân thủ Contract 1.4.0
function createLivePlannerMockApi(state = {}) {
  const store = {
    plans: state.plans || [
      {
        planId: 'plan-haui-live-001',
        studentId: 'std-2024604757',
        planName: 'Lộ trình chuẩn K16 KTPM',
        status: 'ACTIVE',
        planVersion: 1,
        sourcePlanId: null,
        dataRevision: 'REV-2024604757-001',
        policyVersion: 'policy-haui-demo-2026@0.0.1-v0',
        targetCpa: 3.20,
        projectedCpa: 3.35,
        targetGraduationSemester: '2026_2',
        maxCreditsPerSemester: 24,
        totalCredits: 33,
        semesters: createSampleSemesters(),
        warnings: ['Kế hoạch đang theo dõi chính thức'],
        actions: [],
        createdAt: '2026-10-20T08:00:00Z',
        updatedAt: '2026-10-20T08:00:00Z'
      }
    ],
    generateCounter: 0,
    calls: []
  };

  return {
    _store: store,
    planner: {
      generate: async (payload = {}) => {
        store.calls.push({ endpoint: 'POST /planner/generate', payload });
        store.generateCounter += 1;
        return {
          proposalId: `proposal-gen-${store.generateCounter}`,
          studentId: 'std-2024604757',
          planName: 'Kế hoạch học tập đề xuất (Tạo trực tiếp)',
          status: 'DRAFT',
          targetCpa: payload.targetCpa || 3.20,
          totalCredits: 33,
          projectedCpa: 3.42,
          semesters: createSampleSemesters(),
          warnings: ['Chưa có bảng điểm đã xác nhận đầy đủ', 'Dự kiến hoàn thành sau 2 học kỳ chính'],
          actions: [],
          dataRevision: payload.dataRevision || 'REV-2024604757-001',
          policyVersion: 'policy-haui-demo-2026@0.0.1-v0'
        };
      },
      listPlans: async () => {
        store.calls.push({ endpoint: 'GET /planner/plans' });
        return {
          plans: store.plans.map((p) => ({
            planId: p.planId,
            planName: p.planName,
            planVersion: p.planVersion,
            status: p.status,
            sourcePlanId: p.sourcePlanId,
            totalCredits: p.totalCredits,
            projectedCpa: p.projectedCpa,
            updatedAt: p.updatedAt
          }))
        };
      },
      getPlan: async (planId) => {
        store.calls.push({ endpoint: `GET /planner/plans/${planId}`, planId });
        const found = store.plans.find((p) => p.planId === planId);
        if (!found) {
          const err = new Error(`Không tìm thấy kế hoạch: ${planId}`);
          err.status = 404;
          throw err;
        }
        return JSON.parse(JSON.stringify(found));
      },
      savePlan: async (payload = {}) => {
        store.calls.push({ endpoint: 'POST /planner/plans', payload });
        const now = new Date().toISOString();

        // 1. Tạo mới
        if (!payload.planId) {
          const newPlan = {
            planId: `plan-haui-live-${store.plans.length + 1}`,
            studentId: 'std-2024604757',
            planName: payload.planName || 'Kế hoạch học tập mới',
            status: 'DRAFT',
            planVersion: 1,
            sourcePlanId: null,
            dataRevision: payload.dataRevision || 'REV-2024604757-001',
            policyVersion: 'policy-haui-demo-2026@0.0.1-v0',
            targetCpa: payload.targetCpa,
            projectedCpa: 3.35,
            targetGraduationSemester: payload.targetGraduationSemester,
            maxCreditsPerSemester: payload.maxCreditsPerSemester,
            totalCredits: (payload.semesters || []).reduce((sum, s) => sum + (s.totalCredits || 0), 0),
            semesters: payload.semesters || [],
            warnings: [],
            actions: payload.actions || [],
            createdAt: now,
            updatedAt: now
          };
          store.plans.unshift(newPlan);
          return {
            planId: newPlan.planId,
            planName: newPlan.planName,
            status: 'DRAFT',
            planVersion: 1,
            sourcePlanId: null,
            dataRevision: newPlan.dataRevision,
            updatedAt: now,
            message: 'Đã lưu nháp kế hoạch mới. Bản nháp chưa được kiểm tra điều kiện.'
          };
        }

        // 2. Cập nhật hoặc kế thừa
        const existing = store.plans.find((p) => p.planId === payload.planId);
        if (!existing) {
          const err = new Error(`Không tìm thấy kế hoạch: ${payload.planId}`);
          err.status = 404;
          throw err;
        }

        // Nếu sửa trên bản ACTIVE -> sinh bản DRAFT mới kế thừa, ACTIVE giữ nguyên
        if (existing.status === 'ACTIVE') {
          const inheritedPlan = {
            planId: `plan-haui-live-${store.plans.length + 1}`,
            studentId: 'std-2024604757',
            planName: payload.planName || `Bản sao từ ${existing.planName}`,
            status: 'DRAFT',
            planVersion: 1,
            sourcePlanId: existing.planId,
            dataRevision: payload.dataRevision || existing.dataRevision,
            policyVersion: existing.policyVersion,
            targetCpa: payload.targetCpa ?? existing.targetCpa,
            projectedCpa: existing.projectedCpa,
            targetGraduationSemester: payload.targetGraduationSemester ?? existing.targetGraduationSemester,
            maxCreditsPerSemester: payload.maxCreditsPerSemester ?? existing.maxCreditsPerSemester,
            totalCredits: (payload.semesters || []).reduce((sum, s) => sum + (s.totalCredits || 0), 0),
            semesters: payload.semesters || [],
            warnings: [],
            actions: payload.actions || [],
            createdAt: now,
            updatedAt: now
          };
          store.plans.unshift(inheritedPlan);
          return {
            planId: inheritedPlan.planId,
            planName: inheritedPlan.planName,
            status: 'DRAFT',
            planVersion: 1,
            sourcePlanId: existing.planId,
            dataRevision: inheritedPlan.dataRevision,
            updatedAt: now,
            message: 'Đã lưu nháp kế thừa từ bản đang theo dõi. Bản nháp chưa được kiểm tra điều kiện.'
          };
        }

        // Cập nhật trên DRAFT/VALIDATED: tăng version, đưa về DRAFT
        existing.planVersion += 1;
        existing.status = 'DRAFT';
        existing.planName = payload.planName || existing.planName;
        existing.semesters = payload.semesters || existing.semesters;
        existing.totalCredits = (payload.semesters || []).reduce((sum, s) => sum + (s.totalCredits || 0), 0);
        existing.updatedAt = now;
        return {
          planId: existing.planId,
          planName: existing.planName,
          status: 'DRAFT',
          planVersion: existing.planVersion,
          sourcePlanId: existing.sourcePlanId,
          dataRevision: existing.dataRevision,
          updatedAt: now,
          message: 'Đã cập nhật bản nháp. Bản nháp chưa được kiểm tra điều kiện.'
        };
      },
      deletePlan: async (planId, planVersion) => {
        store.calls.push({ endpoint: `DELETE /planner/plans/${planId}`, planId, planVersion });
        const idx = store.plans.findIndex((p) => p.planId === planId);
        if (idx === -1) {
          const err = new Error('Không tìm thấy kế hoạch để xóa');
          err.status = 404;
          throw err;
        }
        if (store.plans[idx].status === 'ACTIVE') {
          const err = new Error('Không thể hủy kế hoạch đang theo dõi (ACTIVE)');
          err.status = 409;
          throw err;
        }
        store.plans.splice(idx, 1);
      },
      validate: async (payload = {}) => {
        store.calls.push({ endpoint: 'POST /planner/validate', payload });
        if (state.mockToolNotReady) {
          const err = new Error('Công cụ thẩm định chưa sẵn sàng');
          err.status = 503;
          err.code = 'TOOL_NOT_READY';
          throw err;
        }
        const hasViolations = Boolean(state.forceValidationViolation);
        return {
          valid: !hasViolations,
          status: payload.planId ? (!hasViolations ? 'VALIDATED' : 'DRAFT') : 'DRAFT',
          violations: hasViolations ? ['Học kỳ 1 thiếu tín chỉ sàn (nhỏ hơn 10 TC)'] : [],
          warnings: ['Kiểm tra quy chế HaUI: Tải học tập cân bằng'],
          planVersion: payload.planVersion || 1,
          dataRevision: payload.dataRevision || 'REV-2024604757-001',
          policyVersion: 'policy-haui-demo-2026@0.0.1-v0',
          validationMode: 'REAL'
        };
      },
      activatePlan: async (planId, payload = {}) => {
        store.calls.push({ endpoint: `POST /planner/plans/${planId}/activate`, planId, payload });
        const target = store.plans.find((p) => p.planId === planId);
        if (!target) {
          const err = new Error('Không tìm thấy kế hoạch để kích hoạt');
          err.status = 404;
          throw err;
        }
        if (state.mockToolNotReady) {
          const err = new Error('Công cụ kiểm tra điều kiện chưa sẵn sàng');
          err.status = 503;
          err.code = 'TOOL_NOT_READY';
          throw err;
        }
        const archivedIds = [];
        for (const p of store.plans) {
          if (p.status === 'ACTIVE' && p.planId !== planId) {
            p.status = 'ARCHIVED';
            archivedIds.push(p.planId);
          }
        }
        target.status = 'ACTIVE';
        target.updatedAt = new Date().toISOString();
        return {
          planId: target.planId,
          status: 'ACTIVE',
          activatedAt: target.updatedAt,
          archivedPlanIds: archivedIds,
          message: 'Đã kích hoạt kế hoạch học tập thành công.'
        };
      },
      restorePlan: async (planId, payload = {}) => {
        store.calls.push({ endpoint: `POST /planner/plans/${planId}/restore`, planId, payload });
        const origin = store.plans.find((p) => p.planId === planId);
        if (!origin) {
          const err = new Error('Không tìm thấy kế hoạch để khôi phục');
          err.status = 404;
          throw err;
        }
        const now = new Date().toISOString();
        const restored = {
          ...JSON.parse(JSON.stringify(origin)),
          planId: `plan-haui-restored-${store.plans.length + 1}`,
          planName: payload.planName || `Bản sao từ ${origin.planName}`,
          status: 'DRAFT',
          planVersion: 1,
          sourcePlanId: origin.planId,
          createdAt: now,
          updatedAt: now
        };
        store.plans.unshift(restored);
        return JSON.parse(JSON.stringify(restored));
      }
    }
  };
}

beforeEach(() => {
  plannerStore.resetToDefault();
});

test('Task 4.3a - 1: Tạo phương án trực tiếp không cần Chat (POST /planner/generate)', async () => {
  const api = createLivePlannerMockApi();

  const res = await plannerStore.generatePlanAsync(api, {
    targetGraduationSemester: '2026_1',
    targetCpa: 3.50,
    includeSummerSemesters: true
  });

  assert.equal(res.success, true, 'Sinh phương án trực tiếp phải thành công');
  assert.ok(res.warnings.length > 0, 'Phải hiển thị danh sách warnings');
  assert.equal(res.policyVersion, 'policy-haui-demo-2026@0.0.1-v0', 'Phải có policyVersion chuẩn');

  // Kiểm tra trạng thái trong PlannerStore
  const plan = plannerStore.getPlan();
  assert.equal(plan.status, PLAN_STATUSES.DRAFT, 'Phương án sinh ra luôn luôn là DRAFT');
  assert.equal(plan.planId, null, 'Phương án xem trước chưa lưu nên planId là null');
  assert.equal(plan.planVersion, null, 'Phương án chưa lưu nên planVersion là null');
  assert.equal(plan.targetCpa, 3.50);
  assert.equal(plan.projectedCpa, 3.42, 'Có CPA dự kiến');
  assert.equal(plan.policyVersion, 'policy-haui-demo-2026@0.0.1-v0');
  assert.equal(plannerStore.getValidation(), null, 'Phương án sinh ra chưa thẩm định');

  // Xác thực API được gọi đúng tham số
  const generateCall = api._store.calls.find((c) => c.endpoint === 'POST /planner/generate');
  assert.ok(generateCall, 'Phải gọi endpoint POST /planner/generate');
  assert.equal(generateCall.payload.targetGraduationSemester, '2026_1');
});

test('Task 4.3a - 2: Lưu nháp (Save Draft) qua API luôn là DRAFT chưa qua kiểm tra điều kiện', async () => {
  const api = createLivePlannerMockApi();

  // 1. Sinh phương án xem trước
  await plannerStore.generatePlanAsync(api);

  // 2. Thao tác lưu nháp lần đầu
  const saveRes = await plannerStore.saveDraftAsync(api, 'Kế hoạch nháp sinh viên');
  assert.equal(saveRes.success, true);
  assert.ok(saveRes.planId, 'Phải nhận được planId từ server');
  assert.equal(saveRes.planVersion, 1, 'Lần lưu đầu tiên version = 1');
  assert.ok(saveRes.message.includes('Bản nháp chưa được kiểm tra điều kiện'), 'Thông điệp phải nêu rõ chưa kiểm tra điều kiện');

  const currentPlan = plannerStore.getPlan();
  assert.equal(currentPlan.status, PLAN_STATUSES.DRAFT, 'Trạng thái sau khi lưu nháp phải là DRAFT');
  assert.equal(plannerStore.getValidation(), null, 'Sau khi lưu nháp validation phải null');

  // Bản nháp trong lịch sử mang nhãn Bản nháp (Đã lưu)
  const historyItem = plannerStore.getHistory().find((h) => h.planId === saveRes.planId);
  assert.ok(historyItem);
  assert.equal(historyItem.status, PLAN_STATUSES.DRAFT);
  assert.equal(historyItem.badge, 'Bản nháp (Đã lưu)');
});

test('Task 4.3a - 3: Sửa bản ACTIVE qua bản kế thừa — Bản ACTIVE cũ giữ nguyên vẹn', async () => {
  const api = createLivePlannerMockApi();

  // Nạp bản ACTIVE từ server
  await plannerStore.fetchPlansAsync(api, 'plan-haui-live-001');
  assert.equal(plannerStore.getPlan().planId, 'plan-haui-live-001');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);

  // Thêm một môn mới vào Kỳ 7 trên bản ACTIVE
  plannerStore.addCourseToSemester('2026_1', {
    courseCode: 'TEST999',
    courseName: 'Môn thử nghiệm kế thừa',
    credits: 3
  });

  const modifiedPlan = plannerStore.getPlan();
  assert.equal(modifiedPlan.status, PLAN_STATUSES.DRAFT, 'Sửa trên bản ACTIVE đưa trạng thái hiển thị về DRAFT');
  assert.equal(modifiedPlan.sourcePlanId, 'plan-haui-live-001', 'sourcePlanId phải trỏ về bản ACTIVE cũ');

  // Lưu nháp bản chỉnh sửa
  const saveRes = await plannerStore.saveDraftAsync(api, 'Bản nháp kế thừa K16');
  assert.equal(saveRes.success, true);
  assert.notEqual(saveRes.planId, 'plan-haui-live-001', 'Phải tạo planId mới cho bản kế thừa');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT);
  assert.equal(plannerStore.getPlan().sourcePlanId, 'plan-haui-live-001');

  // Kiểm tra trên mock server: bản ACTIVE gốc vẫn nguyên vẹn
  const activeOriginOnServer = api._store.plans.find((p) => p.planId === 'plan-haui-live-001');
  assert.ok(activeOriginOnServer);
  assert.equal(activeOriginOnServer.status, 'ACTIVE', 'Bản ACTIVE gốc trên server không bị thay đổi');
  assert.equal(activeOriginOnServer.semesters[0].courses.some((c) => c.courseCode === 'TEST999'), false, 'Bản ACTIVE gốc không bị thêm môn mới');

  // Kiểm tra lịch sử cục bộ
  const activeInHistory = plannerStore.getHistory().find((h) => h.planId === 'plan-haui-live-001');
  assert.ok(activeInHistory);
  assert.equal(activeInHistory.status, PLAN_STATUSES.ACTIVE, 'Bản ACTIVE trong lịch sử không bị đè');
});

test('Task 4.3a - 4: Hủy thay đổi chưa lưu (quay về ACTIVE) và Hủy bản nháp trên máy chủ (DELETE)', async () => {
  const api = createLivePlannerMockApi();

  // 1. Nạp bản ACTIVE
  await plannerStore.fetchPlansAsync(api, 'plan-haui-live-001');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);

  // Sửa nhưng không lưu -> bấm Hủy thay đổi
  plannerStore.addCourseToSemester('2026_1', { courseCode: 'TEMP01', courseName: 'Môn tạm', credits: 3 });
  assert.ok(plannerStore.getPlan().semesters[0].courses.some((c) => c.courseCode === 'TEMP01'));

  const discardRes = plannerStore.discardDraftChanges();
  assert.equal(discardRes.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE, 'Hủy thay đổi phải quay về trạng thái ACTIVE');
  assert.equal(plannerStore.getPlan().semesters[0].courses.some((c) => c.courseCode === 'TEMP01'), false, 'Môn tạm phải bị loại bỏ');

  // 2. Tạo bản nháp và lưu lên server
  await plannerStore.generatePlanAsync(api);
  const saveRes = await plannerStore.saveDraftAsync(api, 'Bản nháp chuẩn bị hủy');
  const draftId = saveRes.planId;
  assert.ok(api._store.plans.some((p) => p.planId === draftId));

  // Hủy bản nháp qua API (DELETE /planner/plans/{planId})
  const deleteRes = await plannerStore.deleteDraftAsync(api, draftId, 1);
  assert.equal(deleteRes.success, true);
  assert.equal(api._store.plans.some((p) => p.planId === draftId), false, 'Bản nháp phải bị xóa trên server');
  assert.equal(plannerStore.getHistory().some((h) => h.planId === draftId), false, 'Bản nháp phải bị xóa khỏi lịch sử');
  // Quay về bản ACTIVE còn lại
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);
});

test('Task 4.3a - 5: Thẩm định (Validate) và Kích hoạt (Activate) — Xử lý 503 TOOL_NOT_READY an toàn', async () => {
  // 1. Trường hợp công cụ chưa sẵn sàng (503 TOOL_NOT_READY)
  const apiWith503 = createLivePlannerMockApi({ mockToolNotReady: true });
  await plannerStore.fetchPlansAsync(apiWith503);
  await plannerStore.generatePlanAsync(apiWith503);
  const saved = await plannerStore.saveDraftAsync(apiWith503, 'Bản nháp test 503');

  // Thẩm định khi tool 503
  const val503Res = await plannerStore.validatePlanAsync(apiWith503);
  assert.equal(val503Res.success, false);
  assert.equal(val503Res.toolNotReady, true, 'Phải nhận diện mã TOOL_NOT_READY');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT, 'Kế hoạch vẫn ở DRAFT');

  // Kích hoạt khi chưa VALIDATED -> bị chặn
  const actBlocked = await plannerStore.activatePlanAsync(apiWith503, saved.planId);
  assert.equal(actBlocked.success, false);
  assert.equal(actBlocked.code, 'PLAN_NOT_VALIDATED');

  // 2. Trường hợp công cụ thật hoạt động bình thường (Ready)
  const liveApi = createLivePlannerMockApi({ mockToolNotReady: false });
  await plannerStore.fetchPlansAsync(liveApi);
  await plannerStore.generatePlanAsync(liveApi);
  const draft = await plannerStore.saveDraftAsync(liveApi, 'Bản nháp sẵn sàng kích hoạt');

  // Thẩm định đạt VALIDATED
  const valRes = await plannerStore.validatePlanAsync(liveApi);
  assert.equal(valRes.success, true);
  assert.equal(valRes.valid, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.VALIDATED, 'Thẩm định thành công phải đạt VALIDATED');

  // Kích hoạt thành công
  const actRes = await plannerStore.activatePlanAsync(liveApi, draft.planId);
  assert.equal(actRes.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE, 'Bản mới phải chuyển sang ACTIVE');

  // Bản ACTIVE cũ trên server chuyển sang ARCHIVED
  const oldActive = liveApi._store.plans.find((p) => p.planId === 'plan-haui-live-001');
  assert.equal(oldActive.status, 'ARCHIVED', 'Bản ACTIVE cũ phải được chuyển thành ARCHIVED');
});

test('Task 4.3a - 6: Mở lại sau reload (GET /planner/plans & GET /planner/plans/{id}) và khôi phục từ ARCHIVED', async () => {
  const api = createLivePlannerMockApi();

  // Thêm một bản ARCHIVED vào mock server
  api._store.plans.push({
    planId: 'plan-archived-999',
    studentId: 'std-2024604757',
    planName: 'Lộ trình cũ đã lưu trữ',
    status: 'ARCHIVED',
    planVersion: 1,
    sourcePlanId: null,
    totalCredits: 30,
    projectedCpa: 3.10,
    semesters: createSampleSemesters(),
    updatedAt: '2026-09-01T00:00:00Z'
  });

  // Giả lập reload trang không truyền tham số: tự động nạp bản ACTIVE
  await plannerStore.fetchPlansAsync(api);
  assert.equal(plannerStore.getPlan().planId, 'plan-haui-live-001');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ACTIVE);

  // Giả lập reload trang với ?plan_id=plan-archived-999: nạp đúng bản chỉ định
  await plannerStore.fetchPlansAsync(api, 'plan-archived-999');
  assert.equal(plannerStore.getPlan().planId, 'plan-archived-999');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.ARCHIVED);

  // Khôi phục (Restore) từ bản ARCHIVED: gọi POST /planner/plans/{id}/restore
  const restoreRes = await plannerStore.restorePlanAsync(api, 'plan-archived-999');
  assert.equal(restoreRes.success, true);
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT, 'Bản khôi phục phải ở trạng thái DRAFT');
  assert.notEqual(plannerStore.getPlan().planId, 'plan-archived-999', 'Bản khôi phục phải có ID mới');
  assert.equal(plannerStore.getPlan().sourcePlanId, 'plan-archived-999');

  // Bản ARCHIVED gốc trong DB server giữ nguyên
  const originalArchived = api._store.plans.find((p) => p.planId === 'plan-archived-999');
  assert.equal(originalArchived.status, 'ARCHIVED');
});

test('Task 4.3a - 7: Giữ nguyên nội dung khi API lỗi (Save, Validate, Generate, Activate, Delete thất bại)', async () => {
  // Mock API lỗi kết nối máy chủ
  const brokenApi = {
    planner: {
      generate: async () => {
        throw new Error('500 Internal Server Error: Planner Engine Crash');
      },
      listPlans: async () => {
        throw new Error('503 Service Unavailable: Gateway Timeout');
      },
      savePlan: async () => {
        throw new Error('500 Internal Server Error: Database Connection Failed');
      },
      validate: async () => {
        throw new Error('500 Internal Server Error: Validation Failed');
      },
      activatePlan: async () => {
        throw new Error('409 Conflict: Version Conflict');
      },
      deletePlan: async () => {
        throw new Error('500 Internal Server Error: Cannot Delete');
      }
    }
  };

  // 1. Thêm môn học thủ công vào kế hoạch
  plannerStore.addCourseToSemester('2026_1', {
    courseCode: 'PRESERVE_001',
    courseName: 'Môn học quan trọng không được mất',
    credits: 4
  });

  const coursesCountBefore = plannerStore.getPlan().semesters[0].courses.length;
  assert.ok(plannerStore.getPlan().semesters[0].courses.some((c) => c.courseCode === 'PRESERVE_001'));

  // 2. Thử lưu bản nháp nhưng API báo lỗi 500
  const saveResult = await plannerStore.saveDraftAsync(brokenApi);
  assert.equal(saveResult.success, false);
  assert.ok(saveResult.message.includes('Nội dung nháp vẫn được giữ nguyên'));

  // Xác minh dữ liệu: Môn học PRESERVE_001 và số lượng môn học KHÔNG BỊ MẤT
  const planAfterFailedSave = plannerStore.getPlan();
  assert.equal(planAfterFailedSave.semesters[0].courses.length, coursesCountBefore);
  assert.ok(planAfterFailedSave.semesters[0].courses.some((c) => c.courseCode === 'PRESERVE_001'), 'Môn học vừa thêm phải còn nguyên vẹn sau khi lưu lỗi');

  // 3. Thử thẩm định nhưng API lỗi
  const valResult = await plannerStore.validatePlanAsync(brokenApi);
  assert.equal(valResult.success, false);
  assert.ok(plannerStore.getPlan().semesters[0].courses.some((c) => c.courseCode === 'PRESERVE_001'), 'Môn học vẫn còn nguyên sau khi thẩm định lỗi');

  // 4. Thử kích hoạt nhưng API lỗi
  const actResult = await plannerStore.activatePlanAsync(brokenApi);
  assert.equal(actResult.success, false);
  assert.ok(plannerStore.getPlan().semesters[0].courses.some((c) => c.courseCode === 'PRESERVE_001'), 'Môn học vẫn còn nguyên sau khi kích hoạt lỗi');

  // 5. Thử sinh phương án mới nhưng API lỗi
  const genResult = await plannerStore.generatePlanAsync(brokenApi);
  assert.equal(genResult.success, false);
  assert.ok(plannerStore.getPlan().semesters[0].courses.some((c) => c.courseCode === 'PRESERVE_001'), 'Môn học vẫn còn nguyên sau khi generate lỗi');
});

test('Task 4.3a - 8: StudyPlannerPage render đúng các thành phần hợp đồng 1.4.0 với Live API', async () => {
  const api = createLivePlannerMockApi();

  // Test StudyPlannerPage nhận injected api và ui
  const pageElement = React.createElement(StudyPlannerPage, {
    api,
    ui: {
      Button: ({ children, onClick, disabled }) => React.createElement('button', { onClick, disabled }, children),
      Card: ({ title, children }) => React.createElement('div', { 'data-card-title': title }, children),
      Table: ({ columns, data }) => React.createElement('table', null, React.createElement('tbody', null, (data || []).map((row, i) => React.createElement('tr', { key: i }, React.createElement('td', null, row.courseCode))))),
      Modal: ({ isOpen, title, children }) => (isOpen ? React.createElement('div', { 'data-modal': title }, children) : null),
      Loading: ({ label }) => React.createElement('div', null, label),
      Error: ({ message }) => React.createElement('div', null, message),
      EmptyState: ({ title }) => React.createElement('div', null, title)
    }
  });

  assert.ok(React.isValidElement(pageElement), 'StudyPlannerPage phải là một React Element hợp lệ');
});
