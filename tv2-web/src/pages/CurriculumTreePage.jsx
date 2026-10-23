import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import { Table, Modal, Loading, Error as ErrorBox } from '../components/ui/index.js';
import { subscribeAcademicStore } from '../services/academicStore.js';
import { getCourseDisplayMeta } from '../services/curriculumTreeHelper.js';

/**
 * Dữ liệu bổ trợ mô tả chi tiết học phần theo Prototype (lời khuyên, đề cương)
 */
const PROTOTYPE_COURSE_DETAILS = Object.freeze({
  IT6003: {
    desc: 'Trang bị các cấu trúc dữ liệu cơ bản và nâng cao (Danh sách liên kết, Cây nhị phân, Bảng băm, Đồ thị) cùng các thuật toán tìm kiếm, sắp xếp và tối ưu độ phức tạp tính toán.',
    advice: 'Nền tảng quan trọng bậc nhất cho toàn bộ các môn lập trình và phân tích thuật toán chuyên sâu sau này.'
  },
  IT6001: {
    desc: 'Phương pháp lập trình hướng đối tượng (OOP): Đóng gói, Kế thừa, Đa hình, Trừu tượng hóa trên nền Java Standard Edition, Design Patterns cơ bản và lập trình giao diện Swing/JavaFX.',
    advice: 'Kết quả đạt điểm A (9.0) giúp mở khóa thuận lợi toàn bộ các học phần lập trình ứng dụng tiếp theo.'
  },
  IT6005: {
    desc: 'Mô hình dữ liệu quan hệ, đại số quan hệ, thiết kế lược đồ quan hệ và chuẩn hóa dạng 1NF-3NF/BCNF, ngôn ngữ truy vấn SQL trên hệ quản trị SQL Server.',
    advice: 'Chú trọng kỹ năng thiết kế lược đồ CSDL và tối ưu hóa câu lệnh SQL khi tham gia các dự án đồ án.'
  },
  IT6002: {
    desc: 'Nền tảng HTML5, CSS3, JavaScript hiện đại (ES6+), DOM Manipulation, responsive design và lập trình backend cơ bản với Node.js/Express.',
    advice: 'Đã hoàn thành xuất sắc, tạo tiền đề vững chắc cho học phần Lập trình Web nâng cao ở kỳ 6.'
  },
  IT6004: {
    desc: 'Tổng quan vòng đời phát triển phần mềm (SDLC), mô hình Agile/Scrum, phân tích yêu cầu phần mềm (SRS), kiểm thử cơ bản và quản lý phiên bản với Git/GitHub.',
    advice: 'Quy trình làm việc nhóm và kỹ năng viết đặc tả SRS đã đạt chuẩn yêu cầu chuyên ngành.'
  },
  IT6008: {
    desc: 'Kiến trúc phân tầng OSI và TCP/IP, cấu hình mạng con IPv4/IPv6, định tuyến định hướng, giao thức tầng ứng dụng HTTP, DNS, DHCP và an toàn mạng cơ bản.',
    advice: 'Đã đáp ứng đủ chuẩn kiến thức mạng máy tính phục vụ xây dựng ứng dụng Web phân tán.'
  },
  IT6011: {
    desc: 'Mô hình hóa hệ thống bằng UML 2.0 (Use case, Class, Sequence, Activity Diagram), phân tích ca sử dụng và thiết kế kiến trúc hệ thống thông tin doanh nghiệp.',
    advice: 'Sử dụng các sơ đồ UML từ bài tập lớn môn này làm bộ khung phân tích cho Đồ án chuyên ngành.'
  },
  IT6012: {
    desc: 'Quản trị CSDL nâng cao, lập trình T-SQL / PL-SQL, Trigger, Stored Procedure, Transaction & Concurrency Control, lập chỉ mục (Indexing) và tối ưu hóa câu truy vấn.',
    advice: 'Kỹ năng viết Stored Procedure và Transaction của bạn rất tốt, hãy áp dụng vào phần quản trị dữ liệu đồ án.'
  },
  IT6015: {
    desc: 'Trang bị kiến thức chuyên sâu về kiến trúc Web hiện đại: Microservices, RESTful API, Single Page Applications (Next.js/React), WebSockets, cơ chế Authentication (OAuth2, JWT) và triển khai CI/CD trên nền tảng đám mây.',
    advice: 'Bạn nên duy trì điểm quá trình môn IT6015 trên 8.0 để đủ điều kiện nhận đề tài Khóa luận độc lập cùng BM Công nghệ Phần mềm ở Học kỳ 8.'
  },
  IT6025: {
    desc: 'Nghiên cứu các mẫu thiết kế hướng đối tượng (GoF Design Patterns), Clean Architecture, Domain-Driven Design (DDD), phân tích hệ thống phân tán chịu tải cao và quy chuẩn thiết kế Enterprise Software.',
    advice: 'Môn học cốt lõi cho các kỳ phỏng vấn tuyển dụng vị trí Software Engineer / Backend Developer tại các doanh nghiệp đối tác.'
  },
  IT6030: {
    desc: 'Lập trình ứng dụng di động đa nền tảng với Flutter/Dart và native Android (Kotlin), vòng đời Activity/Fragment, quản trị trạng thái (Bloc/Provider) và kết nối REST API.',
    advice: 'Tích lũy sản phẩm đồ án môn học để đưa vào CV ứng tuyển thực tập doanh nghiệp ở kỳ 7.'
  },
  IT6080: {
    desc: 'Thực hiện đồ án nghiên cứu phát triển một sản phẩm phần mềm thực tế theo nhóm (Scrum/Agile), ứng dụng công nghệ Microservices, DevOps và bảo vệ trước hội đồng khoa.',
    advice: 'Cần hoàn thành đạt điểm các môn tiên quyết trong học kỳ 6 này để được cấp quyền đăng ký IT6080 đầu kỳ 7.'
  },
  IT6040: {
    desc: 'Kỹ thuật kiểm thử tự động với Selenium, Cypress, JUnit, TestNG; kiểm thử API với Postman/RestAssured; xây dựng quy trình CI/CD tích hợp kiểm thử tự động.',
    advice: 'Học phần bổ trợ thực chiến rất tốt cho kỹ sư phần mềm trước khi ra trường.'
  },
  IT6090: {
    desc: 'Thực tập toàn thời gian tại các doanh nghiệp đối tác của HaUI (Viettel, FPT Software, CMC, VNPAY...), trực tiếp tham gia dự án phần mềm thực tế và viết báo cáo thực tập.',
    advice: 'Chuẩn bị hồ sơ CV và nộp giấy tiếp nhận thực tập của công ty cho giáo vụ khoa trước tuần 2 của kỳ 7.'
  },
  IT6099: {
    desc: 'Công trình tốt nghiệp đại học hệ chính quy 4 năm ngành Kỹ thuật Phần mềm. Đòi hỏi hoàn thành đầy đủ các tín chỉ tiên quyết cùng các chứng chỉ tiếng Anh B1, Tin học chuẩn HaUI.',
    advice: 'Cần duy trì CPA ≥ 2.50 và hoàn tất toàn bộ học phần nợ trước khi nộp đơn xin nhận đề tài tốt nghiệp.'
  }
});

