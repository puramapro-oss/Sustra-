import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export async function GET(request: NextRequest) {
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

    // Get influencer profile
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Influencer profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    // Get clicks for the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: clicks } = await supabase
      .from('influencer_clicks')
      .select('id, created_at, referrer, country')
      .eq('influencer_id', profile.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Group clicks by date for chart
    const grouped: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      grouped[key] = 0;
    }

    clicks?.forEach(click => {
      const key = click.created_at.split('T')[0];
      if (grouped[key] !== undefined) {
        grouped[key]++;
      }
    });

    const chartData = Object.entries(grouped).map(([date, count]) => ({
      date,
      clicks: count,
    }));

    return NextResponse.json({
      chart_data: chartData,
      total: clicks?.length || 0,
      clicks: clicks || [],
    });
  } catch (error) {
    console.error('Influencer clicks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
