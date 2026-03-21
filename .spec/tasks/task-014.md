# TASK-014 — Session History & Analytics Shell

## Session Bootstrap
Skills needed: build-website-web-app, code-writing-software-development

## Objective
Build session history list on the dashboard home (loads past sessions from Supabase) and a placeholder Analytics panel for Phase 2 integrations.

## Implementation Steps
1. Update `/app/dashboard/page.tsx`:
   - On load, query Supabase: `SELECT * FROM sessions WHERE user_id = auth.uid() ORDER BY created_at DESC`
   - Render session list: each row shows input_type badge, topic/filename, date, asset count
   - Asset count: `SELECT COUNT(*) FROM content_assets WHERE session_id = session.id`
2. Clicking a past session:
   - Load all `content_assets` for that session from Supabase
   - Populate SessionContext with the loaded assets
   - Navigate to `/dashboard` summary view
3. Create `/app/dashboard/analytics/page.tsx`:
   - Placeholder cards for: Traffic Overview, Top Performing Content, CTR by Platform
   - Each card shows "Connect Google Analytics — coming soon" with a lock icon
   - Add "Connect Search Console" placeholder card
4. Add "History" section to sidebar (below Analytics)
5. Empty state: if no sessions, show "No sessions yet — start your first generation above"

## Acceptance Criteria
- Dashboard home lists past sessions (topic/upload, date, asset count)
- Clicking a past session loads its `content_assets` from Supabase and populates all panels
- Analytics panel renders placeholder cards (Google Analytics / Search Console — Phase 2)

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [ ]
- Next task: task-015.md
- Notes: ___
