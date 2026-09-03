import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  const [activeTab, setActiveTab] = useState('Facebook');
  const [entries, setEntries] = useState<any[]>([]);
  
  // Facebook Groups state
  const [groups, setGroups] = useState<{name: string, link: string}[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupLink, setGroupLink] = useState('');

  // YouTube Channels state
  const [ytChannels, setYtChannels] = useState<{name: string, link: string}[]>([]);
  const [ytChannelName, setYtChannelName] = useState('');
  const [ytChannelLink, setYtChannelLink] = useState('');
  
  const [form, setForm] = useState({ 
    link: '', 
    time: '', 
    reach: '', 
    hook: '', 
    suggestion: '', 
    group: '',
    videoType: 'Shorts'
  });
  
  const [isShared, setIsShared] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabs = ['Facebook', 'YouTube', 'TikTok'];

  const fetchData = async () => {
    const resEntries = await fetch('/api/reports');
    setEntries(await resEntries.json());
    
    const resGroups = await fetch('/api/groups');
    setGroups(await resGroups.json());

    const resYt = await fetch('/api/yt-channels');
    setYtChannels(await resYt.json());
  };

  useEffect(() => { fetchData(); }, []);

  const addGroup = async () => {
    if(!groupName || !groupLink) return alert("Nhập đủ tên và link nhóm!");
    const newGroups = [...groups, {name: groupName, link: groupLink}];
    await fetch('/api/groups', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newGroups) });
    setGroupName(''); setGroupLink(''); fetchData();
  };

  const addYtChannel = async () => {
    if(!ytChannelName || !ytChannelLink) return alert("Nhập đủ tên và link kênh YouTube!");
    const newChannels = [...ytChannels, {name: ytChannelName, link: ytChannelLink}];
    await fetch('/api/yt-channels', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newChannels) });
    setYtChannelName(''); setYtChannelLink(''); fetchData();
  };

  const handleSubmit = async () => {
    if (!form.link) return alert("Vui lòng nhập Link bài/video!");
    const method = editingId ? 'PUT' : 'POST';
    await fetch('/api/reports', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...form, 
        id: editingId, 
        platform: activeTab, 
        isShared, 
        image,
        group: activeTab === 'Facebook' ? form.group : (activeTab === 'YouTube' ? `${form.videoType}${form.group ? ' - ' + form.group : ''}` : '')
      })
    });
    setForm({ link: '', time: '', reach: '', hook: '', suggestion: '', group: '', videoType: 'Shorts' });
    setImage(null); setIsShared(false); setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) return;
    await fetch('/api/reports', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
    fetchData();
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setForm({ 
      link: entry.link || '', 
      time: entry.time || '', 
      reach: entry.reach || '', 
      hook: entry.hook || '', 
      suggestion: entry.suggestion || '', 
      group: entry.group || '',
      videoType: entry.videoType || 'Shorts'
    });
    setIsShared(entry.isShared || false);
    setActiveTab(entry.platform || 'Facebook');
  };

  // Nâng cấp xuất PDF đẹp mắt, chuẩn tiếng Việt Unicode
  const generatePDF = async () => {
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      // Load Google Font Roboto cho Tiếng Việt đẹp chuẩn
      try {
        const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf';
        const res = await fetch(fontUrl);
        const buffer = await res.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        doc.addFileToVFS("Roboto-Regular.ttf", base64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
      } catch (err) {
        console.warn("Dùng font mặc định nếu không nạp được CDN font", err);
      }

      const today = new Date().toLocaleDateString('vi-VN');
      const totalReachSum = entries.reduce((acc, curr) => acc + (parseInt(curr.reach) || 0), 0);

      // Header Banner đẹp mắt
      doc.setFillColor(15, 23, 42); // Dark slate
      doc.rect(0, 0, 297, 28, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("BÁO CÁO CÔNG VIỆC HÀNG NGÀY", 14, 12);
      
      doc.setFontSize(10);
      doc.setTextColor(203, 213, 225);
      doc.text(`Ngày lập báo cáo: ${today}  |  Tổng số bài/video: ${entries.length}  |  Tổng Reach/Lượt xem: ${totalReachSum.toLocaleString()}`, 14, 20);

      // Data Table
      const tableData = entries.map((e, index) => [
        (index + 1).toString(),
        e.platform || 'N/A',
        e.time || '--:--',
        e.group || '--',
        e.link || '',
        e.reach || '0',
        e.isShared ? 'Có' : 'Chưa',
        e.hook || '',
        e.suggestion || ''
      ]);

      autoTable(doc, {
        head: [["STT", "Nền tảng", "Giờ", "Nhóm / Loại", "Link bài viết / video", "Reach/Views", "Shared", "Câu Hook", "Đề xuất sửa"]],
        body: tableData,
        startY: 34,
        theme: 'grid',
        styles: {
          font: 'Roboto',
          fontSize: 8,
          cellPadding: 3,
          valign: 'middle',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [30, 41, 59], // Slate 800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' }, // STT
          1: { cellWidth: 24, fontStyle: 'bold' }, // Nền tảng
          2: { cellWidth: 16, halign: 'center' }, // Giờ
          3: { cellWidth: 32 }, // Nhóm/Loại
          4: { cellWidth: 55, textColor: [2, 132, 199] }, // Link
          5: { cellWidth: 24, halign: 'right' }, // Reach
          6: { cellWidth: 16, halign: 'center' }, // Shared
          7: { cellWidth: 50 }, // Hook
          8: { cellWidth: 40 } // Đề xuất
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Slate 50
        }
      });

      doc.save(`Bao_Cao_Cong_Viec_${today.replace(/\//g, '-')}.pdf`);
    } catch (error) {
      alert("Lỗi xuất PDF: " + error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <Layout>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard Báo Cáo</h1>
            <p className="text-slate-500 mt-1">Quản lý hiệu suất nội dung Facebook, YouTube & TikTok hàng ngày</p>
        </div>
        <button 
          onClick={generatePDF} 
          disabled={isExportingPDF}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-md flex items-center gap-2"
        >
          <span>📄</span>
          <span>{isExportingPDF ? 'Đang tạo PDF...' : 'Xuất PDF Đẹp'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form nhập liệu */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
           {/* Tab selector */}
           <div className="flex gap-2 mb-2 p-1 bg-slate-100 rounded-xl">
              {tabs.map(t => {
                let activeColor = 'bg-sky-600 text-white';
                if (t === 'YouTube') activeColor = 'bg-red-600 text-white';
                if (t === 'TikTok') activeColor = 'bg-slate-900 text-white';

                return (
                  <button 
                    key={t} 
                    onClick={() => setActiveTab(t)} 
                    className={`flex-1 py-2 rounded-lg font-bold transition ${activeTab === t ? activeColor : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {t === 'YouTube' ? '🎬 YouTube' : t === 'Facebook' ? '📘 Facebook' : '🎵 TikTok'}
                  </button>
                );
              })}
           </div>

           {/* Input Link */}
           <div>
             <label className="block text-xs font-bold text-slate-600 mb-1">
               {activeTab === 'YouTube' ? 'Link Video / Shorts YouTube' : activeTab === 'Facebook' ? 'Link Bài Viết Facebook' : 'Link Video TikTok'}
             </label>
             <input 
               className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-sky-500" 
               placeholder={activeTab === 'YouTube' ? 'https://youtube.com/watch?v=... hoặc shorts/...' : 'Dán link tại đây...'} 
               value={form.link} 
               onChange={e => setForm({...form, link: e.target.value})} 
             />
           </div>

           {/* Facebook Group Selector */}
           {activeTab === 'Facebook' && (
             <div>
               <label className="block text-xs font-bold text-slate-600 mb-1">Nhóm Facebook đã đăng</label>
               <select className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-sky-500" value={form.group} onChange={e => setForm({...form, group: e.target.value})}>
                 <option value="">-- Chọn nhóm Facebook --</option>
                 {groups.map((g, i) => <option key={i} value={g.name}>{g.name}</option>)}
               </select>
             </div>
           )}

           {/* YouTube Specific Controls */}
           {activeTab === 'YouTube' && (
             <div className="grid grid-cols-2 gap-4 bg-red-50 p-4 rounded-xl border border-red-100">
               <div>
                 <label className="block text-xs font-bold text-red-800 mb-1">Loại Video YouTube</label>
                 <select 
                   className="w-full border border-red-200 p-2.5 rounded-lg bg-white text-sm font-medium" 
                   value={form.videoType} 
                   onChange={e => setForm({...form, videoType: e.target.value})}
                 >
                   <option value="Shorts">⚡ YouTube Shorts</option>
                   <option value="Video Dài">📹 Video Dài (Long-form)</option>
                   <option value="Bài Đăng Cộng Đồng">💬 Bài Đăng Cộng Đồng</option>
                   <option value="Livestream">🔴 Livestream</option>
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-bold text-red-800 mb-1">Kênh YouTube</label>
                 <select 
                   className="w-full border border-red-200 p-2.5 rounded-lg bg-white text-sm font-medium" 
                   value={form.group} 
                   onChange={e => setForm({...form, group: e.target.value})}
                 >
                   <option value="">-- Chọn Kênh --</option>
                   {ytChannels.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                 </select>
               </div>
             </div>
           )}

           {/* Time & Reach */}
           <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">Giờ đăng</label>
                 <input className="w-full border border-slate-200 p-3 rounded-xl" placeholder="Ví dụ: 09:30" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">
                   {activeTab === 'YouTube' ? 'Lượt Xem (Views)' : 'Reach / Lượt tiếp cận'}
                 </label>
                 <input className="w-full border border-slate-200 p-3 rounded-xl" placeholder="Ví dụ: 1500" value={form.reach} onChange={e => setForm({...form, reach: e.target.value})} />
               </div>
           </div>

           {/* Image Upload */}
           <div>
             <label className="block text-xs font-bold text-slate-600 mb-1">Ảnh chụp số liệu / bài viết</label>
             <div className="border border-dashed border-slate-300 p-3 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition text-sm flex items-center justify-between" onClick={() => fileInputRef.current?.click()}>
               <span className="text-slate-600 font-medium">{image ? '✅ Đã chọn ảnh thành công' : '📷 Click chọn ảnh đính kèm'}</span>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const reader = new FileReader();
                  reader.onloadend = () => setImage(reader.result as string);
                  if(e.target.files?.[0]) reader.readAsDataURL(e.target.files[0]);
               }} />
             </div>
           </div>

           {/* Hook & Suggestion */}
           <div>
             <label className="block text-xs font-bold text-slate-600 mb-1">Câu Hook / Tiêu đề chính</label>
             <textarea className="w-full border border-slate-200 p-3 rounded-xl h-16 text-sm" placeholder="Ghi chú câu hook ấn tượng..." value={form.hook} onChange={e => setForm({...form, hook: e.target.value})} />
           </div>

           <div>
             <label className="block text-xs font-bold text-slate-600 mb-1">Đề xuất chỉnh sửa (nếu chỉ số chưa tốt)</label>
             <textarea className="w-full border border-slate-200 p-3 rounded-xl h-16 text-sm" placeholder="Nhận xét & bài học rút ra..." value={form.suggestion} onChange={e => setForm({...form, suggestion: e.target.value})} />
           </div>

           {/* Share Toggle */}
           <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
             <span className="text-sm font-bold text-slate-700">Trạng thái Share / Đã chia sẻ?</span>
             <button 
               type="button"
               onClick={() => setIsShared(!isShared)} 
               className={`px-6 py-2 rounded-xl font-bold transition ${isShared ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}
             >
               {isShared ? '✓ Đã Share' : '✕ Chưa Share'}
             </button>
           </div>

           <button 
             onClick={handleSubmit} 
             className={`w-full py-3.5 rounded-xl font-bold text-white transition shadow-md ${activeTab === 'YouTube' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}
           >
             {editingId ? 'Cập Nhật Báo Cáo' : `Lưu Báo Cáo ${activeTab}`}
           </button>
        </div>

        {/* Dynamic Right Panel based on Active Tab */}
        <div>
           {activeTab === 'Facebook' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="font-bold text-xl mb-4 text-sky-700 flex items-center gap-2">
                    <span>📋</span> Quản Lý Nhóm Facebook
                  </h2>
                  <div className="flex gap-2 mb-4">
                      <input className="border border-slate-200 p-2.5 rounded-lg w-1/3 text-sm" placeholder="Tên nhóm" value={groupName} onChange={e => setGroupName(e.target.value)} />
                      <input className="border border-slate-200 p-2.5 rounded-lg w-1/3 text-sm" placeholder="Link nhóm" value={groupLink} onChange={e => setGroupLink(e.target.value)} />
                      <button onClick={addGroup} className="bg-sky-600 hover:bg-sky-700 text-white px-4 rounded-lg font-bold">+</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-slate-200 text-slate-400 text-left"><th className="py-2">Nhóm</th><th className="text-right">Hành động</th></tr></thead>
                        <tbody>{groups.map((g, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-2.5 font-medium">{g.name}</td>
                            <td className="text-right">
                              <a href={g.link.startsWith('http') ? g.link : `https://${g.link}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline text-xs font-semibold bg-sky-50 px-2.5 py-1 rounded">
                                Mở Link ↗
                              </a>
                            </td>
                          </tr>
                        ))}</tbody>
                    </table>
                  </div>
              </div>
           )}

           {activeTab === 'YouTube' && (
              <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                  <h2 className="font-bold text-xl mb-4 text-red-600 flex items-center gap-2">
                    <span>🎬</span> Quản Lý Kênh YouTube
                  </h2>
                  <div className="flex gap-2 mb-4">
                      <input className="border border-slate-200 p-2.5 rounded-lg w-1/3 text-sm" placeholder="Tên kênh" value={ytChannelName} onChange={e => setYtChannelName(e.target.value)} />
                      <input className="border border-slate-200 p-2.5 rounded-lg w-1/3 text-sm" placeholder="Link kênh" value={ytChannelLink} onChange={e => setYtChannelLink(e.target.value)} />
                      <button onClick={addYtChannel} className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-lg font-bold">+</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-slate-200 text-slate-400 text-left"><th className="py-2">Kênh YouTube</th><th className="text-right">Hành động</th></tr></thead>
                        <tbody>{ytChannels.map((c, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-2.5 font-medium text-red-900">{c.name}</td>
                            <td className="text-right">
                              <a href={c.link.startsWith('http') ? c.link : `https://${c.link}`} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline text-xs font-semibold bg-red-50 px-2.5 py-1 rounded">
                                Xem Kênh ↗
                              </a>
                            </td>
                          </tr>
                        ))}</tbody>
                    </table>
                  </div>
              </div>
           )}

           {activeTab === 'TikTok' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="font-bold text-xl mb-2 text-slate-900 flex items-center gap-2">
                    <span>🎵</span> Mẹo Báo Cáo TikTok
                  </h2>
                  <p className="text-sm text-slate-500 mb-4">Nhập link video TikTok, số lượt xem (Views) và thời gian đăng để theo dõi xu hướng đề xuất.</p>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                    <p className="font-bold text-slate-800">💡 Lưu ý chỉ số TikTok:</p>
                    <p>• Dưới 500 views: Video bị kẹt flop, cần đổi câu Hook trong 3s đầu.</p>
                    <p>• 1,000 - 5,000 views: Video đang vào luồng phân phối ban đầu.</p>
                    <p>• Trên 10,000 views: Video lên xu hướng!</p>
                  </div>
              </div>
           )}
        </div>

        {/* Bảng báo cáo tổng hợp */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl text-slate-800">Danh sách báo cáo hôm nay ({entries.length})</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="py-3">Nền tảng</th>
                        <th>Giờ</th>
                        <th>Nhóm / Loại</th>
                        <th>Link</th>
                        <th>Reach/Views</th>
                        <th>Shared</th>
                        <th>Câu Hook</th>
                        <th className="text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 italic">Chưa có báo cáo nào hôm nay. Hãy nhập báo cáo ở trên!</td>
                        </tr>
                      ) : entries.map(e => (
                        <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-4 font-bold">
                              <span className={`px-2.5 py-1 rounded-md text-xs ${e.platform === 'YouTube' ? 'bg-red-100 text-red-700' : e.platform === 'Facebook' ? 'bg-sky-100 text-sky-700' : 'bg-slate-900 text-white'}`}>
                                {e.platform}
                              </span>
                            </td>
                            <td className="py-4 font-medium text-slate-600">{e.time || '--:--'}</td>
                            <td className="py-4 font-medium text-slate-700">{e.group || 'N/A'}</td>
                            <td className="py-4">
                              <a href={e.link.startsWith('http') ? e.link : `https://${e.link}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 font-semibold hover:underline">
                                Mở Link ↗
                              </a>
                            </td>
                            <td className="py-4 font-bold text-slate-800">{e.reach ? parseInt(e.reach).toLocaleString() : '0'}</td>
                            <td className="py-4">{e.isShared ? <span className="text-emerald-600 font-bold">✓ Có</span> : <span className="text-slate-400">Chưa</span>}</td>
                            <td className="py-4 max-w-xs truncate text-slate-600">{e.hook || '--'}</td>
                            <td className="py-4 text-right">
                              <div className="flex justify-end gap-3">
                                <button onClick={() => startEdit(e)} className="text-amber-600 hover:text-amber-700 font-bold">Sửa</button>
                                <button onClick={() => handleDelete(e.id)} className="text-rose-600 hover:text-rose-700 font-bold">Xóa</button>
                              </div>
                            </td>
                        </tr>
                      ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </Layout>
  );
}
