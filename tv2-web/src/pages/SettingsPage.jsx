import React, { useState, useRef, useCallback } from 'react';
import { Link, useAnimatedNavigate } from '../components/layout/animatedNavigation.jsx';
import { logoutStudent, getAcademicSnapshot } from '../services/academicStore.js';
import { Select } from '../components/ui/Select.jsx';

// ponytail: all styles inline using CSS vars — no new CSS file needed

const S = {
  section: { background: 'var(--color-paper)', borderRadius: 'var(--heroui-radius-xl, 24px)', border: '1px solid var(--color-hairline)', padding: 32, boxShadow: 'var(--heroui-shadow-sm, 0 1px 8px rgba(0,0,0,0.02))' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--color-hairline)', marginBottom: 20 },
  iconCircle: { width: 40, height: 40, borderRadius: 'var(--heroui-radius-full, 9999px)', background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)' },
  h2: { fontSize: 18, fontWeight: 600, color: 'var(--color-ink)', margin: 0 },
  caption: { fontSize: 12, color: 'var(--color-mid-gray)', margin: '2px 0 0' },
  label: { fontSize: 12, fontWeight: 500, letterSpacing: '0.01em', color: 'var(--color-ink)' },
  labelMuted: { fontSize: 12, fontWeight: 500, letterSpacing: '0.01em', color: 'var(--color-mid-gray)' },
  inputRO: { width: '100%', background: 'var(--field-background, var(--color-surface-alt))', border: '1px solid var(--color-hairline)', borderRadius: 'var(--heroui-radius-lg, 18px)', padding: '8px 16px', fontSize: 14, color: 'var(--color-ink)', cursor: 'not-allowed', boxSizing: 'border-box' },
  input: { width: '100%', background: 'var(--field-background, var(--color-surface-alt))', border: '1px solid var(--color-hairline)', borderRadius: 'var(--heroui-radius-lg, 18px)', padding: '8px 16px', fontSize: 14, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms, box-shadow 150ms' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 'var(--heroui-radius-lg, 18px)', background: 'var(--color-ink)', color: 'var(--color-paper)', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: 'var(--heroui-shadow-sm)' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--heroui-radius-lg, 18px)', background: 'var(--color-canvas)', color: 'var(--color-ink)', fontSize: 14, fontWeight: 500, border: '1px solid var(--color-hairline)', cursor: 'pointer', transition: 'all 150ms' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--heroui-radius-lg, 18px)', background: 'transparent', color: 'var(--color-ink)', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' },
  select: { width: '100%', appearance: 'none', WebkitAppearance: 'none', background: 'var(--field-background, var(--color-surface-alt))', border: '1px solid var(--color-hairline)', borderRadius: 'var(--heroui-radius-lg, 18px)', padding: '8px 40px 8px 16px', fontSize: 14, color: 'var(--color-ink)', outline: 'none', cursor: 'pointer', boxSizing: 'border-box', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23737373\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '16px' },
  toggle: (on) => ({ width: 44, height: 24, borderRadius: 9999, background: on ? 'var(--color-ink)' : 'var(--color-hairline)', padding: 2, border: 'none', cursor: 'pointer', transition: 'background 200ms', display: 'flex', alignItems: 'center', flexShrink: 0 }),
  toggleDot: (on) => ({ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-paper)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: on ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 200ms' }),
};

const TABS = [
  { id: 'account', icon: 'person', label: 'Tài khoản' },
  { id: 'security', icon: 'lock', label: 'Bảo mật' },
  { id: 'appearance', icon: 'palette', label: 'Giao diện' },
  { id: 'notifications', icon: 'notifications', label: 'Thông báo' },
  { id: 'preferences', icon: 'tune', label: 'Tùy chọn học tập' },
  { id: 'privacy', icon: 'shield_person', label: 'Quyền riêng tư & Dữ liệu' },
];

