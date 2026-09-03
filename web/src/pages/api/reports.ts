import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const DATA_DIR = path.join(process.cwd(), 'data');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const date = new Date().toISOString().split('T')[0];
  const filePath = path.join(DATA_DIR, `reports-${date}.json`);

  // Helper to ensure data exists
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (req.method === 'GET') {
    if (!fs.existsSync(filePath)) return res.status(200).json([]);
    const data = fs.readFileSync(filePath, 'utf-8');
    return res.status(200).json(JSON.parse(data));
  }

  if (req.method === 'POST') {
    const newEntry = { ...req.body, id: Date.now() };
    let data = [];
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    data.push(newEntry);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data = data.filter((item: any) => item.id !== id);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PUT') {
    const { id, ...updatedEntry } = req.body;
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    data = data.map((item: any) => item.id === id ? { ...item, ...updatedEntry } : item);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
