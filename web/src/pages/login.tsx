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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 flex items-center justify-center p-6 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl border border-emerald-100/80 shadow-2xl shadow-emerald-600/5 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-500/25">
            CF
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">ContentFlow CRM</h1>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Đăng nhập hệ thống</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">Mật khẩu</label>
          <input
            type="password"
            className="w-full bg-slate-50/80 border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
            placeholder="Nhập mật khẩu truy cập..."
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && doLogin('admin')}
          />
          {error && <p className="text-xs font-bold text-rose-500 mt-1">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => doLogin('admin')}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-3 rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            🔐 Admin
          </button>
          <button
            type="button"
            onClick={() => doLogin('member')}
            className="bg-emerald-50/80 hover:bg-emerald-100 active:scale-98 text-emerald-800 py-3 rounded-xl font-black text-xs border border-emerald-200 transition cursor-pointer"
          >
            👤 Thành viên
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-medium text-center leading-relaxed pt-2 border-t border-slate-100">
          Admin: toàn quyền (quản lý kênh, bot, xóa) • Thành viên: nhập & xem báo cáo.
        </p>
      </div>
    </div>
  );
}
