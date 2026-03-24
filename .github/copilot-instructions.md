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
Current task: .spec/tasks/task-010.md
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

## Key Commands
When the user types `/command-name`, read the corresponding file and follow its instructions exactly.

### Core Workflow
- `/checkpoint` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/checkpoint.md
- `/save-session` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/save-session.md
- `/resume-session` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/resume-session.md
- `/task-handoff` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/task-handoff.md
- `/sessions` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/sessions.md
- `/aside` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/aside.md
- `/projects` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/projects.md
- `/learn` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/learn.md
- `/learn-eval` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/learn-eval.md
- `/skill-create` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/skill-create.md
- `/evolve` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/evolve.md
- `/eval` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/eval.md
- `/promote` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/promote.md
- `/setup-pm` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/setup-pm.md
- `/harness-audit` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/harness-audit.md
- `/instinct-export` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/instinct-export.md
- `/instinct-import` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/instinct-import.md
- `/instinct-status` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/core/instinct-status.md

### Development
- `/verify` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/development/verify.md
- `/code-review` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/development/code-review.md
- `/build-fix` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/development/build-fix.md
- `/refactor-clean` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/development/refactor-clean.md
- `/update-docs` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/development/update-docs.md
- `/update-codemaps` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/development/update-codemaps.md
- `/pm2` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/development/pm2.md
- `/prompt-optimize` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/development/prompt-optimize.md

### Testing & Quality
- `/tdd` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/testing-quality/tdd.md
- `/e2e` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/testing-quality/e2e.md
- `/quality-gate` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/testing-quality/quality-gate.md
- `/test-coverage` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/testing-quality/test-coverage.md

### Planning
- `/plan` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/plan.md
- `/orchestrate` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/orchestrate.md
- `/model-route` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/model-route.md
- `/loop-start` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/loop-start.md
- `/loop-status` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/loop-status.md
- `/multi-plan` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/multi-plan.md
- `/multi-execute` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/multi-execute.md
- `/multi-workflow` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/multi-workflow.md
- `/multi-backend` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/multi-backend.md
- `/multi-frontend` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/planning/multi-frontend.md

### Languages
- `/go-build` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/languages/go-build.md
- `/go-review` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/languages/go-review.md
- `/go-test` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/languages/go-test.md
- `/gradle-build` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/languages/gradle-build.md
- `/kotlin-build` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/languages/kotlin-build.md
- `/kotlin-review` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/languages/kotlin-review.md
- `/kotlin-test` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/languages/kotlin-test.md
- `/python-review` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/languages/python-review.md

### Specialized
- `/claw` → C:/Users/Hp/Desktop/Experiment/claude_kit/commands/specialized/claw.md

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
