import type { NextApiRequest, NextApiResponse } from 'next';
import { kvGet, kvSet } from '../../lib/db';

export interface ChannelGroup {
  name: string;
  link: string;
  type?: 'PAGE' | 'PROFILE' | 'GROUP';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const data = await kvGet<ChannelGroup[]>('groups');
    const items = (data ?? []).map((g) => {
      let type = g.type;
      if (!type) {
        if (g.link && g.link.includes('/groups/')) {
          type = 'GROUP';
        } else if (g.name.toLowerCase().includes('acc ') || g.name.toLowerCase().includes('kevin')) {
          type = 'PROFILE';
        } else {
          type = 'PAGE';
        }
      }
      return { ...g, type };
    });
    return res.status(200).json(items);
  }

  if (req.method === 'POST') {
    await kvSet('groups', req.body);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
