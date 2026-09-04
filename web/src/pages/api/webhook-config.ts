import type { NextApiRequest, NextApiResponse } from 'next';
import { kvGet, kvSet } from '../../lib/db';

interface BotState {
  date: string;
  count: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    let remainingToday = 2;
    const today = new Date().toISOString().split('T')[0];
    const state = await kvGet<BotState>('bot-state');
    if (state && state.date === today) remainingToday = Math.max(0, 2 - state.count);

    let url = process.env.NOTIFICATION_WEBHOOK_URL || '';
    const config = await kvGet<{ url?: string }>('webhook-config');
    if (config?.url) url = config.url;

    return res.status(200).json({ url, remainingToday });
  }

  if (req.method === 'POST') {
    const { url } = req.body;
    await kvSet('webhook-config', { url });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
