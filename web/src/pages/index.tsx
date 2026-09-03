import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  const [activeTab, setActiveTab] = useState('Facebook');
  const [rightTab, setRightTab] = useState<'REPORTS' | 'MANAGEMENT'>('REPORTS');
  
  // Date Filtering State
  const [filterType, setFilterType] = useState<'TODAY' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM'>('TODAY');
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  // TikTok Channels state
  const [ttChannels, setTtChannels] = useState<{name: string, link: string}[]>([]);
  const [ttChannelName, setTtChannelName] = useState('');
  const [ttChannelLink, setTtChannelLink] = useState('');

  // Webhook State
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [notifyBot, setNotifyBot] = useState(false);
  const [botRemaining, setBotRemaining] = useState(2);
  // Helper to get current HH:mm
  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const [form, setForm] = useState({ 
    date: todayStr,
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
      let query = `?filterType=${filterType}`;
      if (filterType === 'TODAY') query += `&date=${selectedDate}`;
      if (filterType === 'MONTH') query += `&month=${selectedMonth}&year=${selectedYear}`;
      if (filterType === 'YEAR') query += `&year=${selectedYear}`;

      const resEntries = await fetch(`/api/reports${query}`);
      setEntries(await resEntries.json());
      
      const resGroups = await fetch('/api/groups');
      setGroups(await resGroups.json());

      const resYt = await fetch('/api/yt-channels');
      setYtChannels(await resYt.json());

      const resTt = await fetch('/api/tt-channels');
      setTtChannels(await resTt.json());

      const resWeb = await fetch('/api/webhook-config');
      const webData = await resWeb.json();
      if (webData.url) setWebhookUrlInput(webData.url);
      if (typeof webData.remainingToday === 'number') setBotRemaining(webData.remainingToday);
    } catch (e) {
      console.error("Lỗi tải dữ liệu", e);
    }
  };

  useEffect(() => { 
    fetchData();
  }, [filterType, selectedDate, selectedMonth, selectedYear]);

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
        setForm(prev => ({ ...prev, videoType: 'Shorts' }));
      } else if (lowerUrl.includes('/watch') || lowerUrl.includes('youtu.be/')) {
        setForm(prev => ({ ...prev, videoType: 'Video Dài' }));
      }
    } 
    // Auto-detect TikTok
    else if (lowerUrl.includes('tiktok.com')) {
      if (activeTab !== 'TikTok') {
        setActiveTab('TikTok');
        showToast('⚡ Tự động chuyển sang tab TikTok!');
      }
    } 
    // Auto-detect Facebook
    else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
      if (activeTab !== 'Facebook') {
        setActiveTab('Facebook');
        showToast('⚡ Tự động chuyển sang tab Facebook!');
      }
    }
  };

  const addGroup = async () => {
    if(!groupName || !groupLink) return alert("Nhập đủ tên và link nhóm!");
    const newGroups = [...groups, {name: groupName, link: groupLink}];
    await fetch('/api/groups', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newGroups) });
    setGroupName(''); setGroupLink(''); fetchData();
    showToast('✅ Đã lưu nhóm Facebook mới!');
  };

  const addYtChannel = async () => {
    if(!ytChannelName || !ytChannelLink) return alert("Nhập đủ tên và link kênh YouTube!");
    const newChannels = [...ytChannels, {name: ytChannelName, link: ytChannelLink}];
    await fetch('/api/yt-channels', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newChannels) });
    setYtChannelName(''); setYtChannelLink(''); fetchData();
    showToast('✅ Đã lưu kênh YouTube mới!');
  };

  const addTtChannel = async () => {
    if(!ttChannelName || !ttChannelLink) return alert("Nhập đủ tên và link kênh TikTok!");
    const newChannels = [...ttChannels, {name: ttChannelName, link: ttChannelLink}];
    await fetch('/api/tt-channels', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newChannels) });
    setTtChannelName(''); setTtChannelLink(''); fetchData();
    showToast('✅ Đã lưu kênh TikTok mới!');
  };

  const saveWebhook = async () => {
    await fetch('/api/webhook-config', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ url: webhookUrlInput }) });
    showToast('🤖 Đã lưu cấu hình Bot Webhook thành công!');
  };

  const handleSubmit = async () => {
    if (!form.link) return alert("Vui lòng dán Link bài/video!");
    
    const submissionTime = form.time.trim() || getCurrentTime();
    const method = editingId ? 'PUT' : 'POST';
    const groupValue = activeTab === 'Facebook' ? form.group : (activeTab === 'YouTube' ? `${form.videoType}${form.group ? ' - ' + form.group : ''}` : form.group);

    const res = await fetch('/api/reports', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...form, 
        date: form.date || todayStr,
        time: submissionTime,
        id: editingId, 
        platform: activeTab, 
        isShared, 
        image,
        group: groupValue,
        notifyBot
      })
    });

    // Bot feedback
    if (notifyBot && !editingId) {
      try {
        const result = await res.json();
        if (result.botSent) {
          showToast(`🤖 Đã gửi Bot! (Còn ${result.botRemainingToday}/2 lượt hôm nay)`);
        } else {
          showToast(`⚠️ Bot chưa gửi: ${result.botReason || 'Lý do không rõ'}`);
        }
      } catch (e) {}
    }
    setNotifyBot(false);

    setForm({ 
      date: todayStr,
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
    showToast(editingId ? '🎉 Đã cập nhật báo cáo thành công!' : '🎉 Đã thêm báo cáo mới!');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) return;
    await fetch('/api/reports', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
    fetchData();
    showToast('🗑️ Đã xóa báo cáo!');
  };

  const startEdit = (entry: any) => {
    setForm({ 
      date: entry.date || todayStr,
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
    setEditingId(entry.id);
    showToast('✏️ Đã tải dữ liệu lên form để sửa!');
  };

  // Executive PDF Export Engine (Hỗ trợ Nhiều Ngày/Tháng/Năm)
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

      let timeLabel = `Hôm nay (${selectedDate})`;
      if (filterType === 'MONTH') timeLabel = `Tháng ${selectedMonth}/${selectedYear}`;
      if (filterType === 'YEAR') timeLabel = `Năm ${selectedYear}`;
      if (filterType === 'ALL') timeLabel = `Tất Cả Thời Gian`;

      const totalReachSum = filteredEntries.reduce((acc, curr) => acc + (parseInt(curr.reach) || 0), 0);
      const fbCount = filteredEntries.filter(e => e.platform === 'Facebook').length;
      const ytCount = filteredEntries.filter(e => e.platform === 'YouTube').length;
      const ttCount = filteredEntries.filter(e => e.platform === 'TikTok').length;
      const sharedCount = filteredEntries.filter(e => e.isShared).length;
      const shareRate = filteredEntries.length > 0 ? Math.round((sharedCount / filteredEntries.length) * 100) : 0;

      // 1. TOP HEADER BANNER
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 34, 'F');
      
      doc.setFillColor(14, 165, 233);
      doc.rect(14, 8, 12, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("CF", 17.5, 16);

      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text(`CONTENTFLOW CRM - BÁO CÁO CÔNG VIỆC (${timeLabel.toUpperCase()})`, 31, 15);
      
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Tự động tổng hợp dữ liệu  |  Xuất báo cáo ngày: ${new Date().toLocaleDateString('vi-VN')}`, 31, 23);

      // 2. SUMMARY CARDS
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 38, 269, 22, 3, 3, 'FD');

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9);
      
      doc.text("TỔNG NỘI DUNG", 20, 45);
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`${filteredEntries.length} Bài/Video`, 20, 53);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`(FB: ${fbCount} | YT: ${ytCount} | TT: ${ttCount})`, 20, 57);

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("TỔNG LƯỢT XEM / REACH", 90, 45);
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text(`${totalReachSum.toLocaleString()} lượt`, 90, 53);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Cộng dồn tất cả báo cáo", 90, 57);

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("TỶ LỆ CHIA SẺ", 175, 45);
      doc.setFontSize(12);
      doc.setTextColor(2, 132, 199);
      doc.text(`${shareRate}% (${sharedCount}/${filteredEntries.length})`, 175, 53);

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("ĐÁNH GIÁ CHUNG", 240, 45);
      doc.setFontSize(11);
      doc.setTextColor(217, 119, 6);
      doc.text(totalReachSum > 10000 ? "🔥 Rất Tốt" : "✅ Hoạt Động", 240, 53);

      // 3. TABLE DATA
      const tableData = filteredEntries.map((e, index) => [
        (index + 1).toString(),
        e.date || '--',
        e.platform || 'N/A',
        e.time || '--:--',
        e.group || '--',
        e.link || '',
        e.reach ? parseInt(e.reach).toLocaleString() : '0',
        e.isShared ? '✓ Có' : '✕ Chưa',
        e.hook || '--'
      ]);

      autoTable(doc, {
        head: [["STT", "Ngày", "Nền tảng", "Giờ", "Nhóm / Kênh / Loại", "Link bài viết / video", "Reach / Views", "Shared", "Câu Hook / Tiêu đề"]],
        body: tableData,
        startY: 65,
        theme: 'grid',
        styles: {
          font: 'Roboto',
          fontSize: 8.5,
          cellPadding: 3.5,
          valign: 'middle',
          overflow: 'linebreak',
          lineColor: [226, 232, 240],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'normal',
          halign: 'center',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 32 },
          5: { cellWidth: 60, textColor: [2, 132, 199] },
          6: { cellWidth: 26, halign: 'right' },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 65 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.pages.length - 1;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`ContentFlow CRM • Hệ thống báo cáo đa ngày  |  Trang ${data.pageNumber} / ${pageCount}`, 14, 202);
        }
      });

      doc.save(`Bao_Cao_${timeLabel.replace(/\s+/g, '_')}.pdf`);
      showToast('📄 Đã xuất file PDF báo cáo đa ngày thành công!');
    } catch (error) {
      alert("Lỗi xuất PDF: " + error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Metrics calculation based on filtered entries
  const totalPosts = entries.length;
  const totalReachSum = entries.reduce((acc, curr) => acc + (parseInt(curr.reach) || 0), 0);
  const sharedCount = entries.filter(e => e.isShared).length;

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
        <div className="fixed top-4 right-4 z-50 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-bounce text-sm font-bold">
          <span className="text-emerald-400">✨</span>
          <span>{notification}</span>
        </div>
      )}

      {/* TOP HEADER - MULTI-DATE FILTER CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Báo Cáo Nội Dung</h1>
          <div className="flex items-center gap-3 text-sm text-slate-600 mt-1 font-bold">
            <span className="text-slate-900">📊 {filteredEntries.length} bài đăng</span>
            <span>•</span>
            <span className="text-emerald-600 font-extrabold">📈 {totalReachSum.toLocaleString()} Reach</span>
            <span>•</span>
            <span className="text-sky-600 font-extrabold">🚀 {sharedCount} shared</span>
          </div>
        </div>

        {/* MULTI-DATE FILTER BAR */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
          <div className="flex bg-white rounded-xl p-1 shadow-sm font-extrabold text-xs">
            <button 
              onClick={() => setFilterType('TODAY')} 
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'TODAY' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Hôm Nay
            </button>
            <button 
              onClick={() => setFilterType('MONTH')} 
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'MONTH' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Theo Tháng
            </button>
            <button 
              onClick={() => setFilterType('YEAR')} 
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'YEAR' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Theo Năm
            </button>
            <button 
              onClick={() => setFilterType('ALL')} 
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'ALL' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tất Cả
            </button>
          </div>

          {/* Sub-selectors depending on FilterType */}
          {filterType === 'TODAY' && (
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800"
            />
          )}

          {filterType === 'MONTH' && (
            <div className="flex items-center gap-1.5">
              <select 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(Number(e.target.value))} 
                className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800"
              >
                {Array.from({length: 12}, (_, i) => (
                  <option key={i+1} value={i+1}>Tháng {i+1}</option>
                ))}
              </select>
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(Number(e.target.value))} 
                className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800"
              >
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
              </select>
            </div>
          )}

          {filterType === 'YEAR' && (
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))} 
              className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800"
            >
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          )}

          <button 
            onClick={generatePDF} 
            disabled={isExportingPDF}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl font-extrabold transition shadow-md text-xs flex items-center gap-1.5 ml-auto"
          >
            <span>📄</span>
            <span>{isExportingPDF ? 'Đang xuất...' : 'Xuất PDF Báo Cáo'}</span>
          </button>
        </div>
      </div>

      {/* SIDE-BY-SIDE DUAL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT WORKSPACE: FORM INPUT */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
           <div className="flex items-center justify-between pb-3 border-b border-slate-100">
             <h2 className="font-black text-base text-slate-900 flex items-center gap-2">
               <span className="text-lg">✍️</span> 
               <span>{editingId ? 'Chỉnh Sửa Báo Cáo' : 'Nhập Báo Cáo Mới'}</span>
             </h2>
             {editingId && (
               <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-800 underline font-bold">
                 Hủy
               </button>
             )}
           </div>

           {/* Input Tab selector */}
           <div className="flex gap-1.5 p-1.5 bg-slate-100 rounded-xl text-sm font-extrabold">
              {tabs.map(t => {
                let activeColor = 'bg-sky-600 text-white shadow-sm';
                if (t === 'YouTube') activeColor = 'bg-red-600 text-white shadow-sm';
                if (t === 'TikTok') activeColor = 'bg-slate-950 text-white shadow-sm';

                return (
                  <button 
                    key={t} 
                    type="button"
                    onClick={() => setActiveTab(t)} 
                    className={`flex-1 py-2 rounded-lg transition ${activeTab === t ? activeColor : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {t === 'YouTube' ? '🎬 YT' : t === 'Facebook' ? '📘 FB' : '🎵 TT'}
                  </button>
                );
              })}
           </div>

           {/* Select Date for Report */}
           <div>
             <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Ngày Báo Cáo</label>
             <input 
               type="date" 
               className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900 bg-white" 
               value={form.date} 
               onChange={e => setForm({...form, date: e.target.value})}
             />
           </div>

           {/* AUTOMATED LINK INPUT */}
           <div>
             <div className="flex justify-between items-center mb-1.5">
               <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">Link ({activeTab})</label>
               <span className="text-xs text-sky-600 font-extrabold">⚡ Dán link tự chọn Tab</span>
             </div>
             <input 
               className="w-full border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500" 
               placeholder="Dán link bài viết / video tại đây..." 
               value={form.link} 
               onChange={e => handleLinkChange(e.target.value)} 
             />
           </div>

           {/* Facebook Group Selector */}
           {activeTab === 'Facebook' && (
             <div>
               <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Nhóm Facebook</label>
               <select className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900" value={form.group} onChange={e => setForm({...form, group: e.target.value})}>
                 <option value="">-- Chọn nhóm Facebook --</option>
                 {groups.map((g, i) => <option key={i} value={g.name}>{g.name}</option>)}
               </select>
             </div>
           )}

           {/* YouTube Specific Controls */}
           {activeTab === 'YouTube' && (
             <div className="grid grid-cols-2 gap-3 bg-red-50/90 p-3 rounded-xl border border-red-100 text-xs">
               <div>
                 <label className="block text-xs font-black text-red-900 uppercase mb-1">Loại Video</label>
                 <select 
                   className="w-full border border-red-200 p-2 rounded-lg bg-white font-extrabold text-sm text-slate-900" 
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
                 <label className="block text-xs font-black text-red-900 uppercase mb-1">Kênh YT</label>
                 <select 
                   className="w-full border border-red-200 p-2 rounded-lg bg-white font-extrabold text-sm text-slate-900" 
                   value={form.group} 
                   onChange={e => setForm({...form, group: e.target.value})}
                 >
                   <option value="">-- Chọn Kênh --</option>
                   {ytChannels.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                 </select>
               </div>
             </div>
           )}

           {/* TikTok Specific Controls */}
           {activeTab === 'TikTok' && (
             <div>
               <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Kênh TikTok</label>
               <select 
                 className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900 bg-white" 
                 value={form.group} 
                 onChange={e => setForm({...form, group: e.target.value})}
               >
                 <option value="">-- Chọn Kênh TikTok --</option>
                 {ttChannels.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
               </select>
             </div>
           )}

           {/* Time & Reach with Presets */}
           <div className="grid grid-cols-2 gap-3">
               <div>
                 <div className="flex justify-between items-center mb-1.5">
                   <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">Giờ đăng</label>
                   <button type="button" onClick={() => setForm(prev => ({ ...prev, time: getCurrentTime() }))} className="text-xs text-sky-600 font-extrabold hover:underline">⏰ Giờ này</button>
                 </div>
                 <input className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900" placeholder="HH:mm" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
               </div>

               <div>
                 <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Reach / Views</label>
                 <input className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900" placeholder="Số lượt..." value={form.reach} onChange={e => setForm({...form, reach: e.target.value})} />
                 <div className="flex gap-1.5 mt-1.5">
                   {[500, 1000, 5000].map((amt) => (
                     <button key={amt} type="button" onClick={() => setForm(prev => ({ ...prev, reach: ((parseInt(prev.reach) || 0) + amt).toString() }))} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 rounded-lg text-xs font-extrabold">
                       +{amt >= 1000 ? `${amt/1000}k` : amt}
                     </button>
                   ))}
                 </div>
               </div>
           </div>

           {/* Image / Thumbnail Attachment Upload */}
           <div>
             <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Ảnh Xem Trước / Thumbnail</label>
             <div className="flex items-center gap-3">
               <input 
                 type="file" 
                 accept="image/*" 
                 ref={fileInputRef}
                 className="hidden" 
                 onChange={e => {
                   const file = e.target.files?.[0];
                   if (file) {
                     const reader = new FileReader();
                     reader.onloadend = () => setImage(reader.result as string);
                     reader.readAsDataURL(file);
                   }
                 }} 
               />
               <button 
                 type="button" 
                 onClick={() => fileInputRef.current?.click()}
                 className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-200 flex items-center gap-1.5"
               >
                 <span>📷</span> {image ? 'Đã Tải Ảnh' : 'Tải Ảnh Thumbnail'}
               </button>
               {image && (
                 <div className="flex items-center gap-2">
                   <img src={image} alt="Thumbnail preview" className="w-9 h-9 object-cover rounded-lg border border-slate-200 shadow-sm" />
                   <button type="button" onClick={() => setImage(null)} className="text-xs text-rose-600 font-bold hover:underline">Xóa</button>
                 </div>
               )}
             </div>
           </div>
           {/* Hook & Suggestion */}
           <div className="grid grid-cols-2 gap-3">
             <div>
               <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Câu Hook / Tiêu đề</label>
               <input className="w-full border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-900" placeholder="Ghi chú câu hook..." value={form.hook} onChange={e => setForm({...form, hook: e.target.value})} />
             </div>

             <div>
               <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Đề xuất tối ưu</label>
               <input className="w-full border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-900" placeholder="Ý tưởng sửa..." value={form.suggestion} onChange={e => setForm({...form, suggestion: e.target.value})} />
             </div>
           </div>

           {/* Share Toggle */}
           <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
             <span className="text-sm font-extrabold text-slate-800">Đã chia sẻ vào các nhóm?</span>
             <button 
               type="button" 
               onClick={() => setIsShared(!isShared)} 
               className={`px-4 py-2 rounded-xl text-xs font-black transition ${isShared ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
             >
               {isShared ? '✓ ĐÃ CHIA SẺ' : '✕ CHƯA CHIA SẺ'}
             </button>
           </div>

          {/* Bot Notification Toggle (max 2/day) */}
          <div className={`flex items-center justify-between p-3.5 rounded-xl border ${botRemaining > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
            <div>
              <span className="text-sm font-extrabold text-slate-800">🤖 Gửi Bot thông báo nhóm?</span>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Còn {botRemaining}/2 lượt gửi Bot hôm nay</p>
            </div>
            <button 
              type="button" 
              disabled={botRemaining <= 0}
              onClick={() => setNotifyBot(!notifyBot)} 
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${notifyBot ? 'bg-indigo-600 text-white' : botRemaining > 0 ? 'bg-indigo-200 text-indigo-900 hover:bg-indigo-300' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {notifyBot ? '🔔 SẼ GỬI BOT' : '🔕 KHÔNG GỬI'}
            </button>
          </div>
           <button 
             type="button"
             onClick={handleSubmit} 
             className={`w-full py-3.5 rounded-xl font-black text-white transition text-sm shadow-md ${activeTab === 'YouTube' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-950 hover:bg-slate-800'}`}
           >
             {editingId ? 'Cập Nhật Báo Cáo' : `Lưu Báo Cáo ${activeTab}`}
           </button>
        </div>

        {/* RIGHT WORKSPACE: DUAL-TABBED DISPLAY */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
           
           {/* Right Panel Main Tabs */}
           <div className="flex justify-between items-center border-b border-slate-100 pb-3">
             <div className="flex gap-2">
               <button 
                 type="button"
                 onClick={() => setRightTab('REPORTS')} 
                 className={`px-4 py-2.5 rounded-xl font-black text-xs transition ${rightTab === 'REPORTS' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}
               >
                 📊 Báo Cáo ({filteredEntries.length})
               </button>
               <button 
                 type="button"
                 onClick={() => setRightTab('MANAGEMENT')} 
                 className={`px-4 py-2.5 rounded-xl font-black text-xs transition ${rightTab === 'MANAGEMENT' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}
               >
                 📋 Quản Lý Nhóm & Kênh
               </button>
             </div>

             {rightTab === 'REPORTS' && (
               <input 
                 className="border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold w-44 focus:ring-2 focus:ring-sky-500" 
                 placeholder="🔍 Tìm kiếm..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
             )}
           </div>

           {/* RIGHT TAB 1: REPORTS LIST */}
           {rightTab === 'REPORTS' && (
             <div>
               {/* List Platform Filter Pills */}
               <div className="flex gap-1.5 mb-3 p-1.5 bg-slate-100 rounded-xl text-xs font-extrabold">
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
                     className={`flex-1 py-1.5 rounded-lg transition ${filterPlatform === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                   >
                     {t.label} ({t.count})
                   </button>
                 ))}
               </div>

               <div className="max-h-[460px] overflow-y-auto pr-1">
                 <table className="w-full text-left text-sm">
                     <thead className="sticky top-0 bg-white shadow-sm z-10">
                       <tr className="border-b border-slate-200 text-slate-500 font-black uppercase text-xs">
                         <th className="py-2.5 px-1">Ngày</th>
                         <th className="px-1">Nền</th>
                         <th className="px-1">Giờ</th>
                         <th className="px-1">Nhóm/Kênh</th>
                         <th className="px-1">Link</th>
                         <th className="px-1">Reach</th>
                         <th className="px-1">Share</th>
                         <th className="px-1 hidden md:table-cell">Câu Hook</th>
                         <th className="text-right px-1">Hành động</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filteredEntries.length === 0 ? (
                         <tr>
                           <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold text-sm">
                             Chưa có báo cáo nào trong mục này.
                           </td>
                         </tr>
                       ) : filteredEntries.map(e => (
                        <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                            <td className="py-3 px-1 font-bold text-slate-500 text-xs">{e.date || '--'}</td>
                            <td className="py-3 px-1 font-bold">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${e.platform === 'YouTube' ? 'bg-red-100 text-red-700' : e.platform === 'Facebook' ? 'bg-sky-100 text-sky-700' : 'bg-slate-950 text-white'}`}>
                                {e.platform}
                              </span>
                            </td>
                            <td className="py-3 px-1 font-bold text-slate-800 text-xs">{e.time || '--:--'}</td>
                            <td className="py-3 px-1 font-semibold text-slate-700 truncate max-w-[100px] text-xs">{e.group || '--'}</td>
                            <td className="py-3 px-1">
                              <a href={e.link.startsWith('http') ? e.link : `https://${e.link}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 font-extrabold hover:underline bg-sky-50 px-2 py-0.5 rounded text-xs">
                                Mở ↗
                              </a>
                            </td>
                            <td className="py-3 px-1 font-black text-slate-900 text-xs">{e.reach ? parseInt(e.reach).toLocaleString() : '0'}</td>
                            <td className="py-3 px-1">{e.isShared ? <span className="text-emerald-700 font-extrabold text-xs">✓</span> : <span className="text-slate-300 font-bold text-xs">✕</span>}</td>
                            <td className="py-3 px-1 hidden md:table-cell max-w-[120px] truncate text-slate-600 font-medium text-xs">{e.hook || '--'}</td>
                            <td className="py-3 px-1 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => startEdit(e)} className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded font-extrabold text-xs">Sửa</button>
                                <button onClick={() => handleDelete(e.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded font-extrabold text-xs">Xóa</button>
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
                     <input className="border border-slate-200 p-2.5 rounded-xl w-1/3 text-xs font-semibold" placeholder="Tên nhóm" value={groupName} onChange={e => setGroupName(e.target.value)} />
                     <input className="border border-slate-200 p-2.5 rounded-xl w-1/3 text-xs font-semibold" placeholder="Link nhóm" value={groupLink} onChange={e => setGroupLink(e.target.value)} />
                     <button onClick={addGroup} className="bg-sky-600 hover:bg-sky-700 text-white px-4 rounded-xl font-bold text-xs">Thêm</button>
                 </div>
                 <table className="w-full text-xs">
                     <thead><tr className="border-b border-slate-200 text-slate-400 text-left"><th className="py-1.5">Nhóm FB</th><th className="text-right">Link</th></tr></thead>
                     <tbody>{groups.map((g, i) => (
                       <tr key={i} className="border-b border-slate-100">
                         <td className="py-2 font-bold text-slate-800">{g.name}</td>
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
                     <input className="border border-slate-200 p-2.5 rounded-xl w-1/3 text-xs font-semibold" placeholder="Tên kênh" value={ytChannelName} onChange={e => setYtChannelName(e.target.value)} />
                     <input className="border border-slate-200 p-2.5 rounded-xl w-1/3 text-xs font-semibold" placeholder="Link kênh" value={ytChannelLink} onChange={e => setYtChannelLink(e.target.value)} />
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

              {/* TikTok Channels Management */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-white">
                <h3 className="font-bold text-sm text-sky-400 mb-3 flex items-center gap-1.5">
                  <span>🎵</span> Quản Lý Kênh TikTok
                </h3>
                <div className="flex gap-2 mb-3">
                    <input className="border border-slate-800 bg-slate-900 p-2.5 rounded-xl w-1/3 text-xs font-semibold text-white placeholder-slate-500" placeholder="Tên kênh TikTok" value={ttChannelName} onChange={e => setTtChannelName(e.target.value)} />
                    <input className="border border-slate-800 bg-slate-900 p-2.5 rounded-xl w-1/3 text-xs font-semibold text-white placeholder-slate-500" placeholder="Link kênh TikTok" value={ttChannelLink} onChange={e => setTtChannelLink(e.target.value)} />
                    <button onClick={addTtChannel} className="bg-sky-500 hover:bg-sky-600 text-slate-950 px-4 rounded-xl font-black text-xs">Thêm</button>
                </div>
                <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-800 text-slate-400 text-left"><th className="py-1.5">Kênh TikTok</th><th className="text-right">Link</th></tr></thead>
                    <tbody>{ttChannels.map((c, i) => (
                      <tr key={i} className="border-b border-slate-900">
                        <td className="py-2 font-bold text-slate-200">{c.name}</td>
                        <td className="text-right">
                          <a href={c.link.startsWith('http') ? c.link : `https://${c.link}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 font-bold underline">Xem ↗</a>
                        </td>
                      </tr>
                    ))}</tbody>
                </table>
              </div>
              {/* Webhook Configuration Management */}
              <div className="bg-indigo-950 p-4 rounded-xl border border-indigo-800 text-white">
                <h3 className="font-bold text-sm text-indigo-400 mb-2 flex items-center gap-1.5">
                  <span>🤖</span> Cấu Hình Bot Webhook Thông Báo Tự Động
                </h3>
                <p className="text-xs text-indigo-200 mb-3">Dán URL Webhook của Telegram, Lark Suite hoặc Zalo Bot vào đây để tự động nhận thông báo báo cáo mới.</p>
                <div className="flex gap-2">
                  <input className="border border-indigo-800 bg-indigo-900/90 p-2.5 rounded-xl flex-1 text-xs font-semibold text-white placeholder-indigo-400" placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..." value={webhookUrlInput} onChange={e => setWebhookUrlInput(e.target.value)} />
                  <button onClick={saveWebhook} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 rounded-xl font-extrabold text-xs">Lưu Webhook</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
