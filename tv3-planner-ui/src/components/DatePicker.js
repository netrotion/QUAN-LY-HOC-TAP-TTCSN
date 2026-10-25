import React, { useState, useEffect, useRef, useMemo } from 'react';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

/**
 * HeroUI v3 Custom DatePicker Component
 * Thay thế hoàn toàn datepicker mặc định của trình duyệt / Google Chrome.
 * Chuẩn phong cách HeroUI v3 với card popover, rounded-2xl, elevation shadow, và OKLCH tokens.
 */
export function DatePicker({
  value = '',
  onChange,
  placeholder = 'Chọn ngày sinh (Ngày/Tháng/Năm)',
  minYear = 1970,
  maxYear = 2030,
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Phân tích chuỗi ngày: chấp nhận YYYY-MM-DD hoặc DD/MM/YYYY
  const parsedDate = useMemo(() => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 1900 && m >= 0 && m < 12 && d >= 1 && d <= 31) {
          return new Date(y, m, d);
        }
      }
    }
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 1900 && m >= 0 && m < 12 && d >= 1 && d <= 31) {
          return new Date(y, m, d);
        }
      }
    }
    return null;
  }, [value]);

  const [viewYear, setViewYear] = useState(() => (parsedDate ? parsedDate.getFullYear() : 2004));
  const [viewMonth, setViewMonth] = useState(() => (parsedDate ? parsedDate.getMonth() : 0));

  useEffect(() => {
    if (parsedDate) {
      setViewYear(parsedDate.getFullYear());
      setViewMonth(parsedDate.getMonth());
    }
  }, [parsedDate]);

  // Đóng popover khi click ra ngoài
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

  // Chuỗi hiển thị trên input (DD/MM/YYYY)
  const displayValue = useMemo(() => {
    if (!parsedDate) return value || '';
    const d = String(parsedDate.getDate()).padStart(2, '0');
    const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const y = parsedDate.getFullYear();
    return `${d}/${m}/${y}`;
  }, [parsedDate, value]);

  // Số ngày trong tháng đang xem và thứ của ngày đầu tiên (0: Thứ 2 ... 6: Chủ nhật)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const handleSelectDay = (day) => {
    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (typeof onChange === 'function') {
      onChange({ target: { value: formatted } });
    }
    setIsOpen(false);
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (typeof onChange === 'function') {
      onChange({ target: { value: '' } });
    }
    setIsOpen(false);
  };

  const handleToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (typeof onChange === 'function') {
      onChange({ target: { value: formatted } });
    }
    setIsOpen(false);
  };

  const years = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  const today = new Date();
  const isToday = (day) =>
    today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;

  const isSelected = (day) =>
    parsedDate &&
    parsedDate.getDate() === day &&
    parsedDate.getMonth() === viewMonth &&
    parsedDate.getFullYear() === viewYear;

  return React.createElement(
    'div',
    {
      ref: containerRef,
      className: `haui-datepicker-container ${className}`.trim(),
      style: { position: 'relative', width: '100%', ...style }
    },

    // 1. Trigger Input Box
    React.createElement(
      'div',
      {
        onClick: () => setIsOpen(!isOpen),
        style: {
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          cursor: 'pointer'
        }
      },
      React.createElement('input', {
        type: 'text',
        readOnly: true,
        placeholder,
        value: displayValue,
        className: 'haui-input',
        style: {
          width: '100%',
          padding: '8px 40px 8px 16px',
          borderRadius: 'var(--heroui-radius-full, 9999px)',
          backgroundColor: 'var(--color-canvas, #f5f5f5)',
          border: '1px solid var(--color-hairline, #e5e5e5)',
          color: displayValue ? 'var(--color-ink, #0a0a0a)' : 'var(--color-mid-gray, #737373)',
          cursor: 'pointer',
          boxSizing: 'border-box',
          fontSize: '13px'
        }
      }),
      React.createElement(
        'span',
        {
          className: 'material-symbols-outlined',
          style: {
            position: 'absolute',
            right: '14px',
            fontSize: '18px',
            color: 'var(--color-mid-gray, #737373)',
            pointerEvents: 'none'
          }
        },
        'calendar_today'
      )
    ),

    // 2. HeroUI v3 Calendar Popover Dropdown
    isOpen
      ? React.createElement(
          'div',
          {
            className: 'haui-datepicker-popover',
            style: {
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              zIndex: 100,
              backgroundColor: 'var(--color-paper, #ffffff)',
              borderRadius: 'var(--heroui-radius-xl, 24px)',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              boxShadow: 'var(--heroui-shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.12))',
              padding: '16px',
              width: '300px',
              boxSizing: 'border-box'
            }
          },

          // Popover Header: Month & Year Controls
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                gap: '6px'
              }
            },
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: handlePrevMonth,
                title: 'Tháng trước',
                style: {
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--heroui-radius-full, 9999px)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 150ms'
                }
              },
              '‹'
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
              React.createElement(
                'select',
                {
                  value: viewMonth,
                  onChange: (e) => setViewMonth(parseInt(e.target.value, 10)),
                  style: {
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-ink, #0a0a0a)',
                    cursor: 'pointer',
                    outline: 'none'
                  }
                },
                MONTHS.map((m, idx) =>
                  React.createElement('option', { key: idx, value: idx }, m)
                )
              ),
              React.createElement(
                'select',
                {
                  value: viewYear,
                  onChange: (e) => setViewYear(parseInt(e.target.value, 10)),
                  style: {
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-ink, #0a0a0a)',
                    cursor: 'pointer',
                    outline: 'none'
                  }
                },
                years.map((y) =>
                  React.createElement('option', { key: y, value: y }, y)
                )
              )
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: handleNextMonth,
                title: 'Tháng sau',
                style: {
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--heroui-radius-full, 9999px)',
                  border: '1px solid var(--color-hairline, #e5e5e5)',
                  backgroundColor: 'var(--color-canvas, #f5f5f5)',
                  color: 'var(--color-ink, #0a0a0a)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 150ms'
                }
              },
              '›'
            )
          ),

          // Weekday Labels
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                textAlign: 'center',
                marginBottom: '8px'
              }
            },
            WEEKDAYS.map((wd) =>
              React.createElement(
                'span',
                {
                  key: wd,
                  style: {
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-mid-gray, #737373)'
                  }
                },
                wd
              )
            )
          ),

          // Days Grid
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '3px',
                textAlign: 'center'
              }
            },
            Array.from({ length: firstDayIndex }).map((_, idx) =>
              React.createElement('div', { key: `empty-${idx}` })
            ),
            Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const selected = isSelected(day);
              const current = isToday(day);

              return React.createElement(
                'button',
                {
                  key: day,
                  type: 'button',
                  onClick: () => handleSelectDay(day),
                  style: {
                    width: '32px',
                    height: '32px',
                    margin: 'auto',
                    border: current && !selected ? '1px solid var(--color-ink, #0a0a0a)' : 'none',
                    borderRadius: 'var(--heroui-radius-full, 9999px)',
                    backgroundColor: selected
                      ? 'var(--color-ink, #0a0a0a)'
                      : 'transparent',
                    color: selected
                      ? 'var(--color-paper, #ffffff)'
                      : 'var(--color-ink, #0a0a0a)',
                    fontWeight: selected || current ? 600 : 400,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 150ms'
                  }
                },
                day
              );
            })
          ),

          // Popover Footer Actions (Xóa, Hôm nay, Đóng)
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px solid var(--color-hairline, #e5e5e5)',
                fontSize: '12px'
              }
            },
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: handleClear,
                style: {
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-mid-gray, #737373)',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }
              },
              'Xóa'
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', gap: '8px' } },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: handleToday,
                  style: {
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-ink, #0a0a0a)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '2px 6px'
                  }
                },
                'Hôm nay'
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setIsOpen(false),
                  style: {
                    background: 'var(--color-canvas, #f5f5f5)',
                    border: '1px solid var(--color-hairline, #e5e5e5)',
                    borderRadius: 'var(--heroui-radius-full, 9999px)',
                    color: 'var(--color-ink, #0a0a0a)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '2px 8px'
                  }
                },
                'Đóng'
              )
            )
          )
        )
      : null
  );
}

export default DatePicker;
