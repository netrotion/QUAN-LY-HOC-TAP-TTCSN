import React from 'react';

/**
 * @typedef {Object} LoadingProps
 * @property {'spinner' | 'skeleton' | 'inline'} [variant='spinner'] - Kiểu hiển thị trạng thái chờ
 * @property {'sm' | 'md' | 'lg'} [size='md'] - Kích cỡ spinner
 * @property {string} [label='Đang tải dữ liệu...'] - Thông điệp hiển thị kèm spinner
 * @property {number} [lines=3] - Số dòng skeleton khi ở chế độ `skeleton`
 * @property {string} [className=''] - Class CSS bổ sung
 */

/**
 * Shared UI V0 — Loading Component
 * Cung cấp spinner, inline loader và skeleton phục vụ trạng thái chờ dữ liệu.
 *
 * @param {LoadingProps & React.HTMLAttributes<HTMLDivElement>} props
 */
export function Loading({
  variant = 'spinner',
  size = 'md',
  label = 'Đang tải dữ liệu...',
  lines = 3,
  className = '',
  ...rest
}) {
  const normalizedSize = ['sm', 'md', 'lg'].includes(size) ? size : 'md';

  if (variant === 'skeleton') {
    const lineCount = Math.max(1, Math.min(12, Number(lines) || 3));
    const widths = ['100%', '88%', '72%', '94%', '64%'];

    return (
      <div
        className={`haui-skeleton-group ${className}`.trim()}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label || 'Đang tải nội dung'}
        {...rest}
      >
        {Array.from({ length: lineCount }).map((_, idx) => (
          <div
            key={idx}
            className="haui-skeleton-line"
            style={{ width: widths[idx % widths.length] }}
          />
        ))}
      </div>
    );
  }

  const isInline = variant === 'inline';

  return (
    <div
      className={`haui-loading ${isInline ? 'haui-loading--inline' : ''} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
      {...rest}
    >
      <span className={`haui-spinner haui-spinner--${normalizedSize}`} aria-hidden="true" />
      {label && <span style={{ fontSize: isInline ? 'var(--text-xs)' : 'var(--text-sm)' }}>{label}</span>}
    </div>
  );
}

export default Loading;
