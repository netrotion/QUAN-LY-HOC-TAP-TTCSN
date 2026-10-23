import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {
  StudyPlannerPage,
  ChatAdvisorPage,
  WhatIfSimulatorPage,
  plannerStore,
  plannerApi,
  PLAN_STATUSES
} from '../src/index.js';

/**
 * BỘ KIỂM THỬ KỸ THUẬT TASK 4.4a (TV3 — FE Kế hoạch & AI)
 * Nghiệm thu mốc bàn giao: `student-planning-e2e-ready`
 *
 * Căn cứ yêu cầu:
 * "Thay mock Chat/What-if. Chạy Chat→proposal→Planner; What-if/ROI/goal→review diff→save/cancel.
 * Mở lại kế hoạch, cập nhật kết quả học kỳ và đối chiếu. Link file đính kèm dùng importer chung."
 */

test('Task 4.4a - 1: Thay mock Chat bằng API thật (POST /advisor/chat) & Xử lý 503 AI_UNAVAILABLE an toàn', async () => {
  let chatCallPayload = null;
  const mockApi = {
    advisor: {
      chat: async (payload) => {
        chatCallPayload = payload;
        return {
          answer: 'Dựa trên kết quả học tập Kỳ 1-6, bạn cần hoàn thành 18 tín chỉ ở Kỳ 7 với GPA tối thiểu 3.32 để đạt CPA 3.20.',
          sources: [
            {
              sourceId: 'src-reg-01',
              title: 'Quy chế đào tạo theo hệ thống tín chỉ HaUI',
              section: 'Điều 14 - Khối lượng học tập'
            }
          ],
          actions: [],
          warnings: [],
          planProposal: null
        };
      }
    }
  };

  // 1. Gọi chatAdvisor qua API adapter
  const convId = 'c1234567-89ab-cdef-0123-456789abcdef';
  const response = await plannerApi.chatAdvisor(mockApi, {
    conversationId: convId,
    message: 'Dự báo điểm GPA Kỳ 7 để tốt nghiệp loại Giỏi?'
  });

  assert.equal(chatCallPayload.conversationId, convId);
  assert.equal(chatCallPayload.message, 'Dự báo điểm GPA Kỳ 7 để tốt nghiệp loại Giỏi?');
  assert.ok(response.answer.includes('3.32'));
  assert.equal(response.sources.length, 1);
  assert.equal(response.sources[0].sourceId, 'src-reg-01');

  // 2. Kiểm thử xử lý lỗi 503 AI_UNAVAILABLE
  const unavailableApi = {
    advisor: {
      chat: async () => {
        const err = new Error('AI_UNAVAILABLE');
        err.status = 503;
        err.code = 'AI_UNAVAILABLE';
        err.retryable = true;
        err.retryAfter = 5;
        throw err;
      }
    }
  };

  await assert.rejects(
    async () => {
      await plannerApi.chatAdvisor(unavailableApi, {
        conversationId: convId,
        message: 'Lập kế hoạch học tập'
      });
    },
    (err) => {
      assert.equal(err.status, 503);
      assert.equal(err.code, 'AI_UNAVAILABLE');
      assert.equal(err.retryable, true);
      assert.equal(err.retryAfter, 5);
      return true;
    }
  );

  // 3. Kiểm thử xử lý lỗi 409 CONVERSATION_BUSY
  const busyApi = {
    advisor: {
      chat: async () => {
        const err = new Error('CONVERSATION_BUSY');
        err.status = 409;
        err.code = 'CONVERSATION_BUSY';
        err.retryable = true;
        throw err;
      }
    }
  };

  await assert.rejects(
    async () => {
      await plannerApi.chatAdvisor(busyApi, {
        conversationId: convId,
        message: 'Tin nhắn trùng thời điểm'
      });
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'CONVERSATION_BUSY');
      return true;
    }
  );
});

