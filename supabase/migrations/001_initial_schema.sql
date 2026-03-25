-- SUTRA by Purama - Database Schema
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'creator', 'empire')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  credits_photos INTEGER DEFAULT 0,
  credits_shorts INTEGER DEFAULT 0,
  credits_longs INTEGER DEFAULT 0,
  cloned_voices JSONB DEFAULT '[]'::jsonb,
  brand_kit JSONB,
  autopilot_config JSONB,
  style_dna JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Series
CREATE TABLE IF NOT EXISTS public.series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  theme TEXT,
  total_episodes INTEGER DEFAULT 1,
  plan JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  hashtags TEXT[] DEFAULT '{}',
  format TEXT DEFAULT 'short' CHECK (format IN ('youtube', 'short', 'tiktok', 'story', 'pub', 'docu', 'faceless', 'podcast')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'editing', 'ready', 'published', 'error')),
  script JSONB,
  shotstack_json JSONB,
  shotstack_render_id TEXT,
  video_url TEXT,
  thumbnail_urls TEXT[] DEFAULT '{}',
  voice_style TEXT DEFAULT 'narrateur-pro',
  visual_style TEXT DEFAULT 'cinematique',
  video_model TEXT DEFAULT 'auto',
  duration_seconds INTEGER DEFAULT 0,
  viral_score JSONB,
  published_platforms JSONB DEFAULT '[]'::jsonb,
  analytics JSONB,
  series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
  episode_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset Cache
CREATE TABLE IF NOT EXISTS public.asset_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('video_clip', 'image', 'music', 'sound_effect')),
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  source TEXT CHECK (source IN ('pexels', 'unsplash', 'falai', 'elevenlabs', 'suno')),
  url TEXT NOT NULL,
  duration_seconds FLOAT,
  metadata JSONB,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates Marketplace
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  preview_url TEXT,
  shotstack_template JSONB,
  price DECIMAL(10, 2) DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Purchases
CREATE TABLE IF NOT EXISTS public.template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  price_paid DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_id, template_id)
);

-- Autopilot Queue
CREATE TABLE IF NOT EXISTS public.autopilot_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'generating', 'published', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_format ON public.videos(format);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_cache_type ON public.asset_cache(type);
CREATE INDEX IF NOT EXISTS idx_asset_cache_tags ON public.asset_cache USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_asset_cache_source ON public.asset_cache(source);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_creator ON public.templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_queue_user ON public.autopilot_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_queue_scheduled ON public.autopilot_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_series_user ON public.series(user_id);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Videos: users can CRUD their own videos
CREATE POLICY "Users can view own videos" ON public.videos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own videos" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

-- Series: users can CRUD their own series
CREATE POLICY "Users can view own series" ON public.series
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create series" ON public.series
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own series" ON public.series
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own series" ON public.series
  FOR DELETE USING (auth.uid() = user_id);

-- Asset Cache: readable by all authenticated users, writable by service role
CREATE POLICY "Authenticated users can view cache" ON public.asset_cache
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can manage cache" ON public.asset_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Templates: viewable by all, manageable by creator
CREATE POLICY "Anyone can view templates" ON public.templates
  FOR SELECT USING (true);
CREATE POLICY "Creators can manage own templates" ON public.templates
  FOR ALL USING (auth.uid() = creator_id);

-- Template Purchases: users can view/create their own
CREATE POLICY "Users can view own purchases" ON public.template_purchases
  FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Users can create purchases" ON public.template_purchases
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Autopilot Queue: users can manage their own queue
CREATE POLICY "Users can view own queue" ON public.autopilot_queue
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own queue" ON public.autopilot_queue
  FOR ALL USING (auth.uid() = user_id);

-- Chat Messages: users can manage their own messages
CREATE POLICY "Users can view own messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Storage buckets
-- Run these in SQL editor separately or via Supabase dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true);
