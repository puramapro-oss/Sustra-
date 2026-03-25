import { API_ENDPOINTS, RENDER_POLL_INTERVAL_MS, MAX_RENDER_POLL_ATTEMPTS, SHOTSTACK_CALLBACK_URL } from './constants';
import type {
  Scene,
  ShotstackEdit,
  ShotstackTimeline,
  ShotstackTrack,
  ShotstackClip,
  ShotstackOutput,
  ShotstackRenderResponse,
  ShotstackTransition,
  TransitionType,
  VideoFormat,
} from './types';

// ============================================================================
// Helpers
// ============================================================================

const API_KEY = () => {
  const key = process.env.SHOTSTACK_API_KEY;
  if (!key) throw new Error('SHOTSTACK_API_KEY environment variable is not set');
  return key;
};

async function shotstackFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'x-api-key': API_KEY(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Shotstack API error (${response.status}): ${errorBody}`);
  }

  return response;
}

// ============================================================================
// Build Clips
// ============================================================================

function buildVisualClip(
  scene: Scene,
  startTime: number
): ShotstackClip {
  const isVideo = scene.asset_url?.match(/\.(mp4|webm|mov)(\?|$)/i);

  const transition: ShotstackTransition = {
    in: scene.transition || 'fade',
  };

  if (isVideo) {
    return {
      asset: {
        type: 'video',
        src: scene.asset_url!,
        volume: 0,
      },
      start: startTime,
      length: scene.duration_seconds,
      fit: 'cover',
      transition,
    };
  }

  return {
    asset: {
      type: 'image',
      src: scene.asset_url!,
    },
    start: startTime,
    length: scene.duration_seconds,
    fit: 'cover',
    effect: 'zoomIn',
    transition,
  };
}

function buildVoiceClip(
  voiceUrl: string,
  startTime: number,
  duration: number
): ShotstackClip {
  return {
    asset: {
      type: 'audio',
      src: voiceUrl,
      effect: 'fadeOut',
    },
    start: startTime,
    length: duration,
  };
}

function buildTextOverlayClip(
  text: string,
  startTime: number,
  duration: number,
  position: 'top' | 'center' | 'bottom' = 'bottom'
): ShotstackClip {
  return {
    asset: {
      type: 'title',
      text,
      style: 'subtitle',
      color: '#ffffff',
      size: 'medium',
      position,
    },
    start: startTime,
    length: duration,
    transition: {
      in: 'fade' as TransitionType,
      out: 'fade' as TransitionType,
    },
  };
}

// ============================================================================
// Build Timeline
// ============================================================================

export function buildTimeline(
  scenes: Scene[],
  voiceUrl: string | null,
  musicUrl: string | null,
  options: {
    format?: VideoFormat;
    backgroundColor?: string;
    includeTextOverlays?: boolean;
  } = {}
): ShotstackEdit {
  const format = options.format || 'short';
  const includeOverlays = options.includeTextOverlays ?? true;

  const visualClips: ShotstackClip[] = [];
  const voiceClips: ShotstackClip[] = [];
  const textClips: ShotstackClip[] = [];

  let currentTime = 0;

  for (const scene of scenes) {
    if (scene.asset_url) {
      visualClips.push(buildVisualClip(scene, currentTime));
    }

    if (scene.voice_url) {
      voiceClips.push(buildVoiceClip(scene.voice_url, currentTime, scene.duration_seconds));
    }

    if (includeOverlays && scene.text_overlay) {
      textClips.push(
        buildTextOverlayClip(scene.text_overlay, currentTime, scene.duration_seconds)
      );
    }

    currentTime += scene.duration_seconds;
  }

  // If a single voice URL for the entire narration
  if (voiceUrl && voiceClips.length === 0) {
    voiceClips.push(buildVoiceClip(voiceUrl, 0, currentTime));
  }

  const tracks: ShotstackTrack[] = [];

  // Text overlays on top (rendered first = top layer)
  if (textClips.length > 0) {
    tracks.push({ clips: textClips });
  }

  // Visuals
  if (visualClips.length > 0) {
    tracks.push({ clips: visualClips });
  }

  // Voice
  if (voiceClips.length > 0) {
    tracks.push({ clips: voiceClips });
  }

  const timeline: ShotstackTimeline = {
    background: options.backgroundColor || '#000000',
    tracks,
  };

  if (musicUrl) {
    timeline.soundtrack = {
      src: musicUrl,
      effect: 'fadeInFadeOut',
      volume: 0.3,
    };
  }

  const output: ShotstackOutput = {
    format: 'mp4',
    resolution: '1080',
    fps: 30,
    quality: 'high',
  };

  if (format === 'short') {
    output.aspectRatio = '9:16';
  } else if (format === 'long') {
    output.aspectRatio = '16:9';
  } else {
    output.aspectRatio = '1:1';
  }

  const edit: ShotstackEdit = {
    timeline,
    output,
  };

  if (SHOTSTACK_CALLBACK_URL) {
    edit.callback = SHOTSTACK_CALLBACK_URL;
  }

  return edit;
}

// ============================================================================
// Render
// ============================================================================

export async function renderVideo(
  edit: ShotstackEdit
): Promise<{ id: string; message: string }> {
  const response = await shotstackFetch(API_ENDPOINTS.SHOTSTACK_RENDER, {
    method: 'POST',
    body: JSON.stringify(edit),
  });

  const data = (await response.json()) as ShotstackRenderResponse;

  if (!data.success) {
    throw new Error(`Shotstack render failed: ${data.message}`);
  }

  return {
    id: data.response.id,
    message: data.message,
  };
}

// ============================================================================
// Render Status
// ============================================================================

export async function getRenderStatus(renderId: string): Promise<{
  status: string;
  url: string | null;
  error: string | null;
  progress: number;
}> {
  const response = await shotstackFetch(
    `${API_ENDPOINTS.SHOTSTACK_STATUS}/${renderId}`
  );

  const data = (await response.json()) as ShotstackRenderResponse;

  let progress = 0;
  switch (data.response.status) {
    case 'queued':
      progress = 10;
      break;
    case 'fetching':
      progress = 30;
      break;
    case 'rendering':
      progress = 60;
      break;
    case 'saving':
      progress = 85;
      break;
    case 'done':
      progress = 100;
      break;
    case 'failed':
      progress = 0;
      break;
    default:
      progress = 0;
  }

  return {
    status: data.response.status,
    url: data.response.url || null,
    error: data.response.error || null,
    progress,
  };
}

// ============================================================================
// Poll for Completion
// ============================================================================

export async function waitForRender(
  renderId: string,
  onProgress?: (status: string, progress: number) => void
): Promise<{ url: string }> {
  for (let attempt = 0; attempt < MAX_RENDER_POLL_ATTEMPTS; attempt++) {
    const result = await getRenderStatus(renderId);

    if (onProgress) {
      onProgress(result.status, result.progress);
    }

    if (result.status === 'done' && result.url) {
      return { url: result.url };
    }

    if (result.status === 'failed') {
      throw new Error(`Render failed: ${result.error || 'Unknown error'}`);
    }

    await new Promise((resolve) => setTimeout(resolve, RENDER_POLL_INTERVAL_MS));
  }

  throw new Error('Render timed out after maximum polling attempts');
}
