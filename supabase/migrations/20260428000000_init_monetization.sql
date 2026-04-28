-- =====================================================================
-- Monetization & User System — Initial Schema
-- Generated: 20260428000000
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Enums ----------
CREATE TYPE account_type_t  AS ENUM ('individual','team_owner','team_member','admin');
CREATE TYPE account_status_t AS ENUM ('active','restricted','blocked');
CREATE TYPE wallet_owner_t   AS ENUM ('user','team');
CREATE TYPE sub_status_t     AS ENUM ('pending','active','past_due','cancelled','expired');
CREATE TYPE pay_status_t     AS ENUM ('pending','captured','failed','refunded');
CREATE TYPE team_role_t      AS ENUM ('owner','member');

-- ---------- users ----------
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  country_code    CHAR(2) NOT NULL DEFAULT 'XX',
  account_type    account_type_t NOT NULL DEFAULT 'individual',
  account_status  account_status_t NOT NULL DEFAULT 'active',
  trust_score     INT NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at  TIMESTAMPTZ
);
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_users_country        ON users(country_code);
CREATE INDEX idx_users_account_status ON users(account_status);

-- ---------- credit_wallets ----------
CREATE TABLE credit_wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL,
  owner_kind  wallet_owner_t NOT NULL,
  balance     INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallets_owner ON credit_wallets(owner_id, owner_kind);

-- ---------- credit_transactions (RANGE partitioned by month) ----------
CREATE TABLE credit_transactions (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  wallet_id       UUID NOT NULL REFERENCES credit_wallets(id) ON DELETE CASCADE,
  acting_user_id  UUID REFERENCES users(id),
  amount          INT NOT NULL,
  action_type     TEXT NOT NULL,
  request_id      UUID NOT NULL,
  actor           TEXT NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at),
  UNIQUE (wallet_id, request_id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE credit_transactions_2026_04 PARTITION OF credit_transactions
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE credit_transactions_2026_05 PARTITION OF credit_transactions
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE credit_transactions_2026_06 PARTITION OF credit_transactions
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE INDEX idx_credit_tx_wallet  ON credit_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_credit_tx_request ON credit_transactions(wallet_id, request_id);

-- ---------- subscription_plans ----------
CREATE TABLE subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  monthly_credits INT NOT NULL,
  feature_limits  JSONB NOT NULL,
  price_tiers     JSONB NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- subscriptions ----------
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id               UUID NOT NULL REFERENCES subscription_plans(id),
  razorpay_sub_id       TEXT UNIQUE,
  status                sub_status_t NOT NULL DEFAULT 'pending',
  current_period_end    TIMESTAMPTZ,
  scheduled_plan_id     UUID REFERENCES subscription_plans(id),
  scheduled_change_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Only one active/non-terminal sub per user
CREATE UNIQUE INDEX uniq_active_sub_per_user
  ON subscriptions(user_id)
  WHERE status NOT IN ('cancelled','expired');
CREATE INDEX idx_subs_status ON subscriptions(status);

-- ---------- payments ----------
CREATE TABLE payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_payment_id  TEXT UNIQUE,
  razorpay_order_id    TEXT,
  amount               INT NOT NULL,
  currency             CHAR(3) NOT NULL,
  status               pay_status_t NOT NULL DEFAULT 'pending',
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_user   ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);

-- ---------- ppp_tiers ----------
CREATE TABLE ppp_tiers (
  id          SMALLSERIAL PRIMARY KEY,
  tier_name   TEXT NOT NULL,
  countries   JSONB NOT NULL,
  multiplier  NUMERIC(4,3) NOT NULL,
  price_usd   NUMERIC(10,2),
  price_inr   NUMERIC(10,2),
  price_eur   NUMERIC(10,2)
);
CREATE INDEX idx_ppp_countries ON ppp_tiers USING GIN (countries);

