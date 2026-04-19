-- Migration: distribution_logs + scheduled_posts
-- Feature: distribution-and-analytics / task-001

-- distribution_logs: records every platform publish attempt
CREATE TABLE IF NOT EXISTS public.distribution_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform     text        NOT NULL,
  status       text        NOT NULL CHECK (status IN ('published', 'failed')),
  external_id  text,
  metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  error_details text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS distribution_logs_session_platform_idx
  ON public.distribution_logs (session_id, platform);

CREATE INDEX IF NOT EXISTS distribution_logs_user_id_idx
  ON public.distribution_logs (user_id);

ALTER TABLE public.distribution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS distribution_logs_select_own ON public.distribution_logs;
DROP POLICY IF EXISTS distribution_logs_insert_own ON public.distribution_logs;

CREATE POLICY distribution_logs_select_own
  ON public.distribution_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY distribution_logs_insert_own
  ON public.distribution_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- scheduled_posts: queued future publishes
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform         text        NOT NULL,
  asset_type       text        NOT NULL,
  content_snapshot jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status           text        NOT NULL DEFAULT 'queued'
                               CHECK (status IN ('queued', 'published', 'failed', 'cancelled')),
  publish_at       timestamptz NOT NULL,
  published_at     timestamptz,
  external_id      text,
  error_details    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_posts_status_publish_at_idx
  ON public.scheduled_posts (status, publish_at);

CREATE INDEX IF NOT EXISTS scheduled_posts_user_id_idx
  ON public.scheduled_posts (user_id);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scheduled_posts_select_own ON public.scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_insert_own ON public.scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_update_own ON public.scheduled_posts;

CREATE POLICY scheduled_posts_select_own
  ON public.scheduled_posts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY scheduled_posts_insert_own
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY scheduled_posts_update_own
  ON public.scheduled_posts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
