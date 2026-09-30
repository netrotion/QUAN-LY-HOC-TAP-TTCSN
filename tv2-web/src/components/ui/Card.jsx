import React from 'react';

/**
 * @typedef {Object} CardProps
 * @property {React.ReactNode} [title] - Tiêu đề chính trên phần header
 * @property {React.ReactNode} [subtitle] - Mô tả phụ dưới tiêu đề
 * @property {React.ReactNode} [header] - Nội dung header tùy chỉnh hoàn toàn
 * @property {React.ReactNode} [headerAction] - Nút hoặc badge góc phải của header
 * @property {React.ReactNode} [footer] - Nội dung chân card (footer)
 * @property {'default' | 'elevated' | 'status-info' | 'status-success' | 'status-warning' | 'status-error'} [variant='default']
 * @property {'none' | 'sm' | 'md' | 'lg'} [padding='md'] - Khoảng đệm phần body
 * @property {string} [className=''] - Class CSS bổ sung
 * @property {React.ReactNode} [children] - Nội dung phần thân (body)
 */

/**
 * Shared UI V0 — Card Component
 * Bọc nội dung có header, body, footer chuẩn hóa cho các màn hình học vụ và planner.
 *
 * @param {CardProps & React.HTMLAttributes<HTMLDivElement>} props
 */
export function Card({
  title,
  subtitle,
  header,
  headerAction,
  footer,
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...rest
}) {
  const hasHeader = Boolean(header || title || subtitle || headerAction);

  const cardClasses = [
    'haui-card',
    variant !== 'default' ? `haui-card--${variant}` : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const bodyClasses = [
    'haui-card__body',
    padding !== 'md' ? `haui-card__body--${padding}` : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses} {...rest}>
      {hasHeader && (
        <div className="haui-card__header">
          {header ? (
            header
          ) : (
            <div>
              {title && <h3 className="haui-card__title">{title}</h3>}
              {subtitle && <p className="haui-card__subtitle">{subtitle}</p>}
            </div>
          )}
          {headerAction && <div className="haui-card__actions">{headerAction}</div>}
        </div>
      )}

      <div className={bodyClasses}>{children}</div>

      {footer && <div className="haui-card__footer">{footer}</div>}
    </div>
  );
}

/**
 * Sub-component Card.Header hỗ trợ viết dạng compound component nếu TV3 cần
 */
Card.Header = function CardHeader({ title, subtitle, action, children, className = '', ...rest }) {
  return (
    <div className={`haui-card__header ${className}`.trim()} {...rest}>
      {children || (
        <div>
          {title && <h3 className="haui-card__title">{title}</h3>}
          {subtitle && <p className="haui-card__subtitle">{subtitle}</p>}
        </div>
      )}
      {action && <div className="haui-card__actions">{action}</div>}
    </div>
  );
};

/**
 * Sub-component Card.Body
 */
Card.Body = function CardBody({ children, className = '', ...rest }) {
  return (
    <div className={`haui-card__body ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
};

/**
 * Sub-component Card.Footer
 */
Card.Footer = function CardFooter({ children, className = '', ...rest }) {
  return (
    <div className={`haui-card__footer ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
};

export default Card;
