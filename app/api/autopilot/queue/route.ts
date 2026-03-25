import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    const { data: posts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select(`
        *,
        videos (
          id,
          title,
          description,
          video_url,
          thumbnail_url,
          status,
          duration_seconds
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['scheduled', 'approved', 'publishing'])
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error('[Autopilot Queue] Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch queue: ${fetchError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      queue: posts || [],
      count: posts?.length || 0,
    });
  } catch (error) {
    console.error('[Autopilot Queue GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
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
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate each item has id and scheduled_at
    for (const item of items) {
      if (!item.id || !item.scheduled_at) {
        return NextResponse.json(
          { error: 'Each item must have id and scheduled_at' },
          { status: 400 }
        );
      }

      const date = new Date(item.scheduled_at);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: `Invalid date for post ${item.id}: ${item.scheduled_at}` },
          { status: 400 }
        );
      }
    }

    // Verify all posts belong to user
    const postIds = items.map((item: { id: string }) => item.id);
    const { data: existingPosts, error: verifyError } = await supabase
      .from('scheduled_posts')
      .select('id')
      .eq('user_id', user.id)
      .in('id', postIds);

    if (verifyError) {
      console.error('[Autopilot Queue] Verify error:', verifyError);
      return NextResponse.json(
        { error: `Failed to verify posts: ${verifyError.message}` },
        { status: 500 }
      );
    }

    const existingIds = new Set((existingPosts || []).map((p: { id: string }) => p.id));
    const unauthorizedIds = postIds.filter((id: string) => !existingIds.has(id));

    if (unauthorizedIds.length > 0) {
      return NextResponse.json(
        { error: `Posts not found or not owned by you: ${unauthorizedIds.join(', ')}` },
        { status: 403 }
      );
    }

    // Update each post's scheduled_at
    const updates = items.map((item: { id: string; scheduled_at: string }) =>
      supabase
        .from('scheduled_posts')
        .update({
          scheduled_at: item.scheduled_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('user_id', user.id)
    );

    await Promise.all(updates);

    return NextResponse.json({
      message: 'Queue reordered successfully',
      updated: items.length,
    });
  } catch (error) {
    console.error('[Autopilot Queue POST] Error:', error);

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
