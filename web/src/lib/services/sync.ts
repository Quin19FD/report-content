import { kvGet, kvSet } from '../db';
import { type ChannelApiConfig, type ReportEntry, type SyncResult, normalizePostUrl } from '../types';
import { fetchFacebookPageData } from './facebook';
import { fetchYouTubeChannelData } from './youtube';
import { fetchTikTokChannelData } from './tiktok';

// Khởi tạo cấu hình kênh mặc định từ các file dữ liệu sẵn có nếu DB chưa có
async function getOrCreateChannelConfigs(): Promise<ChannelApiConfig[]> {
  const existing = await kvGet<ChannelApiConfig[]>('channel-api-configs');
  if (Array.isArray(existing) && existing.length > 0) {
    if (!existing.some((c) => c.id === 'fb_kevin')) {
      existing.splice(1, 0, {
        id: 'fb_kevin',
        platform: 'Facebook',
        channelName: 'Nguyễn Kevin',
        enabled: true,
        fbPageId: '122283732116061265',
        fbPageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || 'EAArhbgXPxmsBSoehVisCY3BqhmtN7I6WcrsZCvwZAJdZCuIOGoRsD7AopcqyiZCubGTmvZCvskm3U4ZArZB3gamVIq0BYZBwOfiWuDTt4VJnANMXuwogqeIia9J1wlxPPIPqoj96GbusmAqA0esxpw0NQ4aP32CSkulWlfwmCU8tA3QxEThgRmvhXLwJO6lA9ZCE2cZAEDy9c2XRJs',
        lastSyncStatus: 'IDLE',
        lastSyncMessage: 'Trang cá nhân Nguyễn Kevin (UID 122283732116061265)',
      });
      await kvSet('channel-api-configs', existing);
    }
    return existing;
  }
  // Cấu hình ban đầu dựa trên danh sách kênh hiện có của dự án
  const defaults: ChannelApiConfig[] = [
    {
      id: 'fb_8syncdev',
      platform: 'Facebook',
      channelName: '8 Sync Dev',
      enabled: true,
      fbPageId: process.env.FACEBOOK_PAGE_ID || '588402817683765',
      fbPageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || 'EAArhbgXPxmsBSlpwz6zQ1R1V1wJBO36znPZAmhXN4UPDGD9w7ObW80ZBeLbrR82d4eEM7eyDhXGF3QDt4tUZBU4bvcJej6Ry3rMJLHz1b8O1McNM2zqUadCqSvDrl02ZBwWogPGZCQEiYNo0YKSpCHhtiRuMHfy1lVj6bZCz7jy7eb5aEZCzwz5ZChyqhJVugz6uZCNAQZCd8hsmi3k0pjv6VNRGyC',
      lastSyncStatus: 'IDLE',
      lastSyncMessage: 'Chưa chạy đồng bộ lần nào',
    },
    {
      id: 'fb_kevin',
      platform: 'Facebook',
      channelName: 'Nguyễn Kevin',
      enabled: true,
      fbPageId: '122283732116061265',
      fbPageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || 'EAArhbgXPxmsBSoehVisCY3BqhmtN7I6WcrsZCvwZAJdZCuIOGoRsD7AopcqyiZCubGTmvZCvskm3U4ZArZB3gamVIq0BYZBwOfiWuDTt4VJnANMXuwogqeIia9J1wlxPPIPqoj96GbusmAqA0esxpw0NQ4aP32CSkulWlfwmCU8tA3QxEThgRmvhXLwJO6lA9ZCE2cZAEDy9c2XRJs',
      lastSyncStatus: 'IDLE',
      lastSyncMessage: 'Trang cá nhân Nguyễn Kevin (UID 122283732116061265)',
    },
    {
      id: 'yt_8syncdev',
      platform: 'YouTube',
      channelName: '8 Sync Dev',
      enabled: true,
      ytChannelId: process.env.YOUTUBE_CHANNEL_ID || 'UCMWzM6NOoVvr9484XBSJEjg',
      ytApiKey: process.env.YOUTUBE_API_KEY || 'AIzaSyAG4YH7v0nqCxF5A2CJaj1pxXuBZg8MwI0',
      lastSyncStatus: 'IDLE',
      lastSyncMessage: 'Chưa chạy đồng bộ lần nào',
    },
    {
      id: 'tt_oj08sync',
      platform: 'TikTok',
      channelName: 'oj0.8sync',
      enabled: true,
      ttUsername: 'oj0.8sync',
      lastSyncStatus: 'IDLE',
      lastSyncMessage: 'Chưa chạy đồng bộ lần nào',
    },
  ];

  await kvSet('channel-api-configs', defaults);
  return defaults;
}

