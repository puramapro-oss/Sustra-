import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface MusicRequestBody {
  mood: string;
  duration: number;
  style?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = ReturnType<typeof createClient<any>>;

function getSupabaseAdmin(): SupabaseAdmin {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }
  return createClient(url, key);
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

    const body: MusicRequestBody = await request.json();

    if (!body.mood || typeof body.mood !== 'string' || body.mood.trim().length === 0) {
      return NextResponse.json({ error: 'mood is required' }, { status: 400 });
    }

    if (typeof body.duration !== 'number' || body.duration <= 0 || body.duration > 300) {
      return NextResponse.json(
        { error: 'duration must be a positive number up to 300 seconds' },
        { status: 400 }
      );
    }

    let supabase: SupabaseAdmin | null = null;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      // Cache unavailable
    }

    // Check cache for existing music matching mood
    if (supabase) {
      const moodLower = body.mood.toLowerCase();
      const { data: cached } = await supabase
        .from('asset_cache')
        .select('url, metadata')
        .eq('type', 'music')
        .ilike('description', `%${moodLower}%`)
        .limit(1)
        .maybeSingle();

      if (cached) {
        const cachedDuration =
          (cached.metadata as { duration?: number })?.duration ?? body.duration;

        // Update usage count
        await supabase
          .from('asset_cache')
          .update({ usage_count: ((cached as { usage_count?: number }).usage_count ?? 0) + 1 })
          .eq('url', cached.url);

        return NextResponse.json({
          musicUrl: cached.url,
          duration: cachedDuration,
        });
      }
    }

    // Build prompt for music generation
    const musicPrompt = body.style
      ? `${body.mood} ${body.style} background music`
      : `${body.mood} background music for video`;

    // Generate music via ElevenLabs Music API
    const musicResponse = await fetch(
      'https://api.elevenlabs.io/v1/music-generation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsKey,
        },
        body: JSON.stringify({
          prompt: musicPrompt,
          duration_seconds: body.duration,
          mode: 'quality',
        }),
      }
    );

    if (!musicResponse.ok) {
      const errorText = await musicResponse.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `ElevenLabs Music API error (${musicResponse.status}): ${errorText}` },
        { status: musicResponse.status }
      );
    }

    const audioBuffer = await musicResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // Upload to Supabase Storage
    if (!supabase) {
      try {
        supabase = getSupabaseAdmin();
      } catch {
        return NextResponse.json(
          { error: 'Supabase configuration missing for storage' },
          { status: 500 }
        );
      }
    }

    const fileName = `music_${body.mood.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.mp3`;
    const filePath = `music/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, audioBytes, {
        contentType: 'audio/mpeg',
        cacheControl: '86400',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload music: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('assets').getPublicUrl(filePath);

    // Cache the result for reuse
    try {
      await supabase
        .from('asset_cache')
        .insert({
          type: 'music',
          tags: [body.mood.toLowerCase(), body.style?.toLowerCase() ?? 'background'].filter(Boolean),
          description: musicPrompt,
          url: publicUrl,
          source: 'elevenlabs',
          metadata: { duration: body.duration, mood: body.mood, style: body.style ?? null },
          usage_count: 1,
        });
    } catch (err) {
      console.warn('[Music API] Cache insert failed:', err);
    }

    return NextResponse.json({
      musicUrl: publicUrl,
      duration: body.duration,
    });
  } catch (error) {
    console.error('[Music API] Error:', error);

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