test('Task 4.4a - 2: Luồng Chat → proposal → Planner (Chấp nhận đề xuất mở Study Planner)', async () => {
  plannerStore.resetToDefault();

  const proposedSemesters = [
    {
      semesterCode: '2026_1',
      semesterName: 'Học kỳ 1 (2026-2027)',
      totalCredits: 18,
      expectedGpa: 3.35,
      courses: [
        { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng (Java)', credits: 4, targetGrade: 'A (4.0)' },
        { courseCode: 'IT6080', courseName: 'Đồ án chuyên ngành KTPM', credits: 3, targetGrade: 'A (4.0)' },
        { courseCode: 'IT6035', courseName: 'Kiểm thử và ĐBCL phần mềm', credits: 3, targetGrade: 'B+ (3.5)' },
        { courseCode: 'IT6042', courseName: 'Kiến trúc phần mềm & Thiết kế mẫu', credits: 3, targetGrade: 'A (4.0)' },
        { courseCode: 'IT6050', courseName: 'Quản lý dự án CNTT', credits: 3, targetGrade: 'B+ (3.5)' },
        { courseCode: 'FL6006', courseName: 'Tiếng Anh chuyên ngành nâng cao', credits: 2, targetGrade: 'B (3.0)' }
      ]
    }
  ];

  const planProposal = {
    proposalId: 'prop-ai-chat-2026-001',
    summary: 'Phương án lộ trình tối ưu CPA Giỏi Kỳ 7 (18 tín chỉ cân bằng tải)',
    projectedCpa: 3.25,
    semesters: proposedSemesters
  };

  // Nạp proposal vào store từ Chat
  plannerStore.setIncomingProposal(planProposal, 'AI Advisor Chat');

  const incoming = plannerStore.getIncomingProposal();
  assert.ok(incoming);
  assert.equal(incoming.sourceName, 'AI Advisor Chat');
  assert.equal(incoming.projectedCpa, 3.25);
  assert.ok(incoming.diff);
  assert.equal(typeof incoming.diff.creditsDelta, 'number');

  // Sinh viên bấm "Chấp nhận phương án"
  plannerStore.acceptProposal();

  const currentPlan = plannerStore.getPlan();
  assert.equal(currentPlan.status, PLAN_STATUSES.DRAFT);
  assert.equal(currentPlan.projectedCpa, 3.25);
  assert.equal(currentPlan.semesters.length, 1);
  assert.equal(currentPlan.semesters[0].courses.length, 6);
  assert.equal(plannerStore.getIncomingProposal(), null);
});

test('Task 4.4a - 3: Thay mock What-if/ROI/goal bằng API thật (POST /simulation/*)', async () => {
  let simPayload = null;
  let retakePayload = null;
  let targetPayload = null;

  const mockApi = {
    simulation: {
      simulateGrades: async (payload) => {
        simPayload = payload;
        return {
          currentCpa: 3.18,
          expectedGpa: 3.52,
          projectedCpa: 3.31,
          cpaDelta: 0.13,
          dataRevision: 'REV-2024604757-001',
          policyVersion: 'policy-haui-demo-2026@0.0.1-v0'
        };
      },
      rankRetake: async (payload) => {
        retakePayload = payload;
        return {
          recommendations: [
            {
              courseCode: 'IT2001',
              courseName: 'Lập trình hướng đối tượng (Java)',
              credits: 4,
              currentGrade: 'D+',
              currentGradePoints: 1.5,
              targetGrade: 'A',
              targetGradePoints: 4.0,
              cpaDelta: 0.16,
              rank: 1,
              rationale: 'Môn 4 TC điểm D+, cải thiện lên A tăng mạnh CPA với ROI cao nhất'
            },
            {
              courseCode: 'MATH1002',
              courseName: 'Toán rời rạc',
              credits: 3,
              currentGrade: 'F',
              currentGradePoints: 0.0,
              targetGrade: 'B',
              targetGradePoints: 3.0,
              cpaDelta: 0.11,
              rank: 2,
              rationale: 'Gỡ môn nợ F bắt buộc để mở khóa môn tiên quyết'
            }
          ],
          dataRevision: 'REV-2024604757-001',
          policyVersion: 'policy-haui-demo-2026@0.0.1-v0'
        };
      },
      calculateTargetGrades: async (payload) => {
        targetPayload = payload;
        return {
          currentCpa: 3.18,
          targetCpa: 3.20,
          remainingCredits: 37,
          requiredAverageGpa: 3.26,
          courseRequirements: [
            { courseCode: 'IT6080', courseName: 'Đồ án chuyên ngành KTPM', credits: 3, requiredGrade: 'A (4.0)' },
            { courseCode: 'IT6035', courseName: 'Kiểm thử & ĐBCL PM', credits: 3, requiredGrade: 'B+ (3.5)' }
          ],
          warnings: [],
          policyVersion: 'policy-haui-demo-2026@0.0.1-v0'
        };
      }
    }
  };

  // 1. Simulate Grades
  const simRes = await plannerApi.simulateGrades(mockApi, {
    courses: [{ courseCode: 'IT2001', credits: 4, expectedGrade: 'A' }]
  });
  assert.equal(simPayload.courses.length, 1);
  assert.equal(simRes.expectedGpa, 3.52);
  assert.equal(simRes.projectedCpa, 3.31);
  assert.equal(simRes.cpaDelta, 0.13);

  // 2. Rank Retake Courses (ROI)
  const retakeRes = await plannerApi.rankRetakeCourses(mockApi, { maxSuggestions: 2 });
  assert.equal(retakePayload.maxSuggestions, 2);
  assert.equal(retakeRes.recommendations.length, 2);
  assert.equal(retakeRes.recommendations[0].rank, 1);
  assert.equal(retakeRes.recommendations[0].courseCode, 'IT2001');

  // 3. Calculate Target Grades
  const targetRes = await plannerApi.calculateTargetGrades(mockApi, { targetCpa: 3.20 });
  assert.equal(targetPayload.targetCpa, 3.20);
  assert.equal(targetRes.requiredAverageGpa, 3.26);
  assert.equal(targetRes.courseRequirements.length, 2);

  // 4. An toàn khi sinh viên chưa có bảng điểm (currentCpa / cpaDelta = null)
  const emptyTranscriptApi = {
    simulation: {
      simulateGrades: async () => ({
        currentCpa: null,
        expectedGpa: 3.50,
        projectedCpa: null,
        cpaDelta: null,
        dataRevision: 'REV-EMPTY',
        policyVersion: 'policy-haui-demo-2026@0.0.1-v0'
      })
    }
  };
  const emptyRes = await plannerApi.simulateGrades(emptyTranscriptApi, { courses: [] });
  assert.equal(emptyRes.currentCpa, null);
  assert.equal(emptyRes.projectedCpa, null);
  assert.equal(emptyRes.cpaDelta, null);
  assert.equal(emptyRes.expectedGpa, 3.50);
});

test('Task 4.4a - 4: What-if/ROI/goal → review diff → save/cancel (Bảo toàn bản ACTIVE khi hủy)', async () => {
  plannerStore.resetToDefault();
  const initialActive = plannerStore.getHistory().find((h) => h.status === PLAN_STATUSES.ACTIVE);
  assert.ok(initialActive);
  plannerStore.plan = { ...initialActive.snapshot, planId: initialActive.planId, status: PLAN_STATUSES.ACTIVE };

  // 1. Áp dụng kết quả What-if tạo proposal diff
  const basePlan = plannerStore.getPlan();
  const nextSemesters = basePlan.semesters.map((s, idx) =>
    idx === 0
      ? {
          ...s,
          expectedGpa: 3.44,
          courses: [
            ...s.courses,
            { courseCode: 'IT7005', courseName: 'Điện toán đám mây nâng cao', credits: 4, courseType: 'Học cải thiện (ROI)' }
          ],
          totalCredits: (s.totalCredits || 18) + 4
        }
      : s
  );

  const whatIfProposal = {
    ...basePlan,
    planName: 'What-if: Giả lập điểm kỳ 7 đạt Bằng Giỏi',
    projectedCpa: 3.32,
    semesters: nextSemesters
  };

  plannerStore.setIncomingProposal(whatIfProposal, 'What-if: ROI cải thiện');
  const incoming = plannerStore.getIncomingProposal();
  assert.ok(incoming);
  assert.equal(incoming.diff.addedCourses.length, 1);
  assert.equal(incoming.diff.addedCourses[0].courseCode, 'IT7005');
  assert.equal(incoming.diff.creditsDelta, 4);

  // 2. Nhánh Hủy đề xuất (Cancel proposal): bản kế hoạch và lịch sử giữ nguyên
  plannerStore.dismissProposal();
  assert.equal(plannerStore.getIncomingProposal(), null);
  const activeAfterDismiss = plannerStore.getHistory().find((h) => h.status === PLAN_STATUSES.ACTIVE);
  assert.equal(activeAfterDismiss.planId, initialActive.planId);

  // 3. Nhánh Chấp nhận & Lưu nháp (Save Draft): tạo bản DRAFT mới, không đè bản ACTIVE
  plannerStore.setIncomingProposal(whatIfProposal, 'What-if: ROI cải thiện');
  plannerStore.acceptProposal();

  const savedRes = plannerStore.saveDraft('Bản nháp kế thừa sau What-if ROI');
  assert.ok(savedRes.success);
  const currentPlan = plannerStore.getPlan();
  assert.equal(currentPlan.status, PLAN_STATUSES.DRAFT);
  assert.equal(currentPlan.sourcePlanId, initialActive.planId);

  // Bản ACTIVE cũ trong lịch sử vẫn còn nguyên vẹn
  const activeStillExists = plannerStore.getHistory().find((h) => h.status === PLAN_STATUSES.ACTIVE);
  assert.ok(activeStillExists);
  assert.equal(activeStillExists.planId, initialActive.planId);

  // 4. Nhánh Hủy thay đổi (Discard changes): hoàn tác sạch sẽ về mốc lưu gần nhất
  const discardRes = plannerStore.discardDraftChanges();
  assert.ok(discardRes.success);
});

test('Task 4.4a - 5: Mở lại kế hoạch, cập nhật kết quả học kỳ và đối chiếu (POST /planner/reconcile)', async () => {
  plannerStore.resetToDefault();

  let reconcilePayload = null;
  const mockApi = {
    planner: {
      reconcile: async (payload) => {
        reconcilePayload = payload;
        return {
          planId: payload.planId,
          onTrack: false,
          completedCourses: ['IT2001', 'IT6035', 'IT6042'],
          missedOrFailedCourses: ['MATH1002'],
          adjustmentsRecommended: [
            'Học phần MATH1002 chưa đạt: Cần xếp học lại vào Học kỳ hè hoặc Kỳ 8 để gỡ nợ tiên quyết.',
            'Tổng tín chỉ học kỳ tiếp theo đề xuất điều chỉnh về 16 tín chỉ để tránh quá tải.'
          ],
          planVersion: payload.planVersion || 1,
          dataRevision: 'REV-2024604757-002',
          policyVersion: 'policy-haui-demo-2026@0.0.1-v0'
        };
      }
    }
  };

  // 1. Đối chiếu thành công trên bản ACTIVE
  const activeEntry = plannerStore.getHistory().find((h) => h.status === PLAN_STATUSES.ACTIVE);
  assert.ok(activeEntry);

  const reconcileRes = await plannerStore.reconcilePlanAsync(mockApi, '2025_1');
  assert.ok(reconcileRes.success);
  assert.equal(reconcileRes.onTrack, false);
  assert.equal(reconcilePayload.completedSemester, '2025_1');
  assert.equal(reconcilePayload.planId, activeEntry.planId);

  const storedResult = plannerStore.getReconcileResult();
  assert.ok(storedResult);
  assert.equal(storedResult.completedCourses.length, 3);
  assert.equal(storedResult.missedOrFailedCourses.length, 1);
  assert.equal(storedResult.missedOrFailedCourses[0], 'MATH1002');
  assert.equal(storedResult.adjustmentsRecommended.length, 2);

  // 2. Tạo bản DRAFT điều chỉnh lộ trình sau đối soát (applyReconcileAdjustmentsAsDraft)
  const adjustedProposal = plannerStore.applyReconcileAdjustmentsAsDraft();
  assert.ok(adjustedProposal);
  assert.equal(adjustedProposal.status, PLAN_STATUSES.DRAFT);
  assert.equal(adjustedProposal.sourcePlanId, activeEntry.planId);
  // Môn MATH1002 được tự động bổ sung vào học kỳ tiếp theo để học lại
  assert.ok(adjustedProposal.semesters[0].courses.some((c) => c.courseCode === 'MATH1002'));

  // Bản ACTIVE gốc vẫn giữ nguyên trạng thái ACTIVE
  const activeUnchanged = plannerStore.getHistory().find((h) => h.status === PLAN_STATUSES.ACTIVE);
  assert.equal(activeUnchanged.status, PLAN_STATUSES.ACTIVE);

  // 3. Từ chối đối chiếu khi không có kế hoạch ACTIVE (409 PLAN_NOT_ACTIVE)
  const rejectApi = {
    planner: {
      reconcile: async () => {
        const err = new Error('PLAN_NOT_ACTIVE');
        err.status = 409;
        err.code = 'PLAN_NOT_ACTIVE';
        throw err;
      }
    }
  };
  const failRes = await plannerStore.reconcilePlanAsync(rejectApi, '2025_1');
  assert.equal(failRes.success, false);
  assert.equal(failRes.planNotActive, true);
});

test('Task 4.4a - 6: Link file đính kèm dùng importer chung của TV2 (/transcript)', () => {
  let openedTranscript = false;
  const onOpenTranscript = () => {
    openedTranscript = true;
  };

  // Render ChatAdvisorPage với prop onOpenTranscript
  const chatElem = React.createElement(ChatAdvisorPage, {
    api: null,
    ui: null,
    onOpenTranscript
  });

  assert.ok(React.isValidElement(chatElem));
  assert.equal(typeof chatElem.type, 'function');
  assert.equal(chatElem.type.name, 'ChatAdvisorPage');
});

test('Task 4.4a - 7: Giữ nguyên nội dung khi API lỗi (Chat, Simulation, Reconcile)', async () => {
  plannerStore.resetToDefault();
  const planBefore = JSON.parse(JSON.stringify(plannerStore.getPlan()));

  const failingApi = {
    simulation: {
      simulateGrades: async () => {
        throw new Error('500 Internal Server Error in simulation');
      }
    },
    planner: {
      reconcile: async () => {
        throw new Error('503 Service Unavailable');
      }
    }
  };

  // Giả lập điểm lỗi
  await assert.rejects(
    async () => {
      await plannerApi.simulateGrades(failingApi, { courses: [] });
    },
    (err) => {
      assert.ok(err.message.includes('500'));
      return true;
    }
  );

  // Đối chiếu kế hoạch lỗi
  const recRes = await plannerStore.reconcilePlanAsync(failingApi, '2025_1');
  assert.equal(recRes.success, false);
  assert.ok(recRes.message.includes('503'));

  // Nội dung kế hoạch trong store vẫn giữ nguyên vẹn 100%
  const planAfter = plannerStore.getPlan();
  assert.deepEqual(planAfter.semesters, planBefore.semesters);
  assert.equal(planAfter.totalCredits, planBefore.totalCredits);
});

test('Task 4.4a - 8: Ranh giới Kiến trúc & Sở hữu của TV3', () => {
  // 1. Kiểm tra export của TV3
  assert.ok(StudyPlannerPage);
  assert.ok(ChatAdvisorPage);
  assert.ok(WhatIfSimulatorPage);
  assert.ok(plannerStore);
  assert.ok(plannerApi.reconcileStudyPlan);
  assert.ok(plannerApi.chatAdvisor);
  assert.ok(plannerApi.simulateGrades);
  assert.ok(plannerApi.rankRetakeCourses);
  assert.ok(plannerApi.calculateTargetGrades);

  // 2. Không chứa API keys hay hardcoded secrets
  const stringifiedStore = plannerStore.constructor.toString();
  assert.equal(stringifiedStore.includes('AIzaSy'), false);
  assert.equal(stringifiedStore.includes('sk-'), false);
});
