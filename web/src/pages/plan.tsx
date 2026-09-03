import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function Plan() {
  const [rows, setRows] = useState([{ id: Date.now(), task: '', progress: '', status: 'Planning', note: '' }]);

  useEffect(() => {
    fetch('/api/plans').then(res => res.json()).then(data => data && data.length && setRows(data));
  }, []);

  const savePlan = async () => {
    await fetch('/api/plans', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(rows)
    });
    alert("Đã lưu kế hoạch!");
  };

  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows([...rows, { id: Date.now(), task: '', progress: '', status: 'Planning', note: '' }]);

  const exportToExcel = () => {
    const csvContent = [["Task", "Progress", "Status", "Note"], ...rows.map(r => [r.task, r.progress, r.status, r.note])].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Monthly_Plan.csv";
    link.click();
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8 border-b pb-6">
        <div>
            <h1 className="text-3xl font-bold text-sky-900">Monthly Plan Grid</h1>
            <p className="text-slate-500">Nhập liệu như Excel</p>
        </div>
        <div className="flex gap-2">
            <button onClick={exportToExcel} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700">📊 Xuất Excel</button>
            <button onClick={savePlan} className="bg-sky-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-sky-700">💾 Lưu bảng</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm overflow-x-auto">
        <div className="grid grid-cols-5 gap-2 font-bold text-slate-700 mb-2 px-2 bg-slate-100 p-3 rounded-lg">
            <div>Mục tiêu</div> <div>Tiến độ (%)</div> <div>Trạng thái</div> <div className="col-span-2">Ghi chú</div>
        </div>
        
        <div className="space-y-2">
            {rows.map((r, i) => (
                <div key={r.id} className="grid grid-cols-5 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <input className="border p-2 rounded" value={r.task} onChange={e => updateRow(r.id, 'task', e.target.value)} placeholder="Mục tiêu..." />
                    <input className="border p-2 rounded" value={r.progress} onChange={e => updateRow(r.id, 'progress', e.target.value)} placeholder="0%" />
                    <select className="border p-2 rounded" value={r.status} onChange={e => updateRow(r.id, 'status', e.target.value)}>
                        <option>Planning</option> <option>In Progress</option> <option>Done</option>
                    </select>
                    <input className="border p-2 rounded col-span-2" value={r.note} onChange={e => updateRow(r.id, 'note', e.target.value)} placeholder="Ghi chú..." />
                </div>
            ))}
        </div>
        
        <button onClick={addRow} className="mt-4 w-full border-2 border-dashed border-sky-300 p-4 rounded-xl text-sky-600 hover:bg-sky-50 font-bold">+ Thêm dòng mới</button>
      </div>
    </Layout>
  );
}
