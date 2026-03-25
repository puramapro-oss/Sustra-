import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import type { Script, Scene, VideoStatus, ShotstackEdit } from '@/lib/types';

interface TranslateRequestBody {
  videoId: string;
  targetLanguage: string;
}

const SUPPORTED_LANGUAGES = [
  'spanish', 'french', 'german', 'italian', 'portuguese', 'dutch',
  'polish', 'russian', 'japanese', 'korean', 'chinese', 'arabic',
  'hindi', 'turkish', 'swedish', 'norwegian', 'danish', 'finnish',
  'czech', 'romanian', 'hungarian', 'greek', 'thai', 'vietnamese',
  'indonesian', 'malay', 'tagalog', 'ukrainian',
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const body: TranslateRequestBody = await request.json();

    if (!body.videoId || typeof body.videoId !== 'string') {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    if (!body.targetLanguage || typeof body.targetLanguage !== 'string') {
      return NextResponse.json({ error: 'targetLanguage is required' }, { status: 400 });
    }

    const normalizedLanguage = body.targetLanguage.toLowerCase().trim();
    if (!SUPPORTED_LANGUAGES.includes(normalizedLanguage)) {
      return NextResponse.json(
        {
          error: `Unsupported language: ${body.targetLanguage}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Get original video and script from Supabase
    const { data: originalVideo, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', body.videoId)
      .single();

    if (fetchError || !originalVideo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const originalScript = originalVideo.script as Script | null;
    if (!originalScript || !originalScript.scenes) {
      return NextResponse.json(
        { error: 'Video does not have a script to translate' },
        { status: 400 }
      );
    }

    // 2. Translate script with Claude
    const client = new Anthropic({ apiKey: anthropicKey });

    const translateMessage = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are a professional translator. Translate video scripts while maintaining the original tone, timing, and emotional impact. Adapt cultural references when needed. Return ONLY valid JSON.`,
      messages: [
        {
          role: 'user',
          content: `Translate this video script to ${normalizedLanguage}. Maintain approximately the same word count per scene for timing.

Original script:
${JSON.stringify(originalScript, null, 2)}

Return the same JSON structure with all text fields (title, hook, narration, text_overlay, cta, tags) translated to ${normalizedLanguage}. Keep visual_description, visual_source, visual_keywords in English for generation purposes. Return ONLY the JSON.`,
        },
      ],
    });

    const textBlock = translateMessage.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'No translation response from Claude' },
        { status: 500 }
      );
    }

    let translatedText = textBlock.text.trim();
    const jsonMatch = translatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) translatedText = jsonMatch[1].trim();

    let translatedScript: Script;
    try {
      translatedScript = JSON.parse(translatedText);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse translated script' },
        { status: 500 }
      );
    }

    // 3. Regenerate voice in target language
    const fullNarration = translatedScript.scenes
      .map((s: Scene) => s.narration)
      .join(' ');

    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Default multilingual voice

    const voiceResponse = await fetch(
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
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!voiceResponse.ok) {
      const errText = await voiceResponse.text().catch(() => '');
      return NextResponse.json(
        { error: `Voice generation failed: ${errText}` },
        { status: 500 }
      );
    }

    const audioBuffer = await voiceResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // Upload translated voice
    const voiceFileName = `translated_${normalizedLanguage}_${Date.now()}.mp3`;
    const voiceFilePath = `voices/${voiceFileName}`;
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(voiceFilePath, audioBytes, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Voice upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl: voiceUrl },
    } = supabase.storage.from('assets').getPublicUrl(voiceFilePath);

    // 4. Create new video record for the translated version
    const { data: newVideo, error: insertError } = await supabase
      .from('videos')
      .insert({
        user_id: originalVideo.user_id,
        title: `${translatedScript.title} (${normalizedLanguage})`,
        description: originalVideo.description,
        format: originalVideo.format,
        status: 'rendering' as VideoStatus,
        slug: `${originalVideo.slug}-${normalizedLanguage}`,
        script: translatedScript,
        duration_seconds: originalVideo.duration_seconds,
      })
      .select('id')
      .single();

    if (insertError || !newVideo) {
      return NextResponse.json(
        { error: `Failed to create translated video: ${insertError?.message ?? 'unknown'}` },
        { status: 500 }
      );
    }

    // 5. Re-render with Shotstack if original had a Shotstack edit
    const originalEdit = originalVideo.shotstack_edit as ShotstackEdit | null;
    if (originalEdit && process.env.SHOTSTACK_API_KEY) {
      // Replace voice track URL in the Shotstack edit
      const modifiedEdit: ShotstackEdit = JSON.parse(JSON.stringify(originalEdit));

      // Find and replace audio assets
      for (const track of modifiedEdit.timeline.tracks) {
        for (const clip of track.clips) {
          if (clip.asset.type === 'audio') {
            clip.asset.src = voiceUrl;
          }
          // Update subtitle/title overlays with translated text
          if (clip.asset.type === 'title') {
            const sceneIndex = translatedScript.scenes.findIndex(
              (s: Scene) => s.text_overlay !== null
            );
            if (sceneIndex >= 0 && translatedScript.scenes[sceneIndex].text_overlay) {
              clip.asset.text = translatedScript.scenes[sceneIndex].text_overlay!;
            }
          }
        }
      }

      const callbackUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shotstack`
        : undefined;
      if (callbackUrl) modifiedEdit.callback = callbackUrl;

      const renderResponse = await fetch(
        'https://api.shotstack.io/edit/stage/render',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.SHOTSTACK_API_KEY,
          },
          body: JSON.stringify(modifiedEdit),
        }
      );

      if (renderResponse.ok) {
        const renderData = await renderResponse.json();
        const renderId = renderData.response?.id;
        if (renderId) {
          await supabase
            .from('videos')
            .update({
              shotstack_render_id: renderId,
              shotstack_edit: modifiedEdit,
            })
            .eq('id', newVideo.id);
        }
      }
    } else {
      // No Shotstack edit, mark as completed
      await supabase
        .from('videos')
        .update({ status: 'completed' as VideoStatus })
        .eq('id', newVideo.id);
    }

    return NextResponse.json({
      newVideoId: newVideo.id,
      status: 'rendering',
      translatedScript,
      voiceUrl,
    });
  } catch (error) {
    console.error('[Translate API] Error:', error);

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
