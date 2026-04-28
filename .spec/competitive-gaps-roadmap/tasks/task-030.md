---
task: "030"
feature: competitive-gaps-roadmap
rec: R1
title: "Create slash command menu for ContentEditor"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["029"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Add a slash-command popup and right-click context menu to `ContentEditor` that shows AI edit actions. No additional Tiptap extensions needed — implement as a custom Tiptap extension.

## Files

### Modify
- `D:/content-engine/components/sections/ContentEditor.tsx`

### Create
- `D:/content-engine/components/sections/editor/SlashCommandMenu.tsx`
- `D:/content-engine/components/sections/editor/SlashCommandExtension.ts`

## Dependencies
- TASK-029: ContentEditor with Tiptap installed
- `@tiptap/react` already installed

## API Contracts (outgoing — wired in TASK-031)

The menu items emit an action event to the parent ContentEditor:
```typescript
type EditAction = 'rewrite' | 'expand' | 'shorten' | 'change_tone' | 'fix_seo' | 'add_stat'

// Called when user selects action
onActionSelected: (action: EditAction, paragraphText: string) => void
```

## Implementation Steps

1. Create `components/sections/editor/SlashCommandExtension.ts`:

Custom Tiptap Node extension that:
- Listens for `/` typed at start of a line (empty paragraph or after newline)
- Sets a React state `showSlashMenu = true` + `menuPosition: { top, left }`
- Clears the `/` character from the editor

```typescript
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

export const SlashCommandPlugin = new PluginKey('slash-command')

export function createSlashCommandExtension(
  onOpen: (pos: { top: number; left: number }, paragraphText: string) => void
) {
  return Extension.create({
    name: 'slashCommand',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: SlashCommandPlugin,
          props: {
            handleKeyDown(view, event) {
              if (event.key === '/') {
                // Check if cursor is at start of paragraph
                // If yes: set timeout to check if slash was typed, show menu
              }
            }
          }
        })
      ]
    }
  })
}
```

2. Create `components/sections/editor/SlashCommandMenu.tsx`:

```typescript
'use client'
interface SlashCommandMenuProps {
  position: { top: number; left: number }
  onSelect: (action: EditAction) => void
  onClose: () => void
}
```

Render a `position: fixed` div at `top/left` with a list of buttons:
- Rewrite ✍️
- Expand 📝
- Shorten ✂️
- Change Tone 🎭 (opens sub-menu: Professional, Conversational, Persuasive, Empathetic)
- Fix SEO 🔍
- Add Statistic 📊

Keyboard nav: arrow keys move focus, Enter selects, Escape closes.
Click outside: `useEffect` with `document.addEventListener('mousedown')` → `onClose()`.

3. Modify `ContentEditor.tsx`:
   - Add state: `slashMenuOpen`, `slashMenuPosition`, `selectedParagraphText`
   - Add `createSlashCommandExtension` to Tiptap extensions array
   - Add `onContextMenu` handler to `EditorContent` wrapper:
     ```typescript
     onContextMenu={(e) => {
       e.preventDefault()
       const paragraphText = getSelectedOrCurrentParagraph(editor)
       setSlashMenuPosition({ top: e.clientY, left: e.clientX })
       setSelectedParagraphText(paragraphText)
       setSlashMenuOpen(true)
     }}
     ```
   - Render `<SlashCommandMenu>` when open, pass `onSelect={(action) => handleActionSelected(action, selectedParagraphText)}`
   - `handleActionSelected` is a prop/callback — the actual API call is in TASK-031

4. Helper `getSelectedOrCurrentParagraph(editor)`:
   - If selection is non-empty: return selected text
   - Else: return current paragraph node text content

## Test Cases

- Type `/` at start of paragraph → SlashCommandMenu appears
- Right-click on paragraph → context menu appears at click position
- Arrow keys navigate menu items
- Escape closes menu
- Clicking outside menu closes it
- Change Tone shows sub-menu with 4 tone options

## Decision Rules
- No additional npm packages for slash command — custom Extension only.
- Slash menu must be rendered in a React portal to avoid z-index issues.
- Context menu must use `e.preventDefault()` to suppress native browser context menu.
- Sub-menu for Change Tone: inline expand/collapse on hover, not a separate popup.

## Acceptance Criteria
- Typing `/` at paragraph start shows SlashCommandMenu.
- Right-clicking any paragraph shows the same SlashCommandMenu at cursor position.
- All 6 actions + 4 tone sub-options visible in menu.
- Keyboard navigation (arrow keys + Enter + Escape) works.
- Clicking outside dismisses menu.

Status: COMPLETE
Completed: 2026-04-28T09:55:06Z
