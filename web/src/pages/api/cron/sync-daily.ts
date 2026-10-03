import type { NextApiRequest, NextApiResponse } from 'next';
import { syncAllChannels } from '../../../lib/services/sync';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Chỉ hỗ trợ GET hoặc POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Kiểm tra xác thực Cron Secret nếu có cấu hình trong môi trường
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const querySecret = req.query.secret;
    const adminHeader = req.headers['x-admin-auth'];

    const isAuthorized =
      token === cronSecret ||
      querySecret === cronSecret ||
      adminHeader === 'admin';

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized: Invalid cron secret or admin permission' });
    }
  }

  // 2. Xác định ngày cần quét
  let targetDate = (req.query.date as string) || '';
  if (!targetDate) {
    if (req.query.yesterday === 'true') {
      targetDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    } else {
      targetDate = new Date().toISOString().split('T')[0];
    }
  }
  const daysParam = parseInt(String(req.query.days || req.body?.days || '1'), 10);
  const days = isNaN(daysParam) || daysParam < 1 ? 1 : Math.min(30, daysParam);

  try {
    const result = await syncAllChannels(targetDate, days);
    return res.status(200).json({
      success: true,
      message: `Đã hoàn tất đồng bộ ${days > 1 ? `${days} ngày qua` : `ngày ${targetDate}`}`,
      result,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: `Lỗi trong quá trình đồng bộ: ${errorMsg}`,
    });
  }
}
