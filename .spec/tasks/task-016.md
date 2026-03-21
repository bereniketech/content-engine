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
- Completed: [ ]
- Next task: none — project complete
- Notes: ___
