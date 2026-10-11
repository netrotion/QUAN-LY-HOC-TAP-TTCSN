import React, { useEffect } from 'react';

const h = React.createElement;

/**
 * Modal Tra cứu Cây môn học & Sơ đồ Tiên quyết (Curriculum Tree Explorer) — TV3
 * Giao diện theo prototype `cay_mon_hoc/code.html` (thẻ môn bo 16px, chú thích trạng thái đơn sắc,
 * ember chỉ dùng cho môn nợ/thiếu điều kiện) và khung modal của `ke_hoach_hoc_tap_ca_nhan`.
 *
 * Thực hiện yêu cầu nghiệp vụ:
 * "AI/What-if/Audit cùng về một Planner; xem tree là tùy chọn."
 * -> Cung cấp bảng tra cứu chuỗi môn học và điều kiện tiên quyết trực tiếp ngay trong Planner
 *    mà không làm đứt đoạn quy trình lập kế hoạch.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} [props.ui] - Bộ UI chung từ TV2 (giữ để tương thích hợp đồng, modal tự dựng theo prototype)
 * @param {string[]} [props.plannedCourseCodes] - Mã các môn đang có trong Kế hoạch học tập (đánh dấu "Trong kế hoạch")
 * @param {Function} [props.onOpenFullTree] - Mở màn Cây môn học đầy đủ (/curriculum)
 */

// Chuỗi quan hệ tiên quyết cốt lõi ngành CNTT / KTPM HaUI (dữ liệu mẫu tra cứu nhanh)
const PREREQUISITE_CHAINS = [
  {
    chainName: 'Chuỗi 1: Cấu trúc dữ liệu & Thuật toán',
    steps: [
      { code: 'MATH1002', name: 'Toán rời rạc', credits: 3, status: 'FAILED', note: 'Nợ môn F - Nút thắt cần gỡ ngay' },
      { code: 'IT6001', name: 'Cấu trúc dữ liệu & GT', credits: 4, status: 'BLOCKED', note: 'Chờ tiên quyết MATH1002' },
      { code: 'IT6005', name: 'PT & Thiết kế thuật toán', credits: 3, status: 'LOCKED', note: 'Chờ hoàn thành IT6001' }
    ]
  },
  {
    chainName: 'Chuỗi 2: Kỹ thuật phần mềm & Khóa luận tốt nghiệp',
    steps: [
      { code: 'IT2001', name: 'Lập trình HĐT Java', credits: 4, status: 'PASSED', note: 'Đã hoàn thành (Điểm D+ - Cần cải thiện)' },
      { code: 'IT3005', name: 'Công nghệ phần mềm', credits: 3, status: 'PASSED', note: 'Đã hoàn thành (Điểm B)' },
      { code: 'IT6080', name: 'Đồ án chuyên ngành KTPM', credits: 4, status: 'PLANNED', note: 'Dự kiến đăng ký Kỳ 8' },
      { code: 'IT6090', name: 'Khóa luận tốt nghiệp', credits: 6, status: 'LOCKED', note: 'Cần hoàn thành Đồ án & ≥ 115 TC' }
    ]
  },
  {
    chainName: 'Chuỗi 3: Cơ sở dữ liệu & Ứng dụng',
    steps: [
      { code: 'IT2002', name: 'Cơ sở dữ liệu', credits: 3, status: 'PASSED', note: 'Đã hoàn thành (Điểm B+)' },
      { code: 'IT4001', name: 'Hệ QTCSDL nâng cao', credits: 3, status: 'PLANNED', note: 'Dự kiến đăng ký Kỳ 7' },
      { code: 'IT6010', name: 'Phát triển ứng dụng Web', credits: 3, status: 'PLANNED', note: 'Tự chọn chuyên ngành Kỳ 7' }
    ]
  }
];