export async function syncAllChannels(targetDate?: string, days: number = 1): Promise<SyncResult> {
  const configs = await getOrCreateChannelConfigs();
  const dateKey = targetDate || new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  let totalSyncedPosts = 0;
  const channelResults: SyncResult['channels'] = [];
  const postsByDate = new Map<string, ReportEntry[]>();

  for (const config of configs) {
    if (!config.enabled) {
      channelResults.push({
        id: config.id,
        channelName: config.channelName,
        platform: config.platform,
        status: 'SKIPPED',
        syncedCount: 0,
        message: 'Kênh đang tắt đồng bộ tự động',
      });
      continue;
    }

    try {
      let fetchedPosts: ReportEntry[] = [];
      let inboxCount = 0;
      let syncStatus: 'SUCCESS' | 'ERROR' | 'SKIPPED' = 'SUCCESS';
      let syncMessage = '';

      if (config.platform === 'Facebook') {
        const res = await fetchFacebookPageData(config, dateKey, days);
        fetchedPosts = res.posts;
        inboxCount = res.inboxes;
        syncStatus = res.status;
        syncMessage = res.message || '';
      } else if (config.platform === 'YouTube') {
        const res = await fetchYouTubeChannelData(config, dateKey, days);
        fetchedPosts = res.posts;
        syncStatus = res.status;
        syncMessage = res.message || '';
      } else if (config.platform === 'TikTok') {
        const res = await fetchTikTokChannelData(config, dateKey, days);
        fetchedPosts = res.posts;
        syncStatus = res.status;
        syncMessage = res.message || '';
      }

      config.lastSyncAt = nowIso;
      config.lastSyncStatus = syncStatus;
      config.lastSyncMessage = syncMessage;

      totalSyncedPosts += fetchedPosts.length;
      channelResults.push({
        id: config.id,
        channelName: config.channelName,
        platform: config.platform,
        status: syncStatus,
        syncedCount: fetchedPosts.length,
        inboxCount,
        message: syncMessage,
      });

      // Gom nhóm bài viết theo ngày để lưu vào database bucket
      for (const post of fetchedPosts) {
        const pDate = post.date || dateKey;
        const list = postsByDate.get(pDate) || [];
        list.push(post);
        postsByDate.set(pDate, list);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      config.lastSyncAt = nowIso;
      config.lastSyncStatus = 'ERROR';
      config.lastSyncMessage = errMsg;

      channelResults.push({
        id: config.id,
        channelName: config.channelName,
        platform: config.platform,
        status: 'ERROR',
        syncedCount: 0,
        message: errMsg,
      });
    }
  }

  // Lưu kết quả bài viết vào các bucket reports-YYYY-MM-DD
  // Cơ chế MERGE: Nếu bài viết đã tồn tại (khớp link), cập nhật chỉ số mà không bị trùng lặp
  for (const [pDate, newPosts] of postsByDate.entries()) {
    const bucketKey = `reports-${pDate}`;
    const existing = (await kvGet<ReportEntry[]>(bucketKey)) || [];
    const merged = existing.slice();

    for (const post of newPosts) {
      const postNorm = normalizePostUrl(post.link);
      const idx = merged.findIndex((m) => {
        if (m.id === post.id) return true;
        if (postNorm && m.link) {
          return normalizePostUrl(m.link) === postNorm;
        }
        return false;
      });
      if (idx >= 0) {
        // Cập nhật chỉ số mới nhất (Reach, Views, Likes, Inbox)
        // QUAN TRỌNG: Không được đè số 0 lên dữ liệu hợp lệ hiện có (> 0)
        // vì API Graph Facebook hoặc YouTube có thể trả về 0 nếu thiếu quyền hoặc lượt xem chưa thống kê
        const curr = merged[idx];
        const incomingReach = typeof post.reach === 'number' ? post.reach : parseInt(String(post.reach || 0));
        const incomingLikes = typeof post.likes === 'number' ? post.likes : parseInt(String(post.likes || 0));
        const incomingComments = typeof post.comments === 'number' ? post.comments : parseInt(String(post.comments || 0));
        const incomingShares = typeof post.shares === 'number' ? post.shares : parseInt(String(post.shares || 0));
        const incomingInbox = typeof post.inboxCount === 'number' ? post.inboxCount : parseInt(String(post.inboxCount || 0));

        merged[idx] = {
          ...curr,
          pageName: post.pageName || curr.pageName,
          group: post.group || curr.group,
          hook: post.hook || curr.hook,
          reach: incomingReach > 0 ? incomingReach : (parseInt(String(curr.reach || 0)) || 0),
          inboxCount: incomingInbox > 0 ? incomingInbox : (parseInt(String(curr.inboxCount || 0)) || 0),
          likes: incomingLikes > 0 ? incomingLikes : (parseInt(String(curr.likes || 0)) || 0),
          comments: incomingComments > 0 ? incomingComments : (parseInt(String(curr.comments || 0)) || 0),
          shares: incomingShares > 0 ? incomingShares : (parseInt(String(curr.shares || 0)) || 0),
        };
      } else {
        merged.push(post);
      }
    }

    await kvSet(bucketKey, merged);
  }

  // Cập nhật lại trạng thái các kênh vào DB
  await kvSet('channel-api-configs', configs);

  return {
    success: channelResults.every((c) => c.status !== 'ERROR'),
    timestamp: nowIso,
    targetDate: dateKey,
    totalSyncedPosts,
    channels: channelResults,
  };
}
