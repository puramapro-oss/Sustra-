import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface VisualScene {
  prompt: string;
  sourceType: 'stock' | 'image_ai' | 'video_ai';
  duration: number;
}

interface VisualsRequestBody {
  scenes: VisualScene[];
}

interface VisualResult {
  url: string;
  type: 'image' | 'video';
  source: 'pexels' | 'fal_ai';
  duration: number;
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

async function checkCache(
  supabase: SupabaseAdmin,
  prompt: string,
  sourceType: string
): Promise<VisualResult | null> {
  const { data } = await supabase
    .from('asset_cache')
    .select('url, type, source, metadata')
    .eq('description', prompt)
    .eq('source', sourceType === 'stock' ? 'pexels' : 'fal_ai')
    .limit(1)
    .maybeSingle();

  if (data) {
    await supabase
      .from('asset_cache')
      .update({ usage_count: (data as { usage_count?: number }).usage_count ?? 0 + 1 })
      .eq('url', data.url);

    return {
      url: data.url,
      type: data.type === 'video' ? 'video' : 'image',
      source: data.source as 'pexels' | 'fal_ai',
      duration: (data.metadata as { duration?: number })?.duration ?? 5,
    };
  }

  return null;
}

async function cacheResult(
  supabase: SupabaseAdmin,
  prompt: string,
  result: VisualResult,
  tags: string[]
): Promise<void> {
  await supabase.from('asset_cache').insert({
    type: result.type === 'video' ? 'video' : 'photo',
    tags,
    description: prompt,
    url: result.url,
    source: result.source,
    metadata: { duration: result.duration },
    usage_count: 1,
  });
}

async function searchPexelsStock(
  prompt: string,
  duration: number
): Promise<VisualResult> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) {
    throw new Error('PEXELS_API_KEY not configured');
  }

  const keywords = prompt.split(' ').slice(0, 5).join(' ');

  const videoParams = new URLSearchParams({
    query: keywords,
    per_page: '5',
    page: '1',
  });
  const videoResponse = await fetch(
    `https://api.pexels.com/videos/search?${videoParams}`,
    { headers: { Authorization: pexelsKey } }
  );

  if (videoResponse.ok) {
    const videoData = await videoResponse.json();
    if (videoData.videos && videoData.videos.length > 0) {
      const video = videoData.videos[0];
      const hdFile = video.video_files?.find(
        (f: { quality: string; file_type: string }) =>
          f.quality === 'hd' && f.file_type === 'video/mp4'
      );
      const bestFile = hdFile || video.video_files?.[0];
      if (bestFile) {
        return {
          url: bestFile.link,
          type: 'video',
          source: 'pexels',
          duration: Math.min(video.duration || duration, duration),
        };
      }
    }
  }

  const photoParams = new URLSearchParams({
    query: keywords,
    per_page: '3',
    page: '1',
  });
  const photoResponse = await fetch(
    `https://api.pexels.com/v1/search?${photoParams}`,
    { headers: { Authorization: pexelsKey } }
  );

  if (!photoResponse.ok) {
    throw new Error(`Pexels API error: ${photoResponse.status}`);
  }

  const photoData = await photoResponse.json();
  if (!photoData.photos || photoData.photos.length === 0) {
    throw new Error(`No Pexels results found for: ${keywords}`);
  }

  return {
    url: photoData.photos[0].src.large2x || photoData.photos[0].src.original,
    type: 'image',
    source: 'pexels',
    duration,
  };
}

async function generateWithFluxPro(
  prompt: string,
  duration: number
): Promise<VisualResult> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error('FAL_KEY not configured');
  }

  const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: { width: 1024, height: 1024 },
      num_images: 1,
      enable_safety_checker: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`fal.ai Flux Pro error (${response.status}): ${errorText}`);
  }

  const queueData = await response.json();
  const result = await pollFalResult<{
    images: { url: string; width: number; height: number }[];
  }>(queueData.status_url, queueData.response_url, falKey);

  if (!result.images || result.images.length === 0) {
    throw new Error('No images returned from Flux Pro');
  }

  return {
    url: result.images[0].url,
    type: 'image',
    source: 'fal_ai',
    duration,
  };
}

