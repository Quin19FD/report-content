import { type ChannelApiConfig, type ReportEntry, normalizePostUrl } from '../types';

interface FacebookSyncOutput {
  posts: ReportEntry[];
  inboxes: number;
  status: 'SUCCESS' | 'ERROR' | 'SKIPPED';
  message?: string;
}

export async function fetchFacebookPageData(
  config: ChannelApiConfig,
  targetDate?: string,
  days: number = 1
): Promise<FacebookSyncOutput> {
  const pageId = config.fbPageId?.trim() || process.env.FACEBOOK_PAGE_ID?.trim() || '588402817683765';
  const token =
    config.fbPageAccessToken?.trim() ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ||
    'EAArhbgXPxmsBSlpwz6zQ1R1V1wJBO36znPZAmhXN4UPDGD9w7ObW80ZBeLbrR82d4eEM7eyDhXGF3QDt4tUZBU4bvcJej6Ry3rMJLHz1b8O1McNM2zqUadCqSvDrl02ZBwWogPGZCQEiYNo0YKSpCHhtiRuMHfy1lVj6bZCz7jy7eb5aEZCzwz5ZChyqhJVugz6uZCNAQZCd8hsmi3k0pjv6VNRGyC';

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

  // 0. Nhận diện trang cá nhân (Nguyễn Kevin) hay Fanpage (8 Sync Dev)
  const isPersonal =
    config.id === 'fb_kevin' ||
    (config.channelName && config.channelName.toLowerCase().includes('kevin')) ||
    pageId === '122283732116061265' ||
    pageId === '8sync';

  let effectivePageId = isPersonal ? 'me' : pageId.replace(/^(https?:\/\/)?(www\.)?facebook\.com\/?/i, '').replace(/\/$/, '').trim();
  let effectiveToken = token;

  if (!isPersonal) {
    try {
      // Kiểm tra xem token đã là Page Token trực tiếp chưa
      const meRes = await fetch(
        `https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`
      );
      if (meRes.ok) {
        const meData = (await meRes.json()) as { id?: string; name?: string };
        if (meData.id && meData.id !== '122283732116061265') {
          // Token này đã là Page Token xịn của Fanpage
          effectivePageId = meData.id;
          effectiveToken = token;
        } else {
          // Token là User Token, lấy Page Token tương ứng qua /me/accounts
          const accRes = await fetch(
            `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(token)}`
          );
          if (accRes.ok) {
            const accData = (await accRes.json()) as {
              data?: Array<{ id: string; name: string; access_token: string }>;
            };
            const pages = accData.data || [];
            const found =
              pages.find(
                (p) =>
                  p.id === effectivePageId ||
                  (config.channelName && p.name.toLowerCase().includes(config.channelName.toLowerCase())) ||
                  p.name.toLowerCase().includes('8 sync')
              ) || pages[0];
            if (found) {
              effectivePageId = found.id;
              effectiveToken = found.access_token || effectiveToken;
            }
          }
        }
      }
    } catch {
      // Nếu mạng chập chờn, tiếp tục dùng token và pageId hiện có
    }
  }

  try {
    // 1. Lấy tin nhắn mới theo ngày từ Page Insights (chỉ dành cho Fanpage)
    if (!isPersonal) {
      try {
        const insightUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(effectivePageId)}/insights?metric=page_messages_new_conversations_unique&period=day&access_token=${encodeURIComponent(effectiveToken)}`;
        const insightRes = await fetch(insightUrl);
        if (insightRes.ok) {
          const insightJson = (await insightRes.json()) as { data?: Array<{ values?: Array<{ value: number }> }> };
          const val = insightJson.data?.[0]?.values?.slice(-1)[0]?.value;
          if (typeof val === 'number') inboxes = val;
        }
      } catch {
        // Bỏ qua lỗi insights nếu quyền token chưa cấp đủ
      }
    }

    // 2. Lấy danh sách bài viết và video/reels
    const limit = Math.min(100, Math.max(20, days * 4));
    const sinceDate = days > 1 ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0] : '';

    interface FbPostItem {
      id: string;
      message?: string;
      created_time: string;
      permalink_url?: string;
      shares?: { count?: number };
    }

    interface FbVideoItem {
      id: string;
      title?: string;
      description?: string;
      views?: number;
      created_time: string;
      permalink_url?: string;
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
    }

    let rawPosts: FbPostItem[] = [];
    let rawVideos: FbVideoItem[] = [];

    if (isPersonal) {
      // Trang cá nhân: gọi /me/posts bằng User Token
      const personalUrl = `https://graph.facebook.com/v20.0/me/posts?fields=id,message,created_time,permalink_url,shares&limit=${limit}&access_token=${encodeURIComponent(effectiveToken)}`;
      const personalRes = await fetch(personalUrl).catch(() => null);
      if (personalRes && personalRes.ok) {
        const json = (await personalRes.json()) as { data?: FbPostItem[] };
        rawPosts = json.data || [];
      }

      if (rawPosts.length === 0) {
        return {
          posts: [],
          inboxes: 0,
          status: 'SUCCESS',
          message: 'Trang cá nhân Nguyễn Kevin đã kết nối (UID 122283732116061265). Meta yêu cầu cấp quyền "user_posts" trong User Token để tự động quét timeline cá nhân (hoặc nhập link thủ công qua Nhập Nhanh).',
        };
      }
    } else {
      // Fanpage: Gọi song song published_posts và videos (kèm views, likes, comments)
      const [postsRes, videosRes] = await Promise.all([
        fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(effectivePageId)}/published_posts?fields=id,message,created_time,permalink_url,shares&limit=${limit}&access_token=${encodeURIComponent(effectiveToken)}`
        ).catch(() => null),
        fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(effectivePageId)}/videos?fields=id,title,views,description,created_time,permalink_url,likes.summary(true),comments.summary(true)&limit=${limit}&access_token=${encodeURIComponent(effectiveToken)}`
        ).catch(() => null),
      ]);

      let postErrorMsg = '';
      if (postsRes && postsRes.ok) {
        const postsJson = (await postsRes.json()) as { data?: FbPostItem[] };
        rawPosts = postsJson.data || [];
      } else if (postsRes) {
        const errJson = (await postsRes.json().catch(() => ({}))) as { error?: { message?: string } };
        postErrorMsg = errJson.error?.message || `HTTP ${postsRes.status}`;
      }

      if (videosRes && videosRes.ok) {
        const videosJson = (await videosRes.json()) as { data?: FbVideoItem[] };
        rawVideos = videosJson.data || [];
      }

      // Nếu cả 2 đều lỗi kết nối/token, báo lỗi rõ ràng chứ không giấu thành 0 bài
      if ((!postsRes || !postsRes.ok) && (!videosRes || !videosRes.ok) && postErrorMsg) {
        return {
          posts: [],
          inboxes: 0,
          status: 'ERROR',
          message: `Lỗi kết nối Facebook Fanpage (${effectivePageId}): ${postErrorMsg}`,
        };
      }
    }

    // 3. Thu thập URL bài viết và batch query Facebook URL Engagement (Likes, Comments, Shares)
    const allUrls: string[] = [];
    rawPosts.forEach((p) => {
      if (p.permalink_url) allUrls.push(p.permalink_url);
    });
    rawVideos.forEach((v) => {
      const fullUrl = v.permalink_url?.startsWith('http')
        ? v.permalink_url
        : `https://www.facebook.com${v.permalink_url || ''}`;
      if (fullUrl) allUrls.push(fullUrl);
    });

    const urlMap = new Map<string, { likes: number; comments: number; shares: number }>();
    for (let i = 0; i < allUrls.length; i += 30) {
      const chunk = allUrls.slice(i, i + 30);
      try {
        const engUrl = `https://graph.facebook.com/v20.0/?ids=${encodeURIComponent(chunk.join(','))}&fields=engagement&access_token=${encodeURIComponent(effectiveToken)}`;
        const engRes = await fetch(engUrl);
        if (engRes.ok) {
          const engJson = (await engRes.json()) as Record<
            string,
            { engagement?: { reaction_count?: number; comment_count?: number; share_count?: number } }
          >;
          for (const [u, val] of Object.entries(engJson)) {
            if (val?.engagement) {
              urlMap.set(u, {
                likes: val.engagement.reaction_count || 0,
                comments: val.engagement.comment_count || 0,
                shares: val.engagement.share_count || 0,
              });
            }
          }
        }
      } catch {
        // Bỏ qua lỗi batch nhỏ
      }
    }

    // 4. Xử lý Video/Reels trước (vì có chỉ số Lượt xem views chính xác từ Facebook)
    for (const video of rawVideos) {
      const createdDate = video.created_time
        ? new Date(video.created_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
        : '';
      if (days > 1) {
        if (sinceDate && createdDate < sinceDate) continue;
      } else if (targetDate && createdDate !== targetDate) {
        continue;
      }

      const fullUrl = video.permalink_url?.startsWith('http')
        ? video.permalink_url
        : `https://www.facebook.com${video.permalink_url || `/reel/${video.id}/`}`;
      const eng = urlMap.get(fullUrl) || { likes: 0, comments: 0, shares: 0 };

      const timeStr = video.created_time
        ? new Date(video.created_time).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false })
        : '12:00';

      const isReel = fullUrl.includes('/reel/');
      const videoType = isReel ? 'Shorts' : 'Video Dài';

      posts.push({
        id: Date.now() + Math.floor(Math.random() * 10000),
        date: createdDate || new Date().toISOString().split('T')[0],
        time: timeStr,
        platform: 'Facebook',
        pageName: config.channelName,
        group: config.channelName,
        entityType: 'PAGE',
        link: fullUrl,
        reach: video.views !== undefined ? video.views : (eng.likes + eng.comments + eng.shares),
        inboxCount: inboxes,
        likes: video.likes?.summary?.total_count !== undefined ? video.likes.summary.total_count : eng.likes,
        comments: video.comments?.summary?.total_count !== undefined ? video.comments.summary.total_count : eng.comments,
        shares: eng.shares,
        hook: video.title || (video.description ? video.description.slice(0, 100) : ''),
        videoType,
        isShared: false,
      });
    }

    // 5. Xử lý bài viết thường (published_posts), chống trùng với video đã thêm
    for (const post of rawPosts) {
      const createdDate = post.created_time
        ? new Date(post.created_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
        : '';
      if (days > 1) {
        if (sinceDate && createdDate < sinceDate) continue;
      } else if (targetDate && createdDate !== targetDate) {
        continue;
      }

      const link = post.permalink_url || `https://facebook.com/${post.id}`;
      const normLink = normalizePostUrl(link);

      // Kiểm tra xem đã có trong danh sách posts (từ video) chưa
      const existingIdx = posts.findIndex((p) => {
        if (p.link && normLink) return normalizePostUrl(p.link) === normLink;
        return false;
      });

      const eng = (post.permalink_url ? urlMap.get(post.permalink_url) : null) || { likes: 0, comments: 0, shares: post.shares?.count || 0 };
      const likes = eng.likes || 0;
      const comments = eng.comments || 0;
      const shares = post.shares?.count || eng.shares || 0;
      const reach = (likes + comments + shares) > 0 ? (likes * 5 + comments * 2 + shares * 10) : 0;

      if (existingIdx >= 0) {
        // Đã có từ video, cập nhật thêm message bài viết nếu cần
        if (post.message && !posts[existingIdx].hook) {
          posts[existingIdx].hook = post.message.slice(0, 100);
        }
        if (shares > (Number(posts[existingIdx].shares) || 0)) {
          posts[existingIdx].shares = shares;
        }
        continue;
      }

      const timeStr = post.created_time
        ? new Date(post.created_time).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false })
        : '12:00';

      posts.push({
        id: Date.now() + Math.floor(Math.random() * 10000),
        date: createdDate || new Date().toISOString().split('T')[0],
        time: timeStr,
        platform: 'Facebook',
        pageName: config.channelName,
        group: config.channelName,
        entityType: 'PAGE',
        link,
        reach,
        inboxCount: inboxes,
        likes,
        comments,
        shares,
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
