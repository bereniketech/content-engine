-- =============================================================
-- MONETIZATION TABLES: credit_packs, credit_wallets,
--   credit_transactions, payments, subscription_plans,
--   subscriptions, webhook_events, abuse_logs, trust_score_events
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── users: add trust_score ────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 50;

-- ── credit_packs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id              TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  credits_granted INTEGER     NOT NULL,
  base_usd_price  NUMERIC(10,2) NOT NULL,
  active          BOOLEAN     NOT NULL DEFAULT true
);

INSERT INTO public.credit_packs (id, name, credits_granted, base_usd_price) VALUES
  ('pack_100',  'Starter Pack',  100,  4.00),
  ('pack_500',  'Growth Pack',   500, 15.00),
  ('pack_2000', 'Scale Pack',   2000, 49.00)
ON CONFLICT (id) DO NOTHING;

-- ── credit_wallets ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_wallets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_kind TEXT        NOT NULL DEFAULT 'user',
  balance    INTEGER     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, owner_kind)
);
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wallets_select_own ON public.credit_wallets;
CREATE POLICY wallets_select_own ON public.credit_wallets FOR SELECT USING (owner_id = auth.uid());

-- ── credit_transactions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      UUID        NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  action_type    TEXT        NOT NULL CHECK (action_type IN ('topup','spend','refund','adjustment','subscription')),
  amount         INTEGER     NOT NULL,
  acting_user_id UUID        REFERENCES auth.users(id),
  request_id     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_txn_wallet_idx ON public.credit_transactions (wallet_id, created_at DESC);
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS txn_select_own ON public.credit_transactions;
CREATE POLICY txn_select_own ON public.credit_transactions FOR SELECT
  USING (wallet_id IN (SELECT id FROM public.credit_wallets WHERE owner_id = auth.uid()));

-- ── payments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  amount              INTEGER     NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'USD',
  status              TEXT        NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','captured','failed','refunded')),
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_user_idx         ON public.payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_rzp_order_idx    ON public.payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS payments_rzp_payment_idx  ON public.payments (razorpay_payment_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own ON public.payments FOR SELECT USING (user_id = auth.uid());

-- ── subscription_plans ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id                TEXT    PRIMARY KEY,
  name              TEXT    NOT NULL,
  monthly_credits   INTEGER NOT NULL,
  monthly_price_inr INTEGER NOT NULL,
  razorpay_plan_id  TEXT    NOT NULL,
  active            BOOLEAN NOT NULL DEFAULT true
);

-- ── subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                    TEXT        NOT NULL REFERENCES public.subscription_plans(id),
  razorpay_subscription_id   TEXT        NOT NULL,
  status                     TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','past_due','cancelled')),
  period_start               TIMESTAMPTZ,
  period_end                 TIMESTAMPTZ,
  current_period_end         TIMESTAMPTZ,
  cancel_at_period_end       BOOLEAN     NOT NULL DEFAULT false,
  scheduled_plan_id          TEXT        REFERENCES public.subscription_plans(id),
  scheduled_change_at        TIMESTAMPTZ,
  cancelled_at               TIMESTAMPTZ,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions (user_id);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT USING (user_id = auth.uid());

-- ── webhook_events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT        NOT NULL,
  event_type      TEXT        NOT NULL,
  idempotency_key TEXT        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  signature       TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, idempotency_key)
);
CREATE INDEX IF NOT EXISTS webhook_events_created_idx ON public.webhook_events (created_at DESC);

-- ── abuse_logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.abuse_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL,
  ip_address  TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS abuse_logs_event_ip_idx ON public.abuse_logs (event_type, ip_address);

-- ── trust_score_events ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trust_score_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_score INTEGER     NOT NULL,
  new_score      INTEGER     NOT NULL,
  delta          INTEGER     NOT NULL,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trust_score_events_user_idx ON public.trust_score_events (user_id, created_at DESC);

-- ── fn_credit_topup ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_credit_topup(
  p_wallet_id  UUID,
  p_amount     INTEGER,
  p_payment_id TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.credit_wallets SET balance = balance + p_amount WHERE id = p_wallet_id;
  INSERT INTO public.credit_transactions (wallet_id, action_type, amount, request_id)
  VALUES (p_wallet_id, 'topup', p_amount, p_payment_id);
END;
$$;

-- ── auto-create wallet on user signup ────────────────────────
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.credit_wallets (owner_id, owner_kind)
  VALUES (NEW.id, 'user')
  ON CONFLICT (owner_id, owner_kind) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_wallet();