async function generateAIVideo(
  prompt: string,
  duration: number
): Promise<VisualResult> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error('FAL_KEY not configured');
  }

  const response = await fetch(
    'https://queue.fal.run/fal-ai/kling-video/v2.5/turbo',
    {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration: Math.min(duration, 10),
        aspect_ratio: '16:9',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`fal.ai Kling error (${response.status}): ${errorText}`);
  }

  const queueData = await response.json();
  const result = await pollFalResult<{
    video: { url: string; content_type: string };
  }>(queueData.status_url, queueData.response_url, falKey, 600_000, 5_000);

  if (!result.video || !result.video.url) {
    throw new Error('No video returned from Kling');
  }

  return {
    url: result.video.url,
    type: 'video',
    source: 'fal_ai',
    duration: Math.min(duration, 10),
  };
}

async function pollFalResult<T>(
  statusUrl: string,
  responseUrl: string,
  falKey: string,
  maxWaitMs: number = 300_000,
  pollIntervalMs: number = 3_000
): Promise<T> {
  const startTime = Date.now();
  const headers = {
    Authorization: `Key ${falKey}`,
    'Content-Type': 'application/json',
  };

  while (Date.now() - startTime < maxWaitMs) {
    const statusResponse = await fetch(statusUrl, { headers });
    if (!statusResponse.ok) {
      throw new Error(`fal.ai status check failed: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetch(responseUrl, { headers });
      if (!resultResponse.ok) {
        throw new Error(`fal.ai result fetch failed: ${resultResponse.status}`);
      }
      return resultResponse.json() as Promise<T>;
    }

    if (statusData.status === 'FAILED') {
      throw new Error('fal.ai generation failed');
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('fal.ai generation timed out');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: VisualsRequestBody = await request.json();

    if (!body.scenes || !Array.isArray(body.scenes) || body.scenes.length === 0) {
      return NextResponse.json(
        { error: 'scenes array is required and must not be empty' },
        { status: 400 }
      );
    }

    for (let i = 0; i < body.scenes.length; i++) {
      const scene = body.scenes[i];
      if (!scene.prompt || typeof scene.prompt !== 'string') {
        return NextResponse.json(
          { error: `Scene ${i}: prompt is required` },
          { status: 400 }
        );
      }
      if (!['stock', 'image_ai', 'video_ai'].includes(scene.sourceType)) {
        return NextResponse.json(
          { error: `Scene ${i}: sourceType must be 'stock', 'image_ai', or 'video_ai'` },
          { status: 400 }
        );
      }
      if (typeof scene.duration !== 'number' || scene.duration <= 0) {
        return NextResponse.json(
          { error: `Scene ${i}: duration must be a positive number` },
          { status: 400 }
        );
      }
    }

    let supabase: SupabaseAdmin | null = null;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      // Cache unavailable, proceed without caching
    }

    const visuals: VisualResult[] = [];

    for (const scene of body.scenes) {
      try {
        if (supabase) {
          const cached = await checkCache(supabase, scene.prompt, scene.sourceType);
          if (cached) {
            visuals.push(cached);
            continue;
          }
        }

        let result: VisualResult;

        switch (scene.sourceType) {
          case 'stock':
            result = await searchPexelsStock(scene.prompt, scene.duration);
            break;
          case 'image_ai':
            result = await generateWithFluxPro(scene.prompt, scene.duration);
            break;
          case 'video_ai':
            result = await generateAIVideo(scene.prompt, scene.duration);
            break;
          default:
            result = await searchPexelsStock(scene.prompt, scene.duration);
        }

        if (supabase) {
          const tags = scene.prompt
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .slice(0, 10);
          await cacheResult(supabase, scene.prompt, result, tags).catch((err) => {
            console.warn('[Visuals API] Cache write failed:', err);
          });
        }

        visuals.push(result);
      } catch (sceneError) {
        console.error(
          `[Visuals API] Scene generation failed for "${scene.prompt}":`,
          sceneError
        );
        visuals.push({
          url: '',
          type: 'image',
          source: 'pexels',
          duration: scene.duration,
        });
      }
    }

    return NextResponse.json({ visuals });
  } catch (error) {
    console.error('[Visuals API] Error:', error);

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
