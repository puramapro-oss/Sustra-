import type {
  PipelineConfig,
  PipelineResult,
  PipelineProgress,
  Script,
  Scene,
  GenerationStatus,
} from './types';
import { VOICE_STYLES } from './constants';
import { generateScript } from './claude';
import { textToSpeech, generateMusic } from './elevenlabs';
import { generateImage, generateVideo } from './falai';
import { searchPhotos, searchVideos, getBestVideoFile } from './pexels';
import { buildTimeline, renderVideo, waitForRender } from './shotstack';
import { optimizeScenes, estimateCost } from './cost-optimizer';
import { findOrCreate } from './cache';

// ============================================================================
// Types
// ============================================================================

type ProgressCallback = (progress: PipelineProgress) => void;

// ============================================================================
// Helpers
// ============================================================================

function getVoiceId(config: PipelineConfig): string {
  if (config.voice_id) return config.voice_id;

  const voiceStyle = VOICE_STYLES.find((v) => v.id === config.voice_style);
  return voiceStyle?.elevenlabs_voice_id || VOICE_STYLES[0].elevenlabs_voice_id;
}

function reportProgress(
  callback: ProgressCallback | undefined,
  status: GenerationStatus,
  step: number,
  totalSteps: number,
  message: string
) {
  if (!callback) return;
  callback({
    status,
    step,
    totalSteps,
    message,
    percentage: Math.round((step / totalSteps) * 100),
  });
}

