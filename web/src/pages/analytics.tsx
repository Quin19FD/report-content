import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function Analytics() {
  const [reports, setReports] = useState<any[]>([]);
  const [prevReports, setPrevReports] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetch(`/api/reports?filterType=MONTH&month=${filterMonth}&year=${filterYear}`)
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(err => console.error("Lỗi tải báo cáo analytics", err));

    // Tháng trước
    const pm = filterMonth === 1 ? 12 : filterMonth - 1;
    const py = filterMonth === 1 ? filterYear - 1 : filterYear;
    fetch(`/api/reports?filterType=MONTH&month=${pm}&year=${py}`)
      .then(res => res.json())
      .then(data => setPrevReports(data))
      .catch(() => setPrevReports([]));
  }, [filterMonth, filterYear]);

  // Calculations
  const totalPosts = reports.length;
  const totalReach = reports.reduce((acc, r) => acc + (parseInt(r.reach) || 0), 0);
  const prevReach = prevReports.reduce((acc, r) => acc + (parseInt(r.reach) || 0), 0);
  const reachDiff = prevReach > 0 ? Math.round(((totalReach - prevReach) / prevReach) * 100) : (totalReach > 0 ? 100 : 0);
  const prevPosts = prevReports.length;
  const postDiff = prevPosts > 0 ? Math.round(((totalPosts - prevPosts) / prevPosts) * 100) : (totalPosts > 0 ? 100 : 0);

  const totalFb = reports.filter(r => r.platform === 'Facebook').length;
  const totalYt = reports.filter(r => r.platform === 'YouTube').length;
  const totalTt = reports.filter(r => r.platform === 'TikTok').length;
  const sharedCount = reports.filter(r => r.isShared).length;
  const viralCount = reports.filter(r => (parseInt(r.reach) || 0) >= 10000).length;

  const fbReach = reports.filter(r => r.platform === 'Facebook').reduce((acc, r) => acc + (parseInt(r.reach) || 0), 0);
  const ytReach = reports.filter(r => r.platform === 'YouTube').reduce((acc, r) => acc + (parseInt(r.reach) || 0), 0);
  const ttReach = reports.filter(r => r.platform === 'TikTok').reduce((acc, r) => acc + (parseInt(r.reach) || 0), 0);
  const maxReach = Math.max(fbReach, ytReach, ttReach, 1);

  // Line chart: tổng reach theo ngày trong tháng
  const dayMap = new Map<string, number>();
  reports.forEach(r => {
    const d = r.date || '';
    dayMap.set(d, (dayMap.get(d) || 0) + (parseInt(r.reach) || 0));
  });
  const daysInMonth = new Date(filterYear, filterMonth, 0).getDate();
  const daySeries = Array.from({ length: daysInMonth }, (_, i) => {
    const dd = String(i + 1).padStart(2, '0');
    const mm = String(filterMonth).padStart(2, '0');
    return { day: i + 1, reach: dayMap.get(`${filterYear}-${mm}-${dd}`) || 0 };
  });
  const maxDayReach = Math.max(...daySeries.map(d => d.reach), 1);
  const chartW = 1000, chartH = 200, padX = 30, padY = 20;
  const x = (day: number) => padX + ((day - 1) / Math.max(daysInMonth - 1, 1)) * (chartW - padX * 2);
  const y = (reach: number) => chartH - padY - (reach / maxDayReach) * (chartH - padY * 2);
  const linePath = daySeries.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(d.day)} ${y(d.reach)}`).join(' ');
  const areaPath = `${linePath} L ${x(daysInMonth)} ${chartH - padY} L ${x(1)} ${chartH - padY} Z`;

  const monthLabel = `Tháng ${filterMonth}/${filterYear}`;
  const prevLabel = filterMonth === 1 ? `Tháng 12/${filterYear - 1}` : `Tháng ${filterMonth - 1}/${filterYear}`;

  return (
    <Layout>
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dashboard Phân Tích & Biểu Đồ</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">So sánh tháng • Xu hướng ngày • Hiệu suất đa nền tảng</p>
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
            <div className="text-3xl font-black text-slate-900 mt-1">{totalPosts}</div>
            <div className={`text-xs font-black mt-1 ${postDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {postDiff >= 0 ? '▲' : '▼'} {Math.abs(postDiff)}% vs {prevLabel}
            </div>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center font-black text-xl">📊</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Tổng Reach / Views</div>
            <div className="text-3xl font-black text-emerald-600 mt-1">{totalReach.toLocaleString()}</div>
            <div className={`text-xs font-black mt-1 ${reachDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {reachDiff >= 0 ? '▲' : '▼'} {Math.abs(reachDiff)}% vs {prevLabel} ({prevReach.toLocaleString()})
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">📈</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Bài Viral (≥10k)</div>
            <div className="text-3xl font-black text-amber-600 mt-1">{viralCount}</div>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-xl">🔥</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Tỷ Lệ Đã Share</div>
            <div className="text-3xl font-black text-indigo-600 mt-1">{totalPosts > 0 ? Math.round((sharedCount / totalPosts) * 100) : 0}%</div>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">🚀</div>
        </div>
      </div>

      {/* LINE CHART: xu hướng reach theo ngày */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-wrap gap-x-2 gap-y-1 justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <h2 className="font-black text-base text-slate-900">Xu Hướng Reach/Views Theo Ngày — {monthLabel}</h2>
          <span className="text-xs text-slate-400 font-bold">Đỉnh: {maxDayReach.toLocaleString()} reach</span>
        </div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-56">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1={padX} x2={chartW - padX} y1={chartH - padY - f * (chartH - padY * 2)} y2={chartH - padY - f * (chartH - padY * 2)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
          ))}
          <path d={areaPath} fill="url(#areaGrad)" />
          <path d={linePath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {daySeries.map(d => d.reach > 0 && (
            <circle key={d.day} cx={x(d.day)} cy={y(d.reach)} r={d.reach === maxDayReach ? 5 : 3} fill={d.reach === maxDayReach ? '#f59e0b' : '#0284c7'}>
              <title>{`Ngày ${d.day}: ${d.reach.toLocaleString()} reach`}</title>
            </circle>
          ))}
          {/* Labels trục ngày */}
          {daySeries.filter(d => d.day === 1 || d.day % 5 === 0).map(d => (
            <text key={d.day} x={x(d.day)} y={chartH - 4} textAnchor="middle" fontSize="11" fill="#94a3b8">{d.day}</text>
          ))}
          <text x={padX} y={padY - 6} fontSize="11" fill="#94a3b8">{maxDayReach.toLocaleString()}</text>
        </svg>
      </div>

      {/* BAR CHART + DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-x-2 gap-y-1 justify-between items-center pb-3 border-b border-slate-100">
            <h2 className="font-black text-base text-slate-900">So Sánh Reach Giữa Các Nền Tảng</h2>
            <span className="text-xs text-slate-400 font-bold">{monthLabel}</span>
          </div>

          <div className="space-y-5 py-4">
            <div>
              <div className="flex justify-between items-center text-xs font-black mb-1.5">
                <span className="text-sky-700 flex items-center gap-1.5"><span>📘</span> Facebook ({totalFb} bài)</span>
                <span className="text-slate-900">{fbReach.toLocaleString()} ({Math.round((fbReach/Math.max(totalReach,1))*100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-sky-500 h-4 rounded-full transition-all duration-700" style={{ width: `${(fbReach / maxReach) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-black mb-1.5">
                <span className="text-red-700 flex items-center gap-1.5"><span>🎬</span> YouTube ({totalYt} video)</span>
                <span className="text-slate-900">{ytReach.toLocaleString()} ({Math.round((ytReach/Math.max(totalReach,1))*100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-red-500 h-4 rounded-full transition-all duration-700" style={{ width: `${(ytReach / maxReach) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-black mb-1.5">
                <span className="text-slate-900 flex items-center gap-1.5"><span>🎵</span> TikTok ({totalTt} video)</span>
                <span className="text-slate-900">{ttReach.toLocaleString()} ({Math.round((ttReach/Math.max(totalReach,1))*100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-slate-950 h-4 rounded-full transition-all duration-700" style={{ width: `${(ttReach / maxReach) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-black text-base text-slate-900">Phân Bổ Nội Dung</h2>
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
                <span>{totalFb} ({totalPosts > 0 ? Math.round((totalFb/totalPosts)*100) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-red-50 text-red-800">
                <span>🎬 YouTube</span>
                <span>{totalYt} ({totalPosts > 0 ? Math.round((totalYt/totalPosts)*100) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-slate-100 text-slate-800">
                <span>🎵 TikTok</span>
                <span>{totalTt} ({totalPosts > 0 ? Math.round((totalTt/totalPosts)*100) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
