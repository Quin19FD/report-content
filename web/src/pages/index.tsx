import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { type ReportEntry, type ChannelApiConfig, type SyncResult } from '../lib/types';
export default function Home() {
  const [activeTab, setActiveTab] = useState('Facebook');
  const [rightTab, setRightTab] = useState<'REPORTS' | 'MANAGEMENT'>('REPORTS');
  
  // Date Filtering State
  const [filterType, setFilterType] = useState<'TODAY' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM'>('TODAY');
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('ALL');
  
  // Facebook Channels & Groups state (Phân biệt Page vs Seeding Group)
  const [groups, setGroups] = useState<{name: string, link: string, type?: 'PAGE' | 'PROFILE' | 'GROUP'}[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupLink, setGroupLink] = useState('');
  const [groupType, setGroupType] = useState<'PAGE' | 'PROFILE' | 'GROUP'>('PAGE');
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
  const [isAdmin, setIsAdmin] = useState(false);

  // Channel API Sync State
  const [channelConfigs, setChannelConfigs] = useState<ChannelApiConfig[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [syncDays, setSyncDays] = useState<number>(7);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({
    fbPageId: '',
    fbPageAccessToken: '',
    ytChannelId: '',
    ytApiKey: '',
    ttUsername: '',
    ttAccessToken: '',
    rapidApiKey: '',
  });
  useEffect(() => {
    if (typeof window !== 'undefined') setIsAdmin(localStorage.getItem('cf_auth') === 'admin');
  }, []);
  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const [form, setForm] = useState({ 
    date: todayStr,
    link: '', 
    time: getCurrentTime(), 
    reach: '', 
    likes: '0',
    comments: '0',
    shares: '0',
    inboxCount: '0',
    hook: '', 
    suggestion: '', 
    group: '',
    sharedGroup: '',
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

      const resConfigs = await fetch('/api/channel-configs');
      if (resConfigs.ok) {
        setChannelConfigs(await resConfigs.json());
      }
    } catch (e) {
      console.error("Lỗi tải dữ liệu", e);
    }
  };

  useEffect(() => { 
    fetchData();
  }, [filterType, selectedDate, selectedMonth, selectedYear]);

  const triggerManualSync = async (daysToSync: number = syncDays) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/cron/sync-daily?days=${daysToSync}`, {
        method: 'POST',
        headers: { 'x-admin-auth': 'admin' },
      });
      const data = await res.json();
      if (data.success && data.result) {
        setLastSyncResult(data.result as SyncResult);
        showToast(`⚡ Đã quét ${daysToSync > 1 ? `${daysToSync} ngày qua` : 'hôm nay'}: ${data.result.totalSyncedPosts} bài (không trùng lặp)!`);
        fetchData();
      } else {
        showToast(`⚠️ Đồng bộ: ${data.error || data.message || 'Xem chi tiết'}`);
      }
    } catch {
      showToast('❌ Lỗi kết nối khi đồng bộ kênh');
    } finally {
      setIsSyncing(false);
    }
  };

  const saveChannelConfig = async (configId: string, updates: Partial<ChannelApiConfig>) => {
    const updated = channelConfigs.map((c) => (c.id === configId ? { ...c, ...updates } : c));
    setChannelConfigs(updated);
    await fetch('/api/channel-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    showToast('💾 Đã lưu cấu hình API kênh!');
    setEditingConfigId(null);
  };

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
    if(!groupName || !groupLink) return alert("Nhập đủ tên và link nhóm/page!");
    const newGroups = [...groups, {name: groupName, link: groupLink, type: groupType}];
    await fetch('/api/groups', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newGroups) });
    setGroupName(''); setGroupLink(''); fetchData();
    showToast('✅ Đã lưu Fanpage/Nhóm Facebook mới!');
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
        reach: form.reach || '0',
        likes: parseInt(form.likes) || 0,
        comments: parseInt(form.comments) || 0,
        shares: parseInt(form.shares) || 0,
        inboxCount: parseInt(form.inboxCount) || 0,
        date: form.date || todayStr,
        time: submissionTime,
        id: editingId, 
        platform: activeTab, 
        isShared, 
        image,
        group: groupValue,
        sharedGroup: form.sharedGroup || undefined,
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
      likes: '0',
      comments: '0',
      shares: '0',
      inboxCount: '0',
      hook: '', 
      suggestion: '', 
      group: '', 
      sharedGroup: '',
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
  const handleClearAllReports = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu bài đăng đã lưu không?\n\nToàn bộ thông tin Fanpage, cấu hình API kênh và Kế hoạch vẫn sẽ được giữ nguyên 100%.')) return;
    try {
      const res = await fetch('/api/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        setLastSyncResult(null);
        fetchData();
        showToast('🗑️ Đã xóa sạch toàn bộ bài đăng! Thông tin page & kênh được giữ nguyên.');
      } else {
        showToast('❌ Không thể xóa dữ liệu');
      }
    } catch {
      showToast('❌ Lỗi kết nối khi xóa dữ liệu');
    }
  };
  // Clone: nhân bản 1 báo cáo (đổi link/reach sau)
  const cloneEntry = async (entry: ReportEntry) => {
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, id: undefined, date: todayStr, time: getCurrentTime(), reach: '0' })
    });
    fetchData();
    showToast('⧉ Đã nhân bản báo cáo — sửa Reach/Link ngay trong bảng!');
  };

  // Inline Edit: sửa trực tiếp ô Reach / Hook trong bảng
  const updateEntryInline = async (id: number, field: string, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    await fetch('/api/reports', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value })
    });
  };

  // Bulk Import: dán nhiều link 1 lượt, tự nhận diện nền tảng
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const detectPlatform = (url: string): string => {
    const u = url.toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
    if (u.includes('tiktok.com')) return 'TikTok';
    if (u.includes('facebook.com') || u.includes('fb.watch')) return 'Facebook';
    return activeTab;
  };
  const handleBulkImport = async () => {
    const links = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    if (links.length === 0) return alert('Dán ít nhất 1 link vào ô!');
    for (const link of links) {
      const platform = detectPlatform(link);
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, link, platform, time: getCurrentTime(), reach: '0', hook: '', group: '' })
      });
    }
    setBulkText('');
    setShowBulk(false);
    fetchData();
    showToast(`⚡ Đã nhập nhanh ${links.length} báo cáo cùng lúc!`);
  };

  const startEdit = (entry: ReportEntry) => {
    setForm({ 
      date: entry.date || todayStr,
      link: entry.link || '', 
      time: entry.time || getCurrentTime(), 
      reach: entry.reach !== undefined ? String(entry.reach) : '', 
      likes: entry.likes !== undefined ? String(entry.likes) : '0',
      comments: entry.comments !== undefined ? String(entry.comments) : '0',
      shares: entry.shares !== undefined ? String(entry.shares) : '0',
      inboxCount: entry.inboxCount !== undefined ? String(entry.inboxCount) : '0',
      hook: entry.hook || '', 
      suggestion: entry.suggestion || '', 
      group: typeof entry.group === 'string' ? entry.group : '',
      sharedGroup: typeof entry.sharedGroup === 'string' ? entry.sharedGroup : '',
      videoType: typeof entry.videoType === 'string' ? entry.videoType : 'Shorts'
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

      const totalReachSum = filteredEntries.reduce((acc, curr) => acc + (parseInt(String(curr.reach || 0)) || 0), 0);
      const totalInboxSum = filteredEntries.reduce((acc, curr) => acc + (parseInt(String(curr.inboxCount || 0)) || 0), 0);
      const inboxRate = totalReachSum > 0 ? ((totalInboxSum / totalReachSum) * 100).toFixed(2) : '0';
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
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("TIN NHẮN KHÁCH", 155, 45);
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.text(`${totalInboxSum} Inbox`, 155, 53);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tỷ lệ: ${inboxRate}% / reach`, 155, 57);

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("TỶ LỆ CHIA SẺ", 228, 45);
      doc.setFontSize(12);
      doc.setTextColor(2, 132, 199);
      doc.text(`${shareRate}% (${sharedCount}/${filteredEntries.length})`, 228, 53);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(totalReachSum > 10000 ? "🔥 Rất Tốt" : "✅ Hoạt Động", 228, 57);
      // 3. TABLE DATA
      const tableData = filteredEntries.map((e, index) => {
        const currReach = parseInt(String(e.reach || 0)) || 0;
        const currLikes = parseInt(String(e.likes || 0)) || 0;
        const currComments = parseInt(String(e.comments || 0)) || 0;
        const currShares = parseInt(String(e.shares || 0)) || 0;
        const currInbox = parseInt(String(e.inboxCount || 0)) || 0;
        return [
          (index + 1).toString(),
          e.date || '--',
          e.platform || 'N/A',
          e.time || '--:--',
          e.group || '--',
          e.link || '',
          (currReach ? currReach.toLocaleString() : '0') + (currReach >= 10000 ? ' (VIRAL)' : ''),
          currLikes.toLocaleString(),
          currComments.toLocaleString(),
          currShares.toLocaleString(),
          currInbox.toString()
        ];
      });

      autoTable(doc, {
        head: [["STT", "Ngày", "Nền tảng", "Giờ", "Kênh / Page", "Link bài viết / video", "Lượt xem", "Like", "Comment", "Share", "Inbox"]],
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
          0: { cellWidth: 9, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 32 },
          5: { cellWidth: 54, textColor: [2, 132, 199] },
          6: { cellWidth: 24, halign: 'right' },
          7: { cellWidth: 16, halign: 'center', textColor: [79, 70, 229] },
          8: { cellWidth: 16, halign: 'center' },
          9: { cellWidth: 66 }
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
  const filteredEntries = entries.filter(e => {
    const matchPlatform = filterPlatform === 'ALL' || e.platform === filterPlatform;
    const matchSearch = searchQuery === '' || 
      (e.link && e.link.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.hook && e.hook.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.group && e.group.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchPlatform && matchSearch;
  });

  // Metrics calculation based on filtered entries
  const totalPosts = filteredEntries.length;
  const totalReachSum = filteredEntries.reduce((acc, curr) => acc + (parseInt(String(curr.reach || 0)) || 0), 0);
  const totalInboxSum = filteredEntries.reduce((acc, curr) => acc + (parseInt(String(curr.inboxCount || 0)) || 0), 0);
  const inboxConversionRate = totalReachSum > 0 ? ((totalInboxSum / totalReachSum) * 100).toFixed(2) : '0';
  const sharedCount = filteredEntries.filter(e => e.isShared).length;

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
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Dashboard Báo Cáo Nội Dung</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 mt-1 font-bold">
            <span className="text-slate-900">📊 {filteredEntries.length} bài đăng</span>
            <span>•</span>
            <span className="text-emerald-600 font-extrabold">📈 {totalReachSum.toLocaleString()} Reach</span>
            <span>•</span>
            <span className="text-indigo-600 font-extrabold">💬 {totalInboxSum.toLocaleString()} Tin nhắn ({inboxConversionRate}%)</span>
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

          {/* NÚT ĐỒNG BỘ KÊNH TRÊN TOP TOOLBAR VỚI BỘ CHỌN NGÀY */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 ml-auto shadow-sm">
            <select
              value={syncDays}
              onChange={e => setSyncDays(Number(e.target.value))}
              disabled={isSyncing}
              className="bg-slate-50 border-0 py-1.5 px-2 rounded-lg text-xs font-black text-slate-800 outline-none cursor-pointer"
            >
              <option value={1}>⚡ Quét hôm nay</option>
              <option value={7}>⚡ Quét 7 ngày qua</option>
              <option value={30}>⚡ Quét 30 ngày qua</option>
            </select>
            <button 
              type="button"
              disabled={isSyncing}
              onClick={() => triggerManualSync(syncDays)}
              className={`px-3 py-1.5 rounded-lg font-black transition text-xs flex items-center gap-1.5 ${isSyncing ? 'bg-indigo-400 text-white cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'}`}
              title="Đảm bảo chống trùng bài: bài cũ chỉ cập nhật số view/like mới nhất"
            >
              {isSyncing ? (
                <>
                  <span className="animate-spin text-xs">🔄</span>
                  <span>Đang quét...</span>
                </>
              ) : (
                <span>Đồng Bộ Ngay</span>
              )}
            </button>
          </div>
          <button 
            onClick={generatePDF} 
            disabled={isExportingPDF}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl font-extrabold transition shadow-md text-xs flex items-center gap-1.5"
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

           {/* Bulk Import Quick Panel */}
           <button 
             type="button" 
             onClick={() => setShowBulk(!showBulk)} 
             className={`w-full py-2.5 rounded-xl font-black text-xs transition border-2 border-dashed ${showBulk ? 'bg-amber-50 border-amber-300 text-amber-800' : 'border-slate-300 text-slate-600 hover:border-sky-400 hover:text-sky-600'}`}
           >
             ⚡ Nhập Nhanh Nhiều Link Cùng Lúc
           </button>

           {showBulk && (
             <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
               <p className="text-xs font-bold text-amber-800">Dán mỗi link 1 dòng — hệ thống tự nhận diện Facebook / YouTube / TikTok và lưu thành từng báo cáo riêng.</p>
               <textarea 
                 className="w-full border border-amber-200 p-3 rounded-xl text-xs font-semibold h-28 bg-white" 
                 placeholder={"https://facebook.com/...\nhttps://youtube.com/shorts/...\nhttps://tiktok.com/..."} 
                 value={bulkText} 
                 onChange={e => setBulkText(e.target.value)} 
               />
               <div className="flex gap-2">
                 <button onClick={handleBulkImport} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-black text-xs">Nhập Tất Cả</button>
                 <button onClick={() => setShowBulk(false)} className="px-4 bg-white border border-amber-200 text-amber-800 py-2.5 rounded-xl font-black text-xs">Đóng</button>
               </div>
             </div>
           )}
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

          {/* Facebook Channel/Page & Group Selector */}
          {activeTab === 'Facebook' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                    🏢 Fanpage / Trang Đăng Bài
                  </label>
                  <span className="text-[11px] font-extrabold text-sky-600">Trang chính chủ</span>
                </div>
                <select 
                  className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900 bg-white" 
                  value={form.group} 
                  onChange={e => setForm({...form, group: e.target.value})}
                >
                  <option value="">-- Chọn Fanpage / Trang --</option>
                  {groups.filter(g => g.type === 'PAGE' || g.type === 'PROFILE').map((g, i) => (
                    <option key={i} value={g.name}>{g.type === 'PAGE' ? '📘 ' : '👤 '}{g.name}</option>
                  ))}
                  {groups.filter(g => g.type === 'PAGE' || g.type === 'PROFILE').length === 0 && (
                    groups.map((g, i) => <option key={i} value={g.name}>{g.name}</option>)
                  )}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-wide">
                    👥 Nhóm Seeding Đã Chia Sẻ (Tùy chọn)
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">Đăng chéo</span>
                </div>
                <select 
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50" 
                  value={form.sharedGroup} 
                  onChange={e => setForm({...form, sharedGroup: e.target.value})}
                >
                  <option value="">-- Không share nhóm / Hoặc chọn nhóm --</option>
                  {groups.filter(g => g.type === 'GROUP' || g.link?.includes('/groups/')).map((g, i) => (
                    <option key={i} value={g.name}>👥 {g.name}</option>
                  ))}
                </select>
              </div>
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
          {/* Time, Reach & Customer Inbox Count */}
          <div className="space-y-3">
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

            {/* Customer Inbound Messages Input */}
            <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-black text-indigo-900 uppercase tracking-wide">
                  💬 Số Tin Nhắn Khách (Inbox từ bài viết / Reel)
                </label>
                <span className="text-[10px] font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  Tỷ lệ: {parseInt(form.reach) > 0 ? (((parseInt(form.inboxCount) || 0) / parseInt(form.reach)) * 100).toFixed(2) : 0}% / reach
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min="0"
                  className="w-full border border-indigo-200 bg-white p-2.5 rounded-xl text-sm font-black text-indigo-950 focus:ring-2 focus:ring-indigo-500" 
                  placeholder="0 tin nhắn..." 
                  value={form.inboxCount} 
                  onChange={e => setForm({...form, inboxCount: e.target.value})} 
                />
                <div className="flex gap-1.5">
                  {[1, 5, 10].map((amt) => (
                    <button 
                      key={amt} 
                      type="button" 
                      onClick={() => setForm(prev => ({ ...prev, inboxCount: ((parseInt(prev.inboxCount) || 0) + amt).toString() }))} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2.5 rounded-xl text-xs font-black shadow-sm transition"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
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
           {/* Likes, Comments, Shares */}
           <div className="grid grid-cols-3 gap-2.5">
             <div>
               <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">❤️ Lượt Like</label>
               <input 
                 type="number" 
                 min="0" 
                 className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-rose-700 bg-white" 
                 placeholder="0" 
                 value={form.likes} 
                 onChange={e => setForm({...form, likes: e.target.value})} 
               />
             </div>
             <div>
               <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">💬 Comment</label>
               <input 
                 type="number" 
                 min="0" 
                 className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-sky-700 bg-white" 
                 placeholder="0" 
                 value={form.comments} 
                 onChange={e => setForm({...form, comments: e.target.value})} 
               />
             </div>
             <div>
               <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">↗️ Share</label>
               <input 
                 type="number" 
                 min="0" 
                 className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-white" 
                 placeholder="0" 
                 value={form.shares} 
                 onChange={e => setForm({...form, shares: e.target.value})} 
               />
             </div>
           </div>

           <div>
             <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">Đề xuất tối ưu / Ghi chú</label>
             <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm font-semibold text-slate-900" placeholder="Ý tưởng cải thiện nội dung..." value={form.suggestion} onChange={e => setForm({...form, suggestion: e.target.value})} />
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
           <div className="flex flex-wrap gap-2 justify-between items-center border-b border-slate-100 pb-3">
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
                className={`px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 ${rightTab === 'MANAGEMENT' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}
              >
                <span>⚡ Quản Lý & Đồng Bộ Kênh</span>
                {channelConfigs.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </button>
            {rightTab === 'REPORTS' && (
              <input 
                className="border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold w-full sm:w-44 focus:ring-2 focus:ring-sky-500" 
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

               <div className="max-h-[460px] overflow-auto pr-1">
                 <table className="w-full min-w-[680px] text-left text-sm">
                     <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr className="border-b border-slate-200 text-slate-500 font-black uppercase text-xs">
                        <th className="py-2.5 px-1">Ngày</th>
                        <th className="px-1">Nền</th>
                        <th className="px-1">Giờ</th>
                        <th className="px-1">Kênh/Page</th>
                        <th className="px-1">Link</th>
                        <th className="px-1 text-center">👁️ Lượt xem</th>
                        <th className="px-1 text-center">❤️ Like</th>
                        <th className="px-1 text-center">💬 Comment</th>
                        <th className="px-1 text-center">↗️ Share</th>
                        <th className="px-1 text-center">📥 Inbox</th>
                        <th className="text-right px-1">Hành động</th>
                      </tr>
                     </thead>
                     <tbody>
                       {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-slate-400 font-semibold text-sm">
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
                            <td className="py-3 px-1 font-semibold text-slate-700 truncate max-w-[110px] text-xs" title={e.group || '--'}>{e.group || '--'}</td>
                            <td className="py-3 px-1">
                              {e.link ? (
                                <a href={e.link.startsWith('http') ? e.link : `https://${e.link}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 font-extrabold hover:underline bg-sky-50 px-2 py-0.5 rounded text-xs">
                                  Mở ↗
                                </a>
                              ) : (
                                <span className="text-slate-300">--</span>
                              )}
                            </td>
                            {/* Lượt xem / Reach */}
                            <td className="py-2 px-1 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  defaultValue={e.reach !== undefined ? String(e.reach) : '0'}
                                  onBlur={ev => { if (ev.target.value !== (e.reach !== undefined ? String(e.reach) : '0')) updateEntryInline(e.id, 'reach', ev.target.value); }}
                                  className="w-16 border border-transparent hover:border-slate-200 focus:border-sky-400 p-1 rounded-lg font-black text-slate-900 text-xs bg-transparent text-center"
                                />
                                {(parseInt(String(e.reach || 0)) || 0) >= 10000 && <span title="Viral ≥ 10k" className="text-[11px]">🔥</span>}
                              </div>
                            </td>
                            {/* Like */}
                            <td className="py-2 px-1 text-center">
                              <input
                                type="number"
                                min="0"
                                defaultValue={e.likes !== undefined ? String(e.likes) : '0'}
                                onBlur={ev => { if (ev.target.value !== (e.likes !== undefined ? String(e.likes) : '0')) updateEntryInline(e.id, 'likes', ev.target.value); }}
                                className="w-14 border border-transparent hover:border-rose-200 focus:border-rose-400 p-1 rounded-lg font-black text-rose-700 text-xs bg-transparent text-center"
                              />
                            </td>
                            {/* Comment */}
                            <td className="py-2 px-1 text-center">
                              <input
                                type="number"
                                min="0"
                                defaultValue={e.comments !== undefined ? String(e.comments) : '0'}
                                onBlur={ev => { if (ev.target.value !== (e.comments !== undefined ? String(e.comments) : '0')) updateEntryInline(e.id, 'comments', ev.target.value); }}
                                className="w-14 border border-transparent hover:border-sky-200 focus:border-sky-400 p-1 rounded-lg font-black text-sky-700 text-xs bg-transparent text-center"
                              />
                            </td>
                            {/* Share */}
                            <td className="py-2 px-1 text-center">
                              <input
                                type="number"
                                min="0"
                                defaultValue={e.shares !== undefined ? String(e.shares) : '0'}
                                onBlur={ev => { if (ev.target.value !== (e.shares !== undefined ? String(e.shares) : '0')) updateEntryInline(e.id, 'shares', ev.target.value); }}
                                className="w-14 border border-transparent hover:border-emerald-200 focus:border-emerald-400 p-1 rounded-lg font-black text-emerald-700 text-xs bg-transparent text-center"
                              />
                            </td>
                            {/* Inbox */}
                            <td className="py-2 px-1 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <input 
                                  type="number" 
                                  min="0"
                                  defaultValue={e.inboxCount !== undefined ? String(e.inboxCount) : '0'} 
                                  onBlur={ev => { if (ev.target.value !== (e.inboxCount !== undefined ? String(e.inboxCount) : '0')) updateEntryInline(e.id, 'inboxCount', ev.target.value); }} 
                                  className="w-12 border border-transparent hover:border-indigo-200 focus:border-indigo-400 p-1 rounded-lg font-black text-indigo-700 text-xs bg-transparent text-center" 
                                />
                                {(parseInt(String(e.inboxCount || 0)) || 0) > 0 && <span title="Có khách inbox" className="text-[10px]">💬</span>}
                              </div>
                            </td>
                            {/* Actions */}
                            <td className="py-3 px-1 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => cloneEntry(e)} title="Nhân bản báo cáo" className="bg-sky-50 hover:bg-sky-100 text-sky-700 px-2 py-1 rounded font-extrabold text-xs">⧉</button>
                                <button onClick={() => startEdit(e)} className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded font-extrabold text-xs">Sửa</button>
                                {isAdmin && <button onClick={() => handleDelete(e.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded font-extrabold text-xs">Xóa</button>}
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
              {/* AUTO-SYNC ENGINE CONTROLS & API TOKENS */}
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-5 rounded-2xl border border-indigo-500/30 text-white shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
                  <div>
                    <h3 className="font-black text-sm text-indigo-300 flex items-center gap-2">
                      <span className="text-base">⚡</span> Tự Động Hóa Đồng Bộ Kênh (Studio Auto-Sync)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      Tự động quét bài đăng mới, lượt Reach, Views và số Tin nhắn khách mỗi đêm (00:05)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { d: 1, label: 'Quét hôm nay' },
                      { d: 7, label: 'Quét 7 ngày qua' },
                      { d: 30, label: 'Quét 30 ngày qua' },
                    ].map((opt) => (
                      <button
                        key={opt.d}
                        type="button"
                        disabled={isSyncing}
                        onClick={() => triggerManualSync(opt.d)}
                        className={`px-3 py-2 rounded-xl font-black text-xs transition flex items-center gap-1 shadow-md ${isSyncing ? 'bg-indigo-400/40 cursor-wait text-indigo-200' : opt.d === 7 ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                      >
                        <span>⚡</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleClearAllReports}
                      className="px-3 py-2 rounded-xl font-black text-xs transition flex items-center gap-1 shadow-md bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 active:scale-95 disabled:opacity-50"
                      title="Xóa toàn bộ bài đăng để đồng bộ lại từ đầu (thông tin Fanpage và cấu hình kênh vẫn giữ nguyên)"
                    >
                      <span>🗑️</span>
                      <span>Xóa bài để đồng bộ lại</span>
                    </button>
                  </div>
                </div>

                {/* Kết quả đồng bộ gần nhất nếu có */}
                {lastSyncResult && (
                  <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-extrabold text-indigo-300">
                      <span>✓ Đã quét xong: {lastSyncResult.totalSyncedPosts} bài viết/video mới & cập nhật</span>
                      <span className="text-[10px] text-slate-400 font-medium">{new Date(lastSyncResult.timestamp).toLocaleTimeString('vi-VN')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {lastSyncResult.channels.map((c, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded font-bold ${c.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : c.status === 'ERROR' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'}`}>
                          {c.channelName}: {c.syncedCount} bài {c.inboxCount ? `| 💬 ${c.inboxCount} inbox` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Danh sách Kênh & Cấu hình Token */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                    Cấu Hình API Token Từng Kênh:
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {channelConfigs.map((cfg) => {
                      const isEditing = editingConfigId === cfg.id;
                      return (
                        <div key={cfg.id} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${cfg.platform === 'Facebook' ? 'bg-sky-500/20 text-sky-400' : cfg.platform === 'YouTube' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'}`}>
                                {cfg.platform}
                              </span>
                              <span className="font-extrabold text-white text-xs">{cfg.channelName}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.lastSyncStatus === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/60' : cfg.lastSyncStatus === 'ERROR' ? 'text-rose-400 bg-rose-950/60' : 'text-slate-400'}`}>
                                {cfg.lastSyncStatus === 'SUCCESS' ? '● Hoạt động' : cfg.lastSyncStatus === 'ERROR' ? '● Lỗi' : '○ Sẵn sàng'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingConfigId(null);
                                } else {
                                  setEditingConfigId(cfg.id);
                                  setConfigForm({
                                    fbPageId: cfg.fbPageId || '',
                                    fbPageAccessToken: cfg.fbPageAccessToken || '',
                                    ytChannelId: cfg.ytChannelId || '',
                                    ytApiKey: cfg.ytApiKey || '',
                                    ttUsername: cfg.ttUsername || '',
                                    ttAccessToken: cfg.ttAccessToken || '',
                                    rapidApiKey: cfg.rapidApiKey || '',
                                  });
                                }
                              }}
                              className="text-xs text-sky-400 font-extrabold hover:underline"
                            >
                              {isEditing ? 'Đóng ✕' : '⚙️ Cấu hình Token'}
                            </button>
                          </div>

                          {/* Form sửa Token nếu đang bấm mở */}
                          {isEditing && (
                            <div className="pt-2 border-t border-slate-800 space-y-2">
                              {cfg.platform === 'Facebook' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Facebook Page ID:</label>
                                    <input
                                      className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs"
                                      placeholder="VD: 104829104859..."
                                      value={configForm.fbPageId}
                                      onChange={e => setConfigForm({ ...configForm, fbPageId: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Page Access Token:</label>
                                    <input
                                      type="password"
                                      className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs"
                                      placeholder="EAAG..."
                                      value={configForm.fbPageAccessToken}
                                      onChange={e => setConfigForm({ ...configForm, fbPageAccessToken: e.target.value })}
                                    />
                                  </div>
                                </div>
                              )}

                              {cfg.platform === 'YouTube' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">YouTube Channel ID:</label>
                                    <input
                                      className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs"
                                      placeholder="UC..."
                                      value={configForm.ytChannelId}
                                      onChange={e => setConfigForm({ ...configForm, ytChannelId: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">YouTube API Key:</label>
                                    <input
                                      type="password"
                                      className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs"
                                      placeholder="AIza..."
                                      value={configForm.ytApiKey}
                                      onChange={e => setConfigForm({ ...configForm, ytApiKey: e.target.value })}
                                    />
                                  </div>
                                </div>
                              )}

                              {cfg.platform === 'TikTok' && (
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">TikTok Username (@kênh):</label>
                                    <input
                                      className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs"
                                      placeholder="oj0.8sync"
                                      value={configForm.ttUsername}
                                      onChange={e => setConfigForm({ ...configForm, ttUsername: e.target.value })}
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-bold block mb-1">TikTok Access Token (Chính thức):</label>
                                      <input
                                        type="password"
                                        className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs"
                                        placeholder="act.example..."
                                        value={configForm.ttAccessToken}
                                        onChange={e => setConfigForm({ ...configForm, ttAccessToken: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Hoặc RapidAPI Key (Tùy chọn):</label>
                                      <input
                                        type="password"
                                        className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-white font-mono text-xs"
                                        placeholder="Khóa RapidAPI nếu dùng proxy..."
                                        value={configForm.rapidApiKey}
                                        onChange={e => setConfigForm({ ...configForm, rapidApiKey: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => saveChannelConfig(cfg.id, {
                                    fbPageId: configForm.fbPageId,
                                    fbPageAccessToken: configForm.fbPageAccessToken,
                                    ytChannelId: configForm.ytChannelId,
                                    ytApiKey: configForm.ytApiKey,
                                    ttUsername: configForm.ttUsername,
                                    ttAccessToken: configForm.ttAccessToken,
                                    rapidApiKey: configForm.rapidApiKey,
                                  })}
                                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-4 py-1.5 rounded-lg text-xs transition"
                                >
                                  Lưu Cấu Hình
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Dòng trạng thái lần đồng bộ cuối */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>{cfg.lastSyncMessage || 'Chưa chạy đồng bộ'}</span>
                            {cfg.lastSyncAt && (
                              <span>Lần cuối: {new Date(cfg.lastSyncAt).toLocaleTimeString('vi-VN')}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
               {/* FB Groups Management */}
              {/* FB Groups & Fanpages Management */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-sm text-sky-700 flex items-center gap-1.5">
                    <span>📘</span> Quản Lý Fanpage & Nhóm Facebook
                  </h3>
                  <span className="text-[11px] text-slate-500 font-bold">Phân rõ Page vs Seeding Group</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <select 
                      value={groupType} 
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'PAGE' || val === 'PROFILE' || val === 'GROUP') setGroupType(val);
                      }} 
                      className="border border-slate-200 p-2.5 rounded-xl text-xs font-bold bg-white text-slate-800 sm:w-44"
                    >
                      <option value="PAGE">📘 Fanpage chính chủ</option>
                      <option value="PROFILE">👤 Profile cá nhân</option>
                      <option value="GROUP">👥 Nhóm Seeding</option>
                    </select>
                    <input className="border border-slate-200 p-2.5 rounded-xl flex-1 text-xs font-semibold bg-white" placeholder="Tên Fanpage / Nhóm..." value={groupName} onChange={e => setGroupName(e.target.value)} />
                    <input className="border border-slate-200 p-2.5 rounded-xl flex-1 text-xs font-semibold bg-white" placeholder="Link (URL)..." value={groupLink} onChange={e => setGroupLink(e.target.value)} />
                    <button onClick={addGroup} className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs w-full sm:w-auto">Thêm</button>
                </div>
                <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-left">
                        <th className="py-1.5">Phân loại</th>
                        <th className="py-1.5">Tên Fanpage / Nhóm</th>
                        <th className="text-right">Link</th>
                      </tr>
                    </thead>
                    <tbody>{groups.map((g, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${g.type === 'PAGE' ? 'bg-sky-100 text-sky-700' : g.type === 'PROFILE' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
                            {g.type === 'PAGE' ? '📘 Fanpage' : g.type === 'PROFILE' ? '👤 Profile' : '👥 Nhóm'}
                          </span>
                        </td>
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
                 <div className="flex flex-col sm:flex-row gap-2 mb-3">
                     <input className="border border-slate-200 p-2.5 rounded-xl flex-1 text-xs font-semibold" placeholder="Tên kênh" value={ytChannelName} onChange={e => setYtChannelName(e.target.value)} />
                     <input className="border border-slate-200 p-2.5 rounded-xl flex-1 text-xs font-semibold" placeholder="Link kênh" value={ytChannelLink} onChange={e => setYtChannelLink(e.target.value)} />
                     <button onClick={addYtChannel} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs w-full sm:w-auto">Thêm</button>
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
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <input className="border border-slate-800 bg-slate-900 p-2.5 rounded-xl flex-1 text-xs font-semibold text-white placeholder-slate-500" placeholder="Tên kênh TikTok" value={ttChannelName} onChange={e => setTtChannelName(e.target.value)} />
                    <input className="border border-slate-800 bg-slate-900 p-2.5 rounded-xl flex-1 text-xs font-semibold text-white placeholder-slate-500" placeholder="Link kênh TikTok" value={ttChannelLink} onChange={e => setTtChannelLink(e.target.value)} />
                    <button onClick={addTtChannel} className="bg-sky-500 hover:bg-sky-600 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs w-full sm:w-auto">Thêm</button>
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
