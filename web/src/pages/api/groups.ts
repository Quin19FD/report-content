import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const GROUPS_FILE = path.join(process.cwd(), 'data', 'groups.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!fs.existsSync(path.dirname(GROUPS_FILE))) fs.mkdirSync(path.dirname(GROUPS_FILE), { recursive: true });

  if (req.method === 'GET') {
    if (!fs.existsSync(GROUPS_FILE)) return res.status(200).json([]);
    return res.status(200).json(JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf-8')));
  }

  if (req.method === 'POST') {
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(req.body, null, 2));
    return res.status(200).json({ success: true });
  }
}
