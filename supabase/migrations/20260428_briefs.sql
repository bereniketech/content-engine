-- Migration: briefs table for R2 Living Content Brief
-- Feature: competitive-gaps-roadmap / task-024

CREATE TABLE IF NOT EXISTS public.briefs (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id                uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword                text        NOT NULL DEFAULT '',
  search_intent          text,
  audience               text,
  suggested_h1           text,
  h2_outline             jsonb       NOT NULL DEFAULT '[]',
  competitor_gaps        jsonb       NOT NULL DEFAULT '[]',
  recommended_word_count integer,
  ctas                   text[]      NOT NULL DEFAULT '{}',
  status                 text        NOT NULL DEFAULT 'draft'
                                     CHECK (status IN ('draft', 'approved')),
  raw_markdown           text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- One brief per session
CREATE UNIQUE INDEX IF NOT EXISTS briefs_session_id_unique_idx
  ON public.briefs (session_id);

CREATE INDEX IF NOT EXISTS briefs_user_id_idx
  ON public.briefs (user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS briefs_updated_at ON public.briefs;
CREATE TRIGGER briefs_updated_at
  BEFORE UPDATE ON public.briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS briefs_select_own ON public.briefs;
DROP POLICY IF EXISTS briefs_insert_own ON public.briefs;
DROP POLICY IF EXISTS briefs_update_own ON public.briefs;
DROP POLICY IF EXISTS briefs_delete_own ON public.briefs;

CREATE POLICY briefs_select_own ON public.briefs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY briefs_insert_own ON public.briefs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY briefs_update_own ON public.briefs
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY briefs_delete_own ON public.briefs
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE public.briefs IS 'Content briefs generated per session — one brief per session';
COMMENT ON COLUMN public.briefs.status IS 'draft = in progress, approved = user confirmed brief before generation';
