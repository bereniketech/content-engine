-- =============================================================
-- CONSOLIDATED MIGRATION — migrations NOT covered by 20260501_init_monetization.sql
-- Safe to run after 20260501_init_monetization has already been applied.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- updated_at trigger helpers (needed by briefs + content_clusters)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ── sessions + content_assets (20260321) ──────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_type TEXT        NOT NULL CHECK (input_type IN ('topic','upload','data-driven')),
  input_data JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessions_select_own ON public.sessions;
DROP POLICY IF EXISTS sessions_insert_own ON public.sessions;
DROP POLICY IF EXISTS sessions_update_own ON public.sessions;
CREATE POLICY sessions_select_own ON public.sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY sessions_insert_own ON public.sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY sessions_update_own ON public.sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.content_assets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  asset_type TEXT        NOT NULL,
  content    JSONB       NOT NULL DEFAULT '{}',
  version    INTEGER     NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_assets_select_own ON public.content_assets;
DROP POLICY IF EXISTS content_assets_insert_own ON public.content_assets;
DROP POLICY IF EXISTS content_assets_update_own ON public.content_assets;
CREATE POLICY content_assets_select_own ON public.content_assets FOR SELECT USING (session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid()));
CREATE POLICY content_assets_insert_own ON public.content_assets FOR INSERT WITH CHECK (session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid()));
CREATE POLICY content_assets_update_own ON public.content_assets FOR UPDATE USING (session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())) WITH CHECK (session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid()));

-- ── distribution_logs + scheduled_posts (20260420_001) ────────
CREATE TABLE IF NOT EXISTS public.distribution_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  platform      TEXT        NOT NULL,
  status        TEXT        NOT NULL CHECK (status IN ('published','failed')),
  external_id   TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  error_details TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS distribution_logs_session_platform_idx ON public.distribution_logs (session_id, platform);
CREATE INDEX IF NOT EXISTS distribution_logs_user_id_idx          ON public.distribution_logs (user_id);
ALTER TABLE public.distribution_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS distribution_logs_select_own ON public.distribution_logs;
DROP POLICY IF EXISTS distribution_logs_insert_own ON public.distribution_logs;
CREATE POLICY distribution_logs_select_own ON public.distribution_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY distribution_logs_insert_own ON public.distribution_logs FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  platform         TEXT        NOT NULL,
  asset_type       TEXT        NOT NULL,
  content_snapshot JSONB       NOT NULL DEFAULT '{}',
  title            TEXT,
  status           TEXT        NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','published','failed','cancelled')),
  publish_at       TIMESTAMPTZ NOT NULL,
  published_at     TIMESTAMPTZ,
  external_id      TEXT,
  error_details    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduled_posts_status_publish_at_idx ON public.scheduled_posts (status, publish_at);
