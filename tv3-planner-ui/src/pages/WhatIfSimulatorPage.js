import React, { useState, useCallback } from 'react';

/**
 * 3 Kịch bản mô phỏng What-if chuẩn theo UI Flow (Luồng chính 2: Màn hình 6, 7, 8)
 */
const WHAT_IF_SCENARIOS = Object.freeze([
  {
    id: 'grades',
    name: 'Màn 6: Giả lập điểm kỳ tới',
    description: 'Dự báo GPA học kỳ và biến thiên CPA tích lũy khi thay đổi điểm số các môn dự kiến.'
  },
  {
    id: 'retake',
    name: 'Màn 7: Xếp hạng tối ưu học cải thiện (ROI)',
    description: 'Xếp hạng các môn điểm D/D+/C theo độ nhạy tăng CPA (ROI) trên mỗi tín chỉ đăng ký (BR-06).'
  },
  {
    id: 'target',
    name: 'Màn 8: Tính điểm mục tiêu ngược',
    description: 'Tính toán phân bổ điểm số tối thiểu cần đạt trong các kỳ còn lại để đạt ngưỡng CPA mục tiêu (>= 3.20).'
  }
]);

/**
 * Màn hình 6, 7, 8: Giả lập Điểm số & Tối ưu Học cải thiện (What-if Simulator) — TV3
 *
 * Yêu cầu & Kiến trúc:
 * - Dựng khung mô phỏng các kịch bản học tập (Màn 6, 7, 8 theo UI Flow).
 * - Khu vực nhập hoặc lựa chọn tham số dự kiến theo từng kịch bản.
 * - Vùng hiển thị kết quả mô phỏng ở trạng thái Empty ban đầu.
 * - Đầy đủ 3 trạng thái: Empty, Loading, Error.
 * - Chưa triển khai thuật toán tính toán thực tế tại client; toàn bộ tính toán ủy quyền cho api.simulation.
 * - Sử dụng api và ui được truyền từ TV2.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client do TV2 truyền xuống
 * @param {Object} props.ui - Shared UI Library V0 do TV2 truyền xuống
 */
