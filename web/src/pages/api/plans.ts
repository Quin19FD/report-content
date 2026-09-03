import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

const PLAN_FILE = path.join(process.cwd(), 'data', 'plans.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!fs.existsSync(path.dirname(PLAN_FILE))) fs.mkdirSync(path.dirname(PLAN_FILE), { recursive: true });

  if (req.method === 'GET') {
    if (!fs.existsSync(PLAN_FILE)) return res.status(200).json({ objectives: '', tasks: [] });
    return res.status(200).json(JSON.parse(fs.readFileSync(PLAN_FILE, 'utf-8')));
  }

  if (req.method === 'POST') {
    fs.writeFileSync(PLAN_FILE, JSON.stringify(req.body, null, 2));
    return res.status(200).json({ success: true });
  }
}
