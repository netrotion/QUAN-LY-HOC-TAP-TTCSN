import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import { Button, Card, Error as ErrorBox, Loading, Modal, Table } from '../components/ui/index.js';

/**
 * Màn hình 4 & Luồng phụ B: Chi tiết & Sơ đồ Cây quan hệ môn học (`/curriculum`) — TV2
 * Tái thiết kế toàn diện theo Prototype "Clinical Blueprint on Frosted Paper":
 * - Header Breadcrumb + Controls chuyển đổi chế độ xem: Sơ đồ luồng (Flowchart) vs Dạng bảng
 * - 4 Thẻ Fast Stats đếm nhanh tiến độ tín chỉ (Đã hoàn thành, Đang học, Đủ điều kiện, Bị khóa)
 * - Canvas Sơ đồ luồng nhiều học kỳ với các Node thẻ môn học bo góc 20px
 * - Khối Drawer chi tiết học phần bên phải hiển thị HỌC PHẦN TIÊN QUYẾT và CHUỖI ẢNH HƯỞNG
 * - Nút "+ Thêm môn vào kế hoạch" điều hướng sang TV3 Planner mang theo course_id và plan_id
 * - Thẩm định điều kiện tiên quyết (Rule Engine) qua POST /api/v1/academic/eligibility
 */
