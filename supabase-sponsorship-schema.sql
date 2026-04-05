-- 광고 매칭 기능 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. 크리에이터 광고 프로필
CREATE TABLE IF NOT EXISTS creator_ad_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  platforms JSONB DEFAULT '[]',
  content_category TEXT NOT NULL DEFAULT '',
  ad_types TEXT[] DEFAULT '{}',
  pricing_type TEXT DEFAULT 'negotiable',
  price_per_content INTEGER,
  price_min INTEGER,
  price_max INTEGER,
  bio TEXT,
  past_brands TEXT[] DEFAULT '{}',
  portfolio_urls TEXT[] DEFAULT '{}',
  available BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_ad_profiles_user ON creator_ad_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_ad_profiles_category ON creator_ad_profiles(content_category);

ALTER TABLE creator_ad_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "creator_ad_profiles_all" ON creator_ad_profiles;
CREATE POLICY "creator_ad_profiles_all" ON creator_ad_profiles FOR ALL USING (true) WITH CHECK (true);

-- 2. 광고 캠페인
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  product_name TEXT,
  brand_name TEXT,
  budget_type TEXT DEFAULT 'negotiable',
  budget_amount INTEGER,
  budget_min INTEGER,
  budget_max INTEGER,
  target_category TEXT,
  target_min_subscribers INTEGER,
  target_platform TEXT,
  target_ad_type TEXT,
  deadline TEXT,
  content_deadline TEXT,
  status TEXT DEFAULT 'open',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user ON ad_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ad_campaigns_all" ON ad_campaigns;
CREATE POLICY "ad_campaigns_all" ON ad_campaigns FOR ALL USING (true) WITH CHECK (true);
