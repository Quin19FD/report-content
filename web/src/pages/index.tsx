import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  const [activeTab, setActiveTab] = useState('Facebook');
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
        showToast('⚡ Tự động nhận diện & chuyển sang tab YouTube!');
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
        showToast('📘 Tự động nhận diện & chuyển sang tab Facebook!');
      }
    } 
    // Auto-detect TikTok
    else if (lowerUrl.includes('tiktok.com')) {
      if (activeTab !== 'TikTok') {
        setActiveTab('TikTok');
        showToast('🎵 Tự động nhận diện & chuyển sang tab TikTok!');
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
    
    // Auto-fill time if blank
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

    // Reset form to smart defaults
    setForm({ 
      link: '', 
      time: getCurrentTime(), // Auto pre-fill with current time for next entry!
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
        console.warn("Fallback to default font", err);
      }

      const today = new Date().toLocaleDateString('vi-VN');
      const totalReachSum = entries.reduce((acc, curr) => acc + (parseInt(curr.reach) || 0), 0);

      // Header Banner
      doc.setFillColor(15, 23, 42); // Dark slate
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

  // Calculated Dashboard Metrics
  const totalPosts = entries.length;
  const totalReachSum = entries.reduce((acc, curr) => acc + (parseInt(curr.reach) || 0), 0);
  const sharedCount = entries.filter(e => e.isShared).length;
  const shareRate = totalPosts > 0 ? Math.round((sharedCount / totalPosts) * 100) : 0;

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
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-bounce">
          <span className="text-emerald-400 font-bold">✨</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Báo Cáo Nội Dung</h1>
          <p className="text-slate-500 text-sm mt-1">Tự động nhận diện link • Tối ưu nhập liệu • Đồng bộ vĩnh viễn</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={generatePDF} 
            disabled={isExportingPDF}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-6 py-3 rounded-2xl font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 text-sm"
          >
            <span>📄</span>
            <span>{isExportingPDF ? 'Đang tạo PDF...' : 'Xuất PDF Chuyên Nghiệp'}</span>
          </button>
        </div>
      </div>

      {/* Top Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-sky-300 transition">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">Tổng Bài Đăng Hôm Nay</span>
            <span className="p-2 rounded-xl bg-sky-50 text-sky-600 font-bold text-sm">📊</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{totalPosts}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Báo cáo đã lưu trong ngày</div>
          <div className="absolute top-0 right-0 w-2 h-full bg-sky-500 rounded-r-2xl"></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">Tổng Reach / Lượt Xem</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">📈</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{totalReachSum.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Cộng dồn tất cả nền tảng</div>
          <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500 rounded-r-2xl"></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">Tỷ Lệ Đã Share</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm">🚀</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{shareRate}%</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">{sharedCount} / {totalPosts} bài đã chia sẻ</div>
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 rounded-r-2xl"></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">Trạng Thái Tự Động</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 font-bold text-sm">⚡</span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1">Smart Auto-Detect</div>
          <div className="text-xs text-emerald-600 font-bold mt-1">✓ Tự nhận diện link & giờ</div>
          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 rounded-r-2xl"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Form nhập liệu thông minh (7 Cột) */}
        <div className="lg:col-span-7 bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
           <div className="flex items-center justify-between border-b border-slate-100 pb-4">
             <h2 className="font-black text-lg text-slate-900 flex items-center gap-2">
               <span>✍️</span> 
               <span>{editingId ? 'Chỉnh Sửa Báo Cáo' : 'Nhập Báo Cáo Mới'}</span>
             </h2>
             {editingId && (
               <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold">
                 Hủy chỉnh sửa
               </button>
             )}
           </div>

           {/* Tab selector */}
           <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              {tabs.map(t => {
                let activeColor = 'bg-sky-600 text-white shadow-md shadow-sky-600/20';
                if (t === 'YouTube') activeColor = 'bg-red-600 text-white shadow-md shadow-red-600/20';
                if (t === 'TikTok') activeColor = 'bg-slate-950 text-white shadow-md shadow-slate-950/20';

                return (
                  <button 
                    key={t} 
                    type="button"
                    onClick={() => setActiveTab(t)} 
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${activeTab === t ? activeColor : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {t === 'YouTube' ? '🎬 YouTube' : t === 'Facebook' ? '📘 Facebook' : '🎵 TikTok'}
                  </button>
                );
              })}
           </div>

           {/* AUTOMATED LINK INPUT */}
           <div>
             <div className="flex justify-between items-center mb-1">
               <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                 Link Bài Viết / Video ({activeTab})
               </label>
               <span className="text-[11px] text-sky-600 font-semibold">⚡ Dán link là tự nhận diện tab</span>
             </div>
             <input 
               className="w-full border border-slate-200 p-3.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition" 
               placeholder="Dán link bài viết Facebook, video YouTube hoặc TikTok tại đây..." 
               value={form.link} 
               onChange={e => handleLinkChange(e.target.value)} 
             />
           </div>

           {/* Facebook Group Selector */}
           {activeTab === 'Facebook' && (
             <div>
               <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">Nhóm Facebook Đã Đăng</label>
               <select className="w-full border border-slate-200 p-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-sky-500" value={form.group} onChange={e => setForm({...form, group: e.target.value})}>
                 <option value="">-- Chọn nhóm Facebook (tùy chọn) --</option>
                 {groups.map((g, i) => <option key={i} value={g.name}>{g.name}</option>)}
               </select>
             </div>
           )}

           {/* YouTube Specific Controls */}
           {activeTab === 'YouTube' && (
             <div className="grid grid-cols-2 gap-4 bg-red-50/70 p-4 rounded-2xl border border-red-100">
               <div>
                 <label className="block text-xs font-extrabold text-red-800 uppercase tracking-wide mb-1">Loại Video YouTube</label>
                 <select 
                   className="w-full border border-red-200 p-2.5 rounded-xl bg-white text-sm font-semibold" 
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
                 <label className="block text-xs font-extrabold text-red-800 uppercase tracking-wide mb-1">Kênh YouTube</label>
                 <select 
                   className="w-full border border-red-200 p-2.5 rounded-xl bg-white text-sm font-semibold" 
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
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <div className="flex justify-between items-center mb-1">
                   <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">Giờ đăng</label>
                   <button 
                     type="button" 
                     onClick={() => setForm(prev => ({ ...prev, time: getCurrentTime() }))}
                     className="text-[11px] text-sky-600 hover:underline font-bold"
                   >
                     ⏰ Lấy giờ hiện tại
                   </button>
                 </div>
                 <input className="w-full border border-slate-200 p-3 rounded-xl text-sm font-semibold" placeholder="HH:mm" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
               </div>

               <div>
                 <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">
                   {activeTab === 'YouTube' ? 'Lượt Xem (Views)' : 'Reach / Lượt tiếp cận'}
                 </label>
                 <input className="w-full border border-slate-200 p-3 rounded-xl text-sm font-semibold" placeholder="Nhập số lượt..." value={form.reach} onChange={e => setForm({...form, reach: e.target.value})} />
                 
                 {/* Quick Reach Presets Buttons */}
                 <div className="flex gap-1.5 mt-2">
                   {[500, 1000, 5000, 10000].map((amt) => (
                     <button
                       key={amt}
                       type="button"
                       onClick={() => addReachPreset(amt)}
                       className="px-2 py-1 bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-slate-600 rounded-lg text-[11px] font-bold transition"
                     >
                       +{amt >= 1000 ? `${amt/1000}k` : amt}
                     </button>
                   ))}
                 </div>
               </div>
           </div>

           {/* Image Upload */}
           <div>
             <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">Ảnh Đính Kèm (Báo cáo/Chỉ số)</label>
             <div className="border border-dashed border-slate-300 p-3 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition text-sm flex items-center justify-between" onClick={() => fileInputRef.current?.click()}>
               <span className="text-slate-600 font-semibold">{image ? '✅ Đã chọn ảnh đính kèm' : '📷 Click để tải ảnh bài viết/số liệu'}</span>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const reader = new FileReader();
                  reader.onloadend = () => setImage(reader.result as string);
                  if(e.target.files?.[0]) reader.readAsDataURL(e.target.files[0]);
               }} />
             </div>
           </div>

           {/* Hook & Suggestion */}
           <div>
             <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">Câu Hook / Tiêu Đề Bài Viết</label>
             <textarea className="w-full border border-slate-200 p-3 rounded-xl h-16 text-sm font-medium" placeholder="Nhập câu hook gây chú ý hoặc tiêu đề video..." value={form.hook} onChange={e => setForm({...form, hook: e.target.value})} />
           </div>

           <div>
             <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1">Đề Xuất Chỉnh Sửa / Ghi Chú Tối Ưu</label>
             <textarea className="w-full border border-slate-200 p-3 rounded-xl h-16 text-sm font-medium" placeholder="Đề xuất cải thiện cho lần đăng sau..." value={form.suggestion} onChange={e => setForm({...form, suggestion: e.target.value})} />
           </div>

           {/* Share Toggle */}
           <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
             <span className="text-sm font-bold text-slate-700">Trạng thái chia sẻ (Shared)</span>
             <button 
               type="button"
               onClick={() => setIsShared(!isShared)} 
               className={`px-6 py-2 rounded-xl font-bold transition text-xs shadow-sm ${isShared ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}
             >
               {isShared ? '✓ Đã Share' : '✕ Chưa Share'}
             </button>
           </div>

           <button 
             type="button"
             onClick={handleSubmit} 
             className={`w-full py-4 rounded-2xl font-black text-white transition-all duration-200 text-sm shadow-lg ${activeTab === 'YouTube' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-slate-950 hover:bg-slate-800 shadow-slate-950/20'}`}
           >
             {editingId ? 'Cập Nhật Báo Cáo' : `Lưu Báo Cáo ${activeTab}`}
           </button>
        </div>

        {/* Dynamic Right Side Panels (5 Cột) */}
        <div className="lg:col-span-5 space-y-6">
           {activeTab === 'Facebook' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="font-black text-lg mb-4 text-sky-700 flex items-center gap-2">
                    <span>📋</span> Quản Lý Nhóm Facebook
                  </h2>
                  <div className="flex gap-2 mb-4">
                      <input className="border border-slate-200 p-2.5 rounded-xl w-1/3 text-xs font-medium" placeholder="Tên nhóm" value={groupName} onChange={e => setGroupName(e.target.value)} />
                      <input className="border border-slate-200 p-2.5 rounded-xl w-1/3 text-xs font-medium" placeholder="Link nhóm" value={groupLink} onChange={e => setGroupLink(e.target.value)} />
                      <button onClick={addGroup} className="bg-sky-600 hover:bg-sky-700 text-white px-4 rounded-xl font-bold text-xs">Thêm</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                        <thead><tr className="border-b border-slate-200 text-slate-400 text-left"><th className="py-2">Nhóm</th><th className="text-right">Link</th></tr></thead>
                        <tbody>{groups.map((g, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2.5 font-bold text-slate-800">{g.name}</td>
                            <td className="text-right">
                              <a href={g.link.startsWith('http') ? g.link : `https://${g.link}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-bold bg-sky-50 px-2.5 py-1 rounded-lg">
                                Mở ↗
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
                  <h2 className="font-black text-lg mb-4 text-red-600 flex items-center gap-2">
                    <span>🎬</span> Quản Lý Kênh YouTube
                  </h2>
                  <div className="flex gap-2 mb-4">
                      <input className="border border-slate-200 p-2.5 rounded-xl w-1/3 text-xs font-medium" placeholder="Tên kênh" value={ytChannelName} onChange={e => setYtChannelName(e.target.value)} />
                      <input className="border border-slate-200 p-2.5 rounded-xl w-1/3 text-xs font-medium" placeholder="Link kênh" value={ytChannelLink} onChange={e => setYtChannelLink(e.target.value)} />
                      <button onClick={addYtChannel} className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-xl font-bold text-xs">Thêm</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                        <thead><tr className="border-b border-slate-200 text-slate-400 text-left"><th className="py-2">Kênh</th><th className="text-right">Link</th></tr></thead>
                        <tbody>{ytChannels.map((c, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2.5 font-bold text-red-900">{c.name}</td>
                            <td className="text-right">
                              <a href={c.link.startsWith('http') ? c.link : `https://${c.link}`} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline font-bold bg-red-50 px-2.5 py-1 rounded-lg">
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
                  <h2 className="font-black text-lg mb-2 text-slate-900 flex items-center gap-2">
                    <span>🎵</span> Hướng Dẫn Tối Ưu TikTok
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">Dán link TikTok vào ô bên trái, hệ thống tự chọn tab TikTok và gắn thời gian tự động.</p>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                    <p className="font-bold text-slate-800">💡 Thống kê xu hướng TikTok:</p>
                    <p>• Dưới 500 views: Cần cải thiện 3 giây đầu bài viết.</p>
                    <p>• 1,000 - 5,000 views: Đang vào phân phối luồng chuẩn.</p>
                    <p>• Trên 10,000 views: Bài viết đã đạt mốc xu hướng!</p>
                  </div>
              </div>
           )}
        </div>
      </div>

      {/* Báo Cáo Tổng Hợp Dạng Tab Chuyên Biệt */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-black text-xl text-slate-900">Danh Sách Báo Cáo Hôm Nay ({filteredEntries.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tách riêng từng tab giúp xem báo cáo gọn gàng, không bị rối mắt</p>
            </div>

            {/* Search Input */}
            <div className="w-full md:w-auto">
              <input 
                className="border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold w-full md:w-64 focus:ring-2 focus:ring-sky-500" 
                placeholder="🔍 Tìm kiếm nhanh link, hook, nhóm..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Prominent Visual Platform Tabs for List */}
          <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-slate-100 rounded-2xl">
            {[
              { id: 'ALL', label: '🌐 Tất Cả Báo Cáo', count: entries.length, color: 'bg-slate-900 text-white' },
              { id: 'Facebook', label: '📘 Facebook', count: entries.filter(e => e.platform === 'Facebook').length, color: 'bg-sky-600 text-white' },
              { id: 'YouTube', label: '🎬 YouTube', count: entries.filter(e => e.platform === 'YouTube').length, color: 'bg-red-600 text-white' },
              { id: 'TikTok', label: '🎵 TikTok', count: entries.filter(e => e.platform === 'TikTok').length, color: 'bg-slate-950 text-white' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterPlatform(tab.id)}
                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 ${
                  filterPlatform === tab.id 
                    ? `${tab.color} shadow-md` 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  filterPlatform === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider">
                      <th className="py-3">Nền tảng</th>
                      <th>Giờ</th>
                      <th>Nhóm / Loại</th>
                      <th>Link bài viết</th>
                      <th>Reach/Views</th>
                      <th>Shared</th>
                      <th>Câu Hook</th>
                      <th className="text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                          Chưa có báo cáo nào phù hợp. Hãy nhập báo cáo ở trên!
                        </td>
                      </tr>
                    ) : filteredEntries.map(e => (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                          <td className="py-4 font-bold">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${e.platform === 'YouTube' ? 'bg-red-100 text-red-700' : e.platform === 'Facebook' ? 'bg-sky-100 text-sky-700' : 'bg-slate-950 text-white'}`}>
                              {e.platform}
                            </span>
                          </td>
                          <td className="py-4 font-bold text-slate-700">{e.time || '--:--'}</td>
                          <td className="py-4 font-medium text-slate-600">{e.group || '--'}</td>
                          <td className="py-4">
                            <a href={e.link.startsWith('http') ? e.link : `https://${e.link}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold hover:underline bg-sky-50 px-2.5 py-1.5 rounded-lg">
                              Mở Link ↗
                            </a>
                          </td>
                          <td className="py-4 font-extrabold text-slate-900 text-sm">{e.reach ? parseInt(e.reach).toLocaleString() : '0'}</td>
                          <td className="py-4">
                            {e.isShared 
                              ? <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-lg">✓ Có</span> 
                              : <span className="text-slate-400 font-medium">Chưa</span>
                            }
                          </td>
                          <td className="py-4 max-w-xs truncate text-slate-600 font-medium">{e.hook || '--'}</td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => startEdit(e)} className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold transition">Sửa</button>
                              <button onClick={() => handleDelete(e.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg font-bold transition">Xóa</button>
                            </div>
                          </td>
                      </tr>
                    ))}
                  </tbody>
              </table>
          </div>
      </div>
    </Layout>
  );
}
