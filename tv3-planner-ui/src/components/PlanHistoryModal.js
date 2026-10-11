import React, { useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { plannerStore, PLAN_STATUSES } from '../services/plannerStore.js';

const h = React.createElement;

/**
 * Modal Quản lý & Lịch sử các phiên bản Kế hoạch học tập (Plan History) — TV3
 * Dựa trên mẫu thiết kế prototype `lich_su_ke_hoach/code.html` (bản rút gọn của trang /planner/history).
 *
 * Tính năng chính:
 * - Hiển thị danh sách các phiên bản: Bản nháp (DRAFT), Đang áp dụng (ACTIVE), Lưu trữ (ARCHIVED).
 * - Hành động "Mở lại" (Restore/Re-open): Khôi phục bản lưu trữ thành bản nháp mới để tiếp tục chỉnh sửa.
 * - Hành động "Kích hoạt áp dụng": Chuyển bản kế hoạch sang ACTIVE.
 * - So sánh nhanh: Bản đang áp dụng vs Bản nháp.
 * - Liên kết sang trang Lịch sử kế hoạch đầy đủ.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.ui - Bộ UI chung từ TV2
 * @param {Function} [props.onPlanChanged] - Callback khi trạng thái kế hoạch thay đổi
 */

const FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: PLAN_STATUSES.ACTIVE, label: 'Đang áp dụng' },
  { key: PLAN_STATUSES.DRAFT, label: 'Bản nháp' },
  { key: PLAN_STATUSES.ARCHIVED, label: 'Lưu trữ' }
];

const BADGE = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label text-label';
const BTN_SOFT = 'inline-flex items-center gap-1 px-3.5 py-1.5 bg-canvas hover:bg-surface-container text-ink rounded-full font-label text-label transition-colors';
const BTN_INK = 'inline-flex items-center gap-1 px-3.5 py-1.5 bg-ink hover:bg-ink-soft text-paper rounded-full font-label text-label transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed';

const icon = (name, className = 'text-[14px]') =>
  h('span', { className: `material-symbols-outlined ${className}`, 'aria-hidden': 'true' }, name);

const statusBadge = (item) => {
  if (item.status === PLAN_STATUSES.ACTIVE) {
    return h('span', { className: `${BADGE} bg-ink text-paper font-medium` }, h('span', { className: 'w-1.5 h-1.5 rounded-full bg-emerald-400' }), 'Đang áp dụng');
  }
  if (item.status === PLAN_STATUSES.ARCHIVED) {
    return h('span', { className: `${BADGE} bg-canvas text-mid-gray font-medium` }, icon('archive', 'text-[13px]'), 'Lưu trữ');
  }
  if (item.status === PLAN_STATUSES.VALIDATED) {
    return h('span', { className: `${BADGE} bg-canvas text-ink` }, icon('verified', 'text-[13px] text-ink'), 'Đã kiểm duyệt');
  }
  return h('span', { className: `${BADGE} bg-canvas text-ink font-medium` }, 'Bản nháp (Draft)');
};

