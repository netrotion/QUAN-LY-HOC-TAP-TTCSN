import React, { useEffect, useState } from 'react';
import { createStudentRoutes } from '@haui/planner-ui';

export function App() {
  const [bootstrapInfo, setBootstrapInfo] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Kiểm tra điểm nối hợp đồng TV3 qua workspace
  const tv3Routes = createStudentRoutes({ api: {}, ui: {} });

  const fetchSystemInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bootRes, healthRes] = await Promise.all([
        fetch('/api/v1/system/bootstrap'),
        fetch('/api/v1/system/health')
      ]);

      if (bootRes.ok) {
        setBootstrapInfo(await bootRes.json());
      }
      if (healthRes.ok) {
        setHealthStatus(await healthRes.json());
      }
    } catch (err) {
      setError(err.message || 'Không thể kết nối API backend qua proxy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '40px auto', padding: '20px', lineHeight: '1.6' }}>
      <header style={{ borderBottom: '2px solid #0052cc', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ color: '#0052cc', margin: 0 }}>HaUI Advisor — Khung dự án (Bootstrap V0)</h1>
        <p style={{ color: '#666', margin: '8px 0 0' }}>Trang kiểm thử kỹ thuật nền tảng — TV5 Scaffold (Task 1.2)</p>
      </header>

      <section style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeeba', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 8px', color: '#856404' }}>Thông báo trạng thái hệ thống:</h3>
        <p style={{ margin: 0, color: '#856404' }}>
          Hệ thống đang chạy ở chế độ <strong>Khung kỹ thuật (Bootstrap V0)</strong>. Toàn bộ các chức năng nghiệp vụ (Dashboard, AI Advisor, Study Planner, What-if, Audit tốt nghiệp) <strong>CHƯA TRIỂN KHAI</strong>.
        </p>
      </section>

      <section style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px' }}>Kiểm tra điểm nối Frontend (TV2 &rarr; TV3):</h3>
        <p style={{ margin: 0 }}>
          Gói <code>@haui/planner-ui</code> (TV3) đã được mount thành công vào Web Host (TV2).<br />
          Số routes khai báo hiện tại: <strong>{tv3Routes.length}</strong> (Placeholder V0: <code>{tv3Routes[0]?.path}</code>)
        </p>
      </section>

      <section style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>Kết nối Backend (/api/v1/system):</h3>
          <button onClick={fetchSystemInfo} disabled={loading} style={{ padding: '6px 12px', cursor: 'pointer' }}>
            {loading ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
          </button>
        </div>

        {error && (
          <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>
            {error} (Hãy đảm bảo Spring Boot backend đang chạy tại port 8080)
          </div>
        )}

        {bootstrapInfo && (
          <div style={{ marginBottom: '12px' }}>
            <strong>Thông tin Bootstrap:</strong>
            <pre style={{ background: '#272822', color: '#f8f8f2', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(bootstrapInfo, null, 2)}
            </pre>
          </div>
        )}

        {healthStatus && (
          <div>
            <strong>Health Check:</strong>
            <pre style={{ background: '#272822', color: '#f8f8f2', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(healthStatus, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
export default App;