CREATE INDEX IF NOT EXISTS scheduled_posts_user_id_idx           ON public.scheduled_posts (user_id);
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scheduled_posts_select_own ON public.scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_insert_own ON public.scheduled_posts;
DROP POLICY IF EXISTS scheduled_posts_update_own ON public.scheduled_posts;
CREATE POLICY scheduled_posts_select_own ON public.scheduled_posts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY scheduled_posts_insert_own ON public.scheduled_posts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY scheduled_posts_update_own ON public.scheduled_posts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── analytics_snapshots + refresh_triggers (20260420_002) ─────
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source     TEXT        NOT NULL CHECK (source IN ('ga4','search_console')),
  data       JSONB       NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_snapshots_user_source_fetched_idx ON public.analytics_snapshots (user_id, source, fetched_at DESC);
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analytics_snapshots_select_own ON public.analytics_snapshots;
DROP POLICY IF EXISTS analytics_snapshots_insert_own ON public.analytics_snapshots;
CREATE POLICY analytics_snapshots_select_own ON public.analytics_snapshots FOR SELECT USING (user_id = auth.uid());
CREATE POLICY analytics_snapshots_insert_own ON public.analytics_snapshots FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.refresh_triggers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id     UUID        REFERENCES public.sessions(id) ON DELETE SET NULL,
  query          TEXT        NOT NULL,
  old_rank       NUMERIC,
  new_rank       NUMERIC,
  trigger_reason TEXT        NOT NULL DEFAULT 'ranking_drop',
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX        IF NOT EXISTS refresh_triggers_user_status_idx    ON public.refresh_triggers (user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS refresh_triggers_pending_unique_idx ON public.refresh_triggers (session_id, query) WHERE status = 'pending';
ALTER TABLE public.refresh_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS refresh_triggers_select_own ON public.refresh_triggers;
DROP POLICY IF EXISTS refresh_triggers_insert_own ON public.refresh_triggers;
DROP POLICY IF EXISTS refresh_triggers_update_own ON public.refresh_triggers;
CREATE POLICY refresh_triggers_select_own ON public.refresh_triggers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY refresh_triggers_insert_own ON public.refresh_triggers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY refresh_triggers_update_own ON public.refresh_triggers FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── generation_log (20260428000008) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.generation_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.users(id),
  action_type       TEXT        NOT NULL,
  model_used        TEXT        NOT NULL,
  prompt_tokens     INT         NOT NULL DEFAULT 0,
  completion_tokens INT         NOT NULL DEFAULT 0,
  latency_ms        INT         NOT NULL,
  status            TEXT        NOT NULL,
  request_id        UUID        NOT NULL UNIQUE,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gen_log_user ON public.generation_log (user_id, created_at DESC);

-- ── fx_rates (20260428000010) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id         SERIAL        PRIMARY KEY,
  currency   VARCHAR(3)    UNIQUE NOT NULL,
  rate       DECIMAL(10,4) NOT NULL,
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fx_rates_currency ON public.fx_rates (currency);
INSERT INTO public.fx_rates (currency, rate) VALUES ('USD', 1.0), ('INR', 83.0), ('EUR', 0.92)
ON CONFLICT (currency) DO UPDATE SET rate = EXCLUDED.rate, updated_at = now();

-- ── brand_voices (20260428000011) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.brand_voices (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  tone_adjectives   TEXT[]      NOT NULL DEFAULT '{}',
  writing_samples   TEXT[]      NOT NULL DEFAULT '{}',
  forbidden_phrases TEXT[]      NOT NULL DEFAULT '{}',
  formality_level   TEXT        NOT NULL DEFAULT 'neutral' CHECK (formality_level IN ('formal','casual','neutral')),
  is_active         BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brand_voices_user_id_idx     ON public.brand_voices (user_id);
CREATE INDEX IF NOT EXISTS brand_voices_user_active_idx ON public.brand_voices (user_id, is_active) WHERE is_active = true;
ALTER TABLE public.brand_voices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_voices_select_own ON public.brand_voices;
DROP POLICY IF EXISTS brand_voices_insert_own ON public.brand_voices;
DROP POLICY IF EXISTS brand_voices_update_own ON public.brand_voices;
DROP POLICY IF EXISTS brand_voices_delete_own ON public.brand_voices;
CREATE POLICY brand_voices_select_own ON public.brand_voices FOR SELECT USING (user_id = auth.uid());
CREATE POLICY brand_voices_insert_own ON public.brand_voices FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY brand_voices_update_own ON public.brand_voices FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY brand_voices_delete_own ON public.brand_voices FOR DELETE USING (user_id = auth.uid());

-- ── briefs (20260428000012) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.briefs (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id                UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  keyword                TEXT        NOT NULL DEFAULT '',
  search_intent          TEXT,
  audience               TEXT,
  suggested_h1           TEXT,
  h2_outline             JSONB       NOT NULL DEFAULT '[]',
  competitor_gaps        JSONB       NOT NULL DEFAULT '[]',
  recommended_word_count INTEGER,
  ctas                   TEXT[]      NOT NULL DEFAULT '{}',
  status                 TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  raw_markdown           TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS briefs_session_id_unique_idx ON public.briefs (session_id);
CREATE INDEX        IF NOT EXISTS briefs_user_id_idx           ON public.briefs (user_id);
DROP TRIGGER IF EXISTS briefs_updated_at ON public.briefs;
CREATE TRIGGER briefs_updated_at BEFORE UPDATE ON public.briefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS briefs_select_own ON public.briefs;
DROP POLICY IF EXISTS briefs_insert_own ON public.briefs;
DROP POLICY IF EXISTS briefs_update_own ON public.briefs;
DROP POLICY IF EXISTS briefs_delete_own ON public.briefs;
CREATE POLICY briefs_select_own ON public.briefs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY briefs_insert_own ON public.briefs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY briefs_update_own ON public.briefs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY briefs_delete_own ON public.briefs FOR DELETE USING (user_id = auth.uid());

-- ── content_clusters (20260428000013) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.content_clusters (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar_keyword  TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  total_articles  INTEGER     NOT NULL DEFAULT 0 CHECK (total_articles BETWEEN 0 AND 13),
  published_count INTEGER     NOT NULL DEFAULT 0 CHECK (published_count >= 0),
  articles        JSONB       NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_clusters_user_id_idx    ON public.content_clusters (user_id);
CREATE INDEX IF NOT EXISTS content_clusters_created_at_idx ON public.content_clusters (user_id, created_at DESC);
DROP TRIGGER IF EXISTS content_clusters_updated_at ON public.content_clusters;
CREATE TRIGGER content_clusters_updated_at BEFORE UPDATE ON public.content_clusters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.content_clusters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clusters_select_own ON public.content_clusters;
DROP POLICY IF EXISTS clusters_insert_own ON public.content_clusters;
DROP POLICY IF EXISTS clusters_update_own ON public.content_clusters;
DROP POLICY IF EXISTS clusters_delete_own ON public.content_clusters;
CREATE POLICY clusters_select_own ON public.content_clusters FOR SELECT USING (user_id = auth.uid());
CREATE POLICY clusters_insert_own ON public.content_clusters FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY clusters_update_own ON public.content_clusters FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY clusters_delete_own ON public.content_clusters FOR DELETE USING (user_id = auth.uid());

-- ── workspaces + workspace_members + content_approvals (20260428000015) ──
CREATE TABLE IF NOT EXISTS public.workspaces (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  feature_enabled BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspaces_owner_id_idx ON public.workspaces (owner_id);
CREATE INDEX IF NOT EXISTS workspaces_slug_idx     ON public.workspaces (slug);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
DROP POLICY IF EXISTS workspaces_insert ON public.workspaces;
DROP POLICY IF EXISTS workspaces_update ON public.workspaces;
DROP POLICY IF EXISTS workspaces_delete ON public.workspaces;
-- workspaces_select deferred until after workspace_members is created below
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY workspaces_delete ON public.workspaces FOR DELETE USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'writer' CHECK (role IN ('writer','editor','admin')),
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','removed')),
  joined_at    TIMESTAMPTZ
);
CREATE INDEX        IF NOT EXISTS wm_workspace_id_idx       ON public.workspace_members (workspace_id);
CREATE INDEX        IF NOT EXISTS wm_user_id_idx            ON public.workspace_members (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS wm_workspace_email_unique ON public.workspace_members (workspace_id, email);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
-- workspaces_select defined here so workspace_members already exists
CREATE POLICY workspaces_select ON public.workspaces FOR SELECT USING (owner_id = auth.uid() OR id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active'));
DROP POLICY IF EXISTS wm_select ON public.workspace_members;
DROP POLICY IF EXISTS wm_insert ON public.workspace_members;
DROP POLICY IF EXISTS wm_update ON public.workspace_members;
CREATE POLICY wm_select ON public.workspace_members FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.status = 'active') OR workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY wm_insert ON public.workspace_members FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'));
CREATE POLICY wm_update ON public.workspace_members FOR UPDATE USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'));

CREATE TABLE IF NOT EXISTS public.content_approvals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        NOT NULL REFERENCES public.sessions(id)   ON DELETE CASCADE,
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  submitted_by UUID        NOT NULL REFERENCES auth.users(id),
  reviewed_by  UUID        REFERENCES auth.users(id),
  status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','published','changes_requested')),
  feedback     TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS approvals_workspace_status_idx ON public.content_approvals (workspace_id, status);
CREATE INDEX IF NOT EXISTS approvals_submitted_by_idx     ON public.content_approvals (submitted_by);
ALTER TABLE public.content_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approvals_select ON public.content_approvals;
DROP POLICY IF EXISTS approvals_insert ON public.content_approvals;
DROP POLICY IF EXISTS approvals_update ON public.content_approvals;
CREATE POLICY approvals_select ON public.content_approvals FOR SELECT USING (submitted_by = auth.uid() OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('editor','admin') AND status = 'active') OR workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY approvals_insert ON public.content_approvals FOR INSERT WITH CHECK (submitted_by = auth.uid() AND workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY approvals_update ON public.content_approvals FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('editor','admin') AND status = 'active') OR workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- ── content_performance (20260501_content_performance) ────────
CREATE TABLE IF NOT EXISTS public.content_performance (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  asset_type   TEXT        NOT NULL,
  platform     TEXT,
  clicks       INTEGER     NOT NULL DEFAULT 0,
  impressions  INTEGER     NOT NULL DEFAULT 0,
  avg_position NUMERIC(6,2),
  measured_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own performance data"      ON public.content_performance;
DROP POLICY IF EXISTS "Service role insert performance data" ON public.content_performance;
DROP POLICY IF EXISTS "Service role update performance data" ON public.content_performance;
CREATE POLICY "Users read own performance data"      ON public.content_performance FOR SELECT USING (session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid()));
CREATE POLICY "Service role insert performance data" ON public.content_performance FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role update performance data" ON public.content_performance FOR UPDATE USING (true);
CREATE INDEX IF NOT EXISTS idx_content_performance_session_id  ON public.content_performance (session_id);
CREATE INDEX IF NOT EXISTS idx_content_performance_measured_at ON public.content_performance (measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_performance_asset_type  ON public.content_performance (asset_type, platform);

-- ── fingerprint index (20260502) ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint_hash ON public.user_devices (fingerprint_hash);
