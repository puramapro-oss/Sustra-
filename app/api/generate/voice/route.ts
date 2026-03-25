import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface VoiceRequestBody {
  text: string;
  voiceId?: string;
  model?: 'flash' | 'multilingual';
  style?: number;
}

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - default ElevenLabs voice
const MODEL_MAP = {
  flash: 'eleven_flash_v2_5',
  multilingual: 'eleven_multilingual_v2',
} as const;

function estimateAudioDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const wordsPerSecond = 2.5;
  return Math.ceil(wordCount / wordsPerSecond);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const body: VoiceRequestBody = await request.json();

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (body.text.length > 5000) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 5000 characters' },
        { status: 400 }
      );
    }

    const voiceId = body.voiceId || DEFAULT_VOICE_ID;
    const modelId = MODEL_MAP[body.model || 'flash'];

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsKey,
        },
        body: JSON.stringify({
          text: body.text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: body.style ?? 0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.json().catch(() => null);
      const errorMessage =
        errorData?.detail?.message ||
        errorData?.detail ||
        `ElevenLabs API error: ${ttsResponse.status}`;
      return NextResponse.json({ error: errorMessage }, { status: ttsResponse.status });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp3`;
    const filePath = `voices/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, audioBytes, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload audio: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('assets').getPublicUrl(filePath);

    const estimatedDuration = estimateAudioDuration(body.text);

    let timestamps: { character: string; start: number; end: number }[] | undefined;

    const ttsWithTimestampsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsKey,
        },
        body: JSON.stringify({
          text: body.text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: body.style ?? 0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (ttsWithTimestampsResponse.ok) {
      const timestampData = await ttsWithTimestampsResponse.json();
      if (timestampData.alignment) {
        timestamps = timestampData.alignment.characters?.map(
          (char: { character: string; start_time: number; end_time: number }) => ({
            character: char.character,
            start: char.start_time,
            end: char.end_time,
          })
        );
      }
    }

    return NextResponse.json({
      audioUrl: publicUrl,
      duration: estimatedDuration,
      timestamps: timestamps ?? null,
    });
  } catch (error) {
    console.error('[Voice Generation API] Error:', error);

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
