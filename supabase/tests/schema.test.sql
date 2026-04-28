-- pgTAP-style assertions; run with `supabase test db`
BEGIN;
SELECT plan(12);

SELECT has_table('public','users','users table exists');
SELECT has_table('public','credit_wallets','credit_wallets table exists');
SELECT has_table('public','credit_transactions','credit_transactions table exists');
SELECT has_table('public','subscriptions','subscriptions table exists');
SELECT has_table('public','payments','payments table exists');
SELECT has_table('public','teams','teams table exists');

SELECT col_type_is('public','users','trust_score','integer','trust_score is INT');
SELECT col_has_check('public','credit_wallets','balance','balance >= 0 CHECK exists');

SELECT has_index('public','subscriptions','uniq_active_sub_per_user','partial unique index present');

SELECT is(
  (SELECT relkind FROM pg_class WHERE relname='credit_transactions'),
  'p'::"char",
  'credit_transactions is partitioned'
);

SELECT has_unique('public','credit_transactions','wallet_id+request_id idempotency');

SELECT is(
  (SELECT count(*) FROM pg_type WHERE typname IN
    ('account_type_t','account_status_t','wallet_owner_t','sub_status_t','pay_status_t','team_role_t')),
  6::bigint, 'all 6 enums created'
);

SELECT * FROM finish();
ROLLBACK;
