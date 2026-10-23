import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { plannerStore, PLAN_STATUSES } from '../services/plannerStore.js';
import { PlanHistoryModal } from '../components/PlanHistoryModal.js';
import { CurriculumTreeModal } from '../components/CurriculumTreeModal.js';

/**
 * Màn hình 5: Tùy chỉnh & Xác nhận Kế hoạch học tập (Study Planner) — TV3
 *
 * Đáp ứng đầy đủ các yêu cầu nghiệp vụ:
 * 1. Kế hoạch nhiều kỳ: Kỳ 7, Kỳ 8, Kỳ hè kèm KPI tổng quan và kiểm tra quy chế HaUI 10-24 TC (BR-03/BR-04).
 * 2. Hội tụ đề xuất từ AI / What-if / Audit: Hiển thị banner đề xuất kèm nhánh Chấp nhận / Hủy.
 * 3. Đầy đủ các nhánh hành động: Lưu nháp, Kiểm tra điều kiện, Bắt đầu theo dõi (Kích hoạt), Mở lại (Lịch sử), Hủy thay đổi.
 * 4. Xem tree là tùy chọn: Nút mở Modal tra cứu cây môn học & sơ đồ tiên quyết trực tiếp.
 * 5. Đủ 3 trạng thái kiểm thử: Loading, Error, Empty.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2
 */
