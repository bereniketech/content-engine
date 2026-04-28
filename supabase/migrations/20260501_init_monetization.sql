-- ============================================================
-- Monetization & User System — Full Schema
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE account_type_t   AS ENUM ('individual', 'team_owner', 'team_member', 'admin');
CREATE TYPE account_status_t AS ENUM ('active', 'restricted', 'blocked', 'suspended');
CREATE TYPE wallet_owner_t   AS ENUM ('user', 'team');
CREATE TYPE sub_status_t     AS ENUM ('pending', 'active', 'past_due', 'cancelled', 'expired');
CREATE TYPE pay_status_t     AS ENUM ('pending', 'captured', 'failed', 'refunded');
CREATE TYPE team_role_t      AS ENUM ('owner', 'member');

-- ── Core user extension (mirrors auth.users 1:1) ────────────

CREATE TABLE public.users (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL UNIQUE,
  account_type        account_type_t   NOT NULL DEFAULT 'individual',
  account_status      account_status_t NOT NULL DEFAULT 'active',
  country_code        CHAR(2)     NOT NULL DEFAULT 'XX',
  email_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
  trust_score         SMALLINT    NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email         ON public.users (email);
CREATE INDEX idx_users_country       ON public.users (country_code);
CREATE INDEX idx_users_trust         ON public.users (trust_score);
CREATE INDEX idx_users_status        ON public.users (account_status);

-- ── PPP Tiers ────────────────────────────────────────────────

CREATE TABLE public.ppp_tiers (
  tier            SMALLINT    PRIMARY KEY,  -- 1..4
  name            TEXT        NOT NULL,
  multiplier      NUMERIC(4,3) NOT NULL,    -- e.g. 1.000, 0.800
  default_currency CHAR(3)   NOT NULL,
  country_codes   JSONB       NOT NULL DEFAULT '[]'
);

-- ── Subscription Plans ───────────────────────────────────────

CREATE TABLE public.subscription_plans (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  monthly_credits     INT         NOT NULL,
  base_price_usd      NUMERIC(10,2) NOT NULL,
  razorpay_plan_id    TEXT,
  features            JSONB       NOT NULL DEFAULT '{}',
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Teams ────────────────────────────────────────────────────

CREATE TABLE public.teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  owner_id    UUID        NOT NULL REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_owner ON public.teams (owner_id);

-- ── Credit Wallets ───────────────────────────────────────────

CREATE TABLE public.credit_wallets (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_kind  wallet_owner_t NOT NULL,
  user_id     UUID         REFERENCES public.users(id) ON DELETE CASCADE,
  team_id     UUID         REFERENCES public.teams(id) ON DELETE CASCADE,
  balance     INT          NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT wallet_owner_check CHECK (
    (owner_kind = 'user'  AND user_id IS NOT NULL AND team_id IS NULL) OR
    (owner_kind = 'team'  AND team_id IS NOT NULL AND user_id IS NULL)
  )
);

CREATE UNIQUE INDEX uniq_wallet_user ON public.credit_wallets (user_id) WHERE owner_kind = 'user';
CREATE UNIQUE INDEX uniq_wallet_team ON public.credit_wallets (team_id) WHERE owner_kind = 'team';

-- ── Credit Transactions (range-partitioned by month) ─────────

CREATE TABLE public.credit_transactions (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  wallet_id     UUID        NOT NULL REFERENCES public.credit_wallets(id),
  acting_user_id UUID       NOT NULL REFERENCES public.users(id),
  action_type   TEXT        NOT NULL,
  delta         INT         NOT NULL,          -- positive = grant, negative = deduct
  balance_after INT         NOT NULL,
  request_id    UUID        NOT NULL,
  actor         TEXT        NOT NULL DEFAULT 'system', -- 'system' | 'admin' | 'webhook'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Bootstrap 12 monthly partitions (2026-01 through 2026-12)
DO $$
DECLARE
  y INT := 2026;
  m INT;
  s DATE;
  e DATE;
BEGIN
  FOR m IN 1..12 LOOP
    s := make_date(y, m, 1);
    e := s + INTERVAL '1 month';
    EXECUTE format(
      'CREATE TABLE credit_transactions_%s_%s PARTITION OF public.credit_transactions FOR VALUES FROM (%L) TO (%L)',
      y, lpad(m::text,2,'0'), s, e
    );
  END LOOP;
END $$;

CREATE UNIQUE INDEX uniq_credit_tx_idempotent ON public.credit_transactions (wallet_id, request_id, created_at);
CREATE INDEX idx_credit_tx_wallet_time        ON public.credit_transactions (wallet_id, created_at DESC);

-- ── Subscriptions ────────────────────────────────────────────

CREATE TABLE public.subscriptions (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES public.users(id),
  plan_id                 UUID        NOT NULL REFERENCES public.subscription_plans(id),
  status                  sub_status_t NOT NULL DEFAULT 'pending',
  razorpay_subscription_id TEXT       UNIQUE,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN     NOT NULL DEFAULT FALSE,
  scheduled_plan_id       UUID        REFERENCES public.subscription_plans(id),
  scheduled_change_at     TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_active_sub_per_user ON public.subscriptions (user_id)
  WHERE status IN ('active', 'pending', 'past_due');
CREATE INDEX idx_subscriptions_user ON public.subscriptions (user_id);

-- ── Payments ─────────────────────────────────────────────────

CREATE TABLE public.payments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.users(id),
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT        UNIQUE,
  subscription_id     UUID        REFERENCES public.subscriptions(id),
  amount_cents        INT         NOT NULL,
  currency            CHAR(3)     NOT NULL,
  status              pay_status_t NOT NULL DEFAULT 'pending',
  failure_reason      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user   ON public.payments (user_id);
CREATE INDEX idx_payments_status ON public.payments (status, created_at DESC);

-- ── Team Members ─────────────────────────────────────────────

CREATE TABLE public.team_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       team_role_t NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team ON public.team_members (team_id);
CREATE INDEX idx_team_members_user ON public.team_members (user_id);

-- ── Team Invites ─────────────────────────────────────────────

CREATE TABLE public.team_invites (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_email   TEXT        NOT NULL,
  token_hash      TEXT        NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_invites_team  ON public.team_invites (team_id);
CREATE INDEX idx_team_invites_token ON public.team_invites (token_hash);

-- ── Email Verifications ──────────────────────────────────────

CREATE TABLE public.email_verifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  otp_hash    TEXT        NOT NULL,
  attempts    SMALLINT    NOT NULL DEFAULT 0,
  verified    BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verif_user ON public.email_verifications (user_id, created_at DESC);

-- ── Email Domain Blocklist ───────────────────────────────────

CREATE TABLE public.email_domain_blocklist (
  domain      TEXT        PRIMARY KEY,
  added_by    UUID        REFERENCES public.users(id),
  reason      TEXT,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Free Credit Grants ───────────────────────────────────────

CREATE TABLE public.free_credit_grants (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email                TEXT        NOT NULL,
  ip_address           INET        NOT NULL,
  fingerprint_hash     TEXT        NOT NULL,
  credits_granted      INT         NOT NULL,
  granted_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_fcg_fingerprint ON public.free_credit_grants (fingerprint_hash);
CREATE INDEX idx_fcg_ip_day ON public.free_credit_grants (ip_address, granted_at);

-- ── User Devices ─────────────────────────────────────────────

CREATE TABLE public.user_devices (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fingerprint_hash TEXT        NOT NULL,
  user_agent       TEXT,
  last_seen_ip     INET,
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_devices_user ON public.user_devices (user_id);
CREATE INDEX idx_user_devices_fp   ON public.user_devices (fingerprint_hash);

-- ── User IP Log (partitioned by month) ──────────────────────

CREATE TABLE public.user_ip_log (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ip_address  INET        NOT NULL,
  ip_type     TEXT,       -- 'residential' | 'vpn' | 'proxy' | 'datacenter'
  country     CHAR(2),
  event_type  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

DO $$
DECLARE
  y INT := 2026;
  m INT;
  s DATE;
  e DATE;
BEGIN
  FOR m IN 1..12 LOOP
    s := make_date(y, m, 1);
    e := s + INTERVAL '1 month';
    EXECUTE format(
      'CREATE TABLE user_ip_log_%s_%s PARTITION OF public.user_ip_log FOR VALUES FROM (%L) TO (%L)',
      y, lpad(m::text,2,'0'), s, e
    );
  END LOOP;
END $$;

CREATE INDEX idx_ip_log_ip_time   ON public.user_ip_log (ip_address, created_at DESC);
CREATE INDEX idx_ip_log_user_time ON public.user_ip_log (user_id, created_at DESC);

-- ── Trust Score Events (partitioned by month) ────────────────

CREATE TABLE public.trust_score_events (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  previous_score SMALLINT    NOT NULL,
  new_score      SMALLINT    NOT NULL,
  delta          SMALLINT    NOT NULL,
  reason         TEXT        NOT NULL,
  actor          TEXT        NOT NULL DEFAULT 'system',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

DO $$
DECLARE
  y INT := 2026;
  m INT;
  s DATE;
  e DATE;
BEGIN
  FOR m IN 1..12 LOOP
    s := make_date(y, m, 1);
    e := s + INTERVAL '1 month';
    EXECUTE format(
      'CREATE TABLE trust_score_events_%s_%s PARTITION OF public.trust_score_events FOR VALUES FROM (%L) TO (%L)',
      y, lpad(m::text,2,'0'), s, e
    );
  END LOOP;
END $$;

CREATE INDEX idx_trust_events_user ON public.trust_score_events (user_id, created_at DESC);

-- ── Abuse Logs (partitioned by month) ────────────────────────

CREATE TABLE public.abuse_logs (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address       INET,
  fingerprint_hash TEXT,
  email            TEXT,
  event_type       TEXT        NOT NULL,  -- 'ip_limit' | 'fp_limit' | 'disposable' | 'behavior' | 'vpn'
  rule_triggered   TEXT        NOT NULL,
  action_taken     TEXT        NOT NULL,  -- 'blocked' | 'trust_deducted' | 'flagged'
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

DO $$
DECLARE
  y INT := 2026;
  m INT;
  s DATE;
  e DATE;
BEGIN
  FOR m IN 1..12 LOOP
    s := make_date(y, m, 1);
    e := s + INTERVAL '1 month';
    EXECUTE format(
      'CREATE TABLE abuse_logs_%s_%s PARTITION OF public.abuse_logs FOR VALUES FROM (%L) TO (%L)',
      y, lpad(m::text,2,'0'), s, e
    );
  END LOOP;
END $$;

CREATE INDEX idx_abuse_logs_ip   ON public.abuse_logs (ip_address, created_at DESC);
CREATE INDEX idx_abuse_logs_fp   ON public.abuse_logs (fingerprint_hash, created_at DESC);
CREATE INDEX idx_abuse_logs_user ON public.abuse_logs (user_id, created_at DESC);

-- ── Admin Actions ─────────────────────────────────────────────

CREATE TABLE public.admin_actions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID        NOT NULL REFERENCES public.users(id),
  target_user_id UUID        REFERENCES public.users(id),
  action_type    TEXT        NOT NULL,  -- 'credit_adjust' | 'block' | 'unblock' | 'trust_override' | 'domain_block'
  reason         TEXT        NOT NULL,
  metadata       JSONB       NOT NULL DEFAULT '{}',  -- before/after values
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_admin  ON public.admin_actions (admin_id, created_at DESC);
CREATE INDEX idx_admin_actions_target ON public.admin_actions (target_user_id, created_at DESC);

-- ── Webhook Events ────────────────────────────────────────────

CREATE TABLE public.webhook_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT        NOT NULL DEFAULT 'razorpay',
  idempotency_key TEXT        NOT NULL,
  event_type      TEXT        NOT NULL,
  payload         JSONB       NOT NULL,
  signature       TEXT        NOT NULL,
  source_ip       INET,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, idempotency_key)
);

CREATE INDEX idx_webhook_events_type ON public.webhook_events (event_type, created_at DESC);

-- ── Email Log (partitioned by month) ─────────────────────────

CREATE TABLE public.email_log (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  template_id TEXT        NOT NULL,
  recipient   TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending',  -- 'sent' | 'failed' | 'pending'
  attempts    SMALLINT    NOT NULL DEFAULT 0,
  provider_id TEXT,       -- Resend message ID
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

DO $$
DECLARE
  y INT := 2026;
  m INT;
  s DATE;
  e DATE;
BEGIN
  FOR m IN 1..12 LOOP
    s := make_date(y, m, 1);
    e := s + INTERVAL '1 month';
    EXECUTE format(
      'CREATE TABLE email_log_%s_%s PARTITION OF public.email_log FOR VALUES FROM (%L) TO (%L)',
      y, lpad(m::text,2,'0'), s, e
    );
  END LOOP;
END $$;

CREATE INDEX idx_email_log_user ON public.email_log (user_id, created_at DESC);

-- ── Daily Credit Aggregates ───────────────────────────────────

CREATE TABLE public.daily_credit_aggregates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type  TEXT        NOT NULL,
  credits_used INT         NOT NULL DEFAULT 0,
  day          DATE        NOT NULL,
  UNIQUE (user_id, action_type, day)
);

CREATE INDEX idx_daily_agg_user_day ON public.daily_credit_aggregates (user_id, day DESC);

-- ── Updated-at trigger helper ─────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at         BEFORE UPDATE ON public.users           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_wallets_updated_at       BEFORE UPDATE ON public.credit_wallets  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at      BEFORE UPDATE ON public.payments        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_teams_updated_at         BEFORE UPDATE ON public.teams           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
