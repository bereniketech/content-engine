# AI Content Engine

**Project:** Multi-tenant content generation + distribution platform with brand kit + newsjacking system  
**Stack:** Next.js 14 (React 18) + FastAPI backend + PostgreSQL + Redis + OpenAI/Claude APIs  
**Status:** Distribution & analytics architecture phase  

**Kit:** `.kit/` contains skills, agents, commands, rules loaded from claude_kit on startup.

---

## System Overview

### Brand Kit System
The foundation for all content generation. Each client workspace stores:
- **Visual Identity** — colors, typography, logo, imagery style, spacing rules
- **Content Identity** — positioning, tone of voice, content pillars, audience ICP, key messages, banned words
- **Platform Overrides** — LinkedIn, X, Instagram, Reddit, Email each have voice variations + algorithm-specific rules
- **Performance Benchmarks** — historical best formats, topics, current metrics, target KPIs

### Newsjacking Toolkit
One-click trending topic generator + cross-platform content creation:
1. User clicks "Generate Newsjacking Topics"
2. Engine produces trending topics in client's niche (X monitoring, news APIs, manual input)
3. Client selects a topic
4. Engine generates brand-aligned content for all platforms using brand kit + platform rules
5. Client posts or edits in editor; final version tracked
6. Performance metrics entered (impressions, saves, engagement, etc.)
7. Brand kit updated automatically based on what performed

### Content Generation Pipeline
1. **Input** — topic, article, or newsjacking topic + brand kit context
2. **Generation** — multi-platform content using brand kit + platform-specific rules
3. **Editing** — client can refine before posting (edited version saved)
4. **Distribution** — direct posting via API (X, LinkedIn, Instagram, Reddit) + email delivery
5. **Tracking** — performance metrics collected and interpreted
6. **Feedback Loop** — brand kit continuously refined by what wins across platforms

---

## Active Feature
**Feature:** brand-kit-and-newsjacking-system  
**Previous:** distribution-and-analytics (foundation complete)  
**Branch:** main  

## Build Order (Next Features)
1. **Brand Kit Builder UI** — forms to define brand identity, content pillars, tone, platform overrides
2. **Brand Kit Storage** — PostgreSQL schema for brand data + versioning
3. **Newsjacking Engine** — trending topic sourcing + filtering for client niche
4. **Platform-Specific Content Generation** — enhanced generation with platform rules + brand kit context
5. **Cross-Platform Distribution API** — unified interface for posting to all platforms
6. **Performance Feedback Loop** — metrics ingestion → brand kit updates
7. **Brand Kit A/B Testing** — track which brand kit variations drove best results

---

## Key Reference Files
- **Spec:** `.spec/ideas/2026-04-24-brand-kit-and-newsjacking-system.md` — full system design
- **Content Rules:** `.spec/content-plan.md` — 360Brew LinkedIn strategy + formatting rules
- **Examples:** `posts.txt` — high-performing LinkedIn content (authority + conversion formats)
- **Database:** `.spec/schema.md` — PostgreSQL schema for all features

## Start Here
1. Read **Spec** above — system overview
2. Check **Active Feature** section for current task path
3. Open the current task file — self-contained with acceptance criteria
4. Skills are loaded via @imports — no manual loading needed
5. Implement. Run `/task-handoff` when done.

## Kit Contents
**Skills:** `.kit/skills/` — auto-loaded (development, testing-quality, data-backend, frameworks-backend, etc.)  
**Agents:** `.kit/agents/` — invoke with `@agent-name` (if present)  
**Commands:** `.kit/commands/` — auto-available (key ones: `/verify`, `/task-handoff`, `/tdd`, `/code-review`)  
**Rules:** `.kit/rules/` — applied automatically  

## Config & Docs
- Deployment: `.claude/project-config.md`
- Env vars: `.env.local` (local) + Render dashboard (prod)

## Bug Log
Append to `bug-log.md` immediately after any fix:  
`## [YYYY-MM-DD] title | What broke: … | Root cause: … | Fix: … | File(s): …`

## Self-Check (before marking task done)
1. Acceptance Criteria in task file — all pass?
2. Hardcoded values should be env vars?
3. Upstream/downstream breakage?
4. `bug-log.md` updated if errors occurred?

## Output Discipline
Lead with the action. No preamble, no post-summary. Bullet points over prose.
