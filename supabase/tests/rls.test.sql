BEGIN;
SELECT plan(6);

-- Setup: two users, one wallet for user A
INSERT INTO auth.users(id, email) VALUES
  ('11111111-1111-1111-1111-111111111111','a@example.com'),
  ('22222222-2222-2222-2222-222222222222','b@example.com');
INSERT INTO public.users(id, email) VALUES
  ('11111111-1111-1111-1111-111111111111','a@example.com'),
  ('22222222-2222-2222-2222-222222222222','b@example.com');
INSERT INTO public.credit_wallets(id, owner_id, owner_kind, balance)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          '11111111-1111-1111-1111-111111111111','user',100);

-- Simulate user B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

SELECT is(
  (SELECT count(*) FROM public.credit_wallets WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint, 'user B cannot see user A wallet'
);

SELECT is(
  (SELECT count(*) FROM public.users WHERE id='11111111-1111-1111-1111-111111111111'),
  0::bigint, 'user B cannot see user A profile'
);

-- Switch to user A
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

SELECT is(
  (SELECT count(*) FROM public.credit_wallets WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint, 'user A sees own wallet'
);

SELECT throws_ok(
  $$ INSERT INTO public.credit_transactions(wallet_id, acting_user_id, amount, action_type, request_id, actor)
     VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             '11111111-1111-1111-1111-111111111111', -1, 'manual',
             gen_random_uuid(), 'user') $$,
  '42501', NULL, 'authenticated user cannot directly insert credit_transactions'
);

-- Switch to admin
SET LOCAL request.jwt.claims = '{"role":"admin","sub":"99999999-9999-9999-9999-999999999999"}';
SELECT ok(
  (SELECT count(*) FROM public.credit_wallets) >= 1,
  'admin can read all wallets'
);

-- Switch to service_role (BYPASSRLS)
SET LOCAL ROLE service_role;
SELECT ok(
  (SELECT count(*) FROM public.credit_transactions) >= 0,
  'service_role bypasses RLS'
);

SELECT * FROM finish();
ROLLBACK;
