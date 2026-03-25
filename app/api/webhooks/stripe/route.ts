import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { PlanType } from '@/lib/types';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
    typescript: true,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = ReturnType<typeof createClient<any>>;

let _supabase: SupabaseAdmin | null = null;
function getSupabaseAdmin(): SupabaseAdmin {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase configuration missing');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

function priceIdToPlan(priceId: string): PlanType {
  const mapping: Record<string, PlanType> = {};
  if (process.env.STRIPE_STARTER_PRICE_ID) {
    mapping[process.env.STRIPE_STARTER_PRICE_ID] = 'starter';
  }
  if (process.env.STRIPE_CREATOR_PRICE_ID) {
    mapping[process.env.STRIPE_CREATOR_PRICE_ID] = 'creator';
  }
  if (process.env.STRIPE_EMPIRE_PRICE_ID) {
    mapping[process.env.STRIPE_EMPIRE_PRICE_ID] = 'empire';
  }
  // Also check NEXT_PUBLIC variants
  if (process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
    mapping[process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID] = 'starter';
  }
  if (process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID) {
    mapping[process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID] = 'creator';
  }
  if (process.env.NEXT_PUBLIC_STRIPE_EMPIRE_PRICE_ID) {
    mapping[process.env.NEXT_PUBLIC_STRIPE_EMPIRE_PRICE_ID] = 'empire';
  }
  return mapping[priceId] ?? 'free';
}

function priceIdToAmount(priceId: string): number {
  const mapping: Record<string, number> = {};
  // Standard pricing (in EUR cents -> EUR)
  if (process.env.STRIPE_STARTER_PRICE_ID) mapping[process.env.STRIPE_STARTER_PRICE_ID] = 29;
  if (process.env.STRIPE_CREATOR_PRICE_ID) mapping[process.env.STRIPE_CREATOR_PRICE_ID] = 79;
  if (process.env.STRIPE_EMPIRE_PRICE_ID) mapping[process.env.STRIPE_EMPIRE_PRICE_ID] = 199;
  if (process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) mapping[process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID] = 29;
  if (process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID) mapping[process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID] = 79;
  if (process.env.NEXT_PUBLIC_STRIPE_EMPIRE_PRICE_ID) mapping[process.env.NEXT_PUBLIC_STRIPE_EMPIRE_PRICE_ID] = 199;
  return mapping[priceId] ?? 0;
}

// ---------------------------------------------------------------------------
// Helper: find user by subscription or customer
// ---------------------------------------------------------------------------
async function findUserBySubscription(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
): Promise<string | undefined> {
  let userId = subscription.metadata?.userId;

  if (!userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (profile) {
      userId = profile.id;
    }
  }

  if (!userId) {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    if (customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      userId = profile?.id;
    }
  }

  return userId;
}

// ---------------------------------------------------------------------------
// Referral: credit wallet helper
// ---------------------------------------------------------------------------
async function creditWallet(
  supabase: SupabaseAdmin,
  userId: string,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Insert wallet transaction
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      type: 'commission',
      amount,
      description,
      metadata: metadata || null,
    });

    // Update wallet balance on profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance, wallet_total_earned')
      .eq('id', userId)
      .single();

    const currentBalance = profile?.wallet_balance || 0;
    const currentTotal = profile?.wallet_total_earned || 0;

    await supabase
      .from('profiles')
      .update({
        wallet_balance: currentBalance + amount,
        wallet_total_earned: currentTotal + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    console.log(`[Stripe Webhook] Credited ${amount} to wallet of user ${userId}: ${description}`);
  } catch (err) {
    console.error('[Stripe Webhook] Failed to credit wallet:', err);
  }
}

