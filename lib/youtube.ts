import { API_ENDPOINTS } from './constants';
import type { YouTubeChannel, YouTubeVideoStats, YouTubeUploadResult } from './types';

// ============================================================================
// Helpers
// ============================================================================

async function youtubeApiFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`YouTube API error (${response.status}): ${errorBody}`);
  }

  return response;
}

// ============================================================================
// Upload Video
// ============================================================================

export async function uploadVideo(
  accessToken: string,
  videoFile: Blob,
  title: string,
  description: string,
  tags: string[],
  thumbnailFile?: Blob,
  options?: {
    categoryId?: string;
    privacyStatus?: 'public' | 'private' | 'unlisted';
    madeForKids?: boolean;
    defaultLanguage?: string;
  }
): Promise<YouTubeUploadResult> {
  const privacyStatus = options?.privacyStatus || 'private';
  const categoryId = options?.categoryId || '22'; // People & Blogs

  // Step 1: Initiate resumable upload
  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId,
      defaultLanguage: options?.defaultLanguage || 'en',
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: options?.madeForKids ?? false,
    },
  };

  const params = new URLSearchParams({
    uploadType: 'resumable',
    part: 'snippet,status',
  });

  const initResponse = await youtubeApiFetch(
    `${API_ENDPOINTS.YOUTUBE_UPLOAD}?${params}`,
    accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(videoFile.size),
        'X-Upload-Content-Type': videoFile.type || 'video/mp4',
      },
      body: JSON.stringify(metadata),
    }
  );

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Failed to get upload URL from YouTube');
  }

  // Step 2: Upload the video file
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': videoFile.type || 'video/mp4',
      'Content-Length': String(videoFile.size),
    },
    body: videoFile,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text().catch(() => 'Unknown error');
    throw new Error(`YouTube upload failed (${uploadResponse.status}): ${errorBody}`);
  }

  const uploadResult = await uploadResponse.json();
  const videoId = uploadResult.id;

  // Step 3: Upload thumbnail if provided
  if (thumbnailFile && videoId) {
    try {
      const thumbParams = new URLSearchParams({ videoId });
      const formData = new FormData();
      formData.append('media', thumbnailFile);

      await youtubeApiFetch(
        `${API_ENDPOINTS.YOUTUBE_API_BASE}/thumbnails/set?${thumbParams}`,
        accessToken,
        {
          method: 'POST',
          body: formData,
        }
      );
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      // Non-fatal: video is uploaded, thumbnail just failed
    }
  }

  return {
    video_id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    status: 'uploaded',
  };
}

// ============================================================================
// Channel Stats
// ============================================================================

export async function getChannelStats(
  accessToken: string
): Promise<YouTubeChannel> {
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    mine: 'true',
  });

  const response = await youtubeApiFetch(
    `${API_ENDPOINTS.YOUTUBE_API_BASE}/channels?${params}`,
    accessToken
  );

  const data = await response.json();
  const channel = data.items?.[0];

  if (!channel) {
    throw new Error('No YouTube channel found for this account');
  }

  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    thumbnail_url: channel.snippet.thumbnails?.default?.url || '',
    subscriber_count: parseInt(channel.statistics.subscriberCount, 10) || 0,
    video_count: parseInt(channel.statistics.videoCount, 10) || 0,
    view_count: parseInt(channel.statistics.viewCount, 10) || 0,
  };
}

// ============================================================================
// Video Stats
// ============================================================================

export async function getVideoStats(
  accessToken: string,
  videoId: string
): Promise<YouTubeVideoStats> {
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    id: videoId,
  });

  const response = await youtubeApiFetch(
    `${API_ENDPOINTS.YOUTUBE_API_BASE}/videos?${params}`,
    accessToken
  );

  const data = await response.json();
  const video = data.items?.[0];

  if (!video) {
    throw new Error(`Video not found: ${videoId}`);
  }

  return {
    id: video.id,
    title: video.snippet.title,
    view_count: parseInt(video.statistics.viewCount, 10) || 0,
    like_count: parseInt(video.statistics.likeCount, 10) || 0,
    comment_count: parseInt(video.statistics.commentCount, 10) || 0,
    published_at: video.snippet.publishedAt,
  };
}

// ============================================================================
// List Videos
// ============================================================================

export async function listChannelVideos(
  accessToken: string,
  maxResults: number = 20
): Promise<YouTubeVideoStats[]> {
  // First get the channel's uploads playlist
  const channelParams = new URLSearchParams({
    part: 'contentDetails',
    mine: 'true',
  });

  const channelResponse = await youtubeApiFetch(
    `${API_ENDPOINTS.YOUTUBE_API_BASE}/channels?${channelParams}`,
    accessToken
  );

  const channelData = await channelResponse.json();
  const uploadsPlaylistId =
    channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error('Could not find uploads playlist');
  }

  // Get playlist items
  const playlistParams = new URLSearchParams({
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  });

  const playlistResponse = await youtubeApiFetch(
    `${API_ENDPOINTS.YOUTUBE_API_BASE}/playlistItems?${playlistParams}`,
    accessToken
  );

  const playlistData = await playlistResponse.json();
  const videoIds = (playlistData.items || [])
    .map((item: { snippet: { resourceId: { videoId: string } } }) => item.snippet.resourceId.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  // Get video stats
  const videoParams = new URLSearchParams({
    part: 'snippet,statistics',
    id: videoIds.join(','),
  });

  const videosResponse = await youtubeApiFetch(
    `${API_ENDPOINTS.YOUTUBE_API_BASE}/videos?${videoParams}`,
    accessToken
  );

  const videosData = await videosResponse.json();

  return (videosData.items || []).map(
    (video: {
      id: string;
      snippet: { title: string; publishedAt: string };
      statistics: { viewCount: string; likeCount: string; commentCount: string };
    }) => ({
      id: video.id,
      title: video.snippet.title,
      view_count: parseInt(video.statistics.viewCount, 10) || 0,
      like_count: parseInt(video.statistics.likeCount, 10) || 0,
      comment_count: parseInt(video.statistics.commentCount, 10) || 0,
      published_at: video.snippet.publishedAt,
    })
  );
}
