// ============================================================================
// Profile & User Types
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: PlanType;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  credits_used_photos: number;
  credits_used_shorts: number;
  credits_used_longs: number;
  credits_reset_at: string;
  youtube_channel_id: string | null;
  youtube_access_token: string | null;
  youtube_refresh_token: string | null;
  onboarding_complete: boolean;
  // Autopilot Pro
  autopilot_enabled: boolean;
  autopilot_mode: 'auto' | 'approval';
  autopilot_frequency: Record<string, unknown> | null;
  autopilot_niche: string | null;
  autopilot_style: string | null;
  optimal_posting_times: Array<{ day: string; hour: number; score: number }> | null;
  // SUTRA Mirror
  style_profile: Record<string, unknown> | null;
  style_last_analyzed: string | null;
  style_video_count: number;
  // Referral
  referral_code: string | null;
  referral_coupon_id: string | null;
  role: 'user' | 'super_admin';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Video & Series Types
// ============================================================================

export interface Video {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slug: string;
  format: VideoFormat;
  status: VideoStatus;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  video_url: string | null;
  shotstack_render_id: string | null;
  shotstack_edit: ShotstackEdit | null;
  script: Script | null;
  viral_score: number | null;
  series_id: string | null;
  published_at: string | null;
  youtube_video_id: string | null;
  cost_estimate: number | null;
  created_at: string;
  updated_at: string;
}

export type VideoStatus =
  | 'draft'
  | 'scripting'
  | 'generating_voice'
  | 'generating_visuals'
  | 'generating_music'
  | 'assembling'
  | 'rendering'
  | 'completed'
  | 'failed'
  | 'published';

