import { type ChannelApiConfig, type ReportEntry } from '../types';

interface YouTubeSyncOutput {
  posts: ReportEntry[];
  status: 'SUCCESS' | 'ERROR' | 'SKIPPED';
  message?: string;
}

// Chuyển đổi định dạng ISO 8601 (PT1M30S) sang số giây để phân loại Shorts (< 60s)
function parseDurationSeconds(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchYouTubeChannelData(
  config: ChannelApiConfig,
  targetDate?: string,
  days: number = 1
): Promise<YouTubeSyncOutput> {
  const apiKey = config.ytApiKey?.trim() || process.env.YOUTUBE_API_KEY?.trim() || 'AIzaSyAG4YH7v0nqCxF5A2CJaj1pxXuBZg8MwI0';
  let playlistId = config.ytUploadsPlaylistId?.trim();

  // Quy ước chuẩn của YouTube: Channel ID 'UCxxxx' tương ứng Uploads Playlist 'UUxxxx'
  if (!playlistId && config.ytChannelId) {
    const cid = config.ytChannelId.trim();
    if (cid.startsWith('UC')) {
      playlistId = 'UU' + cid.slice(2);
    }
  }

  if (!apiKey || !playlistId) {
    return {
      posts: [],
      status: 'SKIPPED',
      message: 'Chưa cấu hình YouTube API Key hoặc Kênh/Playlist ID',
    };
  }

  try {
    // 1. Lấy danh sách video mới nhất trong Playlist Uploads
    const maxResults = Math.min(50, Math.max(15, days * 2));
    const sinceDate = days > 1 ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0] : '';
    const listUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=${maxResults}&key=${encodeURIComponent(apiKey)}`;
    const listRes = await fetch(listUrl);

    if (!listRes.ok) {
      const err = (await listRes.json().catch(() => ({}))) as { error?: { message?: string } };
      return {
        posts: [],
        status: 'ERROR',
        message: err.error?.message || `Lỗi gọi YouTube API HTTP ${listRes.status}`,
      };
    }

    interface PlaylistItem {
      contentDetails?: { videoId?: string };
      snippet?: {
        title?: string;
        publishedAt?: string;
      };
    }

    const listJson = (await listRes.json()) as { items?: PlaylistItem[] };
    const items = listJson.items || [];
    const videoIds = items.map((it) => it.contentDetails?.videoId).filter((id): id is string => !!id);

    if (videoIds.length === 0) {
      return {
        posts: [],
        status: 'SUCCESS',
        message: 'Kênh chưa có video nào được đăng',
      };
    }

    // 2. Lấy số liệu thống kê (views, likes, comments, duration)
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${encodeURIComponent(videoIds.join(','))}&key=${encodeURIComponent(apiKey)}`;
    const videosRes = await fetch(videosUrl);

    if (!videosRes.ok) {
      return {
        posts: [],
        status: 'ERROR',
        message: `Lỗi tải chi tiết video YouTube HTTP ${videosRes.status}`,
      };
    }

    interface VideoDetailItem {
      id: string;
      snippet?: {
        title?: string;
        publishedAt?: string;
      };
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
      };
      contentDetails?: {
        duration?: string;
      };
    }

    const videosJson = (await videosRes.json()) as { items?: VideoDetailItem[] };
    const videoDetails = videosJson.items || [];
    const posts: ReportEntry[] = [];

    for (const v of videoDetails) {
      const published = v.snippet?.publishedAt || '';
      const pubDate = published ? published.split('T')[0] : '';
      if (days > 1) {
        if (sinceDate && pubDate < sinceDate) continue;
      } else if (targetDate && pubDate !== targetDate) {
        continue;
      }

      const durationSec = v.contentDetails?.duration ? parseDurationSeconds(v.contentDetails.duration) : 0;
      const isShort = durationSec > 0 && durationSec <= 60;
      const videoType = isShort ? 'Shorts' : 'Video Dài';

      const timeStr = published
        ? new Date(published).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '12:00';

      const link = isShort ? `https://youtube.com/shorts/${v.id}` : `https://youtube.com/watch?v=${v.id}`;

      posts.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: pubDate || new Date().toISOString().split('T')[0],
        time: timeStr,
        platform: 'YouTube',
        pageName: config.channelName,
        group: config.channelName,
        entityType: 'CHANNEL',
        link,
        reach: v.statistics?.viewCount ? parseInt(v.statistics.viewCount, 10) : 0,
        inboxCount: 0,
        likes: v.statistics?.likeCount ? parseInt(v.statistics.likeCount, 10) : 0,
        comments: v.statistics?.commentCount ? parseInt(v.statistics.commentCount, 10) : 0,
        hook: v.snippet?.title || '',
        videoType,
        isShared: false,
      });
    }

    return {
      posts,
      status: 'SUCCESS',
      message: `Đã đồng bộ ${posts.length} video từ kênh ${config.channelName}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      posts: [],
      status: 'ERROR',
      message: `Lỗi kết nối YouTube: ${errorMsg}`,
    };
  }
}
