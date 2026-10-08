import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface PlanRow {
  id: number;
  task: string;
  category: string;
  targetReach: string;
  progress: string;
  status: string;
  deadline: string;
  note: string;
}

export default function Plan() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeView, setActiveView] = useState<'SPLIT' | 'GRID' | 'KANBAN'>('SPLIT');

  const [rows, setRows] = useState<PlanRow[]>([
    { id: 1, task: 'Phát triển chuỗi Shorts/Reels viral', category: 'Nội Dung', targetReach: '100000', progress: '40', status: 'In Progress', deadline: '2026-09-15', note: 'Tập trung 3s đầu' },
    { id: 2, task: 'Tối ưu lại nhóm Facebook hợp tác', category: 'Kênh & Nhóm', targetReach: '50000', progress: '10', status: 'Planning', deadline: '2026-09-20', note: 'Gửi đề xuất quản trị' },
    { id: 3, task: 'Báo cáo hiệu suất tháng trước', category: 'Báo Cáo', targetReach: '0', progress: '100', status: 'Done', deadline: '2026-09-05', note: 'Đã tổng hợp file PDF' },
  ]);

  // Form State for Adding/Editing Plan
  const [form, setForm] = useState<PlanRow>({
    id: 0,
    task: '',
    category: 'Nội Dung',
    targetReach: '10000',
    progress: '0',
    status: 'Planning',
    deadline: '',
    note: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = () => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRows(data.map(item => ({
            ...item,
            category: item.category || 'Nội Dung',
            targetReach: item.targetReach || '0',
            deadline: item.deadline || ''
          })));
        }
      })
      .catch(err => console.error("Lỗi tải kế hoạch", err));
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const savePlanToBackend = async (newRows: PlanRow[]) => {
    setIsSaving(true);
    try {
      await fetch('/api/plans', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newRows)
      });
      showToast("💾 Đã lưu kế hoạch tháng thành công!");
    } catch (err) {
      alert("Lỗi lưu kế hoạch: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.task) return alert("Vui lòng nhập Tên Mục Tiêu / Nhiệm Vụ!");

    let updatedRows: PlanRow[];
    if (editingId) {
      updatedRows = rows.map(r => r.id === editingId ? { ...form, id: editingId } : r);
      showToast("🎉 Đã cập nhật mục tiêu!");
    } else {
      const newRow = { ...form, id: Date.now() };
      updatedRows = [...rows, newRow];
      showToast("🎉 Đã thêm mục tiêu mới vào kế hoạch!");
    }

    setRows(updatedRows);
    savePlanToBackend(updatedRows);

    // Reset Form
    setForm({
      id: 0,
      task: '',
      category: 'Nội Dung',
      targetReach: '10000',
      progress: '0',
      status: 'Planning',
      deadline: '',
      note: ''
    });
    setEditingId(null);
  };

  const startEdit = (row: PlanRow) => {
    setForm(row);
    setEditingId(row.id);
    showToast("✏️ Đã tải thông tin lên Form chỉnh sửa!");
  };

  const updateRowInline = (id: number, field: keyof PlanRow, value: string) => {
    const updated = rows.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRows(updated);
    savePlanToBackend(updated);
  };

  const moveTaskStatus = (id: number, newStatus: string, newProgress?: string) => {
    const updated = rows.map(r => {
      if (r.id !== id) return r;
      const prog = newProgress !== undefined ? newProgress : (newStatus === 'Done' ? '100' : newStatus === 'In Progress' && r.progress === '0' ? '30' : r.progress);
      return { ...r, status: newStatus, progress: prog };
    });
    setRows(updated);
    savePlanToBackend(updated);
    showToast(`⚡ Đã chuyển mục tiêu sang "${newStatus}"!`);
  };

  const deleteRow = (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa mục tiêu này?")) return;
    const updated = rows.filter(r => r.id !== id);
    setRows(updated.length > 0 ? updated : [{ id: Date.now(), task: '', category: 'Nội Dung', targetReach: '0', progress: '0', status: 'Planning', deadline: '', note: '' }]);
    savePlanToBackend(updated);
    showToast("🗑️ Đã xóa mục tiêu!");
  };

  const exportToExcel = () => {
    const csvContent = [
      ["STT", "Hạng Mục", "Nhiệm Vụ / Cột Mốc", "Target Reach", "Tiến Độ (%)", "Trạng Thái", "Deadline", "Ghi Chú Chi Tiết"],
      ...rows.map((r, i) => [
        (i + 1).toString(),
        `"${r.category}"`,
        `"${r.task.replace(/"/g, '""')}"`,
        `"${r.targetReach}"`,
        `"${r.progress}"`,
        `"${r.status}"`,
        `"${r.deadline}"`,
        `"${r.note.replace(/"/g, '""')}"`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Ke_Hoach_Thang_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast("📊 Đã xuất file Excel (.csv) thành công!");
  };

  // Deadline warning: hạn ≤ 3 ngày tới, chưa xong, tiến độ < 50%
  const daysUntil = (deadline: string) => {
    if (!deadline) return Infinity;
    const diff = new Date(deadline + 'T23:59:59').getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };
  const isUrgent = (r: PlanRow) => r.status !== 'Done' && daysUntil(r.deadline) <= 3 && (parseInt(r.progress) || 0) < 50;
  const urgentRows = rows.filter(isUrgent);

  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    try {
      const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf';
      const res = await fetch(fontUrl);
      const buffer = await res.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      doc.addFileToVFS("Roboto-Regular.ttf", base64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.setFont("Roboto");
    } catch (err) { console.warn("Fallback font", err); }

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text(`CONTENTFLOW CRM - KẾ HOẠCH CHIẾN LƯỢC THÁNG ${selectedMonth}/${selectedYear}`, 14, 13);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Tổng: ${rows.length} mục tiêu | Hoàn thành: ${completedTasks}/${rows.length} | Tiến độ TB: ${avgProgress}% | Target Reach: ${totalTargetReach.toLocaleString()}`, 14, 22);

    const tableData = rows.map((r, i) => [
      (i + 1).toString(),
      r.category,
      (isUrgent(r) ? '[CẢNH BÁO] ' : '') + (r.task || '--'),
      (parseInt(r.targetReach) || 0).toLocaleString(),
      `${r.progress}%`,
      r.status,
      r.deadline || '--',
      r.note || '--'
    ]);

    autoTable(doc, {
      head: [["STT", "Hạng Mục", "Nhiệm Vụ / Cột Mốc", "Target Reach", "Tiến Độ", "Trạng Thái", "Deadline", "Ghi Chú"]],
      body: tableData,
      startY: 36,
      theme: 'grid',
      styles: { font: 'Roboto', fontSize: 8.5, cellPadding: 3.5, valign: 'middle', overflow: 'linebreak', lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'normal', halign: 'center', fontSize: 9 },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section === 'body' && String(data.cell.raw).startsWith('[CẢNH BÁO]')) {
          data.cell.styles.textColor = [185, 28, 28];
        }
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`ContentFlow CRM • Kế hoạch tháng ${selectedMonth}/${selectedYear}  |  Trang ${data.pageNumber}`, 14, 202);
      }
    });

    doc.save(`Ke_Hoach_Thang_${selectedMonth}_${selectedYear}.pdf`);
    showToast('📄 Đã xuất PDF Kế Hoạch Tháng!');
  };

  const totalProgressSum = rows.reduce((acc, curr) => acc + (parseInt(curr.progress) || 0), 0);
  const avgProgress = rows.length > 0 ? Math.round(totalProgressSum / rows.length) : 0;
  const completedTasks = rows.filter(r => r.status === 'Done').length;
  const inProgressTasks = rows.filter(r => r.status === 'In Progress').length;
  const planningTasks = rows.filter(r => r.status === 'Planning').length;
  const totalTargetReach = rows.reduce((acc, curr) => acc + (parseInt(curr.targetReach) || 0), 0);

  return (
    <Layout>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-700 flex items-center gap-3 animate-bounce text-sm font-bold">
          <span className="text-emerald-300">✨</span>
          <span>{toast}</span>
        </div>
      )}

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-emerald-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Kế Hoạch Chiến Lược Tháng</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Nhập chi tiết mục tiêu • Quản lý Form & Bảng Excel / Kanban • Tự động lưu</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Switcher: Split vs Grid vs Kanban */}
          <div className="flex bg-white p-1 rounded-2xl border border-emerald-100 shadow-xs font-extrabold text-xs">
            <button 
              onClick={() => setActiveView('SPLIT')} 
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${activeView === 'SPLIT' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-black' : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50/60'}`}
            >
              <span>✍️</span> Form & Bảng
            </button>
            <button 
              onClick={() => setActiveView('GRID')} 
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${activeView === 'GRID' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-black' : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50/60'}`}
            >
              <span>📊</span> Grid Excel
            </button>
            <button 
              onClick={() => setActiveView('KANBAN')} 
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${activeView === 'KANBAN' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-black' : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50/60'}`}
            >
              <span>📌</span> Kanban
            </button>
          </div>
          {/* Month/Year Selectors */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold text-xs">
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))} 
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800"
            >
              {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))} 
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800"
            >
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          </div>

          <button 
            onClick={exportToPDF} 
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-black transition text-xs shadow flex items-center gap-1.5"
          >
            <span>📄</span> Xuất PDF
          </button>
          <button 
            onClick={exportToExcel} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black transition text-xs shadow flex items-center gap-1.5"
          >
            <span>📥</span> Xuất Excel
          </button>
        </div>
      </div>

      {/* URGENT DEADLINE WARNING BANNER */}
      {urgentRows.length > 0 && (
        <div className="bg-rose-50 border-2 border-dashed border-rose-300 p-4 rounded-2xl mb-6">
          <h3 className="font-black text-sm text-rose-800 mb-2 flex items-center gap-1.5">
            <span>🚨</span> Cảnh Báo Deadline Sắp Tới ({urgentRows.length} mục — hạn ≤ 3 ngày nhưng tiến độ &lt; 50%)
          </h3>
          <div className="space-y-1.5">
            {urgentRows.map(r => (
              <div key={r.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-rose-100 text-xs font-bold">
                <span className="text-slate-900">• {r.task || '(Chưa đặt tên)'} <span className="text-slate-400">({r.category})</span></span>
                <span className="text-rose-700">📅 Hạn: {r.deadline} (còn {daysUntil(r.deadline)} ngày) — Tiến độ {r.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DASHBOARD METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Tổng Số Mục Tiêu</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{rows.length} <span className="text-xs text-slate-400 font-bold">nhiệm vụ</span></div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-black text-xl border border-emerald-100">📋</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Đã Hoàn Thành</div>
            <div className="text-3xl font-black text-emerald-600 mt-1">{completedTasks} / {rows.length}</div>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center font-black text-xl border border-emerald-200">✅</div>
        </div>

        <div className="bg-gradient-to-tr from-emerald-50/90 via-white to-teal-50/50 p-5 rounded-3xl border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">Target Reach Tháng</div>
            <div className="text-2xl font-black text-emerald-950 mt-1">{totalTargetReach.toLocaleString()}</div>
          </div>
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md shadow-emerald-600/20">🎯</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-2xs flex flex-col justify-center">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Tiến Độ Trung Bình</span>
            <span className="text-sm font-black text-emerald-700">{avgProgress}%</span>
          </div>
          <div className="w-full bg-emerald-50 rounded-full h-3 overflow-hidden border border-emerald-100/60">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, avgProgress))}%` }}></div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: FORM & SPLIT VIEW (GIAO DIỆN NHẬP CHI TIẾT) */}
      {activeView === 'SPLIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* FORM NHẬP CHI TIẾT MỤC TIÊU BÊN TRÁI (5 COLS) */}
          <form onSubmit={handleFormSubmit} className="lg:col-span-5 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-950/5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <h2 className="font-black text-base text-slate-900 flex items-center gap-2">
                <span className="text-lg">✍️</span> 
                <span>{editingId ? 'Chỉnh Sửa Mục Tiêu' : 'Nhập Chi Tiết Mục Tiêu Mới'}</span>
              </h2>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({ id: 0, task: '', category: 'Nội Dung', targetReach: '10000', progress: '0', status: 'Planning', deadline: '', note: '' }); }} className="text-xs text-slate-500 hover:text-slate-800 underline font-bold">
                  Hủy
                </button>
              )}
            </div>

            {/* Hạng mục */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Hạng Mục Kế Hoạch</label>
              <select 
                className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900 bg-white"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                <option value="Nội Dung">📹 Nội Dung (Shorts/Reels/Video)</option>
                <option value="Kênh & Nhóm">📘 Kênh & Nhóm Facebook/YT/TikTok</option>
                <option value="Báo Cáo">📊 Báo Cáo & Số Liệu</option>
                <option value="Tương Tác">💬 Tương Tác & Chăm Sóc</option>
                <option value="Khác">⚙️ Nhiệm Vụ Khác</option>
              </select>
            </div>

            {/* Tên Mục tiêu / Nhiệm vụ */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Mục Tiêu / Nhiệm Vụ Chi Tiết (*)</label>
              <input 
                className="w-full border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500" 
                placeholder="Nhập tên nhiệm vụ hoặc cột mốc chiến lược..." 
                value={form.task} 
                onChange={e => setForm({ ...form, task: e.target.value })} 
                required
              />
            </div>

            {/* Target Reach & Deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Target Reach (Mục tiêu)</label>
                <input 
                  type="number" 
                  className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900" 
                  placeholder="Lượt tiếp cận..." 
                  value={form.targetReach} 
                  onChange={e => setForm({ ...form, targetReach: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Hạn Chót (Deadline)</label>
                <input 
                  type="date" 
                  className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 bg-white" 
                  value={form.deadline} 
                  onChange={e => setForm({ ...form, deadline: e.target.value })} 
                />
              </div>
            </div>

            {/* Progress % & Status Select */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">Tiến Độ (%)</label>
                  <span className="text-xs font-black text-sky-600">{form.progress}%</span>
                </div>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  className="w-full border border-slate-200 p-3 rounded-xl text-sm font-black text-slate-900 text-center" 
                  value={form.progress} 
                  onChange={e => setForm({ ...form, progress: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Trạng Thái</label>
                <select 
                  className="w-full border border-slate-200 p-3 rounded-xl text-sm font-black text-slate-900 bg-white"
                  value={form.status}
                  onChange={e => {
                    const st = e.target.value;
                    setForm({ ...form, status: st, progress: st === 'Done' ? '100' : form.progress });
                  }}
                >
                  <option value="Planning">⏳ Planning (Đang KH)</option>
                  <option value="In Progress">🔄 In Progress (Đang làm)</option>
                  <option value="Done">✅ Done (Hoàn thành)</option>
                </select>
              </div>
            </div>

            {/* Ghi chú chi tiết */}
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Ghi Chú Chi Tiết</label>
              <textarea 
                className="w-full border border-slate-200 p-3 rounded-xl text-sm font-medium text-slate-900 h-24 focus:ring-2 focus:ring-sky-500" 
                placeholder="Nhập ghi chú chi tiết, lưu ý hoặc đề xuất..." 
                value={form.note} 
                onChange={e => setForm({ ...form, note: e.target.value })}
              ></textarea>
            </div>

            <button 
              type="submit" 
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black rounded-2xl text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              {editingId ? 'Cập Nhật Mục Tiêu' : 'Lưu Mục Tiêu Mới'}
            </button>
          </form>

          {/* DANH SÁCH BẢNG KẾ HOẠCH BÊN PHẢI (7 COLS) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-950/5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-emerald-100">
              <h2 className="font-black text-base text-slate-900">Danh Sách Mục Tiêu Tháng ({rows.length})</h2>
              <span className="text-xs text-slate-400 font-bold">Bấm nút Sửa để tải lên Form</span>
            </div>

            <div className="max-h-[520px] overflow-auto pr-1">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="sticky top-0 bg-emerald-50/90 backdrop-blur-xs shadow-2xs z-10">
                  <tr className="border-b border-emerald-100 text-emerald-950 font-black uppercase text-[11px]">
                    <th className="py-2.5 px-2">Hạng mục</th>
                    <th className="px-2">Nhiệm vụ</th>
                    <th className="px-2">Target</th>
                    <th className="px-2 text-center">Tiến độ</th>
                    <th className="px-2">Trạng thái</th>
                    <th className="text-right px-2">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold text-sm">
                        Chưa có mục tiêu nào trong kế hoạch tháng này.
                      </td>
                    </tr>
                  ) : rows.map(r => (
                    <tr key={r.id} className="border-b border-emerald-50/70 hover:bg-emerald-50/40 transition">
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-slate-100 text-slate-700">
                          {r.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-900 text-xs">
                        {r.task || '--'}
                        {r.note && <p className="text-[11px] text-slate-400 font-medium truncate max-w-[160px]">{r.note}</p>}
                      </td>
                      <td className="py-3 px-2 font-extrabold text-emerald-800 text-xs">{parseInt(r.targetReach || '0').toLocaleString()}</td>
                      <td className="py-3 px-2 text-center font-black text-emerald-700 text-xs">{r.progress}%</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                          r.status === 'Done' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          r.status === 'In Progress' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(r)} className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/60 px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer">Sửa</button>
                          <button onClick={() => deleteRow(r.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer">Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW MODE 2: EXCEL GRID VIEW */}
      {activeView === 'GRID' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h2 className="font-black text-base text-slate-900">Bảng Nhập Liệu Trực Tiếp (Excel Grid)</h2>
            <span className="text-xs text-sky-600 font-extrabold">💡 Chỉnh sửa ô trực tiếp trong bảng</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-black uppercase text-xs">
                  <th className="py-3 px-1 w-10 text-center">STT</th>
                  <th className="px-2 w-36">Hạng Mục</th>
                  <th className="px-2 w-72">Mục Tiêu / Nhiệm Vụ</th>
                  <th className="px-2 w-32">Target Reach</th>
                  <th className="px-2 w-28 text-center">Tiến Độ (%)</th>
                  <th className="px-2 w-44">Trạng Thái</th>
                  <th className="px-2 w-36">Deadline</th>
                  <th className="px-2">Ghi Chú Chi Tiết</th>
                  <th className="text-right px-2 w-12">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-1 font-bold text-center text-slate-400 text-xs">{i + 1}</td>
                    
                    <td className="py-2.5 px-2">
                      <select 
                        className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-800 bg-white"
                        value={r.category}
                        onChange={e => updateRowInline(r.id, 'category', e.target.value)}
                      >
                        <option value="Nội Dung">📹 Nội Dung</option>
                        <option value="Kênh & Nhóm">📘 Kênh & Nhóm</option>
                        <option value="Báo Cáo">📊 Báo Cáo</option>
                        <option value="Tương Tác">💬 Tương Tác</option>
                        <option value="Khác">⚙️ Khác</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-2">
                      <input 
                        className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500" 
                        value={r.task} 
                        onChange={e => updateRowInline(r.id, 'task', e.target.value)} 
                        placeholder="Nhập nhiệm vụ..." 
                      />
                    </td>

                    <td className="py-2.5 px-2">
                      <input 
                        type="number"
                        className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500" 
                        value={r.targetReach} 
                        onChange={e => updateRowInline(r.id, 'targetReach', e.target.value)} 
                        placeholder="0" 
                      />
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        className="w-full border border-slate-200 p-2 rounded-xl text-xs font-black text-slate-900 text-center focus:ring-2 focus:ring-sky-500" 
                        value={r.progress} 
                        onChange={e => updateRowInline(r.id, 'progress', e.target.value)} 
                      />
                    </td>

                    <td className="py-2.5 px-2">
                      <select 
                        className={`w-full border p-2 rounded-xl text-xs font-black cursor-pointer ${
                          r.status === 'Done' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                          r.status === 'In Progress' ? 'bg-sky-50 border-sky-300 text-sky-700' :
                          'bg-amber-50 border-amber-300 text-amber-700'
                        }`} 
                        value={r.status} 
                        onChange={e => {
                          const newStatus = e.target.value;
                          updateRowInline(r.id, 'status', newStatus);
                          if (newStatus === 'Done') updateRowInline(r.id, 'progress', '100');
                        }}
                      >
                        <option value="Planning">⏳ Planning</option>
                        <option value="In Progress">🔄 In Progress</option>
                        <option value="Done">✅ Done</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-2">
                      <input 
                        type="date"
                        className="w-full border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-800 bg-white" 
                        value={r.deadline} 
                        onChange={e => updateRowInline(r.id, 'deadline', e.target.value)} 
                      />
                    </td>

                    <td className="py-2.5 px-2">
                      <input 
                        className="w-full border border-slate-200 p-2 rounded-xl text-xs font-medium text-slate-700" 
                        value={r.note} 
                        onChange={e => updateRowInline(r.id, 'note', e.target.value)} 
                        placeholder="Ghi chú chi tiết..." 
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <button 
                        type="button"
                        onClick={() => deleteRow(r.id)} 
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 w-7 h-7 rounded-lg font-black text-xs inline-flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: KANBAN BOARD VIEW */}
      {activeView === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CỘT 1: PLANNING */}
          <div className="bg-amber-50/60 p-4 rounded-3xl border border-amber-200/80 space-y-3.5 shadow-2xs">
            <div className="flex justify-between items-center pb-2 border-b border-amber-200/60">
              <h3 className="font-black text-xs text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                <span>⏳</span> Lên Kế Hoạch ({planningTasks})
              </h3>
              <span className="text-[10px] font-bold text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-200">Chuẩn bị</span>
            </div>
            
            <div className="space-y-3">
              {rows.filter(r => r.status === 'Planning').map(r => {
                const isHigh = parseInt(r.targetReach || '0') >= 100000 || daysUntil(r.deadline) <= 3;
                return (
                  <div key={r.id} className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs space-y-2.5 hover:border-amber-300 transition">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{r.category}</span>
                      <div className="flex items-center gap-1">
                        {isHigh && <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">🔥 Gấp</span>}
                        <button onClick={() => deleteRow(r.id)} className="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer">✕</button>
                      </div>
                    </div>
                    <div className="font-black text-sm text-slate-900 leading-snug">{r.task}</div>
                    {r.note && <p className="text-xs text-slate-500 font-medium">{r.note}</p>}
                    <div className="text-xs text-slate-500 font-semibold flex justify-between pt-1">
                      <span>Target: <strong className="text-emerald-700">{parseInt(r.targetReach || '0').toLocaleString()}</strong></span>
                      <span>{r.deadline ? `📅 ${r.deadline}` : ''}</span>
                    </div>
                    {/* 1-click status pill switcher */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-black">
                      <span className="text-amber-800 font-bold">{r.progress}%</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveTaskStatus(r.id, 'In Progress', '30')} className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md transition cursor-pointer">
                          🔄 Đang làm →
                        </button>
                        <button onClick={() => moveTaskStatus(r.id, 'Done', '100')} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md transition cursor-pointer">
                          ✅ Xong
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT 2: IN PROGRESS */}
          <div className="bg-teal-50/50 p-4 rounded-3xl border border-teal-200/80 space-y-3.5 shadow-2xs">
            <div className="flex justify-between items-center pb-2 border-b border-teal-200/60">
              <h3 className="font-black text-xs text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                <span>🔄</span> Đang Triển Khai ({inProgressTasks})
              </h3>
              <span className="text-[10px] font-bold text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200">Đang chạy</span>
            </div>
            
            <div className="space-y-3">
              {rows.filter(r => r.status === 'In Progress').map(r => (
                <div key={r.id} className="bg-white p-4 rounded-2xl border border-teal-100 shadow-2xs space-y-2.5 hover:border-teal-300 transition">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-100">{r.category}</span>
                    <button onClick={() => deleteRow(r.id)} className="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer">✕</button>
                  </div>
                  <div className="font-black text-sm text-slate-900 leading-snug">{r.task}</div>
                  {r.note && <p className="text-xs text-slate-500 font-medium">{r.note}</p>}
                  <div className="text-xs text-slate-500 font-semibold flex justify-between pt-1">
                    <span>Target: <strong className="text-emerald-700">{parseInt(r.targetReach || '0').toLocaleString()}</strong></span>
                    <span>{r.deadline ? `📅 ${r.deadline}` : ''}</span>
                  </div>
                  {/* 1-click status pill switcher */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-black">
                    <span className="text-teal-700 font-bold">{r.progress}%</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveTaskStatus(r.id, 'Planning', '0')} className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md transition cursor-pointer">
                        ← ⏳ Lên KH
                      </button>
                      <button onClick={() => moveTaskStatus(r.id, 'Done', '100')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-md transition cursor-pointer shadow-2xs">
                        ✅ Hoàn thành ✓
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CỘT 3: DONE */}
          <div className="bg-emerald-50/60 p-4 rounded-3xl border border-emerald-200 space-y-3.5 shadow-2xs">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-200">
              <h3 className="font-black text-xs text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                <span>✅</span> Đã Hoàn Thành ({completedTasks})
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">100% KPI</span>
            </div>
            
            <div className="space-y-3">
              {rows.filter(r => r.status === 'Done').map(r => (
                <div key={r.id} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs space-y-2.5 hover:border-emerald-300 transition opacity-95">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">{r.category}</span>
                    <button onClick={() => deleteRow(r.id)} className="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer">✕</button>
                  </div>
                  <div className="font-black text-sm text-slate-900 line-through leading-snug">{r.task}</div>
                  {r.note && <p className="text-xs text-slate-500 font-medium">{r.note}</p>}
                  <div className="text-xs text-slate-500 font-semibold flex justify-between pt-1">
                    <span>Target: {parseInt(r.targetReach || '0').toLocaleString()}</span>
                    <span>{r.deadline ? `📅 ${r.deadline}` : ''}</span>
                  </div>
                  {/* 1-click status pill switcher */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-black">
                    <span className="text-emerald-700 font-black">✓ 100% Hoàn thành</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveTaskStatus(r.id, 'In Progress', '50')} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md transition cursor-pointer">
                        ↺ Mở lại
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
