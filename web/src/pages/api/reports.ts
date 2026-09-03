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

    // Webhook Notification Trigger (Telegram / Zalo / Lark Bot)
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msg_type: 'text',
            content: {
              text: `📢 [ContentFlow Alert] Báo cáo mới!\nNền tảng: ${newEntry.platform}\nReach: ${newEntry.reach || 0}\nLink: ${newEntry.link}`
            }
          })
        }).catch(err => console.error("Webhook trigger error", err));
      } catch (e) {}
    }

    return res.status(200).json({ success: true });
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
