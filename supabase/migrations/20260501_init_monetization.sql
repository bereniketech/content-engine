-- =============================================================
-- MONETIZATION TABLES — fully idempotent
-- Each table is created with minimal columns, then every
-- non-trivial column is added with ADD COLUMN IF NOT EXISTS
-- so re-running after a partial failure is always safe.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── users: trust_score ───────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 50;

-- ── credit_packs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id TEXT PRIMARY KEY
);
ALTER TABLE public.credit_packs ADD COLUMN IF NOT EXISTS name            TEXT          NOT NULL DEFAULT '';
ALTER TABLE public.credit_packs ADD COLUMN IF NOT EXISTS credits_granted INTEGER       NOT NULL DEFAULT 0;
ALTER TABLE public.credit_packs ADD COLUMN IF NOT EXISTS base_usd_price  NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.credit_packs ADD COLUMN IF NOT EXISTS active          BOOLEAN       NOT NULL DEFAULT true;

INSERT INTO public.credit_packs (id, name, credits_granted, base_usd_price) VALUES
  ('pack_100',  'Starter Pack',  100,  4.00),
  ('pack_500',  'Growth Pack',   500, 15.00),
  ('pack_2000', 'Scale Pack',   2000, 49.00)
ON CONFLICT (id) DO NOTHING;

-- ── credit_wallets ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.credit_wallets ADD COLUMN IF NOT EXISTS owner_id   UUID    REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.credit_wallets ADD COLUMN IF NOT EXISTS owner_kind TEXT    NOT NULL DEFAULT 'user';
ALTER TABLE public.credit_wallets ADD COLUMN IF NOT EXISTS balance    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.credit_wallets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.credit_wallets'::regclass
      AND conname = 'credit_wallets_owner_id_owner_kind_key'
  ) THEN
    ALTER TABLE public.credit_wallets
      ADD CONSTRAINT credit_wallets_owner_id_owner_kind_key UNIQUE (owner_id, owner_kind);
  END IF;
END $$;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wallets_select_own ON public.credit_wallets;
CREATE POLICY wallets_select_own ON public.credit_wallets FOR SELECT USING (owner_id = auth.uid());

-- ── credit_transactions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS wallet_id      UUID REFERENCES public.credit_wallets(id) ON DELETE CASCADE;
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS action_type    TEXT NOT NULL DEFAULT 'topup';
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS amount         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS acting_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS request_id     TEXT;
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS credit_txn_wallet_idx ON public.credit_transactions (wallet_id, created_at DESC);
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS txn_select_own ON public.credit_transactions;
CREATE POLICY txn_select_own ON public.credit_transactions FOR SELECT
  USING (wallet_id IN (SELECT id FROM public.credit_wallets WHERE owner_id = auth.uid()));

-- ── payments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_order_id   TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount              INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency            TEXT    NOT NULL DEFAULT 'USD';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status              TEXT    NOT NULL DEFAULT 'created';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata            JSONB   NOT NULL DEFAULT '{}';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS payments_user_idx        ON public.payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_rzp_order_idx   ON public.payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS payments_rzp_payment_idx ON public.payments (razorpay_payment_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own ON public.payments FOR SELECT USING (user_id = auth.uid());

-- ── subscription_plans ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY
);
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS name              TEXT    NOT NULL DEFAULT '';
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS monthly_credits   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS monthly_price_inr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS razorpay_plan_id  TEXT    NOT NULL DEFAULT '';
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS active            BOOLEAN NOT NULL DEFAULT true;

-- ── subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id                   TEXT REFERENCES public.subscription_plans(id);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id  TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS status                    TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS period_start              TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS period_end                TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_end        TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS scheduled_plan_id         TEXT REFERENCES public.subscription_plans(id);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS scheduled_change_at       TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancelled_at              TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at                TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions (user_id);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT USING (user_id = auth.uid());

-- ── webhook_events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS provider        TEXT NOT NULL DEFAULT '';
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS event_type      TEXT NOT NULL DEFAULT '';
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT NOT NULL DEFAULT '';
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS payload         JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS signature       TEXT;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS processed_at    TIMESTAMPTZ;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.webhook_events'::regclass
      AND conname = 'webhook_events_provider_idempotency_key_key'
  ) THEN
    ALTER TABLE public.webhook_events
      ADD CONSTRAINT webhook_events_provider_idempotency_key_key UNIQUE (provider, idempotency_key);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS webhook_events_created_idx ON public.webhook_events (created_at DESC);

-- ── abuse_logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.abuse_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.abuse_logs ADD COLUMN IF NOT EXISTS event_type  TEXT NOT NULL DEFAULT '';
ALTER TABLE public.abuse_logs ADD COLUMN IF NOT EXISTS ip_address  TEXT;
ALTER TABLE public.abuse_logs ADD COLUMN IF NOT EXISTS metadata    JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.abuse_logs ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS abuse_logs_event_ip_idx ON public.abuse_logs (event_type, ip_address);

-- ── trust_score_events ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trust_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE public.trust_score_events ADD COLUMN IF NOT EXISTS user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.trust_score_events ADD COLUMN IF NOT EXISTS previous_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.trust_score_events ADD COLUMN IF NOT EXISTS new_score      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.trust_score_events ADD COLUMN IF NOT EXISTS delta          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.trust_score_events ADD COLUMN IF NOT EXISTS reason         TEXT;
ALTER TABLE public.trust_score_events ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS trust_score_events_user_idx ON public.trust_score_events (user_id, created_at DESC);

-- ── fn_credit_topup ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.fn_credit_topup(UUID, INTEGER, TEXT);
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
DROP FUNCTION IF EXISTS public.create_user_wallet() CASCADE;
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
