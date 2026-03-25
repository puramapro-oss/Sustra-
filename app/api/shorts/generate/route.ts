import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export const runtime = 'nodejs';
export const maxDuration = 300;

interface GenerateRequest {
  youtube_url?: string;
  file_url?: string;
  num_shorts: number;
  duration: number;
  subtitle_style: string;
}

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateRequest = await req.json();
    const { youtube_url, file_url, num_shorts = 5, duration = 30, subtitle_style = 'bold' } = body;

    if (!youtube_url && !file_url) {
      return NextResponse.json({ error: 'youtube_url or file_url is required' }, { status: 400 });
    }

    if (num_shorts < 3 || num_shorts > 10) {
      return NextResponse.json({ error: 'num_shorts must be between 3 and 10' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(sseEvent(data)));
        };

        try {
          // Step 1: Download/validate video
          send({ type: 'step', step_id: 'download', status: 'active', detail: 'Validation de la vidéo...' });

          let videoUrl = file_url || '';

          if (youtube_url) {
            const downloadRes = await fetch(new URL('/api/shorts/download-video', req.url).toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ youtube_url }),
            });

            if (!downloadRes.ok) {
              send({ type: 'step', step_id: 'download', status: 'error', detail: 'Échec du téléchargement' });
              send({ type: 'error', message: 'Failed to download video' });
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            const downloadData = await downloadRes.json();
            videoUrl = downloadData.audio_url || downloadData.video_url || youtube_url;
          }

          send({ type: 'step', step_id: 'download', status: 'done', detail: 'Vidéo prête' });

          // Step 2: Transcribe
          send({ type: 'step', step_id: 'transcribe', status: 'active', detail: 'Transcription en cours...' });

          const transcribeRes = await fetch(new URL('/api/shorts/transcribe', req.url).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_url: videoUrl }),
          });

          let transcript = '';
          let segments: Array<{ start: number; end: number; text: string }> = [];

          if (transcribeRes.ok) {
            const transcribeData = await transcribeRes.json();
            transcript = transcribeData.transcript || '';
            segments = transcribeData.segments || [];
          }

          send({ type: 'step', step_id: 'transcribe', status: 'done', detail: `${segments.length} segments trouvés` });

          // Step 3: Analyze for viral moments
          send({ type: 'step', step_id: 'analyze', status: 'active', detail: 'Recherche des moments viraux...' });

          const analyzeRes = await fetch(new URL('/api/shorts/analyze', req.url).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript,
              segments,
              num_shorts,
              max_duration: duration,
            }),
          });

          let moments: Array<{
            title: string;
            hook: string;
            start: number;
            end: number;
            viral_score: number;
          }> = [];

          if (analyzeRes.ok) {
            const analyzeData = await analyzeRes.json();
            moments = analyzeData.moments || [];
          }

          send({
            type: 'step',
            step_id: 'analyze',
            status: 'done',
            detail: `${moments.length} moments viraux identifiés`,
          });

          // Step 4: Render shorts
          send({ type: 'step', step_id: 'render', status: 'active', detail: `Rendu de ${moments.length} shorts...` });

          const renderRes = await fetch(new URL('/api/shorts/render', req.url).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_url: videoUrl,
              moments,
              subtitle_style,
              user_id: user.id,
            }),
          });

          if (renderRes.ok) {
            const renderData = await renderRes.json();
            const shorts = renderData.shorts || [];

            for (const short of shorts) {
              send({ type: 'result', short });
            }
          }

          send({ type: 'step', step_id: 'render', status: 'done', detail: 'Rendu terminé' });

        } catch (err) {
          send({ type: 'error', message: err instanceof Error ? err.message : 'Pipeline error' });
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Shorts generate error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
