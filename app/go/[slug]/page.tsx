import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export default async function GoRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = getSupabaseAdmin();

  // Look up the influencer profile by slug
  const { data: influencer, error } = await supabase
    .from('influencer_profiles')
    .select('id, user_id, slug, status')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !influencer) {
    redirect('/');
  }

  // Gather request info for click tracking
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  const rawIp = forwardedFor?.split(',')[0]?.trim() || headerStore.get('x-real-ip') || 'unknown';
  const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');
  const userAgent = headerStore.get('user-agent') || 'unknown';
  const country = headerStore.get('x-vercel-ip-country') || headerStore.get('cf-ipcountry') || null;

  // Record the click
  try {
    await supabase.from('influencer_clicks').insert({
      influencer_id: influencer.id,
      ip_hash: ipHash,
      user_agent: userAgent,
      country,
    });
  } catch (clickError) {
    console.error('[Go Redirect] Failed to record click:', clickError);
  }

  // Set the influencer ref cookie (30 days)
  const cookieStore = await cookies();
  cookieStore.set('influencer_ref', influencer.id, {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  redirect(`/signup?ref_influencer=${influencer.id}`);
}
