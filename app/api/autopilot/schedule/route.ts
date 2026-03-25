import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ScheduleRequestBody {
  video_id: string;
  platform: string;
  scheduled_at: string;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
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

    const body: ScheduleRequestBody = await request.json();

    if (!body.video_id || typeof body.video_id !== 'string') {
      return NextResponse.json(
        { error: 'video_id is required' },
        { status: 400 }
      );
    }

    if (!body.platform || typeof body.platform !== 'string') {
      return NextResponse.json(
        { error: 'platform is required' },
        { status: 400 }
      );
    }

    if (!body.scheduled_at || typeof body.scheduled_at !== 'string') {
      return NextResponse.json(
        { error: 'scheduled_at is required' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(body.scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'scheduled_at must be a valid ISO date string' },
        { status: 400 }
      );
    }

    if (scheduledDate.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'scheduled_at must be in the future' },
        { status: 400 }
      );
    }

    // Validate the video belongs to user
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, user_id, status')
      .eq('id', body.video_id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (video.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this video' },
        { status: 403 }
      );
    }

    // Create scheduled post
    const { data: post, error: insertError } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: user.id,
        video_id: body.video_id,
        platform: body.platform,
        scheduled_at: body.scheduled_at,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Autopilot Schedule] Insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to create scheduled post: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Post scheduled successfully',
      post,
    }, { status: 201 });
  } catch (error) {
    console.error('[Autopilot Schedule] Error:', error);

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
