import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/;

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { youtube_url } = await req.json();

    if (!youtube_url || typeof youtube_url !== 'string') {
      return NextResponse.json(
        { error: 'youtube_url is required' },
        { status: 400 }
      );
    }

    if (!YOUTUBE_URL_REGEX.test(youtube_url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(youtube_url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID from URL' },
        { status: 400 }
      );
    }

    // Placeholder: In production, integrate with a video download service
    // (e.g., yt-dlp, RapidAPI YouTube downloader, or custom backend)
    // For now, return the validated URL and video ID for downstream processing

    return NextResponse.json({
      success: true,
      video_id: videoId,
      video_url: youtube_url,
      audio_url: youtube_url, // Placeholder - would be extracted audio URL
      metadata: {
        id: videoId,
        source: 'youtube',
      },
    });
  } catch (err) {
    console.error('Download video error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
