import type {
  PlanType,
  PlanDefinition,
  VoiceStyle,
  VoiceStyleDefinition,
  VisualStyle,
  VisualStyleDefinition,
  VideoFormat,
  VideoFormatDefinition,
  TransitionType,
} from './types';

// ============================================================================
// Colors
// ============================================================================

export const COLORS = {
  background: '#0A0A0F',
  violet: '#8b5cf6',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  rose: '#ec4899',
  green: '#10b981',
  gold: '#f59e0b',
  white: '#ffffff',
  muted: '#6b7280',
  border: '#1e1b2e',
  card: '#0d0b1a',
  cardHover: '#131127',
} as const;

// ============================================================================
// Plan Definitions
// ============================================================================

export const PLAN_DEFINITIONS: Record<PlanType, PlanDefinition> = {
  free: {
    type: 'free',
    name: 'Free',
    price_cents: 0,
    price_label: '0€',
    description: 'Essayez SUTRA gratuitement',
    stripe_price_id: '',
    limits: {
      photos_per_month: 3,
      shorts_per_month: 1,
      longs_per_month: 0,
      shorts_conversions_per_month: 0,
      max_shorts_per_conversion: 0,
      voice_cloning: false,
      custom_templates: false,
      autopilot: false,
      autopilot_auto_mode: false,
      priority_render: false,
      marketplace_access: false,
      api_access: false,
      team_members: 1,
      max_schedules: 0,
      thumbnail_variants: 1,
      mirror_suggestions_per_day: 0,
    },
    features: [
      '3 photos IA/mois',
      '1 vidéo courte/mois',
      'Voix basiques',
      'Bibliothèque Pexels',
    ],
  },
  starter: {
    type: 'starter',
    name: 'Starter',
    price_cents: 900,
    price_label: '9€',
    description: 'Idéal pour débuter avec la vidéo IA',
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
    limits: {
      photos_per_month: 15,
      shorts_per_month: 3,
      longs_per_month: 0,
      shorts_conversions_per_month: 3,
      max_shorts_per_conversion: 5,
      voice_cloning: false,
      custom_templates: false,
      autopilot: false,
      autopilot_auto_mode: false,
      priority_render: false,
      marketplace_access: true,
      api_access: false,
      team_members: 1,
      max_schedules: 1,
      thumbnail_variants: 1,
      mirror_suggestions_per_day: 3,
    },
    features: [
      '15 photos IA/mois',
      '3 vidéos courtes/mois',
      '3 conversions Vidéo→Shorts',
      'Miniature auto (1 par vidéo)',
      '1 planning actif',
      'SUTRA Mirror basique',
      'Toutes les voix',
      'Marketplace',
    ],
  },
  creator: {
    type: 'creator',
    name: 'Créateur',
    price_cents: 2900,
    price_label: '29€',
    description: 'Pour les créateurs sérieux',
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID || '',
    popular: true,
    limits: {
      photos_per_month: Infinity,
      shorts_per_month: 20,
      longs_per_month: 2,
      shorts_conversions_per_month: 15,
      max_shorts_per_conversion: 8,
      voice_cloning: true,
      custom_templates: true,
      autopilot: true,
      autopilot_auto_mode: false,
      priority_render: true,
      marketplace_access: true,
      api_access: false,
      team_members: 3,
      max_schedules: 5,
      thumbnail_variants: 1,
      mirror_suggestions_per_day: 5,
    },
    features: [
      'Photos IA illimitées',
      '20 vidéos courtes + 2 longues/mois',
      '15 conversions Vidéo→Shorts',
      'Miniature auto + regénération illimitée',
      '5 plannings actifs',
      'Autopilot avec approbation',
      'SUTRA Mirror complet',
      'Voice cloning',
      'Templates personnalisés',
      'Rendu prioritaire',
    ],
  },
  empire: {
    type: 'empire',
    name: 'Empire',
    price_cents: 9900,
    price_label: '99€',
    description: 'Construisez votre empire de contenu',
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_EMPIRE_PRICE_ID || '',
    limits: {
      photos_per_month: Infinity,
      shorts_per_month: Infinity,
      longs_per_month: 8,
      shorts_conversions_per_month: Infinity,
      max_shorts_per_conversion: 10,
      voice_cloning: true,
      custom_templates: true,
      autopilot: true,
      autopilot_auto_mode: true,
      priority_render: true,
      marketplace_access: true,
      api_access: true,
      team_members: 10,
      max_schedules: Infinity,
      thumbnail_variants: 4,
      mirror_suggestions_per_day: Infinity,
    },
    features: [
      'Tout illimité',
      'Vidéo→Shorts illimité (max 10/conversion)',
      'Thumbnail Gladiator (4 miniatures + A/B test)',
      'Plannings illimités',
      'Autopilot 100% auto ou approbation',
      'SUTRA Mirror premium illimité',
      'Accès API',
      'Voice cloning',
      'Templates personnalisés',
      'Rendu prioritaire',
      "Jusqu'à 10 membres",
    ],
  },
} as const;

