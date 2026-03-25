import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

function calculateNextExecution(
  frequency: string,
  daysOfWeek: number[] | null,
  dayOfMonth: number | null,
  hour: number,
  minute: number
): string | null {
  const now = new Date();

  switch (frequency) {
    case 'ponctuel':
      // One-time: no next execution
      return null;

    case 'quotidien': {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(hour, minute, 0, 0);
      return next.toISOString();
    }

    case 'hebdomadaire': {
      if (daysOfWeek && daysOfWeek.length > 0) {
        const currentDay = now.getDay();
        for (let offset = 1; offset <= 7; offset++) {
          const checkDay = (currentDay + offset) % 7;
          if (daysOfWeek.includes(checkDay)) {
            const next = new Date(now);
            next.setDate(now.getDate() + offset);
            next.setHours(hour, minute, 0, 0);
            return next.toISOString();
          }
        }
      }
      const next = new Date(now);
      next.setDate(next.getDate() + 7);
      next.setHours(hour, minute, 0, 0);
      return next.toISOString();
    }

    case 'mensuel': {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth) {
        next.setDate(dayOfMonth);
      }
      next.setHours(hour, minute, 0, 0);
      return next.toISOString();
    }

    case 'personnalise':
    default: {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(hour, minute, 0, 0);
      return next.toISOString();
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify cron authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const isCronAuth = authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !isCronAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Find all active schedules that need execution
    const { data: dueSchedules, error: fetchError } = await supabase
      .from('creation_schedules')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution_at', now);

    if (fetchError) {
      console.error('[Scheduler Cron] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch due schedules' }, { status: 500 });
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return NextResponse.json({ message: 'No schedules due', processed: 0 });
    }

    const results: { schedule_id: string; video_id?: string; error?: string }[] = [];

    for (const schedule of dueSchedules) {
      try {
        // Create placeholder video record
        const videoTitle = schedule.topic
          ? `[Planifié] ${schedule.topic}`
          : `[Planifié] ${schedule.name} - ${new Date().toLocaleDateString('fr-FR')}`;

        const { data: video, error: videoError } = await supabase
          .from('videos')
          .insert({
            user_id: schedule.user_id,
            title: videoTitle,
            description: `Vidéo créée automatiquement par le planning "${schedule.name}"`,
            slug: `scheduled-${schedule.id}-${Date.now()}`,
            format: schedule.format === 'ai_choice' ? 'short' : (
              schedule.format === 'youtube_long' ? 'long' :
              schedule.format === 'tiktok' ? 'short' : schedule.format
            ),
            status: 'draft',
          })
          .select()
          .single();

        if (videoError || !video) {
          console.error('[Scheduler Cron] Video creation error:', videoError);
          results.push({ schedule_id: schedule.id, error: 'Failed to create video' });
          continue;
        }

        // Create scheduled_post entry
        const { error: postError } = await supabase
          .from('scheduled_posts')
          .insert({
            user_id: schedule.user_id,
            video_id: video.id,
            schedule_id: schedule.id,
            platforms: schedule.platforms || ['youtube'],
            scheduled_at: schedule.next_execution_at,
            status: schedule.publish_mode === 'auto' ? 'pending' : 'awaiting_approval',
          });

        if (postError) {
          console.error('[Scheduler Cron] Scheduled post error:', postError);
        }

        // Update schedule: increment videos_created, calculate next execution
        const nextExecution = calculateNextExecution(
          schedule.frequency,
          schedule.days_of_week,
          schedule.day_of_month,
          schedule.hour,
          schedule.minute
        );

        const updateData: Record<string, unknown> = {
          videos_created: (schedule.videos_created || 0) + 1,
          last_execution_at: now,
          updated_at: now,
        };

        if (nextExecution) {
          updateData.next_execution_at = nextExecution;
        } else {
          // One-time schedule: deactivate
          updateData.is_active = false;
          updateData.next_execution_at = null;
        }

        await supabase
          .from('creation_schedules')
          .update(updateData)
          .eq('id', schedule.id);

        results.push({ schedule_id: schedule.id, video_id: video.id });
      } catch (scheduleErr) {
        console.error(`[Scheduler Cron] Error processing schedule ${schedule.id}:`, scheduleErr);
        results.push({ schedule_id: schedule.id, error: 'Processing error' });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} schedule(s)`,
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error('[Scheduler Cron] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
