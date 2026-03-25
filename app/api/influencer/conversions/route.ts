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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Get total count
    const { count: totalCount } = await supabase
      .from('influencer_conversions')
      .select('*', { count: 'exact', head: true })
      .eq('influencer_id', profile.id);

    // Get paginated conversions
    const { data: conversions, error: convError } = await supabase
      .from('influencer_conversions')
      .select('id, type, plan, amount, commission, status, created_at')
      .eq('influencer_id', profile.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (convError) {
      console.error('Error fetching conversions:', convError);
      return NextResponse.json(
        { error: 'Failed to fetch conversions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversions: conversions || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Influencer conversions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
