CREATE OR REPLACE FUNCTION fn_apply_trust_delta(
  p_user_id uuid,
  p_delta integer,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev integer;
  v_new integer;
BEGIN
  SELECT trust_score INTO v_prev FROM users WHERE id = p_user_id FOR UPDATE;
  IF v_prev IS NULL THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;
  v_new := GREATEST(0, LEAST(100, v_prev + p_delta));
  UPDATE users SET trust_score = v_new WHERE id = p_user_id;
  INSERT INTO trust_score_events (user_id, previous_score, new_score, delta, reason)
  VALUES (p_user_id, v_prev, v_new, p_delta, p_reason);
  RETURN jsonb_build_object('previous_score', v_prev, 'new_score', v_new);
END;
$$;

REVOKE ALL ON FUNCTION fn_apply_trust_delta(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_apply_trust_delta(uuid, integer, text) TO service_role;
