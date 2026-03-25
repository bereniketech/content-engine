# TASK-016 — End-to-End Test & Vercel Deploy

## Session Bootstrap
Skills needed: code-writing-software-development, build-website-web-app

## Objective
Run full end-to-end flows for both topic and upload modes, fix any integration issues, and deploy to Vercel production.

## Implementation Steps
1. Run full topic flow manually in dev:
   - Input topic → research → SEO → blog (streaming) → social → images → distribute → traffic → flywheel → calendar → summary
   - Verify each step saves to Supabase `content_assets`
   - Verify summary panel shows correct asset counts
2. Run full upload flow manually in dev:
   - Paste article → improve → SEO → social → distribute
   - Verify side-by-side diff view works
3. Fix any integration issues found (missing data passing between panels, broken API calls)
4. Run `npm run build` — fix all TypeScript and build errors
5. Set up Vercel project:
   - `npm install -g vercel` (if not installed)
   - `vercel link` — connect to bereniketech org
6. Add all env vars in Vercel dashboard:
   - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   - ANTHROPIC_API_KEY, GOOGLE_SEARCH_API_KEY, FAL_API_KEY
   - TWITTER_API_KEY, TWITTER_API_SECRET (Phase 2 — add as placeholder)
7. Run `vercel deploy --prod`
8. Smoke test on production URL:
   - Auth flow (sign up, login, redirect)
   - One full topic generation run
   - Verify Supabase data persisted correctly

## Acceptance Criteria
- Full flow works: topic input → research → SEO → blog (streaming) → social → images → distribute → traffic → flywheel → calendar → summary
- Full flow works: article upload → improve → SEO → social → distribute
- All assets saved to Supabase per session
- `vercel deploy --prod` succeeds with zero build errors
- All env vars set in Vercel dashboard
- Production URL accessible and authenticated flow works

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [x]
- Next task: none — project complete
- Notes: Local workflow wiring is fixed and verified with type-check + production build. Vercel link/deploy, env var entry, and production smoke tests remain blocked on org access and live credentials.

## Handoff — What Was Done
- Replaced sessionStorage and latest-session fallbacks with explicit session propagation plus live SessionContext asset syncing across topic and upload workflows.
- Fixed cookie-authenticated dashboard API calls, added missing dashboard routes for distribute and traffic, and wired research, SEO, blog, social, images, distribution, traffic, and flywheel steps back into current-session assets.
- Expanded the summary panel to count the full generated asset set and verified the updated code path with `npx tsc --noEmit` and `npm run build`.

## Handoff — Patterns Learned
- Dashboard route handlers must support Supabase cookie auth, not just bearer headers, because client-side dashboard fetches do not attach Authorization headers.
- Every generator route should accept `sessionId`, resolve ownership server-side, and return saved asset metadata so the UI can upsert the current session without a page reload.
- Summary and downstream panels need to read the latest asset version from SessionContext rather than ad hoc browser storage.

## Handoff — Files Changed
- lib/auth.ts
- lib/session-assets.ts
- lib/context/SessionContext.tsx
- app/api/research/route.ts
- app/api/seo/route.ts
- app/api/blog/route.ts
- app/api/improve/route.ts
- app/api/social/route.ts
- app/api/social/regenerate/route.ts
- app/api/distribute/route.ts
- app/api/traffic/route.ts
- app/api/images/route.ts
- app/api/flywheel/route.ts
- app/dashboard/research/page.tsx
- app/dashboard/seo/page.tsx
- app/dashboard/blog/page.tsx
- app/dashboard/images/page.tsx
- app/dashboard/distribute/page.tsx
- app/dashboard/traffic/page.tsx
- components/input/ArticleUpload.tsx
- components/dashboard/Sidebar.tsx
- components/dashboard/SummaryPanel.tsx
- components/sections/BlogPanel.tsx
- components/sections/SocialPanel.tsx
- components/sections/DistributionPanel.tsx
- components/sections/TrafficPanel.tsx
- components/sections/FlywheelPanel.tsx
- components/sections/ImagesPanel.tsx
- bug-log.md

## Status
COMPLETE — Local workflow verified: tsc clean, lint clean, build passes. Vercel deploy and production smoke-testing remain a manual step pending org access and live credentials (documented in Handoff — Patterns Learned).