export function PlanHistoryModal({ isOpen, onClose, ui, onPlanChanged }) {
  const { Modal } = ui || {};
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  const [toast, setToast] = useState(null); // { message, ok, violations }
  const inRouter = useInRouterContext();

  if (!isOpen) return null;

  const history = plannerStore.getHistory();
  const currentPlan = plannerStore.getPlan();
  const activeEntry = plannerStore.getActiveEntry();
  const currentPlanCredits = (currentPlan.semesters || []).reduce((sum, s) => sum + (Number(s.totalCredits) || 0), 0);

  const countOf = (key) => (key === 'ALL' ? history.length : history.filter((item) => item.status === key).length);
  const filteredHistory = history.filter((item) => filterTab === 'ALL' || item.status === filterTab);

  const showToast = (res) => {
    setToast({ message: res.message, ok: res.success !== false, violations: res.violations || [] });
    setTimeout(() => setToast(null), res.success !== false ? 3000 : 6000);
  };

  const handleRestore = (planId) => {
    const res = plannerStore.restorePlan(planId);
    showToast(res);
    if (typeof onPlanChanged === 'function') {
      onPlanChanged();
    }
  };

  const handleActivate = (planId) => {
    // F23-002: kích hoạt đúng bản được chọn trong lịch sử
    const res = plannerStore.activatePlan(planId);
    showToast(res);
    if (typeof onPlanChanged === 'function') {
      onPlanChanged();
    }
  };

  const summaryCard = ({ title, chip, chipInk, line }) =>
    h(
      'div',
      { className: 'rounded-[16px] bg-surface-alt p-space-md' },
      h(
        'div',
        { className: 'flex items-center justify-between gap-2' },
        h('strong', { className: 'font-body-medium text-body-medium text-ink' }, title),
        h('span', { className: `${BADGE} ${chipInk ? 'bg-ink text-paper' : 'bg-paper text-ink'}` }, chip)
      ),
      h('p', { className: 'font-caption text-caption text-mid-gray mt-1' }, line)
    );

  const content = h(
    'div',
    { className: 'flex flex-col gap-space-md font-body text-body text-ink' },

    // Thông báo nội bộ modal (thành công / bị từ chối kèm lý do vi phạm)
    toast
      ? h(
          'div',
          {
            role: toast.ok ? 'status' : 'alert',
            className: `rounded-[16px] border p-space-md flex items-start gap-space-sm ${toast.ok ? 'bg-ink text-paper border-ink' : 'bg-paper border-ember/30'}`
          },
          icon(toast.ok ? 'check_circle' : 'block', `text-[18px] ${toast.ok ? 'text-paper' : 'text-ember'}`),
          h(
            'div',
            { className: 'min-w-0 space-y-1' },
            h('p', { className: `font-body-medium text-body-medium ${toast.ok ? 'text-paper' : 'text-ink'}` }, toast.message),
            toast.violations.map((v) => h('p', { key: v, className: 'font-caption text-caption text-ember' }, `• ${v}`))
          )
        )
      : null,

    // Khối so sánh nhanh: Bản đang áp dụng vs Bản đang mở trên Planner
    h(
      'div',
      { className: 'bg-paper rounded-[24px] border border-hairline p-space-md space-y-space-sm' },
      h(
        'div',
        { className: 'flex items-center gap-space-sm' },
        h('div', { className: 'w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-ink shrink-0' }, icon('difference', 'text-[18px]')),
        h(
          'div',
          null,
          h('p', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, 'So sánh nhanh: Bản đang áp dụng vs Bản nháp mới'),
          h('p', { className: 'font-caption text-caption text-mid-gray' }, 'Cơ chế bảo toàn dữ liệu bất biến: Mỗi lần kích hoạt bản mới sẽ tự động lưu trữ bản cũ')
        )
      ),
      h(
        'div',
        { className: 'grid grid-cols-1 sm:grid-cols-2 gap-space-sm' },
        summaryCard({
          title: activeEntry ? `Bản ${activeEntry.version} (ACTIVE)` : 'Chưa có bản ACTIVE',
          chip: 'Đang theo dõi',
          chipInk: true,
          line: activeEntry
            ? `${activeEntry.totalSemesters} học kỳ · ${activeEntry.totalCredits} tín chỉ · CPA dự phóng ${activeEntry.projectedCpa}`
            : 'Chưa kích hoạt kế hoạch nào'
        }),
        summaryCard({
          title: `Bản ${currentPlan.version} (${currentPlan.status})`,
          chip: currentPlan.status === PLAN_STATUSES.ACTIVE ? 'Chính thức' : currentPlan.status === PLAN_STATUSES.VALIDATED ? 'Đã thẩm định' : 'Bản nháp',
          chipInk: false,
          line: `${(currentPlan.semesters || []).length} học kỳ · ${currentPlanCredits} tín chỉ · CPA dự phóng ${currentPlan.projectedCpa}`
        })
      )
    ),

    // Bộ lọc trạng thái
    h(
      'div',
      { className: 'flex items-center gap-1.5 flex-wrap', role: 'tablist' },
      FILTER_TABS.map((tab) =>
        h(
          'button',
          {
            key: tab.key,
            type: 'button',
            role: 'tab',
            'aria-selected': filterTab === tab.key,
            onClick: () => setFilterTab(tab.key),
            className: `px-3.5 py-1.5 rounded-full font-label text-label transition-colors shadow-sm border ${
              filterTab === tab.key ? 'bg-ink text-paper border-ink' : 'bg-paper text-mid-gray hover:text-ink border-hairline'
            }`
          },
          `${tab.label} (${countOf(tab.key)})`
        )
      )
    ),

    // Danh sách các phiên bản
    h(
      'div',
      { className: 'flex flex-col gap-space-sm max-h-[340px] overflow-y-auto pr-1' },
      filteredHistory.length === 0
        ? h('div', { className: 'rounded-[16px] bg-surface-alt p-space-md text-center font-body text-body text-mid-gray' }, 'Không có phiên bản nào trong mục này.')
        : filteredHistory.map((item) => {
            const isCurrentActive = item.status === PLAN_STATUSES.ACTIVE;
            const isDraft = item.status === PLAN_STATUSES.DRAFT;
            // F23-005: bản nháp đang mở trên Planner chỉ được kích hoạt sau khi đạt VALIDATED
            const isOpenInPlanner = item.planId === currentPlan.planId;
            const activateBlocked = isOpenInPlanner && currentPlan.status !== PLAN_STATUSES.VALIDATED;

            return h(
              'div',
              {
                key: item.planId,
                className: `rounded-[16px] bg-paper p-space-md flex flex-wrap items-center justify-between gap-space-sm border ${
                  isCurrentActive ? 'border-ink' : 'border-hairline'
                } ${item.status === PLAN_STATUSES.ARCHIVED ? 'opacity-85 hover:opacity-100' : ''}`
              },
              h(
                'div',
                { className: 'min-w-[220px] flex-1 space-y-1' },
                h(
                  'div',
                  { className: 'flex flex-wrap items-center gap-2' },
                  h('span', { className: 'font-body-medium text-body-medium text-ink font-semibold' }, item.name),
                  statusBadge(item)
                ),
                h(
                  'p',
                  { className: 'font-caption text-caption text-mid-gray' },
                  `Phiên bản: ${item.version} · Cập nhật: ${item.updatedAt} · ${item.totalSemesters} kỳ (${item.totalCredits} TC) · CPA dự phóng: ${item.projectedCpa}`
                ),
                item.note
                  ? h('p', { className: 'flex items-center gap-1 font-caption text-caption text-mid-gray' }, icon('push_pin', 'text-[13px]'), item.note)
                  : null
              ),
              h(
                'div',
                { className: 'flex items-center gap-1.5 shrink-0' },
                // Nút "Mở lại" (Restore) cho các bản lưu trữ cũ hoặc bản khác
                !isCurrentActive
                  ? h('button', { type: 'button', className: BTN_SOFT, onClick: () => handleRestore(item.planId) }, icon('restore'), 'Mở lại / Chỉnh sửa')
                  : null,
                // Nút kích hoạt nếu là bản nháp
                isDraft
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: BTN_INK,
                        disabled: activateBlocked,
                        title: activateBlocked ? 'Bản nháp đang mở cần "Kiểm tra điều kiện" (VALIDATED) trước khi kích hoạt' : undefined,
                        onClick: () => handleActivate(item.planId)
                      },
                      icon('check'),
                      'Kích hoạt áp dụng'
                    )
                  : null,
                isCurrentActive
                  ? h('span', { className: 'inline-flex items-center gap-1 font-label text-label text-ink' }, icon('check_circle', 'text-[15px]'), 'Đang theo dõi')
                  : null
              )
            );
          })
    )
  );

  const footer = h(
    'div',
    { className: 'flex items-center justify-between gap-space-sm w-full' },
    inRouter
      ? h(
          Link,
          {
            to: '/planner/history',
            onClick: onClose,
            className: 'inline-flex items-center gap-1 font-label text-label text-mid-gray hover:text-ink transition-colors'
          },
          icon('history'),
          'Xem trang Lịch sử kế hoạch đầy đủ'
        )
      : h('span'),
    h('button', { type: 'button', className: BTN_SOFT, onClick: onClose }, 'Đóng')
  );

  if (Modal) {
    return h(
      Modal,
      {
        isOpen,
        onClose,
        title: 'Lịch sử & Quản lý các phiên bản Kế hoạch học tập',
        subtitle: 'Bảo toàn dữ liệu bất biến: Quản lý các bản nháp, bản đang áp dụng và khôi phục kế hoạch lưu trữ.',
        size: 'lg',
        footer
      },
      content
    );
  }

  // Fallback nếu modal không có
  return h(
    'div',
    {
      className: 'fixed inset-0 z-[1000] bg-ink/50 flex items-center justify-center p-space-md',
      role: 'dialog',
      'aria-modal': 'true'
    },
    h(
      'div',
      { className: 'bg-paper rounded-[24px] p-space-xl w-full max-w-[720px] max-h-[90vh] overflow-y-auto space-y-space-md shadow-xl' },
      h('h3', { className: 'font-subheading text-subheading text-ink font-semibold tracking-tight' }, 'Lịch sử phiên bản kế hoạch'),
      content,
      footer
    )
  );
}

export default PlanHistoryModal;
