import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function Analytics() {
  const [reports, setReports] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetch(`/api/reports?filterType=MONTH&month=${filterMonth}&year=${filterYear}`)
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(err => console.error("Lỗi tải báo cáo analytics", err));
  }, [filterMonth, filterYear]);

  // Calculations
  const totalPosts = reports.length;
  const totalReach = reports.reduce((acc, r) => acc + (parseInt(r.reach) || 0), 0);
  const totalFb = reports.filter(r => r.platform === 'Facebook').length;
  const totalYt = reports.filter(r => r.platform === 'YouTube').length;
  const totalTt = reports.filter(r => r.platform === 'TikTok').length;
  const sharedCount = reports.filter(r => r.isShared).length;

  const fbReach = reports.filter(r => r.platform === 'Facebook').reduce((acc, r) => acc + (parseInt(r.reach) || 0), 0);
  const ytReach = reports.filter(r => r.platform === 'YouTube').reduce((acc, r) => acc + (parseInt(r.reach) || 0), 0);
  const ttReach = reports.filter(r => r.platform === 'TikTok').reduce((acc, r) => acc + (parseInt(r.reach) || 0), 0);

  const maxReach = Math.max(fbReach, ytReach, ttReach, 1);

  return (
    <Layout>
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Phân Tích & Biểu Đồ (Lark BI)</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Báo cáo trực quan • Xu hướng tương tác • So sánh hiệu suất đa nền tảng</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 font-bold text-xs">
          <select 
            value={filterMonth} 
            onChange={e => setFilterMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-800"
          >
            {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
          </select>
          <select 
            value={filterYear} 
            onChange={e => setFilterYear(Number(e.target.value))}
            className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-800"
          >
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Tổng Bài Đăng</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{totalPosts} <span className="text-xs text-slate-400 font-bold">nội dung</span></div>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center font-black text-xl">📊</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Tổng Lượt Reach / Views</div>
            <div className="text-3xl font-black text-emerald-600 mt-1">{totalReach.toLocaleString()}</div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">📈</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Tỷ Lệ Đã Share</div>
            <div className="text-3xl font-black text-indigo-600 mt-1">{totalPosts > 0 ? Math.round((sharedCount / totalPosts) * 100) : 0}%</div>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">🚀</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Nền Tảng Dẫn Đầu</div>
            <div className="text-2xl font-black text-red-600 mt-1">
              {fbReach >= ytReach && fbReach >= ttReach ? '📘 Facebook' : ytReach >= ttReach ? '🎬 YouTube' : '🎵 TikTok'}
            </div>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-xl">🔥</div>
        </div>
      </div>

      {/* BIỂU ĐỒ 1: SO SÁNH REACH THEO NỀN TẢNG (BAR CHART) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h2 className="font-black text-base text-slate-900">So Sánh Lượt Tiếp Cận (Reach) Giữa Các Nền Tảng</h2>
            <span className="text-xs text-slate-400 font-bold">Tự động tổng hợp tháng {filterMonth}/{filterYear}</span>
          </div>

          <div className="space-y-5 py-4">
            {/* Facebook Bar */}
            <div>
              <div className="flex justify-between items-center text-xs font-black mb-1.5">
                <span className="text-sky-700 flex items-center gap-1.5"><span>📘</span> Facebook ({totalFb} bài)</span>
                <span className="text-slate-900">{fbReach.toLocaleString()} Reach ({Math.round((fbReach/Math.max(totalReach,1))*100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-sky-500 h-4 rounded-full transition-all duration-700" style={{ width: `${(fbReach / maxReach) * 100}%` }}></div>
              </div>
            </div>

            {/* YouTube Bar */}
            <div>
              <div className="flex justify-between items-center text-xs font-black mb-1.5">
                <span className="text-red-700 flex items-center gap-1.5"><span>🎬</span> YouTube ({totalYt} video)</span>
                <span className="text-slate-900">{ytReach.toLocaleString()} Views ({Math.round((ytReach/Math.max(totalReach,1))*100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-red-500 h-4 rounded-full transition-all duration-700" style={{ width: `${(ytReach / maxReach) * 100}%` }}></div>
              </div>
            </div>

            {/* TikTok Bar */}
            <div>
              <div className="flex justify-between items-center text-xs font-black mb-1.5">
                <span className="text-slate-900 flex items-center gap-1.5"><span>🎵</span> TikTok ({totalTt} video)</span>
                <span className="text-slate-900">{ttReach.toLocaleString()} Views ({Math.round((ttReach/Math.max(totalReach,1))*100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-slate-950 h-4 rounded-full transition-all duration-700" style={{ width: `${(ttReach / maxReach) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* BIỂU ĐỒ 2: PHÂN BỔ SỐ LƯỢNG NỘI DUNG (PIE / DONUT BREAKDOWN) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-black text-base text-slate-900">Phân Bổ Tỷ Lệ Nội Dung</h2>
          </div>

          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="w-36 h-36 rounded-full border-8 border-sky-500 flex items-center justify-center p-2 text-center bg-slate-50 shadow-inner">
              <div>
                <div className="text-2xl font-black text-slate-900">{totalPosts}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Bài Viết</div>
              </div>
            </div>

            <div className="w-full space-y-2 text-xs font-bold">
              <div className="flex justify-between items-center p-2 rounded-xl bg-sky-50 text-sky-800">
                <span>📘 Facebook</span>
                <span>{totalFb} bài ({totalPosts > 0 ? Math.round((totalFb/totalPosts)*100) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-red-50 text-red-800">
                <span>🎬 YouTube</span>
                <span>{totalYt} video ({totalPosts > 0 ? Math.round((totalYt/totalPosts)*100) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-slate-100 text-slate-800">
                <span>🎵 TikTok</span>
                <span>{totalTt} video ({totalPosts > 0 ? Math.round((totalTt/totalPosts)*100) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
