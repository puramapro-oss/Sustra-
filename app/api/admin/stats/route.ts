import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'matiss.frasne@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

    // Count total users
    const { count: totalUsers } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Count active subscriptions by plan
    const { data: subscriptions } = await admin
      .from('subscriptions')
      .select('plan, status')
      .eq('status', 'active');

    const planCounts: Record<string, number> = {};
    let activeSubscriptions = 0;
    if (subscriptions) {
      subscriptions.forEach((sub) => {
        activeSubscriptions++;
        planCounts[sub.plan] = (planCounts[sub.plan] || 0) + 1;
      });
    }

    // Count total videos
    const { count: totalVideos } = await admin
      .from('videos')
      .select('*', { count: 'exact', head: true });

    // Sum wallet balances
    const { data: wallets } = await admin
      .from('wallets')
      .select('balance');

    const totalWalletBalance = wallets
      ? wallets.reduce((sum, w) => sum + (w.balance || 0), 0)
      : 0;

    // Sum commissions
    const { data: commissions } = await admin
      .from('commissions')
      .select('amount, status');

    const totalCommissions = commissions
      ? commissions.reduce((sum, c) => sum + (c.amount || 0), 0)
      : 0;
    const pendingCommissions = commissions
      ? commissions
          .filter((c) => c.status === 'pending')
          .reduce((sum, c) => sum + (c.amount || 0), 0)
      : 0;

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentSignups } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Recent activity
    const { data: recentUsers } = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Contest prizes total
    const { data: prizes } = await admin
      .from('contest_prizes')
      .select('amount');

    const totalPrizes = prizes
      ? prizes.reduce((sum, p) => sum + (p.amount || 0), 0)
      : 0;

    // MRR calculation
    const planPrices: Record<string, number> = {
      starter: 29,
      pro: 79,
      legend: 199,
    };
    const mrr = Object.entries(planCounts).reduce(
      (sum, [plan, count]) => sum + (planPrices[plan] || 0) * count,
      0
    );

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeSubscriptions,
      planCounts,
      totalVideos: totalVideos || 0,
      totalWalletBalance,
      totalCommissions,
      pendingCommissions,
      recentSignups: recentSignups || 0,
      recentUsers: recentUsers || [],
      totalPrizes,
      mrr,
      totalRevenue: mrr * 12,
      churnRate: totalUsers && totalUsers > 0
        ? (((totalUsers - activeSubscriptions) / totalUsers) * 100).toFixed(1)
        : '0',
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
