import Anthropic from '@anthropic-ai/sdk';
import type {
  Script,
  VideoFormat,
  VisualStyle,
  VoiceStyle,
  ChatMessage,
  ShotstackEdit,
  TransitionType,
} from './types';

// ============================================================================
// Client
// ============================================================================

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  }
  return _anthropic;
}

const MODEL = 'claude-sonnet-4-20250514';

// ============================================================================
// Script Generation
// ============================================================================

export async function generateScript(
  topic: string,
  format: VideoFormat,
  style: VisualStyle,
  options?: {
    voiceStyle?: VoiceStyle;
    targetDuration?: number;
    tone?: string;
    audience?: string;
    language?: string;
  }
): Promise<Script> {
  const targetDuration = options?.targetDuration ?? (format === 'short' ? 30 : 180);
  const scenesCount = format === 'short' ? Math.ceil(targetDuration / 5) : Math.ceil(targetDuration / 15);

  const systemPrompt = `You are an expert video scriptwriter who creates viral, engaging content. You specialize in ${format === 'short' ? 'short-form vertical videos (TikTok, Reels, YouTube Shorts)' : 'long-form YouTube videos'}.

Your scripts MUST:
- Start with a powerful hook that stops scrolling
- Use conversational, engaging language
- Include clear visual descriptions for each scene
- Have a strong call-to-action
- Target approximately ${targetDuration} seconds total duration
- Be split into exactly ${scenesCount} scenes

IMPORTANT: Respond ONLY with valid JSON matching the exact schema below. No markdown, no code blocks, no explanation.`;

  const userPrompt = `Create a ${format} video script about: "${topic}"

Visual style: ${style}
${options?.tone ? `Tone: ${options.tone}` : ''}
${options?.audience ? `Target audience: ${options.audience}` : ''}
${options?.language ? `Language: ${options.language}` : 'Language: English'}

Return JSON with this exact schema:
{
  "title": "string",
  "hook": "string (the opening hook text)",
  "scenes": [
    {
      "index": number,
      "narration": "string (voiceover text for this scene)",
      "visual_description": "string (detailed description for image/video generation)",
      "visual_source": "stock" | "image_ai" | "video_ai",
      "visual_keywords": ["string"],
      "duration_seconds": number,
      "transition": "fade" | "slideLeft" | "slideRight" | "zoom" | "wipeLeft" | "wipeRight",
      "text_overlay": "string or null",
      "importance": "low" | "medium" | "high" | "hero"
    }
  ],
  "cta": "string (call to action)",
  "total_duration_seconds": number,
  "viral_score": number (1-100),
  "tags": ["string"]
}`;

  const response = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const cleaned = textBlock.text.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned) as Script;

  // Validate and ensure proper types
  if (!parsed.title || !parsed.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error('Invalid script structure returned from Claude');
  }

  parsed.scenes = parsed.scenes.map((scene, idx) => ({
    ...scene,
    index: idx,
    transition: (scene.transition || 'fade') as TransitionType,
    importance: scene.importance || 'medium',
    visual_source: scene.visual_source || 'stock',
    visual_keywords: scene.visual_keywords || [],
  }));

  parsed.total_duration_seconds = parsed.scenes.reduce(
    (sum, s) => sum + s.duration_seconds,
    0
  );

  return parsed;
}

// ============================================================================
// Viral Score Analysis
// ============================================================================

export async function generateViralScore(script: Script): Promise<{
  score: number;
  feedback: string[];
  suggestions: string[];
}> {
  const response = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `You are a viral content analyst. Analyze video scripts and provide actionable feedback. Respond ONLY with valid JSON, no markdown.`,
    messages: [
      {
        role: 'user',
        content: `Analyze this video script for viral potential:

Title: ${script.title}
Hook: ${script.hook}
Scenes: ${script.scenes.map((s) => s.narration).join(' | ')}
CTA: ${script.cta}
Duration: ${script.total_duration_seconds}s
Tags: ${script.tags.join(', ')}

Return JSON:
{
  "score": number (1-100),
  "feedback": ["string (specific positive/negative observations)"],
  "suggestions": ["string (actionable improvements)"]
}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const cleaned = textBlock.text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}

// ============================================================================
// Hook Generation
// ============================================================================

export async function generateHooks(
  topic: string,
  count: number = 5
): Promise<{ hooks: { text: string; style: string; estimated_retention: number }[] }> {
  const response = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `You are an expert at writing scroll-stopping hooks for short-form video. Respond ONLY with valid JSON, no markdown.`,
    messages: [
      {
        role: 'user',
        content: `Generate ${count} different hook alternatives for a video about: "${topic}"

Each hook should use a different technique (question, bold claim, statistic, story, controversy).

Return JSON:
{
  "hooks": [
    {
      "text": "string",
      "style": "question" | "bold_claim" | "statistic" | "story" | "controversy",
      "estimated_retention": number (percentage 0-100)
    }
  ]
}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const cleaned = textBlock.text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}

// ============================================================================
// Remix Shotstack Edit
// ============================================================================

export async function remixEdit(
  shotstackJson: ShotstackEdit,
  instructions?: string
): Promise<ShotstackEdit> {
  const response = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: `You are an expert video editor. You modify Shotstack JSON timelines to improve videos.
You understand the Shotstack Edit API v1 format completely.
Respond ONLY with the modified valid JSON (the full Shotstack edit object), no markdown or explanation.`,
    messages: [
      {
        role: 'user',
        content: `Here is a Shotstack edit JSON. ${instructions ? `Apply these modifications: ${instructions}` : 'Improve it by enhancing transitions, timing, and text overlays for better engagement.'}

${JSON.stringify(shotstackJson, null, 2)}

Return the modified Shotstack edit JSON only.`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const cleaned = textBlock.text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}

// ============================================================================
// Chat Response
// ============================================================================

export async function chatResponse(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<{ content: string; action?: string; videoId?: string; suggestion?: string }> {
  const defaultSystem = `You are Sustra AI, a helpful video creation assistant. You help users create videos, improve scripts, choose styles, and optimize their content for virality.

You can suggest:
- Script improvements
- Visual style changes
- Better hooks
- Optimal video length
- Trending topics

When users ask to create or modify videos, provide actionable suggestions. Be concise and friendly.`;

  const anthropicMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const response = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt || defaultSystem,
    messages: anthropicMessages,
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return { content: textBlock.text };
}
