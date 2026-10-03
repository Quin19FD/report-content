import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

const NAV = [
  { href: '/', icon: '📊', label: 'Báo Cáo Hàng Ngày' },
  { href: '/plan', icon: '📅', label: 'Kế Hoạch Tháng (Grid)' },
  { href: '/analytics', icon: '📈', label: 'Phân Tích & Biểu Đồ' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [time, setTime] = useState('');
  const [authed, setAuthed] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auth gate: chưa đăng nhập → chuyển sang /login
  useEffect(() => {
    if (router.pathname === '/login') return;
    if (typeof window !== 'undefined' && !localStorage.getItem('cf_auth')) {
      setAuthed(false);
      router.push('/login');
    }
  }, [router.pathname]);

  // Đóng drawer mỗi khi đổi trang
  useEffect(() => {
    setNavOpen(false);
  }, [router.pathname]);

  if (!authed) return null;

  return (
    <div className="flex min-h-screen bg-[#f4f7f4] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* MOBILE TOP BAR (chỉ hiện dưới lg) */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-emerald-100 flex items-center justify-between px-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-emerald-500/20">
            CF
          </div>
          <span className="text-sm font-black text-slate-900 tracking-tight">ContentFlow</span>
        </div>
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Mở menu"
          className="w-10 h-10 -mr-2 flex items-center justify-center text-slate-600 hover:text-emerald-700"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Overlay tối khi mở drawer (mobile) */}
      {navOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* SIDEBAR: Drawer trượt trên mobile, cố định trên desktop */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white text-slate-700 p-6 flex flex-col justify-between border-r border-emerald-100/90 shrink-0 select-none transform transition-transform duration-300 lg:translate-x-0 shadow-[2px_0_16px_rgba(16,185,129,0.03)] ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo / Brand Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-500/25">
                CF
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">ContentFlow</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded uppercase tracking-wider">Sync Live</span>
                </div>
              </div>
            </div>
            {/* Nút đóng drawer (mobile) */}
            <button
              onClick={() => setNavOpen(false)}
              aria-label="Đóng menu"
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5 px-2">Menu Quản Lý</div>
          <nav className="space-y-1.5">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${
                  router.pathname === item.href
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-extrabold'
                    : 'hover:bg-emerald-50/80 text-slate-600 hover:text-emerald-800'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="pt-6 border-t border-emerald-100/70 px-1 space-y-3">
          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-2xl p-3.5 border border-emerald-100">
            <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wide">Thời Gian Hệ Thống</div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">{time || '00:00'}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Tự động đồng bộ điện toán đám mây</div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
            <span>ContentFlow Pro</span>
            <button
              onClick={() => {
                localStorage.removeItem('cf_auth');
                router.push('/login');
              }}
              className="text-slate-400 hover:text-rose-600 transition"
              title="Đăng xuất"
            >
              Đăng xuất ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 pt-[4.5rem] sm:p-6 sm:pt-[4.5rem] lg:p-8 overflow-y-auto">
        <div className="max-w-[1850px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
