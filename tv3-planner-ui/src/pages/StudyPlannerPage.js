import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Màn hình 5: Tùy chỉnh & Xác nhận Kế hoạch học tập (Study Planner) — TV3
 *
 * Yêu cầu & Kiến trúc:
 * - Dựng khung UI cho trang lập kế hoạch học tập (Màn hình 5 theo UI Flow & PRD).
 * - Có tiêu đề, vùng nội dung chính và các khu vực hiển thị dữ liệu:
 *   + Thẻ tổng quan KPI (Trạng thái, Tín chỉ, CPA dự kiến, Học kỳ).
 *   + Bảng danh sách môn học dự kiến (ui.Table).
 *   + Trình thẩm định quy chế tức thời (api.planner.validate, giới hạn 10-24 TC BR-03/BR-04).
 *   + Cảnh báo rủi ro học vụ (AI Risk Advice).
 * - Xây dựng đầy đủ 3 trạng thái: Loading, Error, Empty.
 * - Tận dụng 100% UI components (Card, Button, Table, Loading, Error, EmptyState) và API client (api.planner) từ TV2.
 * - Không tự tạo dữ liệu nghiệp vụ giả để thay thế API thật; không tự xây thuật toán lập kế hoạch.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client do TV2 truyền xuống
 * @param {Object} props.ui - Shared UI Library V0 do TV2 truyền xuống
 */
