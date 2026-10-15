import React, { useState, useCallback, useEffect, useRef } from 'react';
import { plannerStore, PLAN_STATUSES } from '../services/plannerStore.js';

/**
 * 3 Công cụ What-if cốt lõi theo PRD FR-14–16 & UI Flow (Màn hình 6, 7, 8)
 * (Kèm tùy chọn học vượt 3.5 năm)
 */
export const WHAT_IF_TOOLS = Object.freeze([
  {
    id: 'grades',
    name: 'Màn 6: Giả lập điểm kỳ tới',
    shortName: 'Giả lập điểm (Màn 6)',
    icon: '🎯',
    description: 'Dự báo GPA học kỳ và biến thiên CPA tích lũy khi thay đổi điểm số các môn dự kiến.'
  },
  {
    id: 'retake',
    name: 'Màn 7: Xếp hạng tối ưu học cải thiện (ROI)',
    shortName: 'ROI cải thiện (Màn 7)',
    icon: '📈',
    description: 'Xếp hạng các môn điểm D/D+/C theo độ nhạy tăng CPA (ROI) trên mỗi tín chỉ đăng ký (BR-06).'
  },
  {
    id: 'target',
    name: 'Màn 8: Tính điểm mục tiêu ngược',
    shortName: 'Mục tiêu ngược (Màn 8)',
    icon: '🏁',
    description: 'Tính toán phân bổ điểm số tối thiểu cần đạt trong các kỳ còn lại để đạt ngưỡng CPA mục tiêu (≥ 3.20).'
  },
  {
    id: 'accelerate',
    name: 'Học vượt: Rút ngắn 3.5 năm',
    shortName: 'Học vượt 3.5 năm',
    icon: '⚡',
    description: 'Phân bổ học phần vào kỳ hè (tối đa 8 TC theo quy chế HaUI) để tốt nghiệp sớm 1 học kỳ.'
  }
]);

// Danh sách thang điểm HaUI chuẩn
const GRADE_POINTS_MAP = Object.freeze({
  A: 4.0,
  'B+': 3.5,
  B: 3.0,
  'C+': 2.5,
  C: 2.0,
  'D+': 1.5,
  D: 1.0,
  F: 0.0
});

