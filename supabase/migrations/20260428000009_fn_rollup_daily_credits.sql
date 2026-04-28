CREATE OR REPLACE FUNCTION fn_rollup_daily_credits(p_date date DEFAULT CURRENT_DATE - 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO daily_credit_aggregates (user_id, action_type, credits_used, day)
  SELECT
    acting_user_id,
    action_type,
    SUM(ABS(delta)) AS credits_used,
    p_date
  FROM credit_transactions
  WHERE created_at >= p_date
    AND created_at < p_date + 1
    AND delta < 0
  GROUP BY acting_user_id, action_type
  ON CONFLICT (user_id, action_type, day)
  DO UPDATE SET credits_used = EXCLUDED.credits_used;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION fn_rollup_daily_credits(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_rollup_daily_credits(date) TO service_role;
