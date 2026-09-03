import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-900/5 text-slate-800 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-950 text-slate-300 p-6 flex flex-col justify-between border-r border-slate-800 shrink-0 select-none">
        <div>
          {/* Logo / Brand Header */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-sky-500/20">
              CF
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">ContentFlow</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Auto Sync Live</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Menu Quản Lý</div>
          <nav className="space-y-1.5">
            <Link 
              href="/" 
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                router.pathname === '/' 
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/25' 
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">📊</span>
              <span>Báo Cáo Hàng Ngày</span>
            </Link>

            <Link 
              href="/plan" 
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                router.pathname === '/plan' 
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/25' 
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">📅</span>
              <span>Kế Hoạch Tháng (Grid)</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="pt-6 border-t border-slate-900/80 px-2 space-y-3">
          <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Thời Gian Hệ Thống</div>
            <div className="text-lg font-extrabold text-sky-400 mt-0.5">{time || '00:00'}</div>
            <div className="text-[11px] text-slate-500 mt-1">Lưu tự động vào Git repo</div>
          </div>
          
          <div className="text-[11px] text-slate-600 text-center">
            ContentFlow CRM v2.0 • Pro
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
