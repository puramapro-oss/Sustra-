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

function getPreviousContestMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

async function triggerEvaluation(): Promise<{ evaluated: number; errors?: string[] }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/contests/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  return response.json();
}

async function determineWinners(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const contestMonth = getPreviousContestMonth();

  // Get all evaluated submissions for the previous month
  const { data: submissions, error } = await supabase
    .from('contest_submissions')
    .select('*')
    .eq('contest_month', contestMonth)
    .eq('status', 'evaluated')
    .order('score_total', { ascending: false });

  if (error || !submissions || submissions.length === 0) {
    return { winners: [], contestMonth, error: error?.message || 'No evaluated submissions' };
  }

  // Separate by category
  const youtubeSubmissions = submissions.filter(s => s.category === 'youtube');
  const verticalSubmissions = submissions.filter(s => s.category === 'vertical');

  const winners: Array<{
    userId: string;
    submissionId: string;
    category: string;
    score: number;
    prizeAmount: number;
  }> = [];

  // Calculate prize pool: 1% of monthly revenue
  // Get estimated revenue from analytics or use a default
  const { data: revenueData } = await supabase
    .from('transactions')
    .select('amount')
    .gte('created_at', `${contestMonth}-01`)
    .lt('created_at', new Date(
      parseInt(contestMonth.split('-')[0]),
      parseInt(contestMonth.split('-')[1]),
      1
    ).toISOString());

  const monthlyRevenue = revenueData
    ? revenueData.reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount || 0), 0)
    : 0;

  // 1% of monthly revenue, minimum 50 EUR equivalent (5000 cents)
  const prizePool = Math.max(Math.round(monthlyRevenue * 0.01), 5000);
  const prizePerCategory = Math.round(prizePool / 2);

  // YouTube winner
  if (youtubeSubmissions.length > 0) {
    const winner = youtubeSubmissions[0];
    winners.push({
      userId: winner.user_id,
      submissionId: winner.id,
      category: 'youtube',
      score: winner.score_total,
      prizeAmount: prizePerCategory,
    });

    // Mark as winner
    await supabase
      .from('contest_submissions')
      .update({
        status: 'winner',
        prize_amount: prizePerCategory,
      })
      .eq('id', winner.id);
  }

  // Vertical winner
  if (verticalSubmissions.length > 0) {
    const winner = verticalSubmissions[0];
    winners.push({
      userId: winner.user_id,
      submissionId: winner.id,
      category: 'vertical',
      score: winner.score_total,
      prizeAmount: prizePerCategory,
    });

    // Mark as winner
    await supabase
      .from('contest_submissions')
      .update({
        status: 'winner',
        prize_amount: prizePerCategory,
      })
      .eq('id', winner.id);
  }

  // Create contest_results record
  const { error: resultError } = await supabase
    .from('contest_results')
    .upsert({
      contest_month: contestMonth,
      total_participants: submissions.length,
      prize_amount: prizePool,
      youtube_winner_id: winners.find(w => w.category === 'youtube')?.submissionId || null,
      vertical_winner_id: winners.find(w => w.category === 'vertical')?.submissionId || null,
      youtube_winner_score: winners.find(w => w.category === 'youtube')?.score || null,
      vertical_winner_score: winners.find(w => w.category === 'vertical')?.score || null,
      finalized_at: new Date().toISOString(),
    }, {
      onConflict: 'contest_month',
    });

  if (resultError) {
    console.error('Contest result insert error:', resultError);
  }

  // Credit winner wallets
  for (const winner of winners) {
    // Add prize to wallet
    await supabase.rpc('credit_wallet', {
      p_user_id: winner.userId,
      p_amount: winner.prizeAmount,
      p_description: `SUTRA Awards - ${contestMonth} - Categorie ${winner.category}`,
      p_type: 'contest_prize',
    }).then(({ error: walletError }) => {
      if (walletError) {
        console.error(`Wallet credit error for user ${winner.userId}:`, walletError);
        // Fallback: insert wallet transaction manually
        supabase.from('wallet_transactions').insert({
          user_id: winner.userId,
          amount: winner.prizeAmount,
          type: 'contest_prize',
          description: `SUTRA Awards Winner - ${contestMonth} - ${winner.category}`,
          status: 'completed',
        });
      }
    });

    // Create notification for winner
    await supabase.from('notifications').insert({
      user_id: winner.userId,
      type: 'contest_winner',
      title: 'Felicitations! Vous avez gagne les SUTRA Awards!',
      message: `Vous avez remporte la categorie ${winner.category} des SUTRA Awards de ${contestMonth} avec un score de ${winner.score}/100! Votre prix de ${(winner.prizeAmount / 100).toFixed(2)} EUR a ete credite sur votre portefeuille.`,
      read: false,
    }).then(({ error: notifError }) => {
      if (notifError) {
        console.error(`Notification error for user ${winner.userId}:`, notifError);
      }
    });
  }

  return { winners, contestMonth, prizePool };
}

export async function GET(request: NextRequest) {
  try {
    // Verify Vercel Cron authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const isCronAuth = authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !isCronAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const dayOfMonth = now.getDate();

    const results: {
      action: string;
      evaluation?: { evaluated: number; errors?: string[] };
      winners?: { winners: Array<unknown>; contestMonth: string; prizePool?: number };
    } = { action: 'none' };

    // On the 26th: trigger evaluation of all pending submissions
    if (dayOfMonth === 26) {
      results.action = 'evaluate';
      results.evaluation = await triggerEvaluation();
    }

    // On the 1st: determine winners, create results, notify
    if (dayOfMonth === 1) {
      results.action = 'finalize';
      results.winners = await determineWinners(supabase);
    }

    // Allow manual trigger via query parameter
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force');

    if (force === 'evaluate') {
      results.action = 'force_evaluate';
      results.evaluation = await triggerEvaluation();
    }

    if (force === 'finalize') {
      results.action = 'force_finalize';
      results.winners = await determineWinners(supabase);
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      dayOfMonth,
      ...results,
    });
  } catch (error) {
    console.error('Contest cron error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
