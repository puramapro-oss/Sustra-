import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

interface YouTubePublishBody {
  video_id: string;
  title: string;
  description?: string;
  tags?: string[];
  privacy_status?: 'public' | 'private' | 'unlisted';
  thumbnail_url?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: YouTubePublishBody = await request.json();

    if (!body.video_id || typeof body.video_id !== 'string') {
      return NextResponse.json(
        { error: 'video_id is required' },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    // Fetch the video
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', body.video_id)
      .eq('user_id', user.id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (!video.video_url) {
      return NextResponse.json(
        { error: 'Video has not been rendered yet' },
        { status: 400 }
      );
    }

    // Get user's YouTube access token
    const { data: profile } = await supabase
      .from('profiles')
      .select('youtube_access_token, youtube_refresh_token')
      .eq('id', user.id)
      .single();

    if (!profile?.youtube_access_token) {
      return NextResponse.json(
        { error: 'YouTube not connected. Please connect your YouTube account in Settings.' },
        { status: 400 }
      );
    }

    const accessToken = profile.youtube_access_token;

    // Step 1: Initialize resumable upload
    const metadata = {
      snippet: {
        title: body.title,
        description: body.description || '',
        tags: body.tags || ['sustra', 'ai-generated'],
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: body.privacy_status || 'public',
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
      return NextResponse.json(
        { error: `YouTube upload init failed (${initResponse.status}): ${errText}` },
        { status: 502 }
      );
    }

    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'YouTube did not return a resumable upload URL' },
        { status: 502 }
      );
    }

    // Step 2: Download the video file and upload to YouTube
    const videoResponse = await fetch(video.video_url);
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download video file for upload' },
        { status: 500 }
      );
    }

    const videoBuffer = await videoResponse.arrayBuffer();

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
      return NextResponse.json(
        { error: `YouTube upload failed (${uploadResponse.status}): ${errText}` },
        { status: 502 }
      );
    }

    const uploadData = await uploadResponse.json();
    const youtubeVideoId = uploadData.id;
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;

    // Step 3: Set thumbnail if provided
    if (body.thumbnail_url && youtubeVideoId) {
      try {
        const thumbResponse = await fetch(body.thumbnail_url);
        if (thumbResponse.ok) {
          const thumbBuffer = await thumbResponse.arrayBuffer();
          const contentType = thumbResponse.headers.get('content-type') || 'image/png';

          await fetch(
            `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${youtubeVideoId}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': contentType,
              },
              body: thumbBuffer,
            }
          );
        }
      } catch (thumbErr) {
        console.warn('[Publish YouTube] Thumbnail upload failed:', thumbErr);
        // Non-fatal: video was still uploaded
      }
    }

    // Update scheduled_posts if there's a matching entry
    await supabase
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_url: youtubeUrl,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('video_id', body.video_id)
      .eq('platform', 'youtube')
      .in('status', ['scheduled', 'approved']);

    // Update the video record
    await supabase
      .from('videos')
      .update({
        youtube_video_id: youtubeVideoId,
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.video_id);

    return NextResponse.json({
      message: 'Video published to YouTube successfully',
      youtube_url: youtubeUrl,
      youtube_video_id: youtubeVideoId,
    });
  } catch (error) {
    console.error('[Publish YouTube] Error:', error);

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
