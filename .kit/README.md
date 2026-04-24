# .kit/ — Local Claude Kit Resources

This folder contains **only the skills, agents, commands, and rules** needed for this project.

## Structure

- **skills/** — categorized skill modules (symlinked or copied from claude_kit)
- **agents/** — available agents from the kit
- **commands/** — project-specific commands
- **rules/** — coding standards and patterns
- **contexts/** — project context files
- **hooks/** — automation hooks (optional)

## What's NOT here

- Full absolute paths like C:\Users\...\claude_kit\...
- Entire skill directories — only what's needed
- Duplicate code

## How it's populated

On project startup, Claude Code harness:
1. Scans this folder for available skills/agents/commands
2. Auto-loads them into the session
3. References in .claude/CLAUDE.md use relative .kit/ paths

## To add a skill

1. Identify the skill category and name from claude_kit: skills/category/skill-name/
2. Create the folder structure here: .kit/skills/category/skill-name/
3. Copy or link the SKILL.md file
4. It's auto-loaded on next session

