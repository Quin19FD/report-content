import { type ReportEntry, normalizePostUrl } from './types';

export type ColumnKey =
  | 'stt'
  | 'date'
  | 'platform'
  | 'time'
  | 'group'
  | 'link'
  | 'reach'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'inboxCount';

const HEADER_MAP: Record<string, ColumnKey> = {
  stt: 'stt',
  no: 'stt',
  index: 'stt',
  '#': 'stt',
  'số thứ tự': 'stt',
  'so thu tu': 'stt',

  ngay: 'date',
  ngày: 'date',
  date: 'date',
  'ngày đăng': 'date',
  'ngay dang': 'date',
  'thời gian đăng': 'date',
  'thoi gian dang': 'date',

  'nền tảng': 'platform',
  'nen tang': 'platform',
  nền: 'platform',
  nen: 'platform',
  platform: 'platform',
  'mạng xã hội': 'platform',
  'mang xa hoi': 'platform',

  giờ: 'time',
  gio: 'time',
  time: 'time',
  'thời gian': 'time',
  'thoi gian': 'time',

  'kênh / page': 'group',
  'kenh / page': 'group',
  'kênh/page': 'group',
  'kenh/page': 'group',
  kênh: 'group',
  kenh: 'group',
  page: 'group',
  group: 'group',
  nhóm: 'group',
  nhom: 'group',
  fanpage: 'group',
  trang: 'group',
  channel: 'group',

  link: 'link',
  url: 'link',
  'liên kết': 'link',
  'lien ket': 'link',
  'đường dẫn': 'link',
  'duong dan': 'link',
  'bài viết': 'link',
  'bai viet': 'link',
  video: 'link',
  'link bài viết / video': 'link',
  'link bài viết': 'link',
  'link video': 'link',

  'lượt xem': 'reach',
  'luot xem': 'reach',
  'lượt xem / reach': 'reach',
  views: 'reach',
  view: 'reach',
  reach: 'reach',
  'lượt tiếp cận': 'reach',
  'luot tiep can': 'reach',

  like: 'likes',
  likes: 'likes',
  thích: 'likes',
  thich: 'likes',
  tim: 'likes',
  reactions: 'likes',
  reaction: 'likes',

  comment: 'comments',
  comments: 'comments',
  'bình luận': 'comments',
  'binh luan': 'comments',
  cmt: 'comments',

  share: 'shares',
  shares: 'shares',
  'chia sẻ': 'shares',
  'chia se': 'shares',

  inbox: 'inboxCount',
  inboxes: 'inboxCount',
  'tin nhắn': 'inboxCount',
  'tin nhan': 'inboxCount',
  'tin nhắn khách': 'inboxCount',
  'tin nhan khach': 'inboxCount',
};

export function parseMetricNumber(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') return 0;
  let s = String(raw).trim().toLowerCase();
  if (!s || s === '--' || s === 'n/a') return 0;

  let multiplier = 1;
  if (s.endsWith('k')) {
    multiplier = 1000;
    s = s.slice(0, -1).trim();
  } else if (s.endsWith('m') || s.endsWith('tr')) {
    multiplier = 1000000;
    s = s.slice(0, -1).trim();
  }

  if (multiplier > 1) {
    s = s.replace(/,/g, '.');
    const val = parseFloat(s);
    return isNaN(val) ? 0 : Math.round(val * multiplier);
  }

  s = s.replace(/[,.\s]/g, '');
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

export function normalizeDate(raw?: string, defaultDate: string = new Date().toISOString().split('T')[0]): string {
  if (!raw) return defaultDate;
  const s = String(raw).trim();
  const ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return defaultDate;
}

export function normalizeTime(raw?: string, defaultTime: string = '12:00'): string {
  if (!raw) return defaultTime;
  const s = String(raw).trim().toLowerCase();
  const hMatch = s.match(/^(\d{1,2})h(?:(\d{2}))?$/);
  if (hMatch) {
    const hh = hMatch[1].padStart(2, '0');
    const mm = (hMatch[2] || '00').padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const timeMatch = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }
  return defaultTime;
}

export function detectPlatformFromUrl(url: string, fallback: string = 'Facebook'): string {
  const u = (url || '').toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('tiktok.com')) return 'TikTok';
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.me')) return 'Facebook';
  return fallback;
}

export function parseCSVRows(text: string): { delimiter: string; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
  let countTab = 0;
  let countComma = 0;
  let countSemicolon = 0;
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i++) {
    const c = firstLine[i];
    if (c === '"') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (c === '\t') countTab++;
      else if (c === ',') countComma++;
      else if (c === ';') countSemicolon++;
    }
  }

  let delimiter = ',';
  if (countTab >= countComma && countTab >= countSemicolon && countTab > 0) delimiter = '\t';
  else if (countSemicolon > countComma && countSemicolon > countTab) delimiter = ';';
  else delimiter = ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return { delimiter, rows };
}