export function WhatIfSimulatorPage({ api, ui } = {}) {
  const {
    Button,
    Card,
    Table,
    Loading,
    Error: ErrorBox,
    EmptyState
  } = ui || {};

  // Kịch bản đang chọn: 'grades' | 'retake' | 'target'
  const [activeScenario, setActiveScenario] = useState('grades');

  // Tham số dự kiến
  const [expectedGrade, setExpectedGrade] = useState('A');
  const [maxRetakeCourses, setMaxRetakeCourses] = useState(3);
  const [targetCpaInput, setTargetCpaInput] = useState('3.20');

  // Trạng thái kết quả mô phỏng (Ban đầu null -> Empty state)
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Kích hoạt mô phỏng qua api.simulation (không tự tính toán tại client)
  const handleRunSimulation = useCallback(async () => {
    if (!api || !api.simulation) {
      setError({
        code: 'API_SIMULATION_MISSING',
        message: 'Dịch vụ api.simulation chưa được cung cấp từ TV2.',
        details: ['Kiểm tra prop api truyền vào qua createStudentRoutes({ api, ui })']
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let res = null;
      if (activeScenario === 'grades') {
        if (typeof api.simulation.simulateGrades !== 'function') {
          throw new Error('Endpoint api.simulation.simulateGrades không tồn tại.');
        }
        res = await api.simulation.simulateGrades({
          courses: [
            { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3, expectedGrade },
            { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', credits: 4, expectedGrade: 'A' },
            { courseCode: 'IT6002', courseName: 'Lập trình mạng', credits: 3, expectedGrade: 'B+' }
          ]
        });
      } else if (activeScenario === 'retake') {
        if (typeof api.simulation.rankRetake !== 'function') {
          throw new Error('Endpoint api.simulation.rankRetake không tồn tại.');
        }
        res = await api.simulation.rankRetake({
          maxCourses: Number(maxRetakeCourses) || 3
        });
      } else if (activeScenario === 'target') {
        if (typeof api.simulation.calculateTargetGrades !== 'function') {
          throw new Error('Endpoint api.simulation.calculateTargetGrades không tồn tại.');
        }
        res = await api.simulation.calculateTargetGrades({
          targetCpa: Number(targetCpaInput) || 3.2
        });
      }

      setResult(res);
    } catch (err) {
      setError({
        code: err?.code || 'SIMULATION_ERROR',
        message: err?.message || 'Không thể thực hiện mô phỏng kịch bản học tập.',
        details: err?.details || ['Kiểm tra kết nối mạng tới Backend Spring Boot hoặc mock mode.']
      });
    } finally {
      setLoading(false);
    }
  }, [activeScenario, api, expectedGrade, maxRetakeCourses, targetCpaInput]);

  // Xóa kết quả mô phỏng để quay về trạng thái Empty
  const handleClearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // Mô phỏng trạng thái Error để kiểm thử UI
  const handleTriggerError = useCallback(() => {
    setResult(null);
    setError({
      code: 'SIMULATED_SIMULATION_ERROR',
      message: 'Mô phỏng lỗi máy chủ khi tính toán ma trận độ nhạy CPA (Kiểm thử Error State).',
      details: [
        'Endpoint: POST /api/v1/simulation/* gặp sự cố.',
        'Nhấn nút "Thử tính lại" để khôi phục.'
      ]
    });
  }, []);

  // Tiêu đề đầu trang và thanh điều khiển
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
        'Mô phỏng Điểm số & Tối ưu hóa What-if'
      ),
      React.createElement(
        'p',
        { style: { color: 'var(--color-gray-600, #475569)', marginTop: 'var(--spacing-1, 4px)', fontSize: 'var(--text-sm, 14px)' } },
        'Màn hình 6, 7, 8 — Giả lập điểm kỳ tới, tối ưu học cải thiện điểm D/D+/C theo ROI CPA (BR-06) và tính điểm mục tiêu ngược.'
      )
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: 'var(--spacing-2, 8px)', alignItems: 'center' } },
      Button
        ? React.createElement(
            Button,
            { variant: 'ghost', size: 'sm', onClick: handleClearResult },
            'Xóa kết quả (Empty)'
          )
        : null,
      Button
        ? React.createElement(
            Button,
            { variant: 'ghost', size: 'sm', onClick: handleTriggerError },
            'Mô phỏng Lỗi (Error)'
          )
        : null
    )
  );

  // Tabs chọn kịch bản mô phỏng
  const scenarioTabs = React.createElement(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--spacing-3, 12px)',
        marginBottom: 'var(--spacing-6, 24px)'
      }
    },
    WHAT_IF_SCENARIOS.map((sc) => {
      const isActive = activeScenario === sc.id;
      return Card
        ? React.createElement(
            Card,
            {
              key: sc.id,
              variant: isActive ? 'status-info' : 'default',
              padding: 'sm',
              style: {
                cursor: 'pointer',
                borderColor: isActive ? 'var(--color-primary, #0284c7)' : 'var(--color-gray-200, #e2e8f0)',
                background: isActive ? '#f0f9ff' : '#ffffff'
              },
              onClick: () => {
                setActiveScenario(sc.id);
                setResult(null);
                setError(null);
              }
            },
            React.createElement(
              'div',
              { style: { fontWeight: 600, color: isActive ? '#0369a1' : 'var(--color-gray-900, #0f172a)' } },
              sc.name
            ),
            React.createElement(
              'div',
              { style: { fontSize: 'var(--text-xs, 12px)', color: 'var(--color-gray-600, #475569)', marginTop: '4px' } },
              sc.description
            )
          )
        : null;
    })
  );

  // Khu vực nhập và lựa chọn tham số dự kiến
  let paramsInputControls = null;
  if (activeScenario === 'grades') {
    paramsInputControls = React.createElement(
      'div',
      { style: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } },
      React.createElement(
        'label',
        { style: { fontSize: '14px', color: '#334155' } },
        'Chọn điểm chữ dự kiến cho môn Toán rời rạc (3 TC): '
      ),
      React.createElement(
        'select',
        {
          value: expectedGrade,
          onChange: (e) => setExpectedGrade(e.target.value),
          style: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '14px'
          }
        },
        ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'].map((g) =>
          React.createElement('option', { key: g, value: g }, `Điểm ${g}`)
        )
      )
    );
  } else if (activeScenario === 'retake') {
    paramsInputControls = React.createElement(
      'div',
      { style: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } },
      React.createElement(
        'label',
        { style: { fontSize: '14px', color: '#334155' } },
        'Số môn cải thiện tối đa muốn xếp hạng theo ROI: '
      ),
      React.createElement(
        'select',
        {
          value: maxRetakeCourses,
          onChange: (e) => setMaxRetakeCourses(e.target.value),
          style: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '14px'
          }
        },
        [1, 2, 3, 4, 5].map((num) =>
          React.createElement('option', { key: num, value: num }, `${num} môn học`)
        )
      )
    );
  } else if (activeScenario === 'target') {
    paramsInputControls = React.createElement(
      'div',
      { style: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } },
      React.createElement(
        'label',
        { style: { fontSize: '14px', color: '#334155' } },
        'Nhập CPA mục tiêu mong muốn đạt được: '
      ),
      React.createElement('input', {
        type: 'number',
        step: '0.05',
        min: '2.0',
        max: '4.0',
        value: targetCpaInput,
        onChange: (e) => setTargetCpaInput(e.target.value),
        style: {
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          fontSize: '14px',
          width: '90px'
        }
      }),
      React.createElement(
        'span',
        { style: { fontSize: '12px', color: '#64748b' } },
        '(Ngưỡng bằng Giỏi: >= 3.20 | Khá: >= 2.50)'
      )
    );
  }

  const parameterCard = Card
    ? React.createElement(
        Card,
        {
          title: `Thiết lập Tham số Mô phỏng — ${WHAT_IF_SCENARIOS.find((s) => s.id === activeScenario)?.name}`,
          subtitle: 'Lựa chọn các biến số dự kiến để hệ thống phân tích và ước lượng điểm số.',
          style: { marginBottom: 'var(--spacing-6, 24px)' },
          headerAction: Button
            ? React.createElement(
                Button,
                {
                  variant: 'primary',
                  size: 'sm',
                  loading,
                  onClick: handleRunSimulation
                },
                'Bắt đầu mô phỏng'
              )
            : null
        },
        React.createElement('div', { style: { padding: '8px 0' } }, paramsInputControls)
      )
    : null;

  // ==========================================
  // 1. VÙNG KẾT QUẢ: LOADING / ERROR / EMPTY / DATA
  // ==========================================
  let resultsArea = null;

  if (loading) {
    resultsArea = Card
      ? React.createElement(
          Card,
          { style: { padding: '32px', textAlign: 'center' } },
          Loading
            ? React.createElement(Loading, {
                variant: 'spinner',
                size: 'lg',
                label: 'Đang kết nối API và tính toán mô phỏng kịch bản điểm số...'
              })
            : React.createElement('div', null, 'Đang tính toán...')
        )
      : null;
  } else if (error) {
    resultsArea = ErrorBox
      ? React.createElement(ErrorBox, {
          title: error.message || 'Lỗi mô phỏng',
          error,
          code: error.code || 'SIMULATION_ERROR',
          details: error.details || [],
          onRetry: handleRunSimulation,
          retryLabel: 'Thử tính toán lại'
        })
      : null;
  } else if (!result) {
    // TRẠNG THÁI EMPTY BAN ĐẦU
    resultsArea = Card
      ? React.createElement(
          Card,
          { style: { padding: '24px 0' } },
          EmptyState
            ? React.createElement(EmptyState, {
                title: 'Chưa có kết quả mô phỏng',
                description:
                  'Vui lòng lựa chọn các tham số dự kiến ở trên và bấm nút "Bắt đầu mô phỏng" để xem biến thiên điểm số và lộ trình cải thiện.',
                actionLabel: 'Chạy mô phỏng ngay',
                onAction: handleRunSimulation
              })
            : React.createElement('div', { style: { textAlign: 'center' } }, 'Chưa có kết quả.')
        )
      : null;
  } else {
    // HIỂN THỊ KẾT QUẢ MÔ PHỎNG TỪ API
    let detailsContent = null;

    if (activeScenario === 'grades') {
      detailsContent = React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px' } },
          React.createElement(
            'div',
            null,
            React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, 'GPA học kỳ dự kiến: '),
            React.createElement('strong', { style: { fontSize: '20px', color: '#0f172a' } }, result.projectedGpa || '3.22')
          ),
          React.createElement(
            'div',
            null,
            React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, 'CPA tích lũy mới: '),
            React.createElement('strong', { style: { fontSize: '20px', color: '#0284c7' } }, result.projectedCpa || '2.58'),
            result.cpaDelta
              ? React.createElement('span', { style: { color: '#16a34a', fontSize: '13px', marginLeft: '6px' } }, `(+${result.cpaDelta})`)
              : null
          )
        ),
        result.warnings && result.warnings.length > 0
          ? React.createElement(
              'ul',
              { style: { margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#b45309' } },
              result.warnings.map((w, idx) => React.createElement('li', { key: idx }, w))
            )
          : null
      );
    } else if (activeScenario === 'retake') {
      const recs = result.recommendations || [];
      detailsContent = React.createElement(
        'div',
        null,
        React.createElement(
          'p',
          { style: { margin: '0 0 12px 0', fontSize: '13px', color: '#334155' } },
          `Đã tìm thấy ${recs.length} môn học điểm D/D+/C có ROI kéo CPA cao nhất:`
        ),
        Table
          ? React.createElement(Table, {
              columns: [
                { key: 'courseCode', title: 'Mã HP', dataIndex: 'courseCode', width: '100px' },
                { key: 'courseName', title: 'Tên môn học', dataIndex: 'courseName' },
                { key: 'credits', title: 'Số TC', dataIndex: 'credits', align: 'center', width: '70px' },
                { key: 'currentGrade', title: 'Điểm cũ', dataIndex: 'currentGrade', align: 'center', width: '80px' },
                { key: 'targetGrade', title: 'Mục tiêu', dataIndex: 'targetGrade', align: 'center', width: '80px' },
                {
                  key: 'cpaGain',
                  title: 'Độ tăng CPA',
                  dataIndex: 'cpaGain',
                  align: 'center',
                  width: '110px',
                  render: (val) => React.createElement('strong', { style: { color: '#16a34a' } }, `+${val}`)
                },
                { key: 'rationale', title: 'Đánh giá ROI', dataIndex: 'rationale' }
              ],
              data: recs,
              rowKey: 'courseCode'
            })
          : null
      );
    } else if (activeScenario === 'target') {
      const reqs = result.requiredCourseGrades || [];
      detailsContent = React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { style: { marginBottom: '16px' } },
          React.createElement('span', { style: { fontSize: '14px', color: '#334155' } }, 'Khả thi: '),
          React.createElement(
            'strong',
            { style: { color: result.achievable ? '#16a34a' : '#dc2626' } },
            result.achievable ? 'Đạt được mục tiêu' : 'Khó khả thi với số tín chỉ còn lại'
          ),
          React.createElement(
            'p',
            { style: { margin: '8px 0 0 0', fontSize: '13px', color: '#475569' } },
            result.explanation || `Cần duy trì mức điểm tối thiểu dưới đây cho các học phần còn lại để đạt CPA >= ${result.targetCpa}:`
          )
        ),
        Table && reqs.length > 0
          ? React.createElement(Table, {
              columns: [
                { key: 'courseCode', title: 'Mã HP', dataIndex: 'courseCode', width: '110px' },
                { key: 'courseName', title: 'Tên học phần', dataIndex: 'courseName' },
                { key: 'credits', title: 'Số TC', dataIndex: 'credits', align: 'center', width: '80px' },
                {
                  key: 'requiredGrade',
                  title: 'Điểm tối thiểu cần đạt',
                  dataIndex: 'requiredGrade',
                  align: 'center',
                  render: (val) => React.createElement('strong', { style: { color: '#0284c7' } }, val)
                }
              ],
              data: reqs,
              rowKey: 'courseCode'
            })
          : null
      );
    }

    resultsArea = Card
      ? React.createElement(
          Card,
          {
            title: 'Kết quả Phân tích & Ước lượng Mô phỏng',
            subtitle: 'Được tính toán qua các port nghiệp vụ chuẩn của api.simulation',
            variant: 'status-success'
          },
          detailsContent
        )
      : null;
  }

  return React.createElement(
    'div',
    { className: 'haui-page-container haui-what-if-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
    headerSection,
    scenarioTabs,
    parameterCard,
    resultsArea
  );
}

export default WhatIfSimulatorPage;
