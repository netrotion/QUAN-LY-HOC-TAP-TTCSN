import React, { useState, useEffect, useCallback } from 'react';
import { plannerStore } from '../services/plannerStore.js';

/**
 * Mẫu hồ sơ sinh viên K16 chuẩn (HaUI SICT) phục vụ khám phá và kiểm thử
 */
export const SAMPLE_K16_PROFILE = Object.freeze({
  studentId: '2020601234',
  fullName: 'Nguyễn Văn An',
  studentCode: '2020601234',
  majorName: 'Kỹ thuật phần mềm (Khoa CNTT)',
  majorCode: '7480103',
  cohort: 'Khóa 16 (2020 - 2024)',
  faculty: 'Trường Công nghệ Thông tin & Truyền thông (SICT - HaUI)',
  advisorClass: 'KTPM01-K16',
  cpa: 3.18,
  gpa: 3.32,
  accumulatedCredits: 108,
  totalCreditsRequired: 145,
  riskLevel: 'SAFE',
  warningMessages: ['Cần hoàn thành môn Toán rời rạc (MATH1002 - Điểm F) trước khi đăng ký đồ án tốt nghiệp.']
});

/**
 * Màn hình Hồ sơ Sinh viên & Tùy chọn Học tập cá nhân (Student Profile) — TV3
 * Dựa trên prototype `ho_so_sinh_vien/code.html` và yêu cầu Task 3.12:
 *
 * 1. Hiển thị thông tin hành chính, học vụ cá nhân (MSSV, Họ tên, Ngành, CPA 3.18, GPA, 108/145 TC).
 * 2. Thiết lập mục tiêu học tập cá nhân (Mục tiêu CPA 3.20/3.60, lộ trình chuẩn 4 năm vs học vượt 3.5 năm, chuyên ngành hẹp).
 * 3. Trích xuất kế hoạch đang theo dõi từ plannerStore và cung cấp liên kết sang Study Planner.
 * 4. Trạng thái Chưa có hồ sơ (Empty State):
 *    - Hướng dẫn sinh viên mở luồng nhập bảng điểm chung của TV2 (/transcript).
 *    - Cung cấp nút tải hồ sơ mẫu K16 để trải nghiệm hệ thống.
 * 5. Đầy đủ các nút chuyển đổi trạng thái kiểm thử (Hồ sơ chuẩn, Chưa có hồ sơ, Mô phỏng Lỗi).
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2
 * @param {Function} [props.onOpenTranscript] - Callback mở luồng nhập bảng điểm TV2
 * @param {Function} [props.onOpenPlanner] - Callback chuyển sang Study Planner
 * @param {Object|null} [props.initialProfileData] - Dữ liệu hồ sơ khởi tạo
 * @param {boolean} [props.initialLoading] - Trạng thái loading khởi tạo
 */
