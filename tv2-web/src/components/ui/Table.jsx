import React from 'react';
import { EmptyState } from './EmptyState.jsx';
import { Loading } from './Loading.jsx';
import { Error as ErrorBox } from './Error.jsx';

/**
 * @typedef {Object} TableColumn
 * @property {string} key - Định danh duy nhất của cột
 * @property {React.ReactNode} [title] - Tiêu đề hiển thị trên thẻ `<th>`
 * @property {React.ReactNode} [header] - Alias cho `title`
 * @property {string} [dataIndex] - Tên trường dữ liệu trên object row (mặc định lấy theo `key`)
 * @property {'left' | 'center' | 'right'} [align='left'] - Căn lề nội dung cột
 * @property {string | number} [width] - Độ rộng cột
 * @property {(value: any, row: Object, rowIndex: number) => React.ReactNode} [render] - Hàm custom render cho ô dữ liệu
 */

/**
 * @typedef {Object} TableProps
 * @property {TableColumn[]} columns - Cấu hình danh sách cột
 * @property {Object[]} [data=[]] - Danh sách bản ghi dữ liệu
 * @property {string | ((row: Object, index: number) => string | number)} [rowKey='id'] - Khóa định danh dòng
 * @property {boolean} [loading=false] - Trạng thái đang tải bảng
 * @property {any} [error=null] - Đối tượng lỗi hoặc thông báo lỗi
 * @property {() => void} [onRetry] - Hàm thử lại khi bảng gặp lỗi
 * @property {string} [emptyTitle='Không có dữ liệu trong bảng'] - Tiêu đề khi bảng rỗng
 * @property {string} [emptyDescription='Chưa có bản ghi nào để hiển thị.'] - Mô tả khi bảng rỗng
 * @property {React.ReactNode} [emptyAction] - Nút hành động khi bảng rỗng
 * @property {boolean} [striped=false] - Tô màu xen kẽ các dòng
 * @property {boolean} [hoverable=true] - Hiệu ứng hover trên dòng
 * @property {(row: Object, index: number) => void} [onRowClick] - Sự kiện click vào một dòng
 * @property {string} [className=''] - Class CSS bổ sung
 */

/**
 * Shared UI V0 — Table Component
 * Hiển thị bảng dữ liệu chuẩn, hỗ trợ custom column render, trạng thái loading, error và rỗng (EmptyState).
 *
 * @param {TableProps} props
 */
export function Table({
  columns = [],
  data = [],
  rowKey = 'id',
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Không có dữ liệu học phần / bản ghi',
  emptyDescription = 'Hiện chưa có dữ liệu phù hợp với bộ lọc hoặc trạng thái tra cứu.',
  emptyAction = null,
  striped = false,
  hoverable = true,
  onRowClick,
  className = ''
}) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];

  if (loading) {
    return (
      <div className={`haui-table-wrapper ${className}`.trim()}>
        <Loading label="Đang tải dữ liệu bảng..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBox
        title="Không thể hiển thị bảng dữ liệu"
        error={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  const resolveRowKey = (row, idx) => {
    if (typeof rowKey === 'function') {
      return rowKey(row, idx);
    }
    if (row && typeof row === 'object' && row[rowKey] !== undefined && row[rowKey] !== null) {
      return String(row[rowKey]);
    }
    if (row && typeof row === 'object' && row.courseCode) {
      return String(row.courseCode);
    }
    return `row-${idx}`;
  };

  const tableClasses = [
    'haui-table',
    striped ? 'haui-table--striped' : '',
    hoverable ? 'haui-table--hoverable' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`haui-table-wrapper ${className}`.trim()}>
      <table className={tableClasses}>
        <thead>
          <tr>
            {safeColumns.map((col, colIdx) => {
              const colKey = col.key || col.dataIndex || `col-${colIdx}`;
              return (
                <th
                  key={colKey}
                  style={{
                    textAlign: col.align || 'left',
                    width: col.width || undefined
                  }}
                >
                  {col.title ?? col.header ?? colKey}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {safeData.length === 0 ? (
            <tr>
              <td colSpan={Math.max(1, safeColumns.length)} style={{ padding: 'var(--space-4)' }}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          ) : (
            safeData.map((row, rowIdx) => (
              <tr
                key={resolveRowKey(row, rowIdx)}
                onClick={typeof onRowClick === 'function' ? () => onRowClick(row, rowIdx) : undefined}
                style={{ cursor: typeof onRowClick === 'function' ? 'pointer' : 'default' }}
              >
                {safeColumns.map((col, colIdx) => {
                  const colKey = col.key || col.dataIndex || `col-${colIdx}`;
                  const fieldName = col.dataIndex || col.key;
                  const rawValue = row && fieldName ? row[fieldName] : undefined;

                  let cellContent;
                  if (typeof col.render === 'function') {
                    cellContent = col.render(rawValue, row, rowIdx);
                  } else if (rawValue === null || rawValue === undefined || rawValue === '') {
                    // Quy tắc 5 AGENTS.md: Không tự biến null thành 0 hoặc "đạt"
                    cellContent = (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        null / UNKNOWN
                      </span>
                    );
                  } else {
                    cellContent = String(rawValue);
                  }

                  return (
                    <td
                      key={`${resolveRowKey(row, rowIdx)}-${colKey}`}
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
