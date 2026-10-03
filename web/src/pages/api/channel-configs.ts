import type { NextApiRequest, NextApiResponse } from 'next';
import { kvGet, kvSet } from '../../lib/db';
import { type ChannelApiConfig } from '../../lib/types';

function maskSecret(val?: string): string {
  if (!val || val.length < 8) return val ? '********' : '';
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    let configs = await kvGet<ChannelApiConfig[]>('channel-api-configs');

    if (!Array.isArray(configs) || configs.length === 0) {
      configs = [
        {
          id: 'fb_8syncdev',
          platform: 'Facebook',
          channelName: '8 Sync Dev',
          enabled: true,
          fbPageId: process.env.FACEBOOK_PAGE_ID || '588402817683765',
          fbPageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || 'EAArhbgXPxmsBSuFi1Xrf99ERwAka4mtXi1iFpwqRHA7ZCJSE4f7ZBrEv91oS81IbqZC6qVzZBBjlJ4PDu4ml4OXdqD2gFcH8qfWxMFzs4brNyFmQKaJIhHqfzZBghth135ZCgxplrtqrS8eZBDHob9ZCPmsyQSDWWKs7bfdjhFFgkrzpMHRYZCBwgsipf9i6PermSjYSZBiLrnrDmEHcyiNDipBmKXnYTjzuGDo3BiKz2c2V4Xw3tq6UOZBeUTgpT2lKS50d4m57GcZAsTAVv2ZBa0O3vKf9tdByrkkvcZAgZDZD',
          lastSyncStatus: 'IDLE',
          lastSyncMessage: 'Chưa cấu hình API Token',
        },
        {
          id: 'yt_8syncdev',
          platform: 'YouTube',
          channelName: '8 Sync Dev',
          enabled: true,
          ytChannelId: process.env.YOUTUBE_CHANNEL_ID || 'UCMWzM6NOoVvr9484XBSJEjg',
          ytApiKey: process.env.YOUTUBE_API_KEY || 'AIzaSyAG4YH7v0nqCxF5A2CJaj1pxXuBZg8MwI0',
          lastSyncStatus: 'IDLE',
          lastSyncMessage: 'Chưa cấu hình API Key',
        },
        {
          id: 'tt_oj08sync',
          platform: 'TikTok',
          channelName: 'oj0.8sync',
          enabled: true,
          ttUsername: 'oj0.8sync',
          lastSyncStatus: 'IDLE',
          lastSyncMessage: 'Chờ đồng bộ',
        },
      ];
      await kvSet('channel-api-configs', configs);
    }

    // Trả về kèm thông tin có token hay chưa nhưng che bớt ký tự nhạy cảm khi hiển thị
    const safeConfigs = configs.map((c) => ({
      ...c,
      hasFbToken: !!c.fbPageAccessToken,
      hasYtKey: !!c.ytApiKey,
      maskedFbToken: maskSecret(c.fbPageAccessToken),
      maskedYtKey: maskSecret(c.ytApiKey),
    }));

    return res.status(200).json(safeConfigs);
  }

  if (req.method === 'POST') {
    const incoming = req.body as ChannelApiConfig[];
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ error: 'Payload must be an array of configs' });
    }

    // Nếu người dùng không nhập đè token mới, giữ lại token cũ đã lưu
    const current = (await kvGet<ChannelApiConfig[]>('channel-api-configs')) || [];
    const merged = incoming.map((inc) => {
      const existing = current.find((c) => c.id === inc.id);
      return {
        ...inc,
        fbPageAccessToken: inc.fbPageAccessToken?.includes('...') ? existing?.fbPageAccessToken : (inc.fbPageAccessToken || existing?.fbPageAccessToken || ''),
        ytApiKey: inc.ytApiKey?.includes('...') ? existing?.ytApiKey : (inc.ytApiKey || existing?.ytApiKey || ''),
      };
    });

    await kvSet('channel-api-configs', merged);
    return res.status(200).json({ success: true, count: merged.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
