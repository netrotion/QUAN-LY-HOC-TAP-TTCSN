import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/apiClient.js';
import { syncLiveSession } from '../services/academicStore.js';
import { Button, Error as ErrorBox, Loading } from '../components/ui/index.js';

const STATUS_VIEW = Object.freeze({
  ACHIEVED: { label: 'ĐÃ ĐẠT', badge: 'haui-badge--success' },
  NOT_ACHIEVED: { label: 'CHƯA ĐẠT', badge: 'haui-badge--error' },
  UNKNOWN: { label: 'CHƯA KHAI BÁO', badge: 'haui-badge--warning' }
});

const VERIFICATION_LABEL = Object.freeze({
  SELF_DECLARED: 'Sinh viên tự khai báo, chưa xác minh với trường',
  DEMO_SEED: 'Dữ liệu demo'
});

const FIELD_STYLE = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid var(--color-hairline)',
  backgroundColor: 'var(--color-paper)',
  fontSize: '13px',
  boxSizing: 'border-box'
};

/**
 * Chuẩn đầu ra phi tín chỉ của sinh viên đang đăng nhập:
 * GET /academic/certificates và PUT /academic/certificates/{requirementCode} (tự khai báo).
 * Khai báo làm đổi dataRevision nên phải đồng bộ lại phiên, kết quả rà soát sẽ được tải lại theo.
 */
export function CertificatesPanel() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // { requirementCode, status, evidenceNote, achievedOn }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.academic.listCertificates();
      setCertificates(res.certificates || []);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleEdit = (item) => {
    setSaveError(null);
    setEditing({
      requirementCode: item.requirementCode,
      status: item.status === 'UNKNOWN' ? 'ACHIEVED' : item.status,
      evidenceNote: item.evidenceNote || '',
      achievedOn: item.achievedOn || ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api.academic.declareCertificate(editing.requirementCode, {
        status: editing.status,
        evidenceNote: editing.evidenceNote.trim() || null,
        achievedOn: editing.achievedOn || null,
        dataRevision: api.getConfig().sessionStudent?.dataRevision
      });
      setEditing(null);
      await load();
      await syncLiveSession();
    } catch (err) {
      if (err?.status === 409) {
        await syncLiveSession().catch(() => {});
        setSaveError('Dữ liệu học vụ vừa thay đổi. Hệ thống đã cập nhật, vui lòng bấm lưu lại.');
      } else {
        setSaveError(err?.message || 'Không lưu được khai báo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="haui-audit-group"
      data-testid="certificates-panel"
      style={{
        borderRadius: 'var(--radius-cards)',
        backgroundColor: 'var(--color-paper)',
        padding: '24px',
        boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--color-hairline)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      <div style={{ paddingBottom: '14px', borderBottom: '1px solid var(--color-hairline)' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>
          Chuẩn đầu ra phi tín chỉ
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-mid-gray)' }}>
          Ngoại ngữ, Tin học, Giáo dục Quốc phòng - An ninh, Giáo dục Thể chất. Hệ thống không xác minh với trường.
        </p>
      </div>

      {loading && <Loading label="Đang tải chuẩn đầu ra..." />}
      {loadError && <ErrorBox title="Không tải được chuẩn đầu ra" error={loadError} onRetry={load} />}

      {!loading && !loadError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {certificates.map((item) => {
            const view = STATUS_VIEW[item.status] || STATUS_VIEW.UNKNOWN;
            const isEditing = editing?.requirementCode === item.requirementCode;
            const verification = VERIFICATION_LABEL[item.verification];
            return (
              <div
                key={item.requirementCode}
                data-requirement={item.requirementCode}
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>{item.name}</span>
                    {item.evidenceNote && (
                      <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>{item.evidenceNote}</span>
                    )}
                    {(item.achievedOn || verification) && (
                      <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)' }}>
                        {[item.achievedOn && `Ngày đạt: ${item.achievedOn}`, verification].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`haui-badge ${view.badge}`}>{view.label}</span>
                    {!isEditing && (
                      <button type="button" className="haui-pill-btn-canvas" onClick={() => handleEdit(item)}>
                        Khai báo
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      Trạng thái
                      <select
                        name="status"
                        style={FIELD_STYLE}
                        value={editing.status}
                        onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                      >
                        <option value="ACHIEVED">Đã đạt</option>
                        <option value="NOT_ACHIEVED">Chưa đạt</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      Ngày đạt
                      <input
                        type="date"
                        name="achievedOn"
                        style={FIELD_STYLE}
                        value={editing.achievedOn}
                        onChange={(e) => setEditing({ ...editing, achievedOn: e.target.value })}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', gridColumn: '1 / -1' }}>
                      Ghi chú minh chứng
                      <input
                        type="text"
                        name="evidenceNote"
                        style={FIELD_STYLE}
                        maxLength={500}
                        value={editing.evidenceNote}
                        placeholder="VD: TOEIC 650, thi tháng 9/2026"
                        onChange={(e) => setEditing({ ...editing, evidenceNote: e.target.value })}
                      />
                    </label>
                    {saveError && (
                      <p role="alert" style={{ margin: 0, fontSize: '12px', color: 'var(--color-ember)', gridColumn: '1 / -1' }}>{saveError}</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', gridColumn: '1 / -1' }}>
                      <button type="button" className="haui-pill-btn-canvas" onClick={() => setEditing(null)} disabled={saving}>
                        Hủy
                      </button>
                      <Button type="submit" variant="primary" loading={saving}>Lưu khai báo</Button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CertificatesPanel;
