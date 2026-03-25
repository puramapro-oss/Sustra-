-- ============================================================
-- Migration 003: Prompt #3 Features
-- ============================================================
-- Adds:
--   - Autopilot Pro columns on profiles
--   - Scheduled posts table
--   - SUTRA Mirror style profile columns on profiles
--   - AI Suggestions table
--   - Creation Schedules table (SUTRA Scheduler)
--   - Thumbnails table
--   - Thumbnail reference on videos
-- ============================================================

-- ------------------------------------------------------------
-- 1. Autopilot Pro columns on profiles
-- ------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_mode text DEFAULT 'approval';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_frequency jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_niche text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autopilot_style text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS optimal_posting_times jsonb;

-- ------------------------------------------------------------
-- 2. Scheduled posts table
-- ------------------------------------------------------------
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_own_scheduled_posts'
  ) THEN
    CREATE POLICY "users_own_scheduled_posts" ON scheduled_posts
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled ON scheduled_posts(scheduled_at);

-- ------------------------------------------------------------
-- 3. SUTRA Mirror - Style profile columns on profiles
-- ------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_profile jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_last_analyzed timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_video_count int DEFAULT 0;

-- ------------------------------------------------------------
-- 4. AI Suggestions table
-- ------------------------------------------------------------
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_own_suggestions'
  ) THEN
    CREATE POLICY "users_own_suggestions" ON ai_suggestions
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suggestions_user ON ai_suggestions(user_id);

-- ------------------------------------------------------------
-- 5. Creation Schedules table (SUTRA Scheduler)
-- ------------------------------------------------------------
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_own_schedules'
  ) THEN
    CREATE POLICY "users_own_schedules" ON creation_schedules
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_schedules_user ON creation_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_next ON creation_schedules(next_execution_at);

-- ------------------------------------------------------------
-- 6. Thumbnails table
-- ------------------------------------------------------------
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_own_thumbnails'
  ) THEN
    CREATE POLICY "users_own_thumbnails" ON thumbnails
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_thumbnails_video ON thumbnails(video_id);

-- ------------------------------------------------------------
-- 7. Add thumbnail references to videos table
-- ------------------------------------------------------------
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_id uuid REFERENCES thumbnails(id);