export function StudyPlannerPage({ api, ui } = {}) {
  const {
    Button,
    Card,
    Table,
    Modal,
    Loading,
    Error: ErrorBox,
    EmptyState
  } = ui || {};

  // State kế hoạch từ plannerStore
  const [storeState, setStoreState] = useState(() => plannerStore.getState());
  // `validationResult` do store quản lý: tự xóa khi kế hoạch bị chỉnh sửa, tránh hiển thị kết quả thẩm định cũ
  const { plan, incomingProposal, validation: validationResult, reconcileResult } = storeState;
  const isValidated = plan?.status === PLAN_STATUSES.VALIDATED;
  const activeEntry = storeState.history?.find((h) => h.status === PLAN_STATUSES.ACTIVE) || null;

  // Trạng thái giao diện
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  // Modals state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [selectedSemesterForAdd, setSelectedSemesterForAdd] = useState('2026_1');

  // Đối chiếu kết quả học kỳ (Reconcile)
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileSemester, setReconcileSemester] = useState('2025_1');
  const [reconciling, setReconciling] = useState(false);

  // Chuyển môn giữa các học kỳ
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveCourseTarget, setMoveCourseTarget] = useState(null); // { fromSemesterCode, course }
  const [selectedTargetSemester, setSelectedTargetSemester] = useState('');

  // Thẩm định quy chế & Lưu nháp
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Đăng ký lắng nghe thay đổi từ plannerStore
  useEffect(() => {
    const unsubscribe = plannerStore.subscribe((newState) => {
      setStoreState(newState);
    });
    return unsubscribe;
  }, []);

  // Tự động tải danh sách kế hoạch từ máy chủ khi mount (Mở lại sau reload)
  useEffect(() => {
    let planIdFromUrl = null;
    if (typeof window !== 'undefined' && window.location?.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        planIdFromUrl = params.get('plan_id') || params.get('planId');
      } catch {
        // Bỏ qua lỗi parsing URL trên môi trường test Node.js
      }
    }
    if (api && typeof plannerStore.fetchPlansAsync === 'function') {
      plannerStore.fetchPlansAsync(api, planIdFromUrl).catch((err) => {
        // Bỏ qua lỗi kết nối ban đầu, giữ nguyên fixture/fallback
      });
    }
  }, [api]);

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
  }, []);

  // Lắng nghe sự kiện cập nhật bảng điểm từ luồng /transcript (Đồng bộ toàn hệ thống)
  useEffect(() => {
    const handleTranscriptUpdated = (e) => {
      showToast('Bảng điểm đã được cập nhật! Các điều kiện tiên quyết và tín chỉ đã được đồng bộ.');
      if (e?.detail?.snapshot?.metrics) {
        const m = e.detail.snapshot.metrics;
        if (m.accumulatedCredits !== undefined && m.accumulatedCredits !== null) {
          plannerStore.plan.totalEarnedCredits = m.accumulatedCredits;
          plannerStore.plan.remainingCredits = Math.max(
            0,
            (plannerStore.plan.totalRequiredCredits || 145) - m.accumulatedCredits
          );
        }
        if (m.cpa !== undefined && m.cpa !== null) {
          plannerStore.plan.currentCpa = m.cpa;
        }
        plannerStore.notify();
      }
      if (api && typeof plannerStore.fetchPlansAsync === 'function') {
        plannerStore.fetchPlansAsync(api).catch(() => {});
      }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
      return () => window.removeEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
    }
  }, [api, showToast]);

  // Tổng số tín chỉ còn lại trong toàn bộ kế hoạch
  const totalPlannedCredits = useMemo(() => {
    if (!plan || !plan.semesters) return 0;
    return plan.semesters.reduce((sum, sem) => sum + (Number(sem.totalCredits) || 0), 0);
  }, [plan]);

  // Hành động: Tạo phương án trực tiếp không cần Chat (POST /planner/generate)
  const handleGeneratePlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (api && typeof plannerStore.generatePlanAsync === 'function') {
        const res = await plannerStore.generatePlanAsync(api, {
          targetGraduationSemester: '2026_1',
          includeSummerSemesters: true
        });
        if (res.success) {
          showToast(res.message || 'Đã sinh phương án học tập đề xuất (DRAFT)!');
        } else {
          showToast(`⚠️ ${res.message}`);
        }
      } else {
        plannerStore.resetToDefault();
        showToast('Đã tải lại kế hoạch học tập tối ưu!');
      }
    } catch (err) {
      setError(err);
      showToast(`⚠️ Lỗi sinh phương án: ${err?.message || 'Sự cố kết nối'}`);
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  const handleFetchPlan = handleGeneratePlan;

  // Hành động: Kiểm tra điều kiện (Thẩm định quy chế): DRAFT → VALIDATED
  // Sử dụng API thật POST /planner/validate; xử lý 503 TOOL_NOT_READY an toàn
  const handleValidatePlan = useCallback(async () => {
    setValidating(true);
    try {
      if (api && typeof plannerStore.validatePlanAsync === 'function') {
        const res = await plannerStore.validatePlanAsync(api);
        if (res.toolNotReady) {
          showToast('⚠️ Công cụ thẩm định quy chế học vụ chưa sẵn sàng (503 TOOL_NOT_READY).');
        } else if (res.valid) {
          showToast(res.message || 'Kế hoạch hợp lệ theo quy chế HaUI — đã chuyển sang VALIDATED, có thể kích hoạt.');
        } else {
          showToast(res.message || `Phát hiện ${res.violations?.length || 0} vi phạm quy chế — kế hoạch vẫn ở DRAFT.`);
        }
      } else {
        const res = plannerStore.validatePlan();
        showToast(
          res.valid
            ? 'Kế hoạch hợp lệ theo quy chế HaUI — đã chuyển sang VALIDATED, có thể kích hoạt.'
            : `Phát hiện ${res.violations.length} vi phạm quy chế — kế hoạch vẫn ở DRAFT.`
        );
      }
    } catch (err) {
      showToast(`⚠️ Lỗi khi kiểm tra điều kiện: ${err?.message || 'Sự cố kết nối'}`);
    } finally {
      setValidating(false);
    }
  }, [api, showToast]);

  // Hành động: Mở modal chuyển môn
  const handleOpenMoveModal = useCallback(
    (fromSemesterCode, course) => {
      const otherSemesters = (plan?.semesters || []).filter((s) => s.semesterCode !== fromSemesterCode);
      setMoveCourseTarget({ fromSemesterCode, course });
      setSelectedTargetSemester(otherSemesters[0]?.semesterCode || '');
      setIsMoveModalOpen(true);
    },
    [plan]
  );

  // Hành động: Xác nhận chuyển môn sang học kỳ đích
  const handleConfirmMove = useCallback(() => {
    if (!moveCourseTarget || !selectedTargetSemester) return;
    const res = plannerStore.moveCourse(
      moveCourseTarget.fromSemesterCode,
      selectedTargetSemester,
      moveCourseTarget.course.courseCode
    );
    setIsMoveModalOpen(false);
    showToast(res.message);
  }, [moveCourseTarget, selectedTargetSemester, showToast]);

  // Hành động: Đối chiếu kết quả học kỳ đã hoàn thành với kế hoạch ACTIVE (POST /planner/reconcile)
  const handleReconcilePlan = useCallback(async () => {
    setReconciling(true);
    try {
      if (api && typeof plannerStore.reconcilePlanAsync === 'function') {
        const res = await plannerStore.reconcilePlanAsync(api, reconcileSemester);
        if (res.planNotActive) {
          showToast('⚠️ Chỉ có thể đối soát trên kế hoạch đang theo dõi (ACTIVE).');
        } else if (res.success) {
          showToast(res.message);
        } else {
          showToast(`⚠️ ${res.message}`);
        }
      } else {
        showToast('⚠️ API đối soát kế hoạch chưa sẵn sàng.');
      }
    } catch (err) {
      showToast(`⚠️ Lỗi đối chiếu học kỳ: ${err?.message || 'Sự cố kết nối'}`);
    } finally {
      setReconciling(false);
    }
  }, [api, reconcileSemester, showToast]);

  // Hành động: Tạo bản nháp điều chỉnh từ kết quả đối soát
  const handleApplyReconcileAdjustments = useCallback(() => {
    const draft = plannerStore.applyReconcileAdjustmentsAsDraft();
    if (draft) {
      setIsReconcileModalOpen(false);
      showToast('✓ Đã tạo bản nháp điều chỉnh lộ trình! Bạn có thể xem lại và bấm "Lưu bản nháp".');
    } else {
      showToast('Không có kiến nghị điều chỉnh để áp dụng.');
    }
  }, [showToast]);

  // Hành động: Lưu bản nháp (Save Draft)
  // DRAFT lưu được khi đúng định dạng; Sửa bản ACTIVE tạo DRAFT kế thừa; Lưu lỗi KHÔNG làm mất nội dung
  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      let storeRes;
      if (api && typeof plannerStore.saveDraftAsync === 'function') {
        storeRes = await plannerStore.saveDraftAsync(api);
      } else {
        storeRes = plannerStore.saveDraft();
      }

      if (storeRes.success) {
        showToast(storeRes.message || 'Đã lưu thành công bản nháp vào hệ thống!');
      } else {
        showToast(`⚠️ ${storeRes.message}`);
      }
    } catch (err) {
      // Lưu lỗi không mất nội dung: thông báo lỗi nhưng giữ nguyên kế hoạch trong store
      showToast(`⚠️ Lỗi khi lưu máy chủ: ${err?.message || 'Sự cố kết nối'}. Nội dung nháp vẫn được giữ nguyên.`);
    } finally {
      setSaving(false);
    }
  }, [api, showToast]);

  // Hành động: Kích hoạt kế hoạch (Bắt đầu theo dõi)
  // Chỉ kích hoạt khi đã VALIDATED; bản ACTIVE cũ chuyển ARCHIVED
  const handleConfirmActivate = useCallback(async () => {
    setIsActivateModalOpen(false);
    try {
      let res;
      if (api && typeof plannerStore.activatePlanAsync === 'function') {
        res = await plannerStore.activatePlanAsync(api);
      } else {
        res = plannerStore.activatePlan();
      }
      showToast(res.success ? res.message : `⚠️ ${res.message}`);
    } catch (err) {
      showToast(`⚠️ Lỗi khi kích hoạt: ${err?.message || 'Sự cố kết nối'}`);
    }
  }, [api, showToast]);

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

  // Hành động: Thêm môn học
  const handleAddCourse = useCallback((course) => {
    const success = plannerStore.addCourseToSemester(selectedSemesterForAdd, course);
    setIsAddCourseModalOpen(false);
    if (success) {
      showToast(`Đã thêm môn ${course.courseCode} vào học kỳ.`);
    } else {
      showToast(`Môn ${course.courseCode} đã có trong học kỳ này!`);
    }
  }, [selectedSemesterForAdd, showToast]);

  // Hành động: Hủy thay đổi — F23-004: chỉ hoàn tác về mốc đã lưu/kích hoạt gần nhất, giữ nguyên lịch sử
  const handleDiscardChanges = useCallback(() => {
    const res = plannerStore.discardDraftChanges();
    showToast(res.message);
  }, [showToast]);

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

  // Danh mục môn mẫu có thể thêm
  const availableCoursesPool = [
    { courseCode: 'IT6001', courseName: 'Cấu trúc dữ liệu & Giải thuật', credits: 4, courseType: 'Chuẩn CTĐT' },
    { courseCode: 'IT6005', courseName: 'Phân tích & Thiết kế thuật toán', credits: 3, courseType: 'Chuyên ngành' },
    { courseCode: 'IT7001', courseName: 'Trí tuệ nhân tạo căn bản', credits: 3, courseType: 'Tự chọn chuyên ngành' },
    { courseCode: 'IT7010', courseName: 'An toàn thông tin ứng dụng', credits: 3, courseType: 'Tự chọn chuyên ngành' },
    { courseCode: 'ENG3001', courseName: 'Tiếng Anh chuyên ngành nâng cao', credits: 2, courseType: 'Bắt buộc chung' }
  ];

  // ==========================================
  // 1. HEADER SECTION
  // ==========================================
  const headerSection = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '20px'
      }
    },
    // Breadcrumb
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--color-mid-gray, #737373)'
        }
      },
      React.createElement(
        'span',
        {
          style: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }
        },
        React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '15px' } }, 'home'),
        'Trang chủ'
      ),
      React.createElement('span', { style: { color: 'var(--color-hairline, #e5e5e5)' } }, '/'),
      React.createElement('span', { style: { color: 'var(--color-ink, #0a0a0a)', fontWeight: 500 } }, 'Kế hoạch học tập cá nhân')
    ),
    // Title & Actions Bar
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }
      },
      React.createElement(
        'div',
        { style: { maxWidth: '780px' } },
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          React.createElement(
            'h1',
            {
              style: {
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink, #0a0a0a)',
                margin: 0
              }
            },
            'Kế hoạch học tập cá nhân'
          ),
          React.createElement(
            'span',
            {
              style: {
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '9999px',
                background: plan?.status === PLAN_STATUSES.ACTIVE ? 'var(--color-ink, #0a0a0a)' : plan?.status === PLAN_STATUSES.VALIDATED ? '#dcfce7' : 'var(--color-surface-alt, #fafafa)',
                color: plan?.status === PLAN_STATUSES.ACTIVE ? '#ffffff' : plan?.status === PLAN_STATUSES.VALIDATED ? '#15803d' : 'var(--color-mid-gray, #737373)',
                border: '1px solid var(--color-hairline, #e5e5e5)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
              }
            },
            plan?.status === PLAN_STATUSES.ACTIVE
              ? `● Kế hoạch đang theo dõi (ACTIVE)`
              : `Bản nháp ${plan?.version || 'v2.4'} (Chưa kích hoạt)`
          ),
          plan?.sourcePlanId
            ? React.createElement(
                'span',
                {
                  style: {
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a'
                  }
                },
                `Kế thừa từ ${plan.sourcePlanId}`
              )
            : null,
          plan?.policyVersion
            ? React.createElement(
                'span',
                {
                  style: {
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0'
                  }
                },
                `Quy chế: ${plan.policyVersion}`
              )
            : null,
          React.createElement(
            'span',
            {
              style: {
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '9999px',
                background: 'var(--color-canvas, #f5f5f5)',
                color: 'var(--color-ink-soft, #171717)',
                border: '1px solid var(--color-hairline, #e5e5e5)'
              }
            },
            plan.majorName || 'Hệ đào tạo chính quy · HaUI'
          )
        ),
        React.createElement(
          'p',
          {
            style: {
              color: 'var(--color-mid-gray, #737373)',
              marginTop: '6px',
              fontSize: '13px',
              lineHeight: 1.5,
              margin: '6px 0 0'
            }
          },
          'Xây dựng lộ trình đăng ký môn học cho các học kỳ tiếp theo. Hệ thống kiểm tra số tín chỉ tối đa/tối thiểu (10–24 TC) và điều kiện tiên quyết theo quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội (HaUI).'
        )
      ),
      // Nút chức năng ở góc phải
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
        Button
          ? React.createElement(
              Button,
              { variant: 'secondary', size: 'sm', onClick: handleGeneratePlan },
              '⚡ Tạo phương án đề xuất'
            )
          : null,
        Button
          ? React.createElement(
              Button,
              { variant: 'ghost', size: 'sm', onClick: () => setIsTreeModalOpen(true) },
              '🌳 Xem Cây môn học (Tùy chọn)'
            )
          : null,
        Button
          ? React.createElement(
              Button,
              { variant: 'secondary', size: 'sm', onClick: () => setIsHistoryModalOpen(true) },
              '📜 Lịch sử & Mở lại'
            )
          : null,
        Button
          ? React.createElement(
              Button,
              {
                variant: 'secondary',
                size: 'sm',
                onClick: () => setIsReconcileModalOpen(true)
              },
              '🔍 Đối chiếu học kỳ'
            )
          : null,
        Button
          ? React.createElement(
              Button,
              { variant: 'ghost', size: 'sm', onClick: handleDiscardChanges },
              '↩️ Hủy thay đổi'
            )
          : null,
        Button
          ? React.createElement(
              Button,
              { variant: 'secondary', size: 'sm', loading: saving, onClick: handleSaveDraft },
              '💾 Lưu bản nháp'
            )
          : null,
        Button
          ? React.createElement(
              Button,
              {
                variant: 'secondary',
                size: 'sm',
                loading: validating,
                onClick: handleValidatePlan
              },
              '✓ Kiểm tra điều kiện'
            )
          : null,
        Button
          ? React.createElement(
              Button,
              {
                variant: 'primary',
                size: 'sm',
                disabled: !isValidated,
                title: isValidated ? undefined : 'Cần "Kiểm tra điều kiện" và đạt trạng thái VALIDATED trước khi kích hoạt',
                onClick: () => isValidated && setIsActivateModalOpen(true)
              },
              '▶ Bắt đầu theo dõi (Kích hoạt)'
            )
          : null
      )
    )
  );

  // Thanh Toast thông báo
  const toastBar = toastMessage
    ? React.createElement(
        'div',
        {
          style: {
            padding: '10px 16px',
            marginBottom: '16px',
            borderRadius: '12px',
            background: '#0a0a0a',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        },
        React.createElement('span', null, `💡 ${toastMessage}`),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => setToastMessage(''),
            style: { background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '16px' }
          },
          '×'
        )
      )
    : null;

  // Banner nhận đề xuất từ AI Chat hoặc What-if (Review Diff -> Save/Cancel)
  const proposalBanner = incomingProposal
    ? React.createElement(
        'div',
        {
          style: {
            padding: '16px 20px',
            marginBottom: '20px',
            borderRadius: '16px',
            background: '#eff6ff',
            border: '1.5px solid #3b82f6',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '8px'
            }
          },
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              {
                style: {
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }
              },
              `✨ Đề xuất lộ trình mới từ: ${incomingProposal.sourceName || 'AI Advisor'}`,
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af'
                  }
                },
                incomingProposal.receivedAt || 'Vừa xong'
              )
            ),
            React.createElement(
              'div',
              { style: { fontSize: '13px', color: '#1e40af', marginTop: '4px' } },
              incomingProposal.summary ||
                `CPA dự kiến: ${incomingProposal.projectedCpa ? `${incomingProposal.projectedCpa} (Dự kiến)` : '3.25 (Dự kiến)'} · Phân bổ: ${incomingProposal.semesters?.length || 2} học kỳ.`
            )
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '8px' } },
            Button
              ? React.createElement(
                  Button,
                  { variant: 'primary', size: 'sm', onClick: handleAcceptProposal },
                  'Chấp nhận phương án'
                )
              : null,
            Button
              ? React.createElement(
                  Button,
                  { variant: 'ghost', size: 'sm', onClick: handleDismissProposal },
                  'Hủy'
                )
              : null
          )
        ),
        // Khối Diff So sánh (Review Diff)
        incomingProposal.diff
          ? React.createElement(
              'div',
              {
                style: {
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  fontSize: '12px'
                }
              },
              React.createElement(
                'div',
                null,
                React.createElement('span', { style: { color: '#64748b' } }, 'Thay đổi tín chỉ: '),
                React.createElement(
                  'strong',
                  { style: { color: incomingProposal.diff.creditsDelta > 0 ? '#15803d' : '#0f172a' } },
                  incomingProposal.diff.creditsDelta > 0
                    ? `+${incomingProposal.diff.creditsDelta} TC`
                    : `${incomingProposal.diff.creditsDelta || 0} TC`
                ),
                ` (${incomingProposal.diff.currentCredits} → ${incomingProposal.diff.proposedCredits} TC)`
              ),
              incomingProposal.diff.cpaDelta !== null && incomingProposal.diff.cpaDelta !== undefined
                ? React.createElement(
                    'div',
                    null,
                    React.createElement('span', { style: { color: '#64748b' } }, 'Biến thiên CPA: '),
                    React.createElement(
                      'strong',
                      { style: { color: incomingProposal.diff.cpaDelta >= 0 ? '#15803d' : '#b91c1c' } },
                      incomingProposal.diff.cpaDelta >= 0 ? `+${incomingProposal.diff.cpaDelta}` : `${incomingProposal.diff.cpaDelta}`
                    ),
                    ` (${incomingProposal.diff.currentCpa || '3.18'} → ${incomingProposal.diff.proposedCpa})`
                  )
                : null,
              incomingProposal.diff.addedCourses?.length > 0
                ? React.createElement(
                    'div',
                    null,
                    React.createElement('span', { style: { color: '#64748b' } }, 'Môn bổ sung: '),
                    React.createElement(
                      'strong',
                      { style: { color: '#1d4ed8' } },
                      incomingProposal.diff.addedCourses.map((c) => c.courseCode).join(', ')
                    )
                  )
                : null
            )
          : null
      )
    : null;

  // Thanh công cụ kiểm thử (Test switchers)
  const testToolbar = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        padding: '8px 12px',
        marginBottom: '16px',
        borderRadius: '8px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        fontSize: '12px'
      }
    },
    React.createElement('span', { style: { fontWeight: 600, color: '#64748b' } }, 'Kiểm thử trạng thái:'),
    Button ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: handleClearPlan }, 'Trạng thái Rỗng') : null,
    Button ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: handleTriggerError }, 'Mô phỏng Lỗi') : null,
    Button ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: handleDiscardChanges }, 'Hủy thay đổi') : null,
    Button ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: handleFetchPlan }, 'Tải lại kế hoạch') : null
  );

  // ==========================================
  // TRẠNG THÁI LOADING / ERROR / EMPTY
  // ==========================================
  if (loading) {
    return React.createElement(
      'div',
      { className: 'haui-page-container' },
      headerSection,
      Loading
        ? React.createElement(Loading, { variant: 'spinner', size: 'lg', label: 'Đang tải kế hoạch học tập đa kỳ...' })
        : React.createElement('div', null, 'Đang tải...')
    );
  }

  if (error) {
    return React.createElement(
      'div',
      { className: 'haui-page-container' },
      headerSection,
      ErrorBox
        ? React.createElement(ErrorBox, {
            title: 'Không thể truy xuất Kế hoạch học tập',
            error,
            message: error?.message,
            onRetry: handleFetchPlan
          })
        : React.createElement('div', { style: { color: 'red' } }, error?.message)
    );
  }

  const sessionStudent = api?.getConfig?.()?.sessionStudent;
  const isStudentEmpty = Boolean(
    sessionStudent &&
    (sessionStudent.hasTranscript === false || sessionStudent.id === 'empty' || sessionStudent.studentId === 'std-2026-empty')
  );

  if (isStudentEmpty || !plan || !plan.semesters || plan.semesters.length === 0) {
    return React.createElement(
      'div',
      { className: 'haui-page-container' },
      headerSection,
      testToolbar,
      EmptyState
        ? React.createElement(EmptyState, {
            title: isStudentEmpty ? 'Chưa có dữ liệu bảng điểm & Kế hoạch' : 'Chưa có kế hoạch học tập nào',
            description: isStudentEmpty
              ? 'Hồ sơ của bạn chưa có dữ liệu bảng điểm. Vui lòng nạp bảng điểm từ sv.haui.edu.vn hoặc bấm nút bên dưới để tạo phương án học tập đề xuất.'
              : 'Bạn chưa tạo lộ trình học tập hoặc chưa có môn học trong kế hoạch. Nhấn nút bên dưới để tạo phương án học tập đề xuất.',
            actionLabel: '⚡ Tạo phương án đề xuất',
            onAction: handleGeneratePlan
          })
        : React.createElement('div', null, 'Chưa có kế hoạch nào.')
    );
  }

  // ==========================================
  // 2. STATS OVERVIEW CARDS (KPIs)
  // ==========================================
  const kpiSection = React.createElement(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }
    },
    // Thẻ 1: Tiến độ tích lũy
    React.createElement(
      'div',
      {
        className: 'haui-stat-card',
        style: {
          padding: '20px',
          borderRadius: 'var(--radius-cards, 24px)',
          backgroundColor: 'var(--color-paper, #ffffff)',
          border: '1px solid var(--color-hairline, #e5e5e5)',
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        React.createElement('span', { style: { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray, #737373)', letterSpacing: '0.04em' } }, 'TỔNG TC CẦN TÍCH LŨY'),
        React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px', color: 'var(--color-mid-gray, #737373)' } }, 'assignment_turned_in')
      ),
      React.createElement(
        'div',
        { style: { margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '6px' } },
        React.createElement('span', { style: { fontSize: '30px', fontWeight: 700, color: 'var(--color-ink, #0a0a0a)', lineHeight: 1 } }, totalPlannedCredits),
        React.createElement('span', { style: { fontSize: '14px', color: 'var(--color-mid-gray, #737373)' } }, `/ ${plan.remainingCredits || 37} Tín chỉ`)
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        React.createElement(
          'div',
          { className: 'haui-progress-bar-minimal' },
          React.createElement('div', { className: 'haui-progress-bar-minimal__fill', style: { width: '74.5%', backgroundColor: 'var(--color-ink, #0a0a0a)' } })
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } },
          React.createElement('span', null, `Đã hoàn thành ${plan.totalEarnedCredits || 108} TC`),
          React.createElement('span', { style: { color: 'var(--color-ink, #0a0a0a)', fontWeight: 600 } }, '74.5%')
        )
      )
    ),

    // Thẻ 2: Phân bổ lộ trình
    React.createElement(
      'div',
      {
        className: 'haui-stat-card',
        style: {
          padding: '20px',
          borderRadius: 'var(--radius-cards, 24px)',
          backgroundColor: 'var(--color-paper, #ffffff)',
          border: '1px solid var(--color-hairline, #e5e5e5)',
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        React.createElement('span', { style: { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray, #737373)', letterSpacing: '0.04em' } }, 'PHÂN BỔ LỘ TRÌNH'),
        React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px', color: 'var(--color-mid-gray, #737373)' } }, 'calendar_view_week')
      ),
      React.createElement(
        'div',
        { style: { margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '6px' } },
        React.createElement('span', { style: { fontSize: '30px', fontWeight: 700, color: 'var(--color-ink, #0a0a0a)', lineHeight: 1 } }, plan.semesters.length),
        React.createElement('span', { style: { fontSize: '14px', color: 'var(--color-mid-gray, #737373)' } }, 'học kỳ chính + 1 kỳ hè')
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-ink, #0a0a0a)', fontWeight: 500 } },
        React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink, #0a0a0a)' } }),
        React.createElement('span', null, 'Đúng tiến độ chuẩn 4 năm')
      )
    ),

    // Thẻ 3: CPA dự kiến
    React.createElement(
      'div',
      {
        className: 'haui-stat-card',
        style: {
          padding: '20px',
          borderRadius: 'var(--radius-cards, 24px)',
          backgroundColor: 'var(--color-paper, #ffffff)',
          border: '1px solid var(--color-hairline, #e5e5e5)',
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        React.createElement('span', { style: { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray, #737373)', letterSpacing: '0.04em' } }, 'MÔ PHỎNG GPA TỐT NGHIỆP'),
        React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px', color: 'var(--color-mid-gray, #737373)' } }, 'trending_up')
      ),
      React.createElement(
        'div',
        { style: { margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '6px' } },
        React.createElement('span', { style: { fontSize: '30px', fontWeight: 700, color: 'var(--color-ink, #0a0a0a)', lineHeight: 1 } }, plan.projectedCpa || '3.32'),
        React.createElement('span', { style: { fontSize: '14px', color: 'var(--color-mid-gray, #737373)' } }, '/ 4.00 (Hệ 4)')
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement(
          'span',
          {
            style: {
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-canvas, #f5f5f5)',
              color: 'var(--color-ink, #0a0a0a)',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid var(--color-hairline, #e5e5e5)'
            }
          },
          plan.projectedRank || 'Bằng Giỏi (CPA ≥ 3.20)'
        ),
        React.createElement(
          'span',
          {
            style: {
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: '#e0f2fe',
              color: '#0369a1'
            }
          },
          'Dự kiến'
        )
      )
    ),

    // Thẻ 4: Kiểm tra quy chế HaUI
    React.createElement(
      'div',
      {
        className: 'haui-stat-card',
        style: {
          padding: '20px',
          borderRadius: 'var(--radius-cards, 24px)',
          backgroundColor: 'var(--color-paper, #ffffff)',
          border: '1px solid var(--color-hairline, #e5e5e5)',
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        React.createElement('span', { style: { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray, #737373)', letterSpacing: '0.04em' } }, 'KIỂM TRA QUY CHẾ HAUI'),
        React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px', color: validationResult?.valid === false ? 'var(--color-ember, #e7000b)' : 'var(--color-mid-gray, #737373)' } }, 'notification_important')
      ),
      React.createElement(
        'div',
        { style: { margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '6px' } },
        React.createElement(
          'span',
          { style: { fontSize: '22px', fontWeight: 700, color: 'var(--color-ink, #0a0a0a)', lineHeight: 1 } },
          validationResult
            ? validationResult.valid
              ? '✓ 100% Hợp lệ'
              : '⚠️ Có cảnh báo'
            : 'Sẵn sàng kiểm tra'
        )
      ),
      React.createElement(
        'div',
        { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } },
        'Thỏa mãn quy định 10-24 TC (BR-03/04)'
      )
    )
  );

  // ==========================================
  // 3. VALIDATION RESULT BOX
  // ==========================================
  const validationBox = validationResult
    ? Card
      ? React.createElement(
          Card,
          {
            title: validationResult.valid ? '✓ Kế hoạch hợp lệ 100% theo quy chế HaUI' : '⚠️ Cảnh báo quy chế cần lưu ý',
            variant: validationResult.valid ? 'status-success' : 'status-warning',
            style: { marginBottom: '20px' }
          },
          validationResult.violations?.length > 0
            ? React.createElement(
                'ul',
                { style: { color: '#dc2626', margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '13px' } },
                validationResult.violations.map((v, i) => React.createElement('li', { key: i }, v))
              )
            : null,
          validationResult.warnings?.length > 0
            ? React.createElement(
                'ul',
                { style: { color: '#b45309', margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '13px' } },
                validationResult.warnings.map((w, i) => React.createElement('li', { key: i }, w))
              )
            : null
        )
      : null
    : null;

  // ==========================================
  // 4. DANH SÁCH CÁC HỌC KỲ TRONG KẾ HOẠCH
  // ==========================================
  const semestersList = plan.semesters.map((semester) => {
    const isSummer = semester.semesterCode.includes('SUMMER');
    const courses = semester.courses || [];
    const credits = Number(semester.totalCredits) || 0;

    const columns = [
      {
        key: 'courseCode',
        title: 'Mã HP',
        dataIndex: 'courseCode',
        width: '100px',
        render: (val) => React.createElement('strong', { style: { color: '#0284c7' } }, val)
      },
      {
        key: 'courseName',
        title: 'Tên học phần',
        dataIndex: 'courseName',
        render: (val, row) =>
          React.createElement(
            'div',
            null,
            React.createElement('div', { style: { fontWeight: 600, color: '#0f172a' } }, val),
            row.rationale ? React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, `💡 ${row.rationale}`) : null
          )
      },
      {
        key: 'credits',
        title: 'Số TC',
        dataIndex: 'credits',
        align: 'center',
        width: '80px',
        render: (val) => React.createElement('strong', null, val)
      },
      {
        key: 'courseType',
        title: 'Phân loại môn',
        dataIndex: 'courseType',
        width: '170px',
        render: (val) => {
          const isRetake = val?.includes('Học lại');
          const isImprove = val?.includes('cải thiện');
          const isAccelerate = val?.includes('Học vượt');
          const bg = isRetake ? '#fee2e2' : isImprove ? '#fef3c7' : isAccelerate ? '#f3e8ff' : '#e0f2fe';
          const fg = isRetake ? '#b91c1c' : isImprove ? '#b45309' : isAccelerate ? '#7e22ce' : '#0369a1';

          return React.createElement(
            'span',
            {
              style: {
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                background: bg,
                color: fg
              }
            },
            val || 'Chuẩn CTĐT'
          );
        }
      },
      {
        key: 'targetGrade',
        title: 'Điểm mục tiêu',
        dataIndex: 'targetGrade',
        align: 'center',
        width: '120px',
        render: (val) =>
          React.createElement(
            'span',
            {
              style: {
                fontWeight: 700,
                color: '#16a34a',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: '4px'
              }
            },
            val || 'B (3.0)'
          )
      },
      {
        key: 'actions',
        title: 'Thao tác',
        align: 'center',
        width: '140px',
        render: (_, row) =>
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '4px', justifyContent: 'center' } },
            Button
              ? React.createElement(
                  Button,
                  {
                    variant: 'secondary',
                    size: 'sm',
                    onClick: () => handleOpenMoveModal(semester.semesterCode, row)
                  },
                  'Chuyển'
                )
              : null,
            Button
              ? React.createElement(
                  Button,
                  {
                    variant: 'ghost',
                    size: 'sm',
                    onClick: () => handleRemoveCourse(semester.semesterCode, row.courseCode)
                  },
                  'Bỏ'
                )
              : React.createElement('button', { onClick: () => handleRemoveCourse(semester.semesterCode, row.courseCode) }, 'Bỏ')
          )
      }
    ];

    return Card
      ? React.createElement(
          Card,
          {
            key: semester.semesterCode,
            title: semester.semesterName,
            subtitle: `Tổng khối lượng: ${credits} tín chỉ · Đánh giá tải: ${semester.workloadAssessment || 'Cân bằng'} · GPA dự kiến: ${semester.expectedGpa || '3.40'}`,
            variant: 'default',
            style: { marginBottom: '20px' },
            headerAction: Button
              ? React.createElement(
                  Button,
                  {
                    variant: 'secondary',
                    size: 'sm',
                    onClick: () => {
                      setSelectedSemesterForAdd(semester.semesterCode);
                      setIsAddCourseModalOpen(true);
                    }
                  },
                  '+ Thêm môn'
                )
              : null
          },
          Table
            ? React.createElement(Table, {
                columns,
                data: courses,
                rowKey: 'courseCode',
                striped: true,
                hoverable: true
              })
            : null
        )
      : null;
  });

  // Lời khuyên & Cảnh báo của AI
  const adviceSection = plan.aiRiskAdvice && Card
    ? React.createElement(
        Card,
        {
          title: 'Phân tích rủi ro & Lời khuyên từ AI Advisor',
          subtitle: 'Dựa trên đối chiếu khung chương trình đào tạo và bảng điểm cá nhân',
          variant: 'default',
          style: { marginTop: '12px' }
        },
        React.createElement('p', { style: { margin: '0 0 8px 0', fontSize: '13px', color: '#92400e' } }, `📌 ${plan.aiRiskAdvice}`),
        plan.warnings && plan.warnings.length > 0
          ? React.createElement(
              'ul',
              { style: { margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#b45309' } },
              plan.warnings.map((w, i) => React.createElement('li', { key: i }, w))
            )
          : null
      )
    : null;

  // ==========================================
  // MODAL KÍCH HOẠT KẾ HOẠCH (ACTIVATE MODAL)
  // ==========================================
  const activateModal = Modal
    ? React.createElement(
        Modal,
        {
          isOpen: isActivateModalOpen,
          onClose: () => setIsActivateModalOpen(false),
          title: 'Xác nhận Bắt đầu theo dõi Kế hoạch học tập này?',
          subtitle: 'Kế hoạch sẽ được chuyển sang trạng thái ACTIVE và trở thành lộ trình chính thức của bạn.',
          size: 'md',
          footer: React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
            Button
              ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: () => setIsActivateModalOpen(false) }, 'Hủy')
              : null,
            Button
              ? React.createElement(
                  Button,
                  { variant: 'primary', size: 'sm', disabled: !isValidated, onClick: handleConfirmActivate },
                  'Đồng ý Kích hoạt'
                )
              : null
          )
        },
        React.createElement(
          'div',
          { style: { fontSize: '13px', color: '#475569', lineHeight: 1.6 } },
          React.createElement('p', null, `Bạn đang chuẩn bị kích hoạt bản kế hoạch: `),
          React.createElement('strong', { style: { color: '#0a0a0a' } }, `${plan.planName} (${plan.version || 'v2.4'})`),
          React.createElement(
            'ul',
            { style: { paddingLeft: '20px', marginTop: '8px' } },
            React.createElement('li', null, `Tổng cộng ${totalPlannedCredits} tín chỉ trong ${plan.semesters?.length || 3} học kỳ.`),
            React.createElement(
              'li',
              null,
              activeEntry
                ? `Bản kế hoạch ACTIVE trước đó (${activeEntry.version}) sẽ tự động được lưu trữ vào Lịch sử.`
                : 'Đây sẽ là bản kế hoạch ACTIVE đầu tiên của bạn.'
            ),
            React.createElement('li', null, `Hệ thống sẽ dùng lộ trình này để đối chiếu cảnh báo học vụ và nhắc nhở đăng ký môn.`)
          )
        )
      )
    : null;

  // ==========================================
  // MODAL THÊM MÔN HỌC (ADD COURSE MODAL)
  // ==========================================
  const addCourseModal = Modal
    ? React.createElement(
        Modal,
        {
          isOpen: isAddCourseModalOpen,
          onClose: () => setIsAddCourseModalOpen(false),
          title: `Thêm môn học vào ${selectedSemesterForAdd}`,
          subtitle: 'Chọn học phần trong danh mục CTĐT Đại học Công nghiệp Hà Nội để bổ sung vào kế hoạch.',
          size: 'md',
          footer: React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'flex-end' } },
            Button
              ? React.createElement(Button, { variant: 'secondary', size: 'sm', onClick: () => setIsAddCourseModalOpen(false) }, 'Đóng')
              : null
          )
        },
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          availableCoursesPool.map((c) =>
            React.createElement(
              'div',
              {
                key: c.courseCode,
                style: {
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--color-surface-alt, #fafafa)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }
              },
              React.createElement(
                'div',
                null,
                React.createElement('strong', { style: { color: '#0284c7' } }, `${c.courseCode} `),
                React.createElement('span', { style: { fontWeight: 600, color: '#0f172a' } }, c.courseName),
                React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, `${c.credits} tín chỉ · ${c.courseType}`)
              ),
              Button
                ? React.createElement(
                    Button,
                    {
                      variant: 'primary',
                      size: 'sm',
                      onClick: () => handleAddCourse(c)
                    },
                    'Chọn môn'
                  )
                : null
            )
          )
        )
      )
    : null;

  // ==========================================
  // MODAL CHUYỂN MÔN GIỮA CÁC KỲ (MOVE COURSE MODAL)
  // ==========================================
  const targetSemestersList = (plan?.semesters || []).filter(
    (s) => s.semesterCode !== moveCourseTarget?.fromSemesterCode
  );

  const moveCourseModal = Modal && moveCourseTarget
    ? React.createElement(
        Modal,
        {
          isOpen: isMoveModalOpen,
          onClose: () => setIsMoveModalOpen(false),
          title: `Chuyển môn ${moveCourseTarget.course?.courseCode} sang học kỳ khác`,
          subtitle: `Học phần: ${moveCourseTarget.course?.courseName} (${moveCourseTarget.course?.credits} tín chỉ)`,
          size: 'md',
          footer: React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
            Button
              ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: () => setIsMoveModalOpen(false) }, 'Hủy')
              : null,
            Button
              ? React.createElement(
                  Button,
                  { variant: 'primary', size: 'sm', onClick: handleConfirmMove },
                  'Xác nhận Chuyển'
                )
              : null
          )
        },
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
          React.createElement(
            'p',
            { style: { fontSize: '13px', color: '#475569', margin: 0 } },
            `Chọn học kỳ đích để chuyển môn học từ ${
              plan.semesters.find((s) => s.semesterCode === moveCourseTarget.fromSemesterCode)?.semesterName ||
              moveCourseTarget.fromSemesterCode
            }:`
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            targetSemestersList.map((sem) => {
              const isSelected = selectedTargetSemester === sem.semesterCode;
              const alreadyHas = sem.courses.some((c) => c.courseCode === moveCourseTarget.course?.courseCode);

              return React.createElement(
                'div',
                {
                  key: sem.semesterCode,
                  onClick: () => !alreadyHas && setSelectedTargetSemester(sem.semesterCode),
                  style: {
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0f9ff' : alreadyHas ? '#f8fafc' : '#ffffff',
                    cursor: alreadyHas ? 'not-allowed' : 'pointer',
                    opacity: alreadyHas ? 0.6 : 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }
                },
                React.createElement(
                  'div',
                  null,
                  React.createElement('div', { style: { fontWeight: 600, fontSize: '13px', color: '#0f172a' } }, sem.semesterName),
                  React.createElement(
                    'div',
                    { style: { fontSize: '11px', color: '#64748b', marginTop: '2px' } },
                    alreadyHas
                      ? '⚠️ Đã có môn này trong học kỳ'
                      : `Hiện có ${sem.totalCredits} TC → Dự kiến sau chuyển: ${Number(sem.totalCredits) + Number(moveCourseTarget.course?.credits)} TC`
                  )
                ),
                isSelected
                  ? React.createElement('span', { style: { color: '#0284c7', fontWeight: 700, fontSize: '16px' } }, '✓')
                  : null
              );
            })
          )
        )
      )
    : null;

  // ==========================================
  // MODAL ĐỐI CHIẾU KẾ HOẠCH HỌC KỲ (RECONCILE MODAL)
  // ==========================================
  const reconcileModal = Modal
    ? React.createElement(
        Modal,
        {
          isOpen: isReconcileModalOpen,
          onClose: () => setIsReconcileModalOpen(false),
          title: 'Đối chiếu kết quả học kỳ với kế hoạch học tập (Reconcile)',
          subtitle:
            'So sánh bảng điểm đã xác nhận với kế hoạch ACTIVE để phát hiện môn trượt/bỏ lỡ và kiến nghị điều chỉnh.',
          size: 'lg',
          footer: React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
            Button
              ? React.createElement(
                  Button,
                  { variant: 'ghost', size: 'sm', onClick: () => setIsReconcileModalOpen(false) },
                  'Đóng'
                )
              : null,
            reconcileResult && reconcileResult.adjustmentsRecommended?.length > 0 && Button
              ? React.createElement(
                  Button,
                  {
                    variant: 'primary',
                    size: 'sm',
                    onClick: handleApplyReconcileAdjustments
                  },
                  '⚡ Tạo bản nháp điều chỉnh (DRAFT)'
                )
              : null
          )
        },
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' } },
          plan.status !== PLAN_STATUSES.ACTIVE && !activeEntry
            ? React.createElement(
                'div',
                {
                  style: {
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    color: '#92400e',
                    lineHeight: 1.5
                  }
                },
                '⚠️ Lưu ý: Nghiệp vụ đối soát theo quy chuẩn US-13 chỉ áp dụng trên bản kế hoạch chính thức đang theo dõi (ACTIVE). Nếu kế hoạch hiện tại là DRAFT, hệ thống sẽ đối soát với bản ACTIVE trong lịch sử nếu có.'
              )
            : null,
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
            React.createElement(
              'label',
              { style: { fontWeight: 600, color: 'var(--color-ink, #0a0a0a)' } },
              'Học kỳ vừa có kết quả:'
            ),
            React.createElement(
              'select',
              {
                value: reconcileSemester,
                onChange: (e) => setReconcileSemester(e.target.value),
                style: {
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  backgroundColor: 'var(--color-paper, #ffffff)',
                  fontSize: '13px'
                }
              },
              React.createElement('option', { value: '2025_1' }, 'Học kỳ 1 (2024-2025) - 2025_1'),
              React.createElement('option', { value: '2025_2' }, 'Học kỳ 2 (2024-2025) - 2025_2'),
              React.createElement('option', { value: '2025_SUMMER' }, 'Học kỳ hè (2024-2025) - 2025_SUMMER'),
              React.createElement('option', { value: '2026_1' }, 'Học kỳ 1 (2025-2026) - 2026_1')
            ),
            Button
              ? React.createElement(
                  Button,
                  {
                    variant: 'secondary',
                    size: 'sm',
                    loading: reconciling,
                    onClick: handleReconcilePlan
                  },
                  'Thực hiện đối chiếu'
                )
              : null
          ),
          reconcileResult
            ? React.createElement(
                'div',
                {
                  style: {
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: reconcileResult.onTrack ? '#f0fdf4' : '#fff7ed',
                    border: `1.5px solid ${reconcileResult.onTrack ? '#86efac' : '#fdba74'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }
                },
                React.createElement(
                  'div',
                  { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  React.createElement(
                    'strong',
                    { style: { fontSize: '15px', color: reconcileResult.onTrack ? '#166534' : '#9a3412' } },
                    reconcileResult.onTrack ? '✓ Kế hoạch ĐÚNG TIẾN ĐỘ' : '⚠️ Cần điều chỉnh kế hoạch học tập'
                  ),
                  reconcileResult.policyVersion
                    ? React.createElement(
                        'span',
                        {
                          style: {
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: '#ffffff',
                            color: '#64748b',
                            border: '1px solid #cbd5e1'
                          }
                        },
                        `Quy chế: ${reconcileResult.policyVersion}`
                      )
                    : null
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px'
                    }
                  },
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'div',
                      { style: { fontWeight: 600, color: '#166534', marginBottom: '4px' } },
                      `Môn đã hoàn thành (${reconcileResult.completedCourses?.length || 0}):`
                    ),
                    reconcileResult.completedCourses?.length > 0
                      ? React.createElement(
                          'ul',
                          { style: { margin: 0, paddingLeft: '18px', color: '#15803d' } },
                          reconcileResult.completedCourses.map((c, i) => React.createElement('li', { key: i }, c))
                        )
                      : React.createElement('div', { style: { color: '#64748b', fontStyle: 'italic' } }, 'Không có môn nào')
                  ),
                  React.createElement(
                    'div',
                    null,
                    React.createElement(
                      'div',
                      { style: { fontWeight: 600, color: '#991b1b', marginBottom: '4px' } },
                      `Môn trượt / bỏ lỡ (${reconcileResult.missedOrFailedCourses?.length || 0}):`
                    ),
                    reconcileResult.missedOrFailedCourses?.length > 0
                      ? React.createElement(
                          'ul',
                          { style: { margin: 0, paddingLeft: '18px', color: '#b91c1c' } },
                          reconcileResult.missedOrFailedCourses.map((c, i) => React.createElement('li', { key: i }, c))
                        )
                      : React.createElement('div', { style: { color: '#16a34a' } }, '✓ Không có môn nợ')
                  )
                ),
                reconcileResult.adjustmentsRecommended?.length > 0
                  ? React.createElement(
                      'div',
                      { style: { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #fed7aa' } },
                      React.createElement(
                        'div',
                        { style: { fontWeight: 600, color: '#9a3412', marginBottom: '4px' } },
                        'Đề xuất điều chỉnh lộ trình:'
                      ),
                      React.createElement(
                        'ul',
                        { style: { margin: 0, paddingLeft: '18px', color: '#7c2d12' } },
                        reconcileResult.adjustmentsRecommended.map((adj, i) =>
                          React.createElement('li', { key: i }, adj)
                        )
                      )
                    )
                  : null
              )
            : null
        )
      )
    : null;

  // ==========================================
  // RENDER TỔNG THỂ TRANG
  // ==========================================
  return React.createElement(
    'div',
    { className: 'haui-page-container haui-planner-page' },
    headerSection,
    toastBar,
    proposalBanner,
    testToolbar,
    kpiSection,
    validationBox,
    semestersList,
    adviceSection,

    // Các Modals bổ trợ
    activateModal,
    addCourseModal,
    moveCourseModal,
    reconcileModal,
    React.createElement(PlanHistoryModal, {
      isOpen: isHistoryModalOpen,
      onClose: () => setIsHistoryModalOpen(false),
      ui,
      api,
      onPlanChanged: () => {
        showToast('Kế hoạch đã được cập nhật từ Lịch sử!');
      }
    }),
    React.createElement(CurriculumTreeModal, {
      isOpen: isTreeModalOpen,
      onClose: () => setIsTreeModalOpen(false),
      ui
    })
  );
}

export default StudyPlannerPage;
