import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface SelectRequestBody {
  thumbnail_id: string;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const body: SelectRequestBody = await request.json();

    if (!body.thumbnail_id) {
      return NextResponse.json({ error: 'thumbnail_id is required' }, { status: 400 });
    }

    // Fetch the thumbnail to select
    const { data: thumbnail, error: thumbError } = await supabase
      .from('thumbnails')
      .select('*')
      .eq('id', body.thumbnail_id)
      .single();

    if (thumbError || !thumbnail) {
      return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 });
    }

    if (thumbnail.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: thumbnail does not belong to you' }, { status: 403 });
    }

    // Deselect all thumbnails for this video
    const { error: deselectError } = await supabase
      .from('thumbnails')
      .update({ is_selected: false })
      .eq('video_id', thumbnail.video_id);

    if (deselectError) {
      console.error('[Thumbnail Select] Deselect error:', deselectError);
      return NextResponse.json({ error: 'Failed to deselect thumbnails' }, { status: 500 });
    }

    // Select the chosen thumbnail
    const { data: updatedThumbnail, error: selectError } = await supabase
      .from('thumbnails')
      .update({ is_selected: true })
      .eq('id', body.thumbnail_id)
      .select()
      .single();

    if (selectError) {
      console.error('[Thumbnail Select] Select error:', selectError);
      return NextResponse.json({ error: 'Failed to select thumbnail' }, { status: 500 });
    }

    // Update the video's thumbnail_url
    const { error: videoUpdateError } = await supabase
      .from('videos')
      .update({ thumbnail_url: thumbnail.image_url, thumbnail_id: thumbnail.id })
      .eq('id', thumbnail.video_id);

    if (videoUpdateError) {
      console.error('[Thumbnail Select] Video update error:', videoUpdateError);
      return NextResponse.json({ error: 'Failed to update video thumbnail' }, { status: 500 });
    }

    return NextResponse.json({ thumbnail: updatedThumbnail });
  } catch (error) {
    console.error('[Thumbnail Select] Error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
