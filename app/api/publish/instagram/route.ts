import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

interface InstagramPublishBody {
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

    const body: InstagramPublishBody = await request.json();

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

    // Get user's Instagram access token and IG user ID from connected accounts
    const { data: connectedAccount } = await supabase
      .from('connected_accounts')
      .select('access_token, platform_user_id')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .single();

    if (!connectedAccount?.access_token || !connectedAccount?.platform_user_id) {
      return NextResponse.json(
        { error: 'Instagram not connected. Please connect your Instagram Business account in Settings.' },
        { status: 400 }
      );
    }

    const accessToken = connectedAccount.access_token;
    const igUserId = connectedAccount.platform_user_id;

    const caption = body.description
      ? `${body.title}\n\n${body.description}`
      : body.title;

    // Step 1: Create media container for Reels
    const createMediaUrl = new URL(`https://graph.facebook.com/v19.0/${igUserId}/media`);
    createMediaUrl.searchParams.set('media_type', 'REELS');
    createMediaUrl.searchParams.set('video_url', video.video_url);
    createMediaUrl.searchParams.set('caption', caption);
    createMediaUrl.searchParams.set('access_token', accessToken);

    const createResponse = await fetch(createMediaUrl.toString(), {
      method: 'POST',
    });

    if (!createResponse.ok) {
      const errData = await createResponse.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Instagram API error (${createResponse.status})`;
      return NextResponse.json(
        { error: `Instagram media creation failed: ${errMsg}` },
        { status: 502 }
      );
    }

    const createData = await createResponse.json();
    const creationId = createData?.id;

    if (!creationId) {
      return NextResponse.json(
        { error: 'Instagram did not return a media container ID' },
        { status: 502 }
      );
    }

    // Step 2: Poll for media container status (video processing)
    let mediaReady = false;
    let pollAttempts = 0;
    const maxPollAttempts = 30; // Max ~5 minutes (10s intervals)

    while (!mediaReady && pollAttempts < maxPollAttempts) {
      pollAttempts++;

      const statusUrl = new URL(`https://graph.facebook.com/v19.0/${creationId}`);
      statusUrl.searchParams.set('fields', 'status_code');
      statusUrl.searchParams.set('access_token', accessToken);

      const statusResponse = await fetch(statusUrl.toString());
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.status_code === 'FINISHED') {
          mediaReady = true;
          break;
        }
        if (statusData.status_code === 'ERROR') {
          return NextResponse.json(
            { error: 'Instagram video processing failed' },
            { status: 502 }
          );
        }
      }

      // Wait 10 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    if (!mediaReady) {
      return NextResponse.json(
        { error: 'Instagram video processing timed out. The video may still be processing.' },
        { status: 504 }
      );
    }

    // Step 3: Publish the media container
    const publishUrl = new URL(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`);
    publishUrl.searchParams.set('creation_id', creationId);
    publishUrl.searchParams.set('access_token', accessToken);

    const publishResponse = await fetch(publishUrl.toString(), {
      method: 'POST',
    });

    if (!publishResponse.ok) {
      const errData = await publishResponse.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Instagram publish error (${publishResponse.status})`;
      return NextResponse.json(
        { error: `Instagram publish failed: ${errMsg}` },
        { status: 502 }
      );
    }

    const publishData = await publishResponse.json();
    const mediaId = publishData?.id;
    const instagramUrl = `https://www.instagram.com/reel/${mediaId}/`;

    // Update scheduled_posts if there's a matching entry
    await supabase
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_url: instagramUrl,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('video_id', body.video_id)
      .eq('platform', 'instagram')
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
      message: 'Video published to Instagram successfully',
      instagram_url: instagramUrl,
      media_id: mediaId,
    });
  } catch (error) {
    console.error('[Publish Instagram] Error:', error);

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
