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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const admin = getSupabaseAdmin();

    const { data: influencer, error } = await admin
      .from('influencer_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !influencer) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    // Get click stats
    const { count: clickCount } = await admin
      .from('influencer_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('influencer_id', id);

    // Get conversion stats
    const { count: conversionCount } = await admin
      .from('influencer_conversions')
      .select('*', { count: 'exact', head: true })
      .eq('influencer_id', id);

    // Get earnings
    const { data: earnings } = await admin
      .from('influencer_earnings')
      .select('amount, created_at, status')
      .eq('influencer_id', id)
      .order('created_at', { ascending: false });

    const totalEarnings = earnings
      ? earnings.reduce((sum, e) => sum + (e.amount || 0), 0)
      : 0;

    const pendingEarnings = earnings
      ? earnings
          .filter((e) => e.status === 'pending')
          .reduce((sum, e) => sum + (e.amount || 0), 0)
      : 0;

    // Get recent clicks (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentClicks } = await admin
      .from('influencer_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('influencer_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get commissions linked to this influencer
    const { data: commissions } = await admin
      .from('commissions')
      .select('amount, status, created_at')
      .eq('influencer_id', id)
      .order('created_at', { ascending: false });

    const totalCommissions = commissions
      ? commissions.reduce((sum, c) => sum + (c.amount || 0), 0)
      : 0;

    return NextResponse.json({
      influencer: {
        ...influencer,
        stats: {
          clickCount: clickCount || 0,
          conversionCount: conversionCount || 0,
          conversionRate:
            clickCount && clickCount > 0
              ? (((conversionCount || 0) / clickCount) * 100).toFixed(1)
              : '0',
          totalEarnings,
          pendingEarnings,
          recentClicks: recentClicks || 0,
          totalCommissions,
        },
        recentEarnings: earnings?.slice(0, 10) || [],
        recentCommissions: commissions?.slice(0, 10) || [],
      },
    });
  } catch (error) {
    console.error('Admin influencer detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const admin = getSupabaseAdmin();
    const body = await request.json();

    const allowedFields = [
      'commission_rate',
      'is_active',
      'display_name',
      'platform',
      'channel_url',
      'slug',
      'contract_start',
      'contract_end',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: influencer, error } = await admin
      .from('influencer_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!influencer) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    return NextResponse.json({ influencer });
  } catch (error) {
    console.error('Admin influencer update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const admin = getSupabaseAdmin();

    // Soft delete: deactivate instead of removing
    const { data: influencer, error } = await admin
      .from('influencer_profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!influencer) {
      return NextResponse.json({ error: 'Influencer not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Influencer deactivated', influencer });
  } catch (error) {
    console.error('Admin influencer delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