-- ---------- teams ----------
CREATE TABLE teams (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_teams_owner ON teams(owner_user_id);

-- ---------- team_members ----------
CREATE TABLE team_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      team_role_t NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- ---------- team_invites ----------
CREATE TABLE team_invites (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_email  TEXT NOT NULL,
  token_hash     TEXT NOT NULL UNIQUE,
  expires_at     TIMESTAMPTZ NOT NULL,
  accepted_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_team_invites_team  ON team_invites(team_id);
CREATE INDEX idx_team_invites_email ON team_invites(invited_email);

-- ---------- email_verifications ----------
CREATE TABLE email_verifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  otp_hash          TEXT,
  magic_token_hash  TEXT,
  attempts          INT NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ev_user ON email_verifications(user_id, created_at DESC);

-- ---------- email_domain_blocklist ----------
CREATE TABLE email_domain_blocklist (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain    TEXT NOT NULL UNIQUE,
  reason    TEXT,
  added_by  UUID REFERENCES users(id),
  added_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- email_log (RANGE partitioned by month) ----------
CREATE TABLE email_log (
  id           UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  template_id  TEXT NOT NULL,
  recipient    TEXT NOT NULL,
  status       TEXT NOT NULL,
  sent_at      TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE email_log_2026_04 PARTITION OF email_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE email_log_2026_05 PARTITION OF email_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE email_log_2026_06 PARTITION OF email_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE INDEX idx_email_log_user ON email_log(user_id, created_at DESC);

-- ---------- trust_score_events (RANGE partitioned) ----------
CREATE TABLE trust_score_events (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_score  INT,
  new_score       INT,
  delta           INT,
  reason          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE trust_score_events_2026_04 PARTITION OF trust_score_events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE trust_score_events_2026_05 PARTITION OF trust_score_events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE trust_score_events_2026_06 PARTITION OF trust_score_events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE INDEX idx_tse_user ON trust_score_events(user_id, created_at DESC);

-- ---------- abuse_logs (RANGE partitioned) ----------
CREATE TABLE abuse_logs (
  id                UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  ip                INET,
  fingerprint_hash  TEXT,
  event_type        TEXT NOT NULL,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE abuse_logs_2026_04 PARTITION OF abuse_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE abuse_logs_2026_05 PARTITION OF abuse_logs
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE abuse_logs_2026_06 PARTITION OF abuse_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE INDEX idx_abuse_logs_ip ON abuse_logs(ip, created_at);
CREATE INDEX idx_abuse_logs_fp ON abuse_logs(fingerprint_hash, created_at);

-- ---------- admin_actions ----------
CREATE TABLE admin_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   UUID NOT NULL REFERENCES users(id),
  target_user_id  UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  before_value    JSONB,
  after_value     JSONB,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_actions_admin  ON admin_actions(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_user_id, created_at DESC);

-- ---------- webhook_events ----------
CREATE TABLE webhook_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider         TEXT NOT NULL,
  event_type       TEXT NOT NULL,
  idempotency_key  TEXT NOT NULL,
  payload          JSONB NOT NULL,
  signature        TEXT,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, idempotency_key)
);
CREATE INDEX idx_webhook_events_unprocessed ON webhook_events(provider, processed_at) WHERE processed_at IS NULL;

-- ---------- user_devices ----------
CREATE TABLE user_devices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint_hash  TEXT NOT NULL,
  user_agent        TEXT,
  ip                INET,
  first_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_devices_fp ON user_devices(fingerprint_hash, user_id);

-- ---------- user_ip_log (RANGE partitioned) ----------
CREATE TABLE user_ip_log (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip            INET NOT NULL,
  country_code  CHAR(2),
  ip_type       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE user_ip_log_2026_04 PARTITION OF user_ip_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE user_ip_log_2026_05 PARTITION OF user_ip_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE user_ip_log_2026_06 PARTITION OF user_ip_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE INDEX idx_ip_log_ip_time ON user_ip_log(ip, created_at);

-- ---------- free_credit_grants ----------
CREATE TABLE free_credit_grants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  ip                INET NOT NULL,
  fingerprint_hash  TEXT NOT NULL UNIQUE,
  amount            INT NOT NULL,
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fcg_ip_day ON free_credit_grants(ip, granted_at);

-- ---------- daily_credit_aggregates ----------
CREATE TABLE daily_credit_aggregates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type   TEXT,
  credits_used  INT,
  date          DATE NOT NULL,
  UNIQUE (user_id, action_type, date)
);
CREATE INDEX idx_dca_user_date ON daily_credit_aggregates(user_id, date DESC);
