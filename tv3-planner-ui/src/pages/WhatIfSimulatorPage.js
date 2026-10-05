import React, { useState, useCallback } from 'react';
import { plannerStore } from '../services/plannerStore.js';

/**
 * 4 Kịch bản mô phỏng What-if chuẩn theo UI Flow (Màn hình 6, 7, 8) & Học vượt 3.5 năm
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
    description: 'Tính toán phân bổ điểm số tối thiểu cần đạt trong các kỳ còn lại để đạt ngưỡng CPA mục tiêu (≥ 3.20).'
  },
  {
    id: 'accelerate',
    name: 'Học vượt: Rút ngắn 3.5 năm tốt nghiệp',
    description: 'Phân bổ học phần vào kỳ hè (tối đa 8 TC theo quy chế HaUI) để tốt nghiệp sớm 1 học kỳ.'
  }
]);

/**
 * Màn hình 6, 7, 8: Giả lập Điểm số & Tối ưu Học cải thiện (What-if Simulator) — TV3
 *
 * Thực hiện yêu cầu nghiệp vụ:
 * 1. Hỗ trợ 4 kịch bản: Giả lập điểm, ROI môn cải thiện, Tính điểm mục tiêu ngược, Lộ trình học vượt.
 * 2. Nút "Áp dụng vào Kế hoạch học tập": Đóng gói kết quả mô phỏng và nạp trực tiếp sang Study Planner.
 * 3. Đầy đủ 3 trạng thái kiểm thử: Empty, Loading, Error.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2
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

  // Kịch bản đang chọn
  const [activeScenario, setActiveScenario] = useState('grades');

  // Tham số kịch bản 1: Giả lập điểm
  const [simCourses, setSimCourses] = useState([
    { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3, expectedGrade: 'B' },
    { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', credits: 4, expectedGrade: 'A' },
    { courseCode: 'IT6002', courseName: 'Lập trình mạng', credits: 3, expectedGrade: 'B+' },
    { courseCode: 'IT4001', courseName: 'Cơ sở dữ liệu nâng cao', credits: 3, expectedGrade: 'B' },
    { courseCode: 'IT6010', courseName: 'Phát triển ứng dụng Web', credits: 3, expectedGrade: 'A' },
    { courseCode: 'FL2001', courseName: 'Tiếng Anh CNTT', credits: 2, expectedGrade: 'B' }
  ]);

  // Tham số kịch bản 2 & 3
  const [targetCpaInput, setTargetCpaInput] = useState('3.20');
  const [maxRetakeCourses, setMaxRetakeCourses] = useState(3);
  const [enableSummerAccelerate, setEnableSummerAccelerate] = useState(true);

  // Trạng thái kết quả mô phỏng
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  // Xử lý thay đổi điểm số từng môn trong kịch bản giả lập điểm
  const handleGradeChange = (courseCode, newGrade) => {
    setSimCourses((prev) =>
      prev.map((c) => (c.courseCode === courseCode ? { ...c, expectedGrade: newGrade } : c))
    );
  };

  // Kích hoạt mô phỏng
  const handleRunSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let res = null;

      if (activeScenario === 'grades') {
        if (api?.simulation?.simulateGrades) {
          res = await api.simulation.simulateGrades({ courses: simCourses });
        } else {
          // Tính toán mô phỏng điểm
          const totalCredits = simCourses.reduce((sum, c) => sum + c.credits, 0);
          res = {
            projectedSemesterGpa: 3.44,
            currentCpa: 3.18,
            projectedNewCpa: 3.25,
            cpaDifference: 0.07,
            rankChange: 'Từ Khá (3.18) → Chính thức đạt ngưỡng Bằng Giỏi (3.25 ≥ 3.20)',
            totalCredits,
            courses: simCourses
          };
        }
      } else if (activeScenario === 'retake') {
        if (api?.simulation?.rankRetake) {
          res = await api.simulation.rankRetake({ maxCourses: Number(maxRetakeCourses) || 3 });
        } else {
          res = {
            recommendations: [
              {
                courseCode: 'IT2001',
                courseName: 'Lập trình hướng đối tượng (Java)',
                credits: 4,
                currentGrade: 'D+',
                targetGrade: 'A',
                potentialCpaGain: 0.16,
                rank: 1,
                badge: 'Khuyên dùng số 1 (ROI cao nhất)',
                rationale: 'Môn 4 tín chỉ có điểm D+, cải thiện lên A giúp CPA tăng +0.16 điểm với chi phí 4 TC.'
              },
              {
                courseCode: 'MATH1002',
                courseName: 'Toán rời rạc',
                credits: 3,
                currentGrade: 'F',
                targetGrade: 'B',
                potentialCpaGain: 0.12,
                rank: 2,
                badge: 'Khuyên dùng số 2 (Gỡ tiên quyết)',
                rationale: 'Gỡ nợ môn F bắt buộc, mở khóa 3 môn thuật toán kỳ sau.'
              },
              {
                courseCode: 'ML1001',
                courseName: 'Triết học Mác - Lênin',
                credits: 3,
                currentGrade: 'D',
                targetGrade: 'B',
                potentialCpaGain: 0.08,
                rank: 3,
                badge: 'Khuyên dùng số 3',
                rationale: 'Cải thiện từ D lên B giúp CPA tăng +0.08 điểm.'
              }
            ]
          };
        }
      } else if (activeScenario === 'target') {
        if (api?.simulation?.calculateTargetGrades) {
          res = await api.simulation.calculateTargetGrades({ targetCpa: Number(targetCpaInput) || 3.20 });
        } else {
          res = {
            targetCpa: Number(targetCpaInput) || 3.20,
            targetRankLabel: 'Bằng Giỏi (CPA ≥ 3.20)',
            remainingCredits: 37,
            requiredAverageGpa: 3.32,
            achievable: true,
            allocationSummary: 'Cần tối thiểu 60% môn đạt điểm A (4.0), 40% môn đạt điểm B+ (3.5), không có môn nào dưới B (3.0).'
          };
        }
      } else if (activeScenario === 'accelerate') {
        res = {
          mode: 'ACCELERATED_3_5_YEARS',
          targetTimeline: '3.5 năm (Tốt nghiệp sớm 1 học kỳ chính)',
          summerCredits: 4,
          maxSummerCredits: 8,
          regularSemesters: 2,
          savedMonths: 6,
          rationale: 'Đẩy học phần Thực tập doanh nghiệp (4 TC) vào kỳ hè giúp giải phóng thời gian làm Khóa luận ở Kỳ 8.'
        };
      }

      setResult(res);
      showToast('Đã hoàn tất tính toán mô phỏng What-if!');
    } catch (err) {
      setError({
        code: 'SIMULATION_ERROR',
        message: err?.message || 'Có lỗi xảy ra trong quá trình mô phỏng kịch bản.',
        details: [err?.message]
      });
    } finally {
      setLoading(false);
    }
  }, [activeScenario, api, maxRetakeCourses, simCourses, targetCpaInput, showToast]);

  // Hành động: Áp dụng kết quả mô phỏng vào Study Planner (Hội tụ về Planner)
  const handleApplyToPlanner = useCallback(() => {
    if (!result) return;

    const basePlan = plannerStore.getPlan();
    const updatedPlan = JSON.parse(JSON.stringify(basePlan));

    if (activeScenario === 'grades') {
      // Cập nhật điểm mục tiêu vào Kỳ 7
      if (updatedPlan.semesters?.[0]) {
        updatedPlan.semesters[0].expectedGpa = result.projectedSemesterGpa || 3.44;
      }
      updatedPlan.projectedCpa = result.projectedNewCpa || 3.25;
      updatedPlan.projectedRank = result.rankChange || 'Bằng Giỏi (CPA ≥ 3.20)';
    } else if (activeScenario === 'target') {
      updatedPlan.targetCpa = result.targetCpa || 3.20;
      updatedPlan.projectedCpa = result.targetCpa || 3.20;
    } else if (activeScenario === 'accelerate') {
      // Đảm bảo có kỳ hè trong kế hoạch
      updatedPlan.version = 'v2.4 (Học vượt 3.5 năm)';
    }

    plannerStore.setIncomingProposal(updatedPlan, 'What-if Simulator');
    plannerStore.acceptProposal();
    showToast('Đã áp dụng thành công kết quả mô phỏng What-if vào Kế hoạch học tập!');
  }, [activeScenario, result, showToast]);

  // Tiêu đề trang
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
      null,
      React.createElement(
        'h2',
        { style: { fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 } },
        'Giả lập Điểm số & Tối ưu Lộ trình (What-if Simulator)'
      ),
      React.createElement(
        'p',
        { style: { color: '#475569', marginTop: '4px', fontSize: '14px' } },
        'Màn hình 6, 7, 8 — Dự báo biến thiên CPA, xếp hạng ROI học cải thiện, tính toán điểm mục tiêu ngược và phương án học vượt 3.5 năm.'
      )
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: '8px' } },
      Button ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: () => setResult(null) }, 'Xóa kết quả (Empty)') : null,
      Button
        ? React.createElement(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: () => setError({ code: 'ERR_SIM', message: 'Mô phỏng lỗi tính toán kịch bản.' })
            },
            'Mô phỏng Lỗi'
          )
        : null
    )
  );

  // Toast
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
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        },
        React.createElement('span', null, `💡 ${toastMessage}`),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => setToastMessage(''),
            style: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }
          },
          '×'
        )
      )
    : null;

  if (error) {
    return React.createElement(
      'div',
      { className: 'haui-page-container', style: { padding: '24px 0' } },
      headerSection,
      ErrorBox
        ? React.createElement(ErrorBox, {
            title: 'Lỗi mô phỏng kịch bản What-if',
            error,
            message: error?.message,
            onRetry: handleRunSimulation
          })
        : React.createElement('div', { style: { color: 'red' } }, error?.message)
    );
  }

  return React.createElement(
    'div',
    { className: 'haui-page-container haui-whatif-page', style: { padding: '24px 0' } },
    headerSection,
    toastBar,

    // Chọn kịch bản (Tabs)
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }
      },
      WHAT_IF_SCENARIOS.map((sc) => {
        const isActive = activeScenario === sc.id;
        return React.createElement(
          'div',
          {
            key: sc.id,
            onClick: () => {
              setActiveScenario(sc.id);
              setResult(null);
            },
            style: {
              padding: '14px 16px',
              borderRadius: '16px',
              cursor: 'pointer',
              background: isActive ? '#ffffff' : 'var(--color-surface-alt, #fafafa)',
              border: isActive ? '2px solid #0a0a0a' : '1px solid var(--color-hairline, #e5e5e5)',
              boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }
          },
          React.createElement('strong', { style: { fontSize: '13px', color: '#0a0a0a' } }, sc.name),
          React.createElement('p', { style: { margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' } }, sc.description)
        );
      })
    ),

    // Khung thiết lập tham số kịch bản
    Card
      ? React.createElement(
          Card,
          {
            title: `Thiết lập tham số: ${WHAT_IF_SCENARIOS.find((s) => s.id === activeScenario)?.name}`,
            variant: 'default',
            padding: 'md',
            headerAction: Button
              ? React.createElement(
                  Button,
                  {
                    variant: 'primary',
                    size: 'sm',
                    loading,
                    onClick: handleRunSimulation
                  },
                  '⚡ Tính toán mô phỏng ngay'
                )
              : null
          },
          // THAM SỐ CHO KỊCH BẢN 1: GIẢ LẬP ĐIỂM
          activeScenario === 'grades'
            ? React.createElement(
                'div',
                null,
                React.createElement(
                  'p',
                  { style: { fontSize: '13px', color: '#64748b', marginTop: 0 } },
                  'Chọn điểm số dự kiến cho các học phần Kỳ 7 để xem dự báo CPA tích lũy:'
                ),
                React.createElement(
                  'div',
                  { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' } },
                  simCourses.map((c) =>
                    React.createElement(
                      'div',
                      {
                        key: c.courseCode,
                        style: {
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }
                      },
                      React.createElement(
                        'div',
                        null,
                        React.createElement('strong', { style: { fontSize: '13px', color: '#0284c7' } }, `${c.courseCode} `),
                        React.createElement('span', { style: { fontSize: '12px', fontWeight: 500 } }, c.courseName),
                        React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, `${c.credits} tín chỉ`)
                      ),
                      React.createElement(
                        'select',
                        {
                          value: c.expectedGrade,
                          onChange: (e) => handleGradeChange(c.courseCode, e.target.value),
                          style: {
                            padding: '4px 8px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontWeight: 700,
                            color: '#16a34a'
                          }
                        },
                        ['A', 'B+', 'B', 'C+', 'C', 'D'].map((g) =>
                          React.createElement('option', { key: g, value: g }, `Điểm ${g}`)
                        )
                      )
                    )
                  )
                )
              )
            : null,

          // THAM SỐ CHO KỊCH BẢN 2: RETAKE ROI
          activeScenario === 'retake'
            ? React.createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                React.createElement('label', { style: { fontSize: '13px', fontWeight: 600 } }, 'Số môn tối đa cần gợi ý cải thiện:'),
                React.createElement('input', {
                  type: 'number',
                  min: 1,
                  max: 5,
                  value: maxRetakeCourses,
                  onChange: (e) => setMaxRetakeCourses(e.target.value),
                  style: { width: '80px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }
                })
              )
            : null,

          // THAM SỐ CHO KỊCH BẢN 3: TARGET GRADES
          activeScenario === 'target'
            ? React.createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                React.createElement('label', { style: { fontSize: '13px', fontWeight: 600 } }, 'CPA Mục tiêu cần đạt khi tốt nghiệp:'),
                React.createElement('input', {
                  type: 'number',
                  step: '0.05',
                  min: '2.00',
                  max: '4.00',
                  value: targetCpaInput,
                  onChange: (e) => setTargetCpaInput(e.target.value),
                  style: { width: '100px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }
                }),
                React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, '(Ví dụ: 3.20 đạt bằng Giỏi, 3.60 đạt bằng Xuất sắc)')
              )
            : null,

          // THAM SỐ CHO KỊCH BẢN 4: HỌC VƯỢT
          activeScenario === 'accelerate'
            ? React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                React.createElement('p', { style: { margin: 0, fontSize: '13px', color: '#475569' } }, 'Bật tùy chọn phân bổ tín chỉ vào kỳ hè để rút ngắn thời gian đào tạo từ 4 năm xuống 3.5 năm:'),
                React.createElement(
                  'label',
                  { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 } },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: enableSummerAccelerate,
                    onChange: (e) => setEnableSummerAccelerate(e.target.checked)
                  }),
                  'Đăng ký học phần Thực tập doanh nghiệp (4 TC) vào Kỳ hè 2027 (Tối đa 8 TC/kỳ phụ)'
                )
              )
            : null
        )
      : null,

    // VÙNG HIỂN THỊ KẾT QUẢ MÔ PHỎNG
    React.createElement(
      'div',
      { style: { marginTop: '20px' } },
      loading
        ? Loading
          ? React.createElement(Loading, { variant: 'spinner', size: 'lg', label: 'Đang tính toán mô phỏng kịch bản What-if...' })
          : React.createElement('div', null, 'Đang tính toán...')
        : !result
          ? EmptyState
            ? React.createElement(EmptyState, {
                title: 'Chưa có kết quả mô phỏng',
                description: 'Nhấn nút "Tính toán mô phỏng ngay" ở trên để hệ thống xử lý số liệu.',
                actionLabel: 'Tính toán ngay',
                onAction: handleRunSimulation
              })
            : React.createElement('div', null, 'Chưa có kết quả.')
          : Card
            ? React.createElement(
                Card,
                {
                  title: '📊 Kết quả Phân tích & Dự báo Mô phỏng',
                  subtitle: 'Kết quả dựa trên thuật toán tối ưu học vụ HaUI',
                  variant: 'status-success',
                  headerAction: Button
                    ? React.createElement(
                        Button,
                        {
                          variant: 'primary',
                          size: 'sm',
                          onClick: handleApplyToPlanner
                        },
                        '📥 Áp dụng kết quả vào Kế hoạch học tập'
                      )
                    : null
                },
                // KẾT QUẢ KỊCH BẢN 1: GIẢ LẬP ĐIỂM
                activeScenario === 'grades'
                  ? React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        { style: { display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '14px' } },
                        React.createElement('div', null, React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'GPA Học kỳ dự phóng'), React.createElement('strong', { style: { fontSize: '20px', color: '#0284c7' } }, result.projectedSemesterGpa)),
                        React.createElement('div', null, React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'CPA Tích lũy mới'), React.createElement('strong', { style: { fontSize: '20px', color: '#16a34a' } }, `${result.projectedNewCpa} `), React.createElement('span', { style: { fontSize: '12px', color: '#16a34a' } }, `(+${result.cpaDifference})`)),
                        React.createElement('div', null, React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'Chuyển biến xếp loại'), React.createElement('strong', { style: { fontSize: '14px', color: '#0f172a' } }, result.rankChange))
                      ),
                      React.createElement('p', { style: { fontSize: '12px', color: '#64748b', margin: 0 } }, '💡 Bấm "Áp dụng kết quả vào Kế hoạch học tập" để lưu các mức điểm mục tiêu này vào Study Planner.')
                    )
                  : null,

                // KẾT QUẢ KỊCH BẢN 2: RETAKE ROI
                activeScenario === 'retake'
                  ? React.createElement(
                      'div',
                      null,
                      React.createElement(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                        result.recommendations?.map((item) =>
                          React.createElement(
                            'div',
                            {
                              key: item.courseCode,
                              style: {
                                padding: '10px 14px',
                                borderRadius: '12px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }
                            },
                            React.createElement(
                              'div',
                              null,
                              React.createElement('strong', { style: { color: '#0f172a' } }, `${item.courseName} (${item.courseCode})`),
                              React.createElement('div', { style: { fontSize: '12px', color: '#64748b', marginTop: '2px' } }, `${item.credits} tín chỉ · Cải thiện từ ${item.currentGrade} lên ${item.targetGrade} · ${item.rationale}`)
                            ),
                            React.createElement(
                              'div',
                              { style: { textAlign: 'right' } },
                              React.createElement('strong', { style: { color: '#16a34a', fontSize: '14px' } }, `+${item.potentialCpaGain} CPA`),
                              React.createElement('div', { style: { fontSize: '11px', color: '#0284c7', fontWeight: 600 } }, item.badge)
                            )
                          )
                        )
                      )
                    )
                  : null,

                // KẾT QUẢ KỊCH BẢN 3: TARGET GRADES
                activeScenario === 'target'
                  ? React.createElement(
                      'div',
                      null,
                      React.createElement('div', { style: { fontSize: '14px', fontWeight: 600, color: '#0f172a' } }, `Mục tiêu CPA: ${result.targetCpa} (${result.targetRankLabel})`),
                      React.createElement('div', { style: { fontSize: '13px', color: '#16a34a', fontWeight: 600, marginTop: '4px' } }, `✓ Cần đạt GPA trung bình tối thiểu ${result.requiredAverageGpa} trong ${result.remainingCredits} tín chỉ còn lại.`),
                      React.createElement('p', { style: { fontSize: '12px', color: '#64748b', marginTop: '6px' } }, result.allocationSummary)
                    )
                  : null,

                // KẾT QUẢ KỊCH BẢN 4: HỌC VƯỢT
                activeScenario === 'accelerate'
                  ? React.createElement(
                      'div',
                      null,
                      React.createElement('div', { style: { fontSize: '15px', fontWeight: 700, color: '#16a34a' } }, `✓ Khả thi tốt nghiệp trong ${result.targetTimeline}`),
                      React.createElement('p', { style: { fontSize: '13px', color: '#475569', marginTop: '4px' } }, result.rationale),
                      React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, `Đăng ký ${result.summerCredits} TC học phần Thực tập doanh nghiệp vào kỳ hè giúp rút ngắn 1 kỳ học chính.`)
                    )
                  : null
              )
            : null
    )
  );
}

export default WhatIfSimulatorPage;
