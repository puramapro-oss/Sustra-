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
    const supabase = getSupabaseAdmin();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { schedule_id } = body;

    if (!schedule_id) {
      return NextResponse.json({ error: 'schedule_id is required' }, { status: 400 });
    }

    // Get current state
    const { data: schedule, error: fetchError } = await supabase
      .from('creation_schedules')
      .select('id, is_active')
      .eq('id', schedule_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const newActive = !schedule.is_active;

    const { data: updated, error: updateError } = await supabase
      .from('creation_schedules')
      .update({
        is_active: newActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Scheduler] Toggle error:', updateError);
      return NextResponse.json({ error: 'Failed to toggle schedule' }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[Scheduler] Toggle exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
