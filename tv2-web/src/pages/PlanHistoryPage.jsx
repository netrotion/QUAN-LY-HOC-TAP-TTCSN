import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient.js';

/**
 * PlanHistoryPage — /plan-history route
 * Matches prototype: plan_history/code.html
 * Shows version history of study plans with filter, compare, and restore.
 */

const FILTER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang dùng' },
  { key: 'draft', label: 'Bản nháp' },
  { key: 'verified', label: 'Đã xác minh' },
  { key: 'archived', label: 'Lưu trữ' }
];

const MOCK_HISTORY = [
  { id: 'plan-v2.4', name: 'Kế hoạch HK7-8 (v2.4)', version: 'v2.4', status: 'active', semesters: 2, credits: 37, cpa: 3.31, date: '15/10/2026 22:00', note: 'Đã tối ưu sau mô phỏng What-if' },
  { id: 'plan-v2.3', name: 'Kế hoạch HK7-8 (v2.3)', version: 'v2.3', status: 'draft', semesters: 2, credits: 37, cpa: 3.28, date: '14/10/2026 18:30', note: 'Nháp thêm môn tự chọn' },
  { id: 'plan-v2.2', name: 'Kế hoạch HK7-8 (v2.2)', version: 'v2.2', status: 'verified', semesters: 2, credits: 35, cpa: 3.25, date: '12/10/2026 10:15', note: '' },
  { id: 'plan-v2.1', name: 'Kế hoạch HK7-8 (v2.1)', version: 'v2.1', status: 'archived', semesters: 2, credits: 34, cpa: 3.20, date: '10/10/2026 09:00', note: 'Phiên bản đầu tiên' },
  { id: 'plan-v1.0', name: 'Kế hoạch HK5-6 (v1.0)', version: 'v1.0', status: 'archived', semesters: 2, credits: 34, cpa: 3.18, date: '01/03/2025 14:00', note: 'Kế hoạch cũ đã hoàn thành' }
];

const STATUS_CONFIG = {
  active: { label: 'Đang dùng', bg: 'var(--color-ink)', color: 'var(--color-paper)' },
  draft: { label: 'Bản nháp', bg: 'var(--color-canvas)', color: 'var(--color-ink)' },
  verified: { label: 'Đã xác minh', bg: 'var(--color-canvas)', color: 'var(--color-ink)' },
  archived: { label: 'Lưu trữ', bg: 'var(--color-canvas)', color: 'var(--color-mid-gray)' }
};

export function PlanHistoryPage() {
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const filtered = filter === 'all' ? MOCK_HISTORY : MOCK_HISTORY.filter(h => h.status === filter);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const statCounts = {
    active: MOCK_HISTORY.filter(h => h.status === 'active').length,
    draft: MOCK_HISTORY.filter(h => h.status === 'draft').length,
    verified: MOCK_HISTORY.filter(h => h.status === 'verified').length,
    archived: MOCK_HISTORY.filter(h => h.status === 'archived').length
  };

  const s = { // shared inline styles
    card: { background: 'var(--color-paper)', borderRadius: '24px', padding: '20px', boxShadow: '0 0 0 1px rgba(23,23,23,0.05), 0 1px 3px rgba(0,0,0,0.08)' },
    pill: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500 },
    section: { display: 'flex', flexDirection: 'column', gap: '20px' },
    label: { fontSize: '12px', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }
  };

  return (
    <div className="haui-page-container">
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-ink)' }} />
          <span style={s.label}>Quản lý phiên bản kế hoạch</span>
        </div>
        <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--color-ink)' }}>Lịch sử kế hoạch</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-mid-gray)', lineHeight: 1.5 }}>
          Theo dõi các phiên bản kế hoạch, so sánh và khôi phục khi cần thiết
        </p>
      </div>

      {/* 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        {Object.entries(statCounts).map(([key, count]) => (
          <div key={key} style={{ ...s.card, padding: '16px', cursor: 'pointer' }} onClick={() => setFilter(key)}>
            <span style={{ ...s.label, fontSize: '11px' }}>{STATUS_CONFIG[key].label}</span>
            <div style={{ fontSize: '30px', fontWeight: 600, marginTop: '4px' }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Quick compare */}
      {MOCK_HISTORY.length >= 2 && (
        <div style={s.card}>
          <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 600 }}>So sánh nhanh</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {MOCK_HISTORY.slice(0, 2).map(h => (
              <div key={h.id} style={{ background: 'var(--color-canvas)', borderRadius: '18px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{h.version}</span>
                  <span style={{ ...s.pill, background: STATUS_CONFIG[h.status].bg, color: STATUS_CONFIG[h.status].color }}>{STATUS_CONFIG[h.status].label}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-mid-gray)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>{h.semesters} kỳ · {h.credits} TC</span>
                  <span>CPA dự kiến: {h.cpa}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              ...s.pill,
              background: filter === tab.key ? 'var(--color-ink)' : 'var(--color-canvas)',
              color: filter === tab.key ? 'var(--color-paper)' : 'var(--color-mid-gray)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms',
              padding: '6px 14px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map(h => (
          <div key={h.id} style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{h.name}</span>
                <span style={{ ...s.pill, background: STATUS_CONFIG[h.status].bg, color: STATUS_CONFIG[h.status].color, fontSize: '11px' }}>
                  {STATUS_CONFIG[h.status].label}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>{h.semesters} kỳ · {h.credits} TC · CPA {h.cpa}</span>
                <span>{h.date}</span>
              </div>
              {h.note && <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)', marginTop: '4px', fontStyle: 'italic' }}>{h.note}</div>}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {h.status === 'active' && (
                <span style={{ ...s.pill, background: 'var(--color-ink)', color: 'var(--color-paper)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                  Hiện tại
                </span>
              )}
              {h.status === 'archived' && (
                <button
                  style={{ ...s.pill, background: 'var(--color-canvas)', color: 'var(--color-ink)', border: 'none', cursor: 'pointer' }}
                  onClick={() => showToast(`Đã khôi phục ${h.name}`)}
                >
                  Khôi phục
                </button>
              )}
              {h.status === 'draft' && (
                <button
                  style={{ ...s.pill, background: 'var(--color-ink)', color: 'var(--color-paper)', border: 'none', cursor: 'pointer' }}
                  onClick={() => showToast(`Đã kích hoạt ${h.name}`)}
                >
                  Kích hoạt
                </button>
              )}
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', color: 'var(--color-mid-gray)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_horiz</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', background: 'var(--color-ink)', color: 'var(--color-paper)',
          padding: '12px 20px', borderRadius: '9999px', fontSize: '14px', fontWeight: 500,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
          {toast}
        </div>
      )}
    </div>
  );
}

export default PlanHistoryPage;
