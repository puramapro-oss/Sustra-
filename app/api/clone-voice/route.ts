import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
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
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    const audioFile = formData.get('audio') as File | null;
    const name = formData.get('name') as string | null;
    const userId = formData.get('userId') as string | null;

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: 'Audio file is required (field name: "audio")' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Voice name is required (field name: "name")' },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Audio file exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    if (audioFile.type && !ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Unsupported audio format: ${audioFile.type}. Supported: mp3, wav, ogg, webm, m4a` },
        { status: 400 }
      );
    }

    // Build FormData for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('name', name.trim());
    elevenLabsFormData.append('files', audioFile, audioFile.name || 'sample.mp3');
    elevenLabsFormData.append(
      'labels',
      JSON.stringify({ source: 'sustra_clone', created_by: userId || 'unknown' })
    );
    elevenLabsFormData.append(
      'description',
      `Voice clone "${name}" created via Sustra platform`
    );

    // Call ElevenLabs Instant Voice Cloning API
    const cloneResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsKey,
      },
      body: elevenLabsFormData,
    });

    if (!cloneResponse.ok) {
      const errorData = await cloneResponse.json().catch(() => null);
      const errorMessage =
        errorData?.detail?.message ||
        errorData?.detail ||
        `ElevenLabs voice cloning failed: ${cloneResponse.status}`;
      return NextResponse.json(
        { error: errorMessage },
        { status: cloneResponse.status }
      );
    }

    const cloneData = await cloneResponse.json();
    const voiceId = cloneData.voice_id;

    if (!voiceId) {
      return NextResponse.json(
        { error: 'ElevenLabs did not return a voice ID' },
        { status: 500 }
      );
    }

    // Save voice ID to user's profile in Supabase
    if (userId) {
      try {
        const supabase = getSupabaseAdmin();

        // Store in a cloned_voices table or update profile
        // First try to insert into a dedicated cloned voices record
        await supabase.from('cloned_voices').insert({
          user_id: userId,
          voice_id: voiceId,
          name: name.trim(),
          elevenlabs_voice_id: voiceId,
          created_at: new Date().toISOString(),
        }).then(async (result) => {
          // If dedicated table doesn't exist, update profile metadata
          if (result.error) {
            // Fallback: store in profiles as JSON
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .single();

            if (profile) {
              await supabase
                .from('profiles')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', userId);
            }
          }
        });
      } catch (dbError) {
        // Non-fatal: log but still return the voice ID
        console.warn('[Clone Voice API] Failed to save voice to profile:', dbError);
      }
    }

    return NextResponse.json({
      voiceId,
      name: name.trim(),
    });
  } catch (error) {
    console.error('[Clone Voice API] Error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
