import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface ChatRequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
}

const SYSTEM_PROMPT = `You are Sutra AI, the intelligent assistant for the Sutra by Purama platform — an AI-powered video creation tool that helps creators produce viral short-form and long-form videos.

Your capabilities:
- Help users create video scripts optimized for engagement and virality
- Guide users through the video generation pipeline (script, voice, visuals, music, render)
- Suggest trending topics, formats, and styles
- Explain platform features: templates, autopilot series, voice cloning, remix editing
- Help troubleshoot issues with video generation or publishing
- Provide tips on YouTube growth, SEO, thumbnails, and content strategy
- Assist with Shotstack timeline editing and visual composition

Platform details:
- Video formats: Shorts (9:16), Long-form (16:9), Photo/Carousel (1:1)
- Voice styles: Cinematic, Energetic, Calm, Documentary (male/female)
- Visual styles: Cinematic, Documentary, Minimalist, Vibrant, Retro, Dark Moody, Neon, Pastel, Corporate, Hand-drawn
- Visual sources: Stock footage (Pexels), AI images (Flux Pro), AI video (Kling/Sora)
- Plans: Free, Starter, Creator, Empire

Always be helpful, concise, and action-oriented. When suggesting video ideas, think about virality factors: hook strength, retention patterns, trending topics, and emotional engagement.`;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const body: ChatRequestBody = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      );
    }

    for (const msg of body.messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          { error: 'Each message must have a role and content' },
          { status: 400 }
        );
      }
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        return NextResponse.json(
          { error: 'Message role must be "user" or "assistant"' },
          { status: 400 }
        );
      }
    }

    const client = new Anthropic({ apiKey });

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: body.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
          }

          const finalMessage = await stream.finalMessage();
          const doneChunk = `data: ${JSON.stringify({
            done: true,
            usage: {
              input_tokens: finalMessage.usage.input_tokens,
              output_tokens: finalMessage.usage.output_tokens,
            },
          })}\n\n`;
          controller.enqueue(encoder.encode(doneChunk));
          controller.close();
        } catch (streamError) {
          const errorChunk = `data: ${JSON.stringify({
            error: streamError instanceof Error ? streamError.message : 'Stream error',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorChunk));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);

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