// ============================================================================
// Voice Styles
// ============================================================================

export const VOICE_STYLES: VoiceStyleDefinition[] = [
  {
    id: 'cinematic_male' as VoiceStyle,
    name: 'Cinematic Male',
    description: 'Deep, resonant voice perfect for dramatic narration',
    elevenlabs_voice_id: 'pNInz6obpgDQGcFmaJgB',
    sample_url: null,
  },
  {
    id: 'cinematic_female' as VoiceStyle,
    name: 'Cinematic Female',
    description: 'Warm, authoritative voice for documentary-style content',
    elevenlabs_voice_id: 'EXAVITQu4vr4xnSDxMaL',
    sample_url: null,
  },
  {
    id: 'energetic_male' as VoiceStyle,
    name: 'Energetic Male',
    description: 'High-energy voice for shorts and viral content',
    elevenlabs_voice_id: 'VR6AewLTigWG4xSOukaG',
    sample_url: null,
  },
  {
    id: 'energetic_female' as VoiceStyle,
    name: 'Energetic Female',
    description: 'Upbeat, engaging voice for social media videos',
    elevenlabs_voice_id: 'jBpfAIEqn3t5O0SqzGOq',
    sample_url: null,
  },
  {
    id: 'calm_male' as VoiceStyle,
    name: 'Calm Male',
    description: 'Soothing, measured tone for educational content',
    elevenlabs_voice_id: 'yoZ06aMxZJJ28mfd3POQ',
    sample_url: null,
  },
  {
    id: 'calm_female' as VoiceStyle,
    name: 'Calm Female',
    description: 'Gentle, reassuring voice for wellness and learning',
    elevenlabs_voice_id: '21m00Tcm4TlvDq8ikWAM',
    sample_url: null,
  },
  {
    id: 'documentary_male' as VoiceStyle,
    name: 'Documentary Male',
    description: 'Professional narrator voice with gravitas',
    elevenlabs_voice_id: 'TxGEqnHWrfWFTfGW9XjX',
    sample_url: null,
  },
  {
    id: 'documentary_female' as VoiceStyle,
    name: 'Documentary Female',
    description: 'Clear, articulate voice for informative content',
    elevenlabs_voice_id: 'XB0fDUnXU5powFXDhCwa',
    sample_url: null,
  },
];

// ============================================================================
// Visual Styles
// ============================================================================