// Kiểu hiển thị từng trạng thái node (đơn sắc theo prototype, ember cho nợ môn)
const NODE_STYLES = {
  PASSED: {
    card: 'p-3.5 bg-paper rounded-2xl border border-hairline shadow-sm flex flex-col gap-2 min-w-[180px] flex-1',
    code: 'font-caption text-caption font-semibold text-ink',
    title: 'font-body-medium text-body-medium text-ink font-medium leading-snug',
    foot: 'flex items-center gap-1 text-ink font-caption text-caption',
    icon: 'check_circle',
    label: 'Đã hoàn thành'
  },
  FAILED: {
    card: 'p-3.5 bg-paper rounded-2xl border border-ember shadow-sm flex flex-col gap-2 min-w-[180px] flex-1',
    code: 'font-caption text-caption font-semibold text-ember',
    title: 'font-body-medium text-body-medium text-ink font-medium leading-snug',
    foot: 'flex items-center gap-1 text-ember font-caption text-caption',
    icon: 'cancel',
    label: 'Nợ môn'
  },
  PLANNED: {
    card: 'p-3.5 bg-paper rounded-2xl ring-2 ring-ink shadow-md flex flex-col gap-2 min-w-[180px] flex-1',
    code: 'font-caption text-caption font-semibold text-ink',
    title: 'font-body-medium text-body-medium text-ink font-semibold leading-snug',
    foot: 'flex items-center gap-1 text-ink font-caption text-caption',
    icon: 'event_available',
    label: 'Đề xuất'
  },
  LOCKED: {
    card: 'p-3.5 bg-canvas/80 rounded-2xl border border-hairline flex flex-col gap-2 min-w-[180px] flex-1 opacity-75',
    code: 'font-caption text-caption font-semibold text-mid-gray',
    title: 'font-body-medium text-body-medium text-mid-gray font-medium leading-snug',
    foot: 'flex items-center gap-1 text-mid-gray font-caption text-caption',
    icon: 'lock',
    label: 'Khóa'
  }
};

const icon = (name, className = 'text-[16px]') =>
  h('span', { className: `material-symbols-outlined ${className}` }, name);

