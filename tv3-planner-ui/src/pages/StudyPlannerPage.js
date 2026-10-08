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
  const { plan, incomingProposal, validation: validationResult } = storeState;
  const isValidated = plan?.status === PLAN_STATUSES.VALIDATED;
  const activeEntry = storeState.history?.find((h) => h.status === PLAN_STATUSES.ACTIVE) || null;

  // Trạng thái giao diện
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [selectedSemesterForAdd, setSelectedSemesterForAdd] = useState('2026_1');

  // Thẩm định quy chế
  const [validating, setValidating] = useState(false);

  // Đăng ký lắng nghe thay đổi từ plannerStore
  useEffect(() => {
    const unsubscribe = plannerStore.subscribe((newState) => {
      setStoreState(newState);
    });
    return unsubscribe;
  }, []);

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

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  // Tổng số tín chỉ còn lại trong toàn bộ kế hoạch
  const totalPlannedCredits = useMemo(() => {
    if (!plan || !plan.semesters) return 0;
    return plan.semesters.reduce((sum, sem) => sum + (Number(sem.totalCredits) || 0), 0);
  }, [plan]);

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
          : `Phát hiện ${res.violations.length} vi phạm quy chế — kế hoạch vẫn ở DRAFT.`
      );
    }
  }, [api, plan, showToast]);

  // Hành động: Lưu bản nháp (Save Draft)
  const handleSaveDraft = useCallback(() => {
    const res = plannerStore.saveDraft();
    showToast(res.message);
  }, [showToast]);

  // Hành động: Kích hoạt kế hoạch (Bắt đầu theo dõi)
  // F23-005: store từ chối nếu kế hoạch chưa VALIDATED hoặc còn vi phạm quy chế
  const handleConfirmActivate = useCallback(() => {
    setIsActivateModalOpen(false);
    const res = plannerStore.activatePlan();
    showToast(res.success ? res.message : `⚠️ ${res.message}`);
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
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }
    },
    React.createElement(
      'div',
      { style: { maxWidth: '720px' } },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
        React.createElement(
          'h2',
          { style: { fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 } },
          'Kế hoạch Học tập Mục tiêu (Study Planner)'
        ),
        React.createElement(
          'span',
          {
            style: {
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '18px',
              background: plan?.status === PLAN_STATUSES.ACTIVE ? '#0a0a0a' : plan?.status === PLAN_STATUSES.VALIDATED ? '#dcfce7' : '#f1f5f9',
              color: plan?.status === PLAN_STATUSES.ACTIVE ? '#ffffff' : plan?.status === PLAN_STATUSES.VALIDATED ? '#15803d' : '#475569',
              border: '1px solid var(--color-hairline, #e5e5e5)'
            }
          },
          `Phiên bản: ${plan?.version || 'v2.4'} · Trạng thái: ${plan?.status || 'DRAFT'}`
        ),
        React.createElement(
          'span',
          {
            style: {
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '18px',
              background: '#f8fafc',
              color: '#64748b',
              border: '1px solid #e2e8f0'
            }
          },
          'Khóa 16 · CNTT/KTPM'
        )
      ),
      React.createElement(
        'p',
        { style: { color: '#475569', marginTop: '6px', fontSize: '14px', lineHeight: 1.5 } },
        'Xây dựng lộ trình đăng ký môn học nhiều kỳ tiếp theo. Hệ thống kiểm tra ràng buộc 10–24 tín chỉ thời gian thực (BR-03/BR-04), điều kiện tiên quyết và hỗ trợ kích hoạt theo dõi tiến độ chính thức.'
      )
    ),
    // Nút chức năng ở góc phải
    React.createElement(
      'div',
      { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
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
            { variant: 'secondary', size: 'sm', onClick: handleSaveDraft },
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

  // Banner nhận đề xuất từ AI Chat hoặc What-if
  const proposalBanner = incomingProposal
    ? React.createElement(
        'div',
        {
          style: {
            padding: '14px 18px',
            marginBottom: '20px',
            borderRadius: '16px',
            background: '#eff6ff',
            border: '1.5px solid #3b82f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }
        },
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            { style: { fontWeight: 700, fontSize: '14px', color: '#1d4ed8' } },
            `✨ Có phương án lộ trình đề xuất từ: ${incomingProposal.sourceName || 'AI Advisor'} (${incomingProposal.receivedAt || 'Vừa xong'})`
          ),
          React.createElement(
            'div',
            { style: { fontSize: '13px', color: '#1e40af', marginTop: '2px' } },
            `CPA dự kiến: ${incomingProposal.projectedCpa || '3.25'} · Phân bổ: ${incomingProposal.semesters?.length || 2} học kỳ. Bạn có muốn nạp phương án này vào Kế hoạch học tập không?`
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
      { className: 'haui-page-container', style: { padding: '24px 0' } },
      headerSection,
      Loading
        ? React.createElement(Loading, { variant: 'spinner', size: 'lg', label: 'Đang tải kế hoạch học tập đa kỳ...' })
        : React.createElement('div', null, 'Đang tải...')
    );
  }

  if (error) {
    return React.createElement(
      'div',
      { className: 'haui-page-container', style: { padding: '24px 0' } },
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

  if (!plan || !plan.semesters || plan.semesters.length === 0) {
    return React.createElement(
      'div',
      { className: 'haui-page-container', style: { padding: '24px 0' } },
      headerSection,
      testToolbar,
      EmptyState
        ? React.createElement(EmptyState, {
            title: 'Chưa có kế hoạch học tập nào',
            description: 'Bạn chưa tạo lộ trình học tập hoặc đã xóa các môn. Nhấn nút bên dưới để khôi phục phương án mẫu.',
            actionLabel: 'Tạo kế hoạch học tập mới',
            onAction: handleFetchPlan
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }
    },
    // Thẻ 1: Tiến độ tích lũy
    Card
      ? React.createElement(
          Card,
          { variant: 'default', padding: 'sm' },
          React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Tổng TC cần tích lũy'),
          React.createElement(
            'div',
            { style: { fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' } },
            `${totalPlannedCredits} `,
            React.createElement('span', { style: { fontSize: '13px', fontWeight: 400, color: '#64748b' } }, `/ ${plan.remainingCredits || 37} TC còn thiếu`)
          ),
          React.createElement(
            'div',
            { style: { fontSize: '11px', color: '#16a34a', marginTop: '4px', fontWeight: 600 } },
            `Đã tích lũy ${plan.totalEarnedCredits || 108} / ${plan.totalRequiredCredits || 145} TC (74.5%)`
          )
        )
      : null,
    // Thẻ 2: Phân bổ lộ trình
    Card
      ? React.createElement(
          Card,
          { variant: 'default', padding: 'sm' },
          React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Phân bổ lộ trình'),
          React.createElement(
            'div',
            { style: { fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' } },
            `${plan.semesters.length} học kỳ`
          ),
          React.createElement(
            'div',
            { style: { fontSize: '11px', color: '#64748b', marginTop: '4px' } },
            '2 học kỳ chính + 1 kỳ hè (Chuẩn 4 năm)'
          )
        )
      : null,
    // Thẻ 3: CPA dự kiến
    Card
      ? React.createElement(
          Card,
          { variant: 'default', padding: 'sm' },
          React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Mô phỏng CPA tốt nghiệp'),
          React.createElement(
            'div',
            { style: { fontSize: '22px', fontWeight: 700, color: '#0284c7', marginTop: '4px' } },
            `${plan.projectedCpa || '3.32'} / 4.00`
          ),
          React.createElement(
            'div',
            { style: { fontSize: '11px', color: '#16a34a', marginTop: '4px', fontWeight: 600 } },
            plan.projectedRank || 'Bằng Giỏi (CPA ≥ 3.20)'
          )
        )
      : null,
    // Thẻ 4: Kiểm tra quy chế HaUI
    Card
      ? React.createElement(
          Card,
          {
            variant: validationResult ? (validationResult.valid ? 'status-success' : 'status-error') : 'default',
            padding: 'sm'
          },
          React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Kiểm tra quy chế HaUI'),
          React.createElement(
            'div',
            { style: { fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '4px' } },
            validationResult
              ? validationResult.valid
                ? '✓ 100% Hợp lệ'
                : '⚠️ Có cảnh báo'
              : 'Sẵn sàng kiểm tra'
          ),
          React.createElement(
            'div',
            { style: { fontSize: '11px', color: '#64748b', marginTop: '4px' } },
            'Thỏa mãn quy định 10-24 TC (BR-03/04)'
          )
        )
      : null
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
        width: '90px',
        render: (_, row) =>
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
          variant: 'status-warning',
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
          subtitle: 'Chọn học phần trong danh mục CTĐT KTPM/CNTT để bổ sung vào kế hoạch.',
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
  // RENDER TỔNG THỂ TRANG
  // ==========================================
  return React.createElement(
    'div',
    { className: 'haui-page-container haui-planner-page', style: { padding: '24px 0' } },
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
    React.createElement(PlanHistoryModal, {
      isOpen: isHistoryModalOpen,
      onClose: () => setIsHistoryModalOpen(false),
      ui,
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
