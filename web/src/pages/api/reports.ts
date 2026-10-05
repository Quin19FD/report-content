import type { NextApiRequest, NextApiResponse } from 'next';
import { kvGet, kvSet, kvDel, kvList, type ReportEntry } from '../../lib/db';
import { normalizePostUrl } from '../../lib/types';
interface BotState {
  date: string;
  count: number;
}

interface PlanItem {
  task?: string;
  deadline?: string;
  status?: string;
  progress?: string | number;
  [key: string]: unknown;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { startDate, endDate, date, filterType, month, year } = req.query;

    const buckets = await kvList<ReportEntry[]>('reports-');
    let allEntries: ReportEntry[] = [];

    buckets.forEach(({ key, value }) => {
      // Lấy YYYY-MM-DD từ key 'reports-YYYY-MM-DD'
      const fileDate = key.replace('reports-', '');
      if (Array.isArray(value)) {
        allEntries.push(...value.map((item) => ({ ...item, date: item.date || fileDate })));
      }
    });

    // Sort mới nhất trước (date + time)
    allEntries.sort((a, b) => {
      const dateA = `${a.date || ''} ${a.time || ''}`;
      const dateB = `${b.date || ''} ${b.time || ''}`;
      return dateB.localeCompare(dateA);
    });

    // Filter Logic
    // Filter Logic chuẩn múi giờ Việt Nam
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

    if (date) {
      allEntries = allEntries.filter((e) => e.date === date);
    } else if (filterType === 'TODAY') {
      allEntries = allEntries.filter((e) => e.date === today);
    } else if (filterType === 'DAYS') {
      const days = parseInt(String(req.query.days || '7'), 10) || 7;
      const sinceDate = new Date(Date.now() - days * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      allEntries = allEntries.filter((e) => e.date && e.date >= sinceDate && e.date <= today);
    } else if (filterType === 'MONTH' && month && year) {
      const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
      allEntries = allEntries.filter((e) => e.date && e.date.startsWith(targetMonth));
    } else if (filterType === 'YEAR' && year) {
      allEntries = allEntries.filter((e) => e.date && e.date.startsWith(`${year}-`));
    } else if (filterType === 'RANGE' && startDate && endDate) {
      allEntries = allEntries.filter((e) => e.date && e.date >= (startDate as string) && e.date <= (endDate as string));
    }
    return res.status(200).json(allEntries);
  }