async function uploadAudioBuffer(
  buffer: ArrayBuffer,
  filename: string
): Promise<string> {
  // Upload to Supabase storage and return public URL
  const { createClient } = await import('./supabase');
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from('audio')
    .upload(`pipeline/${Date.now()}_${filename}`, buffer, {
      contentType: 'audio/mpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Audio upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('audio')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// ============================================================================
// Step 1: Script Generation
// ============================================================================

async function stepGenerateScript(
  config: PipelineConfig,
  onProgress?: ProgressCallback
): Promise<Script> {
  reportProgress(onProgress, 'scripting', 1, 5, 'Generating script with AI...');

  const script = await generateScript(
    config.topic,
    config.format,
    config.visual_style,
    {
      voiceStyle: config.voice_style,
      targetDuration: config.target_duration_seconds,
    }
  );

  // Optimize scenes if cost optimization is enabled
  if (config.optimize_cost) {
    script.scenes = optimizeScenes(script.scenes);
  }

  return script;
}

// ============================================================================
// Step 2: Voice Generation
// ============================================================================

async function stepGenerateVoice(
  script: Script,
  config: PipelineConfig,
  onProgress?: ProgressCallback
): Promise<string> {
  reportProgress(onProgress, 'voice_generation', 2, 5, 'Generating voiceover...');

  const fullNarration = script.scenes.map((s) => s.narration).join(' ');
  const voiceId = getVoiceId(config);

  const result = await textToSpeech(fullNarration, voiceId);
  const voiceUrl = await uploadAudioBuffer(result.audioBuffer, 'narration.mp3');

  return voiceUrl;
}

// ============================================================================
// Step 3: Visual Generation
// ============================================================================

async function stepGenerateVisuals(
  scenes: Scene[],
  config: PipelineConfig,
  onProgress?: ProgressCallback
): Promise<Scene[]> {
  reportProgress(onProgress, 'visual_generation', 3, 5, 'Generating visuals...');

  const aspectRatio = config.format === 'short' ? '9:16' : config.format === 'long' ? '16:9' : '1:1';
  const width = config.format === 'short' ? 720 : 1920;
  const height = config.format === 'short' ? 1280 : 1080;

  const updatedScenes = await Promise.all(
    scenes.map(async (scene) => {
      try {
        switch (scene.visual_source) {
          case 'stock': {
            const query = scene.visual_keywords.join(' ') || scene.visual_description;

            const asset = await findOrCreate(
              'photo',
              scene.visual_keywords,
              scene.visual_description,
              async () => {
                // Try video first if duration > 3s
                if (scene.duration_seconds > 3) {
                  const videoResults = await searchVideos(query, 5);
                  if (videoResults.videos.length > 0) {
                    const bestFile = getBestVideoFile(videoResults.videos[0], 'hd');
                    if (bestFile) {
                      return { url: bestFile.link, source: 'pexels' as const };
                    }
                  }
                }

                // Fallback to photos
                const photoResults = await searchPhotos(query, 5);
                if (photoResults.photos.length > 0) {
                  return { url: photoResults.photos[0].src.large2x, source: 'pexels' as const };
                }

                throw new Error(`No stock media found for: ${query}`);
              }
            );

            return { ...scene, asset_url: asset.url };
          }

          case 'image_ai': {
            const asset = await findOrCreate(
              'photo',
              scene.visual_keywords,
              scene.visual_description,
              async () => {
                const result = await generateImage(
                  `${scene.visual_description}, ${config.visual_style} style`,
                  'flux-pro',
                  { width, height }
                );
                return { url: result.url, source: 'fal_ai' as const };
              }
            );

            return { ...scene, asset_url: asset.url };
          }

          case 'video_ai': {
            const result = await generateVideo(
              `${scene.visual_description}, ${config.visual_style} style`,
              'kling-2.5-turbo',
              {
                duration: Math.min(scene.duration_seconds, 10),
                aspect_ratio: aspectRatio as '16:9' | '9:16' | '1:1',
              }
            );

            return { ...scene, asset_url: result.url };
          }

          default:
            return scene;
        }
      } catch (error) {
        console.error(`Visual generation failed for scene ${scene.index}:`, error);
        // Fallback to stock on any error
        try {
          const query = scene.visual_keywords.join(' ');
          const photoResults = await searchPhotos(query, 3);
          if (photoResults.photos.length > 0) {
            return { ...scene, asset_url: photoResults.photos[0].src.large2x };
          }
        } catch {
          // Final fallback: leave scene without asset
        }
        return scene;
      }
    })
  );

  return updatedScenes;
}

// ============================================================================
// Step 4: Music Generation
// ============================================================================

async function stepGenerateMusic(
  script: Script,
  config: PipelineConfig,
  onProgress?: ProgressCallback
): Promise<string | null> {
  reportProgress(onProgress, 'music_generation', 4, 5, 'Generating background music...');

  if (config.music_url) return config.music_url;

  const musicPrompt = config.music_prompt ||
    `Background music for a ${config.format} video about ${config.topic}, ${config.visual_style} style, instrumental`;

  try {
    const musicBuffer = await generateMusic(musicPrompt, script.total_duration_seconds);
    const musicUrl = await uploadAudioBuffer(musicBuffer, 'music.mp3');
    return musicUrl;
  } catch (error) {
    console.error('Music generation failed:', error);
    return null;
  }
}

// ============================================================================
// Step 5: Assembly and Render
// ============================================================================

async function stepAssembleAndRender(
  scenes: Scene[],
  voiceUrl: string,
  musicUrl: string | null,
  config: PipelineConfig,
  onProgress?: ProgressCallback
): Promise<{ renderId: string; videoUrl: string }> {
  reportProgress(onProgress, 'assembly', 5, 5, 'Assembling video...');

  const edit = buildTimeline(scenes, voiceUrl, musicUrl, {
    format: config.format,
    includeTextOverlays: true,
  });

  const { id: renderId } = await renderVideo(edit);

  reportProgress(onProgress, 'rendering', 5, 5, 'Rendering video...');

  const { url: videoUrl } = await waitForRender(renderId, (status, progress) => {
    reportProgress(
      onProgress,
      'rendering',
      5,
      5,
      `Rendering: ${status} (${progress}%)`
    );
  });

  return { renderId, videoUrl };
}

// ============================================================================
// Main Pipeline
// ============================================================================

export async function executePipeline(
  config: PipelineConfig,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const startTime = Date.now();
  let script: Script | null = null;

  try {
    // Step 1: Generate Script
    script = await stepGenerateScript(config, onProgress);

    // Step 2 & 3: Voice + Visuals in parallel
    const [voiceUrl, scenesWithVisuals] = await Promise.all([
      stepGenerateVoice(script, config, onProgress),
      stepGenerateVisuals(script.scenes, config, onProgress),
    ]);

    script.scenes = scenesWithVisuals;

    // Step 4: Music
    const musicUrl = await stepGenerateMusic(script, config, onProgress);

    // Step 5: Assemble + Render
    const { renderId, videoUrl } = await stepAssembleAndRender(
      script.scenes,
      voiceUrl,
      musicUrl,
      config,
      onProgress
    );

    const costBreakdown = estimateCost(script.scenes, {
      voiceCharCount: script.scenes.reduce((sum, s) => sum + s.narration.length, 0),
      musicDurationSeconds: script.total_duration_seconds,
      includeRender: true,
    });

    reportProgress(onProgress, 'completed', 5, 5, 'Video generation complete!');

    return {
      video_id: `vid_${Date.now().toString(36)}`,
      render_id: renderId,
      status: 'completed',
      video_url: videoUrl,
      thumbnail_url: null,
      script,
      total_cost_cents: costBreakdown.total,
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    reportProgress(onProgress, 'failed', 0, 5, `Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      video_id: `vid_${Date.now().toString(36)}`,
      render_id: '',
      status: 'failed',
      video_url: null,
      thumbnail_url: null,
      script: script || {
        title: '',
        hook: '',
        scenes: [],
        cta: '',
        total_duration_seconds: 0,
        viral_score: 0,
        tags: [],
      },
      total_cost_cents: 0,
      duration_ms: Date.now() - startTime,
    };
  }
}