export interface Series {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  template_id: string | null;
  schedule_cron: string | null;
  is_active: boolean;
  video_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Asset Cache Types
// ============================================================================

export interface AssetCache {
  id: string;
  type: AssetType;
  tags: string[];
  description: string;
  url: string;
  source: AssetSource;
  metadata: Record<string, unknown>;
  usage_count: number;
  created_at: string;
}

export type AssetType = 'photo' | 'video' | 'audio' | 'music' | 'sound_effect' | 'voice';
export type AssetSource = 'pexels' | 'fal_ai' | 'elevenlabs' | 'upload' | 'shotstack';

// ============================================================================
// Template & Marketplace Types
// ============================================================================

export interface Template {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  preview_url: string | null;
  thumbnail_url: string | null;
  category: string;
  tags: string[];
  pipeline_config: PipelineConfig;
  price_cents: number;
  is_public: boolean;
  purchase_count: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface TemplatePurchase {
  id: string;
  user_id: string;
  template_id: string;
  purchased_at: string;
  price_paid_cents: number;
}

// ============================================================================
// Autopilot Queue Types
// ============================================================================

export interface AutopilotQueue {
  id: string;
  user_id: string;
  series_id: string;
  topic: string;
  scheduled_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_id: string | null;
  error_message: string | null;
  created_at: string;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    action?: string;
    videoId?: string;
    suggestion?: string;
  };
}

// ============================================================================
// Pipeline Types
// ============================================================================

export interface Scene {
  index: number;
  narration: string;
  visual_description: string;
  visual_source: 'stock' | 'image_ai' | 'video_ai';
  visual_keywords: string[];
  duration_seconds: number;
  transition: TransitionType;
  text_overlay: string | null;
  importance: 'low' | 'medium' | 'high' | 'hero';
  asset_url?: string;
  voice_url?: string;
  voice_timestamps?: VoiceTimestamp[];
}

export interface VoiceTimestamp {
  character: string;
  start: number;
  end: number;
}

export interface Script {
  title: string;
  hook: string;
  scenes: Scene[];
  cta: string;
  total_duration_seconds: number;
  viral_score: number;
  tags: string[];
}

export interface PipelineConfig {
  topic: string;
  format: VideoFormat;
  voice_style: VoiceStyle;
  visual_style: VisualStyle;
  voice_id?: string;
  music_prompt?: string;
  music_url?: string;
  target_duration_seconds?: number;
  optimize_cost: boolean;
  auto_publish: boolean;
  youtube_title?: string;
  youtube_description?: string;
  youtube_tags?: string[];
}

export interface PipelineResult {
  video_id: string;
  render_id: string;
  status: GenerationStatus;
  video_url: string | null;
  thumbnail_url: string | null;
  script: Script;
  total_cost_cents: number;
  duration_ms: number;
}

export type GenerationStatus =
  | 'idle'
  | 'scripting'
  | 'voice_generation'
  | 'visual_generation'
  | 'music_generation'
  | 'assembly'
  | 'rendering'
  | 'publishing'
  | 'completed'
  | 'failed';

export interface PipelineProgress {
  status: GenerationStatus;
  step: number;
  totalSteps: number;
  message: string;
  percentage: number;
}

// ============================================================================
// Shotstack Types
// ============================================================================

export interface ShotstackEdit {
  timeline: ShotstackTimeline;
  output: ShotstackOutput;
  callback?: string;
}

export interface ShotstackTimeline {
  soundtrack?: ShotstackSoundtrack;
  background?: string;
  tracks: ShotstackTrack[];
}

export interface ShotstackTrack {
  clips: ShotstackClip[];
}

export interface ShotstackClip {
  asset: ShotstackAsset;
  start: number;
  length: number;
  fit?: 'cover' | 'contain' | 'crop' | 'none';
  scale?: number;
  position?: 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left' | 'topLeft' | 'center';
  offset?: { x: number; y: number };
  transition?: ShotstackTransition;
  effect?: string;
  filter?: string;
  opacity?: number;
  transform?: ShotstackTransform;
}

export type ShotstackAsset =
  | ShotstackVideoAsset
  | ShotstackImageAsset
  | ShotstackTitleAsset
  | ShotstackAudioAsset
  | ShotstackHtmlAsset;

export interface ShotstackVideoAsset {
  type: 'video';
  src: string;
  trim?: number;
  volume?: number;
  crop?: { top: number; bottom: number; left: number; right: number };
}

export interface ShotstackImageAsset {
  type: 'image';
  src: string;
  crop?: { top: number; bottom: number; left: number; right: number };
}

export interface ShotstackTitleAsset {
  type: 'title';
  text: string;
  style?: string;
  color?: string;
  size?: 'xx-small' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' | 'xx-large';
  background?: string;
  position?: 'top' | 'center' | 'bottom';
  offset?: { x: number; y: number };
}

export interface ShotstackAudioAsset {
  type: 'audio';
  src: string;
  trim?: number;
  volume?: number;
  effect?: 'fadeIn' | 'fadeOut' | 'fadeInFadeOut';
}

export interface ShotstackHtmlAsset {
  type: 'html';
  html: string;
  css?: string;
  width?: number;
  height?: number;
}

export interface ShotstackTransition {
  in?: TransitionType;
  out?: TransitionType;
}

export interface ShotstackTransform {
  rotate?: { angle: number };
  skew?: { x: number; y: number };
  flip?: { horizontal: boolean; vertical: boolean };
}

export interface ShotstackSoundtrack {
  src: string;
  effect?: 'fadeIn' | 'fadeOut' | 'fadeInFadeOut';
  volume?: number;
}

export interface ShotstackOutput {
  format: 'mp4' | 'gif' | 'jpg' | 'png' | 'bmp' | 'webm';
  resolution: 'sd' | 'hd' | '1080' | '4k';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
  fps?: number;
  quality?: 'low' | 'medium' | 'high';
  size?: { width: number; height: number };
  destinations?: ShotstackDestination[];
}

export interface ShotstackDestination {
  provider: 's3' | 'youtube';
  options: Record<string, string>;
}

export interface ShotstackRenderResponse {
  success: boolean;
  message: string;
  response: {
    id: string;
    owner: string;
    plan: string;
    status: string;
    url?: string;
    error?: string;
    created: string;
    updated: string;
  };
}

// ============================================================================
// Plan Types
// ============================================================================

export type PlanType = 'free' | 'starter' | 'creator' | 'empire';

export interface PlanLimits {
  photos_per_month: number;
  shorts_per_month: number;
  longs_per_month: number;
  shorts_conversions_per_month: number;
  max_shorts_per_conversion: number;
  voice_cloning: boolean;
  custom_templates: boolean;
  autopilot: boolean;
  autopilot_auto_mode: boolean;
  priority_render: boolean;
  marketplace_access: boolean;
  api_access: boolean;
  team_members: number;
  max_schedules: number;
  thumbnail_variants: number;
  mirror_suggestions_per_day: number;
}

export interface PlanDefinition {
  type: PlanType;
  name: string;
  price_cents: number;
  price_label: string;
  description: string;
  limits: PlanLimits;
  stripe_price_id: string;
  features: string[];
  popular?: boolean;
}

// ============================================================================
// Voice & Visual Style Types
// ============================================================================

export type VoiceStyle =
  | 'cinematic_male'
  | 'cinematic_female'
  | 'energetic_male'
  | 'energetic_female'
  | 'calm_male'
  | 'calm_female'
  | 'documentary_male'
  | 'documentary_female'
  | 'custom';

export interface VoiceStyleDefinition {
  id: VoiceStyle;
  name: string;
  description: string;
  elevenlabs_voice_id: string;
  sample_url: string | null;
}

export type VisualStyle =
  | 'cinematic'
  | 'documentary'
  | 'minimalist'
  | 'vibrant'
  | 'retro'
  | 'dark_moody'
  | 'neon'
  | 'pastel'
  | 'corporate'
  | 'hand_drawn';

export interface VisualStyleDefinition {
  id: VisualStyle;
  name: string;
  description: string;
  prompt_modifier: string;
  color_palette: string[];
}

export type VideoFormat = 'short' | 'long' | 'photo';

export interface VideoFormatDefinition {
  id: VideoFormat;
  name: string;
  description: string;
  aspect_ratio: '16:9' | '9:16' | '1:1' | '4:5';
  resolution: '1080' | 'hd' | '4k';
  max_duration_seconds: number;
  min_duration_seconds: number;
}

export type TransitionType =
  | 'fade'
  | 'reveal'
  | 'wipeLeft'
  | 'wipeRight'
  | 'slideLeft'
  | 'slideRight'
  | 'slideUp'
  | 'slideDown'
  | 'carouselLeft'
  | 'carouselRight'
  | 'carouselUp'
  | 'carouselDown'
  | 'shuffleTopRight'
  | 'shuffleRightTop'
  | 'zoom';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================================
// Editor Types
// ============================================================================

export interface EditorTimeline {
  tracks: EditorTrack[];
  duration: number;
  zoom: number;
}

export interface EditorTrack {
  id: string;
  type: 'video' | 'audio' | 'text' | 'overlay';
  label: string;
  clips: EditorClip[];
  muted: boolean;
  locked: boolean;
}

export interface EditorClip {
  id: string;
  track_id: string;
  type: 'video' | 'image' | 'audio' | 'text' | 'title';
  src: string;
  start: number;
  duration: number;
  trim_start: number;
  trim_end: number;
  label: string;
  properties: Record<string, unknown>;
}

// ============================================================================
// YouTube Types
// ============================================================================

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
}

