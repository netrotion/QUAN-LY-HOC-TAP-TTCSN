import React, { useState, useEffect, useCallback } from 'react';
import { plannerStore } from '../services/plannerStore.js';

/**
 * Mẫu hồ sơ sinh viên chuẩn HaUI phục vụ khám phá và kiểm thử
 */
export const SAMPLE_K16_PROFILE = Object.freeze({
  studentId: '2020601234',
  fullName: 'Nguyễn Văn An',
  studentCode: '2020601234',
  majorName: 'Kỹ thuật phần mềm',
  majorCode: '7480103',
  cohort: 'K16 (2021 - 2025)',
  faculty: 'Trường Công nghệ Thông tin & Truyền thông',
  advisorClass: 'KTPM01-K16',
  cpa: 3.18,
  gpa: 3.32,
  accumulatedCredits: 108,
  totalCreditsRequired: 145,
  riskLevel: 'SAFE',
  warningMessages: ['Cần hoàn thành môn Toán rời rạc (MATH1002 - Điểm F) trước khi đăng ký đồ án tốt nghiệp.']
});

/**
 * Danh mục các Trường / Khoa và Danh sách Chuyên ngành / Chương trình đào tạo chuẩn Đại học Công nghiệp Hà Nội (HaUI)
 */
export const HAUI_FACULTIES_AND_MAJORS = Object.freeze({
  'Trường Ngoại ngữ - Du lịch': [
    'Ngôn ngữ Anh',
    'Ngôn ngữ Trung Quốc',
    'Ngôn ngữ Trung Quốc (2+2)',
    'Trung Quốc học',
    'Ngôn ngữ Nhật',
    'Ngôn ngữ Hàn Quốc',
    'Ngôn ngữ học',
    'Du lịch',
    'Quản trị dịch vụ du lịch và lữ hành',
    'Quản trị khách sạn',
    'Quản trị nhà hàng và dịch vụ ăn uống',
    'Du lịch (CTĐT bằng tiếng Anh)',
    'Quản trị dịch vụ du lịch và lữ hành (CTĐT bằng tiếng Anh)',
    'Quản trị khách sạn (CTĐT bằng tiếng Anh)',
    'Quản trị nhà hàng và dịch vụ ăn uống (CTĐT bằng tiếng Anh)'
  ],
  'Trường Cơ khí - Ô tô': [
    'Công nghệ kỹ thuật cơ khí',
    'Công nghệ kỹ thuật cơ khí (CTĐT bằng tiếng Anh)',
    'Công nghệ kỹ thuật khuôn mẫu',
    'Thiết kế cơ khí và kiểu dáng công nghiệp',
    'Công nghệ kỹ thuật cơ điện tử',
    'Công nghệ kỹ thuật cơ điện tử (CTĐT bằng tiếng Anh)',
    'Công nghệ kỹ thuật cơ điện tử ô tô',
    'Robot và trí tuệ nhân tạo',
    'Công nghệ kỹ thuật ô tô',
    'Công nghệ kỹ thuật ô tô (CTĐT bằng tiếng Anh)',
    'Kỹ thuật ô tô và năng lượng mới',
    'Kỹ thuật cơ khí động lực',
    'Kỹ thuật hệ thống công nghiệp'
  ],
  'Trường Kinh tế': [
    'Kiểm toán',
    'Kế toán',
    'Kế toán (CTĐT bằng tiếng Anh)',
    'Marketing',
    'Marketing (CTĐT bằng tiếng Anh)',
    'Logistic và quản lý chuỗi cung ứng',
    'Phân tích dữ liệu kinh doanh',
    'Quản trị kinh doanh',
    'Quản trị kinh doanh (CTĐT bằng tiếng Anh)',
    'Quản trị nhân lực',
    'Quản trị văn phòng',
    'Tài chính ngân hàng',
    'Tài chính ngân hàng (CTĐT bằng tiếng Anh)',
    'Kinh tế đầu tư'
  ],
  'Trường Công nghệ Thông tin & Truyền thông': [
    'Khoa học máy tính',
    'Khoa học máy tính (CTĐT bằng tiếng Anh)',
    'Trí tuệ nhân tạo',
    'Mạng máy tính và truyền thông dữ liệu',
    'Kỹ thuật phần mềm',
    'Hệ thống thông tin',
    'Công nghệ thông tin',
    'Công nghệ thông tin (CTĐT bằng tiếng Anh)',
    'Công nghệ đa phương tiện',
    'An toàn thông tin'
  ],
  'Trường Điện - Điện tử': [
    'CNKT Điện tử - Viễn thông (CTĐT bằng tiếng Anh)',
    'CNKT Điện tử - Viễn thông',
    'CNKT Điện tử y sinh',
    'CNKT Điện - Điện tử (CTĐT bằng tiếng Anh)',
    'CNKT Điện - Điện tử',
    'CNKT Điều khiển và tự động hóa',
    'CNKT Máy tính',
    'CNKT Nhiệt',
    'KT sản xuất thông minh',
    'Năng lượng tái tạo',
    'Vi mạch bán dẫn'
  ],
  'Khoa Công nghệ Hóa': [
    'Công nghệ kỹ thuật hóa học',
    'Công nghệ vật liệu',
    'Công nghệ kỹ thuật môi trường',
    'Công nghệ thực phẩm',
    'Hóa dược'
  ],
  'Khoa CN May & TKTT': [
    'Công nghệ dệt, may',
    'Thiết kế Thời trang',
    'Công nghệ vật liệu dệt, may'
  ]
});