export function CurriculumTreePage() {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chế độ xem: 'flowchart' (Sơ đồ luồng) | 'table' (Dạng bảng)
  const [viewMode, setViewMode] = useState('flowchart');

  // Bộ lọc
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [nodeColorFilter, setNodeColorFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Học phần đang được chọn trên Sơ đồ cây tương tác
  const [selectedCourse, setSelectedCourse] = useState(null);

  // State kiểm tra điều kiện tiên quyết & Popup cảnh báo AC-02 (POST /api/v1/academic/eligibility)
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(null);

  const loadCurriculum = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.academic.getCurriculum();
      setCurriculum(response);
      if (response?.courses?.length > 0) {
        // Mặc định chọn môn Toán rời rạc (MATH1002 - Node Đỏ) để sinh viên thấy ngay nút thắt tiên quyết
        const defaultCourse =
          response.courses.find((c) => c.courseCode === 'MATH1002') || response.courses[0];
        setSelectedCourse(defaultCourse);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurriculum();
    return api.subscribe(() => {
      loadCurriculum();
    });
  }, [loadCurriculum]);

  const handleCheckCourseEligibility = async (course) => {
    setSelectedCourse(course);
    setEligibilityModalOpen(true);
    setCheckingEligibility(true);
    setEligibilityError(null);
    setEligibilityResult(null);

    try {
      const res = await api.academic.checkEligibility({ courseCode: course.courseCode });
      setEligibilityResult(res);
    } catch (err) {
      setEligibilityError(err);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleAddCourseToPlanner = (course) => {
    const courseId = course?.course_id || course?.courseCode || 'IT6001';
    const activePlanId = 'plan-2026-9001';
    navigate(`/planner?course_id=${encodeURIComponent(courseId)}&plan_id=${encodeURIComponent(activePlanId)}`);
  };

  const allCourses = curriculum?.courses || [];

  const filteredCourses = allCourses.filter((c) => {
    if (blockFilter !== 'ALL' && c.block !== blockFilter) return false;
    if (nodeColorFilter !== 'ALL' && c.nodeColor !== nodeColorFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCode = c.courseCode?.toLowerCase().includes(q);
      const matchName = c.courseName?.toLowerCase().includes(q);
      if (!matchCode && !matchName) return false;
    }
    return true;
  });

  // Nhóm các môn theo Học kỳ
  const semesterGroups = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((sem) => ({
      semester: sem,
      label: sem === 8 ? 'Học kỳ 8 (Đồ án TN)' : `Học kỳ ${sem}`,
      courses: filteredCourses.filter((c) => c.semester === sem)
    }))
    .filter((g) => g.courses.length > 0);

  // Thống kê nhanh theo 4 trạng thái
  const countPassed = allCourses.filter((c) => c.nodeColor === 'GREEN').length;
  const countInProgress = allCourses.filter((c) => c.nodeColor === 'YELLOW').length;
  const countBlocked = allCourses.filter((c) => c.nodeColor === 'RED').length;
  const countLocked = allCourses.filter((c) => c.nodeColor === 'GRAY').length;

  const columns = [
    {
      key: 'semester',
      title: 'Kỳ',
      width: '75px',
      align: 'center',
      render: (val) => <span className="haui-badge haui-badge--neutral">Kỳ {val}</span>
    },
    {
      key: 'courseCode',
      title: 'Mã HP',
      width: '105px',
      render: (val) => <code style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{val}</code>
    },
    {
      key: 'courseName',
      title: 'Tên học phần',
      render: (val) => <strong>{val}</strong>
    },
    {
      key: 'block',
      title: 'Khối kiến thức',
      width: '140px'
    },
    {
      key: 'credits',
      title: 'TC',
      align: 'center',
      width: '65px'
    },
    {
      key: 'prerequisites',
      title: 'TIÊN QUYẾT',
      width: '180px',
      render: (prereqs) =>
        Array.isArray(prereqs) && prereqs.length > 0 ? (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {prereqs.map((code) => (
              <span key={code} className="haui-badge haui-badge--info">
                {code}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Không</span>
        )
    },
    {
      key: 'unlocks',
      title: 'CHUỖI ẢNH HƯỞNG',
      width: '180px',
      render: (unlocks) =>
        Array.isArray(unlocks) && unlocks.length > 0 ? (
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
            &rarr; {unlocks.join(', ')}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
        )
    },
    {
      key: 'nodeColor',
      title: 'Trạng thái Node',
      width: '175px',
      render: (nodeColor) => {
        const map = {
          GREEN: { cls: 'haui-badge--success', label: '🟢 Đã hoàn thành' },
          RED: { cls: 'haui-badge--error', label: '🔴 Trượt / Bị chặn' },
          YELLOW: { cls: 'haui-badge--warning', label: '🟡 AI Đề xuất / Đang học' },
          GRAY: { cls: 'haui-badge--neutral', label: '🔒 Chưa đủ ĐK (Khóa)' }
        };
        const item = map[nodeColor] || { cls: 'haui-badge--neutral', label: nodeColor };
        return <span className={`haui-badge ${item.cls}`}>{item.label}</span>;
      }
    },
    {
      key: 'action',
      title: 'Thao tác',
      align: 'right',
      width: '160px',
      render: (_, row) => (
        <button
          type="button"
          className="haui-pill-btn-canvas"
          style={{ fontSize: '12px', padding: '4px 10px' }}
          onClick={(e) => {
            e.stopPropagation();
            handleCheckCourseEligibility(row);
          }}
        >
          {row.nodeColor === 'GRAY' ? '🔒 Kiểm tra chặn' : '+ Thêm vào KH'}
        </button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* SECTION 1: BREADCRUMB & PAGE TITLE & CONTROLS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
            <span style={{ cursor: 'pointer', color: 'var(--color-ink)' }} onClick={() => navigate('/dashboard')}>
              Trang chủ
            </span>
            <span>/</span>
            <span style={{ color: 'var(--color-mid-gray)' }}>Cây môn học &amp; Lộ trình tiên quyết</span>
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Cây môn học &amp; Sơ đồ tiên quyết
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-mid-gray)', maxWidth: '780px' }}>
            Trực quan hóa cấu trúc 145 tín chỉ ngành Công nghệ Thông tin (Chuyên ngành KTPM), liên kết luồng môn học tiên quyết và tiến độ thực tế của sinh viên.
          </p>
        </div>

        {/* Export & Flow Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'inline-flex', padding: '3px', backgroundColor: 'var(--color-canvas)', borderRadius: '9999px', border: '1px solid var(--color-hairline)' }}>
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: viewMode === 'flowchart' ? 'var(--color-paper)' : 'transparent',
                color: viewMode === 'flowchart' ? 'var(--color-ink)' : 'var(--color-mid-gray)',
                fontWeight: viewMode === 'flowchart' ? 600 : 400,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: viewMode === 'flowchart' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none'
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
                gap: '4px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? 'var(--color-paper)' : 'transparent',
                color: viewMode === 'table' ? 'var(--color-ink)' : 'var(--color-mid-gray)',
                fontWeight: viewMode === 'table' ? 600 : 400,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none'
              }}
              onClick={() => setViewMode('table')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>view_list</span>
              <span>Dạng bảng</span>
            </button>
          </div>

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

      {/* SECTION 2: FAST STATS COUNTER BADGES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Thẻ 1: Đã hoàn thành */}
        <div className="haui-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-mid-gray)', letterSpacing: '0.04em' }}>
              Đã hoàn thành
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink)' }}>{countPassed} môn</span>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>&bull; Đạt</span>
            </div>
          </div>
        </div>

        {/* Thẻ 2: Đang học */}
        <div className="haui-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>pending</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-mid-gray)', letterSpacing: '0.04em' }}>
              Đang học &bull; Kỳ 6
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink)' }}>{countInProgress} môn</span>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>&bull; 14 TC</span>
            </div>
          </div>
        </div>

        {/* Thẻ 3: Đủ điều kiện */}
        <div className="haui-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock_open</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-mid-gray)', letterSpacing: '0.04em' }}>
              Đủ điều kiện đăng ký
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink)' }}>12 TC</span>
              <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)' }}>&bull; Kỳ tới</span>
            </div>
          </div>
        </div>

        {/* Thẻ 4: Bị khóa / Nợ môn */}
        <div className="haui-stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: 'rgba(231, 0, 11, 0.08)', color: 'var(--color-ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-ember)', letterSpacing: '0.04em', fontWeight: 600 }}>
              Chưa đủ điều kiện (Khóa)
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ember)' }}>{countBlocked + countLocked} môn</span>
              <span style={{ fontSize: '12px', color: 'var(--color-ember)' }}>&bull; Nợ tiên quyết</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="haui-stat-card" style={{ padding: '14px 20px', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-mid-gray)', fontWeight: 500 }}>Lọc theo trạng thái:</span>
          {[
            { key: 'ALL', label: `Tất cả (${allCourses.length})` },
            { key: 'GREEN', label: '🟢 Đã hoàn thành' },
            { key: 'RED', label: '🔴 Nợ / Bị chặn' },
            { key: 'YELLOW', label: '🟡 AI Đề xuất / Đang học' },
            { key: 'GRAY', label: '🔒 Bị khóa' }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                border: '1px solid var(--color-hairline)',
                fontSize: '12px',
                fontWeight: nodeColorFilter === item.key ? 600 : 400,
                backgroundColor: nodeColorFilter === item.key ? 'var(--color-ink)' : 'var(--color-surface-alt)',
                color: nodeColorFilter === item.key ? 'var(--color-paper)' : 'var(--color-ink)',
                cursor: 'pointer'
              }}
              onClick={() => setNodeColorFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '260px' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: 'var(--color-mid-gray)' }}>
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo mã hoặc tên môn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--color-surface-alt)',
              border: '1px solid var(--color-hairline)',
              borderRadius: '9999px',
              padding: '6px 12px 6px 32px',
              fontSize: '12px',
              color: 'var(--color-ink)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {loading && <Loading label="Đang tải sơ đồ cây môn học từ Cổng đào tạo HaUI..." />}
      {error && <ErrorBox title="Lỗi tải sơ đồ cây" error={error} onRetry={loadCurriculum} />}

      {/* SECTION 3: INTERACTIVE CANVAS (FLOWCHART) + DRAWER */}
      {!loading && !error && viewMode === 'flowchart' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', alignItems: 'start' }}>
          {/* Main Tree Canvas (8 cols) */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {semesterGroups.map((group) => (
                <div
                  key={group.semester}
                  style={{
                    backgroundColor: 'var(--color-surface-alt)',
                    borderRadius: '20px',
                    border: '1px solid var(--color-hairline)',
                    padding: '16px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-mid-gray)', paddingBottom: '8px', borderBottom: '1px solid var(--color-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{group.label}</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', backgroundColor: 'var(--color-canvas)' }}>
                      {group.courses.length} HP
                    </span>
                  </div>

                  {group.courses.map((course) => {
                    const isSelected = selectedCourse?.courseCode === course.courseCode;
                    const isRed = course.nodeColor === 'RED';
                    const isGreen = course.nodeColor === 'GREEN';
                    const isYellow = course.nodeColor === 'YELLOW';

                    return (
                      <div
                        key={course.courseCode}
                        style={{
                          backgroundColor: 'var(--color-paper)',
                          borderRadius: '16px',
                          border: isSelected
                            ? '2px solid var(--color-ink)'
                            : isRed
                            ? '1.5px solid var(--color-ember)'
                            : '1px solid var(--color-hairline)',
                          padding: '12px',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setSelectedCourse(course)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-ink)' }}>
                            {course.courseCode}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>{course.credits} TC</span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', lineHeight: 1.3, marginBottom: '8px' }}>
                          {course.courseName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: 'var(--color-canvas)',
                              color: isRed ? 'var(--color-ember)' : isGreen ? 'var(--color-ink)' : 'var(--color-mid-gray)',
                              fontWeight: 500
                            }}
                          >
                            {isRed ? 'Nợ môn / Bị chặn' : isGreen ? 'Đã đạt' : isYellow ? 'Đang học' : 'Chưa học'}
                          </span>
                          {course.unlocks?.length > 0 && (
                            <span style={{ color: 'var(--color-mid-gray)' }}>
                              &rarr; {course.unlocks.length}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right Detail Panel / Drawer (4 cols) */}
          <div className="haui-stat-card" style={{ gridColumn: 'span 4', position: 'sticky', top: '80px', gap: '16px' }}>
            {selectedCourse ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-mid-gray)' }}>
                      {selectedCourse.courseCode} &bull; Kỳ {selectedCourse.semester}
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {selectedCourse.courseName}
                    </h3>
                  </div>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: selectedCourse.nodeColor === 'RED' ? 'rgba(231, 0, 11, 0.1)' : 'var(--color-canvas)',
                      color: selectedCourse.nodeColor === 'RED' ? 'var(--color-ember)' : 'var(--color-ink)'
                    }}
                  >
                    {selectedCourse.nodeColor === 'RED' ? 'Bị chặn' : selectedCourse.nodeColor === 'GREEN' ? 'Đã đạt' : 'Đang theo dõi'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Mô tả học phần
                    </span>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-ink)', lineHeight: 1.4 }}>
                      {selectedCourse.description || 'Học phần nền tảng thuộc chương trình đào tạo Kỹ sư Công nghệ Thông tin Đại học Công nghiệp Hà Nội.'}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px 12px', backgroundColor: 'var(--color-surface-alt)', borderRadius: '14px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Số tín chỉ:</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{selectedCourse.credits} TC</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Khối kiến thức:</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{selectedCourse.block}</div>
                    </div>
                  </div>

                  {/* Section HỌC PHẦN TIÊN QUYẾT */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray)', letterSpacing: '0.04em' }}>
                      TIÊN QUYẾT (HỌC PHẦN BẮT BUỘC ĐẠT TRƯỚC):
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      {selectedCourse.prerequisites?.length > 0 ? (
                        selectedCourse.prerequisites.map((pCode) => (
                          <div
                            key={pCode}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: 'var(--color-canvas)',
                              borderRadius: '12px'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{pCode}</span>
                            <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Bắt buộc qua môn</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-canvas)', borderRadius: '12px', color: 'var(--color-mid-gray)', fontSize: '12px' }}>
                          Không yêu cầu môn tiên quyết
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section CHUỖI ẢNH HƯỞNG */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-mid-gray)', letterSpacing: '0.04em' }}>
                      CHUỖI ẢNH HƯỞNG (CÁC MÔN CẦN MÔN NÀY ĐỂ MỞ):
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      {selectedCourse.unlocks?.length > 0 ? (
                        selectedCourse.unlocks.map((uCode) => (
                          <div
                            key={uCode}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: 'var(--color-canvas)',
                              borderRadius: '12px'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>&rarr; {uCode}</span>
                            <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>Mở khóa</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-canvas)', borderRadius: '12px', color: 'var(--color-mid-gray)', fontSize: '12px' }}>
                          Không chặn môn tiếp theo
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--color-hairline)' }}>
                  <button
                    type="button"
                    className="haui-pill-btn-dark"
                    style={{ justifyContent: 'center' }}
                    onClick={() => handleAddCourseToPlanner(selectedCourse)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                    <span>+ Thêm môn này vào kế hoạch</span>
                  </button>

                  <button
                    type="button"
                    className="haui-pill-btn-canvas"
                    style={{ justifyContent: 'center' }}
                    onClick={() => handleCheckCourseEligibility(selectedCourse)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified_user</span>
                    <span>Kiểm tra điều kiện tiên quyết</span>
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-mid-gray)', padding: '24px 0' }}>
                Chọn một môn học trên sơ đồ luồng để xem chi tiết
              </div>
            )}
          </div>
        </div>
      )}

      {/* TABLE VIEW (Dạng Bảng) */}
      {!loading && !error && viewMode === 'table' && (
        <div className="haui-stat-card" style={{ padding: 0, overflow: 'hidden' }}>
          <Table
            columns={columns}
            data={filteredCourses}
            rowKey="courseCode"
            onRowClick={(row) => setSelectedCourse(row)}
            striped
            hoverable
          />
        </div>
      )}

      {/* Modal Kiểm tra Tiên quyết & Xử lý Ngoại lệ AC-02 */}
      <Modal
        isOpen={eligibilityModalOpen}
        onClose={() => setEligibilityModalOpen(false)}
        title={`Thẩm định Điều kiện Tiên quyết (Rule Engine): ${selectedCourse?.courseCode || ''} — ${selectedCourse?.courseName || ''}`}
        subtitle="Kết quả từ POST /api/v1/academic/eligibility (Kịch bản nghiệm thu AC-02 & Mục 5 Edge Cases)"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="haui-pill-btn-canvas"
              onClick={() => setEligibilityModalOpen(false)}
            >
              Đóng (ESC)
            </button>
            <button
              type="button"
              className={eligibilityResult?.eligible ? 'haui-pill-btn-dark' : 'haui-pill-btn-canvas'}
              disabled={!eligibilityResult?.eligible}
              style={{
                opacity: !eligibilityResult?.eligible ? 0.5 : 1,
                cursor: !eligibilityResult?.eligible ? 'not-allowed' : 'pointer'
              }}
              onClick={() => {
                setEligibilityModalOpen(false);
                const courseId = selectedCourse?.course_id || selectedCourse?.courseCode;
                const activePlanId = 'plan-2026-9001';
                navigate(`/planner?course_id=${encodeURIComponent(courseId)}&plan_id=${encodeURIComponent(activePlanId)}`);
              }}
            >
              {eligibilityResult?.eligible
                ? '+ Thêm môn vào Kế hoạch học tập (TV3 Planner) →'
                : '🚫 Đã khóa nút [Thêm môn] (Vi phạm tiên quyết BR-01)'}
            </button>
          </>
        }
      >
        {checkingEligibility && <Loading label="Rule Engine đang kiểm tra điều kiện tiên quyết..." />}

        {eligibilityError && !checkingEligibility && (
          <ErrorBox
            title="Không thể kiểm tra điều kiện học phần"
            error={eligibilityError}
            onRetry={() => selectedCourse && handleCheckCourseEligibility(selectedCourse)}
          />
        )}

        {eligibilityResult && !checkingEligibility && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {!eligibilityResult.eligible ? (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(231, 0, 11, 0.05)',
                  border: '1px solid rgba(231, 0, 11, 0.2)',
                  color: 'var(--color-ink)',
                  fontSize: '13px'
                }}
              >
                <strong style={{ color: 'var(--color-ember)' }}>🚨 Cảnh báo Vi phạm Tiên quyết (AC-02 / BR-01):</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--color-mid-gray)' }}>
                  AI gợi ý: <em>&ldquo;Bạn cần học và đạt môn Toán rời rạc (MATH1002) trước khi đăng ký môn {selectedCourse?.courseName}.&rdquo;</em> Nút <code>[ Thêm môn ]</code> đã bị vô hiệu hóa tự động.
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--color-canvas)',
                  border: '1px solid var(--color-hairline)',
                  color: 'var(--color-ink)',
                  fontSize: '13px'
                }}
              >
                <strong>✓ Đủ điều kiện đăng ký học phần:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--color-mid-gray)' }}>
                  Bạn đã thỏa mãn toàn bộ điều kiện tiên quyết và điều kiện tín chỉ để thêm môn học này vào Kế hoạch học kỳ tới.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CurriculumTreePage;
