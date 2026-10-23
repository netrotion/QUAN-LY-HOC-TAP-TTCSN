import React, { useState, useCallback, useEffect, useRef } from 'react';
import { plannerStore, PLAN_STATUSES } from '../services/plannerStore.js';
import * as plannerApi from '../services/plannerApiService.js';

const h = React.createElement;

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
  { courseCode: 'IT2001', courseName: 'Lập trình hướng đối tượng (Java)', credits: 4, expectedGrade: 'A', note: 'Bắt buộc cơ sở ngành' },
  { courseCode: 'IT6080', courseName: 'Đồ án chuyên ngành', credits: 3, expectedGrade: 'A', note: 'Bắt buộc • Đồ án tốt nghiệp nền tảng' },
  { courseCode: 'IT6035', courseName: 'Kiểm thử và đảm bảo chất lượng', credits: 3, expectedGrade: 'B+', note: 'Bắt buộc chuyên ngành' },
  { courseCode: 'IT6042', courseName: 'Kiến trúc & Thiết kế hệ thống', credits: 3, expectedGrade: 'A', note: 'Bắt buộc cốt lõi chuyên ngành' },
  { courseCode: 'IT6050', courseName: 'Quản lý dự án chuyên ngành', credits: 3, expectedGrade: 'B+', note: 'Môn cơ sở ngành tự chọn' },
  { courseCode: 'IT6071', courseName: 'Phát triển ứng dụng chuyên ngành', credits: 3, expectedGrade: 'B', note: 'Tự chọn định hướng' },
  { courseCode: 'FL6006', courseName: 'Tiếng Anh chuyên ngành nâng cao 2', credits: 3, expectedGrade: 'B+', note: 'Điều kiện ngoại ngữ chuẩn đầu ra' },
  { courseCode: 'MATH1002', courseName: 'Toán rời rạc / Toán chuyên ngành', credits: 3, expectedGrade: 'B', note: 'Môn nợ tiên quyết cần gỡ' }
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
 * Tái thiết kế toàn diện theo Stitch Prototype `gpa_simulator/code.html` thuần JavaScript:
 * - 100% không dùng thẻ JSX để tương thích tuyệt đối mọi bundler (Vite / Webpack / Node.js test runner)
 * - Layout 2 cột: 7 cols (Left Panel) & 5 cols (Right Panel)
 * - 4 Thẻ KPI thống kê chuẩn (CPA thực tế, CPA mô phỏng nền đen, Mục tiêu đặt ra, Tổng tín chỉ)
 * - Hộp Sandbox Mode an toàn
 * - Biểu đồ SVG tiến trình CPA: Đường thực tế (nét liền) + Đường mô phỏng (nét đứt) + Ngưỡng Giỏi 3.20
 * - Đo lường độ nhạy & độ khả thi kịch bản (85%)
 * - Danh sách 3 kịch bản đã lưu
 * - Giữ nguyên 100% logic nghiệp vụ, debounce 300ms, sequence tracking và giao thức Store
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

  // Xác định công cụ khởi đầu
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

  useEffect(() => {
    if (tool && WHAT_IF_TOOLS.some((t) => t.id === tool)) {
      setActiveTool(tool);
    }
  }, [tool]);

  // State tham số 3 công cụ
  const [simCourses, setSimCourses] = useState(() => DEFAULT_SIM_COURSES.map((c) => ({ ...c })));
  const [enableOptionalRetake, setEnableOptionalRetake] = useState(true);
  const [retakeCandidates, setRetakeCandidates] = useState(() =>
    DEFAULT_RETAKE_CANDIDATES.map((c) => ({ ...c }))
  );
  const [maxRetakeCourses, setMaxRetakeCourses] = useState(3);
  const [targetCpaInput, setTargetCpaInput] = useState('3.20');
  const [enableSummerAccelerate, setEnableSummerAccelerate] = useState(true);

  // Debounce & Sequence tracking
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Động cơ mô phỏng What-if (không gọi AI / LLM)
  const executeSimulation = useCallback(
    async (toolId, overrideData = {}) => {
      const currentRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        let res = null;

        if (toolId === 'grades') {
          const coursesToSimulate = overrideData.simCourses || simCourses;
          if (api && (api.simulation?.simulateGrades || typeof api.post === 'function')) {
            const apiRes = await plannerApi.simulateGrades(api, {
              courses: coursesToSimulate.map((c) => ({
                courseCode: c.courseCode,
                credits: Number(c.credits) || 3,
                expectedGrade: c.expectedGrade,
                expectedGradePoints: GRADE_POINTS_MAP[c.expectedGrade] ?? 3.0
              }))
            });

            const projCpa = apiRes.projectedCpa ?? null;
            let rankChange = 'Duy trì Khá';
            if (projCpa !== null) {
              if (projCpa >= 3.6) rankChange = 'Đạt Bằng Xuất sắc (CPA ≥ 3.60)';
              else if (projCpa >= 3.2) rankChange = 'Chính thức đạt ngưỡng Bằng Giỏi (CPA ≥ 3.20)';
              else if (projCpa >= 2.5) rankChange = 'Xếp loại Khá (CPA ≥ 2.50)';
            }

            res = {
              currentCpa: apiRes.currentCpa ?? null,
              expectedGpa: apiRes.expectedGpa ?? null,
              projectedCpa: projCpa,
              cpaDelta: apiRes.cpaDelta ?? null,
              rankChange,
              totalCredits: coursesToSimulate.reduce((sum, c) => sum + Number(c.credits || 0), 0),
              courses: coursesToSimulate,
              policyVersion: apiRes.policyVersion || null,
              dataRevision: apiRes.dataRevision || null
            };
          } else {
            const sessionStudent = api?.getConfig?.()?.sessionStudent || null;
            const currentCpa = sessionStudent?.cpa !== null && sessionStudent?.cpa !== undefined ? Number(sessionStudent.cpa) : 3.18;
            const currentCredits = sessionStudent?.accumulatedCredits !== null && sessionStudent?.accumulatedCredits !== undefined ? Number(sessionStudent.accumulatedCredits) : 108;

            const totalCredits = coursesToSimulate.reduce((sum, c) => sum + Number(c.credits || 0), 0);
            const totalPoints = coursesToSimulate.reduce(
              (sum, c) => sum + Number(c.credits || 0) * (GRADE_POINTS_MAP[c.expectedGrade] ?? 3.0),
              0
            );
            const expectedGpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 3.0;

            const projectedCpa = Number(
              ((currentCpa * currentCredits + totalPoints) / (currentCredits + totalCredits)).toFixed(2)
            );
            const cpaDelta = Number((projectedCpa - currentCpa).toFixed(2));

            let rankChange = 'Duy trì Khá';
            if (projectedCpa >= 3.6) rankChange = 'Đạt Bằng Xuất sắc (CPA ≥ 3.60)';
            else if (projectedCpa >= 3.2) rankChange = 'Chính thức đạt ngưỡng Bằng Giỏi (CPA ≥ 3.20)';
            else if (projectedCpa >= 2.5) rankChange = 'Xếp loại Khá (CPA ≥ 2.50)';

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

          if (api && (api.simulation?.rankRetake || typeof api.post === 'function')) {
            const apiRes = await plannerApi.rankRetakeCourses(api, {
              maxSuggestions: Number(maxCourses) || 3
            });
            const recommendations = (apiRes.recommendations || []).map((rec, idx) => ({
              ...rec,
              selected: idx < 2,
              badge: idx === 0 ? 'Khuyên dùng số 1 (ROI cao nhất)' : `Khuyên dùng số ${idx + 1}`
            }));
            const selectedCount = recommendations.filter((r) => r.selected).length;
            const totalRetakeCredits = recommendations
              .filter((r) => r.selected)
              .reduce((sum, r) => sum + (Number(r.credits) || 0), 0);
            const totalPotentialCpaGain = Number(
              recommendations
                .filter((r) => r.selected)
                .reduce((sum, r) => sum + (Number(r.cpaDelta) || 0), 0)
                .toFixed(2)
            );

            res = {
              recommendations,
              selectedCount,
              totalRetakeCredits,
              totalPotentialCpaGain,
              policyVersion: apiRes.policyVersion || null,
              dataRevision: apiRes.dataRevision || null
            };
          } else {
            const ranked = candidates
              .map((item) => {
                const targetPoints = GRADE_POINTS_MAP[item.targetGrade] ?? 4.0;
                const currentPoints = item.currentGradePoints ?? 1.0;
                const pointGain = Math.max(0, targetPoints - currentPoints);
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

          if (api && (api.simulation?.calculateTargetGrades || typeof api.post === 'function')) {
            const apiRes = await plannerApi.calculateTargetGrades(api, {
              targetCpa,
              targetGraduationSemester: '2026_1'
            });

            const reqAvg = apiRes.requiredAverageGpa ?? null;
            const achievable = reqAvg !== null ? reqAvg <= 4.0 : false;

            let targetRankLabel = 'Bằng Khá (CPA ≥ 2.50)';
            if (targetCpa >= 3.6) targetRankLabel = 'Bằng Xuất sắc (CPA ≥ 3.60)';
            else if (targetCpa >= 3.2) targetRankLabel = 'Bằng Giỏi (CPA ≥ 3.20)';

            let allocationSummary = '';
            if (reqAvg === null) {
              allocationSummary = 'Chưa xác định được điểm trung bình do thiếu thông tin tín chỉ tích lũy.';
            } else if (reqAvg > 4.0) {
              allocationSummary = 'Mục tiêu không khả thi: Cần GPA vượt quá 4.00 trên các tín chỉ còn lại.';
            } else if (reqAvg >= 3.6) {
              allocationSummary =
                'Yêu cầu rất cao: Cần tối thiểu 80% môn đạt điểm A (4.0), 20% môn đạt điểm B+ (3.5), không được có môn nào dưới B+.';
            } else if (reqAvg >= 3.3) {
              allocationSummary =
                'Cần tối thiểu 60% môn đạt điểm A (4.0), 40% môn đạt điểm B+ (3.5), không có môn nào dưới B (3.0).';
            } else {
              allocationSummary = 'Cần duy trì mức điểm B và B+ đồng đều trên tất cả các học phần còn lại.';
            }

            res = {
              currentCpa: apiRes.currentCpa ?? null,
              targetCpa: apiRes.targetCpa ?? targetCpa,
              targetRankLabel,
              remainingCredits: apiRes.remainingCredits ?? null,
              requiredAverageGpa: reqAvg,
              achievable,
              allocationSummary,
              courseRequirements: apiRes.courseRequirements || [],
              warnings: apiRes.warnings || [],
              policyVersion: apiRes.policyVersion || null,
              dataRevision: apiRes.dataRevision || null
            };
          } else {
            const sessionStudent = api?.getConfig?.()?.sessionStudent || null;
            const currentCpa = sessionStudent?.cpa !== null && sessionStudent?.cpa !== undefined ? Number(sessionStudent.cpa) : 3.18;
            const earnedCredits = sessionStudent?.accumulatedCredits !== null && sessionStudent?.accumulatedCredits !== undefined ? Number(sessionStudent.accumulatedCredits) : 108;
            const totalCredits = sessionStudent?.totalCreditsRequired || 145;
            const remainingCredits = Math.max(1, totalCredits - earnedCredits);

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
                  courseCode: 'IT6080',
                  courseName: 'Đồ án chuyên ngành',
                  credits: 3,
                  requiredGrade: requiredAverageGpa >= 3.3 ? 'A (4.0)' : 'B+ (3.5)',
                  rationale: 'Học phần then chốt quyết định ngưỡng CPA Giỏi'
                },
                {
                  courseCode: 'IT6035',
                  courseName: 'Kiểm thử & Đảm bảo chất lượng',
                  credits: 3,
                  requiredGrade: requiredAverageGpa >= 3.3 ? 'B+ (3.5)' : 'B (3.0)',
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

        if (currentRequestId !== requestIdRef.current) return;
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

  // Debounce 300ms
  const scheduleDebouncedSimulation = useCallback(
    (toolId, overrideData = {}) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setIsDebouncing(true);
      debounceTimerRef.current = setTimeout(() => {
        executeSimulation(toolId, overrideData);
      }, 300);
    },
    [executeSimulation]
  );

  // Tự động tính toán khi chuyển tab
  useEffect(() => {
    setResult(null);
    setError(null);
    executeSimulation(activeTool);
  }, [activeTool, executeSimulation]);

  // Lắng nghe sự kiện cập nhật bảng điểm từ TV2 để tính toán lại các chỉ số What-if
  useEffect(() => {
    const handleTranscriptUpdated = () => {
      executeSimulation(activeTool);
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
      return () => window.removeEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
    }
  }, [activeTool, executeSimulation]);

  // Handlers
  const handleGradeChange = (courseCode, newGrade) => {
    const nextCourses = simCourses.map((c) =>
      c.courseCode === courseCode ? { ...c, expectedGrade: newGrade } : c
    );
    setSimCourses(nextCourses);
    scheduleDebouncedSimulation('grades', { simCourses: nextCourses });
  };

  const handleToggleRetakeCourse = (courseCode) => {
    const nextCandidates = retakeCandidates.map((c) =>
      c.courseCode === courseCode ? { ...c, selected: !c.selected } : c
    );
    setRetakeCandidates(nextCandidates);
    scheduleDebouncedSimulation('retake', { retakeCandidates: nextCandidates });
  };

  const handleRetakeGradeChange = (courseCode, targetGrade) => {
    const nextCandidates = retakeCandidates.map((c) =>
      c.courseCode === courseCode ? { ...c, targetGrade } : c
    );
    setRetakeCandidates(nextCandidates);
    scheduleDebouncedSimulation('retake', { retakeCandidates: nextCandidates });
  };

  const handleTargetCpaChange = (value) => {
    setTargetCpaInput(value);
    scheduleDebouncedSimulation('target', { targetCpaInput: value });
  };

  // Áp dụng vào Planner
  const handleApplyToPlanner = useCallback(() => {
    if (!result) return;

    const basePlan = plannerStore.getPlan();
    const updatedPlan = JSON.parse(JSON.stringify(basePlan));
    let proposalTitle = 'What-if: Giả lập điểm kỳ tới';

    if (activeTool === 'grades') {
      proposalTitle = 'What-if: Giả lập điểm kỳ 7';
      if (updatedPlan.semesters?.[0]) {
        updatedPlan.semesters[0].expectedGpa = result.expectedGpa || 3.44;
        if (Array.isArray(result.courses)) {
          updatedPlan.semesters[0].courses = result.courses.map((c) => ({
            ...c,
            targetGrade: `${c.expectedGrade} (${GRADE_POINTS_MAP[c.expectedGrade] || 3.0})`,
            courseType: 'Giả lập What-if'
          }));
        }
      }
      updatedPlan.projectedCpa = result.projectedCpa || 3.31;
      updatedPlan.projectedRank = result.rankChange || 'Bằng Giỏi';
    } else if (activeTool === 'retake') {
      proposalTitle = 'What-if: Bổ sung môn học cải thiện ROI';
      const selectedCourses = retakeCandidates.filter((c) => c.selected);

      if (updatedPlan.semesters?.[0]) {
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
      updatedPlan.projectedCpa = Number((3.18 + (result.totalPotentialCpaGain || 0.16)).toFixed(2));
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

    plannerStore.setIncomingProposal(updatedPlan, proposalTitle);
    showToast(
      '✓ Đã áp dụng tạo phương án đề xuất cho Planner! Hãy mở Planner để xem lại và quyết định lưu nháp hoặc kích hoạt.'
    );

    if (typeof onNavigate === 'function') {
      onNavigate('/planner');
    }
  }, [activeTool, onNavigate, result, retakeCandidates, showToast]);

  // Thoát thử nghiệm
  const handleExitSimulation = useCallback(() => {
    setResult(null);
    setError(null);
    plannerStore.dismissProposal();
    showToast('Đã thoát chế độ thử nghiệm What-if. Bảng điểm và bản kế hoạch ACTIVE được bảo toàn nguyên vẹn.');

    if (typeof onNavigate === 'function') {
      onNavigate('/planner');
    }
  }, [onNavigate, showToast]);

  // Giá trị KPI
  const currentCpaVal = result?.currentCpa ?? 3.18;
  const simulatedCpaVal = result?.projectedCpa ?? result?.projectedNewCpa ?? 3.31;
  const deltaVal = typeof result?.cpaDelta === 'number'
    ? result.cpaDelta
    : (typeof simulatedCpaVal === 'number' && typeof currentCpaVal === 'number')
      ? +(simulatedCpaVal - currentCpaVal).toFixed(2)
      : 0.13;
  const targetCpaVal = parseFloat(targetCpaInput) || 3.20;
  const targetDiff = +(simulatedCpaVal - targetCpaVal).toFixed(2);

  return h(
    'div',
    { className: 'haui-page-container', style: { maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' } },

    // SECTION 1: BREADCRUMB & HEADER
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
      h(
        'nav',
        { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-mid-gray, #737373)' } },
        h(
          'span',
          { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'inherit' } },
          h('span', { className: 'material-symbols-outlined', style: { fontSize: '14px' } }, 'home'),
          'Trang chủ'
        ),
        h('span', { style: { color: 'var(--color-hairline, #e5e5e5)' } }, '/'),
        h('span', { style: { color: 'var(--color-ink, #0a0a0a)', fontWeight: 500 } }, 'What-if mô phỏng điểm')
      ),
      h(
        'div',
        { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', paddingTop: '4px' } },
        h(
          'div',
          null,
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h(
              'h1',
              { style: { fontSize: '30px', fontWeight: 600, color: 'var(--color-ink, #0a0a0a)', margin: 0, letterSpacing: '-0.5px' } },
              'What-if – Mô phỏng kịch bản điểm & Học lực'
            ),
            isDebouncing
              ? h(
                  'span',
                  { style: { fontSize: '11px', fontWeight: 600, color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: '12px' } },
                  'Đang cập nhật...'
                )
              : null
          ),
          h(
            'p',
            { style: { margin: '6px 0 0', fontSize: '14px', color: 'var(--color-mid-gray, #737373)', maxWidth: '780px', lineHeight: 1.5 } },
            'Thử nghiệm các kịch bản cải thiện điểm, dự báo điểm học kỳ tới và đánh giá tác động lên CPA tốt nghiệp mà không làm ảnh hưởng đến bảng điểm thật trên hệ thống.'
          )
        ),
        // Action Buttons Header
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          h(
            'button',
            {
              type: 'button',
              className: 'haui-pill-btn-canvas',
              onClick: () => {
                setSimCourses(DEFAULT_SIM_COURSES.map((c) => ({ ...c })));
                setTargetCpaInput('3.20');
                executeSimulation(activeTool);
                showToast('Đã khôi phục các tham số mặc định.');
              }
            },
            h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'restart_alt'),
            h('span', null, 'Đặt lại mặc định')
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'haui-pill-btn-paper',
              onClick: () => window.print()
            },
            h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'file_download'),
            h('span', null, 'Xuất báo cáo')
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'haui-pill-btn-dark',
              onClick: () => showToast('Đã lưu kịch bản vào bộ nhớ phiên làm việc.')
            },
            h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'bookmark_added'),
            h('span', null, 'Lưu kịch bản')
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'haui-pill-btn-canvas',
              onClick: handleExitSimulation,
              title: 'Thoát thử nghiệm'
            },
            h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'close'),
            h('span', null, 'Thoát thử nghiệm')
          )
        )
      )
    ),

    // Safety Sandbox Notice Card
    h(
      'div',
      {
        style: {
          borderRadius: '24px',
          backgroundColor: 'var(--color-paper, #ffffff)',
          padding: '16px 20px',
          border: '1px solid var(--color-hairline, #e5e5e5)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px'
        }
      },
      h(
        'div',
        { style: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-canvas, #f5f5f5)', color: 'var(--color-ink, #0a0a0a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
        h('span', { className: 'material-symbols-outlined', style: { fontSize: '20px' } }, 'science')
      ),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: '3px' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          h('span', { style: { fontSize: '14px', fontWeight: 600, color: 'var(--color-ink, #0a0a0a)' } }, 'Chế độ mô phỏng an toàn (Sandbox Mode)'),
          h('span', { style: { fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas, #f5f5f5)', color: 'var(--color-mid-gray, #737373)', fontWeight: 500 } }, 'Bảo vệ dữ liệu')
        ),
        h(
          'p',
          { style: { margin: 0, fontSize: '13px', color: 'var(--color-mid-gray, #737373)', lineHeight: 1.5 } },
          'Mọi tính toán điểm số tại đây chỉ là kịch bản giả lập chạy độc lập trong phiên làm việc hiện tại, tuyệt đối không gửi yêu cầu thay đổi dữ liệu bảng điểm chính thức trên cổng đào tạo HaUI.'
        )
      )
    ),

    // Toast Alert
    toastMessage
      ? h(
          'div',
          {
            style: {
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 100,
              backgroundColor: 'var(--color-ink, #0a0a0a)',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.16)'
            }
          },
          h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'check_circle'),
          h('span', null, toastMessage)
        )
      : null,

    // SECTION 2: 4 CORE STAT KPI CARDS
    h(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' } },

      // KPI 1: CPA Thực tế
      h(
        'div',
        { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', padding: '20px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          h('span', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 } }, 'CPA THỰC TẾ'),
          h(
            'div',
            { style: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-mid-gray)' } },
            h('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'school')
          )
        ),
        h(
          'div',
          null,
          h(
            'div',
            { style: { display: 'flex', alignItems: 'baseline', gap: '6px' } },
            h('span', { style: { fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)' } }, `${currentCpaVal}`),
            h('span', { style: { fontSize: '14px', color: 'var(--color-mid-gray)' } }, '/ 4.00')
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' } },
            h('span', { style: { padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', fontWeight: 600, color: 'var(--color-ink)' } }, '108 Tín chỉ'),
            h('span', { style: { fontSize: '12px', color: 'var(--color-mid-gray)' } }, '• Xếp loại Khá')
          )
        )
      ),

      // KPI 2: CPA Mô phỏng dự kiến (THẺ ĐEN NỔI BẬT CHUẨN PROTOTYPE)
      h(
        'div',
        {
          style: {
            backgroundColor: 'var(--color-ink, #0a0a0a)',
            color: 'var(--color-paper, #ffffff)',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
            position: 'relative',
            overflow: 'hidden'
          }
        },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 } },
          h('span', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)', fontWeight: 600 } }, 'CPA MÔ PHỎNG DỰ KIẾN'),
          h(
            'div',
            { style: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' } },
            h('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'trending_up')
          )
        ),
        h(
          'div',
          { style: { position: 'relative', zIndex: 1 } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'baseline', gap: '8px' } },
            h('span', { style: { fontSize: '30px', fontWeight: 700, color: '#ffffff' } }, `${simulatedCpaVal}`),
            h('span', { style: { fontSize: '14px', color: 'rgba(255,255,255,0.6)' } }, '/ 4.00'),
            h('span', { style: { marginLeft: 'auto', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: 700, color: '#ffffff' } }, `${deltaVal >= 0 ? '+' : ''}${deltaVal}`)
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' } },
            h('span', { style: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff' } }),
            h('span', { style: { fontSize: '11px', color: '#ffffff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' } }, simulatedCpaVal >= 3.60 ? 'Đạt xếp loại XUẤT SẮC (≥ 3.60)' : simulatedCpaVal >= 3.20 ? 'Đạt xếp loại GIỎI (≥ 3.20)' : 'Xếp loại KHÁ')
          )
        )
      ),

      // KPI 3: Mục tiêu đặt ra
      h(
        'div',
        { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', padding: '20px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          h('span', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 } }, 'MỤC TIÊU ĐẶT RA'),
          h(
            'div',
            { style: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-mid-gray)' } },
            h('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'flag')
          )
        ),
        h(
          'div',
          null,
          h(
            'div',
            { style: { display: 'flex', alignItems: 'baseline', gap: '6px' } },
            h('span', { style: { fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)' } }, `${targetCpaVal.toFixed(2)}`),
            h('span', { style: { fontSize: '14px', color: 'var(--color-mid-gray)' } }, '/ 4.00')
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' } },
            h(
              'span',
              { style: { padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '11px', fontWeight: 600, color: targetDiff >= 0 ? '#16a34a' : 'var(--color-ember)' } },
              targetDiff >= 0 ? `Vượt mục tiêu +${targetDiff}` : `Cách mục tiêu ${targetDiff}`
            )
          )
        )
      ),

      // KPI 4: Tổng tín chỉ tính toán
      h(
        'div',
        { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', padding: '20px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          h('span', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 } }, 'TỔNG TÍN CHỈ TÍNH TOÁN'),
          h(
            'div',
            { style: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-mid-gray)' } },
            h('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'layers')
          )
        ),
        h(
          'div',
          null,
          h(
            'div',
            { style: { display: 'flex', alignItems: 'baseline', gap: '6px' } },
            h('span', { style: { fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)' } }, '126'),
            h('span', { style: { fontSize: '14px', color: 'var(--color-mid-gray)' } }, '/ 145 TC chuẩn')
          ),
          h('div', { style: { fontSize: '12px', color: 'var(--color-mid-gray)', marginTop: '6px' } }, '108 TC hiện tại + 18 TC kỳ 7')
        )
      )
    ),

    // SECTION 3: TOOL SELECTOR PILLS
    h(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' } },
      WHAT_IF_TOOLS.map((t) => {
        const isActive = activeTool === t.id;
        return h(
          'div',
          {
            key: t.id,
            onClick: () => setActiveTool(t.id),
            style: {
              padding: '14px 16px',
              borderRadius: '18px',
              cursor: 'pointer',
              backgroundColor: isActive ? 'var(--color-paper)' : 'var(--color-surface-alt)',
              border: isActive ? '2px solid var(--color-ink)' : '1px solid var(--color-hairline)',
              boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 150ms ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h('span', { style: { fontSize: '18px' } }, t.icon),
            h('strong', { style: { fontSize: '13px', color: 'var(--color-ink)' } }, t.name)
          ),
          h('p', { style: { margin: '2px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)', lineHeight: 1.4 } }, t.description)
        );
      })
    ),

    // SECTION 4: MAIN WORKSPACE (7 COLS LEFT / 5 COLS RIGHT)
    h(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', alignItems: 'start' } },

      // LEFT PANEL (7 cols)
      h(
        'div',
        { style: { gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '20px' } },

        // Parameter Settings Card
        h(
          'div',
          { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' } },
          h(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' } },
            h(
              'div',
              null,
              h('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Thiết lập tham số kịch bản'),
              h('p', { style: { margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' } }, 'Điều chỉnh mục tiêu và học kỳ tác động')
            ),
            h('span', { style: { padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', fontSize: '12px', fontWeight: 500 } }, 'Học kỳ 7 (Thu 2024-2025)')
          ),

          // Dynamic settings according to activeTool
          h(
            'div',
            { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } },
            h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              h('label', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 } }, 'CPA Mục tiêu tốt nghiệp mong muốn:'),
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                h(
                  'div',
                  { style: { position: 'relative', flex: 1 } },
                  h('input', {
                    type: 'number',
                    step: '0.01',
                    min: '2.00',
                    max: '4.00',
                    value: targetCpaInput,
                    onChange: (e) => handleTargetCpaChange(e.target.value),
                    style: {
                      width: '100%',
                      padding: '8px 14px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--color-surface-alt)',
                      border: '1px solid var(--color-hairline)',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }
                  }),
                  h('span', { style: { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--color-mid-gray)' } }, '/ 4.00')
                ),
                h('span', { style: { padding: '6px 12px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' } }, parseFloat(targetCpaInput) >= 3.6 ? 'Xuất sắc' : parseFloat(targetCpaInput) >= 3.2 ? 'Bằng Giỏi' : 'Bằng Khá')
              )
            ),
            h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              h('label', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 } }, 'HỌC KỲ DỰ PHÓNG'),
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderRadius: '9999px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', fontSize: '13px', color: 'var(--color-ink)' } },
                h('span', null, 'Học kỳ 7 • 6 môn (18 TC)'),
                h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px', color: 'var(--color-mid-gray)' } }, 'calendar_month')
              )
            )
          ),

          // Additional inputs if target tool
          activeTool === 'target'
            ? h(
                'div',
                { style: { display: 'flex', gap: '8px', paddingTop: '4px', flexWrap: 'wrap' } },
                ['2.80', '3.20', '3.60'].map((preset) =>
                  h(
                    'button',
                    {
                      key: preset,
                      type: 'button',
                      onClick: () => handleTargetCpaChange(preset),
                      style: {
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        border: '1px solid var(--color-hairline)',
                        background: targetCpaInput === preset ? 'var(--color-ink)' : 'var(--color-canvas)',
                        color: targetCpaInput === preset ? 'var(--color-paper)' : 'var(--color-ink)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }
                    },
                    `CPA ${preset} (${preset === '3.60' ? 'Xuất sắc' : preset === '3.20' ? 'Giỏi' : 'Khá'})`
                  )
                )
              )
            : null
        ),

        // Grade Simulation Table Card (Khi dùng công cụ grades)
        activeTool === 'grades' || activeTool === 'accelerate'
          ? h(
              'div',
              { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' } },
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' } },
                h(
                  'div',
                  null,
                  h('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Danh sách môn học dự kiến & Điểm giả lập'),
                  h('p', { style: { margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' } }, 'Thay đổi thang điểm dự phóng để kiểm tra biến thiên kết quả')
                ),
                h('span', { style: { padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', fontSize: '12px', fontWeight: 600 } }, `${simCourses.length} Môn • ${simCourses.reduce((sum, c) => sum + c.credits, 0)} TC`)
              ),

              // Courses Table
              h(
                'div',
                { style: { overflowX: 'auto', width: '100%' } },
                h(
                  'table',
                  { style: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' } },
                  h(
                    'thead',
                    null,
                    h(
                      'tr',
                      { style: { backgroundColor: 'var(--color-canvas)', color: 'var(--color-mid-gray)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' } },
                      h('th', { style: { padding: '10px 14px', borderRadius: '12px 0 0 12px' } }, 'Mã môn'),
                      h('th', { style: { padding: '10px 14px' } }, 'Tên môn học'),
                      h('th', { style: { padding: '10px 10px', textAlign: 'center' } }, 'Số TC'),
                      h('th', { style: { padding: '10px 14px' } }, 'Điểm chữ'),
                      h('th', { style: { padding: '10px 10px', textAlign: 'right' } }, 'Hệ 4'),
                      h('th', { style: { padding: '10px 14px', textAlign: 'center', borderRadius: '0 12px 12px 0' } }, 'Thao tác')
                    )
                  ),
                  h(
                    'tbody',
                    null,
                    simCourses.map((c) =>
                      h(
                        'tr',
                        { key: c.courseCode, style: { borderBottom: '1px solid var(--color-hairline)' } },
                        h('td', { style: { padding: '12px 14px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, color: 'var(--color-ink)' } }, c.courseCode),
                        h(
                          'td',
                          { style: { padding: '12px 14px' } },
                          h('p', { style: { margin: 0, fontWeight: 500, color: 'var(--color-ink)' } }, c.courseName),
                          h('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray)' } }, c.note || 'Bắt buộc ngành')
                        ),
                        h('td', { style: { padding: '12px 10px', textAlign: 'center', fontWeight: 600 } }, c.credits),
                        h(
                          'td',
                          { style: { padding: '12px 14px' } },
                          h(
                            'select',
                            {
                              value: c.expectedGrade,
                              onChange: (e) => handleGradeChange(c.courseCode, e.target.value),
                              style: {
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                backgroundColor: 'var(--color-surface-alt)',
                                border: '1px solid var(--color-hairline)',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--color-ink)',
                                outline: 'none',
                                cursor: 'pointer'
                              }
                            },
                            Object.keys(GRADE_POINTS_MAP).map((g) =>
                              h('option', { key: g, value: g }, `Điểm ${g} (${GRADE_POINTS_MAP[g].toFixed(1)})`)
                            )
                          )
                        ),
                        h('td', { style: { padding: '12px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--color-ink)' } }, (GRADE_POINTS_MAP[c.expectedGrade] || 3.0).toFixed(1)),
                        h(
                          'td',
                          { style: { padding: '12px 14px', textAlign: 'center' } },
                          h(
                            'button',
                            { type: 'button', className: 'haui-sidebar__profile-logout', title: 'Khóa/Mở môn' },
                            h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'lock_open')
                          )
                        )
                      )
                    )
                  )
                )
              ),

              // Quick Action Bar under Table
              h(
                'div',
                { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '8px' } },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'haui-pill-btn-canvas',
                    onClick: () => showToast('Đã mở hộp thoại thêm môn học giả lập.')
                  },
                  h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'add_circle'),
                  h('span', null, 'Thêm môn học giả lập')
                ),
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                  h('span', { style: { fontSize: '12px', color: 'var(--color-mid-gray)' } }, 'Dự phóng GPA Kỳ 7:'),
                  h('span', { style: { padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', fontWeight: 600, fontSize: '13px' } }, `${result?.expectedGpa ?? 3.58} / 4.00`)
                )
              )
            )
          : null,

        // ROI Học cải thiện Tool (Khi chọn retake)
        activeTool === 'retake'
          ? h(
              'div',
              { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' } },
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' } },
                h(
                  'div',
                  null,
                  h('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Xếp hạng tối ưu học cải thiện (ROI)'),
                  h('p', { style: { margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' } }, 'Danh sách môn điểm D, D+, C hoặc F đã hoàn thành. Tích chọn các môn muốn đưa vào kế hoạch cải thiện:')
                ),
                h('span', { style: { padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', fontSize: '12px', fontWeight: 600 } }, `${retakeCandidates.length} Môn đề xuất`)
              ),

              h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                retakeCandidates.map((item) =>
                  h(
                    'div',
                    {
                      key: item.courseCode,
                      style: {
                        padding: '12px 16px',
                        borderRadius: '16px',
                        backgroundColor: item.selected ? '#f0fdf4' : 'var(--color-surface-alt)',
                        border: item.selected ? '1.5px solid #16a34a' : '1px solid var(--color-hairline)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }
                    },
                    h(
                      'div',
                      { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                      h('input', {
                        type: 'checkbox',
                        checked: Boolean(item.selected),
                        onChange: () => handleToggleRetakeCourse(item.courseCode),
                        style: { width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-ink)' }
                      }),
                      h(
                        'div',
                        null,
                        h('div', { style: { fontWeight: 700, fontSize: '13px', color: 'var(--color-ink)' } }, `${item.courseName} (${item.courseCode})`),
                        h(
                          'div',
                          { style: { fontSize: '12px', color: 'var(--color-mid-gray)', marginTop: '2px' } },
                          `${item.credits} tín chỉ · Điểm hiện tại: `,
                          h('strong', { style: { color: 'var(--color-ember)' } }, item.currentGrade),
                          ` · ${item.rationale}`
                        )
                      )
                    ),
                    h(
                      'div',
                      { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                      h(
                        'select',
                        {
                          value: item.targetGrade,
                          onChange: (e) => handleRetakeGradeChange(item.courseCode, e.target.value),
                          style: {
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            border: '1px solid var(--color-hairline)',
                            fontWeight: 700,
                            color: '#16a34a',
                            backgroundColor: 'var(--color-paper)',
                            cursor: 'pointer'
                          }
                        },
                        ['A', 'B+', 'B', 'C+'].map((g) => h('option', { key: g, value: g }, `Lên ${g}`))
                      ),
                      h(
                        'span',
                        {
                          style: {
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            backgroundColor: 'var(--color-paper)',
                            color: '#0284c7',
                            fontSize: '11px',
                            fontWeight: 700,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
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

        // Optional Retake Box inside Grades Tool
        activeTool === 'grades'
          ? h(
              'div',
              { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' } },
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h(
                  'div',
                  null,
                  h('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Môn học cần học lại / Cải thiện điểm (Tùy chọn)'),
                  h('p', { style: { margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' } }, 'Mô phỏng nâng điểm các môn đã hoàn thành ở kỳ trước có điểm C hoặc D')
                ),
                h('span', { style: { padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-mid-gray)', fontSize: '12px', fontWeight: 500 } }, '1 đề xuất tối ưu')
              ),
              h(
                'div',
                { style: { padding: '16px', borderRadius: '18px', backgroundColor: 'var(--color-canvas)', display: 'flex', flexDirection: 'column', gap: '10px' } },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' } },
                  h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                    h('input', {
                      type: 'checkbox',
                      id: 'retake-toggle-card',
                      checked: enableOptionalRetake,
                      onChange: (e) => setEnableOptionalRetake(e.target.checked),
                      style: { width: '18px', height: '18px', accentColor: 'var(--color-ink)', cursor: 'pointer' }
                    }),
                    h(
                      'div',
                      null,
                      h('label', { htmlFor: 'retake-toggle-card', style: { fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', cursor: 'pointer', display: 'block' } }, 'IT6008 - Mạng máy tính cơ sở (3 TC)'),
                      h('p', { style: { margin: '2px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' } }, 'Điểm gốc Kỳ 4: C (2.0) ➔ Giả lập cải thiện thành công lên A (4.0)')
                    )
                  ),
                  h('span', { style: { padding: '4px 10px', borderRadius: '9999px', backgroundColor: 'var(--color-paper)', color: 'var(--color-ink)', fontSize: '12px', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } }, '+0.04 CPA toàn khóa')
                ),
                h('p', { style: { margin: 0, paddingLeft: '28px', fontSize: '11px', color: 'var(--color-mid-gray)', lineHeight: 1.4 } }, '* Khi học cải thiện, điểm mới sẽ thay thế hoàn toàn điểm cũ trong việc tính toán điểm trung bình tích lũy CPA.')
              ),

              // Bottom Action Buttons Bar
              h(
                'div',
                { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '8px' } },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'haui-pill-btn-canvas',
                    onClick: () => {
                      setSimCourses(DEFAULT_SIM_COURSES.map((c) => ({ ...c })));
                      showToast('Đã khôi phục bảng điểm ban đầu.');
                    }
                  },
                  h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'replay'),
                  h('span', null, 'Đặt lại bảng điểm ban đầu')
                ),
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'haui-pill-btn-dark',
                      onClick: () => executeSimulation(activeTool)
                    },
                    h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'calculate'),
                    h('span', null, 'Tính toán kết quả')
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'haui-pill-btn-dark',
                      style: { backgroundColor: '#16a34a' },
                      onClick: handleApplyToPlanner
                    },
                    h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'task_alt'),
                    h('span', null, 'Áp dụng vào Kế hoạch học tập')
                  )
                )
              )
            )
          : null
      ),

      // RIGHT PANEL: Charts, Feasibility & Saved Scenarios (5 cols)
      h(
        'div',
        { style: { gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '20px' } },

        // Progression Chart Card (Inline SVG Chart)
        h(
          'div',
          { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' } },
          h(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h(
              'div',
              null,
              h('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Tiến trình CPA: Thực tế vs Mô phỏng'),
              h('p', { style: { margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' } }, 'Xu hướng tích lũy từ HK1 đến kết thúc khóa học')
            ),
            h(
              'div',
              { style: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' } },
              h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'show_chart')
            )
          ),

          // Inline SVG Chart
          h(
            'div',
            { style: { position: 'relative', width: '100%', paddingTop: '8px', paddingBottom: '4px' } },
            h(
              'svg',
              { 'aria-label': 'Biểu đồ tiến trình CPA', style: { width: '100%', height: 'auto', overflow: 'visible' }, viewBox: '0 0 460 220' },
              h(
                'defs',
                null,
                h(
                  'linearGradient',
                  { id: 'simulatedArea', x1: '0', x2: '0', y1: '0', y2: '1' },
                  h('stop', { offset: '0%', stopColor: '#0a0a0a', stopOpacity: '0.08' }),
                  h('stop', { offset: '100%', stopColor: '#0a0a0a', stopOpacity: '0.00' })
                )
              ),
              h('line', { stroke: '#f0f0f0', strokeWidth: '1', x1: '35', x2: '445', y1: '20', y2: '20' }),
              h('text', { fill: '#737373', fontSize: '10', x: '5', y: '24' }, '4.0'),
              h('line', { stroke: '#f0f0f0', strokeWidth: '1', x1: '35', x2: '445', y1: '60', y2: '60' }),
              h('text', { fill: '#737373', fontSize: '10', x: '5', y: '64' }, '3.5'),
              h('line', { stroke: '#e5e5e5', strokeDasharray: '3 3', strokeWidth: '1', x1: '35', x2: '445', y1: '84', y2: '84' }),
              h('text', { fill: '#737373', fontSize: '9', x: '330', y: '80' }, 'Ngưỡng Giỏi (3.20)'),
              h('line', { stroke: '#f0f0f0', strokeWidth: '1', x1: '35', x2: '445', y1: '100', y2: '100' }),
              h('text', { fill: '#737373', fontSize: '10', x: '5', y: '104' }, '3.0'),
              h('line', { stroke: '#f0f0f0', strokeWidth: '1', x1: '35', x2: '445', y1: '140', y2: '140' }),
              h('text', { fill: '#737373', fontSize: '10', x: '5', y: '144' }, '2.5'),

              h('polygon', { fill: 'url(#simulatedArea)', points: '320,86 375,75 430,68 430,170 320,170' }),
              h('polyline', { fill: 'none', points: '45,98 100,93 155,90 210,96 265,89 320,86', stroke: '#0a0a0a', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2.5' }),
              h('polyline', { fill: 'none', points: '320,86 375,75 430,68', stroke: '#0a0a0a', strokeDasharray: '4 4', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2.5' }),

              h('circle', { cx: '45', cy: '98', fill: '#ffffff', r: '3.5', stroke: '#0a0a0a', strokeWidth: '2' }),
              h('circle', { cx: '100', cy: '93', fill: '#ffffff', r: '3.5', stroke: '#0a0a0a', strokeWidth: '2' }),
              h('circle', { cx: '155', cy: '90', fill: '#ffffff', r: '3.5', stroke: '#0a0a0a', strokeWidth: '2' }),
              h('circle', { cx: '210', cy: '96', fill: '#ffffff', r: '3.5', stroke: '#0a0a0a', strokeWidth: '2' }),
              h('circle', { cx: '265', cy: '89', fill: '#ffffff', r: '3.5', stroke: '#0a0a0a', strokeWidth: '2' }),
              h('circle', { cx: '320', cy: '86', fill: '#0a0a0a', r: '4.5', stroke: '#ffffff', strokeWidth: '2' }),
              h('circle', { cx: '375', cy: '75', fill: '#0a0a0a', r: '5', stroke: '#ffffff', strokeWidth: '2.5' }),
              h('circle', { cx: '430', cy: '68', fill: '#ffffff', r: '4', stroke: '#0a0a0a', strokeDasharray: '2 2', strokeWidth: '2' }),

              h(
                'g',
                { transform: 'translate(350, 42)' },
                h('rect', { fill: '#0a0a0a', height: '20', rx: '10', width: '52', x: '0', y: '0' }),
                h('text', { fill: '#ffffff', fontSize: '11', fontWeight: '600', textAnchor: 'middle', x: '26', y: '14' }, `${simulatedCpaVal}`)
              ),

              h('text', { fill: '#737373', fontSize: '11', textAnchor: 'middle', x: '45', y: '195' }, 'Kỳ 1'),
              h('text', { fill: '#737373', fontSize: '11', textAnchor: 'middle', x: '100', y: '195' }, 'Kỳ 2'),
              h('text', { fill: '#737373', fontSize: '11', textAnchor: 'middle', x: '155', y: '195' }, 'Kỳ 3'),
              h('text', { fill: '#737373', fontSize: '11', textAnchor: 'middle', x: '210', y: '195' }, 'Kỳ 4'),
              h('text', { fill: '#737373', fontSize: '11', textAnchor: 'middle', x: '265', y: '195' }, 'Kỳ 5'),
              h('text', { fill: '#0a0a0a', fontSize: '11', fontWeight: '600', textAnchor: 'middle', x: '320', y: '195' }, 'Kỳ 6 (Hiện tại)'),
              h('text', { fill: '#0a0a0a', fontSize: '11', fontWeight: '600', textAnchor: 'middle', x: '375', y: '195' }, 'Kỳ 7 (Sim)'),
              h('text', { fill: '#737373', fontSize: '11', textAnchor: 'middle', x: '430', y: '195' }, 'Kỳ 8 (Dự kiến)')
            )
          ),

          // Chart Legend
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--color-hairline)', fontSize: '11px', color: 'var(--color-mid-gray)' } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
              h('span', { style: { width: '12px', height: '2px', backgroundColor: 'var(--color-ink)' } }),
              h('span', { style: { color: 'var(--color-ink)', fontWeight: 500 } }, 'Thực tế (Kỳ 1-6)')
            ),
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
              h('span', { style: { width: '12px', borderBottom: '2px dashed var(--color-ink)' } }),
              h('span', { style: { color: 'var(--color-ink)', fontWeight: 500 } }, 'What-if (Kỳ 7-8)')
            ),
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
              h('span', { style: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-mid-gray)' } }),
              h('span', null, 'Ngưỡng Giỏi: 3.20')
            )
          )
        ),

        // Sensitivity Analysis & AI Feasibility Card
        h(
          'div',
          { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '14px' } },
          h(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h(
              'div',
              null,
              h('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Phân tích độ nhạy & Khả thi'),
              h('p', { style: { margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' } }, 'Đánh giá áp lực học tập và tỷ lệ hoàn thành mục tiêu')
            ),
            h('span', { className: 'material-symbols-outlined', style: { fontSize: '20px', color: 'var(--color-mid-gray)' } }, 'psychology')
          ),

          // Gauge Bar
          h(
            'div',
            { style: { padding: '14px', borderRadius: '18px', backgroundColor: 'var(--color-canvas)', display: 'flex', flexDirection: 'column', gap: '8px' } },
            h(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' } },
              h('span', { style: { color: 'var(--color-ink)', fontWeight: 500 } }, 'Độ khả thi kịch bản'),
              h('span', { style: { color: '#16a34a', fontWeight: 700 } }, 'Khả thi cao (85%)')
            ),
            h(
              'div',
              { className: 'haui-progress-bar-minimal' },
              h('div', { className: 'haui-progress-bar-fill', style: { width: '85%' } })
            ),
            h(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-mid-gray)' } },
              h('span', null, 'Thấp (0%)'),
              h('span', null, 'Cân bằng (50%)'),
              h('span', null, 'Rất tự tin (100%)')
            )
          ),

          // Advice box
          h(
            'div',
            { style: { padding: '14px', borderRadius: '18px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', flexDirection: 'column', gap: '6px' } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' } },
              h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'lightbulb'),
              h('span', null, 'Lời khuyên tối ưu lộ trình')
            ),
            h(
              'p',
              { style: { margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', lineHeight: 1.5 } },
              'Để đạt CPA ',
              h('strong', { style: { color: 'var(--color-ink)' } }, `${simulatedCpaVal}`),
              ', bạn chỉ cần giữ mức điểm từ ',
              h('strong', { style: { color: 'var(--color-ink)' } }, '3.5 – 4.0'),
              ' ở các môn chuyên ngành cốt lõi. Nếu kết hợp học lại môn ',
              h('em', { style: { color: 'var(--color-ink)', fontStyle: 'normal', fontWeight: 600 } }, 'Toán rời rạc (MATH1002)'),
              ', áp lực điểm ở Kỳ 7 sẽ giảm đi ',
              h('strong', { style: { color: 'var(--color-ink)' } }, '20%'),
              ' mà vẫn chắc chắn tốt nghiệp bằng Giỏi.'
            )
          )
        ),

        // Saved Scenarios Card
        h(
          'div',
          { style: { backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '14px' } },
          h(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' } }, 'Kịch bản đã lưu'),
            h(
              'button',
              {
                type: 'button',
                className: 'haui-login-demo-btn',
                style: { fontSize: '12px' },
                onClick: () => showToast('Hiện đang lưu 3 kịch bản mô phỏng.')
              },
              'Quản lý (3)'
            )
          ),
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            h(
              'div',
              { style: { padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--color-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' } },
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 } },
                h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-ink)', flexShrink: 0 } }),
                h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
                  h('p', { style: { margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'Kịch bản 1: Tối ưu hóa Kỳ 7 (GPA 3.58 - Lên bằng Giỏi)'),
                  h('p', { style: { margin: '2px 0 0', fontSize: '11px', color: 'var(--color-mid-gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `Dự kiến CPA: ${simulatedCpaVal} • 18 TC mô phỏng + 1 môn cải thiện`)
                )
              ),
              h('span', { style: { padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-paper)', color: 'var(--color-ink)', fontSize: '11px', fontWeight: 600, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } }, 'Đang xem')
            ),
            h(
              'div',
              { style: { padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' } },
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 } },
                h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-mid-gray)', flexShrink: 0 } }),
                h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
                  h('p', { style: { margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'Kịch bản 2: Học cải thiện 2 môn C & C+ (Kỳ hè)'),
                  h('p', { style: { margin: '2px 0 0', fontSize: '11px', color: 'var(--color-mid-gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'Dự kiến CPA: 3.24 • Kỳ hè 2024')
                )
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'haui-sidebar__profile-logout',
                  title: 'Áp dụng kịch bản 2',
                  onClick: () => showToast('Đã chuyển sang Kịch bản 2.')
                },
                h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'play_circle')
              )
            ),
            h(
              'div',
              { style: { padding: '12px 14px', borderRadius: '16px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' } },
              h(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 } },
                h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-mid-gray)', flexShrink: 0 } }),
                h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
                  h('p', { style: { margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'Kịch bản 3: Phương án an toàn (Giữ vững CPA 3.18)'),
                  h('p', { style: { margin: '2px 0 0', fontSize: '11px', color: 'var(--color-mid-gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'Điểm B toàn bộ các môn còn lại')
                )
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'haui-sidebar__profile-logout',
                  title: 'Áp dụng kịch bản 3',
                  onClick: () => showToast('Đã chuyển sang Kịch bản 3.')
                },
                h('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'play_circle')
              )
            )
          )
        )
      )
    )
  );
}

export default WhatIfSimulatorPage;
