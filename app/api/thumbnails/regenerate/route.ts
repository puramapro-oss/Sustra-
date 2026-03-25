import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

interface RegenerateRequestBody {
  thumbnail_id: string;
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
  videoDescription: string,
  variantNumber: number
): Promise<ThumbnailBrief> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: BRIEF_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Titre de la vidéo: ${videoTitle}\nDescription: ${videoDescription || 'Aucune description'}\n\nCeci est la variante #${variantNumber}. Propose un style visuel DIFFÉRENT des variantes précédentes. Sois créatif et original.`,
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
    if (queueData.images?.[0]?.url) {
      return queueData.images[0].url;
    }
    throw new Error('fal.ai did not return a status URL or image');
  }

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

    const body: RegenerateRequestBody = await request.json();

    if (!body.thumbnail_id) {
      return NextResponse.json({ error: 'thumbnail_id is required' }, { status: 400 });
    }

    // Fetch existing thumbnail
    const { data: existingThumbnail, error: thumbError } = await supabase
      .from('thumbnails')
      .select('*')
      .eq('id', body.thumbnail_id)
      .single();

    if (thumbError || !existingThumbnail) {
      return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 });
    }

    if (existingThumbnail.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: thumbnail does not belong to you' }, { status: 403 });
    }

    // Fetch video info
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, description')
      .eq('id', existingThumbnail.video_id)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Associated video not found' }, { status: 404 });
    }

    // Determine new variant number
    const { count } = await supabase
      .from('thumbnails')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', existingThumbnail.video_id);

    const variantNumber = (count || 0) + 1;

    // Determine format from original thumbnail layout or default to 16:9
    const format: '16:9' | '9:16' = '16:9';

    // Generate new brief with Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    const brief = await generateBrief(
      anthropic,
      video.title || '',
      video.description || '',
      variantNumber
    );

    // Generate image with fal.ai
    const imageUrl = await generateImage(brief.image_prompt, format);

    // Save new thumbnail
    const { data: thumbnail, error: insertError } = await supabase
      .from('thumbnails')
      .insert({
        video_id: existingThumbnail.video_id,
        user_id: user.id,
        image_url: imageUrl,
        text_overlay: brief.text_overlay,
        text_color: brief.text_color,
        text_outline_color: brief.text_outline_color,
        layout: brief.layout,
        dominant_emotion: brief.dominant_emotion,
        is_selected: false,
        variant_number: variantNumber,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Thumbnail Regenerate] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save thumbnail' }, { status: 500 });
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
    console.error('[Thumbnail Regenerate] Error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
