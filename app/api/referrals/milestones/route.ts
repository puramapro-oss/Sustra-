import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

const MILESTONES = [
  { count: 10, bonus: 111 },
  { count: 20, bonus: 222 },
  { count: 30, bonus: 333 },
  { count: 50, bonus: 555 },
  { count: 100, bonus: 2000 },
  { count: 1000, bonus: 11100 },
];

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count active referrals
    const { count: activeCount } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .eq('status', 'active');

    const totalActive = activeCount || 0;

    // Get already claimed milestones
    const { data: claimedMilestones } = await supabase
      .from('referral_milestones')
      .select('milestone_count')
      .eq('user_id', user.id);

    const claimedCounts = new Set(
      claimedMilestones?.map(m => m.milestone_count) || []
    );

    // Check for new milestones to claim
    const newlyClaimed: { count: number; bonus: number }[] = [];

    for (const milestone of MILESTONES) {
      if (totalActive >= milestone.count && !claimedCounts.has(milestone.count)) {
        // Claim this milestone
        const { error: insertError } = await supabase
          .from('referral_milestones')
          .insert({
            user_id: user.id,
            milestone_count: milestone.count,
            bonus_amount: milestone.bonus,
            claimed_at: new Date().toISOString(),
          });

        if (!insertError) {
          // Credit wallet
          await supabase.rpc('credit_wallet', {
            p_user_id: user.id,
            p_amount: milestone.bonus,
          });

          // Record transaction
          await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'milestone_bonus',
              amount: milestone.bonus,
              description: `Prime palier ${milestone.count} filleuls atteint!`,
              created_at: new Date().toISOString(),
            });

          newlyClaimed.push(milestone);
        }
      }
    }

    // Get updated profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance, wallet_total_earned')
      .eq('id', user.id)
      .single();

    // Get all claimed milestones
    const { data: allClaimed } = await supabase
      .from('referral_milestones')
      .select('*')
      .eq('user_id', user.id)
      .order('milestone_count', { ascending: true });

    return NextResponse.json({
      active_referrals: totalActive,
      milestones: MILESTONES,
      claimed: allClaimed || [],
      newly_claimed: newlyClaimed,
      wallet_balance: profile?.wallet_balance || 0,
      wallet_total_earned: profile?.wallet_total_earned || 0,
    });
  } catch (err) {
    console.error('Milestones check error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
