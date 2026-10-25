import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * HeroUI v3 Custom Select / Dropdown Component
 * Thay thế hoàn toàn HTML <select> mặc định của Google Chrome / trình duyệt.
 * Chuẩn phong cách HeroUI v3 với Popover bo góc tròn (rounded-2xl), shadow êm ái,
 * indicator mũi tên xoay chuyển mượt và checkmark icon cho mục được chọn.
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

  return React.createElement(
    'div',
    {
      ref: containerRef,
      className: `haui-select-container ${className}`.trim(),
      style: {
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        ...style
      }
    },

    // 1. Trigger Button (Hiển thị nhãn mục đã chọn và mũi tên Chevron)
    React.createElement(
      'button',
      {
        type: 'button',
        disabled,
        onClick: () => !disabled && setIsOpen(!isOpen),
        className: 'haui-select-trigger',
        style: {
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
        }
      },
      React.createElement(
        'span',
        {
          style: {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingRight: '8px'
          }
        },
        displayLabel
      ),
      React.createElement(
        'span',
        {
          className: 'material-symbols-outlined',
          style: {
            position: 'absolute',
            right: '14px',
            fontSize: '18px',
            color: 'var(--color-mid-gray, #737373)',
            transition: 'transform 200ms ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            pointerEvents: 'none'
          }
        },
        'expand_more'
      )
    ),

    // 2. Hidden native select for form data & SSR test assertions compatibility
    React.createElement(
      'select',
      {
        style: { display: 'none' },
        value: value !== undefined ? String(value) : '',
        onChange: () => {},
        readOnly: true,
        'aria-hidden': 'true',
        tabIndex: -1
      },
      normalizedOptions.map((opt) =>
        React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
      )
    ),

    // 3. HeroUI v3 Popover Menu (Tự động mở danh sách chuẩn HeroUI)
    isOpen
      ? React.createElement(
          'div',
          {
            className: 'haui-select-popover',
            role: 'listbox',
            style: {
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
            }
          },
          normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);

            return React.createElement(
              'div',
              {
                key: opt.value,
                role: 'option',
                'aria-selected': isSelected,
                onClick: () => handleSelect(opt),
                style: {
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
                },
                onMouseEnter: (e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--color-canvas, #f5f5f5)';
                  }
                },
                onMouseLeave: (e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }
              },
              React.createElement('span', null, opt.label),
              isSelected
                ? React.createElement(
                    'span',
                    {
                      className: 'material-symbols-outlined',
                      style: {
                        fontSize: '16px',
                        color: 'var(--color-ink, #0a0a0a)',
                        marginLeft: '8px'
                      }
                    },
                    'check'
                  )
                : null
            );
          })
        )
      : null
  );
}

export default Select;
