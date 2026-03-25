-- ============================================================
-- SUTRA by Purama - Script SQL COMPLET
-- ============================================================
-- COPIE-COLLE CE FICHIER EN ENTIER dans le SQL Editor de Supabase
-- Supabase Dashboard → SQL Editor → New Query → Coller → Run
-- ============================================================

-- ============================================================
-- MIGRATION 001: Schéma initial
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  full_name TEXT,
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

CREATE TABLE IF NOT EXISTS public.series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  theme TEXT,
  total_episodes INTEGER DEFAULT 1,
  plan JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  hashtags TEXT[] DEFAULT '{}',
  format TEXT DEFAULT 'short' CHECK (format IN ('youtube', 'short', 'tiktok', 'story', 'pub', 'docu', 'faceless', 'podcast')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'editing', 'ready', 'published', 'completed', 'error')),
  script JSONB,
  shotstack_json JSONB,
  shotstack_render_id TEXT,
  video_url TEXT,
  thumbnail_urls TEXT[] DEFAULT '{}',
  voice_style TEXT DEFAULT 'narrateur-pro',
  visual_style TEXT DEFAULT 'cinematique',
  video_model TEXT DEFAULT 'auto',
  duration_seconds INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  viral_score JSONB,
  published_platforms JSONB DEFAULT '[]'::jsonb,
  analytics JSONB,
  series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
  episode_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  price_paid DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_id, template_id)
);

CREATE TABLE IF NOT EXISTS public.autopilot_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'generating', 'published', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
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

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own videos" ON public.videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own videos" ON public.videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own videos" ON public.videos FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own series" ON public.series FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create series" ON public.series FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own series" ON public.series FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own series" ON public.series FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view cache" ON public.asset_cache FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can manage cache" ON public.asset_cache FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Creators can manage own templates" ON public.templates FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "Users can view own purchases" ON public.template_purchases FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Users can create purchases" ON public.template_purchases FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can view own queue" ON public.autopilot_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own queue" ON public.autopilot_queue FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- MIGRATION 002: Parrainage, Concours, Shorts
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_total_earned DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_milestones_claimed JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS credits_used_photos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_used_shorts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_used_longs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS shorts_conversions_used INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_used TEXT,
  referred_plan TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'churned')),
  first_month_commission DECIMAL(10,2) DEFAULT 0,
  monthly_commission DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('commission_first_month', 'commission_recurring', 'milestone_bonus', 'contest_prize', 'withdrawal', 'influencer_commission')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  referral_id UUID REFERENCES public.referrals(id),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'processing', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'paypal')),
  bank_iban TEXT,
  paypal_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone INTEGER NOT NULL,
  bonus_amount DECIMAL(10,2) NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone)
);

CREATE TABLE IF NOT EXISTS public.contest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  contest_month TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('youtube', 'vertical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'evaluated', 'winner', 'rejected')),
  ai_score INTEGER,
  ai_evaluation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contest_month, category)
);

CREATE TABLE IF NOT EXISTS public.contest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_month TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('youtube', 'vertical')),
  winner_id UUID NOT NULL REFERENCES public.profiles(id),
  winner_video_id UUID NOT NULL REFERENCES public.videos(id),
  winner_score INTEGER,
  prize_amount DECIMAL(10,2),
  monthly_revenue DECIMAL(10,2),
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contest_month, category)
);

CREATE TABLE IF NOT EXISTS public.shorts_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_url TEXT,
  source_type TEXT CHECK (source_type IN ('youtube', 'upload')),
  transcript TEXT,
  transcript_timestamps JSONB,
  analysis JSONB,
  num_shorts INTEGER DEFAULT 5,
  target_duration INTEGER DEFAULT 30,
  subtitle_style TEXT DEFAULT 'tiktok',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'transcribing', 'analyzing', 'rendering', 'completed', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generated_shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.shorts_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id),
  title TEXT,
  hook TEXT,
  description TEXT,
  hashtags TEXT[] DEFAULT '{}',
  start_time FLOAT,
  end_time FLOAT,
  duration FLOAT,
  viral_score INTEGER DEFAULT 0,
  subtitle_highlights TEXT[] DEFAULT '{}',
  shotstack_render_id TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'rendering', 'completed', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_month ON public.contest_submissions(contest_month);
