import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface PublishRequestBody {
  videoId: string;
  platforms: string[];
  scheduleAt?: string;
}

interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

const SUPPORTED_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'twitter'];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

async function publishToYouTube(
  videoUrl: string,
  title: string,
  description: string,
  accessToken: string,
  scheduleAt?: string
): Promise<PublishResult> {
  try {
    // Step 1: Initialize resumable upload
    const metadata = {
      snippet: {
        title,
        description,
        tags: ['sustra', 'ai-generated'],
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: scheduleAt ? 'private' : 'public',
        publishAt: scheduleAt ?? undefined,
        selfDeclaredMadeForKids: false,
      },
    };

    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const errText = await initResponse.text().catch(() => '');
      return {
        platform: 'youtube',
        success: false,
        error: `YouTube init failed (${initResponse.status}): ${errText}`,
      };
    }

    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      return {
        platform: 'youtube',
        success: false,
        error: 'YouTube did not return upload URL',
      };
    }

    // Step 2: Download video file
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return {
        platform: 'youtube',
        success: false,
        error: 'Failed to download video for upload',
      };
    }
    const videoBuffer = await videoResponse.arrayBuffer();

    // Step 3: Upload video content
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(videoBuffer.byteLength),
      },
      body: videoBuffer,
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text().catch(() => '');
      return {
        platform: 'youtube',
        success: false,
        error: `YouTube upload failed (${uploadResponse.status}): ${errText}`,
      };
    }

    const uploadData = await uploadResponse.json();

    return {
      platform: 'youtube',
      success: true,
      url: `https://www.youtube.com/watch?v=${uploadData.id}`,
    };
  } catch (err) {
    return {
      platform: 'youtube',
      success: false,
      error: err instanceof Error ? err.message : 'YouTube publish failed',
    };
  }
}

async function publishToTikTok(
  _videoUrl: string,
  _title: string
): Promise<PublishResult> {
  // TikTok Content Posting API requires OAuth and app review
  // This would integrate with TikTok's Video Publish API v2
  return {
    platform: 'tiktok',
    success: false,
    error: 'TikTok publishing requires OAuth connection. Please connect your TikTok account in Settings.',
  };
}

async function publishToInstagram(
  _videoUrl: string,
  _title: string
): Promise<PublishResult> {
  // Instagram Graph API for Reels publishing
  return {
    platform: 'instagram',
    success: false,
    error: 'Instagram publishing requires a connected Business account. Please connect in Settings.',
  };
}

async function publishToTwitter(
  _videoUrl: string,
  _title: string
): Promise<PublishResult> {
  // Twitter/X API v2 for media upload + tweet
  return {
    platform: 'twitter',
    success: false,
    error: 'Twitter/X publishing requires OAuth connection. Please connect your account in Settings.',
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: PublishRequestBody = await request.json();

    if (!body.videoId || typeof body.videoId !== 'string') {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    if (
      !body.platforms ||
      !Array.isArray(body.platforms) ||
      body.platforms.length === 0
    ) {
      return NextResponse.json(
        { error: 'platforms array is required and must not be empty' },
        { status: 400 }
      );
    }

    for (const platform of body.platforms) {
      if (!SUPPORTED_PLATFORMS.includes(platform)) {
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}. Supported: ${SUPPORTED_PLATFORMS.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (body.scheduleAt) {
      const scheduleDate = new Date(body.scheduleAt);
      if (isNaN(scheduleDate.getTime())) {
        return NextResponse.json(
          { error: 'scheduleAt must be a valid ISO date string' },
          { status: 400 }
        );
      }
      if (scheduleDate.getTime() < Date.now()) {
        return NextResponse.json(
          { error: 'scheduleAt must be in the future' },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdmin();

    // Fetch video
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', body.videoId)
      .single();

    if (fetchError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.video_url) {
      return NextResponse.json(
        { error: 'Video has not been rendered yet' },
        { status: 400 }
      );
    }

    if (video.status !== 'completed' && video.status !== 'published') {
      return NextResponse.json(
        { error: `Video status is "${video.status}". Only completed videos can be published.` },
        { status: 400 }
      );
    }

    // Get user profile for OAuth tokens
    const { data: profile } = await supabase
      .from('profiles')
      .select('youtube_access_token, youtube_refresh_token, youtube_channel_id')
      .eq('id', video.user_id)
      .single();

    const results: PublishResult[] = [];

    for (const platform of body.platforms) {
      switch (platform) {
        case 'youtube': {
          if (!profile?.youtube_access_token) {
            results.push({
              platform: 'youtube',
              success: false,
              error: 'YouTube not connected. Please connect your YouTube account in Settings.',
            });
          } else {
            const result = await publishToYouTube(
              video.video_url,
              video.title,
              video.description || '',
              profile.youtube_access_token,
              body.scheduleAt
            );

            // If published to YouTube, save the YouTube video ID
            if (result.success && result.url) {
              const ytVideoId = result.url.split('v=')[1];
              if (ytVideoId) {
                await supabase
                  .from('videos')
                  .update({
                    youtube_video_id: ytVideoId,
                    published_at: new Date().toISOString(),
                  })
                  .eq('id', body.videoId);
              }
            }

            results.push(result);
          }
          break;
        }
        case 'tiktok':
          results.push(await publishToTikTok(video.video_url, video.title));
          break;
        case 'instagram':
          results.push(await publishToInstagram(video.video_url, video.title));
          break;
        case 'twitter':
          results.push(await publishToTwitter(video.video_url, video.title));
          break;
      }
    }

    // Update video published_platforms
    const successfulPlatforms = results
      .filter((r) => r.success)
      .map((r) => r.platform);

    if (successfulPlatforms.length > 0) {
      await supabase
        .from('videos')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.videoId);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Publish API] Error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