// ---------------------------------------------------------------------------
// Referral: check milestones (every 10 referrals -> 30% bonus)
// ---------------------------------------------------------------------------
async function checkReferralMilestones(
  supabase: SupabaseAdmin,
  referrerId: string
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_count, wallet_balance')
      .eq('id', referrerId)
      .single();

    const referralCount = profile?.referral_count || 0;

    // Milestone every 10 referrals
    if (referralCount > 0 && referralCount % 10 === 0) {
      // Check if this milestone was already claimed
      const { data: existingMilestone } = await supabase
        .from('referral_milestones')
        .select('id')
        .eq('user_id', referrerId)
        .eq('milestone_count', referralCount)
        .single();

      if (!existingMilestone) {
        // 30% bonus on last commission base (use average plan price as base)
        const bonusAmount = Math.round(79 * 0.30 * 100) / 100; // 30% of Creator price as bonus

        await supabase.from('referral_milestones').insert({
          user_id: referrerId,
          milestone_count: referralCount,
          bonus_amount: bonusAmount,
          claimed: true,
          claimed_at: new Date().toISOString(),
        });

        await creditWallet(
          supabase,
          referrerId,
          bonusAmount,
          `Bonus palier ${referralCount} parrainages (30%)`,
          { milestone: referralCount, type: 'milestone_bonus' }
        );

        console.log(`[Stripe Webhook] Referral milestone ${referralCount} reached for ${referrerId}, bonus: ${bonusAmount}`);
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Milestone check error:', err);
  }
}

// ---------------------------------------------------------------------------
// Referral: ensure referrer gets 10% discount (non-cumulative)
// ---------------------------------------------------------------------------
async function ensureReferrerDiscount(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  referrerId: string
): Promise<void> {
  try {
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, referral_coupon_id')
      .eq('id', referrerId)
      .single();

    if (!referrerProfile?.stripe_customer_id) return;

    // Already has a referral coupon applied
    if (referrerProfile.referral_coupon_id) return;

    // Create a 10% coupon for the referrer if not already created
    let couponId = process.env.STRIPE_REFERRAL_COUPON_ID;

    if (!couponId) {
      try {
        const coupon = await stripe.coupons.create({
          percent_off: 10,
          duration: 'forever',
          name: 'SUTRA Referral Discount - 10%',
          metadata: { type: 'referral_discount' },
        });
        couponId = coupon.id;
      } catch (couponErr) {
        console.error('[Stripe Webhook] Failed to create referral coupon:', couponErr);
        return;
      }
    }

    // Apply the coupon to the referrer's subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', referrerId)
      .single();

    if (profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          discounts: [{ coupon: couponId }],
        });

        await supabase
          .from('profiles')
          .update({
            referral_coupon_id: couponId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', referrerId);

        console.log(`[Stripe Webhook] Applied 10% referral discount to referrer ${referrerId}`);
      } catch (discountErr) {
        console.error('[Stripe Webhook] Failed to apply referral discount:', discountErr);
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] ensureReferrerDiscount error:', err);
  }
}

// ---------------------------------------------------------------------------
// Influencer: handle subscription conversion from checkout
// ---------------------------------------------------------------------------
async function handleInfluencerConversion(
  supabase: SupabaseAdmin,
  userId: string,
  influencerId: string,
  plan: string,
  amount: number,
  stripeSubscriptionId: string
): Promise<void> {
  try {
    // Get the influencer's active contract for commission rate
    const { data: contract } = await supabase
      .from('influencer_contracts')
      .select('id, commission_rate, total_earned')
      .eq('influencer_id', influencerId)
      .eq('status', 'active')
      .single();

    if (!contract) {
      console.log(`[Stripe Webhook] No active contract for influencer ${influencerId}, skipping commission`);
      return;
    }

    // Record the subscription conversion
    await supabase.from('influencer_conversions').insert({
      influencer_id: influencerId,
      user_id: userId,
      type: 'subscription',
      subscription_plan: plan,
      subscription_amount: amount,
      stripe_subscription_id: stripeSubscriptionId,
    });

    // Calculate and create earning
    const commissionRate = contract.commission_rate || 0.10;
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;

    if (commissionAmount > 0) {
      await supabase.from('influencer_earnings').insert({
        influencer_id: influencerId,
        contract_id: contract.id,
        amount: commissionAmount,
        source_type: 'subscription',
        source_user_id: userId,
        stripe_subscription_id: stripeSubscriptionId,
        status: 'pending',
      });

      // Update contract total_earned
      const newTotalEarned = (contract.total_earned || 0) + commissionAmount;
      await supabase
        .from('influencer_contracts')
        .update({ total_earned: newTotalEarned, updated_at: new Date().toISOString() })
        .eq('id', contract.id);
    }

    // Check milestone: every 10 conversions
    const { count: conversionCount } = await supabase
      .from('influencer_conversions')
      .select('id', { count: 'exact', head: true })
      .eq('influencer_id', influencerId)
      .eq('type', 'subscription');

    if (conversionCount && conversionCount > 0 && conversionCount % 10 === 0) {
      console.log(`[Stripe Webhook] Influencer milestone: ${conversionCount} conversions for ${influencerId}`);
      await supabase.from('influencer_milestones').insert({
        influencer_id: influencerId,
        contract_id: contract.id,
        milestone_type: 'conversions',
        milestone_value: conversionCount,
        reached_at: new Date().toISOString(),
      });
    }

    console.log(`[Stripe Webhook] Influencer conversion recorded: user=${userId}, influencer=${influencerId}, commission=${commissionAmount}`);
  } catch (err) {
    console.error('[Stripe Webhook] Influencer conversion error:', err);
  }
}

// ---------------------------------------------------------------------------
// Referral: handle first payment (50% to referrer) + discount
// ---------------------------------------------------------------------------
async function handleReferralFirstPayment(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  userId: string,
  amount: number,
  plan: string
): Promise<void> {
  try {
    // Find referral relationship
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, referrer_id, status, commission_earned')
      .eq('referred_user_id', userId)
      .single();

    if (!referral) return;

    const referrerId = referral.referrer_id;

    // 50% commission on first payment
    const commission = Math.round(amount * 0.50 * 100) / 100;

    if (commission > 0) {
      await creditWallet(
        supabase,
        referrerId,
        commission,
        `Commission 50% - premier abonnement ${plan} de filleul`,
        { referred_user_id: userId, plan, type: 'first_payment', referral_id: referral.id }
      );

      // Update referral record
      await supabase
        .from('referrals')
        .update({
          status: 'active',
          commission_earned: (referral.commission_earned || 0) + commission,
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      // Increment referral count on referrer profile
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('referral_count')
        .eq('id', referrerId)
        .single();

      await supabase
        .from('profiles')
        .update({
          referral_count: (referrerProfile?.referral_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', referrerId);
    }

    // Ensure 10% discount for referrer (non-cumulative)
    await ensureReferrerDiscount(supabase, stripe, referrerId);

    // Check referral milestones (every 10)
    await checkReferralMilestones(supabase, referrerId);

    console.log(`[Stripe Webhook] Referral first payment: referrer=${referrerId}, commission=${commission}`);
  } catch (err) {
    console.error('[Stripe Webhook] Referral first payment error:', err);
  }
}

// ---------------------------------------------------------------------------
// Referral: handle recurring payment (10% monthly to referrer)
// ---------------------------------------------------------------------------
async function handleReferralRecurringPayment(
  supabase: SupabaseAdmin,
  userId: string,
  amount: number,
  plan: string,
  invoiceId: string
): Promise<void> {
  try {
    // Find referral relationship
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, referrer_id, commission_earned')
      .eq('referred_user_id', userId)
      .eq('status', 'active')
      .single();

    if (!referral) return;

    const referrerId = referral.referrer_id;

    // 10% recurring commission
    const commission = Math.round(amount * 0.10 * 100) / 100;

    if (commission > 0) {
      await creditWallet(
        supabase,
        referrerId,
        commission,
        `Commission 10% récurrente - abonnement ${plan} de filleul`,
        { referred_user_id: userId, plan, type: 'recurring_payment', invoice_id: invoiceId, referral_id: referral.id }
      );

      // Update referral total commission
      await supabase
        .from('referrals')
        .update({
          commission_earned: (referral.commission_earned || 0) + commission,
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);
    }

    console.log(`[Stripe Webhook] Referral recurring: referrer=${referrerId}, commission=${commission}`);
  } catch (err) {
    console.error('[Stripe Webhook] Referral recurring payment error:', err);
  }
}

// ---------------------------------------------------------------------------
// Influencer: handle recurring commission
// ---------------------------------------------------------------------------
async function handleInfluencerRecurringPayment(
  supabase: SupabaseAdmin,
  userId: string,
  amount: number,
  stripeSubscriptionId: string
): Promise<void> {
  try {
    // Check if this user was converted via an influencer
    const { data: conversion } = await supabase
      .from('influencer_conversions')
      .select('influencer_id')
      .eq('user_id', userId)
      .eq('type', 'subscription')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!conversion) return;

    const influencerId = conversion.influencer_id;

    // Get active contract
    const { data: contract } = await supabase
      .from('influencer_contracts')
      .select('id, commission_rate, total_earned')
      .eq('influencer_id', influencerId)
      .eq('status', 'active')
      .single();

    if (!contract) return;

    const commissionRate = contract.commission_rate || 0.10;
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;

    if (commissionAmount > 0) {
      await supabase.from('influencer_earnings').insert({
        influencer_id: influencerId,
        contract_id: contract.id,
        amount: commissionAmount,
        source_type: 'recurring',
        source_user_id: userId,
        stripe_subscription_id: stripeSubscriptionId,
        status: 'pending',
      });

      const newTotalEarned = (contract.total_earned || 0) + commissionAmount;
      await supabase
        .from('influencer_contracts')
        .update({ total_earned: newTotalEarned, updated_at: new Date().toISOString() })
        .eq('id', contract.id);

      console.log(`[Stripe Webhook] Influencer recurring commission: influencer=${influencerId}, amount=${commissionAmount}`);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Influencer recurring error:', err);
  }
}

// ===========================================================================
// Event Handlers
// ===========================================================================

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: SupabaseAdmin
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('[Stripe Webhook] No userId in checkout session metadata');
    return;
  }

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null;

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!subscriptionId) {
    console.error('[Stripe Webhook] No subscription ID in checkout session');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? priceIdToPlan(priceId) : 'starter';

  const { error } = await supabase
    .from('profiles')
    .update({
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      credits_used_photos: 0,
      credits_used_shorts: 0,
      credits_used_longs: 0,
      credits_reset_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[Stripe Webhook] Failed to update profile:', error.message);
  } else {
    console.log(`[Stripe Webhook] User ${userId} upgraded to ${plan}`);
  }

  // --- Influencer tracking ---
  const influencerRef = session.metadata?.influencer_ref;
  if (influencerRef) {
    const amount = priceId ? priceIdToAmount(priceId) : 0;
    await handleInfluencerConversion(supabase, userId, influencerRef, plan, amount, subscriptionId);
  }

  // --- Referral: first payment commission (50%) ---
  const referralCode = session.metadata?.referral_code;
  if (referralCode) {
    const amount = priceId ? priceIdToAmount(priceId) : 0;
    await handleReferralFirstPayment(supabase, stripe, userId, amount, plan);
  }
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabase: SupabaseAdmin
): Promise<void> {
  // Skip the first invoice (handled by checkout.session.completed)
  if (invoice.billing_reason === 'subscription_create') {
    console.log('[Stripe Webhook] Skipping first invoice (handled by checkout)');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceAny = invoice as any;
  const subscriptionId: string | null =
    typeof invoiceAny.subscription === 'string'
      ? invoiceAny.subscription
      : invoiceAny.subscription?.id ?? null;

  if (!subscriptionId) return;

  // Find the user
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id ?? null;

  let userId: string | undefined;

  if (customerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    userId = profile?.id;
  }

  if (!userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    userId = profile?.id;
  }

  if (!userId) {
    console.error('[Stripe Webhook] Cannot find user for invoice:', invoice.id);
    return;
  }

  // Get plan info from the invoice line items
  const lineItem = invoice.lines?.data?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceId = (lineItem as any)?.price?.id as string | undefined;
  const plan = priceId ? priceIdToPlan(priceId) : 'starter';
  // Use actual amount paid (convert from cents)
  const amountPaid = (invoice.amount_paid || 0) / 100;

  // --- Referral recurring commissions (10% monthly) ---
  try {
    await handleReferralRecurringPayment(supabase, userId, amountPaid, plan, invoice.id);
  } catch (err) {
    console.error('[Stripe Webhook] Referral recurring handling error:', err);
  }

  // --- Influencer recurring commissions ---
  try {
    await handleInfluencerRecurringPayment(supabase, userId, amountPaid, subscriptionId);
  } catch (err) {
    console.error('[Stripe Webhook] Influencer recurring handling error:', err);
  }

  // --- Referral milestones check ---
  try {
    const { data: referral } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('referred_user_id', userId)
      .eq('status', 'active')
      .single();

    if (referral) {
      await checkReferralMilestones(supabase, referral.referrer_id);
      await ensureReferrerDiscount(supabase, stripe, referral.referrer_id);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Invoice milestones/discount check error:', err);
  }

  console.log(`[Stripe Webhook] Invoice paid processed for user ${userId}, plan=${plan}, amount=${amountPaid}`);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? priceIdToPlan(priceId) : 'free';

  const subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' =
    subscription.cancel_at_period_end
      ? 'canceled'
      : subscription.status === 'past_due'
        ? 'past_due'
        : subscription.status === 'trialing'
          ? 'trialing'
          : 'active';

  const userId = await findUserBySubscription(subscription, supabase);

  if (!userId) {
    console.error('[Stripe Webhook] Cannot find user for subscription:', subscription.id);
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      plan,
      subscription_status: subscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[Stripe Webhook] Failed to update subscription:', error.message);
  } else {
    console.log(`[Stripe Webhook] Subscription updated for ${userId}: plan=${plan}, status=${subscriptionStatus}`);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseAdmin
): Promise<void> {
  const userId = await findUserBySubscription(subscription, supabase);

  if (!userId) {
    console.error('[Stripe Webhook] Cannot find user for deleted subscription:', subscription.id);
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      plan: 'free' as PlanType,
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      credits_used_photos: 0,
      credits_used_shorts: 0,
      credits_used_longs: 0,
      credits_reset_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[Stripe Webhook] Failed to downgrade user:', error.message);
  } else {
    console.log(`[Stripe Webhook] User ${userId} downgraded to free (subscription deleted)`);
  }
}

// ===========================================================================
// Main POST handler
// ===========================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const rawBody = await request.text();

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (verifyError) {
      console.error('[Stripe Webhook] Signature verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, stripe, supabase);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, stripe, supabase);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
