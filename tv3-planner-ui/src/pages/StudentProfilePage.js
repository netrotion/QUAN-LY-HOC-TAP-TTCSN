import React, { useState, useEffect, useCallback } from 'react';
import { plannerStore } from '../services/plannerStore.js';

/**
 * Màn hình Hồ sơ Sinh viên & Tùy chọn Học tập cá nhân (Student Profile) — TV3
 * Dựa trên prototype `ho_so_sinh_vien/code.html`.
 *
 * Thực hiện yêu cầu nghiệp vụ:
 * 1. Hiển thị thông tin hành chính, học vụ cá nhân (CPA 3.18, GPA, 108/145 TC).
 * 2. Thiết lập mục tiêu học tập cá nhân (Mục tiêu CPA, lộ trình chuẩn 4 năm vs học vượt 3.5 năm).
 * 3. Trích xuất kế hoạch đang theo dõi từ plannerStore và cung cấp liên kết sang Study Planner.
 * 4. Đầy đủ 3 trạng thái kiểm thử: Empty, Loading, Error.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client từ TV2
 * @param {Object} props.ui - Shared UI Library V0 từ TV2
 */
export function StudentProfilePage({ api, ui } = {}) {
  const {
    Button,
    Card,
    Loading,
    Error: ErrorBox,
    EmptyState
  } = ui || {};

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
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
    handleFetchProfile();
  }, [handleFetchProfile]);

  // Lưu tùy chọn mục tiêu cá nhân
  const handleSavePreferences = () => {
    showToast('Đã lưu thành công tùy chọn mục tiêu học tập cá nhân!');
  };

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
      { style: { display: 'flex', gap: '8px' } },
      Button ? React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: () => setProfileData(null) }, 'Trạng thái Rỗng') : null,
      Button
        ? React.createElement(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: () => setError({ code: 'ERR_PROFILE', message: 'Mô phỏng lỗi máy chủ.' })
            },
            'Mô phỏng Lỗi'
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
            style: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }
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

  if (!profileData) {
    return React.createElement(
      'div',
      { className: 'haui-page-container', style: { padding: '24px 0' } },
      headerSection,
      EmptyState
        ? React.createElement(EmptyState, {
            title: 'Chưa có thông tin hồ sơ sinh viên',
            description: 'Không tìm thấy dữ liệu sinh viên trong phiên làm việc.',
            actionLabel: 'Tải lại',
            onAction: handleFetchProfile
          })
        : React.createElement('div', null, 'Chưa có dữ liệu.')
    );
  }

  return React.createElement(
    'div',
    { className: 'haui-page-container haui-profile-page', style: { padding: '24px 0' } },
    headerSection,
    toastBar,

    // Lưới 2 cột
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
        // Thẻ 1: Thông tin cá nhân
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
                    : null
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
                          onClick: () => {
                            if (typeof window !== 'undefined' && window.location) {
                              window.location.hash = '#/planner';
                            }
                          }
                        },
                        'Mở trong Study Planner →'
                      )
                    : null
                )
              )
            )
          : null
      )
    )
  );
}

export default StudentProfilePage;
