import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient.js';
import { plannerStore, PLAN_STATUSES } from '@haui/planner-ui';

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
  ACTIVE: { label: 'Đang dùng', bg: 'var(--color-ink)', color: 'var(--color-paper)' },
  DRAFT: { label: 'Bản nháp', bg: 'var(--color-canvas)', color: 'var(--color-ink)' },
  VALIDATED: { label: 'Đã xác minh', bg: 'var(--color-canvas)', color: 'var(--color-ink)' },
  ARCHIVED: { label: 'Lưu trữ', bg: 'var(--color-canvas)', color: 'var(--color-mid-gray)' },
  active: { label: 'Đang dùng', bg: 'var(--color-ink)', color: 'var(--color-paper)' },
  draft: { label: 'Bản nháp', bg: 'var(--color-canvas)', color: 'var(--color-ink)' },
  verified: { label: 'Đã xác minh', bg: 'var(--color-canvas)', color: 'var(--color-ink)' },
  archived: { label: 'Lưu trữ', bg: 'var(--color-canvas)', color: 'var(--color-mid-gray)' }
};

export function PlanHistoryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const sessionStudent = api.getConfig().sessionStudent;
  const isStudentEmpty = Boolean(
    sessionStudent &&
    (sessionStudent.hasTranscript === false || sessionStudent.id === 'empty' || sessionStudent.studentId === 'std-2026-empty')
  );

  const [historyList, setHistoryList] = useState(() => (isStudentEmpty ? [] : plannerStore.getHistory() || []));

  useEffect(() => {
    return plannerStore.subscribe((newState) => {
      setHistoryList(isStudentEmpty ? [] : newState.history || []);
    });
  }, [isStudentEmpty]);

  const filtered = useMemo(() => {
    if (filter === 'all') return historyList;
    return historyList.filter((h) => {
      const st = String(h.status || '').toUpperCase();
      if (filter === 'active') return st === 'ACTIVE';
      if (filter === 'draft') return st === 'DRAFT';
      if (filter === 'verified') return st === 'VALIDATED';
      if (filter === 'archived') return st === 'ARCHIVED';
      return false;
    });
  }, [filter, historyList]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const statCounts = useMemo(() => ({
    active: historyList.filter((h) => String(h.status).toUpperCase() === 'ACTIVE').length,
    draft: historyList.filter((h) => String(h.status).toUpperCase() === 'DRAFT').length,
    verified: historyList.filter((h) => String(h.status).toUpperCase() === 'VALIDATED').length,
    archived: historyList.filter((h) => String(h.status).toUpperCase() === 'ARCHIVED').length
  }), [historyList]);

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

      {historyList.length === 0 ? (
        <div style={{ ...s.card, padding: '48px 24px', textAlign: 'center', margin: '16px auto', maxWidth: '640px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-mid-gray)', marginBottom: '4px' }}>folder_open</span>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>Chưa có lịch sử phiên bản kế hoạch</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-mid-gray)', margin: '0 0 16px', maxWidth: '480px', lineHeight: 1.6 }}>
            {isStudentEmpty
              ? 'Hồ sơ của bạn chưa có dữ liệu bảng điểm và chưa lưu bản kế hoạch nào. Vui lòng nạp bảng điểm hoặc tạo kế hoạch mới.'
              : 'Bạn chưa lưu bản nháp hoặc kích hoạt kế hoạch nào trên hệ thống. Hãy truy cập mục Kế hoạch học tập để tạo và lưu kế hoạch.'}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {isStudentEmpty && (
              <button type="button" className="haui-pill-btn-paper" onClick={() => navigate('/transcript')}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload_file</span>
                <span>Nạp bảng điểm ngay</span>
              </button>
            )}
            <button type="button" className="haui-pill-btn-dark" onClick={() => navigate('/planner')}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_add_on</span>
              <span>Lập kế hoạch học tập</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 4 stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            {Object.entries(statCounts).map(([key, count]) => {
              const cfg = STATUS_CONFIG[key] || { label: key };
              return (
                <div key={key} style={{ ...s.card, padding: '16px', cursor: 'pointer' }} onClick={() => setFilter(key)}>
                  <span style={{ ...s.label, fontSize: '11px' }}>{cfg.label}</span>
                  <div style={{ fontSize: '30px', fontWeight: 600, marginTop: '4px' }}>{count}</div>
                </div>
              );
            })}
          </div>

          {/* Quick compare */}
          {historyList.length >= 2 && (
            <div style={s.card}>
              <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 600 }}>So sánh nhanh</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {historyList.slice(0, 2).map((h) => {
                  const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.draft;
                  return (
                    <div key={h.planId || h.id} style={{ background: 'var(--color-canvas)', borderRadius: '18px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{h.version || 'v1.0'}</span>
                        <span style={{ ...s.pill, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-mid-gray)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>{h.totalSemesters || h.semesters || 2} kỳ · {h.totalCredits || h.credits || 0} TC</span>
                        <span>CPA dự kiến: {h.projectedCpa || h.cpa || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FILTER_TABS.map((tab) => (
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
            {filtered.map((h) => {
              const statusKey = String(h.status || 'draft').toUpperCase();
              const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;
              return (
                <div key={h.planId || h.id} style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{h.name}</span>
                      <span style={{ ...s.pill, background: cfg.bg, color: cfg.color, fontSize: '11px' }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>{h.totalSemesters || h.semesters || 2} kỳ · {h.totalCredits || h.credits || 0} TC · CPA {h.projectedCpa || h.cpa || '—'}</span>
                      <span>{h.updatedAt || h.date || 'Gần đây'}</span>
                    </div>
                    {h.note && <div style={{ fontSize: '12px', color: 'var(--color-mid-gray)', marginTop: '4px', fontStyle: 'italic' }}>{h.note}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {statusKey === 'ACTIVE' && (
                      <span style={{ ...s.pill, background: 'var(--color-ink)', color: 'var(--color-paper)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                        Hiện tại
                      </span>
                    )}
                    {statusKey === 'ARCHIVED' && (
                      <button
                        style={{ ...s.pill, background: 'var(--color-canvas)', color: 'var(--color-ink)', border: 'none', cursor: 'pointer' }}
                        onClick={() => {
                          plannerStore.restorePlan(h.planId || h.id);
                          showToast(`Đã khôi phục ${h.name} thành bản nháp mới`);
                        }}
                      >
                        Khôi phục
                      </button>
                    )}
                    {statusKey === 'DRAFT' && (
                      <button
                        style={{ ...s.pill, background: 'var(--color-ink)', color: 'var(--color-paper)', border: 'none', cursor: 'pointer' }}
                        onClick={() => {
                          const res = plannerStore.activatePlan(h.planId || h.id);
                          showToast(res.message);
                        }}
                      >
                        Kích hoạt
                      </button>
                    )}
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', color: 'var(--color-mid-gray)' }}
                      onClick={() => navigate(`/planner?plan_id=${h.planId || h.id}`)}
                      title="Mở trong Planner"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', background: 'var(--color-ink)', color: 'var(--color-paper)',
          padding: '12px 20px', borderRadius: '9999px', fontSize: '13px', fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,0.16)', zIndex: 1000
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default PlanHistoryPage;
