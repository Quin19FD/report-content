import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

interface PlanRow {
  id: number;
  task: string;
  progress: string;
  status: string;
  note: string;
}

export default function Plan() {
  const [rows, setRows] = useState<PlanRow[]>([
    { id: Date.now(), task: '', progress: '0', status: 'Planning', note: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(data);
        } else if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Compatibility fallback for older data format
          const convertedRows: PlanRow[] = [];
          if (data.objectives) {
            convertedRows.push({ id: 1, task: data.objectives, progress: '50', status: 'In Progress', note: 'Mục tiêu chính' });
          }
          if (Array.isArray(data.tasks)) {
            data.tasks.forEach((t: string, idx: number) => {
              convertedRows.push({ id: idx + 2, task: t, progress: '0', status: 'Planning', note: '' });
            });
          }
          if (convertedRows.length > 0) setRows(convertedRows);
        }
      })
      .catch(err => console.error("Lỗi tải kế hoạch", err));
  }, []);

  const savePlan = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/plans', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(rows)
      });
      showToast("💾 Đã lưu kế hoạch tháng vĩnh viễn!");
    } catch (err) {
      alert("Lỗi lưu kế hoạch: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const updateRow = (id: number, field: keyof PlanRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    setRows([...rows, { id: Date.now(), task: '', progress: '0', status: 'Planning', note: '' }]);
    showToast("➕ Đã thêm dòng mới vào bảng kế hoạch!");
  };

  const deleteRow = (id: number) => {
    if (rows.length <= 1) {
      return setRows([{ id: Date.now(), task: '', progress: '0', status: 'Planning', note: '' }]);
    }
    setRows(rows.filter(r => r.id !== id));
  };

  const exportToExcel = () => {
    const csvContent = [
      ["STT", "Mục Tiêu / Cột Mốc", "Tiến Độ (%)", "Trạng Thái", "Ghi Chú"],
      ...rows.map((r, i) => [
        (i + 1).toString(),
        `"${r.task.replace(/"/g, '""')}"`,
        `"${r.progress}"`,
        `"${r.status}"`,
        `"${r.note.replace(/"/g, '""')}"`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Monthly_Plan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast("📊 Đã xuất file Excel (.csv) thành công!");
  };

  // Overall Month Progress Calculation
  const totalProgressSum = rows.reduce((acc, curr) => acc + (parseInt(curr.progress) || 0), 0);
  const avgProgress = rows.length > 0 ? Math.round(totalProgressSum / rows.length) : 0;
  const completedTasks = rows.filter(r => r.status === 'Done').length;

  return (
    <Layout>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-bounce">
          <span className="text-emerald-400 font-bold">✨</span>
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kế Hoạch Chiến Lược Tháng (Monthly Grid)</h1>
          <p className="text-slate-500 text-sm mt-1">Giao diện nhập liệu dạng bảng Excel • Tự động tính toán tiến độ</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel} 
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-3 rounded-2xl font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 text-sm"
          >
            <span>📊</span>
            <span>Xuất File Excel</span>
          </button>
          <button 
            onClick={savePlan} 
            disabled={isSaving}
            className="bg-sky-600 hover:bg-sky-700 active:scale-95 text-white px-6 py-3 rounded-2xl font-bold transition shadow-lg shadow-sky-600/20 flex items-center gap-2 text-sm"
          >
            <span>💾</span>
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Bảng Kế Hoạch'}</span>
          </button>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Tổng Số Mục Tiêu</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{rows.length}</div>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl font-bold text-xl">📋</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Đã Hoàn Thành</div>
            <div className="text-3xl font-black text-emerald-600 mt-1">{completedTasks} / {rows.length}</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-xl">✅</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Tiến Độ Trung Bình Tháng</span>
            <span className="text-sm font-black text-sky-600">{avgProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mt-2 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, avgProgress))}%` }}></div>
          </div>
        </div>
      </div>

      {/* Grid Table Input */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <h2 className="font-black text-lg text-slate-900">Bảng Nhập Liệu Mục Tiêu & Cột Mốc Tháng</h2>
          <span className="text-xs text-slate-400 font-medium">Click vào ô bất kỳ để chỉnh sửa trực tiếp</span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-3 px-3">
          <div className="col-span-4">Mục Tiêu / Cột Mốc</div>
          <div className="col-span-2">Tiến Độ (%)</div>
          <div className="col-span-2">Trạng Thái</div>
          <div className="col-span-3">Ghi Chú Chi Tiết</div>
          <div className="col-span-1 text-right">Xóa</div>
        </div>
        
        {/* Rows */}
        <div className="space-y-3">
            {rows.map((r, i) => (
                <div key={r.id} className="grid grid-cols-12 gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 hover:bg-slate-100/80 transition items-center">
                    {/* Task */}
                    <div className="col-span-4 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                      <input 
                        className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-sky-500" 
                        value={r.task} 
                        onChange={e => updateRow(r.id, 'task', e.target.value)} 
                        placeholder="Nhập mục tiêu chiến lược..." 
                      />
                    </div>

                    {/* Progress */}
                    <div className="col-span-2 flex items-center gap-2">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-bold bg-white text-center focus:ring-2 focus:ring-sky-500" 
                        value={r.progress} 
                        onChange={e => updateRow(r.id, 'progress', e.target.value)} 
                        placeholder="0" 
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>

                    {/* Status Select */}
                    <div className="col-span-2">
                      <select 
                        className={`w-full border p-2.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                          r.status === 'Done' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          r.status === 'In Progress' ? 'bg-sky-50 border-sky-200 text-sky-700' :
                          'bg-amber-50 border-amber-200 text-amber-700'
                        }`} 
                        value={r.status} 
                        onChange={e => updateRow(r.id, 'status', e.target.value)}
                      >
                        <option value="Planning">⏳ Planning (Đang lên KH)</option>
                        <option value="In Progress">🔄 In Progress (Đang thực hiện)</option>
                        <option value="Done">✅ Done (Hoàn thành)</option>
                      </select>
                    </div>

                    {/* Note */}
                    <div className="col-span-3">
                      <input 
                        className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-sky-500" 
                        value={r.note} 
                        onChange={e => updateRow(r.id, 'note', e.target.value)} 
                        placeholder="Ghi chú chi tiết..." 
                      />
                    </div>

                    {/* Action */}
                    <div className="col-span-1 text-right">
                      <button 
                        type="button"
                        onClick={() => deleteRow(r.id)} 
                        className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition inline-flex items-center justify-center text-sm"
                        title="Xóa dòng này"
                      >
                        ✕
                      </button>
                    </div>
                </div>
            ))}
        </div>
        
        <button 
          type="button"
          onClick={addRow} 
          className="mt-5 w-full border-2 border-dashed border-sky-300 hover:border-sky-500 p-4 rounded-2xl text-sky-600 hover:bg-sky-50 font-bold transition flex items-center justify-center gap-2 text-sm"
        >
          <span>➕</span>
          <span>Thêm Dòng Mục Tiêu Mới</span>
        </button>
      </div>
    </Layout>
  );
}
