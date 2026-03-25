import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface ViralMoment {
  title: string;
  hook: string;
  start: number;
  end: number;
  viral_score: number;
  reason: string;
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, segments, num_shorts = 5, max_duration = 30 } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'transcript is required' },
        { status: 400 }
      );
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    // Build a timestamped transcript for better context
    let timestampedTranscript = '';
    if (segments && Array.isArray(segments) && segments.length > 0) {
      timestampedTranscript = (segments as Segment[])
        .map((s) => `[${formatTime(s.start)} - ${formatTime(s.end)}] ${s.text}`)
        .join('\n');
    } else {
      timestampedTranscript = transcript;
    }

    const prompt = `Tu es un expert en contenu viral sur les réseaux sociaux (TikTok, YouTube Shorts, Instagram Reels).

Analyse cette transcription vidéo et identifie les ${num_shorts} meilleurs moments pour créer des shorts viraux.

Chaque short doit durer maximum ${max_duration} secondes.

TRANSCRIPTION:
${timestampedTranscript}

Pour chaque moment viral, fournis:
- title: Un titre accrocheur pour le short
- hook: La phrase d'accroche des 3 premières secondes
- start: Timestamp de début (en secondes)
- end: Timestamp de fin (en secondes)
- viral_score: Score de viralité de 0 à 100
- reason: Pourquoi ce moment est viral (1 phrase)

Critères de viralité:
- Émotion forte (surprise, humour, inspiration)
- Information choquante ou contre-intuitive
- Storytelling captivant
- Phrase quotable / mémorable
- Tension dramatique

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "moments": [
    {
      "title": "...",
      "hook": "...",
      "start": 0,
      "end": 30,
      "viral_score": 85,
      "reason": "..."
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from the response
    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from Claude' },
        { status: 500 }
      );
    }

    // Parse JSON from Claude's response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Could not parse JSON from analysis' },
        { status: 500 }
      );
    }

    const analysis = JSON.parse(jsonMatch[0]);
    const moments: ViralMoment[] = (analysis.moments || [])
      .slice(0, num_shorts)
      .sort((a: ViralMoment, b: ViralMoment) => b.viral_score - a.viral_score);

    return NextResponse.json({ moments });
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