CREATE INDEX IF NOT EXISTS idx_contest_results_month ON public.contest_results(contest_month);
CREATE INDEX IF NOT EXISTS idx_shorts_jobs_user ON public.shorts_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_shorts_job ON public.generated_shorts(job_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shorts_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_shorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they're part of" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Service role manages referrals" ON public.referrals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages transactions" ON public.wallet_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages withdrawals" ON public.withdrawals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users can view own milestones" ON public.referral_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages milestones" ON public.referral_milestones FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users can view all submissions" ON public.contest_submissions FOR SELECT USING (true);
CREATE POLICY "Users can create own submissions" ON public.contest_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages submissions" ON public.contest_submissions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can view results" ON public.contest_results FOR SELECT USING (true);
CREATE POLICY "Service role manages results" ON public.contest_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users can view own shorts jobs" ON public.shorts_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create shorts jobs" ON public.shorts_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shorts jobs" ON public.shorts_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages shorts jobs" ON public.shorts_jobs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users can view own shorts" ON public.generated_shorts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own shorts" ON public.generated_shorts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role manages shorts" ON public.generated_shorts FOR ALL USING (auth.role() = 'service_role');

-- Referral code auto-generation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  name_part TEXT;
BEGIN
  name_part := UPPER(REGEXP_REPLACE(COALESCE(NEW.name, 'USER'), '[^A-Za-z]', '', 'g'));
  name_part := LEFT(name_part, 8);
  code := 'SUTRA-' || name_part || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code) LOOP
    code := 'SUTRA-' || name_part || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END LOOP;
  NEW.referral_code := code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- ============================================================
-- MIGRATION 003: Autopilot, Scheduler, Mirror, Thumbnails
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_mode text DEFAULT 'approval';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_frequency jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_niche text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_style text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS optimal_posting_times jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_profile jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_last_analyzed timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_video_count int DEFAULT 0;

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  platform text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  optimal_score int DEFAULT 0,
  status text DEFAULT 'scheduled',
  approval_notified boolean DEFAULT false,
  published_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_scheduled_posts') THEN
    CREATE POLICY "users_own_scheduled_posts" ON scheduled_posts FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled ON scheduled_posts(scheduled_at);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  format text,
  estimated_viral_score int DEFAULT 0,
  style_match_score int DEFAULT 0,
  status text DEFAULT 'pending',
  video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_suggestions') THEN
    CREATE POLICY "users_own_suggestions" ON ai_suggestions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON ai_suggestions(user_id);

CREATE TABLE IF NOT EXISTS creation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly',
  days_of_week int[] DEFAULT '{}',
  day_of_month int,
  hour int DEFAULT 18,
  minute int DEFAULT 0,
  custom_dates timestamptz[] DEFAULT '{}',
  format text DEFAULT 'youtube',
  topic text,
  ai_chooses_topic boolean DEFAULT false,
  voice_style text,
  visual_style text,
  platforms text[] DEFAULT '{youtube}',
  publish_mode text DEFAULT 'approval',
  publish_at_creation_time boolean DEFAULT true,
  is_active boolean DEFAULT true,
  videos_created int DEFAULT 0,
  last_executed_at timestamptz,
  next_execution_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE creation_schedules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_schedules') THEN
    CREATE POLICY "users_own_schedules" ON creation_schedules FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_schedules_user ON creation_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_next ON creation_schedules(next_execution_at);

CREATE TABLE IF NOT EXISTS thumbnails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text,
  text_overlay text,
  text_color text DEFAULT '#FFFFFF',
  text_outline_color text DEFAULT '#000000',
  layout text DEFAULT 'text_center',
  dominant_emotion text,
  is_selected boolean DEFAULT false,
  variant_number int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE thumbnails ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_thumbnails') THEN
    CREATE POLICY "users_own_thumbnails" ON thumbnails FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_thumbnails_video ON thumbnails(video_id);

ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_id uuid REFERENCES thumbnails(id);

-- ============================================================
-- MIGRATION 004: Influenceur + Parrainage enrichi
-- ============================================================

