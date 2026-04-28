CREATE OR REPLACE FUNCTION fn_grant_free_credits(
  p_user_id  uuid,
  p_ip       inet,
  p_fp_hash  text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user           RECORD;
  v_wallet_id      uuid;
  v_ip_count       integer;
  v_fp_exists      boolean;
  v_grant_amount   integer;
  v_full_grant     integer := 50;
BEGIN
  -- 1. Load user
  SELECT id, email, email_verified, trust_score, account_status
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- 2. Email must be verified
  IF NOT v_user.email_verified THEN
    INSERT INTO abuse_logs (user_id, ip_address, fingerprint_hash, email, event_type, rule_triggered, action_taken, metadata)
    VALUES (p_user_id, p_ip, p_fp_hash, v_user.email, 'free_credit_block', 'email_not_verified', 'blocked', '{}');
    RETURN 0;
  END IF;

  -- 3. Check email domain against blocklist
  IF EXISTS (
    SELECT 1 FROM email_domain_blocklist
    WHERE domain = split_part(v_user.email, '@', 2)
  ) THEN
    UPDATE users SET trust_score = LEAST(trust_score, 30) WHERE id = p_user_id;
    INSERT INTO abuse_logs (user_id, ip_address, fingerprint_hash, email, event_type, rule_triggered, action_taken, metadata)
    VALUES (p_user_id, p_ip, p_fp_hash, v_user.email, 'free_credit_block', 'disposable_email', 'blocked', '{}');
    RETURN 0;
  END IF;

  -- 4. IP cap: max 3 grants per IP per 24h
  SELECT COUNT(*) INTO v_ip_count
  FROM free_credit_grants
  WHERE ip_address = p_ip
    AND granted_at > now() - INTERVAL '24 hours';

  IF v_ip_count >= 3 THEN
    UPDATE users SET trust_score = LEAST(trust_score, 30) WHERE id = p_user_id;
    INSERT INTO abuse_logs (user_id, ip_address, fingerprint_hash, email, event_type, rule_triggered, action_taken, metadata)
    VALUES (p_user_id, p_ip, p_fp_hash, v_user.email, 'free_credit_block', 'ip_cap_exceeded', 'blocked',
      jsonb_build_object('ip_count', v_ip_count));
    RETURN 0;
  END IF;

  -- 5. Fingerprint: once per lifetime
  SELECT EXISTS(
    SELECT 1 FROM free_credit_grants WHERE fingerprint_hash = p_fp_hash
  ) INTO v_fp_exists;

  IF v_fp_exists THEN
    UPDATE users SET trust_score = LEAST(trust_score, 30) WHERE id = p_user_id;
    INSERT INTO abuse_logs (user_id, ip_address, fingerprint_hash, email, event_type, rule_triggered, action_taken, metadata)
    VALUES (p_user_id, p_ip, p_fp_hash, v_user.email, 'free_credit_block', 'fingerprint_already_granted', 'blocked', '{}');
    RETURN 0;
  END IF;

  -- 6. Determine grant amount based on trust tier
  IF v_user.trust_score < 40 THEN
    v_grant_amount := v_full_grant / 2;  -- 25 credits
  ELSE
    v_grant_amount := v_full_grant;       -- 50 credits
  END IF;

  -- 7. Get wallet
  SELECT id INTO v_wallet_id FROM credit_wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- 8. Atomic: credit wallet + write grant ledger row
  UPDATE credit_wallets
  SET balance = balance + v_grant_amount, updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO credit_transactions (wallet_id, acting_user_id, action_type, delta, balance_after, request_id, actor)
  SELECT v_wallet_id, p_user_id, 'free_credit_grant', v_grant_amount,
         balance, gen_random_uuid(), 'system'
  FROM credit_wallets WHERE id = v_wallet_id;

  INSERT INTO free_credit_grants (user_id, email, ip_address, fingerprint_hash, credits_granted)
  VALUES (p_user_id, v_user.email, p_ip, p_fp_hash, v_grant_amount);

  RETURN v_grant_amount;
END;
$$;

REVOKE ALL ON FUNCTION fn_grant_free_credits(uuid, inet, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_grant_free_credits(uuid, inet, text) TO service_role;
