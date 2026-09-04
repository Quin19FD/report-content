import type { NextApiRequest, NextApiResponse } from 'next';
import { kvGet, kvSet } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const data = await kvGet('plans');
    return res.status(200).json(data ?? { objectives: '', tasks: [] });
  }

  if (req.method === 'POST') {
    await kvSet('plans', req.body);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
