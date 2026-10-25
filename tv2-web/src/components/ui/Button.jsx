import React from 'react';

/**
 * @typedef {'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'} ButtonVariant
 * @typedef {'sm' | 'md' | 'lg'} ButtonSize
 *
 * @typedef {Object} ButtonProps
 * @property {ButtonVariant} [variant='primary'] - Kiểu hiển thị nút
 * @property {ButtonSize} [size='md'] - Kích thước nút (sm, md, lg)
 * @property {boolean} [loading=false] - Trạng thái đang xử lý (hiển thị spinner và vô hiệu hóa click)
 * @property {boolean} [disabled=false] - Trạng thái vô hiệu hóa
 * @property {boolean} [fullWidth=false] - Giãn toàn bộ chiều ngang container
 * @property {'button' | 'submit' | 'reset'} [type='button'] - Thuộc tính type của thẻ button
 * @property {React.ReactNode} [leftIcon] - Icon bên trái nhãn
 * @property {React.ReactNode} [rightIcon] - Icon bên phải nhãn
 * @property {string} [className=''] - Class CSS bổ sung
 * @property {(event: React.MouseEvent<HTMLButtonElement>) => void} [onClick] - Hàm xử lý sự kiện click
 * @property {(event: React.MouseEvent<HTMLButtonElement>) => void} [onPress] - Handler chuẩn HeroUI v3
 * @property {React.ReactNode} [children] - Nội dung nút
 */

/**
 * Shared UI V0 — Button Component (HeroUI v3 Enhanced)
 * Hỗ trợ variants (primary, secondary, danger, ghost, outline), sizes (sm, md, lg), loading và disabled.
 *
 * @param {ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  leftIcon = null,
  rightIcon = null,
  className = '',
  onClick,
  onPress,
  children,
  ...rest
}) {
  const normalizedVariant = Button.VARIANTS.includes(variant) ? variant : 'primary';
  const normalizedSize = Button.SIZES.includes(size) ? size : 'md';
  const isDisabled = Boolean(disabled || loading);

  const classes = [
    'haui-btn',
    `haui-btn--${normalizedVariant}`,
    `haui-btn--${normalizedSize}`,
    fullWidth ? 'haui-btn--full' : '',
    isDisabled ? 'haui-btn--disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (event) => {
    if (isDisabled) {
      event.preventDefault();
      return;
    }
    if (typeof onClick === 'function') {
      onClick(event);
    }
    if (typeof onPress === 'function') {
      onPress(event);
    }
  };

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      aria-disabled={isDisabled ? 'true' : undefined}
      data-variant={normalizedVariant}
      data-size={normalizedSize}
      onClick={handleClick}
      {...rest}
    >
      {loading && (
        <span
          className="haui-spinner haui-spinner--sm"
          aria-hidden="true"
          style={{
            borderColor:
              normalizedVariant === 'primary' || normalizedVariant === 'danger'
                ? 'rgba(255, 255, 255, 0.35)'
                : 'var(--color-border-strong)',
            borderTopColor:
              normalizedVariant === 'primary' || normalizedVariant === 'danger'
                ? '#ffffff'
                : 'var(--color-primary)'
          }}
        />
      )}
      {!loading && leftIcon && <span className="haui-btn__icon-left">{leftIcon}</span>}
      {children && <span className="haui-btn__label">{children}</span>}
      {!loading && rightIcon && <span className="haui-btn__icon-right">{rightIcon}</span>}
    </button>
  );
}

Button.VARIANTS = Object.freeze(['primary', 'secondary', 'danger', 'ghost', 'outline']);
Button.SIZES = Object.freeze(['sm', 'md', 'lg']);

export default Button;
