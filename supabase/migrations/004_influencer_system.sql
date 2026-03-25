-- ============================================================================
-- Migration 004: Système Influenceur + Tables enrichies Parrainage/Concours
-- ============================================================================

-- ============================================================================
-- 1. SYSTÈME INFLUENCEUR COMPLET
-- ============================================================================

-- Profils influenceurs
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

-- Tracking des clics sur les liens influenceurs
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

-- Conversions influenceurs
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

-- Gains influenceurs
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

-- Contrats influenceurs (1 mois renouvelable)
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

-- RLS pour influenceur
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

-- Indexes performance
CREATE INDEX IF NOT EXISTS idx_clicks_influencer ON influencer_clicks(influencer_id);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON influencer_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_conversions_influencer ON influencer_conversions(influencer_id);
CREATE INDEX IF NOT EXISTS idx_earnings_influencer ON influencer_earnings(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_slug ON influencer_profiles(custom_link_slug);

-- ============================================================================
-- 2. TABLES ENRICHIES PARRAINAGE (Prompt Ultime)
-- ============================================================================

-- Table codes de parrainage dédiée
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code varchar(20) UNIQUE NOT NULL,
  type varchar(20) DEFAULT 'user' CHECK (type IN ('user', 'influencer')),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Table commissions détaillée
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

-- Table réductions parrains (10% NON cumulable)
CREATE TABLE IF NOT EXISTS referrer_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id) NOT NULL UNIQUE,
  discount_percent decimal(5,2) DEFAULT 10.00,
  is_active boolean DEFAULT true,
  reason text DEFAULT 'Au moins 1 filleul actif',
  created_at timestamptz DEFAULT now()
);

-- Table prix du concours
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

-- Table comptes connectés (réseaux sociaux)
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

-- Table logs de publication
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

-- RLS
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
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_beneficiary ON commissions(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);

-- ============================================================================
-- 3. AJOUT ROLE ADMIN SUR PROFILES
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role varchar(20) DEFAULT 'user';

-- Mettre à jour le super admin
UPDATE profiles SET role = 'super_admin' WHERE email = 'matiss.frasne@gmail.com';