export const VISUAL_STYLES: VisualStyleDefinition[] = [
  {
    id: 'cinematic' as VisualStyle,
    name: 'Cinematic',
    description: 'Film-like quality with dramatic lighting',
    prompt_modifier: 'cinematic lighting, film grain, shallow depth of field, anamorphic lens flare, 35mm film',
    color_palette: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
  },
  {
    id: 'documentary' as VisualStyle,
    name: 'Documentary',
    description: 'Authentic, natural visual style',
    prompt_modifier: 'documentary photography, natural lighting, photojournalistic, candid, realistic',
    color_palette: ['#2c3e50', '#34495e', '#7f8c8d', '#ecf0f1'],
  },
  {
    id: 'minimalist' as VisualStyle,
    name: 'Minimalist',
    description: 'Clean, simple compositions with lots of white space',
    prompt_modifier: 'minimalist design, clean composition, white space, simple, elegant, modern',
    color_palette: ['#ffffff', '#f5f5f5', '#333333', '#000000'],
  },
  {
    id: 'vibrant' as VisualStyle,
    name: 'Vibrant',
    description: 'Bold colors and high contrast',
    prompt_modifier: 'vibrant colors, high contrast, saturated, bold, eye-catching, colorful',
    color_palette: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'],
  },
  {
    id: 'retro' as VisualStyle,
    name: 'Retro',
    description: 'Vintage-inspired aesthetics',
    prompt_modifier: 'retro style, vintage, 70s aesthetic, warm tones, film photography, nostalgic',
    color_palette: ['#d4a574', '#c97c5d', '#b55a30', '#723d20'],
  },
  {
    id: 'dark_moody' as VisualStyle,
    name: 'Dark & Moody',
    description: 'Low-key lighting with dramatic shadows',
    prompt_modifier: 'dark moody, low key lighting, dramatic shadows, noir, atmospheric, mysterious',
    color_palette: ['#0a0a0a', '#1a1a1a', '#2d2d2d', '#8b5cf6'],
  },
  {
    id: 'neon' as VisualStyle,
    name: 'Neon',
    description: 'Glowing neon lights and cyberpunk vibes',
    prompt_modifier: 'neon lights, cyberpunk, glowing, synthwave, futuristic, nighttime, electric',
    color_palette: ['#0d0221', '#0a7e8c', '#9b59b6', '#e74c3c'],
  },
  {
    id: 'pastel' as VisualStyle,
    name: 'Pastel',
    description: 'Soft, dreamy colors',
    prompt_modifier: 'pastel colors, soft lighting, dreamy, gentle, ethereal, light and airy',
    color_palette: ['#ffd1dc', '#bfe6ff', '#c9f0d8', '#fff5ba'],
  },
  {
    id: 'corporate' as VisualStyle,
    name: 'Corporate',
    description: 'Professional business imagery',
    prompt_modifier: 'professional, corporate, business, clean, polished, modern office, trustworthy',
    color_palette: ['#003366', '#336699', '#6699cc', '#f2f2f2'],
  },
  {
    id: 'hand_drawn' as VisualStyle,
    name: 'Hand Drawn',
    description: 'Illustration and sketch style',
    prompt_modifier: 'hand drawn illustration, sketch style, artistic, watercolor, pen and ink, illustrated',
    color_palette: ['#2c3e50', '#e74c3c', '#f39c12', '#27ae60'],
  },
];

// ============================================================================
// Video Formats
// ============================================================================

export const VIDEO_FORMATS: VideoFormatDefinition[] = [
  {
    id: 'short' as VideoFormat,
    name: 'Short',
    description: 'Vertical short-form video (TikTok, Reels, Shorts)',
    aspect_ratio: '9:16',
    resolution: '1080',
    max_duration_seconds: 60,
    min_duration_seconds: 15,
  },
  {
    id: 'long' as VideoFormat,
    name: 'Long',
    description: 'Horizontal long-form video (YouTube)',
    aspect_ratio: '16:9',
    resolution: '1080',
    max_duration_seconds: 600,
    min_duration_seconds: 60,
  },
  {
    id: 'photo' as VideoFormat,
    name: 'Photo',
    description: 'AI-generated image with optional Ken Burns effect',
    aspect_ratio: '1:1',
    resolution: '1080',
    max_duration_seconds: 10,
    min_duration_seconds: 1,
  },
];

// ============================================================================
// Transitions
// ============================================================================

export const TRANSITIONS: { id: TransitionType; name: string }[] = [
  { id: 'fade', name: 'Fade' },
  { id: 'reveal', name: 'Reveal' },
  { id: 'wipeLeft', name: 'Wipe Left' },
  { id: 'wipeRight', name: 'Wipe Right' },
  { id: 'slideLeft', name: 'Slide Left' },
  { id: 'slideRight', name: 'Slide Right' },
  { id: 'slideUp', name: 'Slide Up' },
  { id: 'slideDown', name: 'Slide Down' },
  { id: 'carouselLeft', name: 'Carousel Left' },
  { id: 'carouselRight', name: 'Carousel Right' },
  { id: 'carouselUp', name: 'Carousel Up' },
  { id: 'carouselDown', name: 'Carousel Down' },
  { id: 'shuffleTopRight', name: 'Shuffle Top Right' },
  { id: 'shuffleRightTop', name: 'Shuffle Right Top' },
  { id: 'zoom', name: 'Zoom' },
];

