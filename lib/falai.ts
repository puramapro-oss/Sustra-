import { IMAGE_MODELS, VIDEO_MODELS } from './constants';

// ============================================================================
// Types
// ============================================================================

type ImageModel = 'flux-pro';
type VideoModel = 'kling-2.5-turbo' | 'kling-3-pro' | 'sora-2' | 'runway-gen4';

interface ImageGenerationOptions {
  width?: number;
  height?: number;
  num_images?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  seed?: number;
  enable_safety_checker?: boolean;
}

interface VideoGenerationOptions {
  duration?: number;
  aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:5';
  image_url?: string;
  seed?: number;
}

interface FalQueueResponse {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  response_url: string;
  status_url: string;
  cancel_url: string;
}

interface FalStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  logs?: { message: string; timestamp: string }[];
}

interface FalImageResult {
  images: { url: string; width: number; height: number; content_type: string }[];
  seed: number;
  prompt: string;
}

interface FalVideoResult {
  video: { url: string; content_type: string };
  seed: number;
}

// ============================================================================
// Helpers
// ============================================================================

const FAL_KEY = () => {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY environment variable is not set');
  return key;
};

async function falFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Key ${FAL_KEY()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`fal.ai API error (${response.status}): ${errorBody}`);
  }

  return response;
}

async function pollForResult<T>(
  statusUrl: string,
  responseUrl: string,
  maxWaitMs: number = 300_000,
  pollIntervalMs: number = 3_000
): Promise<T> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const statusResponse = await falFetch(statusUrl);
    const statusData = (await statusResponse.json()) as FalStatusResponse;

    if (statusData.status === 'COMPLETED') {
      const resultResponse = await falFetch(responseUrl);
      return resultResponse.json() as Promise<T>;
    }

    if (statusData.status === 'FAILED') {
      throw new Error('fal.ai generation failed');
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('fal.ai generation timed out');
}

// ============================================================================
// Image Generation
// ============================================================================

export async function generateImage(
  prompt: string,
  model: ImageModel = 'flux-pro',
  options: ImageGenerationOptions = {}
): Promise<{ url: string; width: number; height: number }> {
  const endpoint = IMAGE_MODELS[model].endpoint;

  const body: Record<string, unknown> = {
    prompt,
    image_size: {
      width: options.width ?? 1024,
      height: options.height ?? 1024,
    },
    num_images: options.num_images ?? 1,
    enable_safety_checker: options.enable_safety_checker ?? true,
  };

  if (options.guidance_scale !== undefined) body.guidance_scale = options.guidance_scale;
  if (options.num_inference_steps !== undefined) body.num_inference_steps = options.num_inference_steps;
  if (options.seed !== undefined) body.seed = options.seed;

  const response = await falFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const queueData = (await response.json()) as FalQueueResponse;

  const result = await pollForResult<FalImageResult>(
    queueData.status_url,
    queueData.response_url
  );

  if (!result.images || result.images.length === 0) {
    throw new Error('No images returned from fal.ai');
  }

  return {
    url: result.images[0].url,
    width: result.images[0].width,
    height: result.images[0].height,
  };
}

// ============================================================================
// Video Generation
// ============================================================================

export async function generateVideo(
  prompt: string,
  model: VideoModel = 'kling-2.5-turbo',
  options: VideoGenerationOptions = {}
): Promise<{ url: string }> {
  const modelDef = VIDEO_MODELS[model];
  const endpoint = modelDef.endpoint;

  const body: Record<string, unknown> = {
    prompt,
  };

  if (options.duration !== undefined) {
    body.duration = Math.min(options.duration, modelDef.max_duration_seconds);
  }

  if (options.aspect_ratio) {
    body.aspect_ratio = options.aspect_ratio;
  }

  if (options.image_url) {
    body.image_url = options.image_url;
  }

  if (options.seed !== undefined) {
    body.seed = options.seed;
  }

  const response = await falFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const queueData = (await response.json()) as FalQueueResponse;

  const result = await pollForResult<FalVideoResult>(
    queueData.status_url,
    queueData.response_url,
    600_000, // 10 min timeout for video
    5_000
  );

  if (!result.video || !result.video.url) {
    throw new Error('No video returned from fal.ai');
  }

  return { url: result.video.url };
}

// ============================================================================
// Image-to-Video (using an existing image)
// ============================================================================

export async function imageToVideo(
  imageUrl: string,
  prompt: string,
  model: VideoModel = 'runway-gen4',
  options: Omit<VideoGenerationOptions, 'image_url'> = {}
): Promise<{ url: string }> {
  return generateVideo(prompt, model, { ...options, image_url: imageUrl });
}
