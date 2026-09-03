import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const TT_FILE = path.join(process.cwd(), 'data', 'tt-channels.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!fs.existsSync(path.dirname(TT_FILE))) fs.mkdirSync(path.dirname(TT_FILE), { recursive: true });

  if (req.method === 'GET') {
    if (!fs.existsSync(TT_FILE)) return res.status(200).json([]);
    return res.status(200).json(JSON.parse(fs.readFileSync(TT_FILE, 'utf-8')));
  }

  if (req.method === 'POST') {
    fs.writeFileSync(TT_FILE, JSON.stringify(req.body, null, 2));
    return res.status(200).json({ success: true });
  }
}
