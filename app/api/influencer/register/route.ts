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

    const body = await request.json();
    const { display_name, platform, channel_url, custom_link_slug } = body;

    if (!display_name || !platform || !channel_url || !custom_link_slug) {
      return NextResponse.json(
        { error: 'Missing required fields: display_name, platform, channel_url, custom_link_slug' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9_-]{3,30}$/;
    if (!slugRegex.test(custom_link_slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Use 3-30 lowercase alphanumeric characters, hyphens, or underscores.' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('custom_link_slug', custom_link_slug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'This slug is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // Check if user already has an influencer profile
    const { data: existingProfile } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'You already have an influencer profile.' },
        { status: 409 }
      );
    }

    // Create influencer profile
    const { data: profile, error: profileError } = await supabase
      .from('influencer_profiles')
      .insert({
        user_id: user.id,
        display_name,
        platform,
        channel_url,
        custom_link_slug,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating influencer profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to create influencer profile' },
        { status: 500 }
      );
    }

    // Create first contract (1 month)
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
        { error: 'Profile created but failed to create contract' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
      contract,
      link: `sutra.purama.app/go/${custom_link_slug}`,
    });
  } catch (error) {
    console.error('Influencer register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
