import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'webhook-config.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!fs.existsSync(path.dirname(CONFIG_FILE))) fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });

  if (req.method === 'GET') {
    if (!fs.existsSync(CONFIG_FILE)) return res.status(200).json({ url: process.env.NOTIFICATION_WEBHOOK_URL || '' });
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { url } = req.body;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ url }, null, 2));
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
