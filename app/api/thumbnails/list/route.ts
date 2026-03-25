import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('video_id');

    if (!videoId) {
      return NextResponse.json({ error: 'video_id query parameter is required' }, { status: 400 });
    }

    // Verify the video belongs to the user
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, user_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: video does not belong to you' }, { status: 403 });
    }

    // Fetch all thumbnails for this video
    const { data: thumbnails, error: listError } = await supabase
      .from('thumbnails')
      .select('*')
      .eq('video_id', videoId)
      .order('variant_number', { ascending: true });

    if (listError) {
      console.error('[Thumbnail List] Query error:', listError);
      return NextResponse.json({ error: 'Failed to fetch thumbnails' }, { status: 500 });
    }

    return NextResponse.json({ thumbnails: thumbnails || [] });
  } catch (error) {
    console.error('[Thumbnail List] Error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
