# AI Content Engine

## Skills — Read These Files for Coding Standards
When implementing tasks, read these files for detailed coding standards:
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/development/code-writing-software-development/SKILL.md
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/core/continuous-learning/SKILL.md
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/core/strategic-compact/SKILL.md
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/planning/autonomous-agents-task-automation/SKILL.md
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/testing-quality/tdd-workflow/SKILL.md
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/testing-quality/security-review/SKILL.md
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/development/build-website-web-app/SKILL.md
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/ai-platform/claude-developer-platform/SKILL.md
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/development/api-design/SKILL.md
- C:/Users/Hp/Desktop/Experiment/claude_kit/skills/integrations/x-api/SKILL.md

## Active Feature
Feature: initial build
Tasks: .spec/tasks/
Current task: .spec/tasks/task-001.md
Branch: main

## Autonomous Loop — Begin Immediately on Session Start
On session start, do not wait for user input. Start from step 1 now.

1. Read `Current task:` from `## Active Feature` above. If it reads `ALL TASKS COMPLETE`, stop and notify the user.
2. Open that task file — it is self-contained with all acceptance criteria.
3. Read the skill files listed in `## Skills` above (once per session, not per task).
4. Implement all acceptance criteria. Zero clarifying questions mid-task — resolve unknowns from the task file, skills, or existing code. If genuinely blocked, write `BLOCKED: <reason>` in the task file's `## Status` and stop.
5. Run `/verify` — all phases must pass before continuing. On failure, fix the root cause. If the same phase fails 3× in a row, write `VERIFY_FAIL: <phase> — <error>` in `## Status` and stop.
6. Run `/task-handoff` — updates `Current task:` in this file and commits.
7. Run `/clear` — mandatory between every task to reset context. This file auto-loads in the new chat; the loop restarts from step 1 automatically.

## Reference (load on demand — do not read at session start)
- Agents: `.claude/agents/` — invoke with `@agent-name`; use only when task specifies
- Commands: `.claude/commands/` — key ones: `/verify`, `/task-handoff`, `/save-session`, `/tdd`, `/code-review`
- Config: `.claude/project-config.md` — deployment targets, env vars, hosting
- Rules: `.claude/rules/` — applied automatically

## Bug Log
Append to `bug-log.md` immediately after any fix:
`## [YYYY-MM-DD] title | What broke: … | Root cause: … | Fix: … | File(s): …`

## Self-Check (before marking task done)
1. Acceptance Criteria in current task file — all pass?
2. Hardcoded values that should be env vars?
3. Upstream/downstream breakage?
4. `bug-log.md` updated if errors occurred?

## Output Discipline
Lead with the action. No preamble, no post-summary. Bullet points over prose.
