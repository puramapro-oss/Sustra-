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

    // Get current active contract
    const { data: contract } = await supabase
      .from('influencer_contracts')
      .select('*')
      .eq('influencer_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get contract history
    const { data: history } = await supabase
      .from('influencer_contracts')
      .select('id, start_date, end_date, commission_rate, status, created_at')
      .eq('influencer_id', profile.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      current_contract: contract || null,
      history: history || [],
    });
  } catch (error) {
    console.error('Influencer contract error:', error);
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

    // Expire current active contracts
    await supabase
      .from('influencer_contracts')
      .update({ status: 'expired' })
      .eq('influencer_id', profile.id)
      .eq('status', 'active');

    // Create new contract (1 month)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const { data: contract, error: contractError } = await supabase
      .from('influencer_contracts')
      .insert({
        influencer_id: profile.id,
        user_id: user.id,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        commission_rate: 20,
        status: 'active',
        created_at: now.toISOString(),
      })
      .select()
      .single();

    if (contractError) {
      console.error('Error creating contract:', contractError);
      return NextResponse.json(
        { error: 'Failed to renew contract' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      contract,
    });
  } catch (error) {
    console.error('Influencer contract renewal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