const NOTIFICATIONS = [
  { key: 'plan', title: 'Nhắc nhở kế hoạch học tập', desc: 'Gửi thông báo khi đến kỳ lập hoặc điều chỉnh lộ trình môn học HaUI trước đợt đăng ký tín chỉ.' },
  { key: 'prereq', title: 'Cảnh báo môn học chưa đủ điều kiện', desc: 'Thông báo ngay khi phát hiện thiếu tiên quyết hoặc xung đột ràng buộc học vụ.', badge: 'Quan trọng' },
  { key: 'progress', title: 'Nhắc nhở tiến độ học tập', desc: 'Cập nhật tiến độ hoàn thành số tín chỉ tích lũy định kỳ hàng tuần.' },
  { key: 'planUpdate', title: 'Thông báo cập nhật kế hoạch', desc: 'Lưu vết và gửi cảnh báo khi có chỉnh sửa trong lịch sử các phiên bản kế hoạch.' },
  { key: 'grad', title: 'Nhắc nhở điều kiện tốt nghiệp', desc: 'Đếm ngược và nhắc bổ sung chuẩn đầu ra ngoại ngữ, GDTC, GDQP-AN và ngưỡng CPA tối thiểu.', ember: true },
];

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, maxWidth: 420, background: 'var(--color-paper)', border: '1px solid var(--color-hairline)', color: 'var(--color-ink)', borderRadius: 9999, padding: '12px 20px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
      <span>{message}</span>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useAnimatedNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [toast, setToast] = useState('');
  const sectionRefs = useRef({});

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }, []);

  const scrollTo = (id) => {
    setActiveTab(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
  };

  // Settings state — persisted in localStorage
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('haui_email') || 'an.nguyen@example.com'; } catch { return 'an.nguyen@example.com'; } });
  const [notifs, setNotifs] = useState(() => { try { const s = localStorage.getItem('haui_notifs'); return s ? JSON.parse(s) : { plan: true, prereq: true, progress: true, planUpdate: true, grad: true }; } catch { return { plan: true, prereq: true, progress: true, planUpdate: true, grad: true }; } });
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('14');
  const [sidebarLayout, setSidebarLayout] = useState('expanded');
  const [semester, setSemester] = useState('sem7');
  const [language, setLanguage] = useState('vi');
  const [targetCpa, setTargetCpa] = useState('3.40');
  const [creditsLimit, setCreditsLimit] = useState('18');
  const [avatarSrc, setAvatarSrc] = useState(null);

  // Password state
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Modals
  const [modal, setModal] = useState(null); // 'reset' | 'logout' | 'delete' | 'data'
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const cpaBadge = () => {
    const n = parseFloat(targetCpa);
    if (n >= 3.6) return 'Xuất sắc';
    if (n >= 3.2) return 'Bằng Giỏi';
    if (n >= 2.5) return 'Bằng Khá';
    return 'Trung bình';
  };

  const passStrength = () => {
    if (!newPass) return { pct: 0, label: 'Chưa nhập', color: 'var(--color-hairline)' };
    let s = 0;
    if (newPass.length >= 8) s += 35;
    if (/[A-Za-z]/.test(newPass)) s += 25;
    if (/[0-9]/.test(newPass)) s += 20;
    if (/[^A-Za-z0-9]/.test(newPass)) s += 20;
    if (s < 40) return { pct: s, label: 'Yếu', color: 'var(--color-ember)' };
    if (s < 75) return { pct: s, label: 'Trung bình', color: 'var(--color-mid-gray)' };
    return { pct: s, label: 'Mạnh & An toàn', color: 'var(--color-ink)' };
  };

  const handleSave = () => {
    try {
      localStorage.setItem('haui_email', email);
      localStorage.setItem('haui_notifs', JSON.stringify(notifs));
      localStorage.setItem('haui_settings', JSON.stringify({ semester, language, targetCpa, creditsLimit, theme, fontSize, sidebarLayout }));
    } catch {}
    showToast('Đã lưu tất cả các thay đổi cài đặt thành công!');
  };

  const handleReset = () => {
    setEmail('an.nguyen@example.com');
    setSemester('sem7');
    setLanguage('vi');
    setTargetCpa('3.40');
    setCreditsLimit('18');
    setTheme('light');
    setFontSize('14');
    setSidebarLayout('expanded');
    setNotifs({ plan: true, prereq: true, progress: true, planUpdate: true, grad: true });
    setModal(null);
    showToast('Đã khôi phục toàn bộ cài đặt mặc định!');
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (newPass.length < 8) { showToast('Mật khẩu phải dài ít nhất 8 ký tự!'); return; }
    if (newPass !== confirmPass) { showToast('Mật khẩu mới và xác nhận không trùng khớp!'); return; }
    setOldPass(''); setNewPass(''); setConfirmPass('');
    showToast('Mật khẩu đã được cập nhật thành công!');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setAvatarSrc(ev.target.result); showToast('Đã cập nhật ảnh đại diện!'); };
    reader.readAsDataURL(file);
  };

  const handleDeleteData = () => {
    if (deleteConfirm.trim().toUpperCase() !== 'XOA DU LIEU') { showToast('Vui lòng nhập đúng cụm từ "XOA DU LIEU" để xác nhận!'); return; }
    try { localStorage.clear(); } catch {}
    setModal(null);
    showToast('Toàn bộ dữ liệu đã được xóa!');
  };

  const handleExport = () => {
    const data = { app: 'HAUI ADVISOR', student: { mssv: '2020601234', fullname: 'Nguyễn Văn An', email }, settings: { semester, targetCpa, creditsLimit }, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'haui_advisor_backup.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống tệp dữ liệu!');
  };

  const ps = passStrength();
  const Icon = ({ name, size = 20 }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;

  return (
    <div className="haui-page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <nav className="haui-breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/" className="haui-breadcrumb__home"><span className="material-symbols-outlined haui-breadcrumb__icon" aria-hidden="true">home</span>Trang chủ</Link>
            <span className="haui-breadcrumb__separator" aria-hidden="true">/</span>
            <span className="haui-breadcrumb__current" aria-current="page">Cài đặt</span>
          </nav>
          <h1 style={{ fontSize: 30, fontWeight: 600, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.5px' }}>Cài đặt</h1>
          <p style={{ fontSize: 14, color: 'var(--color-mid-gray)', margin: 0 }}>Quản lý thông tin tài khoản và tùy chỉnh trải nghiệm học tập.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={S.btnGhost} onClick={() => setModal('reset')}><Icon name="restart_alt" size={18} />Khôi phục mặc định</button>
          <button style={S.btnPrimary} onClick={handleSave}><Icon name="save" size={18} />Lưu cài đặt</button>
        </div>
      </div>

      {/* Sticky Tab Nav */}
      <div style={{ position: 'sticky', top: 64, zIndex: 30, background: 'rgba(245,245,245,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-hairline)', padding: '10px 0', overflowX: 'auto' }}>
        <nav style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => scrollTo(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 9999, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 150ms', background: activeTab === t.id ? 'var(--color-ink)' : 'var(--color-canvas)', color: activeTab === t.id ? 'var(--color-paper)' : 'var(--color-mid-gray)' }}>
              <Icon name={t.icon} size={16} />{t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>

        {/* 1. Account */}
        <section ref={el => sectionRefs.current.account = el} style={S.section} id="section-account">
          <div style={{ ...S.sectionHeader, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={S.iconCircle}><Icon name="badge" /></div>
              <div><h2 style={S.h2}>Thông tin tài khoản</h2><p style={S.caption}>Dữ liệu đồng bộ theo hệ thống quản lý sinh viên HaUI</p></div>
            </div>
            <Link to="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: 'var(--color-ink)' }}>Chỉnh sửa hồ sơ chi tiết <Icon name="arrow_forward" size={15} /></Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--color-ink)', color: 'var(--color-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, overflow: 'hidden' }}>
                  {avatarSrc ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'NA'}
                </div>
                <button onClick={() => document.getElementById('avatar-file-input')?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--color-paper)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <Icon name="photo_camera" size={16} />
                </button>
                <input id="avatar-file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-mid-gray)' }}><div>Định dạng JPG, PNG</div><div>Tối đa 2.0 MB</div></div>
            </div>
            {/* Fields */}
            {(() => {
              const currentStudent = getAcademicSnapshot().student;
              return (
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  <Field label="Họ và tên sinh viên" value={currentStudent?.fullName || 'Nguyễn Văn An'} readOnly />
                  <Field label="Mã số sinh viên" value={currentStudent?.studentId || '2024604757'} readOnly locked />
                  <Field label="Ngành đào tạo" value={currentStudent?.majorName || 'Kỹ thuật phần mềm'} readOnly />
                  <Field label="Lớp sinh hoạt & Khóa" value={`${currentStudent?.className || '2022DHKTPM01'} • ${currentStudent?.faculty || 'Đại học Công nghiệp Hà Nội'}`} readOnly />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={S.label}>Email liên hệ / Nhận thông báo cá nhân</label>
                      <div style={{ position: 'relative' }}>
                        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: 10, fontSize: 18, color: 'var(--color-mid-gray)' }}>mail</span>
                        <input style={{ ...S.input, paddingLeft: 40, paddingRight: 96 }} value={email} onChange={e => setEmail(e.target.value)} type="email" />
                        <span style={{ position: 'absolute', right: 14, top: 10, fontSize: 12, color: 'var(--color-mid-gray)' }}>Đã xác minh</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--color-mid-gray)', margin: 0 }}>Hệ thống sẽ gửi các thông báo nhắc nhở tiến độ tốt nghiệp và cảnh báo môn học tới địa chỉ này.</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* 2. Security */}
        <section ref={el => sectionRefs.current.security = el} style={S.section} id="section-security">
          <div style={S.sectionHeader}>
            <div style={S.iconCircle}><Icon name="security" /></div>
            <div><h2 style={S.h2}>Bảo mật & Xác thực</h2><p style={S.caption}>Kiểm soát mật khẩu tài khoản cổng thông tin tư vấn</p></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <PasswordField label="Mật khẩu hiện tại" value={oldPass} onChange={setOldPass} placeholder="Nhập mật khẩu hiện đang sử dụng" />
              <div>
                <PasswordField label="Mật khẩu mới" value={newPass} onChange={setNewPass} placeholder="Tối thiểu 8 ký tự bao gồm chữ và số" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--color-canvas)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${ps.pct}%`, background: ps.color, borderRadius: 9999, transition: 'all 300ms' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-mid-gray)' }}>{ps.label}</span>
                </div>
              </div>
              <PasswordField label="Xác nhận mật khẩu mới" value={confirmPass} onChange={setConfirmPass} placeholder="Nhập lại mật khẩu mới" />
              <div style={{ paddingTop: 8 }}><button type="submit" style={S.btnPrimary}><Icon name="check" size={18} />Cập nhật mật khẩu</button></div>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20, borderRadius: 20, background: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="info" /><span style={{ fontSize: 14, fontWeight: 600 }}>Cơ chế xác thực độc lập</span></div>
                <p style={{ fontSize: 14, color: 'var(--color-mid-gray)', lineHeight: 1.6, margin: 0 }}>Hệ sinh thái HaUI Advisor hoạt động theo mô hình Sandbox tư vấn học tập. Mật khẩu thay đổi tại đây không ảnh hưởng đến cổng đào tạo chính thức.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--color-hairline)', fontSize: 12, color: 'var(--color-mid-gray)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-ink)' }} />Phiên: Google Chrome trên Windows</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-mid-gray)' }} />IP: 118.70.xxx.xxx (Hà Nội, VN)</div>
                </div>
              </div>
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--color-hairline)', marginTop: 16 }}>
                <button style={{ ...S.btnSecondary, width: '100%', justifyContent: 'center' }} onClick={() => setModal('logout')}><Icon name="logout" size={18} />Đăng xuất khỏi thiết bị này</button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Appearance */}
        <section ref={el => sectionRefs.current.appearance = el} style={S.section} id="section-appearance">
          <div style={S.sectionHeader}>
            <div style={S.iconCircle}><Icon name="palette" /></div>
            <div><h2 style={S.h2}>Tùy chỉnh giao diện</h2><p style={S.caption}>Điều chỉnh độ sáng, cỡ chữ và hiển thị thanh điều hướng</p></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Theme */}
              <div><span style={S.label}>Chế độ hiển thị (Theme)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                  <ThemeCard mode="light" active={theme === 'light'} onSelect={() => { setTheme('light'); showToast('Đã chuyển về giao diện sáng!'); }} />
                  <ThemeCard mode="dark" active={theme === 'dark'} onSelect={() => { setTheme('dark'); showToast('Đã kích hoạt chế độ mô phỏng giao diện tối!'); }} />
                </div>
              </div>
              {/* Font size */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={S.label}>Cỡ chữ hệ thống</span>
                  <span style={{ fontSize: 12, color: 'var(--color-mid-gray)' }}>{fontSize}px ({fontSize === '14' ? 'Chuẩn' : fontSize === '13' ? 'Nhỏ' : 'Lớn'})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: 4, borderRadius: 9999, background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)', marginTop: 8, maxWidth: 400 }}>
                  {[['13', 'Nhỏ (13px)'], ['14', 'Vừa (14px - Chuẩn)'], ['16', 'Lớn (16px)']].map(([v, l]) => (
                    <button key={v} onClick={() => { setFontSize(v); showToast(`Đã áp dụng cỡ chữ ${v}px`); }} style={{ padding: '6px 0', borderRadius: 9999, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: fontSize === v ? 'var(--color-paper)' : 'transparent', color: fontSize === v ? 'var(--color-ink)' : 'var(--color-mid-gray)', boxShadow: fontSize === v ? 'var(--shadow-sm)' : 'none', transition: 'all 150ms' }}>{l}</button>
                  ))}
                </div>
              </div>
              {/* Sidebar layout */}
              <div>
                <span style={S.label}>Bố cục Sidebar danh mục</span>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {[['expanded', 'dock_to_right', 'Mở rộng đầy đủ (Chuẩn 288px)'], ['collapsed', 'view_sidebar', 'Thu gọn icon']].map(([v, ic, l]) => (
                    <button key={v} onClick={() => { setSidebarLayout(v); showToast(v === 'collapsed' ? 'Đã thu gọn thanh Sidebar' : 'Đã chuyển về Sidebar mở rộng'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 9999, fontSize: 12, fontWeight: 500, border: sidebarLayout === v ? 'none' : '1px solid var(--color-hairline)', cursor: 'pointer', background: sidebarLayout === v ? 'var(--color-ink)' : 'var(--color-canvas)', color: sidebarLayout === v ? 'var(--color-paper)' : 'var(--color-ink)', transition: 'all 150ms' }}>
                      <Icon name={ic} size={16} />{l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Live Preview */}
            <div style={{ padding: 16, borderRadius: 20, background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-mid-gray)', marginBottom: 8, display: 'block' }}>Xem trước giao diện</span>
              <div style={{ borderRadius: 12, background: theme === 'dark' ? 'var(--color-ink)' : 'var(--color-paper)', color: theme === 'dark' ? 'var(--color-paper)' : 'var(--color-ink)', border: '1px solid var(--color-hairline)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--color-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-ink)', color: 'var(--color-paper)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>HA</div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>HaUI Blueprint</span>
                  </div>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-ember)' }} />
                </div>
                <p style={{ fontSize: parseInt(fontSize), color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'var(--color-mid-gray)', lineHeight: 1.5, margin: 0 }}>
                  Kế hoạch học kỳ 7: Đạt 18 tín chỉ, GPA kỳ ≥ 3.50.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Notifications */}
        <section ref={el => sectionRefs.current.notifications = el} style={S.section} id="section-notifications">
          <div style={{ ...S.sectionHeader, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={S.iconCircle}><Icon name="notifications_active" /></div>
              <div><h2 style={S.h2}>Cài đặt thông báo</h2><p style={S.caption}>Quản lý các loại nhắc nhở và cảnh báo tự động</p></div>
            </div>
            <button style={{ ...S.btnGhost, fontSize: 12 }} onClick={() => { setNotifs({ plan: true, prereq: true, progress: true, planUpdate: true, grad: true }); showToast('Đã bật tất cả thông báo!'); }}>Bật tất cả</button>
          </div>
          {NOTIFICATIONS.map((n, i) => (
            <div key={n.key} style={{ padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: i > 0 ? '1px solid var(--color-hairline)' : 'none' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{n.title}</span>
                  {n.badge && <span style={{ padding: '2px 8px', borderRadius: 9999, background: 'var(--color-canvas)', fontSize: 11, fontWeight: 500, border: '1px solid var(--color-hairline)' }}>{n.badge}</span>}
                  {n.ember && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-ember)', display: 'inline-block' }} />}
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-mid-gray)', marginTop: 2, display: 'block' }}>{n.desc}</span>
              </div>
              <button type="button" style={S.toggle(notifs[n.key])} onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key] }))} role="switch" aria-checked={notifs[n.key]}>
                <span style={S.toggleDot(notifs[n.key])} />
              </button>
            </div>
          ))}
        </section>

        {/* 5. Preferences */}
        <section ref={el => sectionRefs.current.preferences = el} style={S.section} id="section-preferences">
          <div style={S.sectionHeader}>
            <div style={S.iconCircle}><Icon name="school" /></div>
            <div><h2 style={S.h2}>Tùy chọn học tập cá nhân</h2><p style={S.caption}>Cấu hình các chỉ số mục tiêu để thuật toán gợi ý lộ trình tối ưu</p></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <SelectField label="Học kỳ hiện tại" value={semester} onChange={setSemester} hint="Căn cứ để tính số học kỳ còn lại" options={[['sem5', 'Học kỳ 5 · Kỳ I 2023–2024'], ['sem6', 'Học kỳ 6 · Kỳ II 2023–2024'], ['sem7', 'Học kỳ 7 · Kỳ I 2024–2025'], ['sem8', 'Học kỳ 8 · Kỳ II 2024–2025 · Khóa luận']]} />
            <SelectField label="Ngôn ngữ giao diện" value={language} onChange={setLanguage} hint="Tên học phần luôn hiển thị theo chuẩn HaUI" options={[['vi', 'Tiếng Việt'], ['en', 'English']]} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={S.label}>Mục tiêu CPA mong muốn</label>
                <span style={{ padding: '2px 8px', borderRadius: 9999, background: 'var(--color-canvas)', fontSize: 11, fontWeight: 500, border: '1px solid var(--color-hairline)' }}>{cpaBadge()}</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input style={S.input} type="number" min="2.0" max="4.0" step="0.05" value={targetCpa} onChange={e => setTargetCpa(e.target.value)} />
                <span style={{ position: 'absolute', right: 16, top: 8, fontSize: 12, color: 'var(--color-mid-gray)' }}>/ 4.0</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-mid-gray)' }}>Hệ thống What-if sẽ dựa vào mục tiêu này</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={S.label}>Số tín chỉ mục tiêu mỗi học kỳ</label>
                <span style={{ fontSize: 12, color: 'var(--color-mid-gray)' }}>Giới hạn: 12–22 TC</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input style={S.input} type="number" min="10" max="25" value={creditsLimit} onChange={e => setCreditsLimit(e.target.value)} />
                <span style={{ position: 'absolute', right: 16, top: 8, fontSize: 12, color: 'var(--color-mid-gray)' }}>Tín chỉ</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-mid-gray)' }}>Tránh quá tải và đảm bảo thời gian thực tập</span>
            </div>
          </div>
        </section>

        {/* 6. Privacy */}
        <section ref={el => sectionRefs.current.privacy = el} style={S.section} id="section-privacy">
          <div style={S.sectionHeader}>
            <div style={S.iconCircle}><Icon name="shield_person" /></div>
            <div><h2 style={S.h2}>Quyền riêng tư & Dữ liệu</h2><p style={S.caption}>Xuất dữ liệu, kiểm tra quyền riêng tư và quản lý lưu trữ trình duyệt</p></div>
          </div>
          {/* Data export */}
          <div style={{ padding: 20, borderRadius: 20, background: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div><span style={{ fontSize: 14, fontWeight: 600, display: 'block' }}>Dữ liệu học tập cá nhân</span><p style={{ fontSize: 12, color: 'var(--color-mid-gray)', margin: '4px 0 0', maxWidth: 500 }}>Bảng điểm mô phỏng, lịch sử kế hoạch và cây môn học được lưu trữ cục bộ trong Local Storage.</p></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.btnSecondary} onClick={() => setModal('data')}><Icon name="visibility" size={16} />Xem dữ liệu</button>
              <button style={S.btnPrimary} onClick={handleExport}><Icon name="download" size={16} />Tải bản sao (.json)</button>
            </div>
          </div>
          {/* Danger zone */}
          <div style={{ padding: 20, borderRadius: 20, border: '1px solid rgba(231,0,11,0.3)', background: 'rgba(231,0,11,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-paper)', border: '1px solid rgba(231,0,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ember)', flexShrink: 0 }}><Icon name="warning" size={18} /></div>
              <div><span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ember)' }}>Vùng nguy hiểm: Xóa toàn bộ dữ liệu & tài khoản cục bộ</span><p style={{ fontSize: 12, color: 'var(--color-mid-gray)', margin: '4px 0 0', lineHeight: 1.6 }}>Thao tác này sẽ dọn sạch toàn bộ kế hoạch học tập, bảng điểm đã nhập và cấu hình cá nhân. Không thể hoàn tác.</p></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid rgba(231,0,11,0.2)', marginTop: 12 }}>
              <button onClick={() => setModal('delete')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9999, background: 'var(--color-paper)', border: '1px solid var(--color-ember)', color: 'var(--color-ember)', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 150ms' }}><Icon name="delete_forever" size={18} />Yêu cầu xóa tài khoản & dữ liệu</button>
            </div>
          </div>
        </section>
      </div>

      {/* Modals */}
      {modal === 'reset' && <Modal title="Khôi phục cài đặt mặc định?" icon="restart_alt" onClose={() => setModal(null)} actions={<><button style={S.btnSecondary} onClick={() => setModal(null)}>Hủy bỏ</button><button style={S.btnPrimary} onClick={handleReset}>Khôi phục ngay</button></>}>
        <p style={{ fontSize: 14, color: 'var(--color-mid-gray)', lineHeight: 1.6 }}>Tất cả cấu hình giao diện, thông báo và chỉ số mục tiêu sẽ trở về mặc định. Dữ liệu bảng điểm vẫn được giữ nguyên.</p>
      </Modal>}

      {modal === 'logout' && <Modal title="Xác nhận đăng xuất" icon="logout" onClose={() => setModal(null)} actions={<><button style={S.btnSecondary} onClick={() => setModal(null)}>Ở lại</button><button style={S.btnPrimary} onClick={() => { setModal(null); logoutStudent(); navigate('/login'); }}>Đăng xuất</button></>}>
        <p style={{ fontSize: 14, color: 'var(--color-mid-gray)', lineHeight: 1.6 }}>Bạn sắp kết thúc phiên làm việc cho sinh viên <strong style={{ color: 'var(--color-ink)' }}>Nguyễn Văn An (2020601234)</strong> trên trình duyệt này.</p>
      </Modal>}

      {modal === 'delete' && <Modal title="Xóa vĩnh viễn toàn bộ dữ liệu?" icon="delete_forever" iconColor="var(--color-ember)" onClose={() => setModal(null)} actions={<><button style={S.btnSecondary} onClick={() => setModal(null)}>Hủy bỏ</button><button onClick={handleDeleteData} style={{ ...S.btnPrimary, background: 'var(--color-ember)' }}><Icon name="delete" size={18} />Xóa dữ liệu ngay</button></>}>
        <p style={{ fontSize: 14, color: 'var(--color-mid-gray)', lineHeight: 1.6 }}>Thao tác sẽ xóa sạch kế hoạch, lịch sử tư vấn AI và bảng điểm. Hãy tải bản sao <code style={{ background: 'var(--color-canvas)', padding: '0 4px', borderRadius: 4 }}>.json</code> nếu cần.</p>
        <div style={{ background: 'var(--color-surface-alt)', borderRadius: 16, padding: 16, border: '1px solid var(--color-hairline)', marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 500 }}>Để xác nhận, hãy nhập "XOA DU LIEU":</label>
          <input style={{ ...S.input, marginTop: 8 }} value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="XOA DU LIEU" />
        </div>
      </Modal>}

      {modal === 'data' && <Modal title="Tóm tắt dữ liệu cá nhân" icon="database" onClose={() => setModal(null)} actions={<button style={S.btnSecondary} onClick={() => setModal(null)}>Đóng</button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['Tổng số môn học đã tích lũy:', '36 môn (118 tín chỉ)'], ['Bản nháp kế hoạch đang lưu:', 'Bản nháp v2.4 (HK 7 & 8)'], ['Phiên trò chuyện Tư vấn AI:', '8 câu hỏi đã giải đáp'], ['Kịch bản mô phỏng What-if:', '2 kịch bản lưu tạm']].map(([k, v]) => (
            <div key={k} style={{ padding: 12, borderRadius: 12, background: 'var(--color-surface-alt)', border: '1px solid var(--color-hairline)', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--color-mid-gray)' }}>{k}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{v}</span>
            </div>
          ))}
        </div>
      </Modal>}

      <Toast message={toast} />
    </div>
  );
}

/* ── Tiny sub-components ── */

function Field({ label, value, readOnly, locked }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-mid-gray)' }}>{label}</label>
        {locked && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)', fontSize: 11, fontWeight: 500, color: 'var(--color-mid-gray)' }}><span className="material-symbols-outlined" style={{ fontSize: 12 }}>lock</span>Cố định</span>}
      </div>
      <input style={S.inputRO} value={value} readOnly={readOnly} tabIndex={readOnly ? -1 : 0} />
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={S.label}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input style={{ ...S.input, paddingRight: 44 }} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required />
        <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: 6, background: 'none', border: 'none', color: 'var(--color-mid-gray)', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{show ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, hint, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={S.label}>{label}</label>
      <Select
        value={value}
        onChange={e => onChange(e.target.value)}
        options={options.map(([v, l]) => ({ value: v, label: l }))}
      />
      {hint && <span style={{ fontSize: 12, color: 'var(--color-mid-gray)' }}>{hint}</span>}
    </div>
  );
}

function ThemeCard({ mode, active, onSelect }) {
  const isLight = mode === 'light';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', padding: 16, borderRadius: 18, border: active ? '2px solid var(--color-ink)' : '1px solid var(--color-hairline)', background: isLight ? 'var(--color-paper)' : 'var(--color-surface-alt)', cursor: 'pointer', transition: 'all 150ms', boxShadow: active ? 'var(--shadow-sm)' : 'none' }}>
      <input type="radio" name="app-theme" value={mode} checked={active} onChange={onSelect} style={{ position: 'absolute', opacity: 0 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{isLight ? 'light_mode' : 'dark_mode'}</span>
          {isLight ? 'Sáng (Light)' : 'Tối (Mô phỏng)'}
        </span>
        {active ? <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-ink)' }}>check_circle</span> : <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid var(--color-hairline)' }} />}
      </div>
      <div style={{ height: 64, borderRadius: 12, background: isLight ? 'var(--color-canvas)' : 'var(--color-ink)', border: '1px solid var(--color-hairline)', padding: 8, display: 'flex', gap: 8 }}>
        <div style={{ width: '25%', height: '100%', borderRadius: 8, background: isLight ? 'var(--color-surface-alt)' : '#171717', border: isLight ? '1px solid var(--color-hairline)' : 'none' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
          <div style={{ width: '75%', height: 8, borderRadius: 9999, background: isLight ? 'var(--color-hairline)' : '#444' }} />
          <div style={{ width: '50%', height: 8, borderRadius: 9999, background: isLight ? '#e8e8e8' : '#333' }} />
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--color-mid-gray)', marginTop: 10 }}>{isLight ? 'Tối ưu cho hiển thị phòng học và tài liệu' : 'Phiên bản Dark Blueprint đang hoàn thiện'}</span>
    </label>
  );
}

function Modal({ title, icon, iconColor, onClose, actions, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,10,0.4)', backdropFilter: 'blur(4px)', padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--color-paper)', borderRadius: 24, maxWidth: 480, width: '100%', padding: 32, border: '1px solid var(--color-hairline)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-canvas)', border: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor || 'var(--color-ink)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{icon}</span>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-mid-gray)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div><h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h3>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>{actions}</div>
      </div>
    </div>
  );
}

export default SettingsPage;
