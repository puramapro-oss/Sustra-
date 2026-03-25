import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface TranscribeSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { audio_url } = await req.json();

    if (!audio_url || typeof audio_url !== 'string') {
      return NextResponse.json(
        { error: 'audio_url is required' },
        { status: 400 }
      );
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Call ElevenLabs Scribe (Speech-to-Text) API
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audio_url,
        language_code: 'fr',
        diarize: true,
        timestamps_granularity: 'word',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs Scribe error:', response.status, errorText);

      // Fallback: return empty transcript so pipeline can continue
      return NextResponse.json({
        transcript: '',
        segments: [],
        language: 'fr',
        error_detail: `ElevenLabs returned ${response.status}`,
      });
    }

    const data = await response.json();

    // Parse ElevenLabs response into our segment format
    const segments: TranscribeSegment[] = [];
    let fullTranscript = '';

    if (data.utterances && Array.isArray(data.utterances)) {
      for (const utterance of data.utterances) {
        segments.push({
          start: utterance.start || 0,
          end: utterance.end || 0,
          text: utterance.text || '',
          speaker: utterance.speaker || undefined,
        });
        fullTranscript += (fullTranscript ? ' ' : '') + (utterance.text || '');
      }
    } else if (data.text) {
      fullTranscript = data.text;
      // If no utterances but has words with timestamps
      if (data.words && Array.isArray(data.words)) {
        let currentSegment: TranscribeSegment | null = null;
        const SEGMENT_GAP = 1.5; // seconds

        for (const word of data.words) {
          if (!currentSegment || (word.start - (currentSegment.end || 0)) > SEGMENT_GAP) {
            if (currentSegment) segments.push(currentSegment);
            currentSegment = {
              start: word.start || 0,
              end: word.end || 0,
              text: word.text || '',
            };
          } else {
            currentSegment.end = word.end || currentSegment.end;
            currentSegment.text += ' ' + (word.text || '');
          }
        }
        if (currentSegment) segments.push(currentSegment);
      }
    }

    return NextResponse.json({
      transcript: fullTranscript,
      segments,
      language: data.language_code || 'fr',
      duration: data.duration || null,
    });
  } catch (err) {
    console.error('Transcribe error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
