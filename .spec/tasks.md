# Tasks — AI Content Engine

---

## TASK-001 — Project Bootstrap
_Requirements:_ US-15, US-16
_Skills:_ code-writing-software-development, build-website-web-app

Initialise Next.js 14 (App Router, TypeScript, Tailwind), install dependencies, configure Supabase client, set up project folder structure, and connect GitHub remote.

**AC:**
- `npx create-next-app@latest` runs clean with TypeScript + Tailwind + App Router
- `@supabase/supabase-js` and `@anthropic-ai/sdk` installed
- `/lib/supabase.ts` and `/lib/claude.ts` clients initialised from env vars
- Folder structure matches `.spec/plan.md` layout
- `git remote add origin https://github.com/bereniketech/content-engine.git` set and first commit pushed

---

## TASK-002 — Supabase Schema & Auth
_Requirements:_ US-16
_Skills:_ code-writing-software-development, security-review

Create Supabase tables (`sessions`, `content_assets`), RLS policies, and auth flow (sign up, log in, protected routes).

**AC:**
- `sessions` and `content_assets` tables created with correct columns and FK constraints
- RLS policies: users can only SELECT/INSERT/UPDATE their own rows
- `/app/(auth)/login/page.tsx` and `/app/(auth)/signup/page.tsx` functional
- Unauthenticated access to `/dashboard` redirects to `/login`
- Supabase Auth session persists across page refreshes

---

## TASK-003 — Dashboard Shell & Sidebar
_Requirements:_ US-15
_Skills:_ build-website-web-app, code-writing-software-development

Build the dashboard layout: sidebar navigation, top bar, and content area shell. No real data yet — use placeholder panels.

**AC:**
- Sidebar renders all 13 sections: Research, SEO, Blog, Images, X, LinkedIn, Instagram, Medium, Reddit, Newsletter, Pinterest, Calendar, Analytics
- Active section highlights in sidebar on click
- Layout is responsive (sidebar collapses on mobile)
- Each section renders a placeholder `ContentCard` with Copy / Edit / Regenerate buttons (non-functional)

---

## TASK-004 — Input Layer (Topic Form + Article Upload)
_Requirements:_ US-01, US-02
_Skills:_ build-website-web-app, code-writing-software-development

Build the dual input UI: topic form and article paste/upload. Validate inputs and route to correct pipeline.

**AC:**
- Topic form collects: topic, audience, tone (dropdown: authority/casual/storytelling), keywords (optional), geography (optional)
- Article upload accepts text and markdown; shows "Coming soon" for PDF/Doc
- Client-side validation: topic must be >5 characters; article must be >100 characters
- On submit, form state is stored in React context and input_type is set to `topic` or `upload`
- A new `session` row is created in Supabase on submit

---

## TASK-005 — Research Engine API + UI
_Requirements:_ US-03, US-04
_Skills:_ code-writing-software-development, api-design, claude-developer-platform

Build `POST /api/research` route and Research panel UI. Integrate Google Search API + Claude for topic intelligence and competitor gap analysis.

**AC:**
- `POST /api/research` returns `{ intent, demand, trend, keywords, faqs, competitors, gaps }`
- Google Search API called for top 10 results; Claude analyses and extracts structured data
- IF demand is "low" THEN 3 alternative topics are returned and shown in UI
- Research panel displays: intent badge, demand badge, trend badge, keyword clusters, FAQs, competitor gaps
- Result saved to `content_assets` with `asset_type = 'research'`

---

## TASK-006 — SEO Engine API + UI
_Requirements:_ US-05
_Skills:_ code-writing-software-development, api-design, claude-developer-platform

Build `POST /api/seo` route and SEO panel UI.

**AC:**
- `POST /api/seo` returns full SEO object (title, meta, slug, keywords, schemas, scores)
- SEO panel renders all fields with copy buttons per field
- SEO Strength Score shown as a progress bar (0–100)
- Keyword Coverage Score and Ranking Potential label displayed
- Result saved to `content_assets` with `asset_type = 'seo'`

---

## TASK-007 — Blog Generation API + UI (Streaming)
_Requirements:_ US-06
_Skills:_ code-writing-software-development, api-design, claude-developer-platform, build-website-web-app

Build `POST /api/blog` with SSE streaming and Blog panel UI with live markdown rendering.

**AC:**
- `POST /api/blog` streams markdown via `ReadableStream`
- Blog panel renders markdown incrementally as tokens arrive (no blank screen)
- Tone selection (authority/casual/storytelling) passed to Claude prompt
- "Expand section" button on each H2 calls Claude to regenerate that section only
- Full blog saved to `content_assets` with `asset_type = 'blog'` on stream completion

---

## TASK-008 — Grammar & Improvement Engine API + UI
_Requirements:_ US-07
_Skills:_ code-writing-software-development, api-design, claude-developer-platform

Build `POST /api/improve` route and improvement panel for upload mode.

**AC:**
- `POST /api/improve` returns `{ original, improved, changes[] }`
- Upload mode shows side-by-side diff view (original vs improved)
- Toggle button switches between original and improved
- Improved version is used as input for SEO + multi-platform engines
- Result saved to `content_assets` with `asset_type = 'improved'`

