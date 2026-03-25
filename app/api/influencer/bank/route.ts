import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
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
    const { iban, bic, payout_method } = body;

    if (!iban || !bic) {
      return NextResponse.json(
        { error: 'IBAN and BIC are required' },
        { status: 400 }
      );
    }

    // Validate IBAN format (basic check)
    const ibanClean = iban.replace(/\s/g, '').toUpperCase();
    if (ibanClean.length < 15 || ibanClean.length > 34) {
      return NextResponse.json(
        { error: 'Invalid IBAN format' },
        { status: 400 }
      );
    }

    // Validate BIC format (basic check)
    const bicClean = bic.replace(/\s/g, '').toUpperCase();
    if (bicClean.length < 8 || bicClean.length > 11) {
      return NextResponse.json(
        { error: 'Invalid BIC format' },
        { status: 400 }
      );
    }

    const validMethods = ['stripe_connect', 'bank_transfer'];
    const method = validMethods.includes(payout_method) ? payout_method : 'bank_transfer';

    // Upsert bank details
    const { data: existing } = await supabase
      .from('influencer_bank_details')
      .select('id')
      .eq('influencer_id', profile.id)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('influencer_bank_details')
        .update({
          iban: ibanClean,
          bic: bicClean,
          payout_method: method,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      result = { data, error };
    } else {
      const { data, error } = await supabase
        .from('influencer_bank_details')
        .insert({
          influencer_id: profile.id,
          user_id: user.id,
          iban: ibanClean,
          bic: bicClean,
          payout_method: method,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      console.error('Error saving bank details:', result.error);
      return NextResponse.json(
        { error: 'Failed to save bank details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bank_details: result.data,
    });
  } catch (error) {
    console.error('Influencer bank error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
