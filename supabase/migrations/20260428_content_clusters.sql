-- Migration: content_clusters for R8 Topical Authority Planner
-- Feature: competitive-gaps-roadmap / task-032
-- Depends on: 20260428_briefs.sql (update_updated_at_column function)

CREATE TABLE IF NOT EXISTS public.content_clusters (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar_keyword   text        NOT NULL,
  name             text        NOT NULL,
  total_articles   integer     NOT NULL DEFAULT 0
                               CHECK (total_articles BETWEEN 0 AND 13),
  published_count  integer     NOT NULL DEFAULT 0
                               CHECK (published_count >= 0),
  articles         jsonb       NOT NULL DEFAULT '[]',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_clusters_user_id_idx
  ON public.content_clusters (user_id);

CREATE INDEX IF NOT EXISTS content_clusters_created_at_idx
  ON public.content_clusters (user_id, created_at DESC);

DROP TRIGGER IF EXISTS content_clusters_updated_at ON public.content_clusters;
CREATE TRIGGER content_clusters_updated_at
  BEFORE UPDATE ON public.content_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.content_clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clusters_select_own ON public.content_clusters;
DROP POLICY IF EXISTS clusters_insert_own ON public.content_clusters;
DROP POLICY IF EXISTS clusters_update_own ON public.content_clusters;
DROP POLICY IF EXISTS clusters_delete_own ON public.content_clusters;

CREATE POLICY clusters_select_own ON public.content_clusters
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY clusters_insert_own ON public.content_clusters
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY clusters_update_own ON public.content_clusters
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY clusters_delete_own ON public.content_clusters
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE public.content_clusters IS 'Topical authority clusters — 1 pillar + up to 12 supporting articles per cluster';
COMMENT ON COLUMN public.content_clusters.articles IS 'JSONB array: [{id, keyword, searchIntent, estimatedVolume, difficulty, internalLinkTarget, publishOrder, status, sessionId?}]';
