import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { VideoStatus } from '@/lib/types';

interface ShotstackWebhookPayload {
  type: string;
  action: string;
  id: string;
  owner: string;
  status: string;
  url?: string;
  error?: string;
  completed?: string;
  data?: {
    output?: {
      renderId?: string;
      url?: string;
      status?: string;
    };
  };
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload: ShotstackWebhookPayload = await request.json();

    const renderId = payload.id || payload.data?.output?.renderId;
    const status = payload.status;
    const videoUrl = payload.url || payload.data?.output?.url;

    if (!renderId) {
      console.warn('[Shotstack Webhook] Received payload without render ID');
      return NextResponse.json(
        { error: 'No render ID in payload' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (status === 'done' && videoUrl) {
      // Render completed successfully
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          status: 'completed' as VideoStatus,
          video_url: videoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('shotstack_render_id', renderId);

      if (updateError) {
        console.error(
          '[Shotstack Webhook] Failed to update video status:',
          updateError.message
        );
        return NextResponse.json(
          { error: `Database update failed: ${updateError.message}` },
          { status: 500 }
        );
      }

      console.log(
        `[Shotstack Webhook] Render ${renderId} completed. Video URL: ${videoUrl}`
      );
    } else if (status === 'failed') {
      // Render failed
      const errorMessage = payload.error || 'Render failed with no error message';

      const { error: updateError } = await supabase
        .from('videos')
        .update({
          status: 'failed' as VideoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('shotstack_render_id', renderId);

      if (updateError) {
        console.error(
          '[Shotstack Webhook] Failed to update failed status:',
          updateError.message
        );
        return NextResponse.json(
          { error: `Database update failed: ${updateError.message}` },
          { status: 500 }
        );
      }

      console.error(
        `[Shotstack Webhook] Render ${renderId} failed: ${errorMessage}`
      );
    } else if (status === 'rendering') {
      // Still rendering - update status to track progress
      await supabase
        .from('videos')
        .update({
          status: 'rendering' as VideoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('shotstack_render_id', renderId);

      console.log(`[Shotstack Webhook] Render ${renderId} is rendering...`);
    } else {
      console.log(
        `[Shotstack Webhook] Render ${renderId} status: ${status}`
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Shotstack Webhook] Error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in webhook payload' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