export function parseReportCSV(
  text: string,
  defaultDate: string = new Date().toISOString().split('T')[0],
  defaultTime: string = '12:00',
  defaultPlatform: string = 'Facebook'
): Partial<ReportEntry>[] {
  const { rows } = parseCSVRows(text);
  if (rows.length === 0) return [];

  const firstRow = rows[0];
  const headerIndices: Partial<Record<ColumnKey, number>> = {};
  let isHeaderRow = false;

  firstRow.forEach((col, idx) => {
    const cleaned = col
      .replace(/[\p{Emoji}\uFE0F]/gu, '')
      .replace(/[^\p{L}\p{N}/#\-_ ]/gu, '')
      .trim()
      .toLowerCase();
    const key = HEADER_MAP[cleaned];
    if (key) {
      headerIndices[key] = idx;
      if (key !== 'stt') isHeaderRow = true;
    }
  });

  const dataRows = isHeaderRow ? rows.slice(1) : rows;
  const entries: Partial<ReportEntry>[] = [];

  for (const cols of dataRows) {
    if (cols.length === 0 || cols.every((c) => c.length === 0)) continue;

    // Trường hợp 1 dòng duy nhất chỉ chứa 1 link bài viết
    if (cols.length === 1 && (cols[0].startsWith('http') || cols[0].includes('.com') || cols[0].includes('.be'))) {
      const link = cols[0];
      const platform = detectPlatformFromUrl(link, defaultPlatform);
      entries.push({
        date: defaultDate,
        time: defaultTime,
        platform,
        group: platform === 'TikTok' ? 'oj0.8sync' : '8 Sync Dev',
        link,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        inboxCount: 0,
      });
      continue;
    }

    if (isHeaderRow) {
      const linkVal = headerIndices.link !== undefined ? cols[headerIndices.link] : '';
      if (!linkVal && cols.length === 1) continue;

      const dateVal = headerIndices.date !== undefined ? cols[headerIndices.date] : '';
      const platVal = headerIndices.platform !== undefined ? cols[headerIndices.platform] : '';
      const timeVal = headerIndices.time !== undefined ? cols[headerIndices.time] : '';
      const groupVal = headerIndices.group !== undefined ? cols[headerIndices.group] : '';
      const reachVal = headerIndices.reach !== undefined ? cols[headerIndices.reach] : '';
      const likesVal = headerIndices.likes !== undefined ? cols[headerIndices.likes] : '';
      const cmtVal = headerIndices.comments !== undefined ? cols[headerIndices.comments] : '';
      const shareVal = headerIndices.shares !== undefined ? cols[headerIndices.shares] : '';
      const inboxVal = headerIndices.inboxCount !== undefined ? cols[headerIndices.inboxCount] : '';

      const link = linkVal || '';
      if (!link) continue;

      const platformClean = (platVal || '').toLowerCase().trim();
      let platform = defaultPlatform;
      if (platformClean === 'facebook' || platformClean === 'fb') platform = 'Facebook';
      else if (platformClean === 'youtube' || platformClean === 'yt') platform = 'YouTube';
      else if (platformClean === 'tiktok' || platformClean === 'tt') platform = 'TikTok';
      else platform = detectPlatformFromUrl(link, defaultPlatform);

      entries.push({
        date: normalizeDate(dateVal, defaultDate),
        platform,
        time: normalizeTime(timeVal, defaultTime),
        group: groupVal || (platform === 'TikTok' ? 'oj0.8sync' : '8 Sync Dev'),
        link,
        reach: parseMetricNumber(reachVal),
        likes: parseMetricNumber(likesVal),
        comments: parseMetricNumber(cmtVal),
        shares: parseMetricNumber(shareVal),
        inboxCount: parseMetricNumber(inboxVal),
      });
    } else {
      // Heuristic nhận diện cột tự động khi không có tiêu đề
      let linkIdx = cols.findIndex(
        (c) =>
          c.startsWith('http://') ||
          c.startsWith('https://') ||
          c.includes('facebook.com') ||
          c.includes('youtube.com') ||
          c.includes('tiktok.com')
      );
      if (linkIdx === -1 && cols[0]?.length > 10 && cols[0].includes('/')) linkIdx = 0;
      if (linkIdx === -1) continue;

      const link = cols[linkIdx];
      const platform = detectPlatformFromUrl(link, defaultPlatform);

      // Nhận diện ngày
      const dateCol = cols.find(
        (c) => /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(c) || /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(c)
      );
      const date = normalizeDate(dateCol, defaultDate);

      // Nhận diện giờ
      const timeCol = cols.find(
        (c) => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(c) || /^\d{1,2}h(?:\d{2})?$/.test(c)
      );
      const time = normalizeTime(timeCol, defaultTime);

      // Nhận diện tên kênh: không phải link, date, time, không phải số thuần túy, không phải tên platform
      const groupCol = cols.find(
        (c, idx) =>
          idx !== linkIdx &&
          c !== dateCol &&
          c !== timeCol &&
          isNaN(Number(c.replace(/[,.]/g, ''))) &&
          c.length > 2 &&
          !['facebook', 'youtube', 'tiktok', 'fb', 'yt', 'tt'].includes(c.toLowerCase())
      );
      const group = groupCol || (platform === 'TikTok' ? 'oj0.8sync' : '8 Sync Dev');

      // Nhận diện các cột số liệu
      const numCols = cols.filter(
        (c, idx) =>
          idx !== linkIdx &&
          c !== dateCol &&
          c !== timeCol &&
          c !== groupCol &&
          /^-?[\d\s,.]+(?:[kKmMtrTR])?$/.test(c.trim()) &&
          c.trim() !== ''
      );

      const reach = numCols[0] ? parseMetricNumber(numCols[0]) : 0;
      const likes = numCols[1] ? parseMetricNumber(numCols[1]) : 0;
      const comments = numCols[2] ? parseMetricNumber(numCols[2]) : 0;
      const shares = numCols[3] ? parseMetricNumber(numCols[3]) : 0;
      const inboxCount = numCols[4] ? parseMetricNumber(numCols[4]) : 0;

      entries.push({
        date,
        platform,
        time,
        group,
        link,
        reach,
        likes,
        comments,
        shares,
        inboxCount,
      });
    }
  }

  return entries;
}
