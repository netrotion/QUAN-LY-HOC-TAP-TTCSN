import React from 'react';
import { Button } from './Button.jsx';

/**
 * @typedef {Object} EmptyStateProps
 * @property {string} [title='Không có dữ liệu hiển thị'] - Tiêu đề trạng thái rỗng
 * @property {string} [description] - Mô tả hướng dẫn người dùng
 * @property {React.ReactNode} [icon] - Icon hoặc hình minh họa tùy chỉnh
 * @property {React.ReactNode} [action] - Nút hành động tùy chỉnh
 * @property {string} [actionLabel] - Nhãn nút hành động nhanh
 * @property {() => void} [onAction] - Hàm xử lý khi bấm nút hành động nhanh
 * @property {string} [className=''] - Class CSS bổ sung
 */

/**
 * Shared UI V0 — EmptyState Component
 * Hiển thị minh họa và thông báo khi danh sách hoặc dữ liệu rỗng.
 *
 * @param {EmptyStateProps & React.HTMLAttributes<HTMLDivElement>} props
 */
export function EmptyState({
  title = 'Chưa có dữ liệu hiển thị',
  description = 'Hiện chưa có bản ghi nào phù hợp với điều kiện tra cứu.',
  icon = null,
  action = null,
  actionLabel = '',
  onAction,
  className = '',
  ...rest
}) {
  return (
    <div className={`haui-empty-state ${className}`.trim()} {...rest}>
      <div className="haui-empty-state__icon" aria-hidden="true">
        {icon || (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        )}
      </div>

      <h4 className="haui-empty-state__title">{title}</h4>
      {description && <p className="haui-empty-state__description">{description}</p>}

      {action ? (
        <div style={{ marginTop: 'var(--space-2)' }}>{action}</div>
      ) : (
        actionLabel &&
        typeof onAction === 'function' && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <Button variant="secondary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        )
      )}
    </div>
  );
}

export default EmptyState;
