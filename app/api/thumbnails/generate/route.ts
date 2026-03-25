import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

interface GenerateRequestBody {
  video_id: string;
  video_title: string;
  video_description?: string;
  format: '16:9' | '9:16';
}

interface ThumbnailBrief {
  text_overlay: string;
  text_color: string;
  text_outline_color: string;
  image_prompt: string;
  dominant_emotion: string;
  background_style: string;
  accent_elements: string[];
  layout: string;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

const BRIEF_SYSTEM_PROMPT = `Tu es un expert en miniatures YouTube et réseaux sociaux. Pour cette vidéo, crée un brief de miniature qui maximise le taux de clic (CTR). Règles: Texte 3-5 mots MAX en majuscules, visuel central fort, contraste fort, émotion immédiate. Retourne en JSON: {text_overlay, text_color, text_outline_color, image_prompt, dominant_emotion, background_style, accent_elements, layout}`;

async function generateBrief(
  anthropic: Anthropic,
  videoTitle: string,
  videoDescription: string
): Promise<ThumbnailBrief> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: BRIEF_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Titre de la vidéo: ${videoTitle}\nDescription: ${videoDescription || 'Aucune description'}`,
      },
    ],
  });

  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let jsonStr = textContent.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  return JSON.parse(jsonStr) as ThumbnailBrief;
}

async function generateImage(
  prompt: string,
  format: '16:9' | '9:16'
): Promise<string> {
  const imageSize =
    format === '16:9'
      ? { width: 1280, height: 720 }
      : { width: 1080, height: 1920 };

  const queueResponse = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, image_size: imageSize }),
  });

  if (!queueResponse.ok) {
    const errText = await queueResponse.text().catch(() => '');
    throw new Error(`fal.ai queue request failed (${queueResponse.status}): ${errText}`);
  }

  const queueData = await queueResponse.json();
  const statusUrl: string = queueData.status_url || queueData.response_url;

  if (!statusUrl) {
    // Synchronous response — image returned directly
    if (queueData.images?.[0]?.url) {
      return queueData.images[0].url;
    }
    throw new Error('fal.ai did not return a status URL or image');
  }

  // Poll for result
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pollResponse = await fetch(statusUrl, {
      headers: { Authorization: `Key ${process.env.FAL_KEY}` },
    });

    if (!pollResponse.ok) continue;

    const pollData = await pollResponse.json();

    if (pollData.status === 'COMPLETED' || pollData.images) {
      const imageUrl = pollData.images?.[0]?.url;
      if (imageUrl) return imageUrl;
    }

    if (pollData.status === 'FAILED') {
      throw new Error(`fal.ai image generation failed: ${pollData.error || 'Unknown error'}`);
    }
  }

  throw new Error('fal.ai image generation timed out');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateRequestBody = await request.json();

    if (!body.video_id) {
      return NextResponse.json({ error: 'video_id is required' }, { status: 400 });
    }
    if (!body.video_title) {
      return NextResponse.json({ error: 'video_title is required' }, { status: 400 });
    }
    if (!body.format || !['16:9', '9:16'].includes(body.format)) {
      return NextResponse.json({ error: 'format must be "16:9" or "9:16"' }, { status: 400 });
    }

    // Verify the video belongs to the user
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, user_id')
      .eq('id', body.video_id)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: video does not belong to you' }, { status: 403 });
    }

    // Determine variant number
    const { count } = await supabase
      .from('thumbnails')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', body.video_id);

    const variantNumber = (count || 0) + 1;

    // Step 1: Generate brief with Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    const brief = await generateBrief(anthropic, body.video_title, body.video_description || '');

    // Step 2: Generate image with fal.ai
    const imageUrl = await generateImage(brief.image_prompt, body.format);

    // Step 3: Save to thumbnails table
    const { data: thumbnail, error: insertError } = await supabase
      .from('thumbnails')
      .insert({
        video_id: body.video_id,
        user_id: user.id,
        image_url: imageUrl,
        text_overlay: brief.text_overlay,
        text_color: brief.text_color,
        text_outline_color: brief.text_outline_color,
        layout: brief.layout,
        dominant_emotion: brief.dominant_emotion,
        is_selected: variantNumber === 1,
        variant_number: variantNumber,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Thumbnail Generate] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save thumbnail' }, { status: 500 });
    }

    // If this is the first thumbnail, set it on the video
    if (variantNumber === 1) {
      await supabase
        .from('videos')
        .update({ thumbnail_url: imageUrl, thumbnail_id: thumbnail.id })
        .eq('id', body.video_id);
    }

    return NextResponse.json({
      thumbnail,
      brief: {
        text_overlay: brief.text_overlay,
        text_color: brief.text_color,
        text_outline_color: brief.text_outline_color,
        dominant_emotion: brief.dominant_emotion,
        background_style: brief.background_style,
        accent_elements: brief.accent_elements,
        layout: brief.layout,
        image_prompt: brief.image_prompt,
      },
    });
  } catch (error) {
    console.error('[Thumbnail Generate] Error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