export interface YouTubeVideoStats {
  id: string;
  title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
}

export interface YouTubeUploadResult {
  video_id: string;
  url: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
}

// ============================================================================
// Cost Estimation Types
// ============================================================================

export interface CostBreakdown {
  claude_script: number;
  elevenlabs_voice: number;
  fal_ai_images: number;
  fal_ai_videos: number;
  pexels_stock: number;
  elevenlabs_music: number;
  shotstack_render: number;
  total: number;
}

export interface SourceRecommendation {
  source: 'stock' | 'image_ai' | 'video_ai';
  reason: string;
  estimated_cost_cents: number;
}

// ============================================================================
// Scheduled Posts & Autopilot Types
// ============================================================================

export interface ScheduledPost {
  id: string;
  user_id: string;
  video_id: string | null;
  platform: string;
  scheduled_at: string;
  optimal_score: number;
  status: 'scheduled' | 'approved' | 'publishing' | 'published' | 'cancelled' | 'failed';
  approval_notified: boolean;
  published_url: string | null;
  created_at: string;
  videos?: Video;
}

// ============================================================================
// Creation Schedules (SUTRA Scheduler) Types
// ============================================================================

export interface CreationSchedule {
  id: string;
  user_id: string;
  name: string;
  frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  days_of_week: number[];
  day_of_month: number | null;
  hour: number;
  minute: number;
  custom_dates: string[];
  format: string;
  topic: string | null;
  ai_chooses_topic: boolean;
  voice_style: string | null;
  visual_style: string | null;
  platforms: string[];
  publish_mode: 'auto' | 'approval';
  publish_at_creation_time: boolean;
  is_active: boolean;
  videos_created: number;
  last_executed_at: string | null;
  next_execution_at: string | null;
  created_at: string;
}

// ============================================================================
// Thumbnail Types
// ============================================================================

export interface Thumbnail {
  id: string;
  video_id: string;
  user_id: string;
  image_url: string | null;
  text_overlay: string | null;
  text_color: string;
  text_outline_color: string;
  layout: string;
  dominant_emotion: string | null;
  is_selected: boolean;
  variant_number: number;
  created_at: string;
}

export interface ThumbnailBrief {
  text_overlay: string;
  text_color: string;
  text_outline_color: string;
  image_prompt: string;
  dominant_emotion: string;
  background_style: string;
  accent_elements: string[];
  layout: string;
}

// ============================================================================
// AI Suggestions (SUTRA Mirror) Types
// ============================================================================

export interface AISuggestion {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  format: string | null;
  estimated_viral_score: number;
  style_match_score: number;
  status: 'pending' | 'accepted' | 'dismissed';
  video_id: string | null;
  created_at: string;
  expires_at: string;
}

export interface StyleProfile {
  themes: string[];
  tone: string;
  preferred_duration: string;
  visual_style: string;
  structure_pattern: string;
  hook_style: string;
  strengths: string[];
  best_performing_topics: string[];
  suggested_improvements: string[];
  next_video_suggestions: Array<{
    title: string;
    description: string;
    format: string;
    estimated_viral_score: number;
  }>;
}
