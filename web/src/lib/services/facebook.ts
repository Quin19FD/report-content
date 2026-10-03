import { type ChannelApiConfig, type ReportEntry } from '../types';

interface FacebookSyncOutput {
  posts: ReportEntry[];
  inboxes: number;
  status: 'SUCCESS' | 'ERROR' | 'SKIPPED';
  message?: string;
}

export async function fetchFacebookPageData(
  config: ChannelApiConfig,
  targetDate?: string
): Promise<FacebookSyncOutput> {
  const pageId = config.fbPageId?.trim();
  const token = config.fbPageAccessToken?.trim();

  if (!pageId || !token) {
    return {
      posts: [],
      inboxes: 0,
      status: 'SKIPPED',
      message: 'Chưa cấu hình Page ID hoặc Page Access Token',
    };
  }

  const posts: ReportEntry[] = [];
  let inboxes = 0;

  try {
    // 1. Lấy tin nhắn mới theo ngày từ Page Insights
    try {
      const insightUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}/insights?metric=page_messages_new_conversations_unique&period=day&access_token=${encodeURIComponent(token)}`;
      const insightRes = await fetch(insightUrl);
      if (insightRes.ok) {
        const insightJson = (await insightRes.json()) as { data?: Array<{ values?: Array<{ value: number }> }> };
        const val = insightJson.data?.[0]?.values?.slice(-1)[0]?.value;
        if (typeof val === 'number') inboxes = val;
      }
    } catch {
      // Bỏ qua lỗi insights nếu quyền token chưa cấp đủ
    }

    // 2. Lấy danh sách bài viết gần đây của Fanpage
    const postsUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}/published_posts?fields=id,message,created_time,permalink_url,shares&limit=20&access_token=${encodeURIComponent(token)}`;
    const postsRes = await fetch(postsUrl);

    if (!postsRes.ok) {
      const errJson = (await postsRes.json().catch(() => ({}))) as { error?: { message?: string } };
      return {
        posts: [],
        inboxes,
        status: 'ERROR',
        message: errJson.error?.message || `Lỗi gọi Facebook API HTTP ${postsRes.status}`,
      };
    }

    interface FbPostItem {
      id: string;
      message?: string;
      created_time: string;
      permalink_url?: string;
      shares?: { count?: number };
    }

    const postsJson = (await postsRes.json()) as { data?: FbPostItem[] };
    const rawPosts = postsJson.data || [];

    for (const post of rawPosts) {
      const createdDate = post.created_time ? post.created_time.split('T')[0] : '';
      if (targetDate && createdDate !== targetDate) continue;

      let reach = 0;
      // 3. Lấy Reach cho từng bài nếu có quyền
      try {
        const postInsightUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(post.id)}/insights?metric=post_impressions_unique&access_token=${encodeURIComponent(token)}`;
        const pRes = await fetch(postInsightUrl);
        if (pRes.ok) {
          const pJson = (await pRes.json()) as { data?: Array<{ values?: Array<{ value: number }> }> };
          reach = pJson.data?.[0]?.values?.[0]?.value || 0;
        }
      } catch {
        // Fallback reach = 0 nếu không đọc được post insights
      }

      const timeStr = post.created_time
        ? new Date(post.created_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '12:00';

      posts.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: createdDate || new Date().toISOString().split('T')[0],
        time: timeStr,
        platform: 'Facebook',
        pageName: config.channelName,
        group: config.channelName,
        entityType: 'PAGE',
        link: post.permalink_url || `https://facebook.com/${post.id}`,
        reach,
        inboxCount: inboxes, // Gán tin nhắn ngày vào bài đại diện
        shares: post.shares?.count || 0,
        hook: post.message ? post.message.slice(0, 100) : '',
        videoType: 'Shorts',
        isShared: false,
      });
    }

    return {
      posts,
      inboxes,
      status: 'SUCCESS',
      message: `Đã đồng bộ ${posts.length} bài viết và ${inboxes} tin nhắn khách`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      posts: [],
      inboxes: 0,
      status: 'ERROR',
      message: `Lỗi kết nối Facebook: ${errorMsg}`,
    };
  }
}
