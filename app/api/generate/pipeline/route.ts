import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import type {
  VideoFormat,
  VoiceStyle,
  VisualStyle,
  Script,
  Scene,
  TransitionType,
  VideoStatus,
  ShotstackEdit,
  ShotstackTimeline,
  ShotstackTrack,
  ShotstackClip,
} from '@/lib/types';
import { VOICE_STYLES } from '@/lib/constants';

interface PipelineRequestBody {
  topic: string;
  format: VideoFormat;
  voiceStyle: VoiceStyle;
  visualStyle: VisualStyle;
  videoModel?: string;
  userId: string;
}

interface PipelineStep {
  step: number;
  totalSteps: number;
  status: string;
  message: string;
  percentage: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = ReturnType<typeof createClient<any>>;

function getSupabaseAdmin(): SupabaseAdmin {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

async function updateVideoStatus(
  supabase: SupabaseAdmin,
  videoId: string,
  status: VideoStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (extra) Object.assign(update, extra);
  await supabase.from('videos').update(update).eq('id', videoId);
}

function buildScriptPrompt(topic: string, format: VideoFormat, visualStyle: VisualStyle): string {
  const targetDuration = format === 'short' ? 45 : format === 'long' ? 480 : 30;
  const scenesRange = format === 'short' ? '4-8' : format === 'long' ? '10-25' : '1-10';

  return `You are an expert viral video scriptwriter. Create a complete script for:

Topic: ${topic}
Format: ${format}
Visual Style: ${visualStyle}
Target Duration: ~${targetDuration} seconds

Return JSON:
{
  "title": "string",
  "hook": "string",
  "scenes": [
    {
      "index": 0,
      "narration": "string",
      "visual_description": "string",
      "visual_source": "stock|image_ai|video_ai",
      "visual_keywords": ["string"],
      "duration_seconds": number,
      "transition": "fade|slideLeft|slideRight|zoom|wipeLeft|wipeRight",
      "text_overlay": "string or null",
      "importance": "low|medium|high|hero"
    }
  ],
  "cta": "string",
  "total_duration_seconds": ${targetDuration},
  "viral_score": number,
  "tags": ["string"]
}

Generate ${scenesRange} scenes. Return ONLY valid JSON.`;
}

export async function POST(request: NextRequest): Promise<Response> {
  const encoder = new TextEncoder();

  function sendProgress(controller: ReadableStreamDefaultController, step: PipelineStep): void {
    const chunk = `data: ${JSON.stringify(step)}\n\n`;
    controller.enqueue(encoder.encode(chunk));
  }

  function sendError(controller: ReadableStreamDefaultController, error: string): void {
    const chunk = `data: ${JSON.stringify({ error })}\n\n`;
    controller.enqueue(encoder.encode(chunk));
  }

  try {
    const body: PipelineRequestBody = await request.json();

    // Validate inputs
    if (!body.topic || typeof body.topic !== 'string') {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }
    if (!body.format || !['short', 'long', 'photo'].includes(body.format)) {
      return NextResponse.json({ error: 'format must be short, long, or photo' }, { status: 400 });
    }
    if (!body.voiceStyle) {
      return NextResponse.json({ error: 'voiceStyle is required' }, { status: 400 });
    }
    if (!body.visualStyle) {
      return NextResponse.json({ error: 'visualStyle is required' }, { status: 400 });
    }
    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const shotstackKey = process.env.SHOTSTACK_API_KEY;

    if (!anthropicKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }
    if (!elevenLabsKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();

    // Create video record
    const { data: video, error: createError } = await supabase
      .from('videos')
      .insert({
        user_id: body.userId,
        title: `Video: ${body.topic}`,
        format: body.format,
        status: 'scripting' as VideoStatus,
        slug: body.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 80),
      })
      .select('id')
      .single();

    if (createError || !video) {
      return NextResponse.json(
        { error: `Failed to create video record: ${createError?.message ?? 'unknown'}` },
        { status: 500 }
      );
    }

    const videoId = video.id;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // =====================================================
          // Step 1: Generate Script
          // =====================================================
          sendProgress(controller, {
            step: 1,
            totalSteps: 5,
            status: 'scripting',
            message: 'Generating script with Claude...',
            percentage: 10,
          });

          const client = new Anthropic({ apiKey: anthropicKey });
          const scriptMessage = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: buildScriptPrompt(body.topic, body.format, body.visualStyle),
              },
            ],
          });

          const textBlock = scriptMessage.content.find((b) => b.type === 'text');
          if (!textBlock || textBlock.type !== 'text') {
            throw new Error('No text response from Claude');
          }

          let scriptText = textBlock.text.trim();
          const jsonMatch = scriptText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) scriptText = jsonMatch[1].trim();

          const script: Script = JSON.parse(scriptText);
          if (!script.title || !script.scenes || !Array.isArray(script.scenes)) {
            throw new Error('Invalid script structure');
          }

          script.scenes = script.scenes.map((s: Scene, idx: number) => ({
            ...s,
            index: idx,
            transition: (s.transition || 'fade') as TransitionType,
            importance: s.importance || 'medium',
            visual_source: s.visual_source || 'stock',
            visual_keywords: s.visual_keywords || [],
          }));

          script.total_duration_seconds = script.scenes.reduce(
            (sum: number, s: Scene) => sum + s.duration_seconds,
            0
          );

          await updateVideoStatus(supabase, videoId, 'generating_voice', {
            title: script.title,
            script,
          });

          sendProgress(controller, {
            step: 2,
            totalSteps: 5,
            status: 'generating_voice',
            message: 'Script complete. Generating voice and visuals in parallel...',
            percentage: 25,
          });

          // =====================================================
          // Step 2 & 3: Voice + Visuals in parallel
          // =====================================================
          const voiceStyleDef = VOICE_STYLES.find((v) => v.id === body.voiceStyle);
          const voiceId = voiceStyleDef?.elevenlabs_voice_id ?? '21m00Tcm4TlvDq8ikWAM';

          const fullNarration = script.scenes.map((s: Scene) => s.narration).join(' ');

          // Voice generation
          const voicePromise = fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: 'POST',
              headers: {
                Accept: 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsKey,
              },
              body: JSON.stringify({
                text: fullNarration,
                model_id: 'eleven_flash_v2_5',
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                  style: 0.3,
                  use_speaker_boost: true,
                },
              }),
            }
          ).then(async (res) => {
            if (!res.ok) {
              const errText = await res.text().catch(() => '');
              throw new Error(`ElevenLabs error (${res.status}): ${errText}`);
            }
            return res.arrayBuffer();
          });

          // Visuals generation via internal API
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const visualsPromise = fetch(`${appUrl}/api/generate/visuals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenes: script.scenes.map((s: Scene) => ({
                prompt: s.visual_description,
                sourceType: s.visual_source,
                duration: s.duration_seconds,
              })),
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const errText = await res.text().catch(() => '');
              throw new Error(`Visuals API error: ${errText}`);
            }
            return res.json();
          });

          const [voiceBuffer, visualsData] = await Promise.all([voicePromise, visualsPromise]);

          // Upload voice audio
          const voiceFileName = `pipeline_voice_${videoId}_${Date.now()}.mp3`;
          const voiceFilePath = `voices/${voiceFileName}`;
          const { error: voiceUploadError } = await supabase.storage
            .from('assets')
            .upload(voiceFilePath, new Uint8Array(voiceBuffer), {
              contentType: 'audio/mpeg',
              cacheControl: '3600',
            });

          if (voiceUploadError) {
            throw new Error(`Voice upload failed: ${voiceUploadError.message}`);
          }

          const {
            data: { publicUrl: voiceUrl },
          } = supabase.storage.from('assets').getPublicUrl(voiceFilePath);

          await updateVideoStatus(supabase, videoId, 'generating_music');

          sendProgress(controller, {
            step: 3,
            totalSteps: 5,
            status: 'generating_music',
            message: 'Voice and visuals ready. Finding background music...',
            percentage: 60,
          });

          // =====================================================
          // Step 4: Generate Music
          // =====================================================
          let musicUrl: string | null = null;

          const musicMood = script.tags?.[0] ?? 'upbeat';
          const musicResponse = await fetch(`${appUrl}/api/generate/music`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mood: musicMood,
              duration: script.total_duration_seconds,
              style: 'background',
            }),
          });

          if (musicResponse.ok) {
            const musicData = await musicResponse.json();
            musicUrl = musicData.musicUrl;
          } else {
            console.warn('[Pipeline] Music generation failed, continuing without music');
          }

          await updateVideoStatus(supabase, videoId, 'assembling');

          sendProgress(controller, {
            step: 4,
            totalSteps: 5,
            status: 'assembling',
            message: 'Assembling timeline and submitting render...',
            percentage: 80,
          });

          // =====================================================
          // Step 5: Assemble and Render with Shotstack
          // =====================================================
          const visuals: { url: string; type: string; duration: number }[] =
            visualsData.visuals ?? [];

          // Build Shotstack timeline
          let currentStart = 0;
          const videoClips: ShotstackClip[] = [];
          const voiceClips: ShotstackClip[] = [];

          for (let i = 0; i < script.scenes.length; i++) {
            const scene = script.scenes[i];
            const visual = visuals[i];
            const sceneDuration = scene.duration_seconds;

            if (visual && visual.url) {
              const assetType = visual.type === 'video' ? 'video' : 'image';
              videoClips.push({
                asset: assetType === 'video'
                  ? { type: 'video', src: visual.url, volume: 0 }
                  : { type: 'image', src: visual.url },
                start: currentStart,
                length: sceneDuration,
                fit: 'cover',
                transition: {
                  in: (scene.transition || 'fade') as TransitionType,
                },
              });
            }

            if (scene.text_overlay) {
              videoClips.push({
                asset: {
                  type: 'title',
                  text: scene.text_overlay,
                  style: 'subtitle',
                  color: '#ffffff',
                  size: 'medium',
                  position: 'bottom',
                },
                start: currentStart,
                length: sceneDuration,
                position: 'bottom',
              });
            }

            currentStart += sceneDuration;
          }

          // Single voice track
          voiceClips.push({
            asset: { type: 'audio', src: voiceUrl, volume: 1 },
            start: 0,
            length: script.total_duration_seconds,
          });

          const tracks: ShotstackTrack[] = [
            { clips: videoClips },
            { clips: voiceClips },
          ];

          const timeline: ShotstackTimeline = {
            tracks,
            background: '#000000',
          };

          if (musicUrl) {
            timeline.soundtrack = {
              src: musicUrl,
              effect: 'fadeInFadeOut',
              volume: 0.3,
            };
          }

          const aspectRatio = body.format === 'short' ? '9:16' : body.format === 'photo' ? '1:1' : '16:9';

          const shotstackEdit: ShotstackEdit = {
            timeline,
            output: {
              format: 'mp4',
              resolution: '1080',
              aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1',
            },
          };

          const callbackUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shotstack`
            : undefined;
          if (callbackUrl) {
            shotstackEdit.callback = callbackUrl;
          }

          let renderId: string | null = null;

          if (shotstackKey) {
            const renderResponse = await fetch(
              'https://api.shotstack.io/edit/stage/render',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': shotstackKey,
                },
                body: JSON.stringify(shotstackEdit),
              }
            );

            if (renderResponse.ok) {
              const renderData = await renderResponse.json();
              renderId = renderData.response?.id ?? null;
            } else {
              const errText = await renderResponse.text().catch(() => '');
              console.error('[Pipeline] Shotstack render failed:', errText);
            }
          }

          const finalStatus: VideoStatus = renderId ? 'rendering' : 'completed';
          await updateVideoStatus(supabase, videoId, finalStatus, {
            shotstack_render_id: renderId,
            shotstack_edit: shotstackEdit,
            duration_seconds: script.total_duration_seconds,
          });

          sendProgress(controller, {
            step: 5,
            totalSteps: 5,
            status: finalStatus,
            message: renderId
              ? 'Render submitted. You will be notified when complete.'
              : 'Pipeline complete.',
            percentage: 100,
          });

          // Send final result
          const doneChunk = `data: ${JSON.stringify({
            done: true,
            videoId,
            renderId,
            status: finalStatus,
            script,
          })}\n\n`;
          controller.enqueue(encoder.encode(doneChunk));
          controller.close();
        } catch (pipelineError) {
          console.error('[Pipeline API] Pipeline error:', pipelineError);

          await updateVideoStatus(supabase, videoId, 'failed').catch(() => {});

          sendError(
            controller,
            pipelineError instanceof Error ? pipelineError.message : 'Pipeline failed'
          );
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
  } catch (error) {
    console.error('[Pipeline API] Error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