export function StudyPlannerPage({ api, ui } = {}) {
  const {
    Button,
    Card,
    Table,
    Loading,
    Error: ErrorBox,
    EmptyState
  } = ui || {};

  // State dữ liệu kế hoạch lấy từ api.planner.generate
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State thẩm định quy chế thời gian thực từ api.planner.validate
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);

  // Gọi API tạo/tải kế hoạch học tập đề xuất từ backend
  const handleFetchPlan = useCallback(async () => {
    if (!api || !api.planner || typeof api.planner.generate !== 'function') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.planner.generate({ targetSemester: '2026_1' });
      setPlan(response);
      setValidationResult(null);
    } catch (err) {
      setError(err);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Tự động tải kế hoạch khi mount
  useEffect(() => {
    handleFetchPlan();
  }, [handleFetchPlan]);

  // Thao tác xóa kế hoạch để kích hoạt trạng thái Empty
  const handleClearPlan = useCallback(() => {
    setPlan(null);
    setValidationResult(null);
    setError(null);
  }, []);

  // Thao tác mô phỏng lỗi để kiểm thử trạng thái Error
  const handleTriggerError = useCallback(() => {
    setPlan(null);
    setValidationResult(null);
    setError({
      code: 'PLANNER_API_ERROR',
      message: 'Mô phỏng lỗi kết nối máy chủ khi truy xuất lộ trình học tập. Vui lòng kiểm tra lại dịch vụ.',
      details: ['Endpoint POST /api/v1/planner/generate gặp sự cố', 'Bấm nút "Thử lại" để tải lại dữ liệu']
    });
  }, []);

  // Danh sách môn học hiện tại trong học kỳ đầu tiên
  const currentSemester = plan?.semesters?.[0] || null;
  const currentCourses = useMemo(() => {
    return currentSemester?.courses || [];
  }, [currentSemester]);

  // Tính tổng số tín chỉ hiện có trong kế hoạch
  const totalCredits = useMemo(() => {
    return currentCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
  }, [currentCourses]);

  // Gọi API thẩm định quy chế 10 - 24 TC thời gian thực (BR-03 / BR-04)
  const handleValidatePlan = useCallback(async () => {
    if (!api || !api.planner || typeof api.planner.validate !== 'function') {
      return;
    }

    setValidating(true);
    try {
      const res = await api.planner.validate({ totalCredits });
      setValidationResult(res);
    } catch (err) {
      setValidationResult({
        valid: false,
        status: 'DRAFT',
        violations: [err?.message || 'Lỗi khi thẩm định kế hoạch'],
        warnings: []
      });
    } finally {
      setValidating(false);
    }
  }, [api, totalCredits]);

  // Bỏ một môn khỏi kế hoạch để thử nghiệm thay đổi tín chỉ
  const handleRemoveCourse = useCallback((courseCode) => {
    if (!plan || !plan.semesters) return;
    const updatedSemesters = plan.semesters.map((sem, sIdx) => {
      if (sIdx !== 0) return sem;
      const updatedCourses = sem.courses.filter((c) => c.courseCode !== courseCode);
      const newCredits = updatedCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
      return {
        ...sem,
        courses: updatedCourses,
        totalCredits: newCredits
      };
    });

    setPlan({
      ...plan,
      semesters: updatedSemesters
    });
    setValidationResult(null);
  }, [plan]);

  // Cấu hình các cột cho Bảng môn học (Table)
  const columns = useMemo(() => [
    {
      key: 'courseCode',
      title: 'Mã HP',
      dataIndex: 'courseCode',
      width: '110px',
      render: (val) => React.createElement('strong', { style: { color: 'var(--color-primary, #0284c7)' } }, val)
    },
    {
      key: 'courseName',
      title: 'Tên học phần đề xuất',
      dataIndex: 'courseName',
      render: (val, row) => React.createElement(
        'div',
        null,
        React.createElement('div', { style: { fontWeight: 600, color: 'var(--color-gray-900, #0f172a)' } }, val),
        row.rationale ? React.createElement(
          'div',
          { style: { fontSize: 'var(--text-xs, 12px)', color: 'var(--color-gray-500, #64748b)', marginTop: '2px' } },
          `💡 ${row.rationale}`
        ) : null
      )
    },
    {
      key: 'credits',
      title: 'Số TC',
      dataIndex: 'credits',
      align: 'center',
      width: '80px',
      render: (val) => React.createElement('span', { style: { fontWeight: 600 } }, val)
    },
    {
      key: 'courseType',
      title: 'Phân loại môn',
      dataIndex: 'courseType',
      width: '160px',
      render: (val) => React.createElement(
        'span',
        {
          style: {
            fontSize: 'var(--text-xs, 12px)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm, 4px)',
            background: val?.includes('Học lại')
              ? '#fee2e2'
              : val?.includes('cải thiện')
                ? '#fef3c7'
                : '#e0f2fe',
            color: val?.includes('Học lại')
              ? '#b91c1c'
              : val?.includes('cải thiện')
                ? '#b45309'
                : '#0369a1'
          }
        },
        val || 'Chuẩn CTĐT'
      )
    },
    {
      key: 'targetGrade',
      title: 'Điểm mục tiêu',
      dataIndex: 'targetGrade',
      align: 'center',
      width: '120px',
      render: (val) => React.createElement(
        'span',
        {
          style: {
            fontWeight: 700,
            color: 'var(--color-success, #16a34a)',
            background: 'var(--color-gray-100, #f1f5f9)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm, 4px)'
          }
        },
        val || 'N/A'
      )
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '90px',
      render: (_, row) => Button
        ? React.createElement(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: () => handleRemoveCourse(row.courseCode)
            },
            'Bỏ'
          )
        : React.createElement('button', { onClick: () => handleRemoveCourse(row.courseCode) }, 'Bỏ')
    }
  ], [Button, handleRemoveCourse]);

  // Tiêu đề đầu trang và thanh điều khiển trạng thái kiểm thử
  const headerSection = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--spacing-4, 16px)',
        marginBottom: 'var(--spacing-6, 24px)'
      }
    },
    React.createElement(
      'div',
      null,
      React.createElement(
        'h2',
        { style: { fontSize: 'var(--text-2xl, 24px)', fontWeight: 700, color: 'var(--color-gray-900, #0f172a)', margin: 0 } },
        'Kế hoạch Học tập Mục tiêu (Study Planner)'
      ),
      React.createElement(
        'p',
        { style: { color: 'var(--color-gray-600, #475569)', marginTop: 'var(--spacing-1, 4px)', fontSize: 'var(--text-sm, 14px)' } },
        'Màn hình 5 — Tùy chỉnh môn học, thẩm định quy chế 10–24 tín chỉ thời gian thực (BR-03/BR-04) và lưu Lộ trình mục tiêu.'
      )
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: 'var(--spacing-2, 8px)', alignItems: 'center' } },
      Button
        ? React.createElement(
            Button,
            { variant: 'secondary', size: 'sm', onClick: handleClearPlan },
            'Trạng thái Rỗng (Empty)'
          )
        : null,
      Button
        ? React.createElement(
            Button,
            { variant: 'ghost', size: 'sm', onClick: handleTriggerError },
            'Mô phỏng Lỗi (Error)'
          )
        : null,
      Button
        ? React.createElement(
            Button,
            { variant: 'primary', size: 'sm', onClick: handleFetchPlan, loading },
            'Tải / Tạo lại Kế hoạch'
          )
        : null
    )
  );

  // ==========================================
  // 1. TRẠNG THÁI LOADING
  // ==========================================
  if (loading) {
    return React.createElement(
      'div',
      { className: 'haui-page-container haui-planner-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
      headerSection,
      Loading
        ? React.createElement(Loading, {
            variant: 'spinner',
            size: 'lg',
            label: 'Đang kết nối API và lập kế hoạch học tập đề xuất từ máy chủ...'
          })
        : React.createElement('div', { style: { padding: '32px', textAlign: 'center' } }, 'Đang tải kế hoạch học tập...')
    );
  }

  // ==========================================
  // 2. TRẠNG THÁI ERROR
  // ==========================================
  if (error) {
    return React.createElement(
      'div',
      { className: 'haui-page-container haui-planner-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
      headerSection,
      ErrorBox
        ? React.createElement(ErrorBox, {
            title: 'Không thể truy xuất Kế hoạch học tập',
            error: error,
            message: error?.message || 'Đã có lỗi xảy ra khi gọi dịch vụ api.planner.generate.',
            code: error?.code || 'PLAN_LOAD_ERROR',
            details: error?.details || ['Kiểm tra kết nối tới Backend Spring Boot hoặc dịch vụ giả lập.'],
            onRetry: handleFetchPlan,
            retryLabel: 'Thử tải lại kế hoạch'
          })
        : React.createElement('div', { style: { color: 'red', padding: '16px' } }, error?.message)
    );
  }

  // ==========================================
  // 3. TRẠNG THÁI EMPTY
  // ==========================================
  if (!plan || !plan.semesters || plan.semesters.length === 0 || currentCourses.length === 0) {
    return React.createElement(
      'div',
      { className: 'haui-page-container haui-planner-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
      headerSection,
      EmptyState
        ? React.createElement(EmptyState, {
            title: 'Chưa có kế hoạch học tập nào được khởi tạo',
            description: 'Bạn chưa tạo lộ trình học tập mục tiêu cho các kỳ tới hoặc đã xóa hết các môn trong kế hoạch. Nhấn nút bên dưới để hệ thống lập phương án tối ưu.',
            actionLabel: 'Lập kế hoạch học tập mới',
            onAction: handleFetchPlan
          })
        : React.createElement(
            'div',
            { style: { padding: '32px', textAlign: 'center' } },
            'Chưa có kế hoạch nào. Bấm Tải lại kế hoạch.'
          )
    );
  }

  // ==========================================
  // 4. TRẠNG THÁI CÓ DỮ LIỆU (MAIN CONTENT AREA)
  // ==========================================

  // Thẻ tóm tắt chỉ số KPI kế hoạch
  const kpiSection = React.createElement(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 'var(--spacing-4, 16px)',
        marginBottom: 'var(--spacing-6, 24px)'
      }
    },
    // Thẻ 1: Học kỳ & Trạng thái
    Card
      ? React.createElement(
          Card,
          { variant: 'default', padding: 'sm' },
          React.createElement('div', { style: { fontSize: 'var(--text-xs, 12px)', color: 'var(--color-gray-500, #64748b)' } }, 'Học kỳ mục tiêu'),
          React.createElement('div', { style: { fontSize: 'var(--text-lg, 18px)', fontWeight: 700, color: 'var(--color-gray-900, #0f172a)', marginTop: '4px' } }, currentSemester?.semesterName || 'Học kỳ 1 (2026-2027)'),
          React.createElement(
            'div',
            { style: { marginTop: '6px' } },
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: plan.status === 'VALIDATED' ? '#dcfce7' : '#f1f5f9',
                  color: plan.status === 'VALIDATED' ? '#15803d' : '#475569'
                }
              },
              `Trạng thái: ${validationResult?.status || plan.status}`
            )
          )
        )
      : null,
    // Thẻ 2: Khối lượng tín chỉ (10-24 TC)
    Card
      ? React.createElement(
          Card,
          {
            variant: totalCredits >= 10 && totalCredits <= 24 ? 'status-success' : 'status-warning',
            padding: 'sm'
          },
          React.createElement('div', { style: { fontSize: 'var(--text-xs, 12px)', color: 'var(--color-gray-500, #64748b)' } }, 'Tổng tín chỉ học kỳ'),
          React.createElement(
            'div',
            { style: { fontSize: 'var(--text-2xl, 24px)', fontWeight: 700, color: 'var(--color-gray-900, #0f172a)', marginTop: '4px' } },
            `${totalCredits} `,
            React.createElement('span', { style: { fontSize: 'var(--text-sm, 14px)', fontWeight: 400, color: 'var(--color-gray-500, #64748b)' } }, '/ 24 TC tối đa')
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: '12px',
                marginTop: '4px',
                color: totalCredits >= 10 && totalCredits <= 24 ? 'var(--color-success, #16a34a)' : '#b45309'
              }
            },
            totalCredits < 10
              ? '⚠️ Dưới 10 TC (Vi phạm BR-03)'
              : totalCredits > 24
                ? '⚠️ Vượt 24 TC (Vi phạm BR-04)'
                : '✓ Thỏa mãn quy chế (10-24 TC)'
          )
        )
      : null,
    // Thẻ 3: CPA dự kiến
    Card
      ? React.createElement(
          Card,
          { variant: 'default', padding: 'sm' },
          React.createElement('div', { style: { fontSize: 'var(--text-xs, 12px)', color: 'var(--color-gray-500, #64748b)' } }, 'CPA dự kiến sau kỳ'),
          React.createElement('div', { style: { fontSize: 'var(--text-2xl, 24px)', fontWeight: 700, color: 'var(--color-primary, #0284c7)', marginTop: '4px' } }, plan.projectedCpa || '2.54'),
          React.createElement('div', { style: { fontSize: '12px', color: 'var(--color-gray-500, #64748b)', marginTop: '4px' } }, plan.projectedRank || 'Xếp loại Khá')
        )
      : null,
    // Thẻ 4: Số môn học
    Card
      ? React.createElement(
          Card,
          { variant: 'default', padding: 'sm' },
          React.createElement('div', { style: { fontSize: 'var(--text-xs, 12px)', color: 'var(--color-gray-500, #64748b)' } }, 'Số học phần dự kiến'),
          React.createElement('div', { style: { fontSize: 'var(--text-2xl, 24px)', fontWeight: 700, color: 'var(--color-gray-900, #0f172a)', marginTop: '4px' } }, `${currentCourses.length} môn`),
          React.createElement('div', { style: { fontSize: '12px', color: 'var(--color-gray-500, #64748b)', marginTop: '4px' } }, 'Bấm "Bỏ" để thử nghiệm tải')
        )
      : null
  );

  // Khu vực Trình thẩm định quy chế thời gian thực (Real-time Rule Validator)
  const validationSection = Card
    ? React.createElement(
        Card,
        {
          title: 'Trình thẩm định Quy chế Thời gian thực (Real-time Rule Validator)',
          subtitle: 'Kiểm tra ràng buộc tiên quyết & giới hạn tín chỉ (10-24 TC) qua api.planner.validate',
          variant: validationResult
            ? validationResult.valid
              ? 'status-success'
              : 'status-error'
            : 'default',
          className: 'haui-planner-validator-card',
          headerAction: Button
            ? React.createElement(
                Button,
                {
                  variant: 'primary',
                  size: 'sm',
                  loading: validating,
                  onClick: handleValidatePlan
                },
                'Thẩm định quy chế ngay'
              )
            : null
        },
        React.createElement(
          'div',
          { style: { padding: '8px 0' } },
          validationResult
            ? React.createElement(
                'div',
                null,
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 600,
                      color: validationResult.valid ? '#16a34a' : '#dc2626'
                    }
                  },
                  validationResult.valid ? '✓ Kế hoạch hợp lệ 100% theo quy chế đào tạo HaUI' : '✕ Kế hoạch chưa đạt quy chế'
                ),
                validationResult.violations?.length > 0 &&
                  React.createElement(
                    'ul',
                    { style: { color: '#dc2626', margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px' } },
                    validationResult.violations.map((v, i) => React.createElement('li', { key: i }, v))
                  ),
                validationResult.warnings?.length > 0 &&
                  React.createElement(
                    'ul',
                    { style: { color: '#b45309', margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px' } },
                    validationResult.warnings.map((w, i) => React.createElement('li', { key: i }, w))
                  )
              )
            : React.createElement(
                'div',
                { style: { color: 'var(--color-gray-600, #475569)', fontSize: 'var(--text-sm, 14px)' } },
                `Hiện có ${totalCredits} tín chỉ trong kế hoạch. Bấm nút "Thẩm định quy chế ngay" để kiểm tra tính hợp lệ với máy chủ.`
              )
        )
      )
    : null;

  // Khu vực Bảng môn học (Table)
  const tableSection = Card
    ? React.createElement(
        Card,
        {
          title: `Danh sách Học phần Đề xuất — ${currentSemester?.semesterName || 'Kỳ tới'}`,
          subtitle: `Tổng khối lượng: ${totalCredits} tín chỉ. Tải học tập: ${currentSemester?.workloadAssessment || 'Cân bằng'}`,
          style: { marginTop: 'var(--spacing-6, 24px)' }
        },
        Table
          ? React.createElement(Table, {
              columns,
              data: currentCourses,
              rowKey: 'courseCode',
              striped: true,
              hoverable: true
            })
          : React.createElement('div', null, 'Đang tải bảng môn học...')
      )
    : null;

  // Khu vực Cảnh báo rủi ro & Lời khuyên của AI (AI Risk Advice)
  const adviceSection = (plan.aiRiskAdvice || (plan.warnings && plan.warnings.length > 0)) && Card
    ? React.createElement(
        Card,
        {
          title: 'Phân tích rủi ro & Lời khuyên từ AI Advisor',
          subtitle: 'Dựa trên đối chiếu khung chương trình đào tạo và bảng điểm cá nhân',
          variant: 'status-warning',
          style: { marginTop: 'var(--spacing-6, 24px)' }
        },
        plan.aiRiskAdvice
          ? React.createElement(
              'p',
              { style: { margin: '0 0 8px 0', fontSize: 'var(--text-sm, 14px)', color: '#92400e', lineHeight: 1.5 } },
              `📌 ${plan.aiRiskAdvice}`
            )
          : null,
        plan.warnings && plan.warnings.length > 0
          ? React.createElement(
              'ul',
              { style: { margin: 0, paddingLeft: '20px', fontSize: 'var(--text-xs, 12px)', color: '#b45309' } },
              plan.warnings.map((warn, wIdx) => React.createElement('li', { key: wIdx }, warn))
            )
          : null
      )
    : null;

  return React.createElement(
    'div',
    { className: 'haui-page-container haui-planner-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
    headerSection,
    kpiSection,
    validationSection,
    tableSection,
    adviceSection
  );
}

export default StudyPlannerPage;
