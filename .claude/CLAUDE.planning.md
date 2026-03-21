# Plan: AI Content Engine

## Goal
Build a Content Operating System that transforms one topic or uploaded article into a research-backed, SEO-optimized, multi-platform content ecosystem with distribution guidance and growth loops.

## Constraints
- Next.js (App Router), TypeScript, Tailwind CSS
- npm as package manager
- Supabase for database and auth
- Claude API for all AI generation
- Deploy to Vercel

## Deliverables
The plan must produce:
- `.spec/plan.md` — high-level project overview: goal, tech stack, architecture diagram, file structure
- `.spec/requirements.md` — user stories and acceptance criteria (EARS format)
- `.spec/design.md` — architecture, data models, API design, ADRs, security, performance
- `.spec/tasks.md` — ordered task list with acceptance criteria per task

## Instructions
Use /planning-specification-architecture.
Write `plan.md` first as the high-level overview, then follow the skill's 3-phase gated workflow: requirements → user approves → design → user approves → tasks → user approves.
Do not write implementation code. Do not skip approval gates.
Save each artifact only after the user explicitly approves that phase.
