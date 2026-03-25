import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, referralCode } = body;

    if (!userId || !referralCode) {
      return NextResponse.json(
        { error: 'userId and referralCode are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Find referrer by code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id, full_name, referral_code, stripe_customer_id')
      .eq('referral_code', referralCode.toUpperCase().trim())
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      );
    }

    // Prevent self-referral
    if (referrer.id === userId) {
      return NextResponse.json(
        { error: 'You cannot use your own referral code' },
        { status: 400 }
      );
    }

    // Check if user already has a referrer
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', userId)
      .single();

    if (existingReferral) {
      return NextResponse.json(
        { error: 'You have already used a referral code' },
        { status: 409 }
      );
    }

    // Create referral entry
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_user_id: userId,
        referral_code: referralCode.toUpperCase().trim(),
        status: 'active',
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Insert referral error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      );
    }

    // Get the referred user's Stripe customer ID
    const { data: referredUser } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (referredUser?.stripe_customer_id) {
      try {
        // Create a 50% off coupon (once)
        const coupon = await stripe.coupons.create({
          percent_off: 50,
          duration: 'once',
          name: `Parrainage SUTRA - ${referralCode}`,
          metadata: {
            referrer_id: referrer.id,
            referred_user_id: userId,
            referral_code: referralCode,
          },
        });

        // Store coupon ID for use during checkout
        await supabase
          .from('profiles')
          .update({ referral_coupon_id: coupon.id })
          .eq('id', userId);
      } catch (stripeErr) {
        console.error('Stripe coupon error:', stripeErr);
        // Don't fail the whole request if coupon fails
      }
    }

    // Update referrer's referral count
    await supabase.rpc('increment_referral_count', {
      user_id: referrer.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Referral applied successfully. 50% discount on your first month!',
      referrerName: referrer.full_name || 'Un membre SUTRA',
    });
  } catch (err) {
    console.error('Apply referral discount error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
