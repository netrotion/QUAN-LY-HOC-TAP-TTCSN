import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import { Button, Card, Error as ErrorBox, Loading, Modal, Table } from '../components/ui/index.js';

/**
 * Màn hình 4 & Luồng phụ B: Chi tiết & Sơ đồ Cây quan hệ môn học (`/curriculum`) — TV2
 * Căn cứ:
 * - Màn hình 4 UI Flow: Interactive Node Graph (Node Xanh lá / Node Đỏ rung cảnh báo / Node Vàng viền đậm AI đề xuất / Node Xám khóa)
 * - Panel Chi tiết học phần & Nút điều hướng: [ Quay lại đề xuất ], [ Thêm môn này vào kế hoạch ]
 * - Mục 5 Edge Cases & AC-02: Hiển thị Popup cảnh báo đỏ và vô hiệu hóa nút [ Thêm môn ] khi vi phạm môn tiên quyết.
 */
export function CurriculumTreePage() {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bộ lọc theo Màn hình 4 UI Flow: theo kỳ, theo chuyên ngành hẹp, theo khối kiến thức, theo màu Node
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [nodeColorFilter, setNodeColorFilter] = useState('ALL');

  // Học phần đang được chọn trên Sơ đồ cây tương tác (Interactive Node Graph)
  const [selectedCourse, setSelectedCourse] = useState(null);

  // State kiểm tra điều kiện tiên quyết & Popup cảnh báo AC-02 (POST /api/v1/academic/eligibility)
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState(null);
  const [addedToPlanBanner, setAddedToPlanBanner] = useState(null);

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
    setAddedToPlanBanner(null);

    try {
      const res = await api.academic.checkEligibility({ courseCode: course.courseCode });
      setEligibilityResult(res);
    } catch (err) {
      setEligibilityError(err);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const allCourses = curriculum?.courses || [];
  const filteredCourses = allCourses.filter((c) => {
    if (blockFilter !== 'ALL' && c.block !== blockFilter) return false;
    if (specializationFilter !== 'ALL' && c.specialization !== specializationFilter) return false;
    if (nodeColorFilter !== 'ALL' && c.nodeColor !== nodeColorFilter) return false;
    return true;
  });

  // Nhóm các môn theo Học kỳ để vẽ Sơ đồ cây tương tác (Interactive Node Graph)
  const semesterGroups = [1, 2, 3, 4, 5, 8]
    .map((sem) => ({
      semester: sem,
      label: sem === 8 ? 'Học kỳ 8 (Đồ án TN)' : `Học kỳ ${sem}`,
      courses: filteredCourses.filter((c) => c.semester === sem)
    }))
    .filter((g) => g.courses.length > 0);

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
      title: 'Tên học phần'
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
      title: 'Tiên quyết (BR-01/BR-02)',
      width: '190px',
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
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Không</span>
        )
    },
    {
      key: 'unlocks',
      title: 'Mở khóa môn sau',
      width: '180px',
      render: (unlocks) =>
        Array.isArray(unlocks) && unlocks.length > 0 ? (
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary)' }}>
            &rarr; {unlocks.join(', ')}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>—</span>
        )
    },
    {
      key: 'letterGrade',
      title: 'Điểm',
      align: 'center',
      width: '95px',
      render: (val, row) =>
        val === null ? (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>null</span>
        ) : (
          <strong>
            {val} ({row.score10})
          </strong>
        )
    },
    {
      key: 'nodeColor',
      title: 'Loại Node (Màn 4)',
      width: '175px',
      render: (nodeColor) => {
        const map = {
          GREEN: { cls: 'haui-badge--success', label: '🟢 Đã hoàn thành' },
          RED: { cls: 'haui-badge--error', label: '🔴 Trượt / Nợ tiên quyết' },
          YELLOW: { cls: 'haui-badge--warning', label: '🟡 AI Đề xuất kỳ tới' },
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
      width: '150px',
      render: (_, row) => (
        <Button
          variant={row.nodeColor === 'GRAY' ? 'danger' : 'secondary'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleCheckCourseEligibility(row);
          }}
        >
          {row.nodeColor === 'GRAY' ? '🔒 Kiểm tra chặn' : '+ Thêm vào KH'}
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header & Bộ lọc đa chiều theo Màn hình 4 UI Flow */}
      <Card
        variant="status-info"
        title="Màn hình 4: Chi tiết & Sơ đồ Cây Quan hệ Môn học (Course Dependency Tree)"
        subtitle="Trực quan hóa môn tiên quyết (BR-01), môn học trước (BR-02), chuỗi môn bị chặn dây chuyền và đề xuất của AI (DEMO_UNVERIFIED)"
        headerAction={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Button variant="secondary" size="sm" onClick={() => navigate('/recommendations')}>
              &larr; Quay lại đề xuất (Màn 3)
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/planner')}>
              Mở Xác nhận Kế hoạch (Màn 5) &rarr;
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Chú giải 4 màu Node theo Màn hình 4 UI Flow */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Lọc theo Trạng thái Node:
            </span>
            {[
              { key: 'ALL', label: `Tất cả (${allCourses.length})` },
              { key: 'GREEN', label: '🟢 Node Xanh lá (Đã hoàn thành)' },
              { key: 'RED', label: '🔴 Node Đỏ (Trượt / Nợ môn - Cảnh báo)' },
              { key: 'YELLOW', label: '🟡 Node Vàng viền đậm (AI đề xuất kỳ tới)' },
              { key: 'GRAY', label: '🔒 Node Xám (Chưa đủ ĐK học - Khóa)' }
            ].map((item) => (
              <Button
                key={item.key}
                variant={nodeColorFilter === item.key ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setNodeColorFilter(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Bộ lọc theo Khối kiến thức & Chuyên ngành hẹp */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Khối kiến thức:
              </span>
              {['ALL', 'Đại cương', 'Cơ sở ngành', 'Chuyên ngành', 'Tự chọn', 'Tốt nghiệp'].map((blk) => (
                <Button
                  key={blk}
                  variant={blockFilter === blk ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setBlockFilter(blk)}
                >
                  {blk === 'ALL' ? 'Tất cả khối' : blk}
                </Button>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Chuyên ngành hẹp:
              </span>
              {['ALL', 'Chung CNTT/KTPM', 'Kỹ thuật phần mềm', 'Trí tuệ nhân tạo / KTPM'].map((spec) => (
                <Button
                  key={spec}
                  variant={specializationFilter === spec ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSpecializationFilter(spec)}
                >
                  {spec === 'ALL' ? 'Tất cả CN' : spec}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {loading && <Loading label="Đang dựng Sơ đồ Cây quan hệ môn học..." />}

      {error && !loading && (
        <ErrorBox
          title="Không thể tải dữ liệu Sơ đồ Cây CTĐT"
          error={error}
          onRetry={loadCurriculum}
        />
      )}

      {!loading && !error && (
        <>
          {/* Sơ đồ cây tương tác (Interactive Node Graph) + Panel Chi tiết học phần */}
          <div className="haui-grid" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
            <Card
              title="Sơ đồ Cây Phụ thuộc Môn học Tương tác (Interactive Node Graph)"
              subtitle="Click vào bất kỳ Node môn học nào để xem chuỗi tiên quyết và kiểm tra thêm vào kế hoạch"
            >
              <div className="haui-tree-semester-grid">
                {semesterGroups.map((group) => (
                  <div key={group.semester} className="haui-tree-column">
                    <div className="haui-tree-column__header">
                      <span>{group.label}</span>
                      <span>{group.courses.reduce((s, c) => s + c.credits, 0)} TC</span>
                    </div>

                    {group.courses.map((course) => {
                      const isSelected = selectedCourse?.courseCode === course.courseCode;
                      return (
                        <div
                          key={course.courseCode}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedCourse(course)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedCourse(course);
                            }
                          }}
                          className={`haui-tree-node haui-tree-node--${course.nodeColor} ${
                            isSelected ? 'haui-tree-node--selected' : ''
                          }`.trim()}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <code style={{ fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                              {course.nodeColor === 'GRAY' && '🔒 '}
                              {course.nodeColor === 'RED' && '⚠️ '}
                              {course.nodeColor === 'YELLOW' && '⭐ '}
                              {course.nodeColor === 'GREEN' && '✓ '}
                              {course.courseCode}
                            </code>
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>
                              {course.credits} TC
                            </span>
                          </div>

                          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', lineHeight: 1.3, marginBottom: '6px' }}>
                            {course.courseName}
                          </div>

                          <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                              {course.letterGrade
                                ? `Điểm: ${course.letterGrade} (${course.score10})`
                                : course.nodeColor === 'YELLOW'
                                  ? 'AI Đề xuất kỳ tới'
                                  : 'Chưa học (null)'}
                            </span>
                            {course.unlocks?.length > 0 && (
                              <span title={`Là tiên quyết của: ${course.unlocks.join(', ')}`}>
                                &rarr; Mở {course.unlocks.length} môn
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>

            {/* Panel Chi tiết học phần (khi click vào 1 môn trên Sơ đồ cây — Màn hình 4 & Luồng phụ B) */}
            <Card
              variant={
                selectedCourse?.nodeColor === 'RED'
                  ? 'status-error'
                  : selectedCourse?.nodeColor === 'YELLOW'
                    ? 'status-warning'
                    : 'status-info'
              }
              title={
                selectedCourse
                  ? `Chi tiết: ${selectedCourse.courseCode} — ${selectedCourse.courseName}`
                  : 'Panel Chi tiết Học phần'
              }
              subtitle={
                selectedCourse
                  ? `${selectedCourse.block} • Chuyên ngành: ${selectedCourse.specialization}`
                  : 'Chọn 1 học phần trên sơ đồ cây để xem chi tiết'
              }
              footer={
                selectedCourse && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', justifyContent: 'space-between' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/recommendations')}
                    >
                      Quay lại đề xuất
                    </Button>
                    <Button
                      variant={selectedCourse.nodeColor === 'GRAY' ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => handleCheckCourseEligibility(selectedCourse)}
                    >
                      {selectedCourse.nodeColor === 'GRAY'
                        ? '🔒 Thử thêm môn (Kiểm tra chặn AC-02)'
                        : '+ Thêm môn này vào kế hoạch'}
                    </Button>
                  </div>
                )
              }
            >
              {selectedCourse ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                  <div>
                    <strong>Mô tả học phần:</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                      {selectedCourse.description}
                    </p>
                  </div>

                  <div className="haui-grid haui-grid--2" style={{ gap: 'var(--space-2)' }}>
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>TÍN CHỈ / SỐ TIẾT:</span>
                      <div style={{ fontWeight: 600 }}>
                        {selectedCourse.credits} TC ({selectedCourse.lectureHours} LT / {selectedCourse.labHours} TH)
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>ĐỘ KHÓ ĐÁNH GIÁ:</span>
                      <div style={{ fontWeight: 600 }}>{selectedCourse.difficulty}</div>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      HỌC PHẦN TIÊN QUYẾT / HỌC TRƯỚC ({selectedCourse.relationType || 'Không'}):
                    </span>
                    <div style={{ marginTop: '4px' }}>
                      {selectedCourse.prerequisites?.length > 0 ? (
                        selectedCourse.prerequisites.map((code) => (
                          <span key={code} className="haui-badge haui-badge--warning" style={{ marginRight: '6px' }}>
                            Cần đạt: {code}
                          </span>
                        ))
                      ) : (
                        <span className="haui-badge haui-badge--success">Không yêu cầu môn tiên quyết</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      CHUỖI ẢNH HƯỞNG (CÁC MÔN CẦN MÔN NÀY LÀM TIÊN QUYẾT):
                    </span>
                    <div style={{ marginTop: '4px' }}>
                      {selectedCourse.unlocks?.length > 0 ? (
                        selectedCourse.unlocks.map((code) => (
                          <span key={code} className="haui-badge haui-badge--info" style={{ marginRight: '6px' }}>
                            Mở khóa &rarr; {code}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          Không chặn môn tiếp theo
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-bg-muted)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--text-xs)'
                    }}
                  >
                    <strong>Ghi chú Cố vấn:</strong> {selectedCourse.instructorNote}
                  </div>
                </div>
              ) : null}
            </Card>
          </div>

          {/* Bảng Tra cứu toàn bộ Danh mục CTĐT (Luồng phụ B: Curriculum Explorer) */}
          <Card
            title="Luồng phụ B: Danh mục Khung Chương trình Đào tạo Chi tiết (Curriculum Explorer)"
            subtitle="Click vào từng dòng để xem trên Panel Chi tiết hoặc bấm kiểm tra Rule Engine tiên quyết"
          >
            <Table
              columns={columns}
              data={filteredCourses}
              rowKey="courseCode"
              onRowClick={(row) => setSelectedCourse(row)}
              emptyTitle="Không có học phần nào thuộc bộ lọc này"
              emptyDescription="Hãy đặt lại bộ lọc về 'Tất cả' để xem toàn bộ cây chương trình đào tạo."
              emptyAction={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setBlockFilter('ALL');
                    setSpecializationFilter('ALL');
                    setNodeColorFilter('ALL');
                  }}
                >
                  Đặt lại bộ lọc
                </Button>
              }
              striped
              hoverable
            />
          </Card>
        </>
      )}

      {/* Modal Kiểm tra Tiên quyết & Xử lý Ngoại lệ Mục 5 UI Flow / AC-02 */}
      <Modal
        isOpen={eligibilityModalOpen}
        onClose={() => setEligibilityModalOpen(false)}
        title={`Thẩm định Điều kiện Tiên quyết (Rule Engine): ${selectedCourse?.courseCode || ''} — ${selectedCourse?.courseName || ''}`}
        subtitle="Kết quả từ POST /api/v1/academic/eligibility (Kịch bản nghiệm thu AC-02 & Mục 5 Edge Cases)"
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEligibilityModalOpen(false)}>
              Đóng (ESC)
            </Button>
            {/* Theo Mục 5 Edge Cases & AC-02: Nút [ Thêm môn ] bị vô hiệu hóa nếu vi phạm môn tiên quyết! */}
            <Button
              variant={eligibilityResult?.eligible ? 'primary' : 'danger'}
              size="sm"
              disabled={!eligibilityResult?.eligible}
              onClick={() => {
                setEligibilityModalOpen(false);
                navigate(`/planner?course_id=${selectedCourse?.courseCode}`);
              }}
            >
              {eligibilityResult?.eligible
                ? '+ Thêm môn vào Kế hoạch học tập (TV3 Planner) →'
                : '🚫 Đã khóa nút [Thêm môn] (Vi phạm tiên quyết BR-01)'}
            </Button>
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
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-error-bg)',
                  border: '1px solid var(--color-error-border)',
                  borderLeft: '4px solid var(--color-error)',
                  color: 'var(--color-error-text)',
                  fontSize: 'var(--text-sm)'
                }}
              >
                <strong>🚨 Cảnh báo Vi phạm Tiên quyết (AC-02 / BR-01):</strong>
                <p style={{ margin: '6px 0 0' }}>
                  AI gợi ý: <em>&ldquo;Bạn cần học và đạt môn Toán rời rạc (MATH1002) trước khi đăng ký môn {selectedCourse?.courseName}.&rdquo;</em> Nút <code>[ Thêm môn ]</code> đã bị vô hiệu hóa tự động.
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success-border)',
                  color: 'var(--color-success-text)',
                  fontSize: 'var(--text-sm)'
                }}
              >
                <strong>✓ Thỏa mãn điều kiện tiên quyết:</strong> Học phần này đủ điều kiện đưa vào Kế hoạch học tập kỳ tới.
              </div>
            )}

            {addedToPlanBanner && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)'
                }}
              >
                ✓ {addedToPlanBanner}
              </div>
            )}

            {Array.isArray(eligibilityResult.missingPrerequisites) &&
              eligibilityResult.missingPrerequisites.length > 0 && (
                <div>
                  <strong>Học phần tiên quyết còn nợ:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: '20px', color: 'var(--color-error-text)', fontSize: 'var(--text-sm)' }}>
                    {eligibilityResult.missingPrerequisites.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

            {Array.isArray(eligibilityResult.warnings) && eligibilityResult.warnings.length > 0 && (
              <div>
                <strong>Chi tiết thẩm định từ Rule Engine:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: '20px', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                  {eligibilityResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <pre className="haui-code-block">{JSON.stringify(eligibilityResult, null, 2)}</pre>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CurriculumTreePage;
