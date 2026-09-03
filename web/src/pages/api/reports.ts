import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const DATA_DIR = path.join(process.cwd(), 'data');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (req.method === 'GET') {
    const { startDate, endDate, date, filterType, month, year } = req.query;

    const files = fs.readdirSync(DATA_DIR).filter(file => file.startsWith('reports-') && file.endsWith('.json'));
    let allEntries: any[] = [];

    files.forEach(file => {
      // Extract date YYYY-MM-DD from filename 'reports-YYYY-MM-DD.json'
      const fileDate = file.replace('reports-', '').replace('.json', '');
      const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const entriesWithDate = parsed.map(item => ({
            ...item,
            date: item.date || fileDate // Preserve or attach date
          }));
          allEntries.push(...entriesWithDate);
        }
      } catch (e) {
        console.error("Lỗi đọc file:", file, e);
      }
    });

    // Sort entries newest first (date + time)
    allEntries.sort((a, b) => {
      const dateA = `${a.date || ''} ${a.time || ''}`;
      const dateB = `${b.date || ''} ${b.time || ''}`;
      return dateB.localeCompare(dateA);
    });

    // Filter Logic
    const today = new Date().toISOString().split('T')[0];

    if (date) {
      // Specific date requested
      allEntries = allEntries.filter(e => e.date === date);
    } else if (filterType === 'TODAY') {
      allEntries = allEntries.filter(e => e.date === today);
    } else if (filterType === 'MONTH' && month && year) {
      const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
      allEntries = allEntries.filter(e => e.date && e.date.startsWith(targetMonth));
    } else if (filterType === 'YEAR' && year) {
      allEntries = allEntries.filter(e => e.date && e.date.startsWith(`${year}-`));
    } else if (filterType === 'RANGE' && startDate && endDate) {
      allEntries = allEntries.filter(e => e.date >= startDate && e.date <= endDate);
    }

    return res.status(200).json(allEntries);
  }

  if (req.method === 'POST') {
    const entryDate = req.body.date || new Date().toISOString().split('T')[0];
    const targetFile = path.join(DATA_DIR, `reports-${entryDate}.json`);

    const newEntry = { 
      ...req.body, 
      date: entryDate,
      id: req.body.id || Date.now() 
    };

    let data = [];
    if (fs.existsSync(targetFile)) {
      try {
        data = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      } catch (e) {}
    }
    data.push(newEntry);
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2));

    // Bot Notification: Chỉ gửi khi user xác nhận + tối đa 2 lượt/ngày
    let botSent = false;
    let botReason = '';
    if (req.body.notifyBot) {
      let webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
      const configPath = path.join(DATA_DIR, 'webhook-config.json');
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (config.url) webhookUrl = config.url;
        } catch (e) {}
      }

      if (!webhookUrl) {
        botReason = 'Chưa cấu hình Webhook Bot';
      } else {
        // Daily quota: max 2 bot notifications per day
        const statePath = path.join(DATA_DIR, 'bot-state.json');
        const today = new Date().toISOString().split('T')[0];
        let state: { date: string; count: number } = { date: today, count: 0 };
        try {
          if (fs.existsSync(statePath)) {
            const parsed = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
            if (parsed.date === today) state = parsed;
          }
        } catch (e) {}

        if (state.count >= 2) {
          botReason = 'Đã hết 2 lượt gửi Bot hôm nay';
        } else {
          state.count += 1;
          fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
          botSent = true;

          try {
            // Tổng hợp TOÀN BỘ báo cáo của ngày vừa submit (không chỉ 1 bài)
            const dayFile = path.join(DATA_DIR, `reports-${entryDate}.json`);
            let dayEntries: any[] = [];
            try {
              dayEntries = JSON.parse(fs.readFileSync(dayFile, 'utf-8'));
            } catch (e) {}
            dayEntries.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

            const totalReach = dayEntries.reduce((acc, e) => acc + (parseInt(e.reach) || 0), 0);
            const fb = dayEntries.filter(e => e.platform === 'Facebook');
            const yt = dayEntries.filter(e => e.platform === 'YouTube');
            const tt = dayEntries.filter(e => e.platform === 'TikTok');

            const lines: string[] = [
              `📢 [ContentFlow CRM] BÁO CÁO TỔNG HỢP NGÀY ${entryDate} (Lượt ${state.count}/2)`,
              `━━━━━━━━━━━━━━━━━━`,
              `📊 Tổng: ${dayEntries.length} bài | FB: ${fb.length} | YT: ${yt.length} | TT: ${tt.length}`,
              `📈 Tổng Reach/Views: ${totalReach.toLocaleString('vi-VN')}`
            ];

            if (fb.length) {
              lines.push(`━━━ 📘 Facebook ━━━`);
              fb.forEach(e => lines.push(`• ${e.time || '--:--'} | Reach ${(parseInt(e.reach) || 0).toLocaleString('vi-VN')} | ${e.group || '--'} | ${e.hook || e.link}`));
            }
            if (yt.length) {
              lines.push(`━━━ 🎬 YouTube ━━━`);
              yt.forEach(e => lines.push(`• ${e.time || '--:--'} | Views ${(parseInt(e.reach) || 0).toLocaleString('vi-VN')} | ${e.group || '--'} | ${e.hook || e.link}`));
            }
            if (tt.length) {
              lines.push(`━━━ 🎵 TikTok ━━━`);
              tt.forEach(e => lines.push(`• ${e.time || '--:--'} | Views ${(parseInt(e.reach) || 0).toLocaleString('vi-VN')} | ${e.group || '--'} | ${e.hook || e.link}`));
            }

            const msgText = lines.join('\n');

            let payload: any = { text: msgText };
            if (webhookUrl.includes('larksuite.com') || webhookUrl.includes('feishu.cn')) {
              payload = { msg_type: 'text', content: { text: msgText } };
            }

            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).catch(err => console.error("Webhook trigger error", err));
          } catch (e) {}
        }
      }
    }

    return res.status(200).json({ success: true, botSent, botRemainingToday: 2 - (() => {
      try {
        const statePath = path.join(DATA_DIR, 'bot-state.json');
        const today = new Date().toISOString().split('T')[0];
        const parsed = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        return parsed.date === today ? parsed.count : 0;
      } catch (e) { return 0; }
    })(), botReason });
  }

  if (req.method === 'DELETE') {
    const { id, date } = req.body;
    
    // Find entry in file system
    const files = fs.readdirSync(DATA_DIR).filter(file => file.startsWith('reports-') && file.endsWith('.json'));
    let found = false;

    files.forEach(file => {
      const filePath = path.join(DATA_DIR, file);
      try {
        let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data) && data.some(item => item.id === id)) {
          data = data.filter((item: any) => item.id !== id);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
          found = true;
        }
      } catch (e) {}
    });

    return res.status(200).json({ success: found });
  }

  if (req.method === 'PUT') {
    const { id, ...updatedEntry } = req.body;
    const entryDate = updatedEntry.date || new Date().toISOString().split('T')[0];
    
    const files = fs.readdirSync(DATA_DIR).filter(file => file.startsWith('reports-') && file.endsWith('.json'));
    files.forEach(file => {
      const filePath = path.join(DATA_DIR, file);
      try {
        let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data) && data.some(item => item.id === id)) {
          data = data.map((item: any) => item.id === id ? { ...item, ...updatedEntry, date: entryDate } : item);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
      } catch (e) {}
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
