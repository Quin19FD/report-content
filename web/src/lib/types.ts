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