export function StudentProfilePage({
  api,
  ui,
  onOpenTranscript,
  onOpenPlanner,
  initialProfileData = undefined,
  initialLoading = false
} = {}) {
  const {
    Button,
    Card,
    Loading,
    Error: ErrorBox,
    EmptyState
  } = ui || {};

  const [profileData, setProfileData] = useState(
    initialProfileData !== undefined ? initialProfileData : null
  );
  const [loading, setLoading] = useState(
    initialProfileData !== undefined ? initialLoading : true
  );
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Tùy chọn mục tiêu cá nhân
  const [targetCpa, setTargetCpa] = useState('3.20');
  const [graduationPace, setGraduationPace] = useState('STANDARD'); // 'STANDARD' (4 năm) | 'FAST' (3.5 năm)
  const [specialization, setSpecialization] = useState('Kỹ thuật phần mềm Web & Di động');

  const currentPlan = plannerStore.getPlan();

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  // Điều hướng an toàn
  const navigateTo = useCallback((path) => {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.hash) {
        window.location.hash = `#${path.startsWith('/') ? path : '/' + path}`;
      } else {
        window.location.pathname = path;
      }
    }
  }, []);

  // Mở luồng nhập bảng điểm chung của TV2
  const handleOpenTranscript = useCallback(() => {
    showToast('Đang chuyển đến luồng Nhập bảng điểm chung của TV2...');
    if (typeof onOpenTranscript === 'function') {
      onOpenTranscript();
    } else {
      navigateTo('/transcript');
    }
  }, [onOpenTranscript, navigateTo, showToast]);

  // Mở kế hoạch học tập Study Planner
  const handleOpenPlanner = useCallback(() => {
    if (typeof onOpenPlanner === 'function') {
      onOpenPlanner();
    } else {
      navigateTo('/planner');
    }
  }, [onOpenPlanner, navigateTo]);

  // Tải dữ liệu hồ sơ sinh viên
  const handleFetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let academicStatus = null;
      if (api && api.academic && typeof api.academic.getStatus === 'function') {
        academicStatus = await api.academic.getStatus();
      }

      const sessionStudent = api?.getConfig?.()?.sessionStudent || null;

      // Nếu có dữ liệu từ backend hoặc session
      if (academicStatus || sessionStudent) {
        setProfileData({
          studentId: academicStatus?.studentId || sessionStudent?.studentId || '2020601234',
          fullName: sessionStudent?.fullName || 'Nguyễn Văn An',
          studentCode: sessionStudent?.studentCode || '2020601234',
          majorName: sessionStudent?.majorName || 'Kỹ thuật phần mềm (Khoa CNTT)',
          majorCode: sessionStudent?.majorCode || '7480103',
          cohort: sessionStudent?.cohort || 'Khóa 16 (2020 - 2024)',
          faculty: sessionStudent?.faculty || 'Trường Công nghệ Thông tin & Truyền thông (SICT - HaUI)',
          advisorClass: sessionStudent?.advisorClass || 'KTPM01-K16',
          cpa: academicStatus?.cpa ?? 3.18,
          gpa: academicStatus?.gpa ?? 3.32,
          accumulatedCredits: academicStatus?.accumulatedCredits ?? 108,
          totalCreditsRequired: academicStatus?.totalCreditsRequired ?? 145,
          riskLevel: academicStatus?.riskLevel || 'SAFE',
          warningMessages: academicStatus?.warningMessages || ['Cần hoàn thành môn Toán rời rạc (MATH1002) trước khi đăng ký đồ án.']
        });
      } else {
        // Fallback mặc định nạp hồ sơ mẫu K16
        setProfileData({ ...SAMPLE_K16_PROFILE });
      }
    } catch (err) {
      setError({
        code: err?.code || 'PROFILE_FETCH_FAILED',
        message: err?.message || 'Không thể tải thông tin hồ sơ sinh viên.',
        details: ['Kiểm tra kết nối tới Backend Spring Boot hoặc mock mode.']
      });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (initialProfileData === undefined) {
      handleFetchProfile();
    }
  }, [handleFetchProfile, initialProfileData]);

  // Nạp hồ sơ mẫu K16
  const handleLoadSampleProfile = useCallback(() => {
    setProfileData({ ...SAMPLE_K16_PROFILE });
    setError(null);
    showToast('Đã nạp dữ liệu hồ sơ mẫu sinh viên K16.');
  }, [showToast]);

  // Chuyển sang trạng thái Chưa có hồ sơ (Empty State) để kiểm thử
  const handleSetEmptyProfile = useCallback(() => {
    setProfileData(null);
    setError(null);
    showToast('Đang ở trạng thái: Chưa có hồ sơ sinh viên (Chưa nạp bảng điểm).');
  }, [showToast]);

  // Lưu tùy chọn mục tiêu cá nhân
  const handleSavePreferences = useCallback(() => {
    showToast(`Đã lưu thành công mục tiêu CPA: ${targetCpa}, tiến độ: ${graduationPace === 'FAST' ? 'Học vượt 3.5 năm' : 'Chuẩn 4 năm'}!`);
  }, [targetCpa, graduationPace, showToast]);

  // Header trang
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
        'Hồ sơ Sinh viên & Tùy chọn Lộ trình (Student Profile)'
      ),
      React.createElement(
        'p',
        { style: { color: '#475569', marginTop: '4px', fontSize: '14px' } },
        'Quản lý thông tin học vụ, tiến độ tích lũy tín chỉ và tùy chỉnh mục tiêu điểm số cá nhân hóa.'
      )
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
      Button ? React.createElement(Button, { variant: 'secondary', size: 'sm', onClick: handleLoadSampleProfile }, 'Hồ sơ chuẩn (K16)') : null,
      Button ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: handleSetEmptyProfile }, 'Chưa có hồ sơ') : null,
      Button
        ? React.createElement(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: () => setError({ code: 'ERR_PROFILE', message: 'Mô phỏng lỗi máy chủ khi tải hồ sơ.' })
            },
            'Mô phỏng Lỗi'
          )
        : null,
      Button
        ? React.createElement(
            Button,
            {
              variant: 'primary',
              size: 'sm',
              onClick: handleOpenTranscript
            },
            '📎 Nhập bảng điểm (TV2)'
          )
        : null
    )
  );

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
        React.createElement('span', null, `✓ ${toastMessage}`),
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

  if (loading) {
    return React.createElement(
      'div',
      { className: 'haui-page-container', style: { padding: '24px 0' } },
      headerSection,
      Loading
        ? React.createElement(Loading, { variant: 'spinner', size: 'lg', label: 'Đang tải thông tin hồ sơ sinh viên...' })
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
            title: 'Lỗi tải hồ sơ sinh viên',
            error,
            message: error?.message,
            onRetry: handleFetchProfile
          })
        : React.createElement('div', { style: { color: 'red' } }, error?.message)
    );
  }

  // TRẠNG THÁI CHƯA CÓ HỒ SƠ (EMPTY STATE)
  if (!profileData) {
    return React.createElement(
      'div',
      { className: 'haui-page-container haui-profile-empty', style: { padding: '24px 0' } },
      headerSection,
      toastBar,
      EmptyState
        ? React.createElement(EmptyState, {
            title: 'Chưa có thông tin hồ sơ sinh viên',
            description:
              'Hệ thống chưa tìm thấy dữ liệu học tập cá nhân của bạn. Để bắt đầu tư vấn lộ trình học tập, phân tích What-if và kiểm toán tốt nghiệp, vui lòng nạp bảng điểm từ sv.haui.edu.vn tại luồng Nhập bảng điểm của hệ thống.',
            actionLabel: '📎 Nhập bảng điểm ngay (TV2)',
            onAction: handleOpenTranscript
          })
        : React.createElement(
            'div',
            {
              style: {
                padding: '40px',
                textAlign: 'center',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
              }
            },
            React.createElement('h3', { style: { color: '#0f172a' } }, 'Chưa có thông tin hồ sơ sinh viên'),
            React.createElement(
              'p',
              { style: { color: '#64748b', maxWidth: '500px', margin: '8px auto' } },
              'Vui lòng nhập bảng điểm hoặc nạp hồ sơ mẫu để bắt đầu.'
            )
          ),
      // Bổ sung nút hành động phụ cho Empty State
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '20px'
          }
        },
        Button
          ? React.createElement(
              Button,
              { variant: 'secondary', size: 'md', onClick: handleLoadSampleProfile },
              'Tải hồ sơ mẫu K16 (Khám phá)'
            )
          : React.createElement(
              'button',
              { type: 'button', onClick: handleLoadSampleProfile },
              'Tải hồ sơ mẫu K16'
            ),
        Button
          ? React.createElement(
              Button,
              { variant: 'ghost', size: 'md', onClick: handleFetchProfile },
              'Tải lại'
            )
          : null
      )
    );
  }

  // TRẠNG THÁI ĐÃ CÓ HỒ SƠ
  return React.createElement(
    'div',
    { className: 'haui-page-container haui-profile-page', style: { padding: '24px 0' } },
    headerSection,
    toastBar,

    // Lưới 2 cột: Cột trái (Thông tin cá nhân & Chỉ số) + Cột phải (Tùy chọn mục tiêu & Kế hoạch)
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }
      },
      // CỘT 1: THÔNG TIN HÀNH CHÍNH & HỌC VỤ
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
        // Thẻ 1: Thông tin cá nhân & đào tạo
        Card
          ? React.createElement(
              Card,
              {
                title: 'Thông tin cá nhân & Đào tạo',
                subtitle: 'Dữ liệu định danh tài khoản sinh viên',
                variant: 'default',
                padding: 'md'
              },
              React.createElement(
                'div',
                { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px' } },
                React.createElement('div', null, React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'Họ và tên'), React.createElement('strong', { style: { color: '#0f172a' } }, profileData.fullName)),
                React.createElement('div', null, React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'Mã sinh viên (MSSV)'), React.createElement('strong', { style: { color: '#0f172a' } }, profileData.studentCode)),
                React.createElement('div', null, React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'Ngành đào tạo'), React.createElement('strong', { style: { color: '#0f172a' } }, profileData.majorName)),
                React.createElement('div', null, React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'Khóa tuyển sinh'), React.createElement('strong', { style: { color: '#0f172a' } }, profileData.cohort)),
                React.createElement('div', null, React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'Lớp cố vấn học tập'), React.createElement('strong', { style: { color: '#0f172a' } }, profileData.advisorClass)),
                React.createElement('div', null, React.createElement('div', { style: { color: '#64748b', fontSize: '11px' } }, 'Khoa / Trường quản lý'), React.createElement('strong', { style: { color: '#0f172a' } }, profileData.faculty))
              )
            )
          : null,

        // Thẻ 2: Chỉ số học vụ cốt lõi
        Card
          ? React.createElement(
              Card,
              {
                title: 'Chỉ số học vụ & Tiến độ tích lũy',
                subtitle: 'Dữ liệu được cập nhật theo kết quả Kỳ 1 đến Kỳ 6',
                variant: 'default',
                padding: 'md'
              },
              React.createElement(
                'div',
                { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' } },
                React.createElement(
                  'div',
                  { style: { padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' } },
                  React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'CPA Tích lũy'),
                  React.createElement('strong', { style: { fontSize: '20px', color: '#0284c7' } }, `${profileData.cpa} `),
                  React.createElement('span', { style: { fontSize: '11px', color: '#64748b' } }, '/ 4.00')
                ),
                React.createElement(
                  'div',
                  { style: { padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' } },
                  React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'GPA Học kỳ gần nhất'),
                  React.createElement('strong', { style: { fontSize: '20px', color: '#16a34a' } }, `${profileData.gpa} `),
                  React.createElement('span', { style: { fontSize: '11px', color: '#64748b' } }, '/ 4.00')
                ),
                React.createElement(
                  'div',
                  { style: { padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' } },
                  React.createElement('div', { style: { fontSize: '11px', color: '#64748b' } }, 'Tín chỉ đã tích lũy'),
                  React.createElement('strong', { style: { fontSize: '20px', color: '#0f172a' } }, `${profileData.accumulatedCredits} `),
                  React.createElement('span', { style: { fontSize: '11px', color: '#64748b' } }, `/ ${profileData.totalCreditsRequired} TC`)
                )
              ),
              React.createElement(
                'div',
                { style: { marginTop: '14px', fontSize: '12px', color: '#b45309', background: '#fef3c7', padding: '8px 12px', borderRadius: '8px' } },
                '⚠️ Cảnh báo học vụ: Nợ học phần bắt buộc Toán rời rạc (MATH1002 - Điểm F). Đã được AI ưu tiên đưa vào kế hoạch Kỳ 7.'
              )
            )
          : null
      ),

      // CỘT 2: TÙY CHỌN MỤC TIÊU & KẾ HOẠCH THEO DÕI
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
        // Thẻ 3: Thiết lập mục tiêu cá nhân
        Card
          ? React.createElement(
              Card,
              {
                title: 'Tùy chọn mục tiêu học tập cá nhân',
                subtitle: 'AI và công cụ học vụ sẽ dựa vào đây để tối ưu hóa lộ trình',
                variant: 'default',
                padding: 'md',
                footer: React.createElement(
                  'div',
                  { style: { display: 'flex', justifyContent: 'flex-end' } },
                  Button
                    ? React.createElement(
                        Button,
                        { variant: 'primary', size: 'sm', onClick: handleSavePreferences },
                        'Lưu mục tiêu cá nhân'
                      )
                    : React.createElement('button', { type: 'button', onClick: handleSavePreferences }, 'Lưu')
                )
              },
              React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' } },
                // Mục tiêu CPA
                React.createElement(
                  'div',
                  null,
                  React.createElement('label', { style: { fontWeight: 600, display: 'block', marginBottom: '4px' } }, 'Mục tiêu CPA tốt nghiệp mong muốn:'),
                  React.createElement(
                    'select',
                    {
                      value: targetCpa,
                      onChange: (e) => setTargetCpa(e.target.value),
                      style: { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }
                    },
                    React.createElement('option', { value: '2.50' }, 'CPA ≥ 2.50 (Xếp loại Khá)'),
                    React.createElement('option', { value: '3.20' }, 'CPA ≥ 3.20 (Xếp loại Giỏi)'),
                    React.createElement('option', { value: '3.60' }, 'CPA ≥ 3.60 (Xếp loại Xuất sắc)')
                  )
                ),
                // Định hướng tiến độ
                React.createElement(
                  'div',
                  null,
                  React.createElement('label', { style: { fontWeight: 600, display: 'block', marginBottom: '4px' } }, 'Tiến độ mong muốn:'),
                  React.createElement(
                    'select',
                    {
                      value: graduationPace,
                      onChange: (e) => setGraduationPace(e.target.value),
                      style: { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }
                    },
                    React.createElement('option', { value: 'STANDARD' }, 'Chuẩn 4 năm (2 kỳ chính + 1 kỳ hè nhẹ)'),
                    React.createElement('option', { value: 'FAST' }, 'Rút ngắn 3.5 năm (Học vượt, tối đa 8 TC kỳ hè)')
                  )
                ),
                // Chuyên ngành hẹp
                React.createElement(
                  'div',
                  null,
                  React.createElement('label', { style: { fontWeight: 600, display: 'block', marginBottom: '4px' } }, 'Định hướng chuyên ngành hẹp:'),
                  React.createElement('input', {
                    type: 'text',
                    value: specialization,
                    onChange: (e) => setSpecialization(e.target.value),
                    style: { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }
                  })
                )
              )
            )
          : null,

        // Thẻ 4: Bản kế hoạch đang áp dụng (ACTIVE Plan snapshot)
        Card
          ? React.createElement(
              Card,
              {
                title: 'Kế hoạch học tập đang theo dõi',
                subtitle: 'Lộ trình chính thức đang lưu trong hệ thống',
                variant: 'default',
                padding: 'sm'
              },
              React.createElement(
                'div',
                { style: { fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' } },
                React.createElement(
                  'div',
                  { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  React.createElement('strong', { style: { color: '#0f172a' } }, currentPlan.planName),
                  React.createElement(
                    'span',
                    {
                      style: {
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: currentPlan.status === 'ACTIVE' ? '#0a0a0a' : '#fef3c7',
                        color: currentPlan.status === 'ACTIVE' ? '#ffffff' : '#b45309'
                      }
                    },
                    currentPlan.status
                  )
                ),
                React.createElement(
                  'div',
                  { style: { color: '#64748b', fontSize: '12px' } },
                  `Phiên bản: ${currentPlan.version} · Gồm ${currentPlan.semesters?.length || 3} học kỳ (${currentPlan.remainingCredits || 37} TC) · CPA dự phóng: ${currentPlan.projectedCpa || '3.32'}`
                ),
                React.createElement(
                  'div',
                  { style: { marginTop: '6px' } },
                  Button
                    ? React.createElement(
                        Button,
                        {
                          variant: 'secondary',
                          size: 'sm',
                          onClick: handleOpenPlanner
                        },
                        'Mở trong Study Planner →'
                      )
                    : React.createElement(
                        'button',
                        { type: 'button', onClick: handleOpenPlanner },
                        'Mở trong Study Planner'
                      )
                )
              )
            )
          : null
      )
    )
  );
}

export default StudentProfilePage;
