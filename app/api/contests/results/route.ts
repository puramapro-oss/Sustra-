import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

function getPreviousMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || getPreviousMonth();
    const includeCurrentUser = searchParams.get('current_user') === 'true';

    // Validate month format
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json(
        { error: 'Format de mois invalide. Utilisez YYYY-MM.' },
        { status: 400 }
      );
    }

    // Get user if auth provided (for showing their submissions)
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Get all evaluated submissions for the month, ordered by score
    const { data: allSubmissions, error: submissionsError } = await supabase
      .from('contest_submissions')
      .select('*')
      .eq('contest_month', month)
      .in('status', ['evaluated', 'winner'])
      .order('score_total', { ascending: false });

    if (submissionsError) {
      console.error('Fetch submissions error:', submissionsError);
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
    }

    // Separate by category
    const youtubeSubmissions = (allSubmissions || []).filter(s => s.category === 'youtube');
    const verticalSubmissions = (allSubmissions || []).filter(s => s.category === 'vertical');

    // Get winners (top scorer per category)
    const youtubeWinner = youtubeSubmissions.length > 0 ? youtubeSubmissions[0] : null;
    const verticalWinner = verticalSubmissions.length > 0 ? verticalSubmissions[0] : null;

    // Get contest results record if exists
    const { data: contestResult } = await supabase
      .from('contest_results')
      .select('*')
      .eq('contest_month', month)
      .maybeSingle();

    // Get participant count for the month (all statuses)
    const { count: participantCount } = await supabase
      .from('contest_submissions')
      .select('user_id', { count: 'exact', head: true })
      .eq('contest_month', month);

    // Get user's own submissions if authenticated
    let userSubmissions = null;
    if (userId && includeCurrentUser) {
      const { data: mySubmissions } = await supabase
        .from('contest_submissions')
        .select('*')
        .eq('user_id', userId)
        .eq('contest_month', month)
        .order('created_at', { ascending: false });

      userSubmissions = mySubmissions;
    }

    // Get hall of fame - all past winners
    const { data: pastWinners } = await supabase
      .from('contest_submissions')
      .select('*')
      .eq('status', 'winner')
      .order('contest_month', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      month,
      participantCount: participantCount || 0,
      prizePool: contestResult?.prize_amount || null,
      winners: {
        youtube: youtubeWinner,
        vertical: verticalWinner,
      },
      leaderboard: {
        youtube: youtubeSubmissions.slice(0, 10),
        vertical: verticalSubmissions.slice(0, 10),
      },
      userSubmissions,
      pastWinners: pastWinners || [],
      contestResult,
    });
  } catch (error) {
    console.error('Contest results error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
