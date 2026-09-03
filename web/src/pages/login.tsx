import { useState } from 'react';
import { useRouter } from 'next/router';

// Đăng nhập đơn giản: mật khẩu nằm trong env (mặc định nội bộ)
// Admin: toàn quyền (quản lý kênh, webhook, xóa) — Member: nhập & xem báo cáo
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
const MEMBER_PASSWORD = process.env.NEXT_PUBLIC_MEMBER_PASSWORD || 'member123';

export default function Login() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const doLogin = (role: 'admin' | 'member') => {
    const expected = role === 'admin' ? ADMIN_PASSWORD : MEMBER_PASSWORD;
    if (password !== expected) {
      setError('Sai mật khẩu! Thử lại.');
      return;
    }
    localStorage.setItem('cf_auth', role);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">CF</div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide">ContentFlow CRM</h1>
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Đăng nhập hệ thống</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wide mb-1.5">Mật khẩu</label>
          <input
            type="password"
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm font-semibold text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            placeholder="Nhập mật khẩu..."
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && doLogin('admin')}
          />
          {error && <p className="text-xs font-bold text-rose-400 mt-1.5">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => doLogin('admin')} className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white py-3 rounded-xl font-black text-xs shadow-lg transition">
            🔐 Đăng nhập Admin
          </button>
          <button onClick={() => doLogin('member')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-black text-xs border border-slate-700 transition">
            👤 Thành viên
          </button>
        </div>

        <p className="text-[11px] text-slate-500 font-semibold text-center leading-relaxed">
          Admin: toàn quyền (quản lý kênh, bot, xóa) • Thành viên: nhập & xem báo cáo.<br />
          Mật khẩu cấu hình qua biến môi trường NEXT_PUBLIC_ADMIN_PASSWORD / NEXT_PUBLIC_MEMBER_PASSWORD.
        </p>
      </div>
    </div>
  );
}
