import React, { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api } from '../../services/apiClient.js';
import {
  STUDENT_PRESETS,
  getAcademicSnapshot,
  selectStudentPreset,
  subscribeAcademicStore
} from '../../services/academicStore.js';

/**
 * Panel công cụ dev của Web Host (prototype-v1)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Gom các công cụ phục vụ review/kiểm thử (đổi persona mẫu, chế độ API MOCK/LIVE, trang Demo UI V0,
 * bộ chuyển trạng thái Loaded/Loading/Empty/Error của từng màn) vào một tab nổi giữa mép phải
 * (tránh đè lên toast và thanh hành động dưới đáy của các màn),
 * để giao diện chính giữ đúng prototype. Ẩn hoàn toàn khi chạy production.
 *
 * Màn hình nào cần thêm điều khiển riêng thì bọc chúng trong <DevSlot> — nội dung được portal vào panel.
 * TV3 nhận DevSlot qua `ui.DevSlot`.
 */

const DevToolsContext = createContext({ enabled: false, slotNode: null });

export function DevToolsProvider({ children }) {
  const [slotNode, setSlotNode] = useState(null);
  const [apiConfig, setApiConfig] = useState(() => api.getConfig());

  useEffect(() => api.subscribe(setApiConfig), []);

  const enabled = !apiConfig.isProduction;

  return (
    <DevToolsContext.Provider value={{ enabled, slotNode, setSlotNode, apiConfig }}>
      {children}
    </DevToolsContext.Provider>
  );
}

/**
 * Đưa các điều khiển dev của một màn hình vào panel công cụ dev.
 * Không hiển thị gì khi panel bị tắt (production) hoặc chưa mount.
 *
 * @param {{ title?: string, children: React.ReactNode }} props
 */
export function DevSlot({ title, children }) {
  const { enabled, slotNode } = useContext(DevToolsContext);
  if (!enabled || !slotNode) return null;
  return createPortal(
    <section className="flex flex-col gap-space-xs border-t border-hairline pt-space-sm">
      {title && (
        <span className="font-label text-label text-mid-gray uppercase tracking-wider">{title}</span>
      )}
      {children}
    </section>,
    slotNode
  );
}

export function DevToolsPanel() {
  const { enabled, setSlotNode, apiConfig } = useContext(DevToolsContext);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(() => getAcademicSnapshot());

  useEffect(() => subscribeAcademicStore(setSnapshot), []);

  if (!enabled) return null;

  const handlePresetChange = (presetKey) => {
    selectStudentPreset(presetKey);
    const preset = STUDENT_PRESETS[presetKey];
    if (preset) api.setSessionStudent(preset);
  };

  return (
    <div className="haui-devtools fixed right-0 top-1/2 -translate-y-1/2 z-[60] flex items-center gap-space-sm print:hidden">
      <div
        className={`w-80 max-h-[80vh] overflow-y-auto bg-paper border border-hairline rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-space-md flex-col gap-space-sm ${
          open ? 'flex' : 'hidden'
        }`}
        role="dialog"
        aria-label="Công cụ dev"
      >
        <div className="flex items-center justify-between">
          <span className="font-body-medium text-body-medium text-ink">Công cụ dev</span>
          <span className="font-label text-label text-mid-gray">Ẩn khi production</span>
        </div>

        <label className="flex flex-col gap-space-xs">
          <span className="font-label text-label text-mid-gray uppercase tracking-wider">Tài khoản mẫu</span>
          <select
            className="w-full bg-canvas border border-transparent rounded-full px-space-md py-2 font-body text-body text-ink focus:outline-none focus:border-hairline"
            value={snapshot.activePresetId || 'at-risk'}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {Object.values(STUDENT_PRESETS).map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.fullName} — {preset.presetLabel}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between gap-space-sm">
          <span className="font-label text-label text-mid-gray uppercase tracking-wider">API</span>
          <button
            type="button"
            onClick={() => api.setMockMode(!apiConfig.mockEnabled)}
            className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full border border-hairline font-label text-label text-ink hover:bg-canvas transition-colors"
            title={
              apiConfig.mockEnabled
                ? 'Đang dùng Mock Interceptor cục bộ (FIXTURE_ONLY) — bấm để gọi backend thật'
                : 'Đang gọi Spring Boot backend (/api/v1) — bấm để quay về mock'
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${apiConfig.mockEnabled ? 'bg-ember' : 'bg-ink'}`} />
            {apiConfig.mockEnabled ? 'MOCK (FIXTURE_ONLY)' : 'LIVE (/api/v1)'}
          </button>
        </div>

        <Link
          to="/demo-ui"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-space-xs font-body text-body text-mid-gray hover:text-ink transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">widgets</span>
          Demo Shared UI V0 &amp; Mock API
        </Link>

        <div ref={setSlotNode} className="flex flex-col gap-space-sm empty:hidden" />
      </div>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-9 h-11 rounded-l-full bg-ink text-paper flex items-center justify-center pl-1 shadow-[0_1px_8px_rgba(0,0,0,0.16)] opacity-70 hover:opacity-100 hover:bg-ink-soft transition"
        title={open ? 'Đóng công cụ dev' : 'Mở công cụ dev'}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[20px]">{open ? 'close' : 'build'}</span>
      </button>
    </div>
  );
}

export default DevToolsPanel;
