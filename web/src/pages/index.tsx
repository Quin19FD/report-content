import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  const [activeTab, setActiveTab] = useState('Facebook');
  const [rightTab, setRightTab] = useState<'REPORTS' | 'MANAGEMENT'>('REPORTS');
  const [entries, setEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('ALL');
  
  // Facebook Groups state
  const [groups, setGroups] = useState<{name: string, link: string}[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupLink, setGroupLink] = useState('');

  // YouTube Channels state
  const [ytChannels, setYtChannels] = useState<{name: string, link: string}[]>([]);
  const [ytChannelName, setYtChannelName] = useState('');
  const [ytChannelLink, setYtChannelLink] = useState('');
  
  // Helper to get current HH:mm
  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const [form, setForm] = useState({ 
    link: '', 
    time: getCurrentTime(), 
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
  const [notification, setNotification] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabs = ['Facebook', 'YouTube', 'TikTok'];

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    try {
      const resEntries = await fetch('/api/reports');
      setEntries(await resEntries.json());
      
      const resGroups = await fetch('/api/groups');
      setGroups(await resGroups.json());

      const resYt = await fetch('/api/yt-channels');
      setYtChannels(await resYt.json());
    } catch (e) {
      console.error("Lỗi tải dữ liệu", e);
    }
  };

  useEffect(() => { 
    fetchData();
  }, []);

  // AUTOMATION 1: Smart URL Detection & Auto Platform/Type Switch
  const handleLinkChange = (url: string) => {
    setForm(prev => ({ ...prev, link: url }));
    if (!url) return;

    const lowerUrl = url.toLowerCase();

    // Auto-detect YouTube
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      if (activeTab !== 'YouTube') {
        setActiveTab('YouTube');
        showToast('⚡ Tự động chuyển sang tab YouTube!');
      }

      if (lowerUrl.includes('/shorts/')) {
        setForm(prev => ({ ...prev, link: url, videoType: 'Shorts' }));
      } else if (lowerUrl.includes('watch?v=') || lowerUrl.includes('youtu.be/')) {
        setForm(prev => ({ ...prev, link: url, videoType: 'Video Dài' }));
      } else if (lowerUrl.includes('/live/')) {
        setForm(prev => ({ ...prev, link: url, videoType: 'Livestream' }));
      }
    } 
    // Auto-detect Facebook
    else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) {
      if (activeTab !== 'Facebook') {
        setActiveTab('Facebook');
        showToast('📘 Tự động chuyển sang tab Facebook!');
      }
    } 
    // Auto-detect TikTok
    else if (lowerUrl.includes('tiktok.com')) {
      if (activeTab !== 'TikTok') {
        setActiveTab('TikTok');
        showToast('🎵 Tự động chuyển sang tab TikTok!');
      }
    }
  };

  // AUTOMATION 2: Quick Reach Presets
  const addReachPreset = (amount: number) => {
    const current = parseInt(form.reach) || 0;
    setForm(prev => ({ ...prev, reach: (current + amount).toString() }));
  };

  const addGroup = async () => {
    if(!groupName || !groupLink) return alert("Nhập đủ tên và link nhóm!");
    const newGroups = [...groups, {name: groupName, link: groupLink}];
    await fetch('/api/groups', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newGroups) });
    setGroupName(''); setGroupLink(''); fetchData();
    showToast('✅ Đã lưu nhóm Facebook mới vĩnh viễn!');
  };

  const addYtChannel = async () => {
    if(!ytChannelName || !ytChannelLink) return alert("Nhập đủ tên và link kênh YouTube!");
    const newChannels = [...ytChannels, {name: ytChannelName, link: ytChannelLink}];
    await fetch('/api/yt-channels', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newChannels) });
    setYtChannelName(''); setYtChannelLink(''); fetchData();
    showToast('✅ Đã lưu kênh YouTube mới vĩnh viễn!');
  };

  const handleSubmit = async () => {
    if (!form.link) return alert("Vui lòng dán Link bài/video!");
    
    const submissionTime = form.time.trim() || getCurrentTime();
    const method = editingId ? 'PUT' : 'POST';
    const groupValue = activeTab === 'Facebook' ? form.group : (activeTab === 'YouTube' ? `${form.videoType}${form.group ? ' - ' + form.group : ''}` : '');

    await fetch('/api/reports', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...form, 
        time: submissionTime,
        id: editingId, 
        platform: activeTab, 
        isShared, 
        image,
        group: groupValue
      })
    });

    setForm({ 
      link: '', 
      time: getCurrentTime(),
      reach: '', 
      hook: '', 
      suggestion: '', 
      group: '', 
      videoType: 'Shorts' 
    });
    
    setImage(null); 
    setIsShared(false); 
    setEditingId(null);
    fetchData();
    showToast(editingId ? '🎉 Đã cập nhật báo cáo thành công!' : '🎉 Đã thêm báo cáo mới thành công!');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) return;
    await fetch('/api/reports', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
    fetchData();
    showToast('🗑️ Đã xóa báo cáo!');
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setForm({ 
      link: entry.link || '', 
      time: entry.time || getCurrentTime(), 
      reach: entry.reach || '', 
      hook: entry.hook || '', 
      suggestion: entry.suggestion || '', 
      group: entry.group || '',
      videoType: entry.videoType || 'Shorts'
    });
    setIsShared(entry.isShared || false);
    setActiveTab(entry.platform || 'Facebook');
    showToast('✏️ Đã tải dữ liệu lên form để chỉnh sửa!');
  };

  // Modern PDF Export Engine
  const generatePDF = async () => {
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      try {
        const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf';
        const res = await fetch(fontUrl);
        const buffer = await res.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        doc.addFileToVFS("Roboto-Regular.ttf", base64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
      } catch (err) {
        console.warn("Fallback font", err);
      }

      const today = new Date().toLocaleDateString('vi-VN');
      const totalReachSum = entries.reduce((acc, curr) => acc + (parseInt(curr.reach) || 0), 0);

      // Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("BÁO CÁO CÔNG VIỆC HÀNG NGÀY (CONTENTFLOW CRM)", 14, 13);
      
      doc.setFontSize(10);
      doc.setTextColor(203, 213, 225);
      doc.text(`Ngày lập: ${today}   |   Tổng số bài/video: ${entries.length}   |   Tổng Reach/Views: ${totalReachSum.toLocaleString()}`, 14, 22);

      const tableData = entries.map((e, index) => [
        (index + 1).toString(),
        e.platform || 'N/A',
        e.time || '--:--',
        e.group || '--',
        e.link || '',
        e.reach ? parseInt(e.reach).toLocaleString() : '0',
        e.isShared ? 'Có' : 'Chưa',
        e.hook || '',
        e.suggestion || ''
      ]);

      autoTable(doc, {
        head: [["STT", "Nền tảng", "Giờ", "Nhóm / Loại", "Link bài viết / video", "Reach/Views", "Shared", "Câu Hook", "Đề xuất sửa"]],
        body: tableData,
        startY: 36,
        theme: 'grid',
        styles: {
          font: 'Roboto',
          fontSize: 8,
          cellPadding: 3,
          valign: 'middle',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'normal',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 24, fontStyle: 'normal' },
          2: { cellWidth: 16, halign: 'center' },
          3: { cellWidth: 32 },
          4: { cellWidth: 55, textColor: [2, 132, 199] },
          5: { cellWidth: 24, halign: 'right' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 50 },
          8: { cellWidth: 40 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      doc.save(`Bao_Cao_Cong_Viec_${today.replace(/\//g, '-')}.pdf`);
      showToast('📄 Đã xuất file PDF báo cáo thành công!');
    } catch (error) {
      alert("Lỗi xuất PDF: " + error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Metrics
  const totalPosts = entries.length;
  const totalReachSum = entries.reduce((acc, curr) => acc + (parseInt(curr.reach) || 0), 0);
  const sharedCount = entries.filter(e => e.isShared).length;

  // Filtered entries for table
  const filteredEntries = entries.filter(e => {
    const matchPlatform = filterPlatform === 'ALL' || e.platform === filterPlatform;
    const matchSearch = searchQuery === '' || 
      (e.link && e.link.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.hook && e.hook.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.group && e.group.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchPlatform && matchSearch;
  });

  return (
    <Layout>
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-950 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-bounce text-xs font-semibold">
          <span className="text-emerald-400 font-bold">✨</span>
          <span>{notification}</span>
        </div>
      )}

      {/* COMPACT SINGLE-SCREEN TOP HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard Báo Cáo (Single Screen)</h1>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span>📅 {new Date().toLocaleDateString('vi-VN')}</span>
            <span>•</span>
            <span className="font-bold text-slate-800">📊 {totalPosts} bài đăng</span>
            <span>•</span>
            <span className="font-bold text-emerald-600">📈 {totalReachSum.toLocaleString()} Reach</span>
            <span>•</span>
            <span className="font-bold text-sky-600">🚀 {sharedCount} shared</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={generatePDF} 
            disabled={isExportingPDF}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl font-bold transition shadow-sm text-xs flex items-center gap-1.5"
          >
            <span>📄</span>
            <span>{isExportingPDF ? 'Đang xuất...' : 'Xuất PDF'}</span>
          </button>
        </div>
      </div>

      {/* SIDE-BY-SIDE DUAL WORKSPACE (NO SCROLLING NEEDED!) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT WORKSPACE: FORM INPUT (5 COLS) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
           <div className="flex items-center justify-between pb-2 border-b border-slate-100">
             <h2 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
               <span>✍️</span> 
               <span>{editingId ? 'Sửa Báo Cáo' : 'Nhập Báo Cáo Mới'}</span>
             </h2>
             {editingId && (
               <button onClick={() => setEditingId(null)} className="text-[11px] text-slate-500 hover:text-slate-800 underline font-semibold">
                 Hủy
               </button>
             )}
           </div>

           {/* Input Tab selector */}
           <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-xs">
              {tabs.map(t => {
                let activeColor = 'bg-sky-600 text-white font-bold';
                if (t === 'YouTube') activeColor = 'bg-red-600 text-white font-bold';
                if (t === 'TikTok') activeColor = 'bg-slate-950 text-white font-bold';

                return (
                  <button 
                    key={t} 
                    type="button"
                    onClick={() => setActiveTab(t)} 
                    className={`flex-1 py-1.5 rounded-lg transition ${activeTab === t ? activeColor : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {t === 'YouTube' ? '🎬 YT' : t === 'Facebook' ? '📘 FB' : '🎵 TT'}
                  </button>
                );
              })}
           </div>

           {/* AUTOMATED LINK INPUT */}
           <div>
             <div className="flex justify-between items-center mb-1">
               <label className="block text-[11px] font-extrabold text-slate-700 uppercase">Link ({activeTab})</label>
               <span className="text-[10px] text-sky-600 font-bold">⚡ Dán link tự chọn Tab</span>
             </div>
             <input 
               className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500" 
               placeholder="Dán link bài viết / video..." 
               value={form.link} 
               onChange={e => handleLinkChange(e.target.value)} 
             />
           </div>

           {/* Facebook Group Selector */}
           {activeTab === 'Facebook' && (
             <div>
               <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">Nhóm Facebook</label>
               <select className="w-full border border-slate-200 p-2 rounded-xl text-xs font-medium" value={form.group} onChange={e => setForm({...form, group: e.target.value})}>
                 <option value="">-- Chọn nhóm Facebook --</option>
                 {groups.map((g, i) => <option key={i} value={g.name}>{g.name}</option>)}
               </select>
             </div>
           )}

           {/* YouTube Specific Controls */}
           {activeTab === 'YouTube' && (
             <div className="grid grid-cols-2 gap-2 bg-red-50/80 p-2.5 rounded-xl border border-red-100 text-xs">
               <div>
                 <label className="block text-[10px] font-extrabold text-red-800 uppercase mb-1">Loại Video</label>
                 <select 
                   className="w-full border border-red-200 p-1.5 rounded-lg bg-white font-semibold text-xs" 
                   value={form.videoType} 
                   onChange={e => setForm({...form, videoType: e.target.value})}
                 >
                   <option value="Shorts">⚡ Shorts</option>
                   <option value="Video Dài">📹 Video Dài</option>
                   <option value="Bài Đăng">💬 Bài Đăng</option>
                   <option value="Live">🔴 Live</option>
                 </select>
               </div>
               <div>
                 <label className="block text-[10px] font-extrabold text-red-800 uppercase mb-1">Kênh YT</label>
                 <select 
                   className="w-full border border-red-200 p-1.5 rounded-lg bg-white font-semibold text-xs" 
                   value={form.group} 
                   onChange={e => setForm({...form, group: e.target.value})}
                 >
                   <option value="">-- Chọn Kênh --</option>
                   {ytChannels.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                 </select>
               </div>
             </div>
           )}

           {/* Time & Reach with Presets */}
           <div className="grid grid-cols-2 gap-3">
               <div>
                 <div className="flex justify-between items-center mb-1">
                   <label className="block text-[11px] font-extrabold text-slate-700 uppercase">Giờ đăng</label>
                   <button type="button" onClick={() => setForm(prev => ({ ...prev, time: getCurrentTime() }))} className="text-[10px] text-sky-600 font-bold">⏰ Hiện tại</button>
                 </div>
                 <input className="w-full border border-slate-200 p-2 rounded-xl text-xs font-semibold" placeholder="HH:mm" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
               </div>

               <div>
                 <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">Reach / Views</label>
                 <input className="w-full border border-slate-200 p-2 rounded-xl text-xs font-semibold" placeholder="Số lượt..." value={form.reach} onChange={e => setForm({...form, reach: e.target.value})} />
                 <div className="flex gap-1 mt-1">
                   {[500, 1000, 5000].map((amt) => (
                     <button key={amt} type="button" onClick={() => addReachPreset(amt)} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                       +{amt >= 1000 ? `${amt/1000}k` : amt}
                     </button>
                   ))}
                 </div>
               </div>
           </div>

           {/* Hook & Image */}
           <div className="grid grid-cols-2 gap-2">
             <div>
               <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">Câu Hook / Tiêu đề</label>
               <input className="w-full border border-slate-200 p-2 rounded-xl text-xs font-medium" placeholder="Ghi chú câu hook..." value={form.hook} onChange={e => setForm({...form, hook: e.target.value})} />
             </div>
             <div>
               <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">Ảnh đính kèm</label>
               <div className="border border-dashed border-slate-300 p-2 rounded-xl cursor-pointer bg-slate-50 text-[11px] truncate font-medium" onClick={() => fileInputRef.current?.click()}>
                 {image ? '✅ Đã chọn ảnh' : '📷 Tải ảnh'}
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                    const reader = new FileReader();
                    reader.onloadend = () => setImage(reader.result as string);
                    if(e.target.files?.[0]) reader.readAsDataURL(e.target.files[0]);
                 }} />
               </div>
             </div>
           </div>

           {/* Share Toggle */}
           <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200">
             <span className="text-xs font-bold text-slate-700">Đã Share?</span>
             <button 
               type="button"
               onClick={() => setIsShared(!isShared)} 
               className={`px-4 py-1 rounded-lg font-bold text-xs ${isShared ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}
             >
               {isShared ? '✓ Có' : '✕ Chưa'}
             </button>
           </div>

           <button 
             type="button"
             onClick={handleSubmit} 
             className={`w-full py-3 rounded-xl font-bold text-white transition text-xs shadow-md ${activeTab === 'YouTube' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-950 hover:bg-slate-800'}`}
           >
             {editingId ? 'Cập Nhật Báo Cáo' : `Lưu Báo Cáo ${activeTab}`}
           </button>
        </div>

        {/* RIGHT WORKSPACE: DUAL-TABBED DISPLAY (7 COLS - NO SCROLLING NEEDED!) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
           
           {/* Right Panel Main Tabs */}
           <div className="flex justify-between items-center border-b border-slate-100 pb-3">
             <div className="flex gap-2">
               <button 
                 type="button"
                 onClick={() => setRightTab('REPORTS')} 
                 className={`px-4 py-2 rounded-xl font-black text-xs transition ${rightTab === 'REPORTS' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}
               >
                 📊 Báo Cáo Hôm Nay ({filteredEntries.length})
               </button>
               <button 
                 type="button"
                 onClick={() => setRightTab('MANAGEMENT')} 
                 className={`px-4 py-2 rounded-xl font-black text-xs transition ${rightTab === 'MANAGEMENT' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}
               >
                 📋 Quản Lý Nhóm & Kênh
               </button>
             </div>

             {rightTab === 'REPORTS' && (
               <input 
                 className="border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold w-40 focus:ring-2 focus:ring-sky-500" 
                 placeholder="🔍 Tìm..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
             )}
           </div>

           {/* RIGHT TAB 1: REPORTS LIST */}
           {rightTab === 'REPORTS' && (
             <div>
               {/* List Platform Filter Pills */}
               <div className="flex gap-1.5 mb-3 p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
                 {[
                   { id: 'ALL', label: 'Tất Cả', count: entries.length },
                   { id: 'Facebook', label: 'Facebook', count: entries.filter(e => e.platform === 'Facebook').length },
                   { id: 'YouTube', label: 'YouTube', count: entries.filter(e => e.platform === 'YouTube').length },
                   { id: 'TikTok', label: 'TikTok', count: entries.filter(e => e.platform === 'TikTok').length },
                 ].map(t => (
                   <button
                     key={t.id}
                     type="button"
                     onClick={() => setFilterPlatform(t.id)}
                     className={`flex-1 py-1 rounded-lg transition ${filterPlatform === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                   >
                     {t.label} ({t.count})
                   </button>
                 ))}
               </div>

               <div className="max-h-[460px] overflow-y-auto pr-1">
                 <table className="w-full text-left text-xs">
                     <thead className="sticky top-0 bg-white shadow-sm z-10">
                       <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase">
                         <th className="py-2">Nền</th>
                         <th>Giờ</th>
                         <th>Nhóm/Loại</th>
                         <th>Link</th>
                         <th>Reach</th>
                         <th>Share</th>
                         <th className="text-right">Sửa/Xóa</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filteredEntries.length === 0 ? (
                         <tr>
                           <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                             Chưa có báo cáo nào trong mục này.
                           </td>
                         </tr>
                       ) : filteredEntries.map(e => (
                         <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                             <td className="py-2.5 font-bold">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${e.platform === 'YouTube' ? 'bg-red-100 text-red-700' : e.platform === 'Facebook' ? 'bg-sky-100 text-sky-700' : 'bg-slate-950 text-white'}`}>
                                 {e.platform}
                               </span>
                             </td>
                             <td className="py-2.5 font-bold text-slate-700">{e.time || '--:--'}</td>
                             <td className="py-2.5 font-medium text-slate-600 truncate max-w-[90px]">{e.group || '--'}</td>
                             <td className="py-2.5">
                               <a href={e.link.startsWith('http') ? e.link : `https://${e.link}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold hover:underline bg-sky-50 px-2 py-1 rounded">
                                 Mở ↗
                               </a>
                             </td>
                             <td className="py-2.5 font-extrabold text-slate-900">{e.reach ? parseInt(e.reach).toLocaleString() : '0'}</td>
                             <td className="py-2.5">{e.isShared ? <span className="text-emerald-700 font-extrabold">✓</span> : <span className="text-slate-300">✕</span>}</td>
                             <td className="py-2.5 text-right">
                               <div className="flex justify-end gap-1.5">
                                 <button onClick={() => startEdit(e)} className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold text-[11px]">Sửa</button>
                                 <button onClick={() => handleDelete(e.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold text-[11px]">Xóa</button>
                               </div>
                             </td>
                         </tr>
                       ))}
                     </tbody>
                 </table>
               </div>
             </div>
           )}

           {/* RIGHT TAB 2: MANAGEMENT PANELS */}
           {rightTab === 'MANAGEMENT' && (
             <div className="space-y-5 max-h-[460px] overflow-y-auto pr-1">
               {/* FB Groups Management */}
               <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                 <h3 className="font-bold text-sm text-sky-700 mb-3 flex items-center gap-1.5">
                   <span>📘</span> Quản Lý Nhóm Facebook
                 </h3>
                 <div className="flex gap-2 mb-3">
                     <input className="border border-slate-200 p-2 rounded-xl w-1/3 text-xs" placeholder="Tên nhóm" value={groupName} onChange={e => setGroupName(e.target.value)} />
                     <input className="border border-slate-200 p-2 rounded-xl w-1/3 text-xs" placeholder="Link nhóm" value={groupLink} onChange={e => setGroupLink(e.target.value)} />
                     <button onClick={addGroup} className="bg-sky-600 hover:bg-sky-700 text-white px-4 rounded-xl font-bold text-xs">Thêm</button>
                 </div>
                 <table className="w-full text-xs">
                     <thead><tr className="border-b border-slate-200 text-slate-400 text-left"><th className="py-1.5">Nhóm FB</th><th className="text-right">Link</th></tr></thead>
                     <tbody>{groups.map((g, i) => (
                       <tr key={i} className="border-b border-slate-100">
                         <td className="py-2 font-bold">{g.name}</td>
                         <td className="text-right">
                           <a href={g.link.startsWith('http') ? g.link : `https://${g.link}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold underline">Mở ↗</a>
                         </td>
                       </tr>
                     ))}</tbody>
                 </table>
               </div>

               {/* YouTube Channels Management */}
               <div className="bg-red-50/40 p-4 rounded-xl border border-red-100">
                 <h3 className="font-bold text-sm text-red-600 mb-3 flex items-center gap-1.5">
                   <span>🎬</span> Quản Lý Kênh YouTube
                 </h3>
                 <div className="flex gap-2 mb-3">
                     <input className="border border-slate-200 p-2 rounded-xl w-1/3 text-xs" placeholder="Tên kênh" value={ytChannelName} onChange={e => setYtChannelName(e.target.value)} />
                     <input className="border border-slate-200 p-2 rounded-xl w-1/3 text-xs" placeholder="Link kênh" value={ytChannelLink} onChange={e => setYtChannelLink(e.target.value)} />
                     <button onClick={addYtChannel} className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-xl font-bold text-xs">Thêm</button>
                 </div>
                 <table className="w-full text-xs">
                     <thead><tr className="border-b border-slate-200 text-slate-400 text-left"><th className="py-1.5">Kênh YouTube</th><th className="text-right">Link</th></tr></thead>
                     <tbody>{ytChannels.map((c, i) => (
                       <tr key={i} className="border-b border-slate-100">
                         <td className="py-2 font-bold text-red-900">{c.name}</td>
                         <td className="text-right">
                           <a href={c.link.startsWith('http') ? c.link : `https://${c.link}`} target="_blank" rel="noopener noreferrer" className="text-red-600 font-bold underline">Xem ↗</a>
                         </td>
                       </tr>
                     ))}</tbody>
                 </table>
               </div>
             </div>
           )}

        </div>
      </div>
    </Layout>
  );
}
