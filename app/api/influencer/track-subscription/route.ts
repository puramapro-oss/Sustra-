import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      user_id,
      influencer_id,
      subscription_plan,
      subscription_amount,
      stripe_subscription_id,
    } = await request.json();

    if (!user_id || !influencer_id) {
      return NextResponse.json(
        { error: 'user_id and influencer_id are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get the influencer's active contract for commission rate
    const { data: contract, error: contractError } = await supabase
      .from('influencer_contracts')
      .select('id, commission_rate, total_earned')
      .eq('influencer_id', influencer_id)
      .eq('status', 'active')
      .single();

    if (contractError || !contract) {
      console.error('[Track Subscription] No active contract for influencer:', influencer_id);
      return NextResponse.json(
        { error: 'No active contract found' },
        { status: 404 }
      );
    }

    // Record the subscription conversion
    const { error: conversionError } = await supabase
      .from('influencer_conversions')
      .insert({
        influencer_id,
        user_id,
        type: 'subscription',
        subscription_plan: subscription_plan || null,
        subscription_amount: subscription_amount || null,
        stripe_subscription_id: stripe_subscription_id || null,
      });

    if (conversionError) {
      console.error('[Track Subscription] Failed to create conversion:', conversionError.message);
      return NextResponse.json(
        { error: 'Failed to record conversion' },
        { status: 500 }
      );
    }

    // Calculate commission
    const amount = subscription_amount || 0;
    const commissionRate = contract.commission_rate || 0.10;
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;

    // Create the earning record
    if (commissionAmount > 0) {
      const { error: earningError } = await supabase
        .from('influencer_earnings')
        .insert({
          influencer_id,
          contract_id: contract.id,
          amount: commissionAmount,
          source_type: 'subscription',
          source_user_id: user_id,
          stripe_subscription_id: stripe_subscription_id || null,
          status: 'pending',
        });

      if (earningError) {
        console.error('[Track Subscription] Failed to create earning:', earningError.message);
      }

      // Update contract total_earned
      const newTotalEarned = (contract.total_earned || 0) + commissionAmount;
      const { error: updateError } = await supabase
        .from('influencer_contracts')
        .update({ total_earned: newTotalEarned, updated_at: new Date().toISOString() })
        .eq('id', contract.id);

      if (updateError) {
        console.error('[Track Subscription] Failed to update contract total:', updateError.message);
      }
    }

    // Check milestone: every 10 conversions
    const { count: conversionCount } = await supabase
      .from('influencer_conversions')
      .select('id', { count: 'exact', head: true })
      .eq('influencer_id', influencer_id)
      .eq('type', 'subscription');

    if (conversionCount && conversionCount > 0 && conversionCount % 10 === 0) {
      console.log(`[Track Subscription] Milestone reached: ${conversionCount} conversions for influencer ${influencer_id}`);

      try {
        await supabase.from('influencer_milestones').insert({
          influencer_id,
          contract_id: contract.id,
          milestone_type: 'conversions',
          milestone_value: conversionCount,
          reached_at: new Date().toISOString(),
        });
      } catch (milestoneError) {
        console.error('[Track Subscription] Failed to record milestone:', milestoneError);
      }
    }

    console.log(`[Track Subscription] Recorded subscription conversion: user=${user_id}, influencer=${influencer_id}, commission=${commissionAmount}`);

    return NextResponse.json({ success: true, commission: commissionAmount }, { status: 200 });
  } catch (error) {
    console.error('[Track Subscription] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
