# TASK-001 — Project Bootstrap

## Session Bootstrap
Skills needed: code-writing-software-development, build-website-web-app

## Objective
Initialise Next.js 14 (App Router, TypeScript, Tailwind), install dependencies, configure Supabase and Claude clients, set up the full folder structure, and push the first commit to GitHub.

## Implementation Steps
1. Run `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"`
2. Install dependencies: `npm install @supabase/supabase-js @anthropic-ai/sdk`
3. Install dev dependencies: `npm install -D @types/node`
4. Create `/lib/supabase.ts` — Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Create `/lib/claude.ts` — Anthropic client using `ANTHROPIC_API_KEY`
6. Create empty placeholder files for all folders in `.spec/plan.md` layout: `app/`, `components/`, `lib/prompts/`, `types/index.ts`
7. Copy `.env.example` values into `.env.local` (real keys added manually)
8. `git remote add origin https://github.com/bereniketech/content-engine.git`
9. Stage all files, commit, and push to `main`

## Acceptance Criteria
- `npx create-next-app@latest` runs clean with TypeScript + Tailwind + App Router
- `@supabase/supabase-js` and `@anthropic-ai/sdk` installed
- `/lib/supabase.ts` and `/lib/claude.ts` clients initialised from env vars
- Folder structure matches `.spec/plan.md` layout
- `git remote add origin https://github.com/bereniketech/content-engine.git` set and first commit pushed

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [x]
- Next task: task-002.md
- Notes: create-next-app scaffolded, deps installed, lib clients created, full folder structure in place, committed and pushed to main (f68f3be)
