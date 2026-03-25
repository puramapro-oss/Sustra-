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
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Influencer profile not found' },
        { status: 404 }
      );
    }

    // Get all earnings
    const { data: earnings, error: earningsError } = await supabase
      .from('influencer_earnings')
      .select('id, amount, status, type, created_at, paid_at')
      .eq('influencer_id', profile.id)
      .order('created_at', { ascending: false });

    if (earningsError) {
      console.error('Error fetching earnings:', earningsError);
      return NextResponse.json(
        { error: 'Failed to fetch earnings' },
        { status: 500 }
      );
    }

    // Get withdrawals history
    const { data: withdrawals } = await supabase
      .from('influencer_withdrawals')
      .select('id, amount, status, method, created_at, processed_at')
      .eq('influencer_id', profile.id)
      .order('created_at', { ascending: false });

    // Compute balance
    const totalEarned = earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const totalWithdrawn = withdrawals
      ?.filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
    const pendingWithdrawals = withdrawals
      ?.filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
    const availableBalance = totalEarned - totalWithdrawn - pendingWithdrawals;

    return NextResponse.json({
      earnings: earnings || [],
      withdrawals: withdrawals || [],
      total_earned: totalEarned,
      total_withdrawn: totalWithdrawn,
      pending_withdrawals: pendingWithdrawals,
      available_balance: Math.max(0, availableBalance),
    });
  } catch (error) {
    console.error('Influencer earnings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Influencer profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== 'number' || amount < 5) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is 5€' },
        { status: 400 }
      );
    }

    // Check bank details exist
    const { data: bankDetails } = await supabase
      .from('influencer_bank_details')
      .select('id, payout_method')
      .eq('influencer_id', profile.id)
      .single();

    if (!bankDetails) {
      return NextResponse.json(
        { error: 'Please save your bank details before requesting a withdrawal' },
        { status: 400 }
      );
    }

    // Compute available balance
    const { data: earnings } = await supabase
      .from('influencer_earnings')
      .select('amount')
      .eq('influencer_id', profile.id);

    const { data: withdrawals } = await supabase
      .from('influencer_withdrawals')
      .select('amount, status')
      .eq('influencer_id', profile.id)
      .in('status', ['pending', 'completed']);

    const totalEarned = earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const totalWithdrawnOrPending = withdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
    const availableBalance = totalEarned - totalWithdrawnOrPending;

    if (amount > availableBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${availableBalance.toFixed(2)}€` },
        { status: 400 }
      );
    }

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('influencer_withdrawals')
      .insert({
        influencer_id: profile.id,
        user_id: user.id,
        amount,
        status: 'pending',
        method: bankDetails.payout_method || 'bank_transfer',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal:', withdrawalError);
      return NextResponse.json(
        { error: 'Failed to create withdrawal request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal,
    });
  } catch (error) {
    console.error('Influencer withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
