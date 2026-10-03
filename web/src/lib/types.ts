export interface ReportEntry {
  id: number;
  date: string;
  time?: string;
  platform?: string;
  pageName?: string;
  entityType?: 'PAGE' | 'PROFILE' | 'GROUP' | 'CHANNEL';
  group?: string;
  sharedGroup?: string;
  reach?: string | number;
  inboxCount?: string | number;
  likes?: string | number;
  comments?: string | number;
  shares?: string | number;
  hook?: string;
  link?: string;
  videoType?: string;
  isShared?: boolean;
  image?: string | null;
  suggestion?: string;
  pillar?: string;
  ctaType?: string;
  retention3sRate?: number;
  completionRate?: number;
  avgWatchTimeSeconds?: number;
  [key: string]: unknown;
}

export interface ChannelGroup {
  name: string;
  link: string;
  type?: 'PAGE' | 'PROFILE' | 'GROUP';
}

export interface ChannelApiConfig {
  id: string;
  platform: 'Facebook' | 'YouTube' | 'TikTok';
  channelName: string;
  enabled: boolean;
  
  // Facebook
  fbPageId?: string;
  fbPageAccessToken?: string;
  
  // YouTube
  ytChannelId?: string;
  ytApiKey?: string;
  ytUploadsPlaylistId?: string;
  
  // TikTok
  ttUsername?: string;
  ttAccessToken?: string;
  rapidApiKey?: string;
  lastSyncAt?: string;
  lastSyncStatus?: 'SUCCESS' | 'ERROR' | 'IDLE' | 'SKIPPED';
  lastSyncMessage?: string;
}

export interface SyncResult {
  success: boolean;
  timestamp: string;
  targetDate: string;
  totalSyncedPosts: number;
  channels: Array<{
    id: string;
    channelName: string;
    platform: string;
    status: 'SUCCESS' | 'ERROR' | 'SKIPPED';
    syncedCount: number;
    inboxCount?: number;
    message?: string;
  }>;
}

export function resolvePageName(entry: ReportEntry): string {
  const name = entry.pageName || entry.group || 'Chưa phân loại';
  return name.trim();
}

export function normalizePostUrl(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const searchParams = new URLSearchParams(parsed.search);
    const trackingParams = ['fbclid', 'mibextid', 'feature', 'si', '_r', '_t', 'ref', 'source', 'utm_source', 'utm_medium', 'utm_campaign'];
    trackingParams.forEach((p) => searchParams.delete(p));

    const pathname = parsed.pathname.replace(/\/+$/, '');

    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      if (pathname.startsWith('/shorts/')) {
        const id = pathname.split('/shorts/')[1]?.split('/')[0];
        if (id) return `youtube.com/video/${id}`;
      } else if (parsed.hostname.includes('youtu.be')) {
        const id = pathname.replace(/^\//, '');
        if (id) return `youtube.com/video/${id}`;
      } else if (searchParams.has('v')) {
        const id = searchParams.get('v');
        if (id) return `youtube.com/video/${id}`;
      }
    }

    const fbPostMatch = pathname.match(/(?:posts|reel|videos)\/([0-9a-zA-Z_]+)/);
    if (fbPostMatch && fbPostMatch[1]) {
      return `facebook.com/content/${fbPostMatch[1]}`;
    }

    const cleanSearch = searchParams.toString();
    return `${parsed.hostname.toLowerCase()}${pathname}${cleanSearch ? '?' + cleanSearch : ''}`;
  } catch {
    return url.trim().replace(/\/+$/, '').toLowerCase();
  }
}
