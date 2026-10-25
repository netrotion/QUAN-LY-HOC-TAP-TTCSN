import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Shared UI V0 / HeroUI v3 — Select / Dropdown Component
 * Thay thế hoàn toàn HTML <select> mặc định của Google Chrome và trình duyệt.
 * Chuẩn phong cách HeroUI v3 với Popover bo góc tròn (rounded-2xl), shadow êm ái,
 * indicator mũi tên xoay chuyển mượt và checkmark icon cho mục được chọn.
 *
 * @param {Object} props
 * @param {string | number} props.value - Giá trị mục đang chọn
 * @param {(e: { target: { value: string } }) => void} props.onChange - Handler thay đổi
 * @param {Array<{ value: string|number, label: string } | string>} [props.options=[]] - Danh sách options
 * @param {string} [props.placeholder='Chọn một mục...'] - Placeholder khi chưa chọn
 * @param {boolean} [props.disabled=false] - Trạng thái vô hiệu hóa
 * @param {string} [props.className=''] - Class CSS bổ sung
 * @param {React.CSSProperties} [props.style] - Inline style container
 * @param {React.CSSProperties} [props.triggerStyle] - Inline style nút trigger
 * @param {React.ReactNode} [props.children] - Thẻ <option> nếu viết theo cú pháp JSX truyền thống
 */
export function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Chọn một mục...',
  disabled = false,
  className = '',
  style = {},
  triggerStyle = {},
  children
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Chuẩn hóa danh sách options từ props `options` hoặc từ `children` (thẻ <option>)
  const normalizedOptions = useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map((opt) =>
        typeof opt === 'string'
          ? { value: opt, label: opt }
          : { value: opt.value, label: opt.label ?? opt.value }
      );
    }

    if (children) {
      const extracted = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          const val = child.props.value !== undefined ? child.props.value : child.props.children;
          const lbl = child.props.children || child.props.value;
          extracted.push({
            value: typeof val === 'string' || typeof val === 'number' ? String(val) : String(lbl),
            label: typeof lbl === 'string' || typeof lbl === 'number' ? String(lbl) : String(val)
          });
        }
      });
      return extracted;
    }

    return [];
  }, [options, children]);

  // Tìm option đang được chọn
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value)) || null;
  }, [normalizedOptions, value]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Đóng khi nhấn phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (opt) => {
    if (disabled) return;
    if (typeof onChange === 'function') {
      onChange({ target: { value: opt.value } });
    }
    setIsOpen(false);
  };

  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div
      ref={containerRef}
      className={`haui-select-container ${className}`.trim()}
      style={{
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        ...style
      }}
    >
      {/* 1. Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="haui-select-trigger"
        style={{
          width: '100%',
          padding: '8px 40px 8px 16px',
          borderRadius: 'var(--heroui-radius-full, 9999px)',
          backgroundColor: 'var(--field-background, var(--color-canvas, #f5f5f5))',
          border: isOpen
            ? '1px solid var(--heroui-focus, #0052cc)'
            : '1px solid var(--color-hairline, #e5e5e5)',
          color: selectedOption
            ? 'var(--color-ink, #0a0a0a)'
            : 'var(--color-mid-gray, #737373)',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all var(--transition-fast, 150ms)',
          boxShadow: isOpen
            ? '0 0 0 3px oklch(0.6204 0.195 253.83 / 0.15)'
            : 'none',
          opacity: disabled ? 0.6 : 1,
          ...triggerStyle
        }}
      >
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingRight: '8px'
          }}
        >
          {displayLabel}
        </span>
        <span
          className="material-symbols-outlined"
          style={{
            position: 'absolute',
            right: '14px',
            fontSize: '18px',
            color: 'var(--color-mid-gray, #737373)',
            transition: 'transform 200ms ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            pointerEvents: 'none'
          }}
        >
          expand_more
        </span>
      </button>

      {/* 2. Hidden native select for form data & SSR test assertions compatibility */}
      <select
        style={{ display: 'none' }}
        value={value !== undefined ? String(value) : ''}
        onChange={() => {}}
        readOnly
        aria-hidden="true"
        tabIndex={-1}
      >
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* 3. HeroUI v3 Popover Menu */}
      {isOpen && (
        <div
          className="haui-select-popover"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            zIndex: 100,
            backgroundColor: 'var(--color-paper, #ffffff)',
            borderRadius: 'var(--heroui-radius-lg, 16px)',
            border: '1px solid var(--color-hairline, #e5e5e5)',
            boxShadow: 'var(--heroui-shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.12))',
            padding: '6px',
            maxHeight: '260px',
            overflowY: 'auto',
            boxSizing: 'border-box',
            animation: 'haui-select-enter 150ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);

            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--heroui-radius-md, 10px)',
                  backgroundColor: isSelected
                    ? 'var(--color-canvas, #f5f5f5)'
                    : 'transparent',
                  color: 'var(--color-ink, #0a0a0a)',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 120ms ease',
                  margin: '1px 0'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--color-canvas, #f5f5f5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '16px',
                      color: 'var(--color-ink, #0a0a0a)',
                      marginLeft: '8px'
                    }}
                  >
                    check
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Select;
