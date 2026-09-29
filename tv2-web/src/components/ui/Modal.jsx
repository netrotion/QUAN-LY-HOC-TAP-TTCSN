import React, { useEffect } from 'react';

/**
 * @typedef {Object} ModalProps
 * @property {boolean} [isOpen=false] - Trạng thái mở/đóng hộp thoại
 * @property {boolean} [open] - Alias cho `isOpen`
 * @property {() => void} [onClose] - Hàm đóng hộp thoại
 * @property {React.ReactNode} [title] - Tiêu đề hộp thoại
 * @property {React.ReactNode} [subtitle] - Mô tả phụ dưới tiêu đề
 * @property {'sm' | 'md' | 'lg' | 'xl'} [size='md'] - Kích thước hộp thoại
 * @property {boolean} [closeOnBackdrop=true] - Cho phép bấm ra vùng nền tối để đóng
 * @property {boolean} [closeOnEsc=true] - Cho phép nhấn phím ESC để đóng
 * @property {React.ReactNode} [footer] - Nội dung chân hộp thoại (chứa các nút hành động)
 * @property {React.ReactNode} [children] - Nội dung thân hộp thoại
 */

/**
 * Shared UI V0 — Modal Component
 * Hộp thoại popup có backdrop, nút đóng, phím ESC để đóng và tự động khóa cuộn trang (lock scroll).
 *
 * @param {ModalProps} props
 */
export function Modal({
  isOpen = false,
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  footer = null,
  children
}) {
  const visible = Boolean(open !== undefined ? open : isOpen);
  const normalizedSize = ['sm', 'md', 'lg', 'xl'].includes(size) ? size : 'md';

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    // 1. Lock body scroll khi mở Modal
    let previousOverflow = '';
    if (typeof document !== 'undefined' && document.body) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    // 2. Lắng nghe phím ESC để đóng Modal
    const handleKeyDown = (event) => {
      if (closeOnEsc && event.key === 'Escape' && typeof onClose === 'function') {
        event.stopPropagation();
        onClose();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = previousOverflow;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [visible, closeOnEsc, onClose]);

  if (!visible) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (closeOnBackdrop && event.target === event.currentTarget && typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div
      className="haui-modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
      data-testid="haui-modal-backdrop"
    >
      <div
        className={`haui-modal haui-modal--${normalizedSize}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'haui-modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="haui-modal__header">
          <div>
            {title && (
              <h3 id="haui-modal-title" className="haui-modal__title">
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>

          {typeof onClose === 'function' && (
            <button
              type="button"
              className="haui-modal__close"
              onClick={onClose}
              aria-label="Đóng hộp thoại (ESC)"
              title="Đóng (ESC)"
            >
              ×
            </button>
          )}
        </div>

        <div className="haui-modal__body">{children}</div>

        {footer && <div className="haui-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
