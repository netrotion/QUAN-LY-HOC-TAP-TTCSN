/**
 * HaUI Advisor — Curriculum Tree Helpers (Task 4.2a)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Provides display metadata mapping and fast counter computation directly
 * from Contract 1.3.0 CurriculumTreeResponse (CourseProgressStatus).
 * Strict Rule: Zero client-side computation of PASSED/BLOCKED.
 */

/**
 * Chuyển đổi trạng thái học phần từ Backend API (Contract V1.3.0) thành metadata hiển thị UI
 * @param {Object} c - CurriculumTreeCourseItem
 * @returns {{ statusType: string, statusText: string, statusClass: string, statusLabel: string, icon: string }}
 */
export function getCourseDisplayMeta(c = {}) {
  const status = c.status || 'UNKNOWN';

  switch (status) {
    case 'PASSED':
      return {
        statusType: 'passed',
        statusText: c.letterGrade ? `Đạt: ${c.letterGrade}` : 'Đã đạt',
        statusClass: 'haui-badge--success',
        statusLabel: 'Đã hoàn thành',
        icon: 'check_circle'
      };
    case 'IN_PROGRESS':
      return {
        statusType: 'studying',
        statusText: c.semesterCode ? `Đang học • ${c.semesterCode}` : 'Đang học',
        statusClass: 'haui-badge--primary',
        statusLabel: 'Đang theo học',
        icon: 'progress_activity'
      };
    case 'ELIGIBLE':
      return {
        statusType: 'eligible',
        statusText: 'Đủ điều kiện đăng ký',
        statusClass: 'haui-badge--neutral',
        statusLabel: 'Đủ điều kiện đăng ký',
        icon: 'how_to_reg'
      };
    case 'BLOCKED':
      return {
        statusType: 'locked',
        statusText: 'Chưa đủ điều kiện (Khóa)',
        statusClass: 'haui-badge--warning',
        statusLabel: 'Khóa / Thiếu tiên quyết',
        icon: 'lock'
      };
    case 'FAILED':
      return {
        statusType: 'locked',
        statusText: c.letterGrade ? `Chưa đạt (${c.letterGrade})` : 'Chưa đạt (Điểm F)',
        statusClass: 'haui-badge--error',
        statusLabel: 'Chưa đạt (Nợ môn)',
        icon: 'warning'
      };
    default:
      return {
        statusType: 'unknown',
        statusText: 'Chưa xác định',
        statusClass: 'haui-badge--neutral',
        statusLabel: 'Chưa xác định',
        icon: 'help_outline'
      };
  }
}
