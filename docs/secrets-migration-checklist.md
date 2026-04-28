# Secrets Migration Checklist

## Step 1: Vercel Encrypted Environment Variables

For each token below, migrate via Vercel Dashboard → Project → Settings → Environment Variables → Add → check "Sensitive" (encrypted).

| Variable | Current location | Vercel Encrypted |
|---|---|---|
| X_OAUTH_TOKEN | .env.local | [ ] Done |
| X_OAUTH_TOKEN_SECRET | .env.local | [ ] Done |
| X_CONSUMER_KEY | .env.local | [ ] Done |
| X_CONSUMER_SECRET | .env.local | [ ] Done |
| LINKEDIN_CLIENT_ID | .env.local | [ ] Done |
| LINKEDIN_CLIENT_SECRET | .env.local | [ ] Done |
| INSTAGRAM_ACCESS_TOKEN | .env.local | [ ] Done |
| REDDIT_CLIENT_ID | .env.local | [ ] Done |
| REDDIT_CLIENT_SECRET | .env.local | [ ] Done |
| REDDIT_REFRESH_TOKEN | .env.local | [ ] Done |
| NEWSLETTER_API_KEY | .env.local | [ ] Done |
| ANTHROPIC_API_KEY | .env.local | [ ] Done |
| OPENAI_API_KEY | .env.local | [ ] Done |
| SENTRY_DSN | .env.local | [ ] Done |
| SUPABASE_SERVICE_ROLE_KEY | .env.local | [ ] Done |
| INNGEST_EVENT_KEY | .env.local | [ ] Done |
| INNGEST_SIGNING_KEY | .env.local | [ ] Done |
| INNGEST_INTERNAL_SECRET | .env.local | [ ] Done |

## Step 2: Verify .env.local is in .gitignore

```bash
grep .env.local .gitignore
```

Expected output: `.env.local` (should be present).

## Step 3: Rotate any tokens that may have been exposed in CI logs

If any secrets were logged or printed in CI output, rotate them immediately in the respective platform dashboards before encrypting in Vercel.

## Phase 2: Supabase Vault (Per-User Secrets)

When ready to migrate per-user OAuth tokens to Supabase Vault:

1. Enable the `vault` extension in Supabase: `CREATE EXTENSION IF NOT EXISTS vault;`
2. Provision user secrets via `vault.create_secret(name, secret)`
3. Uncomment the Vault RPC call in `lib/publish/secrets.ts → getUserPlatformSecret()`
4. Remove the Phase 1 fallback switch statement
