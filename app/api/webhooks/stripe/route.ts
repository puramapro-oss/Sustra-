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

function getSupabaseAdmin(): SupabaseAdmin {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
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

  // Find user by metadata or by subscription ID
  let userId = subscription.metadata?.userId;

  if (!userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!profile) {
      // Try by customer ID
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

      if (customerId) {
        const { data: profileByCustomer } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        userId = profileByCustomer?.id;
      }
    } else {
      userId = profile.id;
    }
  }

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
  let userId = subscription.metadata?.userId;

  if (!userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    userId = profile?.id;
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
