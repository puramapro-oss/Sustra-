import type { Scene, CostBreakdown, SourceRecommendation } from './types';
import { IMAGE_MODELS, VIDEO_MODELS } from './constants';

// ============================================================================
// Cost Constants (in cents)
// ============================================================================

const COSTS = {
  stock_search: 0, // Pexels is free
  image_ai: IMAGE_MODELS['flux-pro'].cost_per_image_cents,
  video_ai_kling_turbo: VIDEO_MODELS['kling-2.5-turbo'].cost_per_second_cents,
  video_ai_kling_pro: VIDEO_MODELS['kling-3-pro'].cost_per_second_cents,
  video_ai_sora: VIDEO_MODELS['sora-2'].cost_per_second_cents,
  video_ai_runway: VIDEO_MODELS['runway-gen4'].cost_per_second_cents,
  voice_per_char: 1.8, // 0.018 cents per char -> 1.8 cents per 100 chars
  music_per_second: 0.5,
  shotstack_render: 5,
  claude_per_script: 3,
} as const;

// ============================================================================
// Recommend Source
// ============================================================================

export function recommendSource(scene: Scene): SourceRecommendation {
  const { importance, visual_description, duration_seconds, visual_keywords } = scene;

  // Generic/common visuals -> stock footage (free)
  const genericKeywords = [
    'office', 'city', 'nature', 'people', 'business', 'sky', 'water',
    'building', 'street', 'technology', 'computer', 'phone', 'meeting',
    'landscape', 'sunset', 'ocean', 'forest', 'mountain', 'crowd',
  ];

  const isGeneric = visual_keywords.some((kw) =>
    genericKeywords.includes(kw.toLowerCase())
  );

  // Hero scenes always get video AI
  if (importance === 'hero') {
    return {
      source: 'video_ai',
      reason: 'Hero scene requires maximum visual impact with AI-generated video',
      estimated_cost_cents: duration_seconds * COSTS.video_ai_kling_turbo,
    };
  }

  // High importance: video AI for dynamic scenes, image AI for concepts
  if (importance === 'high') {
    const isDynamic = /motion|moving|flying|running|explod|transform|morph/i.test(
      visual_description
    );

    if (isDynamic) {
      return {
        source: 'video_ai',
        reason: 'High-importance dynamic scene benefits from AI video generation',
        estimated_cost_cents: duration_seconds * COSTS.video_ai_kling_turbo,
      };
    }

    return {
      source: 'image_ai',
      reason: 'High-importance scene with Ken Burns effect for visual polish',
      estimated_cost_cents: COSTS.image_ai,
    };
  }

  // Medium importance: stock if generic, image AI if conceptual
  if (importance === 'medium') {
    if (isGeneric) {
      return {
        source: 'stock',
        reason: 'Common visual concept available as stock footage at no cost',
        estimated_cost_cents: COSTS.stock_search,
      };
    }

    return {
      source: 'image_ai',
      reason: 'Unique visual concept requires AI image generation with Ken Burns',
      estimated_cost_cents: COSTS.image_ai,
    };
  }

  // Low importance: always stock
  return {
    source: 'stock',
    reason: 'Low-importance scene uses free stock footage to minimize cost',
    estimated_cost_cents: COSTS.stock_search,
  };
}

// ============================================================================
// Estimate Cost
// ============================================================================

export function estimateCost(
  scenes: Scene[],
  options?: {
    voiceCharCount?: number;
    musicDurationSeconds?: number;
    includeRender?: boolean;
  }
): CostBreakdown {
  const breakdown: CostBreakdown = {
    claude_script: COSTS.claude_per_script,
    elevenlabs_voice: 0,
    fal_ai_images: 0,
    fal_ai_videos: 0,
    pexels_stock: 0,
    elevenlabs_music: 0,
    shotstack_render: 0,
    total: 0,
  };

  // Script generation
  breakdown.claude_script = COSTS.claude_per_script;

  // Voice costs
  if (options?.voiceCharCount) {
    breakdown.elevenlabs_voice = Math.ceil(
      (options.voiceCharCount / 100) * COSTS.voice_per_char
    );
  } else {
    // Estimate from narration text
    const totalChars = scenes.reduce(
      (sum, s) => sum + s.narration.length,
      0
    );
    breakdown.elevenlabs_voice = Math.ceil((totalChars / 100) * COSTS.voice_per_char);
  }

  // Visual costs per scene
  for (const scene of scenes) {
    const source = scene.visual_source || recommendSource(scene).source;

    switch (source) {
      case 'stock':
        // Pexels is free
        break;
      case 'image_ai':
        breakdown.fal_ai_images += COSTS.image_ai;
        break;
      case 'video_ai':
        breakdown.fal_ai_videos += scene.duration_seconds * COSTS.video_ai_kling_turbo;
        break;
    }
  }

  // Music
  if (options?.musicDurationSeconds) {
    breakdown.elevenlabs_music = Math.ceil(
      options.musicDurationSeconds * COSTS.music_per_second
    );
  } else {
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);
    breakdown.elevenlabs_music = Math.ceil(totalDuration * COSTS.music_per_second);
  }

  // Render
  if (options?.includeRender !== false) {
    breakdown.shotstack_render = COSTS.shotstack_render;
  }

  breakdown.total =
    breakdown.claude_script +
    breakdown.elevenlabs_voice +
    breakdown.fal_ai_images +
    breakdown.fal_ai_videos +
    breakdown.pexels_stock +
    breakdown.elevenlabs_music +
    breakdown.shotstack_render;

  return breakdown;
}

// ============================================================================
// Optimize Scenes
// ============================================================================

export function optimizeScenes(
  scenes: Scene[],
  maxBudgetCents?: number
): Scene[] {
  // First pass: apply recommendations
  const optimized = scenes.map((scene) => {
    const recommendation = recommendSource(scene);
    return {
      ...scene,
      visual_source: recommendation.source as Scene['visual_source'],
    };
  });

  if (!maxBudgetCents) return optimized;

  // Second pass: if over budget, downgrade sources starting from lowest importance
  let currentCost = estimateCost(optimized);

  if (currentCost.total <= maxBudgetCents) return optimized;

  // Sort by importance (low first) for downgrading
  const importanceOrder: Record<string, number> = {
    low: 0,
    medium: 1,
    high: 2,
    hero: 3,
  };

  const sortedIndices = optimized
    .map((_, i) => i)
    .sort(
      (a, b) =>
        importanceOrder[optimized[a].importance] -
        importanceOrder[optimized[b].importance]
    );

  for (const idx of sortedIndices) {
    if (currentCost.total <= maxBudgetCents) break;

    const scene = optimized[idx];

    // Downgrade: video_ai -> image_ai -> stock
    if (scene.visual_source === 'video_ai') {
      optimized[idx] = { ...scene, visual_source: 'image_ai' };
      currentCost = estimateCost(optimized);
      if (currentCost.total <= maxBudgetCents) break;
    }

    if (optimized[idx].visual_source === 'image_ai' && scene.importance !== 'hero') {
      optimized[idx] = { ...optimized[idx], visual_source: 'stock' };
      currentCost = estimateCost(optimized);
    }
  }

  return optimized;
}
