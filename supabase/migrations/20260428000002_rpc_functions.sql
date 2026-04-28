-- =====================================================================
-- Atomic Credit RPCs (SECURITY DEFINER)
-- =====================================================================

-- ---------- fn_deduct_credits ----------
CREATE OR REPLACE FUNCTION public.fn_deduct_credits(
  p_wallet_id    UUID,
  p_cost         INT,
  p_action_type  TEXT,
  p_request_id   UUID,
  p_actor        TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INT;
BEGIN
  IF p_cost <= 0 THEN
    RAISE EXCEPTION 'INVALID_COST' USING ERRCODE = '22023';
  END IF;

  SELECT balance INTO v_balance
    FROM credit_wallets
   WHERE id = p_wallet_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_balance < p_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS' USING ERRCODE = 'P0001';
  END IF;

  UPDATE credit_wallets
     SET balance = balance - p_cost
   WHERE id = p_wallet_id;

  INSERT INTO credit_transactions
    (id, wallet_id, acting_user_id, amount, action_type, request_id, actor)
  VALUES
    (gen_random_uuid(), p_wallet_id, auth.uid(), -p_cost, p_action_type, p_request_id, p_actor)
  ON CONFLICT (wallet_id, request_id, created_at) DO NOTHING;

  RETURN v_balance - p_cost;
END;
$$;

-- ---------- fn_credit_topup ----------
CREATE OR REPLACE FUNCTION public.fn_credit_topup(
  p_wallet_id   UUID,
  p_amount      INT,
  p_payment_id  UUID
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = '22023';
  END IF;

  SELECT balance INTO v_balance
    FROM credit_wallets
   WHERE id = p_wallet_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency: if a transaction for this payment already exists, no-op.
  IF EXISTS (
    SELECT 1 FROM credit_transactions
     WHERE wallet_id = p_wallet_id AND request_id = p_payment_id
  ) THEN
    RETURN v_balance;
  END IF;

  UPDATE credit_wallets
     SET balance = balance + p_amount
   WHERE id = p_wallet_id;

  INSERT INTO credit_transactions
    (id, wallet_id, acting_user_id, amount, action_type, request_id, actor, metadata)
  VALUES
    (gen_random_uuid(), p_wallet_id, auth.uid(), p_amount, 'topup', p_payment_id, 'system',
     jsonb_build_object('payment_id', p_payment_id))
  ON CONFLICT (wallet_id, request_id, created_at) DO NOTHING;

  RETURN v_balance + p_amount;
END;
$$;

-- ---------- fn_grant_free_credits ----------
CREATE OR REPLACE FUNCTION public.fn_grant_free_credits(
  p_user_id  UUID,
  p_ip       INET,
  p_fp_hash  TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_verified BOOLEAN;
  v_email          TEXT;
  v_domain         TEXT;
  v_disposable     BOOLEAN;
  v_ip_count       INT;
  v_fp_exists      BOOLEAN;
  v_trust          INT;
  v_amount         INT;
  v_wallet_id      UUID;
BEGIN
  SELECT email_verified, email, trust_score
    INTO v_email_verified, v_email, v_trust
    FROM users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND OR NOT v_email_verified THEN
    RETURN 0;
  END IF;

  v_domain := lower(split_part(v_email, '@', 2));
  SELECT EXISTS (
    SELECT 1 FROM email_domain_blocklist WHERE domain = v_domain
  ) INTO v_disposable;
  IF v_disposable THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_ip_count
    FROM free_credit_grants
   WHERE ip = p_ip AND granted_at > now() - INTERVAL '24 hours';
  IF v_ip_count >= 3 THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM free_credit_grants WHERE fingerprint_hash = p_fp_hash
  ) INTO v_fp_exists;
  IF v_fp_exists THEN
    RETURN 0;
  END IF;

  v_amount := CASE WHEN v_trust >= 40 THEN 50 ELSE 25 END;

  -- Ensure wallet
  SELECT id INTO v_wallet_id
    FROM credit_wallets
   WHERE owner_id = p_user_id AND owner_kind = 'user'
   LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO credit_wallets(id, owner_id, owner_kind, balance)
    VALUES (gen_random_uuid(), p_user_id, 'user', 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  INSERT INTO free_credit_grants(id, user_id, email, ip, fingerprint_hash, amount)
  VALUES (gen_random_uuid(), p_user_id, v_email, p_ip, p_fp_hash, v_amount)
  ON CONFLICT (fingerprint_hash) DO NOTHING;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  PERFORM public.fn_credit_topup(v_wallet_id, v_amount, gen_random_uuid());

  RETURN v_amount;
END;
$$;

-- ---------- fn_refund_credits ----------
CREATE OR REPLACE FUNCTION public.fn_refund_credits(
  p_request_id UUID
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_amount    INT;
  v_balance   INT;
  v_refund_req UUID := gen_random_uuid();
BEGIN
  SELECT wallet_id, amount
    INTO v_wallet_id, v_amount
    FROM credit_transactions
   WHERE request_id = p_request_id AND amount < 0
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORIGINAL_TRANSACTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency: refund already issued?
  IF EXISTS (
    SELECT 1 FROM credit_transactions
     WHERE wallet_id = v_wallet_id
       AND action_type = 'refund'
       AND metadata ->> 'refund_of' = p_request_id::text
  ) THEN
    SELECT balance INTO v_balance FROM credit_wallets WHERE id = v_wallet_id;
    RETURN v_balance;
  END IF;

  SELECT balance INTO v_balance FROM credit_wallets WHERE id = v_wallet_id FOR UPDATE;

  UPDATE credit_wallets
     SET balance = balance + ABS(v_amount)
   WHERE id = v_wallet_id;

  INSERT INTO credit_transactions
    (id, wallet_id, acting_user_id, amount, action_type, request_id, actor, metadata)
  VALUES
    (gen_random_uuid(), v_wallet_id, auth.uid(), ABS(v_amount), 'refund',
     v_refund_req, 'system',
     jsonb_build_object('refund_of', p_request_id::text))
  ON CONFLICT (wallet_id, request_id, created_at) DO NOTHING;

  RETURN v_balance + ABS(v_amount);
END;
$$;

-- ---------- Permissions ----------
REVOKE ALL ON FUNCTION public.fn_deduct_credits(UUID, INT, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_credit_topup(UUID, INT, UUID)              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_grant_free_credits(UUID, INET, TEXT)       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_refund_credits(UUID)                       FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fn_deduct_credits(UUID, INT, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_credit_topup(UUID, INT, UUID)               TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_grant_free_credits(UUID, INET, TEXT)        TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_refund_credits(UUID)                        TO service_role;
