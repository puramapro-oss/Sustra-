import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, method, bankIban, paypalEmail } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 10) {
      return NextResponse.json(
        { error: 'Le montant minimum de retrait est de 10\u20ac' },
        { status: 400 }
      );
    }

    // Validate method
    if (!method || !['bank_transfer', 'paypal'].includes(method)) {
      return NextResponse.json(
        { error: 'M\u00e9thode de retrait invalide' },
        { status: 400 }
      );
    }

    // Validate method-specific fields
    if (method === 'bank_transfer' && !bankIban) {
      return NextResponse.json(
        { error: 'IBAN requis pour le virement bancaire' },
        { status: 400 }
      );
    }

    if (method === 'paypal' && !paypalEmail) {
      return NextResponse.json(
        { error: 'Email PayPal requis' },
        { status: 400 }
      );
    }

    // Check wallet balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil introuvable' },
        { status: 404 }
      );
    }

    if ((profile.wallet_balance || 0) < amount) {
      return NextResponse.json(
        { error: 'Solde insuffisant' },
        { status: 400 }
      );
    }

    // Create withdrawal record
    const { error: withdrawError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount,
        method,
        bank_iban: method === 'bank_transfer' ? bankIban : null,
        paypal_email: method === 'paypal' ? paypalEmail : null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (withdrawError) {
      console.error('Create withdrawal error:', withdrawError);
      return NextResponse.json(
        { error: '\u00c9chec de la cr\u00e9ation du retrait' },
        { status: 500 }
      );
    }

    // Deduct from wallet balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: (profile.wallet_balance || 0) - amount,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update wallet error:', updateError);
      // Try to rollback the withdrawal
      await supabase
        .from('withdrawals')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      return NextResponse.json(
        { error: '\u00c9chec de la mise \u00e0 jour du solde' },
        { status: 500 }
      );
    }

    // Record transaction
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount: -amount,
      description: `Retrait ${amount}\u20ac via ${method === 'bank_transfer' ? 'virement bancaire' : 'PayPal'}`,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Demande de retrait cr\u00e9\u00e9e avec succ\u00e8s',
      new_balance: (profile.wallet_balance || 0) - amount,
    });
  } catch (err) {
    console.error('Wallet withdraw error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
