import { NextRequest, NextResponse } from 'next/server';
import type { ShotstackEdit } from '@/lib/types';

const SHOTSTACK_API_KEY = () => {
  const key = process.env.SHOTSTACK_API_KEY;
  if (!key) throw new Error('SHOTSTACK_API_KEY not configured');
  return key;
};

const SHOTSTACK_RENDER_URL = 'https://api.shotstack.io/edit/stage/render';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = SHOTSTACK_API_KEY();

    const body = await request.json();

    if (!body.timeline) {
      return NextResponse.json(
        { error: 'timeline is required in request body' },
        { status: 400 }
      );
    }

    if (!body.timeline.tracks || !Array.isArray(body.timeline.tracks) || body.timeline.tracks.length === 0) {
      return NextResponse.json(
        { error: 'timeline.tracks must be a non-empty array' },
        { status: 400 }
      );
    }

    // Build the Shotstack edit payload
    const shotstackEdit: ShotstackEdit = {
      timeline: body.timeline,
      output: body.output ?? {
        format: 'mp4',
        resolution: '1080',
        aspectRatio: body.timeline.tracks[0]?.clips?.[0]?.fit === 'cover' ? '9:16' : '16:9',
      },
    };

    // Include callback URL if configured
    const callbackUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shotstack`
      : undefined;

    if (callbackUrl) {
      shotstackEdit.callback = callbackUrl;
    }

    const renderResponse = await fetch(SHOTSTACK_RENDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(shotstackEdit),
    });

    if (!renderResponse.ok) {
      const errorData = await renderResponse.json().catch(() => null);
      const errorMessage =
        errorData?.message || errorData?.error || `Shotstack API error: ${renderResponse.status}`;
      return NextResponse.json(
        { error: errorMessage },
        { status: renderResponse.status }
      );
    }

    const renderData = await renderResponse.json();

    if (!renderData.success || !renderData.response?.id) {
      return NextResponse.json(
        { error: 'Shotstack did not return a valid render ID' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      renderId: renderData.response.id,
      status: renderData.response.status || 'queued',
    });
  } catch (error) {
    console.error('[Render API] POST Error:', error);

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = SHOTSTACK_API_KEY();

    const { searchParams } = new URL(request.url);
    const renderId = searchParams.get('renderId');

    if (!renderId || typeof renderId !== 'string' || renderId.trim().length === 0) {
      return NextResponse.json(
        { error: 'renderId query parameter is required' },
        { status: 400 }
      );
    }

    const statusResponse = await fetch(`${SHOTSTACK_RENDER_URL}/${renderId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!statusResponse.ok) {
      const errorData = await statusResponse.json().catch(() => null);
      const errorMessage =
        errorData?.message || errorData?.error || `Shotstack status check failed: ${statusResponse.status}`;
      return NextResponse.json(
        { error: errorMessage },
        { status: statusResponse.status }
      );
    }

    const statusData = await statusResponse.json();
    const renderInfo = statusData.response;

    if (!renderInfo) {
      return NextResponse.json(
        { error: 'Invalid response from Shotstack' },
        { status: 500 }
      );
    }

    const result: {
      status: string;
      url?: string;
      progress?: number;
      error?: string;
    } = {
      status: renderInfo.status,
    };

    if (renderInfo.url) {
      result.url = renderInfo.url;
    }

    if (renderInfo.status === 'rendering') {
      // Shotstack doesn't always return progress, estimate based on time
      const created = new Date(renderInfo.created).getTime();
      const now = Date.now();
      const elapsed = (now - created) / 1000;
      // Rough estimate: most renders complete in 30-120 seconds
      result.progress = Math.min(Math.round((elapsed / 60) * 100), 95);
    } else if (renderInfo.status === 'done') {
      result.progress = 100;
    } else if (renderInfo.status === 'failed') {
      result.error = renderInfo.error || 'Render failed';
      result.progress = 0;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Render API] GET Error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