/**
 * Danh sách Đơn vị / Trường / Khoa thuộc Đại học Công nghiệp Hà Nội (HaUI)
 */
export const HAUI_MEMBER_SCHOOLS = Object.freeze(Object.keys(HAUI_FACULTIES_AND_MAJORS));

/**
 * Danh sách Khóa học chuẩn Đại học Công nghiệp Hà Nội (HaUI)
 */
export const HAUI_COHORTS = Object.freeze([
  'K16 (2021 - 2025)',
  'K17 (2022 - 2026)',
  'K18 (2023 - 2027)',
  'K19 (2024 - 2028)',
  'K20 (2025 - 2029)',
  'K21 (2026 - 2030)'
]);

/**
 * Tra cứu danh sách ngành/chương trình đào tạo theo Khoa/Trường
 * @param {string} facultyName
 * @returns {string[]}
 */
export function getMajorsForFaculty(facultyName) {
  if (!facultyName) return HAUI_FACULTIES_AND_MAJORS['Trường Công nghệ Thông tin & Truyền thông'];
  if (HAUI_FACULTIES_AND_MAJORS[facultyName]) return HAUI_FACULTIES_AND_MAJORS[facultyName];

  const norm = facultyName.toLowerCase();
  for (const [key, majors] of Object.entries(HAUI_FACULTIES_AND_MAJORS)) {
    const keyNorm = key.toLowerCase();
    if (
      norm === keyNorm ||
      (norm.includes('thông tin') && keyNorm.includes('thông tin')) ||
      (norm.includes('cơ khí') && keyNorm.includes('cơ khí')) ||
      (norm.includes('kinh tế') && keyNorm.includes('kinh tế')) ||
      (norm.includes('điện') && keyNorm.includes('điện')) ||
      (norm.includes('ngoại ngữ') && keyNorm.includes('ngoại ngữ')) ||
      (norm.includes('hóa') && keyNorm.includes('hóa')) ||
      (norm.includes('may') && keyNorm.includes('may'))
    ) {
      return majors;
    }
  }
  return HAUI_FACULTIES_AND_MAJORS['Trường Công nghệ Thông tin & Truyền thông'];
}

