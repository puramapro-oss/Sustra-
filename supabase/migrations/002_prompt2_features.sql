-- SUTRA by Purama - Prompt #2 Schema Extensions
-- Referral System, Contest System, Video→Shorts

-- ========================
-- REFERRAL SYSTEM
-- ========================

-- Add referral columns to profiles
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

-- Referrals table (parrain-filleul relationships)
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

-- Wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('commission_first_month', 'commission_recurring', 'milestone_bonus', 'contest_prize', 'withdrawal')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  referral_id UUID REFERENCES public.referrals(id),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'processing', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawal requests
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

-- Referral milestones
CREATE TABLE IF NOT EXISTS public.referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone INTEGER NOT NULL,
  bonus_amount DECIMAL(10,2) NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone)
);

-- ========================
-- CONTEST SYSTEM (SUTRA AWARDS)
-- ========================

-- Contest submissions
CREATE TABLE IF NOT EXISTS public.contest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  contest_month TEXT NOT NULL, -- format "YYYY-MM"
  category TEXT NOT NULL CHECK (category IN ('youtube', 'vertical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'evaluated', 'winner', 'rejected')),
  ai_score INTEGER,
  ai_evaluation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contest_month, category)
);

-- Contest results
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

-- ========================
-- VIDEO → SHORTS
-- ========================

-- Shorts conversion jobs
CREATE TABLE IF NOT EXISTS public.shorts_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_url TEXT, -- YouTube URL or uploaded video URL
  source_type TEXT CHECK (source_type IN ('youtube', 'upload')),
  transcript TEXT,
  transcript_timestamps JSONB,
  analysis JSONB, -- Claude's moment analysis
  num_shorts INTEGER DEFAULT 5,
  target_duration INTEGER DEFAULT 30,
  subtitle_style TEXT DEFAULT 'tiktok',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'transcribing', 'analyzing', 'rendering', 'completed', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated shorts (linked to shorts_jobs)
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

-- ========================
-- INDEXES
-- ========================

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_month ON public.contest_submissions(contest_month);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_user ON public.contest_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_results_month ON public.contest_results(contest_month);
CREATE INDEX IF NOT EXISTS idx_shorts_jobs_user ON public.shorts_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_shorts_job ON public.generated_shorts(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_shorts_user ON public.generated_shorts(user_id);

-- ========================
-- ROW LEVEL SECURITY
-- ========================

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shorts_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_shorts ENABLE ROW LEVEL SECURITY;

-- Referrals: users can see their own (as referrer or referred)
CREATE POLICY "Users can view referrals they're part of" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Service role manages referrals" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role');

-- Wallet transactions: users can view their own
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages transactions" ON public.wallet_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Withdrawals: users can view/create their own
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdrawals" ON public.withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages withdrawals" ON public.withdrawals
  FOR ALL USING (auth.role() = 'service_role');

-- Milestones: users can view their own
CREATE POLICY "Users can view own milestones" ON public.referral_milestones
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages milestones" ON public.referral_milestones
  FOR ALL USING (auth.role() = 'service_role');

-- Contest submissions: users can manage their own, view all for hall of fame
CREATE POLICY "Users can view all submissions" ON public.contest_submissions
  FOR SELECT USING (true);
CREATE POLICY "Users can create own submissions" ON public.contest_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages submissions" ON public.contest_submissions
  FOR ALL USING (auth.role() = 'service_role');

-- Contest results: viewable by all
CREATE POLICY "Anyone can view results" ON public.contest_results
  FOR SELECT USING (true);
CREATE POLICY "Service role manages results" ON public.contest_results
  FOR ALL USING (auth.role() = 'service_role');

-- Shorts jobs: users manage their own
CREATE POLICY "Users can view own shorts jobs" ON public.shorts_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create shorts jobs" ON public.shorts_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shorts jobs" ON public.shorts_jobs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages shorts jobs" ON public.shorts_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Generated shorts: users manage their own
CREATE POLICY "Users can view own shorts" ON public.generated_shorts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own shorts" ON public.generated_shorts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role manages shorts" ON public.generated_shorts
  FOR ALL USING (auth.role() = 'service_role');

-- ========================
-- FUNCTION: Generate referral code on profile creation
-- ========================

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  name_part TEXT;
BEGIN
  -- Extract first name part
  name_part := UPPER(REGEXP_REPLACE(COALESCE(NEW.name, 'USER'), '[^A-Za-z]', '', 'g'));
  name_part := LEFT(name_part, 8);

  -- Generate unique code
  code := 'SUTRA-' || name_part || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code) LOOP
    code := 'SUTRA-' || name_part || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END LOOP;

  NEW.referral_code := code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate referral code
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
CREATE TRIGGER generate_referral_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();
