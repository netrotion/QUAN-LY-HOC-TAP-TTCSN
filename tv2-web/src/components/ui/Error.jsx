import React from 'react';
import { Button } from './Button.jsx';

/**
 * @typedef {Object} ErrorComponentProps
 * @property {string} [title='Không thể tải dữ liệu'] - Tiêu đề lỗi
 * @property {string | Error | Object} [message] - Nội dung lỗi hoặc đối tượng lỗi từ API
 * @property {any} [error] - Alias cho `message` (nhận Error object hoặc chuỗi)
 * @property {string} [code] - Mã lỗi kỹ thuật (VD: `NOT_IMPLEMENTED`, `NETWORK_ERROR`)
 * @property {string} [requestId] - Mã truy vết request từ Backend
 * @property {string[]} [details] - Danh sách thông tin chi tiết bổ sung
 * @property {() => void} [onRetry] - Callback khi người dùng bấm nút Thử lại
 * @property {string} [retryLabel='Thử lại'] - Nhãn nút retry
 * @property {string} [className=''] - Class CSS bổ sung
 */

/**
 * Shared UI V0 — Error Component
 * Hiển thị thông báo lỗi thân thiện kèm mã truy vết và nút Retry.
 *
 * @param {ErrorComponentProps & React.HTMLAttributes<HTMLDivElement>} props
 */
export function Error({
  title = 'Đã xảy ra lỗi khi xử lý yêu cầu',
  message,
  error,
  code,
  requestId,
  details,
  onRetry,
  retryLabel = 'Thử lại',
  className = '',
  ...rest
}) {
  const sourceError = error || message;
  const resolvedMessage =
    typeof sourceError === 'string'
      ? sourceError
      : sourceError?.message || 'Hệ thống gặp sự cố không mong muốn. Vui lòng kiểm tra kết nối và thử lại.';

  const resolvedCode = code || (typeof sourceError === 'object' ? sourceError?.code : null);
  const resolvedRequestId = requestId || (typeof sourceError === 'object' ? sourceError?.requestId : null);
  const resolvedDetails =
    Array.isArray(details) && details.length > 0
      ? details
      : Array.isArray(sourceError?.details)
        ? sourceError.details
        : [];

  return (
    <div className={`haui-error ${className}`.trim()} role="alert" {...rest}>
      <div className="haui-error__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span aria-hidden="true" style={{ fontSize: '18px', lineHeight: 1 }}>
            ⚠️
          </span>
          <h4 className="haui-error__title">{title}</h4>
        </div>

        {typeof onRetry === 'function' && (
          <Button variant="danger" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </div>

      <p className="haui-error__message">{resolvedMessage}</p>

      {resolvedDetails.length > 0 && (
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: 'var(--text-xs)', color: '#7f1d1d' }}>
          {resolvedDetails.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}

      {(resolvedCode || resolvedRequestId) && (
        <div className="haui-error__meta">
          {resolvedCode && <span className="haui-badge haui-badge--error">Code: {resolvedCode}</span>}
          {resolvedRequestId && (
            <span className="haui-badge haui-badge--neutral">Request ID: {resolvedRequestId}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default Error;
