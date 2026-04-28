CREATE OR REPLACE FUNCTION fn_create_team(p_owner_id uuid, p_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_team_id uuid;
BEGIN
  INSERT INTO teams (owner_user_id, name) VALUES (p_owner_id, p_name) RETURNING id INTO v_team_id;
  INSERT INTO credit_wallets (owner_id, owner_kind, balance) VALUES (v_team_id, 'team', 0);
  INSERT INTO team_members (team_id, user_id, role) VALUES (v_team_id, p_owner_id, 'owner');
  UPDATE users SET account_type = 'team_owner' WHERE id = p_owner_id;
  RETURN json_build_object('team_id', v_team_id);
END $$;

CREATE OR REPLACE FUNCTION fn_accept_team_invite(p_invite_id uuid, p_user_id uuid, p_team_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role) VALUES (p_team_id, p_user_id, 'member')
    ON CONFLICT DO NOTHING;
  UPDATE users SET account_type = 'team_member' WHERE id = p_user_id AND account_type = 'individual';
  UPDATE team_invites SET accepted_at = now() WHERE id = p_invite_id;
END $$;

CREATE OR REPLACE FUNCTION fn_remove_team_member(p_team_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM team_members WHERE team_id = p_team_id AND user_id = p_user_id;
  UPDATE users SET account_type = 'individual' WHERE id = p_user_id;
END $$;

CREATE OR REPLACE FUNCTION fn_transfer_team_ownership(p_team_id uuid, p_old_owner uuid, p_new_owner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE teams SET owner_user_id = p_new_owner WHERE id = p_team_id;
  UPDATE team_members SET role = 'member' WHERE team_id = p_team_id AND user_id = p_old_owner;
  UPDATE team_members SET role = 'owner' WHERE team_id = p_team_id AND user_id = p_new_owner;
  UPDATE users SET account_type = 'team_member' WHERE id = p_old_owner;
  UPDATE users SET account_type = 'team_owner' WHERE id = p_new_owner;
END $$;

REVOKE ALL ON FUNCTION fn_create_team(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_create_team(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION fn_accept_team_invite(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_accept_team_invite(uuid, uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION fn_remove_team_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_remove_team_member(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION fn_transfer_team_ownership(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_transfer_team_ownership(uuid, uuid, uuid) TO service_role;
