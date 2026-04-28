CREATE OR REPLACE FUNCTION fn_credit_topup(
  p_wallet_id uuid,
  p_amount integer,
  p_payment_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev integer;
  v_new integer;
BEGIN
  SELECT balance INTO v_prev FROM credit_wallets WHERE id = p_wallet_id FOR UPDATE;
  IF v_prev IS NULL THEN
    RAISE EXCEPTION 'Wallet % not found', p_wallet_id;
  END IF;
  v_new := GREATEST(0, v_prev + p_amount);
  UPDATE credit_wallets SET balance = v_new, updated_at = now() WHERE id = p_wallet_id;
  INSERT INTO credit_ledger (wallet_id, delta, balance_after, reason, reference_id)
  VALUES (p_wallet_id, p_amount, v_new, CASE WHEN p_amount > 0 THEN 'topup' ELSE 'refund' END, p_payment_id);
  RETURN jsonb_build_object('previous', v_prev, 'new', v_new, 'delta', p_amount);
END;
$$;

REVOKE ALL ON FUNCTION fn_credit_topup(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_credit_topup(uuid, integer, text) TO service_role;