  if (req.method === 'POST') {
    // 1. Bulk import từ file CSV / Excel / danh sách link
    if (req.body.bulk && Array.isArray(req.body.entries)) {
      const incomingEntries = req.body.entries as ReportEntry[];
      if (incomingEntries.length === 0) {
        return res.status(400).json({ error: 'Danh sách bài viết trống' });
      }

      const byDate = new Map<string, ReportEntry[]>();
      for (const e of incomingEntries) {
        const d = e.date || new Date().toISOString().split('T')[0];
        const list = byDate.get(d) || [];
        list.push({ ...e, date: d });
        byDate.set(d, list);
      }

      let totalImported = 0;
      let totalUpdated = 0;

      for (const [dateStr, newItems] of byDate.entries()) {
        const bucketKey = `reports-${dateStr}`;
        const existing = (await kvGet<ReportEntry[]>(bucketKey)) || [];
        const merged = existing.slice();

        for (const item of newItems) {
          const itemNorm = normalizePostUrl(item.link);
          const idx = merged.findIndex((m) => {
            if (m.id && item.id && m.id === item.id) return true;
            if (itemNorm && m.link) {
              return normalizePostUrl(m.link) === itemNorm;
            }
            return false;
          });

          const itemReach = parseInt(String(item.reach || 0)) || 0;
          const itemLikes = parseInt(String(item.likes || 0)) || 0;
          const itemComments = parseInt(String(item.comments || 0)) || 0;
          const itemShares = parseInt(String(item.shares || 0)) || 0;
          const itemInbox = parseInt(String(item.inboxCount || 0)) || 0;

          if (idx >= 0) {
            const curr = merged[idx];
            merged[idx] = {
              ...curr,
              time: item.time || curr.time,
              group: item.group || curr.group,
              platform: item.platform || curr.platform,
              hook: item.hook || curr.hook,
              reach: itemReach > 0 ? itemReach : (parseInt(String(curr.reach || 0)) || 0),
              likes: itemLikes > 0 ? itemLikes : (parseInt(String(curr.likes || 0)) || 0),
              comments: itemComments > 0 ? itemComments : (parseInt(String(curr.comments || 0)) || 0),
              shares: itemShares > 0 ? itemShares : (parseInt(String(curr.shares || 0)) || 0),
              inboxCount: itemInbox > 0 ? itemInbox : (parseInt(String(curr.inboxCount || 0)) || 0),
            };
            totalUpdated++;
          } else {
            merged.push({
              ...item,
              id: item.id || Date.now() + Math.floor(Math.random() * 1000000),
              reach: itemReach,
              likes: itemLikes,
              comments: itemComments,
              shares: itemShares,
              inboxCount: itemInbox,
            });
            totalImported++;
          }
        }

        await kvSet(bucketKey, merged);
      }

      return res.status(200).json({
        success: true,
        count: totalImported + totalUpdated,
        imported: totalImported,
        updated: totalUpdated,
      });
    }

    // 2. Nhập đơn lẻ (kèm chống trùng lặp theo link trong cùng ngày)
    const entryDate = req.body.date || new Date().toISOString().split('T')[0];
    const bucketKey = `reports-${entryDate}`;

    const newEntry: ReportEntry = {
      ...req.body,
      date: entryDate,
      id: req.body.id || Date.now(),
    };

    const data = (await kvGet<ReportEntry[]>(bucketKey)) || [];
    const entryNorm = normalizePostUrl(newEntry.link);
    const existingIdx = data.findIndex((m) => {
      if (m.id && newEntry.id && m.id === newEntry.id) return true;
      if (entryNorm && m.link) return normalizePostUrl(m.link) === entryNorm;
      return false;
    });

    if (existingIdx >= 0) {
      data[existingIdx] = { ...data[existingIdx], ...newEntry };
    } else {
      data.push(newEntry);
    }
    await kvSet(bucketKey, data);
    // Bot Notification: Chỉ gửi khi user xác nhận + tối đa 2 lượt/ngày
    let botSent = false;
    let botReason = '';
    const today = new Date().toISOString().split('T')[0];
    let state: BotState = (await kvGet<BotState>('bot-state')) || { date: today, count: 0 };
    if (state.date !== today) state = { date: today, count: 0 };

    if (req.body.notifyBot) {
      let webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
      const config = await kvGet<{ url?: string }>('webhook-config');
      if (config?.url) webhookUrl = config.url;

      if (!webhookUrl) {
        botReason = 'Chưa cấu hình Webhook Bot';
      } else if (state.count >= 2) {
        botReason = 'Đã hết 2 lượt gửi Bot hôm nay';
      } else {
        state.count += 1;
        await kvSet('bot-state', state);
        botSent = true;

        try {
          // Tổng hợp TOÀN BỘ báo cáo của ngày vừa submit (không chỉ 1 bài)
          const dayEntries = ((await kvGet<ReportEntry[]>(bucketKey)) || []).slice();
          dayEntries.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

          const totalReach = dayEntries.reduce((acc, e) => acc + (parseInt(String(e.reach)) || 0), 0);
          const totalInbox = dayEntries.reduce((acc, e) => acc + (parseInt(String(e.inboxCount)) || 0), 0);
          const inboxRate = totalReach > 0 ? ((totalInbox / totalReach) * 100).toFixed(2) : '0';
          const fb = dayEntries.filter((e) => e.platform === 'Facebook');
          const yt = dayEntries.filter((e) => e.platform === 'YouTube');
          const tt = dayEntries.filter((e) => e.platform === 'TikTok');

          // Phân nhóm theo Fanpage / Kênh
          const fbMap = new Map<string, { posts: number; reach: number; inboxes: number }>();

          fb.forEach((e) => {
            const page = e.group || e.pageName || 'Khác';
            const cur = fbMap.get(page) || { posts: 0, reach: 0, inboxes: 0 };
            cur.posts += 1;
            cur.reach += parseInt(String(e.reach)) || 0;
            cur.inboxes += parseInt(String(e.inboxCount)) || 0;
            fbMap.set(page, cur);
          });

          // Top 3 bài viết kéo inbox nhiều nhất
          const topInboxEntries = dayEntries
            .filter((e) => (parseInt(String(e.inboxCount)) || 0) > 0)
            .sort((a, b) => (parseInt(String(b.inboxCount)) || 0) - (parseInt(String(a.inboxCount)) || 0))
            .slice(0, 3);

          const lines: string[] = [
            `📢 [ContentFlow Studio] BÁO CÁO HIỆU SUẤT NGÀY ${entryDate} (Lượt ${state.count}/2)`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `📊 TỔNG QUAN: ${dayEntries.length} nội dung | ${totalReach.toLocaleString('vi-VN')} Reach | ${totalInbox.toLocaleString('vi-VN')} Tin nhắn khách`,
            `🎯 TỶ LỆ CHUYỂN ĐỔI INBOX TRUNG BÌNH: ${inboxRate}%`,
            ``,
          ];

          if (fbMap.size > 0) {
            lines.push(`🏢 HIỆU SUẤT THEO FANPAGE & KÊNH:`);
            fbMap.forEach((val, pageName) => {
              const pRate = val.reach > 0 ? ((val.inboxes / val.reach) * 100).toFixed(2) : '0';
              const fire = val.inboxes >= 5 ? ' 🔥' : '';
              lines.push(`├── 📘 ${pageName}: ${val.posts} bài | ${val.reach.toLocaleString('vi-VN')} Reach | 💬 ${val.inboxes} Inbox (${pRate}%)${fire}`);
            });
            lines.push(``);
          }

          if (yt.length > 0 || tt.length > 0) {
            lines.push(`🎬 YOUTUBE & TIKTOK:`);
            if (yt.length > 0) {
              const ytViews = yt.reduce((acc, e) => acc + (parseInt(String(e.reach)) || 0), 0);
              lines.push(`├── 🎬 YouTube: ${yt.length} videos | ${ytViews.toLocaleString('vi-VN')} Views`);
            }
            if (tt.length > 0) {
              const ttViews = tt.reduce((acc, e) => acc + (parseInt(String(e.reach)) || 0), 0);
              lines.push(`└── 🎵 TikTok: ${tt.length} videos | ${ttViews.toLocaleString('vi-VN')} Views`);
            }
            lines.push(``);
          }

          if (topInboxEntries.length > 0) {
            lines.push(`🏆 TOP BÀI VIẾT KÉO INBOX NHIỀU NHẤT:`);
            topInboxEntries.forEach((e, i) => {
              const title = e.hook ? `"${e.hook.slice(0, 45)}..."` : (e.link || '');
              const inboxes = parseInt(String(e.inboxCount)) || 0;
              lines.push(`${i + 1}. ${title} — ${e.group || e.pageName || e.platform} (${inboxes} inbox)`);
            });
            lines.push(``);
          }
          // Đính kèm cảnh báo Kế Hoạch sắp đến hạn (≤3 ngày, tiến độ <50%)
          try {
            const plansRaw = await kvGet<PlanItem[] | { tasks?: PlanItem[] }>('plans');
            const plans: PlanItem[] = Array.isArray(plansRaw) ? plansRaw : plansRaw?.tasks || [];
            const urgentPlan = plans.filter((p) => {
              if (!p.deadline || p.status === 'Done') return false;
              const daysLeft = Math.ceil((new Date(p.deadline + 'T23:59:59').getTime() - Date.now()) / 86400000);
              return daysLeft <= 3 && (parseInt(String(p.progress)) || 0) < 50;
            });
            if (urgentPlan.length > 0) {
              lines.push(`━━━ 🚨 Kế Hoạch Sắp Đến Hạn ━━━`);
              urgentPlan.forEach((p) => {
                const daysLeft = Math.ceil((new Date(p.deadline + 'T23:59:59').getTime() - Date.now()) / 86400000);
                lines.push(`• ${p.task} — hạn ${p.deadline} (còn ${daysLeft} ngày, tiến độ ${p.progress}%)`);
              });
            }
          } catch {}

          const msgText = lines.join('\n');
          let payload: Record<string, unknown> = { text: msgText };
          if (webhookUrl.includes('larksuite.com') || webhookUrl.includes('feishu.cn')) {
            payload = { msg_type: 'text', content: { text: msgText } };
          }

          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch((err) => console.error('Webhook trigger error', err));
        } catch {}
      }
    }

    const remaining = 2 - (state.date === today ? state.count : 0);
    return res.status(200).json({ success: true, botSent, botRemainingToday: remaining, botReason });
  }

  if (req.method === 'DELETE') {
    const { id, clearAll } = req.body || {};

    if (clearAll) {
      const buckets = await kvList('reports-');
      for (const { key } of buckets) {
        await kvDel(key);
      }
      return res.status(200).json({ success: true, count: buckets.length });
    }

    const buckets = await kvList<ReportEntry[]>('reports-');
    let found = false;

    for (const { key, value } of buckets) {
      if (Array.isArray(value) && value.some((item) => item.id === id)) {
        await kvSet(key, value.filter((item) => item.id !== id));
        found = true;
      }
    }

    return res.status(200).json({ success: found });
  }

  if (req.method === 'PUT') {
    const { id, ...updatedEntry } = req.body;
    const entryDate = updatedEntry.date || new Date().toISOString().split('T')[0];
    const buckets = await kvList<ReportEntry[]>('reports-');

    for (const { key, value } of buckets) {
      if (Array.isArray(value) && value.some((item) => item.id === id)) {
        await kvSet(
          key,
          value.map((item) => (item.id === id ? { ...item, ...updatedEntry, date: entryDate } : item)),
        );
      }
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
