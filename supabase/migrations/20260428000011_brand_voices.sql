-- Migration: brand_voices table for R3 Brand Voice Profiles
-- Feature: competitive-gaps-roadmap / task-020

CREATE TABLE IF NOT EXISTS public.brand_voices (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  tone_adjectives   text[]      NOT NULL DEFAULT '{}',
  writing_samples   text[]      NOT NULL DEFAULT '{}',
  forbidden_phrases text[]      NOT NULL DEFAULT '{}',
  formality_level   text        NOT NULL DEFAULT 'neutral'
                                CHECK (formality_level IN ('formal', 'casual', 'neutral')),
  is_active         boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS brand_voices_user_id_idx ON public.brand_voices (user_id);
CREATE INDEX IF NOT EXISTS brand_voices_user_active_idx ON public.brand_voices (user_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.brand_voices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brand_voices_select_own ON public.brand_voices;
DROP POLICY IF EXISTS brand_voices_insert_own ON public.brand_voices;
DROP POLICY IF EXISTS brand_voices_update_own ON public.brand_voices;
DROP POLICY IF EXISTS brand_voices_delete_own ON public.brand_voices;

CREATE POLICY brand_voices_select_own ON public.brand_voices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY brand_voices_insert_own ON public.brand_voices
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY brand_voices_update_own ON public.brand_voices
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY brand_voices_delete_own ON public.brand_voices
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE public.brand_voices IS 'Brand voice profiles for injecting into content generation prompts';
COMMENT ON COLUMN public.brand_voices.is_active IS 'Only one brand voice can be active per user at a time (enforced in application layer)';