CREATE TABLE IF NOT EXISTS influencer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name varchar(100) NOT NULL,
  platform varchar(30) DEFAULT 'youtube',
  channel_url text,
  custom_link_slug varchar(50) UNIQUE NOT NULL,
  stripe_connect_id varchar(255),
  bank_rib text,
  bank_iban text,
  bank_bic text,
  payout_method varchar(20) DEFAULT 'stripe' CHECK (payout_method IN ('stripe', 'bank_transfer')),
  contract_start date,
  contract_end date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS influencer_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid REFERENCES influencer_profiles(id) ON DELETE CASCADE NOT NULL,
  ip_hash varchar(64),
  user_agent text,
  referrer_url text,
  country varchar(2),
  device_type varchar(20),
  clicked_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS influencer_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid REFERENCES influencer_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id),
  click_id uuid REFERENCES influencer_clicks(id),
  conversion_type varchar(20) NOT NULL CHECK (conversion_type IN ('signup', 'subscription')),
  subscription_plan varchar(50),
  subscription_amount decimal(10,2),
  stripe_subscription_id varchar(255),
  converted_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS influencer_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid REFERENCES influencer_profiles(id) ON DELETE CASCADE NOT NULL,
  type varchar(30) NOT NULL CHECK (type IN ('commission_standard', 'milestone_bonus', 'recurring_monthly')),
  amount decimal(10,2) NOT NULL,
  source_conversion_id uuid REFERENCES influencer_conversions(id),
  period_month varchar(7),
  status varchar(20) DEFAULT 'pending',
  contract_id uuid,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS influencer_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid REFERENCES influencer_profiles(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  commission_rate decimal(5,2) DEFAULT 20.00,
  status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  total_earned decimal(10,2) DEFAULT 0.00,
  payout_status varchar(20) DEFAULT 'pending',
  payout_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE influencer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_contracts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_influencer_profile') THEN
    CREATE POLICY "users_own_influencer_profile" ON influencer_profiles FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'influencer_own_clicks') THEN
    CREATE POLICY "influencer_own_clicks" ON influencer_clicks FOR SELECT USING (
      influencer_id IN (SELECT id FROM influencer_profiles WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'influencer_own_conversions') THEN
    CREATE POLICY "influencer_own_conversions" ON influencer_conversions FOR SELECT USING (
      influencer_id IN (SELECT id FROM influencer_profiles WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'influencer_own_earnings') THEN
    CREATE POLICY "influencer_own_earnings" ON influencer_earnings FOR SELECT USING (
      influencer_id IN (SELECT id FROM influencer_profiles WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'influencer_own_contracts') THEN
    CREATE POLICY "influencer_own_contracts" ON influencer_contracts FOR SELECT USING (
      influencer_id IN (SELECT id FROM influencer_profiles WHERE user_id = auth.uid())
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clicks_influencer ON influencer_clicks(influencer_id);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON influencer_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_conversions_influencer ON influencer_conversions(influencer_id);
CREATE INDEX IF NOT EXISTS idx_earnings_influencer ON influencer_earnings(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_slug ON influencer_profiles(custom_link_slug);

CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code varchar(20) UNIQUE NOT NULL,
  type varchar(20) DEFAULT 'user' CHECK (type IN ('user', 'influencer')),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid,
  beneficiary_id uuid REFERENCES profiles(id) NOT NULL,
  type varchar(30) NOT NULL CHECK (type IN ('first_payment_50pct', 'recurring_10pct', 'milestone_bonus_30pct', 'contest_reward')),
  amount decimal(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'EUR',
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'failed')),
  stripe_transfer_id varchar(255),
  period_start date,
  period_end date,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS referrer_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id) NOT NULL UNIQUE,
  discount_percent decimal(5,2) DEFAULT 10.00,
  is_active boolean DEFAULT true,
  reason text DEFAULT 'Au moins 1 filleul actif',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contest_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_result_id uuid,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  rank int NOT NULL CHECK (rank BETWEEN 1 AND 10),
  prize_amount decimal(10,2) NOT NULL,
  prize_percentage decimal(5,2) NOT NULL,
  status varchar(20) DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  platform varchar(30) NOT NULL,
  platform_user_id varchar(255),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  username varchar(255),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS publish_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  video_id uuid,
  platform varchar(30) NOT NULL,
  status varchar(20) NOT NULL,
  published_url text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrer_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_referral_codes') THEN
    CREATE POLICY "users_own_referral_codes" ON referral_codes FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_commissions') THEN
    CREATE POLICY "users_own_commissions" ON commissions FOR SELECT USING (auth.uid() = beneficiary_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_referrer_discounts') THEN
    CREATE POLICY "users_own_referrer_discounts" ON referrer_discounts FOR SELECT USING (auth.uid() = referrer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_contest_prizes') THEN
    CREATE POLICY "users_own_contest_prizes" ON contest_prizes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_connected_accounts') THEN
    CREATE POLICY "users_own_connected_accounts" ON connected_accounts FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_own_publish_logs') THEN
    CREATE POLICY "users_own_publish_logs" ON publish_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_commissions_beneficiary ON commissions(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role varchar(20) DEFAULT 'user';

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Exécute ces lignes séparément si besoin :
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true) ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN - Ta base de données est prête !
-- ============================================================
