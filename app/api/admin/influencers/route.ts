import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== 'matiss.frasne@gmail.com') {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Get total count
    const { count: totalCount } = await admin
      .from('influencer_profiles')
      .select('*', { count: 'exact', head: true });

    // Get influencer profiles
    const { data: influencers, error } = await admin
      .from('influencer_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with stats
    const enriched = await Promise.all(
      (influencers || []).map(async (influencer) => {
        const { count: clickCount } = await admin
          .from('influencer_clicks')
          .select('*', { count: 'exact', head: true })
          .eq('influencer_id', influencer.id);

        const { count: conversionCount } = await admin
          .from('influencer_conversions')
          .select('*', { count: 'exact', head: true })
          .eq('influencer_id', influencer.id);

        const { data: earnings } = await admin
          .from('influencer_earnings')
          .select('amount')
          .eq('influencer_id', influencer.id);

        const totalEarnings = earnings
          ? earnings.reduce((sum, e) => sum + (e.amount || 0), 0)
          : 0;

        return {
          ...influencer,
          clickCount: clickCount || 0,
          conversionCount: conversionCount || 0,
          totalEarnings,
        };
      })
    );

    return NextResponse.json({
      influencers: enriched,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Admin influencers list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = getSupabaseAdmin();
    const body = await request.json();
    const { display_name, platform, channel_url, slug, commission_rate } = body;

    if (!display_name || !slug) {
      return NextResponse.json(
        { error: 'display_name and slug are required' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const { data: existing } = await admin
      .from('influencer_profiles')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Slug already in use' },
        { status: 409 }
      );
    }

    const { data: influencer, error } = await admin
      .from('influencer_profiles')
      .insert({
        display_name,
        platform: platform || null,
        channel_url: channel_url || null,
        slug,
        commission_rate: commission_rate || 10,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ influencer }, { status: 201 });
  } catch (error) {
    console.error('Admin influencer create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
