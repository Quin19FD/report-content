import type { NextApiRequest, NextApiResponse } from 'next';
import { kvGet, kvSet, kvList } from '../../lib/db';

interface ReportEntry {
  id: number;
  date: string;
  time?: string;
  platform?: string;
  reach?: string | number;
  group?: string;
  hook?: string;
  link?: string;
  [key: string]: unknown;
}

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
    const today = new Date().toISOString().split('T')[0];

    if (date) {
      allEntries = allEntries.filter((e) => e.date === date);
    } else if (filterType === 'TODAY') {
      allEntries = allEntries.filter((e) => e.date === today);
    } else if (filterType === 'MONTH' && month && year) {
      const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
      allEntries = allEntries.filter((e) => e.date && e.date.startsWith(targetMonth));
    } else if (filterType === 'YEAR' && year) {
      allEntries = allEntries.filter((e) => e.date && e.date.startsWith(`${year}-`));
    } else if (filterType === 'RANGE' && startDate && endDate) {
      allEntries = allEntries.filter((e) => e.date >= (startDate as string) && e.date <= (endDate as string));
    }

    return res.status(200).json(allEntries);
  }

  if (req.method === 'POST') {
    const entryDate = req.body.date || new Date().toISOString().split('T')[0];
    const bucketKey = `reports-${entryDate}`;

    const newEntry: ReportEntry = {
      ...req.body,
      date: entryDate,
      id: req.body.id || Date.now(),
    };

    const data = (await kvGet<ReportEntry[]>(bucketKey)) || [];
    data.push(newEntry);
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
          const fb = dayEntries.filter((e) => e.platform === 'Facebook');
          const yt = dayEntries.filter((e) => e.platform === 'YouTube');
          const tt = dayEntries.filter((e) => e.platform === 'TikTok');

          const lines: string[] = [
            `📢 [ContentFlow CRM] BÁO CÁO TỔNG HỢP NGÀY ${entryDate} (Lượt ${state.count}/2)`,
            `━━━━━━━━━━━━━━━━━━`,
            `📊 Tổng: ${dayEntries.length} bài | FB: ${fb.length} | YT: ${yt.length} | TT: ${tt.length}`,
            `📈 Tổng Reach/Views: ${totalReach.toLocaleString('vi-VN')}`,
          ];

          if (fb.length) {
            lines.push(`━━━ 📘 Facebook ━━━`);
            fb.forEach((e) => lines.push(`• ${e.time || '--:--'} | Reach ${(parseInt(String(e.reach)) || 0).toLocaleString('vi-VN')} | ${e.group || '--'} | ${e.hook || e.link}`));
          }
          if (yt.length) {
            lines.push(`━━━ 🎬 YouTube ━━━`);
            yt.forEach((e) => lines.push(`• ${e.time || '--:--'} | Views ${(parseInt(String(e.reach)) || 0).toLocaleString('vi-VN')} | ${e.group || '--'} | ${e.hook || e.link}`));
          }
          if (tt.length) {
            lines.push(`━━━ 🎵 TikTok ━━━`);
            tt.forEach((e) => lines.push(`• ${e.time || '--:--'} | Views ${(parseInt(String(e.reach)) || 0).toLocaleString('vi-VN')} | ${e.group || '--'} | ${e.hook || e.link}`));
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
    const { id } = req.body;
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
