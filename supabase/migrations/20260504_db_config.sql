-- 1. Plan-level post count limits
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS limits JSONB NOT NULL DEFAULT '{}';

UPDATE public.subscription_plans
  SET limits = '{"post_counts":{"social_x":10,"social_linkedin":3,"social_instagram":4,"social_pinterest":5}}'
  WHERE active = true AND limits = '{}';

-- 2. Per-user schedule preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id             UUID     PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_start_hour SMALLINT NOT NULL DEFAULT 6  CHECK (schedule_start_hour BETWEEN 0 AND 23),
  schedule_end_hour   SMALLINT NOT NULL DEFAULT 22 CHECK (schedule_end_hour   BETWEEN 0 AND 23),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_own_preferences ON public.user_preferences;
CREATE POLICY users_own_preferences ON public.user_preferences FOR ALL USING (user_id = auth.uid());

-- 3. Admin-configurable app thresholds
CREATE TABLE IF NOT EXISTS public.app_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_read_app_config ON public.app_config;
CREATE POLICY public_read_app_config ON public.app_config FOR SELECT USING (true);

INSERT INTO public.app_config (key, value) VALUES
  ('brand_score_thresholds',     '{"good":80,"fair":60}'),
  ('detection_score_thresholds', '{"originality_high":90,"originality_med":70,"ai_low":20,"ai_med":40}'),
  ('seo_rank_thresholds',        '{"top":3,"mid":10}')
ON CONFLICT (key) DO NOTHING;
