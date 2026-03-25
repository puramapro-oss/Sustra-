import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get influencer profile
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Influencer profile not found' },
        { status: 404 }
      );
    }

    // Get total clicks
    const { count: totalClicks } = await supabase
      .from('influencer_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('influencer_id', profile.id);

    // Get total signups
    const { count: totalSignups } = await supabase
      .from('influencer_conversions')
      .select('*', { count: 'exact', head: true })
      .eq('influencer_id', profile.id)
      .eq('type', 'signup');

    // Get total subscriptions
    const { count: totalSubscriptions } = await supabase
      .from('influencer_conversions')
      .select('*', { count: 'exact', head: true })
      .eq('influencer_id', profile.id)
      .eq('type', 'subscription');

    // Get total earnings
    const { data: earningsData } = await supabase
      .from('influencer_earnings')
      .select('amount, status')
      .eq('influencer_id', profile.id);

    const totalEarnings = earningsData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const pendingEarnings = earningsData
      ?.filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // Get current contract
    const { data: contract } = await supabase
      .from('influencer_contracts')
      .select('*')
      .eq('influencer_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      profile,
      total_clicks: totalClicks || 0,
      total_signups: totalSignups || 0,
      total_subscriptions: totalSubscriptions || 0,
      total_earnings: totalEarnings,
      pending_earnings: pendingEarnings,
      contract,
    });
  } catch (error) {
    console.error('Influencer stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
