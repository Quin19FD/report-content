import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const YT_FILE = path.join(process.cwd(), 'data', 'yt-channels.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!fs.existsSync(path.dirname(YT_FILE))) fs.mkdirSync(path.dirname(YT_FILE), { recursive: true });

  if (req.method === 'GET') {
    if (!fs.existsSync(YT_FILE)) return res.status(200).json([]);
    return res.status(200).json(JSON.parse(fs.readFileSync(YT_FILE, 'utf-8')));
  }

  if (req.method === 'POST') {
    fs.writeFileSync(YT_FILE, JSON.stringify(req.body, null, 2));
    return res.status(200).json({ success: true });
  }
}
