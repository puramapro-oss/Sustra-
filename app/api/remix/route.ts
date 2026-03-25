import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ShotstackEdit } from '@/lib/types';

interface RemixRequestBody {
  videoId: string;
  shotstackJson: ShotstackEdit;
  instructions?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const body: RemixRequestBody = await request.json();

    if (!body.videoId || typeof body.videoId !== 'string') {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    if (!body.shotstackJson) {
      return NextResponse.json(
        { error: 'shotstackJson is required' },
        { status: 400 }
      );
    }

    if (!body.shotstackJson.timeline || !body.shotstackJson.output) {
      return NextResponse.json(
        { error: 'shotstackJson must contain timeline and output' },
        { status: 400 }
      );
    }

    if (
      !body.shotstackJson.timeline.tracks ||
      !Array.isArray(body.shotstackJson.timeline.tracks)
    ) {
      return NextResponse.json(
        { error: 'shotstackJson.timeline.tracks must be an array' },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are an expert video editor who works with Shotstack Edit API v1 JSON timelines.

Your task is to analyze and remix video edits to improve engagement, pacing, and visual impact.

You understand all Shotstack concepts:
- Timeline with tracks and clips
- Asset types: video, image, audio, title, html
- Transitions: fade, reveal, wipeLeft, wipeRight, slideLeft, slideRight, slideUp, slideDown, zoom
- Effects and filters
- Soundtrack with volume control
- Output settings: format, resolution, aspectRatio

When remixing:
- Improve transition variety and timing
- Enhance text overlays for readability and impact
- Adjust clip durations for better pacing
- Add or modify Ken Burns effects on images
- Ensure audio levels are balanced
- Optimize for the target platform (short=TikTok/Reels, long=YouTube)

CRITICAL: Return ONLY a valid JSON object that matches the Shotstack Edit schema exactly. No markdown, no explanation, no code blocks.`;

    const userPrompt = body.instructions
      ? `Remix this Shotstack edit with these specific instructions: ${body.instructions}

${JSON.stringify(body.shotstackJson, null, 2)}

Return the complete modified Shotstack edit JSON only.`
      : `Analyze and remix this Shotstack edit to make it more engaging. Improve transitions, pacing, text overlays, and overall visual impact.

${JSON.stringify(body.shotstackJson, null, 2)}

Return the complete modified Shotstack edit JSON only.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from Claude' },
        { status: 500 }
      );
    }

    let responseText = textBlock.text.trim();
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      responseText = jsonMatch[1].trim();
    }

    let newShotstackJson: ShotstackEdit;
    try {
      newShotstackJson = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse remixed Shotstack JSON from Claude' },
        { status: 500 }
      );
    }

    // Validate basic structure
    if (!newShotstackJson.timeline || !newShotstackJson.output) {
      return NextResponse.json(
        { error: 'Claude returned invalid Shotstack structure (missing timeline or output)' },
        { status: 500 }
      );
    }

    if (
      !newShotstackJson.timeline.tracks ||
      !Array.isArray(newShotstackJson.timeline.tracks) ||
      newShotstackJson.timeline.tracks.length === 0
    ) {
      return NextResponse.json(
        { error: 'Claude returned invalid Shotstack structure (no tracks)' },
        { status: 500 }
      );
    }

    // Validate all clips have required fields
    for (const track of newShotstackJson.timeline.tracks) {
      if (!track.clips || !Array.isArray(track.clips)) {
        return NextResponse.json(
          { error: 'Claude returned invalid track (missing clips array)' },
          { status: 500 }
        );
      }
      for (const clip of track.clips) {
        if (!clip.asset || typeof clip.start !== 'number' || typeof clip.length !== 'number') {
          return NextResponse.json(
            { error: 'Claude returned invalid clip (missing asset, start, or length)' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      newShotstackJson,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('[Remix API] Error:', error);

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
