import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  const [activeTab, setActiveTab] = useState('Facebook');
  const [entries, setEntries] = useState<any[]>([]);
  const [groups, setGroups] = useState<{name: string, link: string}[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupLink, setGroupLink] = useState('');
  
  const [form, setForm] = useState({ link: '', time: '', reach: '', hook: '', suggestion: '' });
  const [isShared, setIsShared] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabs = ['Facebook', 'YouTube', 'TikTok'];

  const fetchData = async () => {
    const res = await fetch('/api/reports');
    const data = await res.json();
    setEntries(data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    const method = editingId ? 'PUT' : 'POST';
    await fetch('/api/reports', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: editingId, platform: activeTab, isShared, image, groups })
    });
    setForm({ link: '', time: '', reach: '', hook: '', suggestion: '' });
    setGroups([]); setImage(null); setIsShared(false); setEditingId(null);
    fetchData();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text(`Bao cao: ${new Date().toLocaleDateString()}`, 14, 15);
    autoTable(doc, {
      head: [["Nen tang", "Link", "Reach", "Shared", "Hook"]],
      body: entries.map(e => [e.platform, e.link, e.reach, e.isShared ? 'Yes' : 'No', e.hook]),
      startY: 25,
    });
    doc.save("Report_CRM.pdf");
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button onClick={generatePDF} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700">📄 Xuất PDF</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border space-y-4">
           <div className="flex gap-2 mb-4">{tabs.map(t => <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg font-bold ${activeTab === t ? 'bg-sky-600 text-white' : 'bg-slate-100'}`}>{t}</button>)}</div>
           
           <input className="w-full border p-3 rounded-xl" placeholder="Link bài..." value={form.link} onChange={e => setForm({...form, link: e.target.value})} />
           <div className="grid grid-cols-2 gap-4">
               <input className="border p-3 rounded-xl" placeholder="Giờ đăng..." value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
               <input className="border p-3 rounded-xl" placeholder="Reach..." value={form.reach} onChange={e => setForm({...form, reach: e.target.value})} />
           </div>
           
           <div className="border p-2 rounded-xl cursor-pointer bg-slate-50 text-sm" onClick={() => fileInputRef.current?.click()}>
             {image ? 'Đã chọn ảnh' : 'Click chọn ảnh báo cáo'}
             <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                const reader = new FileReader();
                reader.onloadend = () => setImage(reader.result as string);
                if(e.target.files) reader.readAsDataURL(e.target.files[0]);
             }} />
           </div>

           <textarea className="w-full border p-3 rounded-xl" placeholder="Câu Hook..." value={form.hook} onChange={e => setForm({...form, hook: e.target.value})} />
           
           <button onClick={() => setIsShared(!isShared)} className={`w-full py-2 rounded-xl font-bold ${isShared ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Đã share: {isShared ? 'Có' : 'Chưa'}</button>
           <button onClick={handleSubmit} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Lưu báo cáo</button>
        </div>

        {activeTab === 'Facebook' && (
            <div className="bg-white p-6 rounded-2xl border">
                <h2 className="font-bold text-xl mb-4 text-sky-700">📋 Quản lý nhóm Facebook</h2>
                <div className="flex gap-2 mb-4">
                    <input className="border p-2 rounded w-1/2 text-sm" placeholder="Tên nhóm" value={groupName} onChange={e => setGroupName(e.target.value)} />
                    <input className="border p-2 rounded w-1/2 text-sm" placeholder="Link" value={groupLink} onChange={e => setGroupLink(e.target.value)} />
                    <button onClick={() => { setGroups([...groups, {name: groupName, link: groupLink}]); setGroupName(''); setGroupLink(''); }} className="bg-slate-800 text-white px-4 rounded">+</button>
                </div>
                <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2">Nhóm</th><th className="text-left">Hành động</th></tr></thead>
                    <tbody>{groups.map((g, i) => <tr key={i}><td className="py-2">{g.name}</td><td><a href={g.link.startsWith('http') ? g.link : `https://${g.link}`} target="_blank" rel="noopener noreferrer" className="bg-sky-100 px-2 py-1 rounded text-sky-700 underline">Mở</a></td></tr>)}</tbody>
                </table>
            </div>
        )}

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border">
            <h2 className="font-bold text-xl mb-4">Danh sách báo cáo hôm nay</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead><tr className="border-b text-slate-400"><th>Nền</th><th>Link</th><th>Reach</th><th>Shared</th><th>Hook</th><th>Action</th></tr></thead>
                    <tbody>{entries.map(e => <tr key={e.id} className="border-b">
                        <td className="py-2 font-bold">{e.platform}</td>
                        <td>{e.link.substring(0,15)}...</td>
                        <td>{e.reach}</td>
                        <td>{e.isShared ? '✅' : '❌'}</td>
                        <td>{e.hook.substring(0,10)}...</td>
                        <td>
                            <a href={e.link.startsWith('http') ? e.link : `https://${e.link}`} target="_blank" rel="noopener noreferrer" className="bg-sky-100 text-sky-700 px-3 py-1 rounded-lg font-bold hover:bg-sky-200">Mở link</a>
                        </td>
                    </tr>)}</tbody>
                </table>
            </div>
        </div>
      </div>
    </Layout>
  );
}