export function CurriculumTreeModal({ isOpen, onClose, ui, plannedCourseCodes, onOpenFullTree }) {
  // Đóng bằng phím ESC
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && typeof onClose === 'function') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const planned = new Set(Array.isArray(plannedCourseCodes) ? plannedCourseCodes : []);

  const legend = h(
    'div',
    { className: 'flex flex-wrap items-center gap-space-md text-mid-gray font-caption text-caption pb-space-sm border-b border-hairline' },
    h('span', { className: 'font-medium text-ink' }, 'Chú thích sơ đồ:'),
    h(
      'div',
      { className: 'flex items-center gap-1.5' },
      h('span', { className: 'w-3 h-3 rounded-full bg-paper ring-1 ring-ink flex items-center justify-center text-[8px] font-bold text-ink' }, '✓'),
      h('span', null, 'Đã hoàn thành')
    ),
    h('div', { className: 'flex items-center gap-1.5' }, h('span', { className: 'w-3 h-3 rounded-full bg-ink' }), h('span', null, 'Đề xuất / Trong kế hoạch')),
    h('div', { className: 'flex items-center gap-1.5' }, h('span', { className: 'w-3 h-3 rounded-full bg-paper ring-1 ring-ember' }), h('span', null, 'Nợ môn')),
    h('div', { className: 'flex items-center gap-1.5' }, icon('lock', 'text-[14px] text-mid-gray'), h('span', null, 'Khóa / Thiếu tiên quyết'))
  );

  const chains = PREREQUISITE_CHAINS.map((chain) =>
    h(
      'div',
      { key: chain.chainName, className: 'flex flex-col gap-space-sm' },
      h('span', { className: 'font-label text-label text-mid-gray uppercase tracking-wider font-semibold' }, chain.chainName),
      h(
        'div',
        { className: 'flex flex-wrap items-stretch gap-2' },
        chain.steps.map((step, idx) => {
          const style = NODE_STYLES[step.status] || NODE_STYLES.LOCKED;
          const inPlan = planned.has(step.code);
          return h(
            React.Fragment,
            { key: step.code },
            h(
              'div',
              { className: style.card },
              h(
                'div',
                { className: 'flex items-center justify-between gap-2' },
                h('span', { className: style.code }, step.code),
                h(
                  'span',
                  {
                    className:
                      step.status === 'LOCKED'
                        ? 'font-label text-label px-2 py-0.5 rounded-full bg-surface-variant text-mid-gray'
                        : 'font-label text-label px-2 py-0.5 rounded-full bg-ink text-paper'
                  },
                  `${step.credits} TC`
                )
              ),
              h('h4', { className: style.title }, step.name),
              h('p', { className: 'font-caption text-caption text-mid-gray' }, step.note),
              h(
                'div',
                { className: 'mt-auto flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-hairline' },
                h('div', { className: style.foot }, icon(style.icon, 'text-[14px]'), h('span', null, style.label)),
                inPlan
                  ? h('span', { className: 'font-label text-label text-paper bg-ink px-2 py-0.5 rounded-full whitespace-nowrap' }, 'Trong kế hoạch')
                  : null
              )
            ),
            idx < chain.steps.length - 1
              ? h('span', { className: 'self-center material-symbols-outlined text-[18px] text-mid-gray' }, 'arrow_forward')
              : null
          );
        })
      )
    )
  );

  return h(
    'div',
    {
      className: 'fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Cây môn học & Sơ đồ tiên quyết',
      onClick: (e) => {
        if (e.target === e.currentTarget && typeof onClose === 'function') onClose();
      }
    },
    h(
      'div',
      {
        className:
          'bg-paper rounded-[24px] max-w-4xl w-full p-space-xl border border-hairline shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col gap-space-md max-h-[90vh]'
      },
      h(
        'div',
        { className: 'flex items-start justify-between gap-space-md' },
        h(
          'div',
          { className: 'flex items-center gap-3' },
          h(
            'div',
            { className: 'w-10 h-10 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink shrink-0' },
            icon('account_tree', 'text-[22px]')
          ),
          h(
            'div',
            null,
            h('h3', { className: 'font-subheading text-subheading text-ink font-semibold' }, 'Cây môn học & Sơ đồ tiên quyết'),
            h(
              'p',
              { className: 'font-caption text-caption text-mid-gray mt-0.5' },
              'Tra cứu tùy chọn — đối chiếu học phần tiên quyết mà không ảnh hưởng tới tiến trình chỉnh sửa kế hoạch.'
            )
          )
        ),
        h(
          'button',
          {
            type: 'button',
            onClick: onClose,
            title: 'Đóng',
            className: 'w-8 h-8 rounded-full hover:bg-canvas flex items-center justify-center text-mid-gray hover:text-ink transition-colors shrink-0'
          },
          icon('close', 'text-[20px]')
        )
      ),
      legend,
      // p-1/-m-1: chừa chỗ cho viền ring-2 của thẻ "Đề xuất" không bị cắt bởi vùng cuộn
      h('div', { className: 'flex flex-col gap-space-lg overflow-y-auto p-1 -m-1' }, chains),
      h(
        'div',
        { className: 'flex flex-wrap items-center justify-between gap-space-sm pt-space-sm border-t border-hairline' },
        h(
          'p',
          { className: 'font-caption text-caption text-mid-gray max-w-md' },
          'Sơ đồ rút gọn theo quy chế HaUI (BR-01: phải đạt học phần tiên quyết trước khi đăng ký).'
        ),
        h(
          'div',
          { className: 'flex items-center gap-space-xs' },
          typeof onOpenFullTree === 'function'
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: onOpenFullTree,
                  className:
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-paper hover:bg-canvas text-ink font-body-medium text-body-medium border border-hairline transition-colors shadow-sm'
                },
                icon('open_in_new', 'text-[18px]'),
                h('span', null, 'Mở Cây môn học đầy đủ')
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              onClick: onClose,
              className:
                'px-5 py-2 rounded-full bg-canvas hover:bg-surface-variant text-ink font-body-medium text-body-medium border border-hairline transition-colors'
            },
            'Đóng'
          )
        )
      )
    )
  );
}

export default CurriculumTreeModal;
