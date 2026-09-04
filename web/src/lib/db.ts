import { createClient, type Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

let client: Client | null = null;
let ready: Promise<void> | null = null;

function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    // Cloud (Turso) — dùng khi deploy (Vercel...). Bền vững, đa người dùng.
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  } else {
    // Local — file SQLite, không cần cài đặt gì, dữ liệu vẫn được giữ lại.
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    client = createClient({ url: `file:${path.join(DATA_DIR, 'app.db')}` });
  }
  return client;
}

async function init(): Promise<void> {
  const db = getClient();
  await db.execute('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)');

  // Migrate 1 lần từ các file JSON cũ (nếu bảng còn trống) — không mất dữ liệu.
  const count = await db.execute('SELECT COUNT(*) AS n FROM kv');
  const n = Number((count.rows[0] as Record<string, unknown>).n ?? 0);
  if (n === 0 && fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const key = file.replace(/\.json$/, '');
        const value = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
        JSON.parse(value); // chỉ nhận JSON hợp lệ
        await db.execute({ sql: 'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', args: [key, value] });
      } catch {
        // bỏ qua file hỏng
      }
    }
  }
}

function boot(): Promise<void> {
  if (!ready) ready = init();
  return ready;
}

export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  await boot();
  const r = await getClient().execute({ sql: 'SELECT value FROM kv WHERE key = ?', args: [key] });
  if (!r.rows.length) return null;
  try {
    return JSON.parse((r.rows[0] as Record<string, unknown>).value as string) as T;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await boot();
  await getClient().execute({
    sql: 'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)',
    args: [key, JSON.stringify(value)],
  });
}

export async function kvDel(key: string): Promise<void> {
  await boot();
  await getClient().execute({ sql: 'DELETE FROM kv WHERE key = ?', args: [key] });
}

export async function kvList<T = unknown>(prefix: string): Promise<{ key: string; value: T }[]> {
  await boot();
  const r = await getClient().execute({
    sql: 'SELECT key, value FROM kv WHERE key LIKE ? ORDER BY key',
    args: [`${prefix}%`],
  });
  const out: { key: string; value: T }[] = [];
  for (const row of r.rows) {
    const rec = row as Record<string, unknown>;
    try {
      out.push({ key: rec.key as string, value: JSON.parse(rec.value as string) as T });
    } catch {
      // bỏ qua row hỏng
    }
  }
  return out;
}