// ============================================================================
// API Endpoints
// ============================================================================

export const API_ENDPOINTS = {
  ELEVENLABS_BASE: 'https://api.elevenlabs.io/v1',
  ELEVENLABS_TTS: 'https://api.elevenlabs.io/v1/text-to-speech',
  ELEVENLABS_VOICES: 'https://api.elevenlabs.io/v1/voices',
  ELEVENLABS_VOICE_CLONE: 'https://api.elevenlabs.io/v1/voices/add',
  ELEVENLABS_SOUND_EFFECTS: 'https://api.elevenlabs.io/v1/sound-generation',
  ELEVENLABS_MUSIC: 'https://api.elevenlabs.io/v1/music-generation',

  FAL_AI_BASE: 'https://queue.fal.run',
  FAL_FLUX_PRO: 'https://queue.fal.run/fal-ai/flux-pro/v1.1',
  FAL_KLING_2_5_TURBO: 'https://queue.fal.run/fal-ai/kling-video/v2.5/turbo',
  FAL_KLING_3_PRO: 'https://queue.fal.run/fal-ai/kling-video/v3/pro',
  FAL_SORA_2: 'https://queue.fal.run/fal-ai/sora/v2',
  FAL_RUNWAY_GEN4: 'https://queue.fal.run/fal-ai/runway-gen4/turbo/image-to-video',

  PEXELS_BASE: 'https://api.pexels.com',
  PEXELS_PHOTOS: 'https://api.pexels.com/v1',
  PEXELS_VIDEOS: 'https://api.pexels.com/videos',

  SHOTSTACK_BASE: 'https://api.shotstack.io/edit/stage',
  SHOTSTACK_RENDER: 'https://api.shotstack.io/edit/stage/render',
  SHOTSTACK_STATUS: 'https://api.shotstack.io/edit/stage/render',

  YOUTUBE_API_BASE: 'https://www.googleapis.com/youtube/v3',
  YOUTUBE_UPLOAD: 'https://www.googleapis.com/upload/youtube/v3/videos',
} as const;

// ============================================================================
// Generation Models
// ============================================================================

export const IMAGE_MODELS = {
  'flux-pro': {
    name: 'Flux Pro',
    endpoint: API_ENDPOINTS.FAL_FLUX_PRO,
    cost_per_image_cents: 5,
    max_resolution: 2048,
  },
} as const;

export const VIDEO_MODELS = {
  'kling-2.5-turbo': {
    name: 'Kling 2.5 Turbo',
    endpoint: API_ENDPOINTS.FAL_KLING_2_5_TURBO,
    cost_per_second_cents: 8,
    max_duration_seconds: 10,
  },
  'kling-3-pro': {
    name: 'Kling 3 Pro',
    endpoint: API_ENDPOINTS.FAL_KLING_3_PRO,
    cost_per_second_cents: 12,
    max_duration_seconds: 10,
  },
  'sora-2': {
    name: 'Sora 2',
    endpoint: API_ENDPOINTS.FAL_SORA_2,
    cost_per_second_cents: 15,
    max_duration_seconds: 20,
  },
  'runway-gen4': {
    name: 'Runway Gen-4',
    endpoint: API_ENDPOINTS.FAL_RUNWAY_GEN4,
    cost_per_second_cents: 10,
    max_duration_seconds: 10,
  },
} as const;

// ============================================================================
// Misc Constants
// ============================================================================

export const MAX_SCRIPT_LENGTH = 5000;
export const MAX_TOPIC_LENGTH = 200;
export const MAX_HOOK_LENGTH = 300;
export const DEFAULT_VOICE_MODEL = 'eleven_multilingual_v2';
export const DEFAULT_IMAGE_MODEL = 'flux-pro';
export const DEFAULT_VIDEO_MODEL = 'kling-2.5-turbo';
export const RENDER_POLL_INTERVAL_MS = 5000;
export const MAX_RENDER_POLL_ATTEMPTS = 120;
export const SHOTSTACK_CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shotstack`
  : '';
