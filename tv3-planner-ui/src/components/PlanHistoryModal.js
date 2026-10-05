import React, { useState } from 'react';
import { plannerStore, PLAN_STATUSES } from '../services/plannerStore.js';

/**
 * Modal Quản lý & Lịch sử các phiên bản Kế hoạch học tập (Plan History) — TV3
 * Dựa trên mẫu thiết kế prototype `lich_su_ke_hoach/code.html`.
 *
 * Tính năng chính:
 * - Hiển thị danh sách các phiên bản: Bản nháp (DRAFT), Đang áp dụng (ACTIVE), Lưu trữ (ARCHIVED).
 * - Hành động "Mở lại" (Restore/Re-open): Khôi phục bản lưu trữ thành bản nháp mới để tiếp tục chỉnh sửa.
 * - Hành động "Kích hoạt áp dụng": Chuyển bản kế hoạch sang ACTIVE.
 * - So sánh nhanh: Bản đang áp dụng vs Bản nháp.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.ui - Bộ UI chung từ TV2
 * @param {Function} [props.onPlanChanged] - Callback khi trạng thái kế hoạch thay đổi
 */
export function PlanHistoryModal({ isOpen, onClose, ui, onPlanChanged }) {
  const { Modal, Button, Card } = ui || {};
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  const [toastMsg, setToastMsg] = useState('');

  if (!isOpen) return null;

  const history = plannerStore.getHistory();
  const currentPlan = plannerStore.getPlan();

  const filteredHistory = history.filter((item) => {
    if (filterTab === 'ACTIVE') return item.status === PLAN_STATUSES.ACTIVE;
    if (filterTab === 'DRAFT') return item.status === PLAN_STATUSES.DRAFT;
    if (filterTab === 'ARCHIVED') return item.status === PLAN_STATUSES.ARCHIVED;
    return true;
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleRestore = (planId) => {
    const res = plannerStore.restorePlan(planId);
    showToast(res.message);
    if (typeof onPlanChanged === 'function') {
      onPlanChanged();
    }
  };

  const handleActivate = (planId) => {
    const res = plannerStore.activatePlan();
    showToast(res.message);
    if (typeof onPlanChanged === 'function') {
      onPlanChanged();
    }
  };

  const content = React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },

    // Thông báo Toast nội bộ modal nếu có
    toastMsg
      ? React.createElement(
          'div',
          {
            style: {
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#0a0a0a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }
          },
          React.createElement('span', null, `✓ ${toastMsg}`)
        )
      : null,

    // Khối so sánh nhanh: Bản đang áp dụng vs Bản nháp
    Card
      ? React.createElement(
          Card,
          {
            title: 'So sánh nhanh: Bản đang áp dụng vs Bản nháp mới',
            subtitle: 'Cơ chế bảo toàn dữ liệu bất biến: Mỗi lần kích hoạt bản mới sẽ tự động lưu trữ bản cũ',
            variant: 'default',
            padding: 'sm'
          },
          React.createElement(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
                marginTop: '8px'
              }
            },
            React.createElement(
              'div',
              {
                style: {
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--color-surface-alt, #fafafa)',
                  border: '1px solid var(--color-hairline, #e5e5e5)'
                }
              },
              React.createElement(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement('strong', { style: { fontSize: '13px', color: '#0a0a0a' } }, 'Bản v2.3 (ACTIVE)'),
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: '11px',
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }
                  },
                  'Đang theo dõi'
                )
              ),
              React.createElement(
                'p',
                { style: { margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' } },
                '2 học kỳ chính · 33 tín chỉ · CPA dự phóng 3.25'
              )
            ),
            React.createElement(
              'div',
              {
                style: {
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'var(--color-surface-alt, #fafafa)',
                  border: '1px solid var(--color-hairline, #e5e5e5)'
                }
              },
              React.createElement(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement('strong', { style: { fontSize: '13px', color: '#0a0a0a' } }, `Bản ${currentPlan.version} (${currentPlan.status})`),
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: '11px',
                      background: currentPlan.status === PLAN_STATUSES.VALIDATED ? '#dcfce7' : '#f1f5f9',
                      color: currentPlan.status === PLAN_STATUSES.VALIDATED ? '#15803d' : '#475569',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }
                  },
                  currentPlan.status === PLAN_STATUSES.ACTIVE ? 'Chính thức' : 'Bản nháp'
                )
              ),
              React.createElement(
                'p',
                { style: { margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' } },
                '3 học kỳ (có kỳ hè) · 37 tín chỉ · CPA dự phóng 3.32'
              )
            )
          )
        )
      : null,

    // Bộ lọc Tab trạng thái
    React.createElement(
      'div',
      { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
      ['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'].map((tab) =>
        React.createElement(
          'button',
          {
            key: tab,
            type: 'button',
            onClick: () => setFilterTab(tab),
            style: {
              padding: '4px 12px',
              borderRadius: '18px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid var(--color-hairline, #e5e5e5)',
              background: filterTab === tab ? '#0a0a0a' : '#ffffff',
              color: filterTab === tab ? '#ffffff' : '#0a0a0a',
              transition: 'all 0.15s ease'
            }
          },
          tab === 'ALL'
            ? `Tất cả (${history.length})`
            : tab === 'ACTIVE'
              ? 'Đang áp dụng (1)'
              : tab === 'DRAFT'
                ? 'Bản nháp'
                : 'Lưu trữ (ARCHIVED)'
        )
      )
    ),

    // Danh sách các phiên bản
    React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' } },
      filteredHistory.map((item) => {
        const isCurrentActive = item.status === PLAN_STATUSES.ACTIVE;
        const isDraft = item.status === PLAN_STATUSES.DRAFT;

        return React.createElement(
          'div',
          {
            key: item.planId,
            style: {
              padding: '12px 16px',
              borderRadius: '16px',
              background: '#ffffff',
              border: isCurrentActive ? '1.5px solid #0a0a0a' : '1px solid var(--color-hairline, #e5e5e5)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }
          },
          React.createElement(
            'div',
            { style: { minWidth: '220px' } },
            React.createElement(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              React.createElement('span', { style: { fontWeight: 700, fontSize: '14px', color: '#0a0a0a' } }, item.name),
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isCurrentActive ? '#0a0a0a' : isDraft ? '#fef3c7' : '#f1f5f9',
                    color: isCurrentActive ? '#ffffff' : isDraft ? '#b45309' : '#475569'
                  }
                },
                item.badge || item.status
              )
            ),
            React.createElement(
              'div',
              { style: { fontSize: '12px', color: '#64748b', marginTop: '4px' } },
              `Phiên bản: ${item.version} · Cập nhật: ${item.updatedAt} · ${item.totalSemesters} kỳ (${item.totalCredits} TC) · CPA dự phóng: ${item.projectedCpa}`
            ),
            item.note
              ? React.createElement('div', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontStyle: 'italic' } }, `📌 ${item.note}`)
              : null
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
            // Nút "Mở lại" (Restore) cho các bản lưu trữ cũ hoặc bản khác
            !isCurrentActive && Button
              ? React.createElement(
                  Button,
                  {
                    variant: 'secondary',
                    size: 'sm',
                    onClick: () => handleRestore(item.planId)
                  },
                  'Mở lại / Chỉnh sửa'
                )
              : null,
            // Nút kích hoạt nếu là bản nháp
            isDraft && Button
              ? React.createElement(
                  Button,
                  {
                    variant: 'primary',
                    size: 'sm',
                    onClick: () => handleActivate(item.planId)
                  },
                  'Kích hoạt áp dụng'
                )
              : null,
            isCurrentActive
              ? React.createElement(
                  'span',
                  { style: { fontSize: '12px', fontWeight: 600, color: '#16a34a' } },
                  '✓ Đang theo dõi'
                )
              : null
          )
        );
      })
    )
  );

  if (Modal) {
    return React.createElement(
      Modal,
      {
        isOpen,
        onClose,
        title: 'Lịch sử & Quản lý các phiên bản Kế hoạch học tập',
        subtitle: 'Bảo toàn dữ liệu bất biến: Quản lý các bản nháp, bản đang áp dụng và khôi phục kế hoạch lưu trữ.',
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

  // Fallback nếu modal không có
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
      React.createElement('h3', { style: { margin: 0, fontSize: '18px', fontWeight: 700 } }, 'Lịch sử phiên bản kế hoạch'),
      content,
      React.createElement(
        'div',
        { style: { marginTop: '16px', textAlign: 'right' } },
        React.createElement('button', { onClick: onClose }, 'Đóng')
      )
    )
  );
}

export default PlanHistoryModal;
