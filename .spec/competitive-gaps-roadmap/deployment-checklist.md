# Deployment Checklist — competitive-gaps-roadmap

## New Environment Variables Required

| Variable | Required By | Notes |
|----------|-------------|-------|
| `ORIGINALITY_API_KEY` | R10 plagiarism detection | Optional — feature shows CTA if missing |
| `RESEND_API_KEY` | R9 workspace email | Optional — stubs log if missing |
| `GEMINI_API_KEY` | R6 image generation | Already required if images route used |
| `CRON_SECRET` | R4 Inngest schedule | For cron auth header |
| `NEXT_PUBLIC_APP_URL` | R4 Inngest schedule | For internal publish route calls |

## Database Migrations (apply in order)

1. `supabase/migrations/20260428_scheduled_posts_title.sql`
2. `supabase/migrations/20260428_brand_voices.sql`
3. `supabase/migrations/20260428_briefs.sql`
4. `supabase/migrations/20260428_content_clusters.sql`
5. `supabase/migrations/20260428_workspaces.sql`

## npm Packages Added

- `@tiptap/react` — R1 inline editor
- `@tiptap/starter-kit` — R1 inline editor
- `@tiptap/extension-placeholder` — R1 inline editor

## Feature Flags

- `workspace_enabled` (`workspaces.feature_enabled` column, default `false`): Enable manually per workspace after testing. All workspace API routes check this flag before data access.

## Rollout Order (follow task priority)

R6 → R5 → R7 → R4 → R3 → R2 → R10 → R1 → R8 → R9

## Pre-Deploy Verification

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0 (or only pre-existing warnings)
- [ ] `npm test -- --passWithNoTests` exits 0

## Database Verification

- [ ] All 5 migrations applied to Supabase production (in order above)
- [ ] RLS policies active on `brand_voices`, `briefs`, `content_clusters`, `workspaces`, `workspace_members`, `content_approvals`
- [ ] `idx_content_performance_session_id` index present on `content_performance`

## Inngest Verification

- [ ] `scheduledPublish` function registered in `app/api/inngest/route.ts` serve() call
- [ ] Inngest dashboard shows all pipeline functions active
- [ ] Cron trigger for scheduled publish configured in Inngest

## Feature Smoke Tests

- [ ] `/api/ingest` returns 200 for a test web page URL
- [ ] `/dashboard/library` loads with ROI sparklines visible
- [ ] `/dashboard/schedule` calendar renders 7-day grid without console errors
- [ ] `/dashboard/brand-voice` — create profile, set active, verify badge appears
- [ ] ContentEditor loads (no SSR errors), auto-save triggers after 2s of typing
- [ ] `/dashboard/clusters` — build cluster, generate articles list
- [ ] Workspace feature flag toggled for pilot users only (`UPDATE workspaces SET feature_enabled=true WHERE id='...'`)
- [ ] Approval workflow: submit article → appears in workspace queue → approve → status updates

## Security Verification

- [ ] SSRF guard active: private IP URLs blocked at `/api/ingest`
- [ ] Self-approval blocked: `submitted_by === reviewer` returns 403 from `/api/approval/[id]`
- [ ] State machine: `POST /api/approval/[id]` with `{ status: "published" }` on already-published record returns 422
- [ ] Feature flag gate: `/api/approval` with `feature_enabled=false` workspace returns 403

## Known Warnings (follow-up items, non-blocking)

- 10 routes missing `// OWASP checklist:` header comment — add in next PR
- `app/api/edit/route.ts` and `app/api/cluster/route.ts`: free-text LLM prompt inputs not passed through `sanitizeInput()` — add before next production release
- `app/api/schedule/[id]/route.ts`: PATCH handler lacks application-layer ownership check (relies on RLS only) — add defense-in-depth check

## Rollback Plan

- Migrations: Supabase migrations are additive (new tables, new columns) — safe to leave in place; disable features via feature flags rather than reverting migrations
- Code: Revert to previous git tag; no breaking changes to existing routes
- Workspace: Set `feature_enabled=false` on all workspaces to disable without code rollback
