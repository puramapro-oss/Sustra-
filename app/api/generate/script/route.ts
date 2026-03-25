import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type {
  VideoFormat,
  VoiceStyle,
  VisualStyle,
  Scene,
  Script,
  TransitionType,
} from '@/lib/types';

interface ScriptRequestBody {
  topic: string;
  format: VideoFormat;
  voiceStyle: VoiceStyle;
  visualStyle: VisualStyle;
  options?: {
    targetDuration?: number;
    optimizeCost?: boolean;
    language?: string;
    tone?: string;
    targetAudience?: string;
  };
}

const FORMAT_CONFIGS: Record<
  VideoFormat,
  { aspectRatio: string; minScenes: number; maxScenes: number; defaultDuration: number }
> = {
  short: { aspectRatio: '9:16', minScenes: 4, maxScenes: 8, defaultDuration: 45 },
  long: { aspectRatio: '16:9', minScenes: 10, maxScenes: 25, defaultDuration: 480 },
  photo: { aspectRatio: '1:1', minScenes: 1, maxScenes: 10, defaultDuration: 30 },
};

function buildScriptPrompt(body: ScriptRequestBody): string {
  const config = FORMAT_CONFIGS[body.format];
  const targetDuration = body.options?.targetDuration ?? config.defaultDuration;
  const language = body.options?.language ?? 'English';
  const tone = body.options?.tone ?? 'engaging and informative';
  const audience = body.options?.targetAudience ?? 'general social media audience';

  return `You are an expert viral video scriptwriter. Create a complete video script for the following:

Topic: ${body.topic}
Format: ${body.format} (${config.aspectRatio})
Voice Style: ${body.voiceStyle}
Visual Style: ${body.visualStyle}
Target Duration: ~${targetDuration} seconds
Language: ${language}
Tone: ${tone}
Target Audience: ${audience}
${body.options?.optimizeCost ? 'IMPORTANT: Prefer stock footage over AI-generated visuals to reduce cost.' : ''}

Return a JSON object with this exact structure:
{
  "title": "Catchy, SEO-optimized title",
  "description": "YouTube/social media description with keywords",
  "hashtags": ["relevant", "trending", "hashtags"],
  "thumbnail_prompt": "Detailed prompt for thumbnail image generation",
  "music_style": "Description of background music mood and style",
  "hook": "Opening hook text (first 3 seconds)",
  "scenes": [
    {
      "index": 0,
      "narration": "What the narrator says in this scene",
      "visual_description": "Detailed description for visual generation/search",
      "visual_source": "stock|image_ai|video_ai",
      "visual_keywords": ["keyword1", "keyword2"],
      "duration_seconds": 5,
      "transition": "fade|reveal|wipeLeft|wipeRight|slideLeft|slideRight|slideUp|slideDown|zoom",
      "text_overlay": "Optional text shown on screen or null",
      "importance": "low|medium|high|hero"
    }
  ],
  "cta": "Call to action text for the end",
  "total_duration_seconds": ${targetDuration},
  "viral_score": 85,
  "tags": ["content", "tags", "for", "categorization"]
}

Rules:
- Generate between ${config.minScenes} and ${config.maxScenes} scenes
- The first scene MUST have a powerful hook (3 seconds or less narration)
- Each scene's narration should be natural spoken language
- visual_source should be "stock" for generic/common visuals, "image_ai" for unique/specific stills, "video_ai" for dynamic/action scenes
- Transitions should vary but remain cohesive with the ${body.visualStyle} style
- viral_score should be your honest assessment (0-100) of viral potential
- The total of all scene durations should approximately equal total_duration_seconds
- Text overlays should be used sparingly for emphasis
- Hero importance scenes are the most visually impactful moments

Return ONLY the JSON object, no markdown fences or extra text.`;
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

    const body: ScriptRequestBody = await request.json();

    if (!body.topic || typeof body.topic !== 'string' || body.topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }
    if (!body.format || !FORMAT_CONFIGS[body.format]) {
      return NextResponse.json(
        { error: 'Valid format is required: short, long, or photo' },
        { status: 400 }
      );
    }
    if (!body.voiceStyle) {
      return NextResponse.json({ error: 'voiceStyle is required' }, { status: 400 });
    }
    if (!body.visualStyle) {
      return NextResponse.json({ error: 'visualStyle is required' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: buildScriptPrompt(body),
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from Claude' },
        { status: 500 }
      );
    }

    let scriptJson: string = textContent.text.trim();
    const jsonMatch = scriptJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      scriptJson = jsonMatch[1].trim();
    }

    let script: Script;
    try {
      script = JSON.parse(scriptJson);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse script JSON from Claude response' },
        { status: 500 }
      );
    }

    if (!script.title || !script.scenes || !Array.isArray(script.scenes)) {
      return NextResponse.json(
        { error: 'Invalid script structure returned from Claude' },
        { status: 500 }
      );
    }

    script.scenes = script.scenes.map((scene: Scene, idx: number) => ({
      index: idx,
      narration: scene.narration || '',
      visual_description: scene.visual_description || '',
      visual_source: scene.visual_source || 'stock',
      visual_keywords: scene.visual_keywords || [],
      duration_seconds: scene.duration_seconds || 5,
      transition: (scene.transition || 'fade') as TransitionType,
      text_overlay: scene.text_overlay || null,
      importance: scene.importance || 'medium',
    }));

    script.total_duration_seconds =
      script.scenes.reduce((sum: number, s: Scene) => sum + s.duration_seconds, 0);

    return NextResponse.json({
      script,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('[Script Generation API] Error:', error);

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
