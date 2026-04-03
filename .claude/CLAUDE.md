# AI Content Engine

@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/development/code-writing-software-development/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/core/continuous-learning/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/core/strategic-compact/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/planning/autonomous-agents-task-automation/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/testing-quality/tdd-workflow/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/testing-quality/security-review/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/development/build-website-web-app/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/ai-platform/claude-developer-platform/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/development/api-design/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/integrations/x-api/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/ai-platform/notebooklm/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/core/wrapup/SKILL.md
@C:/Users/Hp/Desktop/Experiment/claude_kit/skills/data-backend/database-migrations/SKILL.md

## Active Feature
Feature: data-driven-pipeline
Spec: .spec/data-driven-pipeline/requirements.md, design.md
Tasks: .spec/data-driven-pipeline/tasks/
Current task: ALL TASKS COMPLETE
Branch: feature/data-driven-pipeline

## Start Here
1. Read `## Active Feature` above — note the current task path.
2. Open the current task file — it is self-contained.
3. Skills are already loaded via @imports above — no need to load them manually.
4. Implement. Run `/task-handoff` when done.

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
