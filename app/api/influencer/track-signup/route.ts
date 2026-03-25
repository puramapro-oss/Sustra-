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
    const { user_id, influencer_id } = await request.json();

    if (!user_id || !influencer_id) {
      return NextResponse.json(
        { error: 'user_id and influencer_id are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify the influencer exists and is active
    const { data: influencer, error: influencerError } = await supabase
      .from('influencer_profiles')
      .select('id, user_id')
      .eq('id', influencer_id)
      .eq('status', 'active')
      .single();

    if (influencerError || !influencer) {
      return NextResponse.json(
        { error: 'Invalid or inactive influencer' },
        { status: 404 }
      );
    }

    // Record the signup conversion
    const { error: conversionError } = await supabase
      .from('influencer_conversions')
      .insert({
        influencer_id,
        user_id,
        type: 'signup',
      });

    if (conversionError) {
      console.error('[Track Signup] Failed to create conversion:', conversionError.message);
      return NextResponse.json(
        { error: 'Failed to record conversion' },
        { status: 500 }
      );
    }

    console.log(`[Track Signup] Recorded signup conversion: user=${user_id}, influencer=${influencer_id}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Track Signup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
