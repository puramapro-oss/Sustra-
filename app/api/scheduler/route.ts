import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

const PLAN_SCHEDULE_LIMITS: Record<string, number> = {
  free: 0,
  starter: 1,
  creator: 5,
  empire: 999,
};

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    const { data: schedules, error } = await supabase
      .from('creation_schedules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Scheduler] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }

    return NextResponse.json({ data: schedules });
  } catch (err) {
    console.error('[Scheduler] GET exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    // Get user profile for plan check
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    const plan = profile?.plan || 'free';
    const maxSchedules = PLAN_SCHEDULE_LIMITS[plan] ?? 0;

    if (maxSchedules === 0) {
      return NextResponse.json(
        { error: 'Votre plan ne permet pas de créer des plannings. Passez au plan Starter ou supérieur.' },
        { status: 403 }
      );
    }

    // Count existing schedules
    const { count } = await supabase
      .from('creation_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count || 0) >= maxSchedules) {
      return NextResponse.json(
        { error: `Votre plan ${plan} est limité à ${maxSchedules} planning(s). Mettez à niveau pour en créer plus.` },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      name,
      frequency,
      days_of_week,
      day_of_month,
      hour,
      minute,
      format,
      topic,
      ai_chooses_topic,
      platforms,
      publish_mode,
    } = body;

    if (!name || !frequency || hour === undefined || minute === undefined) {
      return NextResponse.json({ error: 'Missing required fields: name, frequency, hour, minute' }, { status: 400 });
    }

    // Calculate next execution
    const nextExecution = calculateNextExecution(frequency, days_of_week, day_of_month, hour, minute);

    const { data: schedule, error } = await supabase
      .from('creation_schedules')
      .insert({
        user_id: user.id,
        name,
        frequency,
        days_of_week: days_of_week || [],
        day_of_month: day_of_month || null,
        hour: parseInt(hour),
        minute: parseInt(minute),
        format: format || 'ai_choice',
        topic: ai_chooses_topic ? null : (topic || null),
        ai_chooses_topic: ai_chooses_topic || false,
        platforms: platforms || ['youtube'],
        publish_mode: publish_mode || 'approval',
        is_active: true,
        next_execution_at: nextExecution,
        videos_created: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[Scheduler] POST insert error:', error);
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (err) {
    console.error('[Scheduler] POST exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateNextExecution(
  frequency: string,
  daysOfWeek: number[] | null,
  dayOfMonth: number | null,
  hour: number,
  minute: number
): string {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  switch (frequency) {
    case 'ponctuel':
      // One-time: next occurrence at the specified time
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }
      break;

    case 'quotidien':
      // Daily: next occurrence today or tomorrow
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }
      break;

    case 'hebdomadaire':
      // Weekly: find next matching day of week
      if (daysOfWeek && daysOfWeek.length > 0) {
        const currentDay = now.getDay(); // 0=Sun
        let found = false;
        for (let offset = 0; offset <= 7; offset++) {
          const checkDay = (currentDay + offset) % 7;
          if (daysOfWeek.includes(checkDay)) {
            const candidate = new Date(now);
            candidate.setDate(now.getDate() + offset);
            candidate.setHours(hour, minute, 0, 0);
            if (candidate > now) {
              target.setTime(candidate.getTime());
              found = true;
              break;
            }
          }
        }
        if (!found) {
          // Fallback: next week first matching day
          for (let offset = 1; offset <= 7; offset++) {
            const checkDay = (currentDay + offset) % 7;
            if (daysOfWeek.includes(checkDay)) {
              target.setDate(now.getDate() + offset);
              break;
            }
          }
        }
      } else {
        if (target <= now) target.setDate(target.getDate() + 7);
      }
      break;

    case 'mensuel':
      // Monthly: next occurrence on day_of_month
      if (dayOfMonth) {
        target.setDate(dayOfMonth);
        if (target <= now) {
          target.setMonth(target.getMonth() + 1);
        }
      } else {
        if (target <= now) target.setDate(target.getDate() + 30);
      }
      break;

    case 'personnalise':
    default:
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }
      break;
  }

  return target.toISOString();
}