/**
 * Màn hình Hồ sơ Sinh viên & Tùy chọn Học tập cá nhân (Student Profile) — TV3
 * Dựa trên prototype `student_profile/code.html` và yêu cầu Task 3.12:
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

  const [profileData, setProfileData] = useState(() => {
    if (initialProfileData !== undefined && initialProfileData !== null) {
      return {
        ...initialProfileData,
        cpa: initialProfileData.cpa !== null && initialProfileData.cpa !== undefined ? initialProfileData.cpa : 0,
        gpa: initialProfileData.gpa !== null && initialProfileData.gpa !== undefined ? initialProfileData.gpa : 0,
        accumulatedCredits: initialProfileData.accumulatedCredits !== null && initialProfileData.accumulatedCredits !== undefined ? initialProfileData.accumulatedCredits : 0
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(
    initialProfileData !== undefined ? initialLoading : true
  );
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Form fields editable — để trống những thông tin chưa được user nhập
  const [fullNameInput, setFullNameInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [genderInput, setGenderInput] = useState('');
  const [personalEmailInput, setPersonalEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [advisorClassInput, setAdvisorClassInput] = useState('');
  const [facultyInput, setFacultyInput] = useState('');
  const [majorNameInput, setMajorNameInput] = useState('');
  const [cohortInput, setCohortInput] = useState('');

  // Tùy chọn mục tiêu cá nhân
  const [targetCpa, setTargetCpa] = useState('3.20');
  const [graduationPace, setGraduationPace] = useState('STANDARD'); // 'STANDARD' (4 năm) | 'FAST' (3.5 năm)
  const [specialization, setSpecialization] = useState('');

  const currentPlan = plannerStore.getPlan();

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  // Xử lý khi người dùng đổi Trường thuộc HaUI / Khoa đào tạo -> cập nhật danh sách ngành tương ứng
  const handleFacultyChange = useCallback((e) => {
    const newFaculty = e.target.value;
    setFacultyInput(newFaculty);
    const majors = getMajorsForFaculty(newFaculty);
    if (majors && majors.length > 0) {
      setMajorNameInput(majors[0]);
    } else {
      setMajorNameInput('');
    }
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

  // Cập nhật form state khi profileData thay đổi — chỉ điền thông tin có thật, còn lại để trống
  useEffect(() => {
    if (profileData) {
      setFullNameInput(profileData.fullName || '');
      setAdvisorClassInput(profileData.advisorClass || '');
      setFacultyInput(profileData.faculty || '');
      setMajorNameInput(profileData.majorName || '');
      setCohortInput(profileData.cohort || '');
      setPersonalEmailInput(profileData.personalEmail || '');
      setPhoneInput(profileData.phone || '');
      setAddressInput(profileData.address || '');
      setGenderInput(profileData.gender || '');
      setDobInput(profileData.dob || '');
      setSpecialization(profileData.specialization || '');
    } else {
      setFullNameInput('');
      setAdvisorClassInput('');
      setFacultyInput('');
      setMajorNameInput('');
      setCohortInput('');
      setPersonalEmailInput('');
      setPhoneInput('');
      setAddressInput('');
      setGenderInput('');
      setDobInput('');
      setSpecialization('');
    }
  }, [profileData]);

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
        const cpaVal = (academicStatus?.cpa !== null && academicStatus?.cpa !== undefined)
          ? Number(academicStatus.cpa)
          : ((sessionStudent?.cpa !== null && sessionStudent?.cpa !== undefined) ? Number(sessionStudent.cpa) : 0);

        // GPA kỳ gần nhất đồng bộ với Tổng quan: nếu không có điểm kỳ thì lấy từ semesterTrend hoặc theo CPA, tuyệt đối không để null
        let gpaVal = 0;
        if (academicStatus?.gpa !== null && academicStatus?.gpa !== undefined) {
          gpaVal = Number(academicStatus.gpa);
        } else if (Array.isArray(academicStatus?.semesterTrend) && academicStatus.semesterTrend.length > 0) {
          const lastSem = academicStatus.semesterTrend[academicStatus.semesterTrend.length - 1];
          if (lastSem?.semesterGpa !== null && lastSem?.semesterGpa !== undefined) {
            gpaVal = Number(lastSem.semesterGpa);
          } else {
            gpaVal = cpaVal;
          }
        } else if (sessionStudent?.gpa !== null && sessionStudent?.gpa !== undefined) {
          gpaVal = Number(sessionStudent.gpa);
        } else if (cpaVal > 0) {
          gpaVal = cpaVal;
        }

        const creditsVal = (academicStatus?.accumulatedCredits !== null && academicStatus?.accumulatedCredits !== undefined)
          ? Number(academicStatus.accumulatedCredits)
          : ((sessionStudent?.accumulatedCredits !== null && sessionStudent?.accumulatedCredits !== undefined) ? Number(sessionStudent.accumulatedCredits) : 0);

        setProfileData({
          studentId: sessionStudent?.studentId || academicStatus?.studentId || '',
          fullName: sessionStudent?.fullName || academicStatus?.fullName || '',
          studentCode: sessionStudent?.studentCode || sessionStudent?.studentId || academicStatus?.studentId || '',
          majorName: sessionStudent?.majorName || '',
          majorCode: sessionStudent?.majorCode || '',
          cohort: sessionStudent?.cohort || '',
          faculty: sessionStudent?.faculty || '',
          advisorClass: sessionStudent?.advisorClass || '',
          cpa: cpaVal,
          gpa: gpaVal,
          accumulatedCredits: creditsVal,
          totalCreditsRequired: academicStatus?.totalCreditsRequired || sessionStudent?.totalCreditsRequired || 135,
          riskLevel: academicStatus?.riskLevel || 'NORMAL',
          warningMessages: academicStatus?.warnings || sessionStudent?.warnings || [],
          dob: sessionStudent?.dob || '',
          gender: sessionStudent?.gender || '',
          personalEmail: sessionStudent?.personalEmail || '',
          phone: sessionStudent?.phone || '',
          address: sessionStudent?.address || '',
          specialization: sessionStudent?.specialization || ''
        });
      } else {
        setProfileData(null);
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

    const handleTranscriptUpdated = () => {
      handleFetchProfile();
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
      return () => window.removeEventListener('haui:academic:transcript-updated', handleTranscriptUpdated);
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

  // Lưu tùy chọn mục tiêu cá nhân & hồ sơ
  const handleSavePreferences = useCallback(() => {
    const updated = {
      ...(profileData || {}),
      fullName: fullNameInput,
      gender: genderInput,
      dob: dobInput,
      personalEmail: personalEmailInput,
      phone: phoneInput,
      address: addressInput,
      advisorClass: advisorClassInput,
      faculty: facultyInput,
      majorName: majorNameInput,
      cohort: cohortInput,
      targetCpa,
      graduationPace,
      specialization
    };

    setProfileData(updated);

    if (api && typeof api.setSessionStudent === 'function') {
      api.setSessionStudent({
        fullName: fullNameInput,
        advisorClass: advisorClassInput,
        faculty: facultyInput,
        majorName: majorNameInput,
        cohort: cohortInput
      });
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(
          new CustomEvent('haui:student:profile-updated', {
            detail: updated
          })
        );
      } catch {
        // Ignored
      }
    }

    showToast(`Đã lưu thành công thông tin hồ sơ và mục tiêu học tập!`);
  }, [profileData, fullNameInput, genderInput, dobInput, personalEmailInput, phoneInput, addressInput, advisorClassInput, facultyInput, majorNameInput, cohortInput, targetCpa, graduationPace, specialization, api, showToast]);

  // Hủy thay đổi form
  const handleCancelChanges = useCallback(() => {
    if (profileData) {
      setFullNameInput(profileData.fullName || '');
      setAdvisorClassInput(profileData.advisorClass || '');
      setFacultyInput(profileData.faculty || HAUI_MEMBER_SCHOOLS[1]);
      setMajorNameInput(profileData.majorName || 'Kỹ thuật phần mềm');
      setCohortInput(profileData.cohort || 'K17 (2022 - 2026)');
      if (profileData.personalEmail) setPersonalEmailInput(profileData.personalEmail);
      if (profileData.phone) setPhoneInput(profileData.phone);
      if (profileData.address) setAddressInput(profileData.address);
      if (profileData.gender) setGenderInput(profileData.gender);
      if (profileData.dob) setDobInput(profileData.dob);
    }
    showToast('Đã hoàn tác các thay đổi chưa lưu.');
  }, [profileData, showToast]);

  // Trích xuất chữ cái đại diện Avatar (ví dụ: Nguyễn Văn An -> NA)
  const getAvatarInitials = (name) => {
    if (!name) return 'SV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Header trang chuẩn theo prototype student_profile/code.html
  const headerSection = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px'
      }
    },
    // Breadcrumb
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--color-mid-gray, #737373)'
        }
      },
      React.createElement(
        'span',
        {
          style: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }
        },
        React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '15px' } }, 'home'),
        'Trang chủ'
      ),
      React.createElement('span', { style: { color: 'var(--color-hairline, #e5e5e5)' } }, '/'),
      React.createElement('span', { style: { color: 'var(--color-ink, #0a0a0a)', fontWeight: 500 } }, 'Hồ sơ sinh viên')
    ),
    // Title bar
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }
      },
      React.createElement(
        'div',
        { style: { maxWidth: '780px' } },
        React.createElement(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' } },
          React.createElement(
            'h1',
            {
              style: {
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink, #0a0a0a)',
                margin: 0
              }
            },
            'Hồ sơ sinh viên'
          ),
          React.createElement(
            'span',
            {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-canvas, #f5f5f5)',
                color: 'var(--color-ink, #0a0a0a)',
                fontSize: '12px',
                fontWeight: 500,
                border: '1px solid var(--color-hairline, #e5e5e5)'
              }
            },
            React.createElement('span', {
              style: { width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink, #0a0a0a)' }
            }),
            'Đang theo học - Kỳ 6/8'
          ),
          React.createElement(
            'span',
            {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-paper, #ffffff)',
                color: 'var(--color-mid-gray, #737373)',
                fontSize: '12px',
                border: '1px solid var(--color-hairline, #e5e5e5)'
              }
            },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '14px', color: 'var(--color-ink, #0a0a0a)' } }, 'verified'),
            'Dữ liệu hồ sơ gốc (Chính thức)'
          )
        ),
        React.createElement(
          'p',
          {
            style: {
              color: 'var(--color-mid-gray, #737373)',
              marginTop: '6px',
              fontSize: '14px',
              lineHeight: 1.5,
              margin: '6px 0 0'
            }
          },
          'Quản lý và cập nhật thông tin cá nhân, định hướng ngành và chương trình đào tạo tại Đại học Công nghiệp Hà Nội.'
        )
      )
    )
  );

  const toastBar = toastMessage
    ? React.createElement(
        'div',
        {
          style: {
            padding: '10px 16px',
            marginBottom: '16px',
            borderRadius: '9999px',
            background: '#0a0a0a',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
          }
        },
        React.createElement(
          'span',
          { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'task_alt'),
          toastMessage
        ),
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
      { className: 'haui-page-container' },
      headerSection,
      Loading
        ? React.createElement(Loading, { variant: 'spinner', size: 'lg', label: 'Đang tải thông tin hồ sơ sinh viên...' })
        : React.createElement('div', null, 'Đang tải...')
    );
  }

  if (error) {
    return React.createElement(
      'div',
      { className: 'haui-page-container' },
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
      { className: 'haui-page-container haui-profile-empty' },
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
                borderRadius: '24px',
                border: '1px solid var(--color-hairline, #e5e5e5)',
                boxShadow: '0 1px 8px rgba(0,0,0,0.04)'
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

  // TRẠNG THÁI ĐÃ CÓ HỒ SƠ — KHUNG LƯỚI 2 CỘT CHUẨN PROTOTYPE (4 COLS / 8 COLS)
  return React.createElement(
    'div',
    { className: 'haui-page-container haui-profile-page' },
    headerSection,
    toastBar,

    // Main Content Layout (12 cols grid: 4 cols Left / 8 cols Right)
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          alignItems: 'start'
        }
      },
      // ========================================================
      // CỘT TRÁI (LEFT COLUMN): SUMMARY CARD & ACADEMIC ADVISOR
      // ========================================================
      React.createElement(
        'aside',
        { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

        // 1. Profile Summary Card
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }
          },
          // Profile Identity Header
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' } },
            React.createElement(
              'div',
              { style: { position: 'relative', marginBottom: '16px' } },
              React.createElement(
                'div',
                {
                  style: {
                    width: '96px',
                    height: '96px',
                    borderRadius: '9999px',
                    backgroundColor: '#0a0a0a',
                    color: '#ffffff',
                    fontSize: '28px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    letterSpacing: '-0.02em',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
                  }
                },
                getAvatarInitials(profileData.fullName)
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  title: 'Thay đổi ảnh đại diện',
                  onClick: () => showToast('Tính năng đổi avatar đang được phát triển.'),
                  style: {
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-paper, #ffffff)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-ink, #0a0a0a)',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)'
                  }
                },
                React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'photo_camera')
              )
            ),
            React.createElement(
              'h2',
              { style: { fontSize: '18px', fontWeight: 600, color: 'var(--color-ink, #0a0a0a)', margin: 0 } },
              profileData.fullName
            ),
            React.createElement(
              'p',
              { style: { fontSize: '14px', color: 'var(--color-mid-gray, #737373)', margin: '4px 0 0' } },
              profileData.studentCode
            ),
            React.createElement(
              'div',
              {
                style: {
                  marginTop: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-ink, #0a0a0a)',
                  border: '1px solid var(--color-hairline, #e5e5e5)'
                }
              },
              React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '14px' } }, 'school'),
              profileData.advisorClass || 'ĐH CNTT 2 - K16'
            )
          ),

          // Divider
          React.createElement('div', { style: { height: '1px', backgroundColor: 'var(--color-hairline, #e5e5e5)', width: '100%' } }),

          // Profile completion progress bar
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            React.createElement(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px' } },
              React.createElement('span', { style: { color: 'var(--color-mid-gray, #737373)', fontWeight: 500 } }, 'Tiến độ hoàn thành hồ sơ'),
              React.createElement('span', { style: { color: 'var(--color-ink, #0a0a0a)', fontWeight: 600 } }, '100%')
            ),
            React.createElement(
              'div',
              {
                style: {
                  width: '100%',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  borderRadius: '9999px',
                  height: '6px',
                  overflow: 'hidden'
                }
              },
              React.createElement('div', {
                style: {
                  backgroundColor: '#0a0a0a',
                  height: '100%',
                  borderRadius: '9999px',
                  width: '100%',
                  transition: 'width 0.5s ease'
                }
              })
            ),
            React.createElement(
              'p',
              { style: { fontSize: '12px', color: 'var(--color-mid-gray, #737373)', margin: '4px 0 0', lineHeight: 1.4 } },
              'Hồ sơ chuẩn hóa đã sẵn sàng cho cổng thẩm định tốt nghiệp và What-if.'
            )
          ),

          // Divider
          React.createElement('div', { style: { height: '1px', backgroundColor: 'var(--color-hairline, #e5e5e5)', width: '100%' } }),

          // Compact Bio Metadata
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' } },
            // Item 1: Khoa / Viện
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              React.createElement(
                'div',
                {
                  style: {
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--color-mid-gray, #737373)'
                  }
                },
                React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'domain')
              ),
              React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
                React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Khoa / Viện'),
                React.createElement('span', { style: { color: 'var(--color-ink, #0a0a0a)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, profileData.faculty || 'Trường Đại học Công nghiệp Hà Nội (HaUI)')
              )
            ),
            // Item 2: Email trường
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              React.createElement(
                'div',
                {
                  style: {
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--color-mid-gray, #737373)'
                  }
                },
                React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'mail')
              ),
              React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
                React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Email trường'),
                React.createElement('span', { style: { color: 'var(--color-ink, #0a0a0a)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `${profileData.studentCode}@sv.haui.edu.vn`)
              )
            ),
            // Item 3: Trạng thái định danh
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              React.createElement(
                'div',
                {
                  style: {
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--color-mid-gray, #737373)'
                  }
                },
                React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px' } }, 'verified_user')
              ),
              React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } },
                React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Trạng thái định danh'),
                React.createElement('span', { style: { color: 'var(--color-ink, #0a0a0a)', fontWeight: 500 } }, 'Đã đồng bộ HaUI Portal')
              )
            )
          ),

          // Action button
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => showToast('Đang tạo bản sơ yếu lý lịch (.pdf)...'),
              style: {
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-canvas, #f5f5f5)',
                border: '1px solid var(--color-hairline, #e5e5e5)',
                color: 'var(--color-ink, #0a0a0a)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }
            },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'file_download'),
            'Tải bản sơ yếu lý lịch (.pdf)'
          )
        ),

        // 2. Kế hoạch học tập đang theo dõi (ACTIVE Plan Snapshot)
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }
          },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            React.createElement('span', { style: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-mid-gray, #737373)', fontWeight: 600 } }, 'Kế hoạch học tập'),
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: currentPlan.status === 'ACTIVE' ? '#0a0a0a' : '#fef3c7',
                  color: currentPlan.status === 'ACTIVE' ? '#ffffff' : '#b45309'
                }
              },
              currentPlan.status
            )
          ),
          React.createElement(
            'div',
            null,
            React.createElement('strong', { style: { fontSize: '14px', color: 'var(--color-ink, #0a0a0a)' } }, currentPlan.planName),
            React.createElement(
              'p',
              { style: { margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray, #737373)', lineHeight: 1.4 } },
              `Phiên bản: ${currentPlan.version} · Gồm ${currentPlan.semesters?.length || 3} học kỳ (${currentPlan.remainingCredits || 37} TC) · CPA dự phóng: ${currentPlan.projectedCpa || '3.32'}`
            )
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: handleOpenPlanner,
              style: {
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-canvas, #f5f5f5)',
                border: '1px solid var(--color-hairline, #e5e5e5)',
                color: 'var(--color-ink, #0a0a0a)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }
            },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'event_note'),
            'Mở trong Study Planner →'
          )
        )
      ),

      // ========================================================
      // CỘT PHẢI (RIGHT COLUMN): FORMS CHỈNH SỬA & TÙY CHỌN MỤC TIÊU
      // ========================================================
      React.createElement(
        'main',
        { style: { display: 'flex', flexDirection: 'column', gap: '24px' } },

        // ----------------------------------------------------
        // SECTION 1: THÔNG TIN CÁ NHÂN & LIÊN HỆ (NHÓM 01)
        // ----------------------------------------------------
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }
          },
          // Section Header
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--color-hairline, #e5e5e5)'
              }
            },
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '22px', color: 'var(--color-ink, #0a0a0a)' } }, 'id_card'),
              React.createElement(
                'div',
                null,
                React.createElement('h3', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink, #0a0a0a)' } }, 'Thông tin cá nhân & Liên hệ'),
                React.createElement('span', { style: { fontSize: '12px', color: 'var(--color-mid-gray, #737373)' } }, 'Thông tin phục vụ liên lạc trực tiếp và lưu trữ học bạ')
              )
            ),
            React.createElement(
              'span',
              {
                style: {
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  color: 'var(--color-mid-gray, #737373)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  fontWeight: 500
                }
              },
              'Nhóm 01'
            )
          ),

          // Fields Grid
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' } },

            // Field: Mã sinh viên (Readonly)
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' } },
                React.createElement('label', { style: { fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Mã sinh viên'),
                React.createElement('span', { style: { color: 'var(--color-mid-gray, #737373)', fontSize: '11px' } }, 'Cố định')
              ),
              React.createElement(
                'div',
                { style: { position: 'relative' } },
                React.createElement('input', {
                  readOnly: true,
                  value: profileData.studentCode,
                  style: {
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    color: 'var(--color-mid-gray, #737373)',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }
                }),
                React.createElement('span', { className: 'material-symbols-outlined', style: { position: 'absolute', right: '12px', top: '9px', fontSize: '18px', color: 'var(--color-mid-gray, #737373)' } }, 'lock')
              ),
              React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Được cấp cố định bởi Phòng Đào tạo HaUI')
            ),

            // Field: Họ và tên
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Họ và tên'),
              React.createElement('input', {
                type: 'text',
                value: fullNameInput,
                onChange: (e) => setFullNameInput(e.target.value),
                style: {
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  boxSizing: 'border-box'
                }
              }),
              React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Khớp chính xác với thẻ CCCD gắn chip')
            ),

            // Field: Ngày sinh
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Ngày sinh'),
              React.createElement('input', {
                type: 'date',
                value: dobInput,
                onChange: (e) => setDobInput(e.target.value),
                style: {
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  boxSizing: 'border-box'
                }
              }),
              React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Định dạng Ngày/Tháng/Năm')
            ),

            // Field: Giới tính
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Giới tính'),
              React.createElement(
                'div',
                { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' } },
                ['Nam', 'Nữ', 'Khác'].map((g) =>
                  React.createElement(
                    'button',
                    {
                      key: g,
                      type: 'button',
                      onClick: () => setGenderInput(g),
                      style: {
                        padding: '8px',
                        borderRadius: '9999px',
                        border: '1px solid var(--color-hairline, #e5e5e5)',
                        backgroundColor: genderInput === g ? '#0a0a0a' : 'var(--color-canvas, #f5f5f5)',
                        color: genderInput === g ? '#ffffff' : 'var(--color-ink, #0a0a0a)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }
                    },
                    g
                  )
                )
              ),
              React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Thông tin hồ sơ bảo hiểm y tế')
            ),

            // Field: Email trường cấp (Readonly)
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' } },
                React.createElement('label', { style: { fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Email trường cấp'),
                React.createElement('span', { style: { color: 'var(--color-mid-gray, #737373)', fontSize: '11px' } }, 'Office 365')
              ),
              React.createElement(
                'div',
                { style: { position: 'relative' } },
                React.createElement('input', {
                  readOnly: true,
                  value: `${profileData.studentCode}@sv.haui.edu.vn`,
                  style: {
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    color: 'var(--color-mid-gray, #737373)',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }
                }),
                React.createElement('span', { className: 'material-symbols-outlined', style: { position: 'absolute', right: '12px', top: '9px', fontSize: '18px', color: 'var(--color-mid-gray, #737373)' } }, 'lock')
              ),
              React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Dùng để nhận thông báo đào tạo và xác thực')
            ),

            // Field: Email cá nhân
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Email cá nhân'),
              React.createElement('input', {
                type: 'email',
                value: personalEmailInput,
                onChange: (e) => setPersonalEmailInput(e.target.value),
                style: {
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  boxSizing: 'border-box'
                }
              }),
              React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Nhận thông báo khẩn cấp và kết nối tuyển dụng')
            ),

            // Field: Số điện thoại
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Số điện thoại'),
              React.createElement('input', {
                type: 'tel',
                value: phoneInput,
                onChange: (e) => setPhoneInput(e.target.value),
                style: {
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  boxSizing: 'border-box'
                }
              }),
              React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Số di động đăng ký nhận mã OTP')
            ),

            // Field: Địa chỉ liên hệ / Quê quán
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Địa chỉ liên hệ / Quê quán'),
              React.createElement('input', {
                type: 'text',
                value: addressInput,
                onChange: (e) => setAddressInput(e.target.value),
                style: {
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  boxSizing: 'border-box'
                }
              }),
              React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)' } }, 'Địa chỉ thường trú theo sổ hộ khẩu/CCCD')
            )
          )
        ),

        // ----------------------------------------------------
        // SECTION 2: THÔNG TIN CHƯƠNG TRÌNH ĐÀO TẠO & NGÀNH HỌC (NHÓM 02)
        // ----------------------------------------------------
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }
          },
          // Section Header
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--color-hairline, #e5e5e5)'
              }
            },
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '22px', color: 'var(--color-ink, #0a0a0a)' } }, 'account_tree'),
              React.createElement(
                'div',
                null,
                React.createElement('h3', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink, #0a0a0a)' } }, 'Thông tin chương trình đào tạo'),
                React.createElement('span', { style: { fontSize: '12px', color: 'var(--color-mid-gray, #737373)' } }, 'Chương trình đào tạo — Đại học Công nghiệp Hà Nội (HaUI)')
              )
            ),
            React.createElement(
              'span',
              {
                style: {
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  color: 'var(--color-mid-gray, #737373)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  fontWeight: 500
                }
              },
              'Nhóm 02'
            )
          ),

          // Fields Grid
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' } },

            // Cơ sở đào tạo (span 2 cols)
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Cơ sở đào tạo'),
              React.createElement(
                'div',
                { style: { position: 'relative' } },
                React.createElement('input', {
                  readOnly: true,
                  value: 'Đại học Công nghiệp Hà Nội',
                  style: {
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    color: 'var(--color-mid-gray, #737373)',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }
                }),
                React.createElement('span', { className: 'material-symbols-outlined', style: { position: 'absolute', right: '12px', top: '9px', fontSize: '18px', color: 'var(--color-mid-gray, #737373)' } }, 'apartment')
              )
            ),

            // Trường thuộc HaUI / Khoa đào tạo
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Trường thuộc HaUI / Khoa đào tạo'),
              React.createElement(
                'select',
                {
                  value: facultyInput,
                  onChange: handleFacultyChange,
                  style: {
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    color: 'var(--color-ink, #0a0a0a)',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }
                },
                HAUI_MEMBER_SCHOOLS.map((school) =>
                  React.createElement('option', { key: school, value: school }, school)
                )
              )
            ),

            // Chuyên ngành / Ngành đào tạo (chọn theo Khoa/Trường)
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Chuyên ngành / Ngành đào tạo'),
              React.createElement(
                'select',
                {
                  value: majorNameInput,
                  onChange: (e) => setMajorNameInput(e.target.value),
                  style: {
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    color: 'var(--color-ink, #0a0a0a)',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }
                },
                (() => {
                  const majors = getMajorsForFaculty(facultyInput);
                  const inList = majors.includes(majorNameInput);
                  const options = inList || !majorNameInput ? majors : [majorNameInput, ...majors];
                  return options.map((m) =>
                    React.createElement('option', { key: m, value: m }, m)
                  );
                })()
              )
            ),

            // Khóa học
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Khóa học'),
              React.createElement(
                'select',
                {
                  value: cohortInput,
                  onChange: (e) => setCohortInput(e.target.value),
                  style: {
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    color: 'var(--color-ink, #0a0a0a)',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }
                },
                (() => {
                  const inList = HAUI_COHORTS.includes(cohortInput);
                  const options = inList || !cohortInput ? HAUI_COHORTS : [cohortInput, ...HAUI_COHORTS];
                  return [
                    React.createElement('option', { key: 'empty', value: '' }, '-- Chọn khóa học --'),
                    ...options.map((cohort) =>
                      React.createElement('option', { key: cohort, value: cohort }, cohort)
                    )
                  ];
                })()
              )
            ),

            // Lớp sinh hoạt hành chính
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Lớp sinh hoạt hành chính'),
              React.createElement('input', {
                type: 'text',
                value: advisorClassInput,
                onChange: (e) => setAdvisorClassInput(e.target.value),
                style: {
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  boxSizing: 'border-box'
                }
              })
            ),

            // Chương trình đào tạo
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Chương trình đào tạo'),
              React.createElement('input', {
                readOnly: true,
                value: `${profileData.totalCreditsRequired || 135} Tín chỉ (Đại học chính quy)`,
                style: {
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  color: 'var(--color-mid-gray, #737373)',
                  cursor: 'not-allowed',
                  boxSizing: 'border-box'
                }
              }),
              React.createElement('span', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)', fontStyle: 'italic', paddingLeft: '4px' } }, 'Khung chương trình đào tạo chuẩn Đại học Công nghiệp Hà Nội')
            )
          )
        ),

        // ----------------------------------------------------
        // SECTION 3: CHỈ SỐ HỌC VỤ & TÙY CHỌN MỤC TIÊU (NHÓM 03)
        // ----------------------------------------------------
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }
          },
          // Section Header
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--color-hairline, #e5e5e5)'
              }
            },
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '22px', color: 'var(--color-ink, #0a0a0a)' } }, 'insights'),
              React.createElement(
                'div',
                null,
                React.createElement('h3', { style: { margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-ink, #0a0a0a)' } }, 'Chỉ số học vụ & Tùy chọn mục tiêu cá nhân'),
                React.createElement('span', { style: { fontSize: '12px', color: 'var(--color-mid-gray, #737373)' } }, 'AI và các thuật toán What-if sẽ dựa vào mục tiêu này để đề xuất lộ trình tối ưu')
              )
            ),
            React.createElement(
              'span',
              {
                style: {
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  color: 'var(--color-mid-gray, #737373)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  fontWeight: 500
                }
              },
              'Nhóm 03'
            )
          ),

          // 3 KPI cards
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' } },
            React.createElement(
              'div',
              { style: { padding: '16px', backgroundColor: 'var(--color-canvas, #f5f5f5)', borderRadius: '16px', border: '1px solid var(--color-hairline, #e5e5e5)' } },
              React.createElement('div', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'CPA Tích lũy'),
              React.createElement('strong', { style: { fontSize: '24px', color: 'var(--color-ink, #0a0a0a)', display: 'block', marginTop: '4px' } }, `${profileData.cpa ?? 0} `),
              React.createElement('span', { style: { fontSize: '12px', color: 'var(--color-mid-gray, #737373)' } }, '/ 4.00 (Hệ 4)')
            ),
            React.createElement(
              'div',
              { style: { padding: '16px', backgroundColor: 'var(--color-canvas, #f5f5f5)', borderRadius: '16px', border: '1px solid var(--color-hairline, #e5e5e5)' } },
              React.createElement('div', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'GPA Kỳ gần nhất'),
              React.createElement('strong', { style: { fontSize: '24px', color: '#16a34a', display: 'block', marginTop: '4px' } }, `${profileData.gpa ?? 0} `),
              React.createElement('span', { style: { fontSize: '12px', color: 'var(--color-mid-gray, #737373)' } }, '/ 4.00 (Học kỳ 6)')
            ),
            React.createElement(
              'div',
              { style: { padding: '16px', backgroundColor: 'var(--color-canvas, #f5f5f5)', borderRadius: '16px', border: '1px solid var(--color-hairline, #e5e5e5)' } },
              React.createElement('div', { style: { fontSize: '11px', color: 'var(--color-mid-gray, #737373)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Tín chỉ đã tích lũy'),
              React.createElement('strong', { style: { fontSize: '24px', color: 'var(--color-ink, #0a0a0a)', display: 'block', marginTop: '4px' } }, `${profileData.accumulatedCredits ?? 0} `),
              React.createElement('span', { style: { fontSize: '12px', color: 'var(--color-mid-gray, #737373)' } }, `/ ${profileData.totalCreditsRequired || 135} TC (${Math.round(((profileData.accumulatedCredits || 0) / (profileData.totalCreditsRequired || 135)) * 100)}%)`)
            )
          ),

          // Warning banner
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '16px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                color: '#b45309',
                fontSize: '13px'
              }
            },
            React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '18px', color: '#f59e0b', flexShrink: 0, marginTop: '2px' } }, 'warning'),
            React.createElement(
              'span',
              null,
              '⚠️ Cảnh báo học vụ: Nợ học phần bắt buộc Toán rời rạc (MATH1002 - Điểm F). Đã được AI ưu tiên đưa vào kế hoạch Kỳ 7.'
            )
          ),

          // Target Controls
          React.createElement(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' } },
            // Mục tiêu CPA
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Mục tiêu CPA tốt nghiệp mong muốn:'),
              React.createElement(
                'select',
                {
                  value: targetCpa,
                  onChange: (e) => setTargetCpa(e.target.value),
                  style: {
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    color: 'var(--color-ink, #0a0a0a)',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }
                },
                React.createElement('option', { value: '2.50' }, 'CPA ≥ 2.50 (Xếp loại Khá)'),
                React.createElement('option', { value: '3.20' }, 'CPA ≥ 3.20 (Xếp loại Giỏi)'),
                React.createElement('option', { value: '3.60' }, 'CPA ≥ 3.60 (Xếp loại Xuất sắc)')
              )
            ),
            // Định hướng tiến độ
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Tiến độ tốt nghiệp mong muốn:'),
              React.createElement(
                'select',
                {
                  value: graduationPace,
                  onChange: (e) => setGraduationPace(e.target.value),
                  style: {
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    color: 'var(--color-ink, #0a0a0a)',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }
                },
                React.createElement('option', { value: 'STANDARD' }, 'Chuẩn 4 năm (2 kỳ chính + 1 kỳ hè nhẹ)'),
                React.createElement('option', { value: 'FAST' }, 'Rút ngắn 3.5 năm (Học vượt, tối đa 8 TC kỳ hè)')
              )
            ),
            // Chuyên ngành hẹp (span 2 cols)
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' } },
              React.createElement('label', { style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-ink, #0a0a0a)' } }, 'Định hướng chuyên ngành hẹp:'),
              React.createElement('input', {
                type: 'text',
                value: specialization,
                onChange: (e) => setSpecialization(e.target.value),
                style: {
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  boxSizing: 'border-box'
                }
              })
            )
          )
        ),

        // ----------------------------------------------------
        // SECTION 5: ACTION FOOTER & SYNC STATUS
        // ----------------------------------------------------
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: 'var(--color-paper, #ffffff)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              borderRadius: '24px',
              padding: '16px 24px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)'
            }
          },
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-mid-gray, #737373)' } },
            React.createElement(
              'span',
              {
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  fontWeight: 500,
                  border: '1px solid var(--color-hairline, #e5e5e5)'
                }
              },
              React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-ink, #0a0a0a)' } }),
              'Dữ liệu lưu trữ cục bộ trên trình duyệt'
            ),
            React.createElement('span', null, '• Đồng bộ lần cuối: Hôm nay, 14:32')
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: handleCancelChanges,
                style: {
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }
              },
              'Hủy bỏ'
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: handleSavePreferences,
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 24px',
                  borderRadius: '9999px',
                  backgroundColor: '#0a0a0a',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 8px rgba(0, 0, 0, 0.08)'
                }
              },
              React.createElement('span', { className: 'material-symbols-outlined', style: { fontSize: '16px' } }, 'save'),
              'Lưu thay đổi'
            )
          )
        )
      )
    )
  );
}

export default StudentProfilePage;
