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

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'month query parameter is required in YYYY-MM format' },
        { status: 400 }
      );
    }

    const [year, monthNum] = month.split('-').map(Number);

    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { error: 'Invalid month value. Must be between 01 and 12.' },
        { status: 400 }
      );
    }

    // Calculate start and end of the month
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1)).toISOString();
    const endDate = new Date(Date.UTC(year, monthNum, 1)).toISOString();

    // Fetch scheduled posts for the month with video data
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
      .gte('scheduled_at', startDate)
      .lt('scheduled_at', endDate)
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error('[Autopilot Calendar] Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch calendar data: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Fetch user's optimal posting times
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('optimal_posting_times')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Autopilot Calendar] Profile fetch error:', profileError);
    }

    // Group posts by day
    const calendar: Record<string, typeof posts> = {};
    for (const post of posts || []) {
      const day = post.scheduled_at.split('T')[0];
      if (!calendar[day]) {
        calendar[day] = [];
      }
      calendar[day].push(post);
    }

    return NextResponse.json({
      month,
      calendar,
      total_posts: posts?.length || 0,
      optimal_posting_times: profile?.optimal_posting_times || [],
    });
  } catch (error) {
    console.error('[Autopilot Calendar] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