// Danh sách môn mẫu cho Màn 6 (Giả lập điểm kỳ tới)
const DEFAULT_SIM_COURSES = Object.freeze([
  { courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3, expectedGrade: 'B' },
  { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng', credits: 4, expectedGrade: 'A' },
  { courseCode: 'IT6002', courseName: 'Lập trình mạng', credits: 3, expectedGrade: 'B+' },
  { courseCode: 'IT4001', courseName: 'Cơ sở dữ liệu nâng cao', credits: 3, expectedGrade: 'B' },
  { courseCode: 'IT6010', courseName: 'Phát triển ứng dụng Web', credits: 3, expectedGrade: 'A' },
  { courseCode: 'FL2001', courseName: 'Tiếng Anh CNTT', credits: 2, expectedGrade: 'B' }
]);

// Danh sách môn điểm thấp có thể học cải thiện cho Màn 7 (ROI Optimizer - BR-06)
const DEFAULT_RETAKE_CANDIDATES = Object.freeze([
  {
    courseCode: 'IT2001',
    courseName: 'Lập trình hướng đối tượng (Java)',
    credits: 4,
    currentGrade: 'D+',
    currentGradePoints: 1.5,
    targetGrade: 'A',
    targetGradePoints: 4.0,
    selected: true,
    rank: 1,
    badge: 'Khuyên dùng số 1 (ROI cao nhất)',
    rationale: 'Môn 4 tín chỉ có điểm D+, cải thiện lên A giúp CPA tăng +0.16 điểm với chi phí 4 TC.'
  },
  {
    courseCode: 'MATH1002',
    courseName: 'Toán rời rạc',
    credits: 3,
    currentGrade: 'F',
    currentGradePoints: 0.0,
    targetGrade: 'B',
    targetGradePoints: 3.0,
    selected: true,
    rank: 2,
    badge: 'Khuyên dùng số 2 (Gỡ tiên quyết)',
    rationale: 'Gỡ nợ môn F bắt buộc, mở khóa 3 môn thuật toán kỳ sau.'
  },
  {
    courseCode: 'ML1001',
    courseName: 'Triết học Mác - Lênin',
    credits: 3,
    currentGrade: 'D',
    currentGradePoints: 1.0,
    targetGrade: 'B',
    targetGradePoints: 3.0,
    selected: false,
    rank: 3,
    badge: 'Khuyên dùng số 3',
    rationale: 'Cải thiện từ D lên B giúp CPA tăng +0.09 điểm với chi phí 3 tín chỉ.'
  },
  {
    courseCode: 'PHY1001',
    courseName: 'Vật lý đại cương',
    credits: 3,
    currentGrade: 'D+',
    currentGradePoints: 1.5,
    targetGrade: 'B',
    targetGradePoints: 3.0,
    selected: false,
    rank: 4,
    badge: 'Tùy chọn bổ sung',
    rationale: 'Cải thiện từ D+ lên B giúp CPA tăng +0.06 điểm.'
  }
]);

/**
 * Màn hình 6, 7, 8: Nhóm 3 công cụ What-if, ROI và Mục tiêu ngược (Task 3.10 — TV3)
 *
 * Tiêu chí kỹ thuật:
 * 1. 3 công cụ tại cùng nhóm What-if, hỗ trợ vào trực tiếp từng công cụ qua tab, query param hoặc prop.
 * 2. Chọn điểm / nhận kết quả mock; chọn môn cải thiện và xem xếp hạng ROI.
 * 3. Áp dụng tạo proposal DRAFT cho Planner để xem lại; chỉ thử/thoát không sửa bảng điểm hoặc bản ACTIVE.
 * 4. Debounce request (300ms) và loại bỏ response cũ đến muộn (out-of-order drop).
 * 5. Tuyệt đối không gọi AI / LLM trực tiếp khi kéo chọn điểm.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2
 * @param {string} [props.initialTool] - Công cụ khởi tạo trực tiếp: 'grades' | 'retake' | 'target'
 * @param {string} [props.tool] - Công cụ điều khiển từ ngoài
 * @param {Function} [props.onNavigate] - Callback điều hướng sang Planner
 */
export function WhatIfSimulatorPage({ api, ui, initialTool, tool, onNavigate } = {}) {
  const {
    Button,
    Card,
    Table,
    Loading,
    Error: ErrorBox,
    EmptyState
  } = ui || {};

  // Xác định công cụ khởi đầu (hỗ trợ prop, query param URL hoặc mặc định 'grades')
  const resolveInitialTool = () => {
    if (tool && WHAT_IF_TOOLS.some((t) => t.id === tool)) return tool;
    if (initialTool && WHAT_IF_TOOLS.some((t) => t.id === initialTool)) return initialTool;

    if (typeof window !== 'undefined' && window.location?.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTool = params.get('tool') || params.get('scenario');
        if (urlTool && WHAT_IF_TOOLS.some((t) => t.id === urlTool)) {
          return urlTool;
        }
      } catch {
        // Môi trường không có window.location
      }
    }
    return 'grades';
  };

  const [activeTool, setActiveTool] = useState(resolveInitialTool);

  // Đồng bộ prop tool khi thay đổi từ ngoài
  useEffect(() => {
    if (tool && WHAT_IF_TOOLS.some((t) => t.id === tool)) {
      setActiveTool(tool);
    }
  }, [tool]);

  // ========================================================
  // STATE THAM SỐ 3 CÔNG CỤ
  // ========================================================

  // Công cụ 1: Giả lập điểm kỳ tới
  const [simCourses, setSimCourses] = useState(() => DEFAULT_SIM_COURSES.map((c) => ({ ...c })));

  // Công cụ 2: ROI học cải thiện
  const [retakeCandidates, setRetakeCandidates] = useState(() =>
    DEFAULT_RETAKE_CANDIDATES.map((c) => ({ ...c }))
  );
  const [maxRetakeCourses, setMaxRetakeCourses] = useState(3);

  // Công cụ 3: Tính điểm mục tiêu ngược
  const [targetCpaInput, setTargetCpaInput] = useState('3.20');

  // Công cụ 4 (bổ trợ): Học vượt
  const [enableSummerAccelerate, setEnableSummerAccelerate] = useState(true);

  // ========================================================
  // DEBOUNCE & SEQUENCE TRACKING (BỎ RESPONSE CŨ ĐẾN MUỘN)
  // ========================================================
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Kết quả, loading, error, toast
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  // Xóa timer khi unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ========================================================
  // ĐỘNG CƠ MÔ PHỎNG WHAT-IF (KHÔNG GỌI AI / LLM)
  // ========================================================
  const executeSimulation = useCallback(
    async (toolId, overrideData = {}) => {
      // Tăng sequence ID: mọi response có reqId < requestIdRef.current sẽ bị loại bỏ
      const currentRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        let res = null;

        if (toolId === 'grades') {
          const coursesToSimulate = overrideData.simCourses || simCourses;
          if (api?.simulation?.simulateGrades) {
            res = await api.simulation.simulateGrades({ courses: coursesToSimulate });
          } else {
            // Mock engine tính toán điểm số cục bộ
            const totalCredits = coursesToSimulate.reduce((sum, c) => sum + Number(c.credits || 0), 0);
            const totalPoints = coursesToSimulate.reduce(
              (sum, c) => sum + Number(c.credits || 0) * (GRADE_POINTS_MAP[c.expectedGrade] ?? 3.0),
              0
            );
            const expectedGpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 3.0;

            const currentCpa = 2.45;
            const currentCredits = 68;
            const projectedCpa = Number(
              ((currentCpa * currentCredits + totalPoints) / (currentCredits + totalCredits)).toFixed(2)
            );
            const cpaDelta = Number((projectedCpa - currentCpa).toFixed(2));

            let rankChange = 'Duy trì Trung bình';
            if (projectedCpa >= 3.6) rankChange = 'Đạt Bằng Xuất sắc (CPA ≥ 3.60)';
            else if (projectedCpa >= 3.2) rankChange = 'Chính thức đạt ngưỡng Bằng Giỏi (CPA ≥ 3.20)';
            else if (projectedCpa >= 2.5) rankChange = 'Từ Trung bình (2.45) → Đạt Bằng Khá (CPA ≥ 2.50)';

            res = {
              currentCpa,
              expectedGpa,
              projectedCpa,
              cpaDelta,
              rankChange,
              totalCredits,
              courses: coursesToSimulate
            };
          }
        } else if (toolId === 'retake') {
          const candidates = overrideData.retakeCandidates || retakeCandidates;
          const maxCourses = overrideData.maxRetakeCourses || maxRetakeCourses;

          if (api?.simulation?.rankRetake) {
            res = await api.simulation.rankRetake({ maxCourses: Number(maxCourses) || 3 });
          } else {
            // Mock engine tính toán ROI học cải thiện: ROI = cpaDelta / credits
            const ranked = candidates
              .map((item) => {
                const targetPoints = GRADE_POINTS_MAP[item.targetGrade] ?? 4.0;
                const currentPoints = item.currentGradePoints ?? 1.0;
                const pointGain = Math.max(0, targetPoints - currentPoints);
                // Giả định tổng tín chỉ tốt nghiệp 135 TC
                const cpaDelta = Number(((pointGain * item.credits) / 135).toFixed(2));
                const roi = item.credits > 0 ? Number((cpaDelta / item.credits).toFixed(4)) : 0;
                return {
                  ...item,
                  cpaDelta,
                  roi,
                  targetGradePoints: targetPoints
                };
              })
              .sort((a, b) => b.roi - a.roi);

            const selectedCount = ranked.filter((r) => r.selected).length;
            const totalRetakeCredits = ranked
              .filter((r) => r.selected)
              .reduce((sum, r) => sum + r.credits, 0);
            const totalPotentialCpaGain = Number(
              ranked
                .filter((r) => r.selected)
                .reduce((sum, r) => sum + r.cpaDelta, 0)
                .toFixed(2)
            );

            res = {
              recommendations: ranked.slice(0, Number(maxCourses) || 4),
              selectedCount,
              totalRetakeCredits,
              totalPotentialCpaGain
            };
          }
        } else if (toolId === 'target') {
          const targetCpa = Number(overrideData.targetCpaInput || targetCpaInput) || 3.2;

          if (api?.simulation?.calculateTargetGrades) {
            res = await api.simulation.calculateTargetGrades({ targetCpa });
          } else {
            // Mock engine tính ngược điểm cần đạt
            const currentCpa = 2.45;
            const earnedCredits = 68;
            const totalCredits = 135;
            const remainingCredits = totalCredits - earnedCredits; // 67 TC

            const requiredTotalPoints = targetCpa * totalCredits - currentCpa * earnedCredits;
            const requiredAverageGpa = Number((requiredTotalPoints / remainingCredits).toFixed(2));
            const achievable = requiredAverageGpa <= 4.0;

            let targetRankLabel = 'Bằng Khá (CPA ≥ 2.50)';
            if (targetCpa >= 3.6) targetRankLabel = 'Bằng Xuất sắc (CPA ≥ 3.60)';
            else if (targetCpa >= 3.2) targetRankLabel = 'Bằng Giỏi (CPA ≥ 3.20)';

            let allocationSummary = '';
            if (requiredAverageGpa >= 3.6) {
              allocationSummary =
                'Yêu cầu rất cao: Cần tối thiểu 80% môn đạt điểm A (4.0), 20% môn đạt điểm B+ (3.5), không được có môn nào dưới B+.';
            } else if (requiredAverageGpa >= 3.3) {
              allocationSummary =
                'Cần tối thiểu 60% môn đạt điểm A (4.0), 40% môn đạt điểm B+ (3.5), không có môn nào dưới B (3.0).';
            } else {
              allocationSummary = 'Cần duy trì mức điểm B và B+ đồng đều trên tất cả các học phần còn lại.';
            }

            res = {
              currentCpa,
              targetCpa,
              targetRankLabel,
              remainingCredits,
              requiredAverageGpa,
              achievable,
              allocationSummary,
              courseRequirements: [
                {
                  courseCode: 'IT4001',
                  courseName: 'Cơ sở dữ liệu nâng cao',
                  credits: 3,
                  requiredGrade: requiredAverageGpa >= 3.4 ? 'A (4.0)' : 'B+ (3.5)',
                  rationale: 'Môn chuyên ngành cốt lõi cần đạt điểm cao để giữ nhịp GPA'
                },
                {
                  courseCode: 'IT6002',
                  courseName: 'Lập trình mạng',
                  credits: 3,
                  requiredGrade: requiredAverageGpa >= 3.4 ? 'B+ (3.5)' : 'B (3.0)',
                  rationale: 'Duy trì chuẩn GPA trung bình các kỳ còn lại'
                }
              ]
            };
          }
        } else if (toolId === 'accelerate') {
          res = {
            mode: 'ACCELERATED_3_5_YEARS',
            targetTimeline: '3.5 năm (Tốt nghiệp sớm 1 học kỳ chính)',
            summerCredits: 4,
            maxSummerCredits: 8,
            regularSemesters: 2,
            savedMonths: 6,
            rationale:
              'Đẩy học phần Thực tập doanh nghiệp (4 TC) vào kỳ hè giúp giải phóng thời gian làm Khóa luận ở Kỳ 8.'
          };
        }

        // KIỂM TRA SEQUENCE ID ĐỂ BỎ RESPONSE CŨ ĐẾN MUỘN (OUT-OF-ORDER DROP)
        if (currentRequestId !== requestIdRef.current) {
          // Bỏ qua response này vì đã có request mới hơn được phát đi
          return;
        }

        setResult(res);
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) return;
        setError({
          code: 'SIMULATION_ERROR',
          message: err?.message || 'Có lỗi xảy ra trong quá trình tính toán kịch bản What-if.',
          details: [err?.message]
        });
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
          setIsDebouncing(false);
        }
      }
    },
    [api, maxRetakeCourses, retakeCandidates, simCourses, targetCpaInput]
  );

  // Kích hoạt debounce khi người dùng thay đổi dữ liệu nhập liên tiếp
  const scheduleDebouncedSimulation = useCallback(
    (toolId, overrideData = {}) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setIsDebouncing(true);
      debounceTimerRef.current = setTimeout(() => {
        executeSimulation(toolId, overrideData);
      }, 300); // Debounce 300ms
    },
    [executeSimulation]
  );

  // Tự động tính toán khi chuyển đổi công cụ
  useEffect(() => {
    setResult(null);
    setError(null);
    executeSimulation(activeTool);
  }, [activeTool, executeSimulation]);

  // ========================================================
  // XỬ LÝ SỰ KIỆN TỪNG CÔNG CỤ
  // ========================================================

  // Tool 1: Thay đổi điểm môn học
  const handleGradeChange = (courseCode, newGrade) => {
    const nextCourses = simCourses.map((c) =>
      c.courseCode === courseCode ? { ...c, expectedGrade: newGrade } : c
    );
    setSimCourses(nextCourses);
    scheduleDebouncedSimulation('grades', { simCourses: nextCourses });
  };

  // Tool 2: Bật/tắt chọn môn cải thiện
  const handleToggleRetakeCourse = (courseCode) => {
    const nextCandidates = retakeCandidates.map((c) =>
      c.courseCode === courseCode ? { ...c, selected: !c.selected } : c
    );
    setRetakeCandidates(nextCandidates);
    scheduleDebouncedSimulation('retake', { retakeCandidates: nextCandidates });
  };

  // Tool 2: Thay đổi điểm mục tiêu môn cải thiện
  const handleRetakeGradeChange = (courseCode, targetGrade) => {
    const nextCandidates = retakeCandidates.map((c) =>
      c.courseCode === courseCode ? { ...c, targetGrade } : c
    );
    setRetakeCandidates(nextCandidates);
    scheduleDebouncedSimulation('retake', { retakeCandidates: nextCandidates });
  };

  // Tool 3: Thay đổi CPA mục tiêu
  const handleTargetCpaChange = (value) => {
    setTargetCpaInput(value);
    scheduleDebouncedSimulation('target', { targetCpaInput: value });
  };

  // ========================================================
  // HÀNH ĐỘNG: ÁP DỤNG VÀO PLANNER (XEM LẠI, KHÔNG SỬA ACTIVE)
  // ========================================================
  const handleApplyToPlanner = useCallback(() => {
    if (!result) return;

    const basePlan = plannerStore.getPlan();
    const updatedPlan = JSON.parse(JSON.stringify(basePlan));

    let proposalTitle = 'What-if: Giả lập điểm kỳ tới';

    if (activeTool === 'grades') {
      proposalTitle = 'What-if: Giả lập điểm kỳ 7';
      if (updatedPlan.semesters?.[0]) {
        updatedPlan.semesters[0].expectedGpa = result.expectedGpa || 3.44;
        // Cập nhật điểm mục tiêu từng môn vào Kỳ 7
        if (Array.isArray(result.courses)) {
          updatedPlan.semesters[0].courses = result.courses.map((c) => ({
            ...c,
            targetGrade: `${c.expectedGrade} (${GRADE_POINTS_MAP[c.expectedGrade] || 3.0})`,
            courseType: 'Giả lập What-if'
          }));
        }
      }
      updatedPlan.projectedCpa = result.projectedCpa || 2.58;
      updatedPlan.projectedRank = result.rankChange || 'Bằng Khá';
    } else if (activeTool === 'retake') {
      proposalTitle = 'What-if: Bổ sung môn học cải thiện ROI';
      const selectedCourses = retakeCandidates.filter((c) => c.selected);

      if (updatedPlan.semesters?.[0]) {
        // Đưa các môn cải thiện vào Kỳ 7
        const existingCodes = new Set(updatedPlan.semesters[0].courses.map((c) => c.courseCode));
        for (const item of selectedCourses) {
          if (!existingCodes.has(item.courseCode)) {
            updatedPlan.semesters[0].courses.push({
              courseCode: item.courseCode,
              courseName: item.courseName,
              credits: item.credits,
              courseType: 'Học cải thiện (ROI)',
              targetGrade: `${item.targetGrade} (${GRADE_POINTS_MAP[item.targetGrade] || 4.0})`,
              rationale: item.rationale
            });
          }
        }
        updatedPlan.semesters[0].totalCredits = updatedPlan.semesters[0].courses.reduce(
          (sum, c) => sum + Number(c.credits || 0),
          0
        );
      }
      updatedPlan.projectedCpa = Number((2.45 + (result.totalPotentialCpaGain || 0.16)).toFixed(2));
    } else if (activeTool === 'target') {
      proposalTitle = `What-if: Lộ trình mục tiêu CPA ${result.targetCpa || 3.2}`;
      updatedPlan.targetCpa = result.targetCpa || 3.2;
      updatedPlan.projectedCpa = result.targetCpa || 3.2;
      if (updatedPlan.semesters?.[0]) {
        updatedPlan.semesters[0].expectedGpa = result.requiredAverageGpa || 3.42;
      }
    } else if (activeTool === 'accelerate') {
      proposalTitle = 'What-if: Phương án học vượt 3.5 năm';
      updatedPlan.version = 'v2.4 (Học vượt 3.5 năm)';
    }

    // Đẩy phương án vào incomingProposal của plannerStore (KHÔNG sửa ACTIVE, KHÔNG sửa bảng điểm)
    plannerStore.setIncomingProposal(updatedPlan, proposalTitle);
    showToast(
      '✓ Đã áp dụng tạo phương án đề xuất cho Planner! Hãy mở Planner để xem lại và quyết định lưu nháp hoặc kích hoạt.'
    );

    if (typeof onNavigate === 'function') {
      onNavigate('/planner');
    }
  }, [activeTool, onNavigate, result, retakeCandidates, showToast]);

  // ========================================================
  // HÀNH ĐỘNG: THOÁT / HỦY THỬ NGHIỆM
  // ========================================================
  const handleExitSimulation = useCallback(() => {
    // Reset trạng thái What-if, hủy bỏ proposal dở (nếu có)
    setResult(null);
    setError(null);
    plannerStore.dismissProposal();
    showToast('Đã thoát chế độ thử nghiệm What-if. Bảng điểm và bản kế hoạch ACTIVE được bảo toàn nguyên vẹn.');

    if (typeof onNavigate === 'function') {
      onNavigate('/planner');
    }
  }, [onNavigate, showToast]);

  // ========================================================
  // RENDER SECTIONS
  // ========================================================

  // Header
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
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement(
          'h2',
          { style: { fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 } },
          'Mô phỏng & Cải thiện điểm số (What-if Simulator)'
        ),
        isDebouncing
          ? React.createElement(
              'span',
              {
                style: {
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#dbeafe',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }
              },
              'Đang cập nhật...'
            )
          : null
      ),
      React.createElement(
        'p',
        { style: { color: '#475569', marginTop: '4px', fontSize: '14px' } },
        'Nhóm 3 công cụ: Giả lập điểm kỳ tới (Màn 6), Tối ưu ROI học cải thiện (Màn 7) và Tính điểm mục tiêu ngược (Màn 8).'
      )
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: '8px' } },
      Button
        ? React.createElement(
            Button,
            { variant: 'ghost', size: 'sm', onClick: handleExitSimulation },
            'Thoát thử nghiệm'
          )
        : null,
      Button
        ? React.createElement(
            Button,
            {
              variant: 'secondary',
              size: 'sm',
              onClick: () => executeSimulation(activeTool)
            },
            '⚡ Tính toán ngay'
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
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        },
        React.createElement('span', null, toastMessage),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => setToastMessage(''),
            style: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }
          },
          '×'
        )
      )
    : null;

  // Thanh chọn trực tiếp 3 công cụ (Direct entry tabs)
  const toolSelector = React.createElement(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }
    },
    WHAT_IF_TOOLS.map((t) => {
      const isActive = activeTool === t.id;
      return React.createElement(
        'div',
        {
          key: t.id,
          onClick: () => setActiveTool(t.id),
          style: {
            padding: '14px 16px',
            borderRadius: '16px',
            cursor: 'pointer',
            background: isActive ? '#ffffff' : '#f8fafc',
            border: isActive ? '2px solid #0f172a' : '1px solid #e2e8f0',
            boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease'
          }
        },
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          React.createElement('span', { style: { fontSize: '16px' } }, t.icon),
          React.createElement('strong', { style: { fontSize: '13px', color: '#0f172a' } }, t.name)
        ),
        React.createElement(
          'p',
          { style: { margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' } },
          t.description
        )
      );
    })
  );

  return React.createElement(
    'div',
    { className: 'haui-page-container haui-whatif-page', style: { padding: '24px 0' } },
    headerSection,
    toastBar,
    toolSelector,

    // KHUNG THIẾT LẬP THAM SỐ CÔNG CỤ HIỆN TẠI
    Card
      ? React.createElement(
          Card,
          {
            title: `Cấu hình: ${WHAT_IF_TOOLS.find((t) => t.id === activeTool)?.name}`,
            subtitle: 'Thay đổi điểm số/mục tiêu để hệ thống tự động debounce và tính toán lại.',
            variant: 'default',
            padding: 'md'
          },

          // ----------------------------------------------------
          // CÔNG CỤ 1: GIẢ LẬP ĐIỂM KỲ TỚI (MÀN 6)
          // ----------------------------------------------------
          activeTool === 'grades'
            ? React.createElement(
                'div',
                null,
                React.createElement(
                  'p',
                  { style: { fontSize: '13px', color: '#64748b', marginTop: 0 } },
                  'Chọn điểm số dự kiến cho từng học phần của Học kỳ 7 để kiểm tra tác động lên CPA tích lũy:'
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '10px'
                    }
                  },
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
                        React.createElement(
                          'strong',
                          { style: { fontSize: '13px', color: '#0284c7' } },
                          `${c.courseCode} `
                        ),
                        React.createElement('span', { style: { fontSize: '12px', fontWeight: 500 } }, c.courseName),
                        React.createElement(
                          'div',
                          { style: { fontSize: '11px', color: '#64748b' } },
                          `${c.credits} tín chỉ`
                        )
                      ),
                      React.createElement(
                        'select',
                        {
                          value: c.expectedGrade,
                          onChange: (e) => handleGradeChange(c.courseCode, e.target.value),
                          style: {
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1.5px solid #cbd5e1',
                            fontWeight: 700,
                            color: '#16a34a',
                            background: '#ffffff',
                            cursor: 'pointer'
                          }
                        },
                        Object.keys(GRADE_POINTS_MAP).map((g) =>
                          React.createElement('option', { key: g, value: g }, `Điểm ${g}`)
                        )
                      )
                    )
                  )
                )
              )
            : null,

          // ----------------------------------------------------
          // CÔNG CỤ 2: TỐI ƯU ROI HỌC CẢI THIỆN (MÀN 7)
          // ----------------------------------------------------
          activeTool === 'retake'
            ? React.createElement(
                'div',
                null,
                React.createElement(
                  'p',
                  { style: { fontSize: '13px', color: '#64748b', marginTop: 0 } },
                  'Danh sách môn điểm D, D+, C hoặc F đã hoàn thành. Tích chọn các môn muốn đưa vào kế hoạch cải thiện:'
                ),
                React.createElement(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                  retakeCandidates.map((item) =>
                    React.createElement(
                      'div',
                      {
                        key: item.courseCode,
                        style: {
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: item.selected ? '#f0fdf4' : '#f8fafc',
                          border: item.selected ? '1.5px solid #22c55e' : '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }
                      },
                      React.createElement(
                        'div',
                        { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                        React.createElement('input', {
                          type: 'checkbox',
                          checked: Boolean(item.selected),
                          onChange: () => handleToggleRetakeCourse(item.courseCode),
                          style: { width: '18px', height: '18px', cursor: 'pointer' }
                        }),
                        React.createElement(
                          'div',
                          null,
                          React.createElement(
                            'div',
                            { style: { fontWeight: 700, fontSize: '13px', color: '#0f172a' } },
                            `${item.courseName} (${item.courseCode})`
                          ),
                          React.createElement(
                            'div',
                            { style: { fontSize: '12px', color: '#64748b', marginTop: '2px' } },
                            `${item.credits} tín chỉ · Điểm hiện tại: `,
                            React.createElement('strong', { style: { color: '#dc2626' } }, item.currentGrade),
                            ` · ${item.rationale}`
                          )
                        )
                      ),
                      React.createElement(
                        'div',
                        { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                        React.createElement(
                          'div',
                          { style: { textAlign: 'right' } },
                          React.createElement(
                            'div',
                            { style: { fontSize: '11px', color: '#64748b' } },
                            'Mục tiêu cải thiện:'
                          ),
                          React.createElement(
                            'select',
                            {
                              value: item.targetGrade,
                              onChange: (e) => handleRetakeGradeChange(item.courseCode, e.target.value),
                              style: {
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 700,
                                color: '#16a34a'
                              }
                            },
                            ['A', 'B+', 'B', 'C+'].map((g) =>
                              React.createElement('option', { key: g, value: g }, `Lên ${g}`)
                            )
                          )
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              padding: '4px 10px',
                              borderRadius: '8px',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '11px',
                              fontWeight: 700
                            }
                          },
                          item.badge
                        )
                      )
                    )
                  )
                )
              )
            : null,

          // ----------------------------------------------------
          // CÔNG CỤ 3: TÍNH ĐIỂM MỤC TIÊU NGƯỢC (MÀN 8)
          // ----------------------------------------------------
          activeTool === 'target'
            ? React.createElement(
                'div',
                null,
                React.createElement(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
                  React.createElement(
                    'label',
                    { style: { fontSize: '13px', fontWeight: 600 } },
                    'CPA Mục tiêu tốt nghiệp mong muốn:'
                  ),
                  React.createElement('input', {
                    type: 'number',
                    step: '0.05',
                    min: '2.00',
                    max: '4.00',
                    value: targetCpaInput,
                    onChange: (e) => handleTargetCpaChange(e.target.value),
                    style: {
                      width: '100px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontWeight: 700,
                      fontSize: '14px'
                    }
                  }),
                  React.createElement(
                    'div',
                    { style: { display: 'flex', gap: '6px' } },
                    ['2.80', '3.20', '3.60'].map((preset) =>
                      React.createElement(
                        'button',
                        {
                          key: preset,
                          type: 'button',
                          onClick: () => handleTargetCpaChange(preset),
                          style: {
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: '1px solid #cbd5e1',
                            background: targetCpaInput === preset ? '#0f172a' : '#f1f5f9',
                            color: targetCpaInput === preset ? '#ffffff' : '#334155',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }
                        },
                        `${preset} (${preset === '3.60' ? 'Xuất sắc' : preset === '3.20' ? 'Giỏi' : 'Khá'})`
                      )
                    )
                  )
                ),
                React.createElement(
                  'p',
                  { style: { fontSize: '12px', color: '#64748b', marginTop: '10px' } },
                  'Hệ thống tự động tính toán tổng số tín chỉ còn lại và phân bổ điểm số trung bình tối thiểu cần đạt.'
                )
              )
            : null,

          // ----------------------------------------------------
          // CÔNG CỤ 4: HỌC VƯỢT 3.5 NĂM
          // ----------------------------------------------------
          activeTool === 'accelerate'
            ? React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                React.createElement(
                  'label',
                  { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 } },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: enableSummerAccelerate,
                    onChange: (e) => {
                      setEnableSummerAccelerate(e.target.checked);
                      scheduleDebouncedSimulation('accelerate');
                    }
                  }),
                  'Đăng ký học phần Thực tập doanh nghiệp (4 TC) vào Kỳ hè 2027 (Tối đa 8 TC/kỳ phụ theo quy chế HaUI)'
                )
              )
            : null
        )
      : null,

    // ========================================================
    // KHỐI KẾT QUẢ MÔ PHỎNG WHAT-IF
    // ========================================================
    React.createElement(
      'div',
      { style: { marginTop: '20px' } },
      loading
        ? Loading
          ? React.createElement(Loading, { variant: 'spinner', size: 'lg', label: 'Đang tính toán mô phỏng kịch bản...' })
          : React.createElement('div', null, 'Đang tính toán...')
        : error
          ? ErrorBox
            ? React.createElement(ErrorBox, {
                title: 'Lỗi mô phỏng kịch bản',
                error,
                message: error?.message,
                onRetry: () => executeSimulation(activeTool)
              })
            : React.createElement('div', { style: { color: 'red' } }, error?.message)
          : !result
            ? EmptyState
              ? React.createElement(EmptyState, {
                  title: 'Chưa có kết quả mô phỏng',
                  description: 'Thay đổi tham số hoặc bấm "Tính toán ngay" để xem kết quả.',
                  actionLabel: 'Tính toán ngay',
                  onAction: () => executeSimulation(activeTool)
                })
              : React.createElement('div', null, 'Chưa có kết quả.')
            : Card
              ? React.createElement(
                  Card,
                  {
                    title: '📊 Kết quả Phân tích & Dự báo Mô phỏng',
                    subtitle: 'Kết quả dựa trên thuật toán tối ưu học vụ HaUI (Không gọi AI)',
                    variant: 'status-success',
                    headerAction: Button
                      ? React.createElement(
                          Button,
                          {
                            variant: 'primary',
                            size: 'sm',
                            onClick: handleApplyToPlanner
                          },
                          '📥 Áp dụng vào Kế hoạch học tập (Xem lại tại Planner)'
                        )
                      : null
                  },

                  // KẾT QUẢ CÔNG CỤ 1: GIẢ LẬP ĐIỂM
                  activeTool === 'grades'
                    ? React.createElement(
                        'div',
                        null,
                        React.createElement(
                          'div',
                          { style: { display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '14px' } },
                          React.createElement(
                            'div',
                            null,
                            React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'CPA Hiện tại'),
                            React.createElement('strong', { style: { fontSize: '20px', color: '#475569' } }, result.currentCpa ?? 2.45)
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'GPA Kỳ tới dự phóng'),
                            React.createElement('strong', { style: { fontSize: '20px', color: '#0284c7' } }, result.expectedGpa ?? result.projectedSemesterGpa ?? 3.44)
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'CPA Tích lũy mới'),
                            React.createElement(
                              'strong',
                              { style: { fontSize: '20px', color: '#16a34a' } },
                              `${result.projectedCpa ?? result.projectedNewCpa} `
                            ),
                            React.createElement(
                              'span',
                              { style: { fontSize: '13px', color: '#16a34a', fontWeight: 600 } },
                              `(+${result.cpaDelta ?? result.cpaDifference})`
                            )
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'Chuyển biến xếp loại'),
                            React.createElement('strong', { style: { fontSize: '14px', color: '#0f172a' } }, result.rankChange)
                          )
                        ),
                        React.createElement(
                          'p',
                          { style: { fontSize: '12px', color: '#64748b', margin: 0 } },
                          '💡 Bấm "Áp dụng vào Kế hoạch học tập" để tạo đề xuất nạp vào Study Planner để bạn xem lại (bản ACTIVE và bảng điểm giữ nguyên).'
                        )
                      )
                    : null,

                  // KẾT QUẢ CÔNG CỤ 2: RETAKE ROI
                  activeTool === 'retake'
                    ? React.createElement(
                        'div',
                        null,
                        React.createElement(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              gap: '16px',
                              marginBottom: '14px',
                              padding: '10px 14px',
                              background: '#f8fafc',
                              borderRadius: '8px'
                            }
                          },
                          React.createElement(
                            'div',
                            null,
                            React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, 'Số môn đã chọn cải thiện: '),
                            React.createElement('strong', null, `${result.selectedCount ?? 2} môn`)
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, 'Tổng tín chỉ học lại: '),
                            React.createElement('strong', null, `${result.totalRetakeCredits ?? 7} TC`)
                          ),
                          React.createElement(
                            'div',
                            null,
                            React.createElement('span', { style: { fontSize: '12px', color: '#64748b' } }, 'CPA Tăng thêm tổng cộng: '),
                            React.createElement(
                              'strong',
                              { style: { color: '#16a34a' } },
                              `+${result.totalPotentialCpaGain ?? 0.16} CPA`
                            )
                          )
                        ),
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
                                  background: item.selected ? '#ffffff' : '#f9fafb',
                                  border: item.selected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }
                              },
                              React.createElement(
                                'div',
                                null,
                                React.createElement(
                                  'strong',
                                  { style: { color: '#0f172a' } },
                                  `${item.courseName} (${item.courseCode})`
                                ),
                                React.createElement(
                                  'div',
                                  { style: { fontSize: '12px', color: '#64748b', marginTop: '2px' } },
                                  `${item.credits} tín chỉ · Từ ${item.currentGrade} lên ${item.targetGrade} · ${item.rationale}`
                                )
                              ),
                              React.createElement(
                                'div',
                                { style: { textAlign: 'right' } },
                                React.createElement(
                                  'strong',
                                  { style: { color: '#16a34a', fontSize: '14px' } },
                                  `+${item.cpaDelta ?? item.potentialCpaGain} CPA`
                                ),
                                item.roi
                                  ? React.createElement(
                                      'div',
                                      { style: { fontSize: '11px', color: '#64748b' } },
                                      `ROI: ${(item.roi * 100).toFixed(1)}%/TC`
                                    )
                                  : null,
                                React.createElement(
                                  'div',
                                  { style: { fontSize: '11px', color: '#0284c7', fontWeight: 600 } },
                                  item.badge
                                )
                              )
                            )
                          )
                        )
                      )
                    : null,

                  // KẾT QUẢ CÔNG CỤ 3: TARGET GRADES
                  activeTool === 'target'
                    ? React.createElement(
                        'div',
                        null,
                        React.createElement(
                          'div',
                          { style: { fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' } },
                          `Mục tiêu CPA: ${result.targetCpa} (${result.targetRankLabel})`
                        ),
                        React.createElement(
                          'div',
                          {
                            style: {
                              padding: '12px 14px',
                              borderRadius: '10px',
                              background: result.achievable ? '#f0fdf4' : '#fef2f2',
                              border: result.achievable ? '1px solid #86efac' : '1px solid #fca5a5',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: result.achievable ? '#15803d' : '#b91c1c'
                            }
                          },
                          result.achievable
                            ? `✓ Khả thi: Cần đạt GPA trung bình tối thiểu ${result.requiredAverageGpa} trong ${result.remainingCredits} tín chỉ còn lại.`
                            : `⚠️ Rất thử thách: Đòi hỏi GPA trung bình ${result.requiredAverageGpa} > 4.0. Cần kết hợp học cải thiện các môn điểm D/D+ để kéo CPA.`
                        ),
                        React.createElement(
                          'p',
                          { style: { fontSize: '12px', color: '#475569', marginTop: '10px' } },
                          result.allocationSummary
                        ),
                        result.courseRequirements && result.courseRequirements.length > 0
                          ? React.createElement(
                              'div',
                              { style: { marginTop: '12px' } },
                              React.createElement(
                                'div',
                                { style: { fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' } },
                                'Gợi ý phân bổ điểm các môn then chốt:'
                              ),
                              result.courseRequirements.map((cr) =>
                                React.createElement(
                                  'div',
                                  {
                                    key: cr.courseCode,
                                    style: {
                                      fontSize: '12px',
                                      padding: '6px 10px',
                                      background: '#f8fafc',
                                      borderRadius: '6px',
                                      marginBottom: '4px',
                                      display: 'flex',
                                      justifyContent: 'space-between'
                                    }
                                  },
                                  React.createElement(
                                    'span',
                                    null,
                                    `${cr.courseCode} - ${cr.courseName} (${cr.credits} TC)`
                                  ),
                                  React.createElement(
                                    'strong',
                                    { style: { color: '#0284c7' } },
                                    `Cần: ${cr.requiredGrade}`
                                  )
                                )
                              )
                            )
                          : null
                      )
                    : null,

                  // KẾT QUẢ CÔNG CỤ 4: HỌC VƯỢT
                  activeTool === 'accelerate'
                    ? React.createElement(
                        'div',
                        null,
                        React.createElement(
                          'div',
                          { style: { fontSize: '15px', fontWeight: 700, color: '#16a34a' } },
                          `✓ Khả thi tốt nghiệp trong ${result.targetTimeline}`
                        ),
                        React.createElement(
                          'p',
                          { style: { fontSize: '13px', color: '#475569', marginTop: '4px' } },
                          result.rationale
                        ),
                        React.createElement(
                          'div',
                          { style: { fontSize: '12px', color: '#64748b' } },
                          `Đăng ký ${result.summerCredits} TC học phần Thực tập doanh nghiệp vào kỳ hè giúp rút ngắn 1 kỳ học chính.`
                        )
                      )
                    : null
                )
              : null
    )
  );
}

export default WhatIfSimulatorPage;
