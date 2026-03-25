import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

function getCurrentContestMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getDeadline(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 25, 23, 59, 59, 999);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { videoId, category } = body as { videoId: string; category: string };

    // Validate category
    if (!['youtube', 'vertical'].includes(category)) {
      return NextResponse.json(
        { error: 'Categorie invalide. Choisissez "youtube" ou "vertical".' },
        { status: 400 }
      );
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Veuillez selectionner une video.' },
        { status: 400 }
      );
    }

    // Check deadline
    const now = new Date();
    const deadline = getDeadline();
    if (now > deadline) {
      return NextResponse.json(
        { error: 'La date limite de soumission (25 du mois, 23h59) est depassee.' },
        { status: 400 }
      );
    }

    // Verify video belongs to user and is completed
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, user_id, title, format, status, duration_seconds, thumbnail_url, video_url, script')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video introuvable.' },
        { status: 404 }
      );
    }

    if (video.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Cette video ne vous appartient pas.' },
        { status: 403 }
      );
    }

    if (video.status !== 'completed' && video.status !== 'published') {
      return NextResponse.json(
        { error: 'Seules les videos terminees ou publiees peuvent etre soumises.' },
        { status: 400 }
      );
    }

    // Validate category vs format
    if (category === 'youtube' && video.format === 'short') {
      return NextResponse.json(
        { error: 'Les videos courtes ne peuvent pas etre soumises en categorie YouTube.' },
        { status: 400 }
      );
    }

    if (category === 'vertical' && video.format === 'long') {
      return NextResponse.json(
        { error: 'Les videos longues ne peuvent pas etre soumises en categorie Verticale.' },
        { status: 400 }
      );
    }

    // Check max 1 submission per category per month
    const contestMonth = getCurrentContestMonth();

    const { data: existing } = await supabase
      .from('contest_submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('contest_month', contestMonth)
      .eq('category', category)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Vous avez deja soumis une video en categorie "${category}" ce mois-ci. Maximum 1 par categorie par mois.` },
        { status: 409 }
      );
    }

    // Get user profile for display
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Create submission
    const { data: submission, error: insertError } = await supabase
      .from('contest_submissions')
      .insert({
        user_id: user.id,
        video_id: videoId,
        category,
        contest_month: contestMonth,
        status: 'pending',
        video_title: video.title,
        video_thumbnail: video.thumbnail_url,
        creator_name: profile?.full_name || 'Anonyme',
        creator_avatar: profile?.avatar_url,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Vous avez deja soumis une video dans cette categorie ce mois-ci.' },
          { status: 409 }
        );
      }
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de la soumission.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submission,
      message: 'Video soumise avec succes aux SUTRA Awards!',
    });
  } catch (error) {
    console.error('Contest submit error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
