-- Migration: analytics_snapshots + refresh_triggers
-- Feature: distribution-and-analytics / task-002

-- analytics_snapshots: cached GA4 / Search Console responses
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source     text        NOT NULL CHECK (source IN ('ga4', 'search_console')),
  data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_snapshots_user_source_fetched_idx
  ON public.analytics_snapshots (user_id, source, fetched_at DESC);

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_snapshots_select_own ON public.analytics_snapshots;
DROP POLICY IF EXISTS analytics_snapshots_insert_own ON public.analytics_snapshots;

CREATE POLICY analytics_snapshots_select_own
  ON public.analytics_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY analytics_snapshots_insert_own
  ON public.analytics_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- refresh_triggers: detected ranking drops that need content refresh
CREATE TABLE IF NOT EXISTS public.refresh_triggers (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id     uuid        REFERENCES public.sessions(id) ON DELETE SET NULL,
  query          text        NOT NULL,
  old_rank       numeric,
  new_rank       numeric,
  trigger_reason text        NOT NULL DEFAULT 'ranking_drop',
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'resolved')),
  resolved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_triggers_user_status_idx
  ON public.refresh_triggers (user_id, status);

-- Unique partial index: prevent duplicate pending triggers for same query+session
CREATE UNIQUE INDEX IF NOT EXISTS refresh_triggers_pending_unique_idx
  ON public.refresh_triggers (session_id, query)
  WHERE status = 'pending';

ALTER TABLE public.refresh_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refresh_triggers_select_own ON public.refresh_triggers;
DROP POLICY IF EXISTS refresh_triggers_insert_own ON public.refresh_triggers;
DROP POLICY IF EXISTS refresh_triggers_update_own ON public.refresh_triggers;

CREATE POLICY refresh_triggers_select_own
  ON public.refresh_triggers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY refresh_triggers_insert_own
  ON public.refresh_triggers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY refresh_triggers_update_own
  ON public.refresh_triggers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
