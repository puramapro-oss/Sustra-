import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

interface TikTokPublishBody {
  video_id: string;
  title: string;
  description?: string;
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

    const body: TikTokPublishBody = await request.json();

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

    // Get user's TikTok access token from connected accounts
    const { data: connectedAccount } = await supabase
      .from('connected_accounts')
      .select('access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .single();

    if (!connectedAccount?.access_token) {
      return NextResponse.json(
        { error: 'TikTok not connected. Please connect your TikTok account in Settings.' },
        { status: 400 }
      );
    }

    const accessToken = connectedAccount.access_token;

    // Step 1: Initialize video publish via TikTok Content Posting API v2
    const caption = body.description
      ? `${body.title} - ${body.description}`
      : body.title;

    const initPayload = {
      post_info: {
        title: caption.slice(0, 150), // TikTok title limit
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: video.video_url,
      },
    };

    const initResponse = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(initPayload),
      }
    );

    if (!initResponse.ok) {
      const errData = await initResponse.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `TikTok API error (${initResponse.status})`;
      return NextResponse.json(
        { error: `TikTok publish init failed: ${errMsg}` },
        { status: 502 }
      );
    }

    const initData = await initResponse.json();

    // Check if TikTok returned a publish_id (direct URL pull mode)
    const publishId = initData?.data?.publish_id;

    if (!publishId) {
      // Fallback: TikTok returned an upload_url for manual upload
      const uploadUrl = initData?.data?.upload_url;

      if (!uploadUrl) {
        return NextResponse.json(
          { error: 'TikTok did not return a publish_id or upload_url' },
          { status: 502 }
        );
      }

      // Download the video and upload to TikTok's upload_url
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
          { error: `TikTok upload failed (${uploadResponse.status}): ${errText}` },
          { status: 502 }
        );
      }
    }

    // Update scheduled_posts if there's a matching entry
    await supabase
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('video_id', body.video_id)
      .eq('platform', 'tiktok')
      .in('status', ['scheduled', 'approved']);

    // Update the video record
    await supabase
      .from('videos')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.video_id);

    return NextResponse.json({
      message: 'Video published to TikTok successfully',
      publish_id: publishId || null,
    });
  } catch (error) {
    console.error('[Publish TikTok] Error:', error);

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
