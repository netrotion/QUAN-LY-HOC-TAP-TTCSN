import React from 'react';

/**
 * Logo HaUI Advisor (prototype-v1 — tv3-planner-ui/design/prototype/logo)
 * `compact`: chỉ hiển thị biểu tượng chữ H, dùng cho sidebar thu gọn.
 *
 * @param {{ compact?: boolean, className?: string }} props
 */
export function BrandLogo({ compact = false, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={compact ? '0 0 32 40' : '0 0 120 40'}
      className={className}
      fill="none"
      role="img"
      aria-label="HAUI ADVISOR"
    >
      <rect x="2" y="6" width="28" height="28" rx="8" fill="#0a0a0a" />
      <path
        d="M9 13v14M23 13v14M9 20h14"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="13" r="2.5" fill="#e7000b" />
      {!compact && (
        <>
          <text
            x="38"
            y="22"
            fontFamily="Geist, -apple-system, sans-serif"
            fontSize="14"
            fontWeight="700"
            fill="#0a0a0a"
            letterSpacing="-0.5px"
          >
            HAUI
          </text>
          <text
            x="38"
            y="31"
            fontFamily="Geist, -apple-system, sans-serif"
            fontSize="9"
            fontWeight="500"
            fill="#737373"
            letterSpacing="0.5px"
          >
            ADVISOR
          </text>
        </>
      )}
    </svg>
  );
}

export default BrandLogo;