export { getCourseDisplayMeta };

export function CurriculumTreePage() {
  const navigate = useNavigate();
  const timelineScrollRef = useRef(null);

  // Chế độ xem: 'flowchart' (Sơ đồ luồng) | 'table' (Dạng bảng)
  const [viewMode, setViewMode] = useState('flowchart');

  // Chế độ hiển thị mạng lưới: 'all' (Tất cả môn) | 'tracer' (Chỉ tô sáng luồng môn đang chọn)
  const [tracerMode, setTracerMode] = useState('all');

  // Bộ lọc
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [blockFilter, setBlockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dữ liệu Cây CTĐT từ Backend API (Contract V1.3.0)
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Học phần đang được chọn trên Sơ đồ cây
  const [selectedCourseCode, setSelectedCourseCode] = useState('IT6015');

  // State kiểm tra điều kiện tiên quyết (POST /api/v1/academic/eligibility)
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(null);

  // Nạp dữ liệu cây CTĐT từ Live Backend API
  const fetchTreeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.academic.getCurriculumTree();
      setTreeData(res);
      if (res?.courses?.length > 0) {
        // Nếu môn đang chọn không tồn tại trong danh sách mới, chọn môn đầu tiên
        const exists = res.courses.some((c) => c.courseCode === selectedCourseCode);
        if (!exists) {
          setSelectedCourseCode(res.courses[0].courseCode);
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseCode]);

  useEffect(() => {
    fetchTreeData();
    const unsubStore = subscribeAcademicStore(() => {
      fetchTreeData();
    });
    const unsubApi = api.subscribe(() => {
      fetchTreeData();
    });
    const handleTranscriptUpdated = () => {
      fetchTreeData();
    };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
    }
    return () => {
      unsubStore();
      unsubApi();
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
      }
    };
  }, [fetchTreeData]);

  const courses = useMemo(() => treeData?.courses || [], [treeData]);

  // Tìm học phần đang được chọn
  const selectedCourse = useMemo(() => {
    if (!courses.length) return null;
    return courses.find((c) => c.courseCode === selectedCourseCode) || courses[0];
  }, [courses, selectedCourseCode]);

  // Lấy chi tiết bổ trợ từ prototype nếu có
  const selectedCourseSupplement = selectedCourse ? (PROTOTYPE_COURSE_DETAILS[selectedCourse.courseCode] || {}) : {};

  // Mã môn tiên quyết và môn mở khóa của môn đang chọn
  const activePrereqCodes = useMemo(() => {
    if (!selectedCourse) return new Set();
    return new Set(selectedCourse.prerequisiteCourseCodes || []);
  }, [selectedCourse]);

  const activeUnlockCodes = useMemo(() => {
    if (!selectedCourse) return new Set();
    const targetCode = selectedCourse.courseCode;
    const unlocks = courses
      .filter((c) => (c.prerequisiteCourseCodes || []).includes(targetCode))
      .map((c) => c.courseCode);
    return new Set(unlocks);
  }, [courses, selectedCourse]);

  const handleSelectCourse = (code) => {
    setSelectedCourseCode(code);
  };

  const handleScrollToCurrent = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTo({ left: 680, behavior: 'smooth' });
    }
  };

  const handleScrollLeft = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handleCheckCourseEligibility = async (courseCode) => {
    setSelectedCourseCode(courseCode);
    setEligibilityModalOpen(true);
    setCheckingEligibility(true);
    setEligibilityError(null);
    setEligibilityResult(null);

    try {
      const res = await api.academic.checkEligibility({ courseCode });
      setEligibilityResult(res);
    } catch (err) {
      setEligibilityError(err);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleAddCourseToPlanner = (courseCode) => {
    const activePlanId = 'plan-2026-9001';
    navigate(`/planner?course_id=${encodeURIComponent(courseCode)}&plan_id=${encodeURIComponent(activePlanId)}`);
  };

  // 4 Fast Stats Counters — Tính toán trực tiếp từ mảng courses của API (không tính tự suy diễn)
  const stats = useMemo(() => {
    const passedCourses = courses.filter((c) => c.status === 'PASSED');
    const passedCredits = passedCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
    const totalReq = treeData?.totalCreditsRequired || 135;
    const passedPercent = totalReq > 0 ? Number(((passedCredits / totalReq) * 100).toFixed(1)) : 0;

    const studyingCourses = courses.filter((c) => c.status === 'IN_PROGRESS');
    const studyingCredits = studyingCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);

    const eligibleCourses = courses.filter((c) => c.status === 'ELIGIBLE');
    const eligibleCredits = eligibleCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);

    const lockedCourses = courses.filter((c) => c.status === 'BLOCKED' || c.status === 'FAILED');
    const lockedCredits = lockedCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);

    return {
      passedCourses,
      passedCredits,
      passedPercent,
      studyingCourses,
      studyingCredits,
      eligibleCourses,
      eligibleCredits,
      lockedCourses,
      lockedCredits
    };
  }, [courses, treeData?.totalCreditsRequired]);

  // Phân nhóm học phần theo học kỳ (1..8) cho Sơ đồ luồng Timeline
  const filteredTimeline = useMemo(() => {
    const semMap = new Map();
    const defaultSems = [
      { semester: 1, label: 'Học kỳ 1 (Năm 1)', meta: 'Đại cương' },
      { semester: 2, label: 'Học kỳ 2 (Năm 1)', meta: 'Đại cương & Cơ sở' },
      { semester: 3, label: 'Học kỳ 3 (Năm 2)', meta: 'Cơ sở ngành' },
      { semester: 4, label: 'Học kỳ 4 (Năm 2)', meta: 'Cơ sở & Chuyên ngành' },
      { semester: 5, label: 'Học kỳ 5 (Năm 3)', meta: 'Chuyên ngành' },
      { semester: 6, label: 'Học kỳ 6 (Năm 3)', meta: 'Chuyên ngành (Hiện tại)', isCurrent: true },
      { semester: 7, label: 'Học kỳ 7 (Năm 4)', meta: 'Đồ án & Thực tập' },
      { semester: 8, label: 'Học kỳ 8 (Năm 4)', meta: 'Tốt nghiệp' }
    ];

    defaultSems.forEach((s) => semMap.set(s.semester, { ...s, courses: [] }));

    courses.forEach((c) => {
      const sNum = Number(c.suggestedSemester) || 1;
      if (!semMap.has(sNum)) {
        semMap.set(sNum, { semester: sNum, label: `Học kỳ ${sNum}`, meta: '', courses: [] });
      }
      semMap.get(sNum).courses.push(c);
    });

    const semestersList = Array.from(semMap.values()).sort((a, b) => a.semester - b.semester);

    return semestersList
      .map((sem) => {
        if (semesterFilter !== 'all' && String(sem.semester) !== String(semesterFilter)) {
          return null;
        }

        const matchingCourses = sem.courses.filter((c) => {
          const meta = getCourseDisplayMeta(c);
          if (statusFilter !== 'all' && meta.statusType !== statusFilter) return false;
          if (blockFilter !== 'all') {
            const kb = (c.knowledgeBlock || '').toLowerCase();
            if (blockFilter === 'major' && !kb.includes('chuyên ngành')) return false;
            if (blockFilter === 'core' && !kb.includes('cơ sở') && !kb.includes('đại cương')) return false;
            if (blockFilter === 'elective' && !kb.includes('tự chọn')) return false;
            if (blockFilter === 'internship' && !kb.includes('thực tập') && !kb.includes('tốt nghiệp') && !kb.includes('đồ án')) return false;
          }
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const codeMatch = (c.courseCode || '').toLowerCase().includes(q);
            const nameMatch = (c.courseName || '').toLowerCase().includes(q);
            if (!codeMatch && !nameMatch) return false;
          }
          return true;
        });

        if (matchingCourses.length === 0 && (statusFilter !== 'all' || blockFilter !== 'all' || searchTerm)) {
          return null;
        }

        return {
          ...sem,
          courses: matchingCourses
        };
      })
      .filter(Boolean);
  }, [courses, semesterFilter, statusFilter, blockFilter, searchTerm]);

  // Cấu hình bảng dữ liệu cho Chế độ Table view
  const tableColumns = [
    {
      key: 'courseCode',
      title: 'Mã HP',
      width: '110px',
      render: (val, row) => <strong style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-ink)' }}>{val || row.code}</strong>
    },
    {
      key: 'courseName',
      title: 'Tên học phần',
      render: (val, row) => <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{val || row.name}</span>
    },
    {
      key: 'credits',
      title: 'Khối lượng tín chỉ',
      width: '140px',
      render: (val) => <span style={{ fontSize: '13px', color: 'var(--color-mid-gray)' }}>{val} Tín chỉ</span>
    },
    {
      key: 'suggestedSemester',
      title: 'Học kỳ gợi ý',
      width: '130px',
      render: (val) => <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)' }}>Học kỳ {val}</span>
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: '180px',
      render: (st, row) => {
        const meta = getCourseDisplayMeta(row);
        return <span className={`haui-badge ${meta.statusClass}`}>{meta.statusText}</span>;
      }
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      width: '140px',
      render: (_, row) => (
        <button
          type="button"
          className="haui-pill-btn-canvas"
          style={{ fontSize: '12px', padding: '4px 12px' }}
          onClick={() => {
            setSelectedCourseCode(row.courseCode || row.code);
            setViewMode('flowchart');
          }}
        >
          Xem luồng &rarr;
        </button>
      )
    }
  ];

  // Xử lý màn hình tải (Loading)
  if (loading && !treeData) {
    return (
      <div className="haui-page-container" style={{ maxWidth: '1720px', margin: '0 auto', padding: '40px 0' }}>
        <Loading label="Đang tải dữ liệu Cây môn học từ Backend học vụ..." />
      </div>
    );
  }

  // Xử lý màn hình lỗi (đặc biệt lỗi 503 TOOL_NOT_READY)
  if (error) {
    const is503 = error.status === 503 || error.code === 'TOOL_NOT_READY';
    return (
      <div className="haui-page-container" style={{ maxWidth: '1720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <ErrorBox
          title={is503 ? 'Công cụ học vụ chưa sẵn sàng (503 TOOL_NOT_READY)' : 'Lỗi tải dữ liệu Cây môn học'}
          message={
            is503
              ? 'Hệ thống đang chuẩn bị công cụ tính toán học vụ thật từ Rule Engine. Dữ liệu cây môn học tạm thời chưa khả dụng. Tuyệt đối không hiển thị số liệu giả lập.'
              : error.message || 'Không thể tải cây chương trình đào tạo từ máy chủ học vụ.'
          }
          code={error.code || (is503 ? 'TOOL_NOT_READY' : 'TREE_LOAD_ERROR')}
          requestId={error.requestId || `req-tree-${Date.now()}`}
          details={
            error.details?.length
              ? error.details
              : [
                  'API Endpoint: /api/v1/academic/curriculum/tree',
                  'Quy tắc AGENTS.md: Không tự tính trạng thái học phần ở client khi công cụ backend chưa sẵn sàng.'
                ]
          }
          retryLabel="Thử lại kết nối (Retry)"
          onRetry={fetchTreeData}
        />
      </div>
    );
  }

  const selectedMeta = getCourseDisplayMeta(selectedCourse || {});

  return (
    <div className="haui-page-container" style={{ maxWidth: '1720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* =========================================================================
          SECTION 1: BREADCRUMB & PAGE TITLE & METADATA BADGES
          ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
          <span
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'inherit' }}
            onClick={() => navigate('/')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
            Trang chủ
          </span>
          <span style={{ color: 'var(--color-hairline)' }}>/</span>
          <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Cây môn học &amp; Lộ trình tiên quyết</span>
        </nav>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', paddingTop: '4px' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.5px' }}>
              Cây môn học &amp; Sơ đồ tiên quyết
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span className="haui-badge haui-badge--neutral" style={{ fontSize: '11px' }}>
                Quy chế: {treeData?.policyVersion || 'policy-haui-demo-2026@0.0.1-v0'}
              </span>
              <span className="haui-badge haui-badge--neutral" style={{ fontSize: '11px' }}>
                Hồ sơ: {treeData?.dataRevision || 'REV-SERVER'}
              </span>
              {treeData?.transcriptStatus === 'NONE' ? (
                <span className="haui-badge haui-badge--warning" style={{ fontSize: '11px' }}>
                  Chưa nạp bảng điểm (NONE)
                </span>
              ) : (
                <span className="haui-badge haui-badge--success" style={{ fontSize: '11px' }}>
                  Bảng điểm đã xác nhận (CONFIRMED)
                </span>
              )}
            </div>
          </div>

          {/* Export & Flow Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', padding: '3px', backgroundColor: 'var(--color-canvas)', borderRadius: '9999px', border: '1px solid var(--color-hairline)' }}>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: viewMode === 'flowchart' ? 'var(--color-paper)' : 'transparent',
                  color: viewMode === 'flowchart' ? 'var(--color-ink)' : 'var(--color-mid-gray)',
                  fontWeight: viewMode === 'flowchart' ? 600 : 400,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'flowchart' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 150ms'
                }}
                onClick={() => setViewMode('flowchart')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>account_tree</span>
                <span>Sơ đồ luồng (Flowchart)</span>
              </button>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: viewMode === 'table' ? 'var(--color-paper)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--color-ink)' : 'var(--color-mid-gray)',
                  fontWeight: viewMode === 'table' ? 600 : 400,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 150ms'
                }}
                onClick={() => setViewMode('table')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>view_list</span>
                <span>Dạng bảng</span>
              </button>
            </div>

            <button
              type="button"
              className="haui-pill-btn-paper"
              onClick={fetchTreeData}
              title="Làm mới trạng thái sơ đồ từ máy chủ"
              style={{ padding: '8px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            </button>

            <button
              type="button"
              className="haui-pill-btn-dark"
              onClick={() => window.print()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
              <span>Xuất lộ trình PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: 4 FAST STATS COUNTER BADGES (Live Server Metrics)
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Thẻ 1: Đã hoàn thành */}
        <div style={{ backgroundColor: 'var(--color-paper)', padding: '16px 20px', borderRadius: '24px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 }}>ĐÃ HOÀN THÀNH</p>
            <p style={{ margin: '4px 0 2px', fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1 }}>{stats.passedCourses.length} môn</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 500 }}>
              {stats.passedCredits} tín chỉ · <strong style={{ color: 'var(--color-ink)' }}>{stats.passedPercent}%</strong>
            </p>
          </div>
        </div>

        {/* Thẻ 2: Đang theo học */}
        <div style={{ backgroundColor: 'var(--color-paper)', padding: '16px 20px', borderRadius: '24px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>menu_book</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 }}>ĐANG THEO HỌC</p>
            <p style={{ margin: '4px 0 2px', fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1 }}>{stats.studyingCourses.length} môn</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 500 }}>{stats.studyingCredits} tín chỉ</p>
          </div>
        </div>

        {/* Thẻ 3: Đủ điều kiện đăng ký */}
        <div style={{ backgroundColor: 'var(--color-paper)', padding: '16px 20px', borderRadius: '24px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>how_to_reg</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 }}>ĐỦ ĐIỀU KIỆN ĐĂNG KÝ</p>
            <p style={{ margin: '4px 0 2px', fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1 }}>{stats.eligibleCourses.length} môn</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 500 }}>{stats.eligibleCredits} tín chỉ</p>
          </div>
        </div>

        {/* Thẻ 4: Chưa đủ điều kiện (Khóa) */}
        <div style={{ backgroundColor: 'var(--color-paper)', padding: '16px 20px', borderRadius: '24px', border: '1px solid var(--color-hairline)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', color: 'var(--color-mid-gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)', fontWeight: 600 }}>CHƯA ĐỦ ĐIỀU KIỆN</p>
              <span style={{ backgroundColor: 'var(--color-ink)', color: 'var(--color-paper)', fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>Khóa</span>
            </div>
            <p style={{ margin: '4px 0 2px', fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1 }}>{stats.lockedCourses.length} môn</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 500 }}>{stats.lockedCredits} tín chỉ · Thiếu tiên quyết</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: SMART FILTER TOOLBAR & VISUAL LEGEND
          ========================================================================= */}
      <div style={{ backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {/* Selectors */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            {/* Semester filter */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '6px 14px', borderRadius: '9999px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>Học kỳ:</span>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                style={{ backgroundColor: 'transparent', border: 'none', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Tất cả kỳ (1 - 8)</option>
                <option value="1">Kỳ 1</option>
                <option value="2">Kỳ 2</option>
                <option value="3">Kỳ 3</option>
                <option value="4">Kỳ 4</option>
                <option value="5">Kỳ 5</option>
                <option value="6">Kỳ 6 (Hiện tại)</option>
                <option value="7">Kỳ 7</option>
                <option value="8">Kỳ 8 (Tốt nghiệp)</option>
              </select>
            </div>

            {/* Block filter */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '6px 14px', borderRadius: '9999px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>Khối kiến thức:</span>
              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                style={{ backgroundColor: 'transparent', border: 'none', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Tất cả khối</option>
                <option value="core">Đại cương & Cơ sở ngành</option>
                <option value="major">Chuyên ngành</option>
                <option value="elective">Tự chọn chuyên ngành</option>
                <option value="internship">Thực tập &amp; Khóa luận</option>
              </select>
            </div>

            {/* Status filter */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-canvas)', padding: '6px 14px', borderRadius: '9999px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ backgroundColor: 'transparent', border: 'none', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="passed">Đã hoàn thành (PASSED)</option>
                <option value="studying">Đang học (IN_PROGRESS)</option>
                <option value="eligible">Đủ ĐK đăng ký (ELIGIBLE)</option>
                <option value="locked">Khóa / Nợ môn (BLOCKED/FAILED)</option>
              </select>
            </div>
          </div>

          {/* Quick search input */}
          <div style={{ position: 'relative', width: '320px' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: 'var(--color-mid-gray)' }}>
              search
            </span>
            <input
              type="text"
              placeholder="Tìm môn trên sơ đồ (VD: IT6015, Giải thuật...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-canvas)',
                border: 'none',
                borderRadius: '9999px',
                padding: '8px 14px 8px 36px',
                fontSize: '13px',
                color: 'var(--color-ink)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Legend bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-hairline)', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>Chú thích sơ đồ:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'var(--color-ink)' }}>✓</span>
              Đã hoàn thành (PASSED)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-ink)' }} />
              Đang học (IN_PROGRESS)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-mid-gray)' }} />
              Đủ điều kiện (ELIGIBLE)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>lock</span>
              Khóa (BLOCKED / FAILED)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>info</span>
            <span>Dữ liệu CTĐT chuẩn Contract 1.3.0. Đối chiếu chính thức tại <strong>sv.haui.edu.vn</strong></span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: MAIN INTERACTIVE LAYOUT (FLOWCHART 8 COLS / DRAWER 4 COLS)
          ========================================================================= */}
      {viewMode === 'flowchart' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', alignItems: 'start' }}>
          {/* Main Tree Map Area (8 cols) */}
          <div
            style={{
              gridColumn: 'span 8',
              backgroundColor: 'var(--color-paper)',
              borderRadius: '24px',
              border: '1px solid var(--color-hairline)',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Map Header with Interactive Toolbar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-ink)', color: 'var(--color-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>device_hub</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {treeData?.curriculumName || 'Sơ đồ mạng lưới học phần CTĐT'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                    Tổng số {courses.length} học phần · Cập nhật từ hồ sơ {treeData?.dataRevision}
                  </span>
                </div>
              </div>

              {/* Mode Switcher & Quick Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Tracer Mode Toggle */}
                <div style={{ display: 'inline-flex', padding: '2px', backgroundColor: 'var(--color-canvas)', borderRadius: '9999px', border: '1px solid var(--color-hairline)' }}>
                  <button
                    type="button"
                    onClick={() => setTracerMode('all')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: tracerMode === 'all' ? 600 : 400,
                      backgroundColor: tracerMode === 'all' ? 'var(--color-paper)' : 'transparent',
                      color: tracerMode === 'all' ? 'var(--color-ink)' : 'var(--color-mid-gray)',
                      cursor: 'pointer',
                      transition: 'all 150ms'
                    }}
                  >
                    Tất cả môn
                  </button>
                  <button
                    type="button"
                    onClick={() => setTracerMode('tracer')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: tracerMode === 'tracer' ? 600 : 400,
                      backgroundColor: tracerMode === 'tracer' ? 'var(--color-ink)' : 'transparent',
                      color: tracerMode === 'tracer' ? 'var(--color-paper)' : 'var(--color-mid-gray)',
                      cursor: 'pointer',
                      transition: 'all 150ms'
                    }}
                  >
                    🎯 Tô sáng luồng môn
                  </button>
                </div>

                {/* Quick Scroll Navigation Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handleScrollLeft}
                    className="haui-pill-btn-canvas"
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                    title="Cuộn về các kỳ trước"
                  >
                    &larr; Kỳ 1-3
                  </button>
                  <button
                    type="button"
                    onClick={handleScrollToCurrent}
                    className="haui-pill-btn-paper"
                    style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600 }}
                    title="Cuộn đến Học kỳ 6 hiện tại"
                  >
                    ● Kỳ 6 (Hiện tại)
                  </button>
                  <button
                    type="button"
                    onClick={handleScrollRight}
                    className="haui-pill-btn-canvas"
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                    title="Cuộn sang các kỳ sau"
                  >
                    Kỳ 7-8 &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Current Selected Indicator Banner */}
            {selectedCourse && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderRadius: '12px', backgroundColor: 'var(--color-canvas)', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-ember)' }} />
                  <span style={{ color: 'var(--color-mid-gray)' }}>Đang chọn kiểm tra luồng:</span>
                  <strong style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono, monospace)' }}>{selectedCourse.courseCode}</strong>
                  <span style={{ color: 'var(--color-ink)' }}>— {selectedCourse.courseName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                  <span>Tiên quyết: <strong style={{ color: '#16a34a' }}>{selectedCourse.prerequisiteCourseCodes?.length || 0} môn</strong></span>
                  <span>•</span>
                  <span>Mở khóa: <strong style={{ color: '#2563eb' }}>{activeUnlockCodes.size} môn</strong></span>
                </div>
              </div>
            )}

            {/* Horizontal Timeline Container */}
            <div
              ref={timelineScrollRef}
              className="haui-tree-timeline-scroll"
              style={{ position: 'relative' }}
            >
              {/* Semesters Columns Flex Layout */}
              <div style={{ display: 'flex', gap: '24px', minWidth: '1480px', position: 'relative', zIndex: 1 }}>
                {filteredTimeline.map((sem) => {
                  const isCurrent = sem.isCurrent;
                  return (
                    <div
                      key={sem.semester}
                      style={{
                        width: '240px',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: isCurrent ? 'rgba(245, 245, 245, 0.75)' : 'transparent',
                        padding: isCurrent ? '12px' : '0',
                        borderRadius: isCurrent ? '20px' : '0',
                        border: isCurrent ? '2px solid rgba(10, 10, 10, 0.15)' : 'none'
                      }}
                    >
                      {/* Semester Column Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-hairline)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isCurrent && (
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-ink)' }} />
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>{sem.label}</span>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: isCurrent ? 'var(--color-ink)' : 'var(--color-canvas)', color: isCurrent ? 'var(--color-paper)' : 'var(--color-mid-gray)', fontWeight: 500 }}>
                          {sem.courses.length} môn
                        </span>
                      </div>

                      {/* Course Cards inside Semester */}
                      {sem.courses.map((course) => {
                        const code = course.courseCode;
                        const isSelected = selectedCourseCode === code;
                        const isPrereq = activePrereqCodes.has(code);
                        const isUnlock = activeUnlockCodes.has(code);
                        const isDimmed = tracerMode === 'tracer' && !isSelected && !isPrereq && !isUnlock;
                        const meta = getCourseDisplayMeta(course);

                        let cardClass = 'haui-tree-map-card';
                        if (isSelected) cardClass += ' haui-tree-map-card--active';
                        else if (isPrereq) cardClass += ' haui-tree-map-card--prereq';
                        else if (isUnlock) cardClass += ' haui-tree-map-card--unlock';
                        else if (isDimmed) cardClass += ' haui-tree-map-card--dimmed';

                        return (
                          <div
                            key={code}
                            className={cardClass}
                            onClick={() => handleSelectCourse(code)}
                            style={{
                              cursor: 'pointer'
                            }}
                          >
                            {/* Card Top: Code + Credits + Relation Tag */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-ink)' }}>
                                {code}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isPrereq && (
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                                    ← Tiên quyết
                                  </span>
                                )}
                                {isUnlock && (
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>
                                    → Mở khóa
                                  </span>
                                )}
                                <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '9999px', backgroundColor: isSelected && isCurrent ? 'var(--color-ink)' : 'var(--color-canvas)', color: isSelected && isCurrent ? 'var(--color-paper)' : 'var(--color-ink)', fontWeight: 600 }}>
                                  {course.credits} TC
                                </span>
                              </div>
                            </div>

                            {/* Card Name & Category */}
                            <div>
                              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: 'var(--color-ink)', lineHeight: 1.3 }}>
                                {course.courseName}
                              </h4>
                              <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                                {course.knowledgeBlock || 'Học phần CTĐT'}
                              </p>
                            </div>

                            {/* Card Bottom: Status & Indicator */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--color-hairline)', marginTop: '2px', fontSize: '11px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: meta.statusType === 'passed' ? 'var(--color-ink)' : meta.statusType === 'studying' ? 'var(--color-ink)' : 'var(--color-mid-gray)', fontWeight: 500 }}>
                                <span className={`material-symbols-outlined ${meta.statusType === 'studying' ? 'haui-spin' : ''}`} style={{ fontSize: '14px' }}>
                                  {meta.icon}
                                </span>
                                <span>{meta.statusText}</span>
                              </div>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-mid-gray)' }}>
                                {isSelected ? 'check' : meta.statusType === 'eligible' ? 'add_circle' : 'arrow_forward'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Detail Panel / Sticky Drawer (4 cols) */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '80px' }}>
            {selectedCourse ? (
              <div
                style={{
                  backgroundColor: 'var(--color-paper)',
                  borderRadius: '24px',
                  border: '1px solid var(--color-hairline)',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Drawer Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)' }}>
                      Chi tiết học phần (Contract V1.3.0)
                    </span>
                    <h3 style={{ margin: '4px 0 2px', fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {selectedCourse.courseName}
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-mid-gray)' }}>
                      <strong style={{ color: 'var(--color-ink)' }}>{selectedCourse.courseCode}</strong> • {selectedCourse.credits} Tín chỉ
                    </p>
                  </div>
                  <span className={`haui-badge ${selectedMeta.statusClass}`} style={{ flexShrink: 0 }}>
                    {selectedMeta.statusLabel}
                  </span>
                </div>

                {/* Academic Status Banner */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: 'var(--color-canvas)', padding: '12px 14px', borderRadius: '16px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-mid-gray)' }}>Điểm lần gần nhất</p>
                    <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {selectedCourse.letterGrade ? `${selectedCourse.letterGrade} (${selectedCourse.semesterCode || 'e-HaUI'})` : 'Chưa có điểm'}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-mid-gray)' }}>Thẩm định đăng ký</p>
                    <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 600, color: selectedCourse.eligible ? '#16a34a' : 'var(--color-ember)' }}>
                      {selectedCourse.eligible ? '✓ Đủ điều kiện' : '⚠️ Bị chặn đăng ký'}
                    </p>
                  </div>
                </div>

                {/* Attributes table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-hairline)' }}>
                    <span style={{ color: 'var(--color-mid-gray)' }}>Khối kiến thức:</span>
                    <strong style={{ color: 'var(--color-ink)', textAlign: 'right' }}>{selectedCourse.knowledgeBlock || 'Đại cương / Cơ sở'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-hairline)' }}>
                    <span style={{ color: 'var(--color-mid-gray)' }}>Học kỳ gợi ý:</span>
                    <span style={{ color: 'var(--color-ink)', textAlign: 'right', fontWeight: 500 }}>Học kỳ {selectedCourse.suggestedSemester || 1}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-hairline)' }}>
                    <span style={{ color: 'var(--color-mid-gray)' }}>Tính chất:</span>
                    <span style={{ color: 'var(--color-ink)', textAlign: 'right', fontWeight: 500 }}>
                      {selectedCourse.mandatory ? 'Bắt buộc ngành' : 'Tự chọn'}
                    </span>
                  </div>
                </div>

                {/* Course Syllabus Summary */}
                {selectedCourseSupplement.desc && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)' }}>
                      Đề cương tóm tắt
                    </span>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-ink)', lineHeight: 1.5, backgroundColor: 'var(--color-surface-alt)', padding: '12px 14px', borderRadius: '16px', border: '1px solid var(--color-hairline)' }}>
                      {selectedCourseSupplement.desc}
                    </p>
                  </div>
                )}

                {/* Warnings from Rule Engine */}
                {selectedCourse.warnings?.length > 0 && (
                  <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: '12px', color: '#991b1b' }}>
                    <strong>Cảnh báo quy chế học vụ:</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                      {selectedCourse.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prerequisites Check Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)' }}>
                      Môn tiên quyết &amp; Môn học trước (TIÊN QUYẾT)
                    </span>
                    <span style={{ fontSize: '11px', color: selectedCourse.missingPrerequisites?.length ? 'var(--color-ember)' : '#16a34a', fontWeight: 500 }}>
                      {selectedCourse.missingPrerequisites?.length ? `Thiếu ${selectedCourse.missingPrerequisites.length} điều kiện` : 'Đã đáp ứng tất cả'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedCourse.prerequisiteCourseCodes?.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)', fontStyle: 'italic', padding: '6px 0' }}>
                        Không có môn tiên quyết.
                      </div>
                    ) : (
                      selectedCourse.prerequisiteCourseCodes.map((preCode) => {
                        const preCourse = courses.find((c) => c.courseCode === preCode);
                        const preMeta = getCourseDisplayMeta(preCourse || {});
                        return (
                          <div
                            key={preCode}
                            onClick={() => handleSelectCourse(preCode)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '14px',
                              backgroundColor: 'var(--color-canvas)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              cursor: 'pointer',
                              transition: 'all 150ms'
                            }}
                            title={`Xem chi tiết môn ${preCode}`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: preMeta.statusType === 'passed' ? '#16a34a' : 'var(--color-mid-gray)' }}>
                                {preMeta.icon}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {preCode} - {preCourse?.courseName || preCode}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Môn tiên quyết</span>
                              </div>
                            </div>
                            <span className={`haui-badge ${preMeta.statusClass}`} style={{ fontSize: '11px', flexShrink: 0 }}>
                              {preMeta.statusText}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Unlocks / Dependent Courses Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray)' }}>
                    Học phần mở khóa tiếp theo (CHUỖI ẢNH HƯỞNG)
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeUnlockCodes.size === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)', fontStyle: 'italic', padding: '6px 0' }}>
                        Học phần cuối chuỗi hoặc không có môn phụ thuộc trực tiếp.
                      </div>
                    ) : (
                      Array.from(activeUnlockCodes).map((unCode) => {
                        const unCourse = courses.find((c) => c.courseCode === unCode);
                        return (
                          <div
                            key={unCode}
                            onClick={() => handleSelectCourse(unCode)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '14px',
                              backgroundColor: 'var(--color-canvas)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              cursor: 'pointer',
                              transition: 'all 150ms'
                            }}
                            title={`Xem chi tiết môn ${unCode}`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>lock_open</span>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {unCode} - {unCourse?.courseName || unCode}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Học phần sau</span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-mid-gray)' }}>arrow_forward</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Action Buttons inside Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--color-hairline)' }}>
                  <button
                    type="button"
                    className="haui-pill-btn-dark"
                    onClick={() => handleAddCourseToPlanner(selectedCourse.courseCode)}
                    style={{ justifyContent: 'center', padding: '10px 16px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_task</span>
                    <span>Thêm vào Kế hoạch học tập (TV3 Planner)</span>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      className="haui-pill-btn-canvas"
                      onClick={() => handleCheckCourseEligibility(selectedCourse.courseCode)}
                      style={{ justifyContent: 'center', fontSize: '12px', padding: '8px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified_user</span>
                      <span>Thẩm định Tiên quyết</span>
                    </button>
                    <button
                      type="button"
                      className="haui-pill-btn-canvas"
                      onClick={() => navigate('/chat')}
                      style={{ justifyContent: 'center', fontSize: '12px', padding: '8px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>support_agent</span>
                      <span>Tư vấn AI Advisor</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* =========================================================================
           TABLE VIEW (Dạng Bảng đầy đủ)
           ========================================================================= */
        <div style={{ backgroundColor: 'var(--color-paper)', borderRadius: '24px', border: '1px solid var(--color-hairline)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <Table
            columns={tableColumns}
            data={courses}
            rowKey="courseCode"
            striped
          />
        </div>
      )}

      {/* Modal Thẩm định Tiên Quyết Rule Engine */}
      <Modal
        isOpen={eligibilityModalOpen}
        onClose={() => setEligibilityModalOpen(false)}
        title={`Thẩm định Điều kiện Tiên quyết: ${selectedCourseCode}`}
        subtitle={selectedCourse?.courseName || ''}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button
              type="button"
              className="haui-pill-btn-canvas"
              onClick={() => setEligibilityModalOpen(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="haui-pill-btn-dark"
              onClick={() => {
                setEligibilityModalOpen(false);
                handleAddCourseToPlanner(selectedCourseCode);
              }}
            >
              Thêm môn vào Kế hoạch học tập &rarr;
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          {checkingEligibility && <div>Đang thẩm định điều kiện tiên quyết từ Rule Engine...</div>}
          {eligibilityError && (
            <div style={{ color: 'var(--color-ember)' }}>
              Lỗi: {eligibilityError.message}
            </div>
          )}
          {eligibilityResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: eligibilityResult.eligible ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${eligibilityResult.eligible ? '#bbf7d0' : '#fecaca'}`,
                  color: eligibilityResult.eligible ? '#166534' : '#991b1b'
                }}
              >
                <strong>Trạng thái thẩm định:</strong>{' '}
                {eligibilityResult.eligible ? '✓ Đủ điều kiện đăng ký' : '⚠️ Bị chặn bởi điều kiện tiên quyết (BR-01)'}
              </div>

              {eligibilityResult.missingPrerequisites?.length > 0 && (
                <div>
                  <strong>Điều kiện còn thiếu:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: '18px', color: 'var(--color-ember)' }}>
                    {eligibilityResult.missingPrerequisites.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {eligibilityResult.policyVersion && (
                <div style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                  Phiên bản quy chế: <code>{eligibilityResult.policyVersion}</code>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default CurriculumTreePage;
