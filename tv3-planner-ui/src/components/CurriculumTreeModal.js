import React from 'react';

/**
 * Modal Tra cứu Cây môn học & Sơ đồ Tiên quyết (Curriculum Tree Explorer) — TV3
 * Dựa trên prototype `cay_mon_hoc/code.html`.
 *
 * Thực hiện yêu cầu nghiệp vụ:
 * "AI/What-if/Audit cùng về một Planner; xem tree là tùy chọn."
 * -> Cung cấp bảng tra cứu chuỗi môn học và điều kiện tiên quyết trực tiếp ngay trong Planner
 *    mà không làm đứt đoạn quy trình lập kế hoạch.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.ui - Bộ UI chung từ TV2
 */
export function CurriculumTreeModal({ isOpen, onClose, ui }) {
  const { Modal, Button, Card } = ui || {};

  if (!isOpen) return null;

  // Chuỗi quan hệ tiên quyết cốt lõi ngành CNTT / KTPM HaUI
  const prerequisiteChains = [
    {
      chainName: 'Chuỗi 1: Cấu trúc dữ liệu & Thuật toán',
      steps: [
        { code: 'MATH1002', name: 'Toán rời rạc (3 TC)', status: 'FAILED', note: 'Nợ môn F - Nút thắt cần gỡ ngay' },
        { code: 'IT6001', name: 'Cấu trúc dữ liệu & GT (4 TC)', status: 'BLOCKED', note: 'Chờ tiên quyết MATH1002' },
        { code: 'IT6005', name: 'PT & Thiết kế thuật toán (3 TC)', status: 'LOCKED', note: 'Chờ hoàn thành IT6001' }
      ]
    },
    {
      chainName: 'Chuỗi 2: Kỹ thuật phần mềm & Khóa luận tốt nghiệp',
      steps: [
        { code: 'IT2001', name: 'Lập trình HĐT Java (4 TC)', status: 'PASSED', note: 'Đã hoàn thành (Điểm D+ - Cần cải thiện)' },
        { code: 'IT3005', name: 'Công nghệ phần mềm (3 TC)', status: 'PASSED', note: 'Đã hoàn thành (Điểm B)' },
        { code: 'IT6080', name: 'Đồ án chuyên ngành KTPM (4 TC)', status: 'PLANNED', note: 'Dự kiến đăng ký Kỳ 8' },
        { code: 'IT6090', name: 'Khóa luận tốt nghiệp (6 TC)', status: 'LOCKED', note: 'Cần hoàn thành Đồ án & ≥ 115 TC' }
      ]
    },
    {
      chainName: 'Chuỗi 3: Cơ sở dữ liệu & Ứng dụng',
      steps: [
        { code: 'IT2002', name: 'Cơ sở dữ liệu (3 TC)', status: 'PASSED', note: 'Đã hoàn thành (Điểm B+)' },
        { code: 'IT4001', name: 'Hệ QTCSDL nâng cao (3 TC)', status: 'PLANNED', note: 'Dự kiến đăng ký Kỳ 7' },
        { code: 'IT6010', name: 'Phát triển ứng dụng Web (3 TC)', status: 'PLANNED', note: 'Tự chọn chuyên ngành Kỳ 7' }
      ]
    }
  ];

  const content = React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
    React.createElement(
      'p',
      { style: { fontSize: '13px', color: '#64748b', margin: 0 } },
      'Sơ đồ hiển thị quan hệ ràng buộc giữa các học phần bắt buộc và tiên quyết theo quy chế HaUI. Dùng để tra cứu nhanh khi bạn cân nhắc thêm/bớt môn trong Kế hoạch học tập.'
    ),
    prerequisiteChains.map((chain, cIdx) =>
      Card
        ? React.createElement(
            Card,
            {
              key: cIdx,
              title: chain.chainName,
              variant: 'default',
              padding: 'sm'
            },
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' } },
              chain.steps.map((step, sIdx) => {
                const isPassed = step.status === 'PASSED';
                const isFailed = step.status === 'FAILED';
                const isPlanned = step.status === 'PLANNED';

                const badgeBg = isPassed
                  ? '#dcfce7'
                  : isFailed
                    ? '#fee2e2'
                    : isPlanned
                      ? '#e0f2fe'
                      : '#f1f5f9';
                const badgeColor = isPassed
                  ? '#15803d'
                  : isFailed
                    ? '#b91c1c'
                    : isPlanned
                      ? '#0369a1'
                      : '#64748b';

                return React.createElement(
                  React.Fragment,
                  { key: step.code },
                  React.createElement(
                    'div',
                    {
                      style: {
                        padding: '8px 12px',
                        borderRadius: '12px',
                        background: 'var(--color-surface-alt, #fafafa)',
                        border: '1px solid var(--color-hairline, #e5e5e5)',
                        minWidth: '160px'
                      }
                    },
                    React.createElement(
                      'div',
                      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                      React.createElement('strong', { style: { fontSize: '12px', color: '#0a0a0a' } }, step.code),
                      React.createElement(
                        'span',
                        {
                          style: {
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: badgeBg,
                            color: badgeColor
                          }
                        },
                        isPassed ? '✓ Đã học' : isFailed ? '✕ Nợ môn' : isPlanned ? 'Đề xuất' : 'Khóa'
                      )
                    ),
                    React.createElement('div', { style: { fontSize: '11px', color: '#0f172a', marginTop: '2px', fontWeight: 500 } }, step.name),
                    React.createElement('div', { style: { fontSize: '10px', color: '#64748b', marginTop: '2px' } }, step.note)
                  ),
                  sIdx < chain.steps.length - 1
                    ? React.createElement('span', { style: { color: '#94a3b8', fontSize: '16px', fontWeight: 'bold' } }, '→')
                    : null
                );
              })
            )
          )
        : null
    )
  );

  if (Modal) {
    return React.createElement(
      Modal,
      {
        isOpen,
        onClose,
        title: 'Cây môn học & Sơ đồ Tiên quyết (Tra cứu tùy chọn)',
        subtitle: 'Đối chiếu đồ thị học phần tiên quyết mà không ảnh hưởng tới tiến trình chỉnh sửa kế hoạch.',
        size: 'lg',
        footer: React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
          Button
            ? React.createElement(Button, { variant: 'secondary', size: 'sm', onClick: onClose }, 'Đóng')
            : React.createElement('button', { type: 'button', onClick: onClose }, 'Đóng')
        )
      },
      content
    );
  }

  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }
    },
    React.createElement(
      'div',
      {
        style: {
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }
      },
      React.createElement('h3', { style: { margin: 0, fontSize: '18px', fontWeight: 700 } }, 'Cây môn học & Tiên quyết'),
      content,
      React.createElement(
        'div',
        { style: { marginTop: '16px', textAlign: 'right' } },
        React.createElement('button', { onClick: onClose }, 'Đóng')
      )
    )
  );
}

export default CurriculumTreeModal;