---

## TASK-009 — Multi-Platform Social Engine API + UI
_Requirements:_ US-09, US-10
_Skills:_ code-writing-software-development, api-design, claude-developer-platform, x-api

Build `POST /api/social` route and all 7 platform panels. Single Claude call produces all platform variants.

**AC:**
- `POST /api/social` returns structured JSON with all 8 platform outputs in one Claude call
- Each platform panel renders its content with Copy / Edit / Regenerate per block
- X panel: viral tweet + thread (numbered) + hooks + reply chains
- LinkedIn panel: storytelling post + authority post + carousel text
- Instagram panel: carousel captions + reel caption + hooks + CTA
- Medium panel: reformatted article + canonical link suggestion
- Reddit panel: discussion post + subreddit suggestions + engagement questions
- Newsletter panel: subject lines + email body + CTA
- Pinterest panel: pin titles + descriptions + keywords
- All results saved to `content_assets` with respective `asset_type`

---

## TASK-010 — Image Prompt Engine API + UI
_Requirements:_ US-08
_Skills:_ code-writing-software-development, api-design, claude-developer-platform

Build `POST /api/images` route and Images panel. Generate prompts via Claude, optionally render via fal.ai.

**AC:**
- `POST /api/images` returns hero, section, infographic, social, and Pinterest prompts
- Style selector (realistic/3D/flat/startup/minimal tech) affects all prompts
- Each prompt has a copy button and optional "Generate image" button (calls fal.ai)
- Result saved to `content_assets` with `asset_type = 'images'`

---

## TASK-011 — Distribution + Traffic + Flywheel APIs + UI
_Requirements:_ US-11, US-12, US-13
_Skills:_ code-writing-software-development, api-design, claude-developer-platform

Build the three supporting engines: distribution sequence, traffic prediction, and content flywheel.

**AC:**
- `POST /api/distribute` returns 3-day posting sequence + per-platform instructions
- `POST /api/traffic` returns demand, competition, click potential, SEO strength, label, estimated range
- `POST /api/flywheel` returns 10+ topic ideas with keyword clusters
- Distribution panel shows Day 1/2/3 sequence with expandable platform instructions
- Traffic panel shows labelled metrics and estimated monthly range
- Flywheel panel shows 10+ topic cards; clicking one pre-fills the topic form

---

## TASK-012 — Content Calendar UI
_Requirements:_ US-14
_Skills:_ build-website-web-app, code-writing-software-development

Build the weekly content calendar view generated from the current session's assets.

**AC:**
- Calendar renders Mon–Fri slots (Blog, LinkedIn, Reddit, X, Newsletter)
- Each slot is populated with a summary of the relevant generated asset
- Clicking a slot opens the full asset in its platform panel
- Calendar is exportable as plain text (copy button)

---

## TASK-013 — Content Multiplication Summary Panel
_Requirements:_ US-10
_Skills:_ build-website-web-app, code-writing-software-development

Build the summary view that counts and lists all generated assets after a full run.

**AC:**
- Summary panel appears after all engines complete
- Shows counts: 1 blog, 1 Medium, 1 newsletter, 1 Reddit post, 10 tweets, 3 LinkedIn posts, Instagram captions, Pinterest pins, 5 quotes, 5 questions
- Total asset count shown prominently (20–30+)
- Each asset type links to its panel

---

## TASK-014 — Session History & Analytics Shell
_Requirements:_ US-16, US-15
_Skills:_ build-website-web-app, code-writing-software-development

Build session history list in dashboard and placeholder Analytics panel.

**AC:**
- Dashboard home lists past sessions (topic/upload, date, asset count)
- Clicking a past session loads its `content_assets` from Supabase and populates all panels
- Analytics panel renders placeholder cards (Google Analytics / Search Console — Phase 2)

---

## TASK-015 — Security Hardening & Rate Limiting
_Requirements:_ US-15, US-16
_Skills:_ security-review, code-writing-software-development

Apply OWASP review across all API routes, add Supabase JWT middleware, and configure rate limiting.

**AC:**
- All `/api/*` routes reject requests without valid Supabase JWT (401)
- Vercel Edge middleware enforces 10 req/min per user per route
- All user inputs sanitised before inclusion in Claude prompts (no prompt injection)
- RLS verified: querying another user's session_id returns 0 rows
- No API keys exposed in client bundles (verified via `next build` output)

---

## TASK-016 — End-to-End Test & Vercel Deploy
_Requirements:_ All
_Skills:_ code-writing-software-development, build-website-web-app

Run a full topic-to-distribution flow end-to-end, fix any integration issues, and deploy to Vercel.

**AC:**
- Full flow works: topic input → research → SEO → blog (streaming) → social → images → distribute → traffic → flywheel → calendar → summary
- Full flow works: article upload → improve → SEO → social → distribute
- All assets saved to Supabase per session
- `vercel deploy --prod` succeeds with zero build errors
- All env vars set in Vercel dashboard
- Production URL accessible and authenticated flow works
