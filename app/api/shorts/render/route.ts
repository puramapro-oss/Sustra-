import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface ViralMoment {
  title: string;
  hook: string;
  start: number;
  end: number;
  viral_score: number;
}

interface SubtitleClip {
  asset: {
    type: string;
    text: string;
    style?: string;
    color?: string;
    size?: string;
    background?: string;
    position?: string;
  };
  start: number;
  length: number;
  position?: string;
  offset?: { x: number; y: number };
}

const SUBTITLE_CONFIGS: Record<string, { style: string; size: string; color: string; background: string; position: string }> = {
  bold: {
    style: 'blockbuster',
    size: 'large',
    color: '#ffffff',
    background: '#000000aa',
    position: 'bottom',
  },
  karaoke: {
    style: 'karaoke',
    size: 'medium',
    color: '#8b5cf6',
    background: '#00000080',
    position: 'center',
  },
  minimal: {
    style: 'minimal',
    size: 'small',
    color: '#ffffffcc',
    background: 'transparent',
    position: 'bottom',
  },
  none: {
    style: 'none',
    size: 'small',
    color: 'transparent',
    background: 'transparent',
    position: 'bottom',
  },
};

function buildShotstackTimeline(
  videoUrl: string,
  moment: ViralMoment,
  subtitleStyle: string
) {
  const duration = moment.end - moment.start;
  const subConfig = SUBTITLE_CONFIGS[subtitleStyle] || SUBTITLE_CONFIGS.bold;

  const tracks: Array<{ clips: Array<Record<string, unknown>> }> = [];

  // Video track - 9:16 crop
  const videoTrack = {
    clips: [
      {
        asset: {
          type: 'video',
          src: videoUrl,
          trim: moment.start,
          volume: 1,
        },
        start: 0,
        length: duration,
        fit: 'crop',
        position: 'center',
      },
    ],
  };
  tracks.push(videoTrack);

  // Subtitle track
  if (subtitleStyle !== 'none') {
    const subtitleTrack = {
      clips: [
        {
          asset: {
            type: 'html',
            html: `<p style="font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 48px; color: ${subConfig.color}; text-align: center; text-shadow: 2px 2px 8px rgba(0,0,0,0.8); padding: 16px 24px; background: ${subConfig.background}; border-radius: 12px;">${escapeHtml(moment.hook)}</p>`,
            width: 1000,
            height: 200,
          },
          start: 0,
          length: Math.min(3, duration),
          position: subConfig.position,
          offset: { x: 0, y: subConfig.position === 'bottom' ? -0.15 : 0 },
          transition: {
            in: 'fade',
            out: 'fade',
          },
        },
      ] as unknown as SubtitleClip[],
    };
    tracks.push(subtitleTrack as unknown as { clips: Array<Record<string, unknown>> });
  }

  return {
    timeline: {
      background: '#000000',
      tracks,
    },
    output: {
      format: 'mp4',
      resolution: 'hd',
      aspectRatio: '9:16',
      size: {
        width: 1080,
        height: 1920,
      },
      fps: 30,
    },
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req: NextRequest) {
  try {
    const { video_url, moments, subtitle_style = 'bold', user_id } = await req.json();

    if (!video_url || typeof video_url !== 'string') {
      return NextResponse.json(
        { error: 'video_url is required' },
        { status: 400 }
      );
    }

    if (!moments || !Array.isArray(moments) || moments.length === 0) {
      return NextResponse.json(
        { error: 'moments array is required' },
        { status: 400 }
      );
    }

    const shotstackApiKey = process.env.SHOTSTACK_API_KEY;
    const shotstackEnv = process.env.SHOTSTACK_ENV || 'stage';
    const shotstackBaseUrl = shotstackEnv === 'production'
      ? 'https://api.shotstack.io/v1'
      : 'https://api.shotstack.io/stage';

    if (!shotstackApiKey) {
      // Return mock results if Shotstack not configured
      const mockShorts = (moments as ViralMoment[]).map((moment, i) => ({
        id: `short_${Date.now()}_${i}`,
        title: moment.title,
        hook: moment.hook,
        thumbnail_url: '',
        video_url: '',
        duration: Math.round(moment.end - moment.start),
        viral_score: moment.viral_score,
        status: 'rendering' as const,
        render_id: `mock_${i}`,
      }));

      return NextResponse.json({ shorts: mockShorts });
    }

    const shorts = [];

    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i] as ViralMoment;
      const timeline = buildShotstackTimeline(video_url, moment, subtitle_style);

      try {
        const renderRes = await fetch(`${shotstackBaseUrl}/render`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': shotstackApiKey,
          },
          body: JSON.stringify(timeline),
        });

        if (renderRes.ok) {
          const renderData = await renderRes.json();
          const renderId = renderData.response?.id;

          shorts.push({
            id: `short_${Date.now()}_${i}`,
            title: moment.title,
            hook: moment.hook,
            thumbnail_url: '',
            video_url: '',
            duration: Math.round(moment.end - moment.start),
            viral_score: moment.viral_score,
            status: 'rendering',
            render_id: renderId,
          });
        } else {
          const errorText = await renderRes.text();
          console.error(`Shotstack render error for short ${i}:`, errorText);

          shorts.push({
            id: `short_${Date.now()}_${i}`,
            title: moment.title,
            hook: moment.hook,
            thumbnail_url: '',
            video_url: '',
            duration: Math.round(moment.end - moment.start),
            viral_score: moment.viral_score,
            status: 'failed',
            render_id: null,
          });
        }
      } catch (renderErr) {
        console.error(`Render submission error for short ${i}:`, renderErr);
        shorts.push({
          id: `short_${Date.now()}_${i}`,
          title: moment.title,
          hook: moment.hook,
          thumbnail_url: '',
          video_url: '',
          duration: Math.round(moment.end - moment.start),
          viral_score: moment.viral_score,
          status: 'failed',
          render_id: null,
        });
      }
    }

    return NextResponse.json({
      shorts,
      user_id,
      total: shorts.length,
    });
  } catch (err) {
    console.error('Render route error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
