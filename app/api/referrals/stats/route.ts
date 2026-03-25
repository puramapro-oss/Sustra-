import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

export async function GET(request: NextRequest) {
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

    // Get user profile with referral info
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, referral_count, wallet_balance, wallet_total_earned')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get referrals list with details
    const { data: referrals } = await supabase
      .from('referrals')
      .select(`
        id,
        referred_user_id,
        status,
        commission_earned,
        created_at,
        referred_profile:profiles!referrals_referred_user_id_fkey(
          full_name,
          plan,
          subscription_status
        )
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    // Count active referrals
    const activeReferrals = referrals?.filter(r => r.status === 'active') || [];

    // Calculate this month's earnings
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: monthTransactions } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'commission')
      .gte('created_at', firstOfMonth);

    const thisMonthEarned = monthTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get claimed milestones
    const { data: milestones } = await supabase
      .from('referral_milestones')
      .select('*')
      .eq('user_id', user.id)
      .order('milestone_count', { ascending: true });

    return NextResponse.json({
      referral_code: profile.referral_code,
      referral_count: profile.referral_count || 0,
      active_referrals: activeReferrals.length,
      total_earned: profile.wallet_total_earned || 0,
      this_month_earned: thisMonthEarned,
      wallet_balance: profile.wallet_balance || 0,
      referrals: referrals?.map(r => ({
        id: r.id,
        name: (r.referred_profile as unknown as Record<string, unknown>)?.full_name || 'Utilisateur',
        plan: (r.referred_profile as unknown as Record<string, unknown>)?.plan || 'free',
        subscription_status: (r.referred_profile as unknown as Record<string, unknown>)?.subscription_status,
        status: r.status,
        commission_earned: r.commission_earned || 0,
        created_at: r.created_at,
      })) || [],
      transactions: transactions || [],
      milestones: milestones || [],
    });
  } catch (err) {
    console.error('Referral stats error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
