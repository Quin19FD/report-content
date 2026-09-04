import type { NextApiRequest, NextApiResponse } from 'next';
import { kvList } from '../../lib/db';

// Endpoint chẩn đoán: kiểm tra env Turso + kết nối DB. KHÔNG lộ token.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const rawUrl = process.env.TURSO_DATABASE_URL || '';
  const hasUrl = !!rawUrl;
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;
  const urlScheme = rawUrl.trim().split(':')[0] || null;
  const rawLen = rawUrl.length;
  const trimmedLen = rawUrl.trim().length;
  const hasWhitespace = rawLen !== trimmedLen;
  const validFormat = /^libsql:\/\/[a-z0-9.-]+$/.test(rawUrl.trim());
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

  res.status(200).json({ hasUrl, hasToken, urlScheme, rawLen, trimmedLen, hasWhitespace, validFormat, dbOk, reportBuckets, error, onVercel: !!process.env.VERCEL });
}
