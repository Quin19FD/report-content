import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { jsPDF } from "jspdf";

export default function Home() {
  const [activeTab, setActiveTab] = useState('Facebook');
  const [entries, setEntries] = useState<any[]>([]);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const tabs = ['Facebook', 'YouTube', 'TikTok'];

  // Fetch today's data
  const fetchData = async () => {
    const { data } = await supabase
      .from('report_entries')
      .select('*')
      .eq('report_date', new Date().toISOString().split('T')[0]);
    if (data) setEntries(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!link) return alert('Vui lòng nhập link!');
    setLoading(true);
    await supabase.from('report_entries').insert([{ 
      platform: activeTab, 
      link, 
      note 
    }]);
    setLink('');
    setNote('');
    fetchData();
    setLoading(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text(`Bao cao ngay: ${new Date().toLocaleDateString()}`, 10, 10);
    entries.forEach((e, i) => {
        doc.text(`${i+1}. ${e.platform}: ${e.link} - ${e.note}`, 10, 20 + (i * 10));
    });
    doc.save("report.pdf");
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Daily Reporting</h1>
        <button onClick={generatePDF} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Xuất PDF</button>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500'}`}>
                {tab}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          <div className="grid gap-4 max-w-lg">
            <input value={link} onChange={(e) => setLink(e.target.value)} className="w-full border p-2 rounded" placeholder="Nhập Link..." />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border p-2 rounded" placeholder="Ghi chú..." />
            <button onClick={handleSubmit} disabled={loading} className="bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 w-fit">
              {loading ? 'Đang gửi...' : `Thêm ${activeTab}`}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="font-semibold mb-4">Danh sách hôm nay ({entries.length})</h2>
        <table className="w-full">
            <thead><tr className="border-b text-slate-500"><th className="pb-2">Nền tảng</th><th className="pb-2">Link</th></tr></thead>
            <tbody>{entries.map(e => <tr key={e.id} className="border-b"><td className="py-2">{e.platform}</td><td className="py-2 truncate max-w-xs">{e.link}</td></tr>)}</tbody>
        </table>
      </div>
    </Layout>
  );
}
