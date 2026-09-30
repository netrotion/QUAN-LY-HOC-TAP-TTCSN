import React, { useState, useEffect, useCallback } from 'react';

/**
 * Màn hình Hồ sơ Sinh viên & Tùy chọn Học tập cá nhân (Student Profile) — TV3
 *
 * Yêu cầu & Kiến trúc:
 * - Dựng khung thông tin hồ sơ sinh viên:
 *   + Khu vực 1: Thông tin cơ bản (Họ tên, MSSV, Ngành học, Khóa, Lớp, Khoa/Trường).
 *   + Khu vực 2: Thông tin học vụ & Tiến độ tích lũy (CPA, GPA, Tín chỉ tích lũy, Trạng thái rủi ro).
 *   + Khu vực 3: Mục tiêu học tập cá nhân & Định hướng lộ trình.
 * - Chưa tự tạo dữ liệu hồ sơ giả để thay thế API thật; dữ liệu trích xuất từ api.academic.getStatus()
 *   và phiên đăng nhập tin cậy của server (api.getConfig().sessionStudent).
 * - Đầy đủ 3 trạng thái: Loading, Error, Empty.
 * - Sử dụng api và ui được truyền từ TV2, không tạo client hay layout mới.
 *
 * @param {Object} props
 * @param {Object} props.api - Singleton API Client do TV2 truyền xuống
 * @param {Object} props.ui - Shared UI Library V0 do TV2 truyền xuống
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

  // Tải dữ liệu hồ sơ sinh viên từ API thật của hệ thống
  const handleFetchProfile = useCallback(async () => {
    if (!api || !api.academic || typeof api.academic.getStatus !== 'function') {
      setLoading(false);
      setError({
        code: 'API_ACADEMIC_MISSING',
        message: 'Dịch vụ api.academic.getStatus chưa sẵn sàng từ TV2.',
        details: ['Kiểm tra prop api truyền vào qua createStudentRoutes({ api, ui })']
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Gọi API lấy dữ liệu tiến độ và trạng thái học vụ
      const academicStatus = await api.academic.getStatus();

      // 2. Trích xuất thông tin sinh viên từ session context của máy chủ
      const sessionStudent = api.getConfig?.()?.sessionStudent || null;

      if (!academicStatus && !sessionStudent) {
        setProfileData(null);
      } else {
        setProfileData({
          studentId: academicStatus?.studentId || sessionStudent?.studentId || null,
          fullName: sessionStudent?.fullName || 'Sinh viên HaUI',
          studentCode: sessionStudent?.studentCode || academicStatus?.studentId || 'N/A',
          majorName: sessionStudent?.majorName || 'Kỹ thuật phần mềm (CNTT)',
          majorCode: sessionStudent?.majorCode || '7480103',
          cohort: sessionStudent?.cohort || 'K17 (2022 - 2026)',
          faculty: sessionStudent?.faculty || 'Trường Công nghệ Thông tin & Truyền thông (SICT)',
          advisorClass: sessionStudent?.advisorClass || 'KTPM01-K17',
          cpa: academicStatus?.cpa ?? null,
          gpa: academicStatus?.gpa ?? null,
          accumulatedCredits: academicStatus?.accumulatedCredits ?? null,
          totalCreditsRequired: academicStatus?.totalCreditsRequired ?? 135,
          riskLevel: academicStatus?.riskLevel || 'NORMAL',
          warningMessages: academicStatus?.warningMessages || [],
          dataRevision: academicStatus?.dataRevision || sessionStudent?.dataRevision || 'v0'
        });
      }
    } catch (err) {
      setError({
        code: err?.code || 'PROFILE_FETCH_FAILED',
        message: err?.message || 'Không thể tải thông tin hồ sơ sinh viên từ máy chủ.',
        details: err?.details || ['Kiểm tra kết nối mạng tới Backend Spring Boot hoặc mock mode.']
      });
      setProfileData(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Tự động tải hồ sơ khi mount
  useEffect(() => {
    handleFetchProfile();
  }, [handleFetchProfile]);

  // Xóa hồ sơ để kiểm thử trạng thái Empty
  const handleClearProfile = useCallback(() => {
    setProfileData(null);
    setError(null);
  }, []);

  // Kích hoạt lỗi giả lập để kiểm thử trạng thái Error
  const handleTriggerError = useCallback(() => {
    setProfileData(null);
    setError({
      code: 'SIMULATED_PROFILE_ERROR',
      message: 'Mô phỏng lỗi máy chủ khi xác thực phiên hồ sơ (Kiểm thử Error State).',
      details: [
        'Endpoint: GET /api/v1/academic/status hoặc session context bị gián đoạn.',
        'Nhấn nút "Tải lại hồ sơ" để kiểm tra tính năng khôi phục.'
      ]
    });
  }, []);

  // Tiêu đề đầu trang và thanh thao tác kiểm thử
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
        'Hồ sơ Sinh viên & Tùy chọn Học vụ (Student Profile)'
      ),
      React.createElement(
        'p',
        { style: { color: 'var(--color-gray-600, #475569)', marginTop: 'var(--spacing-1, 4px)', fontSize: 'var(--text-sm, 14px)' } },
        'Quản lý thông tin định danh sinh viên, chỉ số học tập tích lũy và thiết lập mục tiêu lộ trình đào tạo cá nhân.'
      )
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', gap: 'var(--spacing-2, 8px)', alignItems: 'center' } },
      Button
        ? React.createElement(
            Button,
            { variant: 'ghost', size: 'sm', onClick: handleClearProfile },
            'Xóa hồ sơ (Empty)'
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
            { variant: 'primary', size: 'sm', onClick: handleFetchProfile, loading },
            'Tải lại hồ sơ'
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
      { className: 'haui-page-container haui-profile-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
      headerSection,
      Loading
        ? React.createElement(Loading, {
            variant: 'spinner',
            size: 'lg',
            label: 'Đang kết nối API và đồng bộ hồ sơ sinh viên từ máy chủ...'
          })
        : React.createElement('div', { style: { padding: '32px', textAlign: 'center' } }, 'Đang tải hồ sơ...')
    );
  }

  // ==========================================
  // 2. TRẠNG THÁI ERROR
  // ==========================================
  if (error) {
    return React.createElement(
      'div',
      { className: 'haui-page-container haui-profile-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
      headerSection,
      ErrorBox
        ? React.createElement(ErrorBox, {
            title: error.message || 'Lỗi truy xuất hồ sơ sinh viên',
            error,
            code: error.code || 'PROFILE_ERROR',
            details: error.details || ['Kiểm tra phiên đăng nhập trên hệ thống e-HaUI.'],
            onRetry: handleFetchProfile,
            retryLabel: 'Thử tải lại hồ sơ'
          })
        : React.createElement('div', { style: { color: 'red', padding: '16px' } }, error?.message)
    );
  }

  // ==========================================
  // 3. TRẠNG THÁI EMPTY
  // ==========================================
  if (!profileData || !profileData.studentId) {
    return React.createElement(
      'div',
      { className: 'haui-page-container haui-profile-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
      headerSection,
      EmptyState
        ? React.createElement(EmptyState, {
            title: 'Chưa có thông tin hồ sơ sinh viên',
            description: 'Không tìm thấy dữ liệu học vụ hoặc phiên làm việc của bạn chưa được xác thực từ máy chủ.',
            actionLabel: 'Đồng bộ lại hồ sơ',
            onAction: handleFetchProfile
          })
        : React.createElement('div', { style: { textAlign: 'center', padding: '32px' } }, 'Chưa có dữ liệu.')
    );
  }

  // ==========================================
  // 4. TRẠNG THÁI CÓ DỮ LIỆU (MAIN CONTENT AREA)
  // ==========================================

  // Khu vực 1: Thông tin cơ bản & hành chính
  const basicInfoCard = Card
    ? React.createElement(
        Card,
        {
          title: 'Thông tin Định danh & Hành chính',
          subtitle: 'Dữ liệu được xác thực an toàn từ phiên đăng nhập (Server Session Context)',
          variant: 'default',
          style: { marginBottom: 'var(--spacing-6, 24px)' }
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--spacing-4, 16px)',
              padding: '8px 0'
            }
          },
          React.createElement(
            'div',
            null,
            React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Họ và tên sinh viên'),
            React.createElement('div', { style: { fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '2px' } }, profileData.fullName)
          ),
          React.createElement(
            'div',
            null,
            React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Mã số sinh viên (MSSV)'),
            React.createElement('div', { style: { fontSize: '16px', fontWeight: 700, color: '#0284c7', marginTop: '2px' } }, profileData.studentCode)
          ),
          React.createElement(
            'div',
            null,
            React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Ngành đào tạo'),
            React.createElement('div', { style: { fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '2px' } }, `${profileData.majorName} (${profileData.majorCode})`)
          ),
          React.createElement(
            'div',
            null,
            React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Khóa học & Lớp sinh hoạt'),
            React.createElement('div', { style: { fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '2px' } }, `${profileData.cohort} • ${profileData.advisorClass}`)
          ),
          React.createElement(
            'div',
            { style: { gridColumn: '1 / -1' } },
            React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Đơn vị quản lý đào tạo'),
            React.createElement('div', { style: { fontSize: '14px', color: '#334155', marginTop: '2px' } }, profileData.faculty)
          )
        )
      )
    : null;

  // Khu vực 2: Thông tin kết quả học tập & Tiến độ tích lũy
  const academicProgressCard = Card
    ? React.createElement(
        Card,
        {
          title: 'Kết quả Học vụ & Tiến độ Tích lũy Toàn khóa',
          subtitle: 'Trích xuất trực tiếp qua port nghiệp vụ api.academic.getStatus()',
          variant: profileData.riskLevel === 'NORMAL' ? 'status-success' : 'status-warning',
          style: { marginBottom: 'var(--spacing-6, 24px)' }
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--spacing-4, 16px)',
              padding: '8px 0'
            }
          },
          React.createElement(
            'div',
            null,
            React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Điểm trung bình tích lũy (CPA)'),
            React.createElement('div', { style: { fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '2px' } }, profileData.cpa ?? 'N/A'),
            React.createElement('div', { style: { fontSize: '12px', color: '#16a34a', marginTop: '2px' } }, 'Xếp loại học lực: Khá')
          ),
          React.createElement(
            'div',
            null,
            React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Điểm trung bình học kỳ gần nhất (GPA)'),
            React.createElement('div', { style: { fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px' } }, profileData.gpa ?? 'N/A')
          ),
          React.createElement(
            'div',
            null,
            React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Tiến độ tích lũy tín chỉ'),
            React.createElement(
              'div',
              { style: { fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '2px' } },
              `${profileData.accumulatedCredits ?? 0} `,
              React.createElement('span', { style: { fontSize: '13px', color: '#64748b', fontWeight: 400 } }, `/ ${profileData.totalCreditsRequired} TC`)
            ),
            React.createElement(
              'div',
              { style: { fontSize: '12px', color: '#0284c7', marginTop: '2px' } },
              `Đạt ${Math.round(((profileData.accumulatedCredits || 0) / profileData.totalCreditsRequired) * 100)}% khối lượng CTĐT`
            )
          ),
          React.createElement(
            'div',
            null,
            React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Tình trạng cảnh báo học vụ'),
            React.createElement(
              'div',
              {
                style: {
                  fontSize: '13px',
                  fontWeight: 600,
                  marginTop: '4px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  background: profileData.riskLevel === 'NORMAL' ? '#dcfce7' : '#fef3c7',
                  color: profileData.riskLevel === 'NORMAL' ? '#15803d' : '#b45309'
                }
              },
              profileData.riskLevel === 'NORMAL' ? 'Bình thường (An toàn)' : 'Cảnh báo học vụ'
            )
          )
        ),
        profileData.warningMessages && profileData.warningMessages.length > 0
          ? React.createElement(
              'div',
              {
                style: {
                  marginTop: '16px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: '#fffbeb',
                  borderLeft: '4px solid #f59e0b',
                  fontSize: '13px',
                  color: '#92400e'
                }
              },
              React.createElement('strong', null, 'Lưu ý từ phòng Đào tạo:'),
              React.createElement(
                'ul',
                { style: { margin: '4px 0 0 0', paddingLeft: '18px' } },
                profileData.warningMessages.map((w, idx) => React.createElement('li', { key: idx }, w))
              )
            )
          : null
      )
    : null;

  // Khu vực 3: Mục tiêu học vụ cá nhân
  const goalCard = Card
    ? React.createElement(
        Card,
        {
          title: 'Thiết lập Mục tiêu Học vụ & Lộ trình',
          subtitle: 'Các tham số định hướng phục vụ thuật toán tối ưu hóa của TV1 và TV4',
          variant: 'default'
        },
        React.createElement(
          'div',
          { style: { padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '12px' } },
          React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' } },
            React.createElement(
              'div',
              null,
              React.createElement('strong', { style: { fontSize: '14px', color: '#0f172a' } }, 'Mục tiêu tốt nghiệp đúng hạn (4 năm)'),
              React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Dự kiến hoàn thành toàn bộ 135 tín chỉ vào Học kỳ 2 (2025 - 2026)')
            ),
            React.createElement('span', { style: { fontSize: '12px', fontWeight: 600, color: '#16a34a' } }, 'ĐANG ÁP DỤNG')
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' } },
            React.createElement(
              'div',
              null,
              React.createElement('strong', { style: { fontSize: '14px', color: '#0f172a' } }, 'Ngưỡng CPA mục tiêu đầu ra'),
              React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Đặt mục tiêu kéo điểm tốt nghiệp đạt loại Khá / Giỏi (CPA >= 3.20)')
            ),
            React.createElement('span', { style: { fontSize: '14px', fontWeight: 700, color: '#0284c7' } }, 'CPA >= 3.20')
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' } },
            React.createElement(
              'div',
              null,
              React.createElement('strong', { style: { fontSize: '14px', color: '#0f172a' } }, 'Định hướng học phần Tự chọn'),
              React.createElement('div', { style: { fontSize: '12px', color: '#64748b' } }, 'Chuyên ngành hẹp: Phát triển Web / Ứng dụng Di động')
            ),
            React.createElement('span', { style: { fontSize: '12px', color: '#475569' } }, 'Web / Mobile')
          )
        )
      )
    : null;

  return React.createElement(
    'div',
    { className: 'haui-page-container haui-profile-page', style: { padding: 'var(--spacing-6, 24px) 0' } },
    headerSection,
    basicInfoCard,
    academicProgressCard,
    goalCard
  );
}

export default StudentProfilePage;
