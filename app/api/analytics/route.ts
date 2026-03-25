import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface VideoAnalytics {
  views: number;
  likes: number;
  comments: number;
  revenue: number;
  retention: number;
}

interface AggregatedAnalytics {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalRevenue: number;
  averageRetention: number;
  videoCount: number;
  videos: {
    id: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    revenue: number;
    retention: number;
    published_at: string | null;
  }[];
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

async function getYouTubeStats(
  youtubeVideoId: string,
  accessToken: string
): Promise<VideoAnalytics | null> {
  try {
    const params = new URLSearchParams({
      part: 'statistics',
      id: youtubeVideoId,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.warn(`[Analytics] YouTube API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const item = data.items?.[0];
    if (!item) return null;

    const stats = item.statistics;

    return {
      views: parseInt(stats.viewCount || '0', 10),
      likes: parseInt(stats.likeCount || '0', 10),
      comments: parseInt(stats.commentCount || '0', 10),
      revenue: 0, // Revenue requires YouTube Analytics API with monetization scope
      retention: 0, // Retention requires YouTube Analytics API
    };
  } catch (err) {
    console.warn('[Analytics] YouTube fetch failed:', err);
    return null;
  }
}

async function getYouTubeAnalytics(
  youtubeVideoId: string,
  accessToken: string
): Promise<{ revenue: number; retention: number } | null> {
  try {
    // YouTube Analytics API for revenue and retention
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const params = new URLSearchParams({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'estimatedRevenue,averageViewPercentage',
      dimensions: 'video',
      filters: `video==${youtubeVideoId}`,
    });

    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const row = data.rows?.[0];
    if (!row) return null;

    return {
      revenue: row[1] ?? 0, // estimatedRevenue
      retention: row[2] ?? 0, // averageViewPercentage
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const userId = searchParams.get('userId');

    if (!videoId && !userId) {
      return NextResponse.json(
        { error: 'Either videoId or userId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch videos
    let query = supabase
      .from('videos')
      .select('id, title, youtube_video_id, user_id, published_at, status, duration_seconds');

    if (videoId) {
      query = query.eq('id', videoId);
    } else if (userId) {
      query = query.eq('user_id', userId).in('status', ['published', 'completed']);
    }

    const { data: videos, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch videos: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!videos || videos.length === 0) {
      if (videoId) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
      return NextResponse.json({
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalRevenue: 0,
        averageRetention: 0,
        videoCount: 0,
        videos: [],
      } satisfies AggregatedAnalytics);
    }

    // Get user's YouTube access token
    const relevantUserId = videos[0].user_id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('youtube_access_token')
      .eq('id', relevantUserId)
      .single();

    const accessToken = profile?.youtube_access_token ?? null;

    // Fetch analytics for each video
    const analyticsResults: AggregatedAnalytics['videos'] = [];
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalRevenue = 0;
    let totalRetention = 0;
    let retentionCount = 0;

    for (const video of videos) {
      let videoAnalytics: VideoAnalytics = {
        views: 0,
        likes: 0,
        comments: 0,
        revenue: 0,
        retention: 0,
      };

      if (video.youtube_video_id && accessToken) {
        // Fetch YouTube statistics
        const ytStats = await getYouTubeStats(video.youtube_video_id, accessToken);
        if (ytStats) {
          videoAnalytics = ytStats;
        }

        // Fetch YouTube Analytics for revenue and retention
        const ytAnalytics = await getYouTubeAnalytics(
          video.youtube_video_id,
          accessToken
        );
        if (ytAnalytics) {
          videoAnalytics.revenue = ytAnalytics.revenue;
          videoAnalytics.retention = ytAnalytics.retention;
        }
      }

      // Also check Supabase for locally stored analytics
      const { data: localStats } = await supabase
        .from('video_analytics')
        .select('views, likes, comments, revenue, retention')
        .eq('video_id', video.id)
        .maybeSingle();

      if (localStats) {
        videoAnalytics.views = Math.max(videoAnalytics.views, localStats.views ?? 0);
        videoAnalytics.likes = Math.max(videoAnalytics.likes, localStats.likes ?? 0);
        videoAnalytics.comments = Math.max(videoAnalytics.comments, localStats.comments ?? 0);
        videoAnalytics.revenue = Math.max(videoAnalytics.revenue, localStats.revenue ?? 0);
        videoAnalytics.retention = Math.max(videoAnalytics.retention, localStats.retention ?? 0);
      }

      totalViews += videoAnalytics.views;
      totalLikes += videoAnalytics.likes;
      totalComments += videoAnalytics.comments;
      totalRevenue += videoAnalytics.revenue;

      if (videoAnalytics.retention > 0) {
        totalRetention += videoAnalytics.retention;
        retentionCount++;
      }

      analyticsResults.push({
        id: video.id,
        title: video.title,
        views: videoAnalytics.views,
        likes: videoAnalytics.likes,
        comments: videoAnalytics.comments,
        revenue: videoAnalytics.revenue,
        retention: videoAnalytics.retention,
        published_at: video.published_at,
      });
    }

    // Single video request - return flat analytics
    if (videoId && analyticsResults.length === 1) {
      const v = analyticsResults[0];
      return NextResponse.json({
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        revenue: v.revenue,
        retention: v.retention,
      } satisfies VideoAnalytics);
    }

    // Multiple videos - return aggregated
    const result: AggregatedAnalytics = {
      totalViews,
      totalLikes,
      totalComments,
      totalRevenue,
      averageRetention: retentionCount > 0 ? totalRetention / retentionCount : 0,
      videoCount: analyticsResults.length,
      videos: analyticsResults,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Analytics API] Error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
