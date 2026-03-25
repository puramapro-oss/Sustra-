import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const body = await request.json();
    const { post_id, new_scheduled_at } = body;

    if (!post_id || typeof post_id !== 'string') {
      return NextResponse.json(
        { error: 'post_id is required' },
        { status: 400 }
      );
    }

    if (!new_scheduled_at || typeof new_scheduled_at !== 'string') {
      return NextResponse.json(
        { error: 'new_scheduled_at is required' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(new_scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'new_scheduled_at must be a valid ISO date string' },
        { status: 400 }
      );
    }

    if (scheduledDate.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'new_scheduled_at must be in the future' },
        { status: 400 }
      );
    }

    // Fetch the post and validate ownership
    const { data: post, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('id, user_id, status')
      .eq('id', post_id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Scheduled post not found' },
        { status: 404 }
      );
    }

    if (post.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this scheduled post' },
        { status: 403 }
      );
    }

    if (post.status === 'published' || post.status === 'publishing') {
      return NextResponse.json(
        { error: `Cannot reschedule post with status "${post.status}"` },
        { status: 400 }
      );
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('scheduled_posts')
      .update({
        scheduled_at: new_scheduled_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Autopilot Reschedule] Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to reschedule post: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Post rescheduled successfully',
      post: updatedPost,
    });
  } catch (error) {
    console.error('[Autopilot Reschedule] Error:', error);

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
