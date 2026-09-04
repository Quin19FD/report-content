import type { NextApiRequest, NextApiResponse } from 'next';
import { kvList } from '../../lib/db';

// Endpoint chẩn đoán: kiểm tra env Turso + kết nối DB. KHÔNG lộ token.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const hasUrl = !!process.env.TURSO_DATABASE_URL;
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;
  const urlScheme = (process.env.TURSO_DATABASE_URL || '').split(':')[0] || null;

  let dbOk = false;
  let reportBuckets = 0;
  let error: string | null = null;
  try {
    const buckets = await kvList('reports-');
    reportBuckets = buckets.length;
    dbOk = true;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  res.status(200).json({ hasUrl, hasToken, urlScheme, dbOk, reportBuckets, error, onVercel: !!process.env.VERCEL });
}
