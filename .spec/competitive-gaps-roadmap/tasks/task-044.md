---
task: "044"
feature: competitive-gaps-roadmap
rec: R1
title: "ContentEditor auto-save and SEO rescore after inline edit"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["029", "031"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/verify.md`

---

## Objective
Complete the ContentEditor auto-save mechanism (debounced 2s PATCH to content_assets) and implement SEO re-scoring after a `fix_seo` inline edit action completes.

## Files

### Modify
- `D:/content-engine/components/sections/ContentEditor.tsx`

## Codebase Context

`content_assets` has a `version` integer column that increments on update. The auto-save should PATCH the blog asset for the session.

Existing SEO scoring: `app/api/seo/` route or similar. Check `app/dashboard/seo/` page to understand the SEO scoring API call pattern.

Supabase browser client: `lib/supabase.ts` exports `createBrowserClient()` or similar.

## Implementation Steps

1. Complete auto-save (skeleton was in TASK-029):

```typescript
const saveTimerRef = useRef<NodeJS.Timeout>()
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

// In useEffect after editor is initialized:
editor?.on('update', () => {
  setSaveStatus('saving')
  clearTimeout(saveTimerRef.current)
  saveTimerRef.current = setTimeout(async () => {
    try {
      const html = editor.getHTML()
      const token = await supabase.auth.getSession()
      const res = await fetch(`/api/content-assets/${assetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.data.session?.access_token}`
        },
        body: JSON.stringify({ content: { text: html, editedAt: new Date().toISOString() } })
      })
      setSaveStatus(res.ok ? 'saved' : 'error')
    } catch {
      setSaveStatus('error')
    }
  }, 2000)
})

return () => { clearTimeout(saveTimerRef.current); editor?.off('update') }
```

2. Note: `PATCH /api/content-assets/[id]` route may not exist. If not, create it:
   - `app/api/content-assets/[id]/route.ts` PATCH
   - Auth + verify ownership via session → user_id join
   - Update `content` jsonb field
   - Return 200

3. SEO rescore after `fix_seo` edit:
   - In `handleActionSelected` after paragraph replacement, if `action === 'fix_seo'`:
   - Call `onSEORescore?.()` prop (optional callback)
   - Parent component (BlogPanel / main dashboard) wires this to call `/api/seo` with new article content

4. Status indicator in editor toolbar:
   - 'idle': nothing shown
   - 'saving': "Saving..." in gray
   - 'saved': "Saved ✓" in green (auto-clears after 3s)
   - 'error': "Save failed" in red

## Test Cases

- Type in editor → 2s later → PATCH called with editor HTML
- Save succeeds → "Saved ✓" shown → clears after 3s
- Save fails → "Save failed" shown in red
- `fix_seo` action → paragraph replaced → `onSEORescore` called
- Unmount before 2s → timeout cleared (no leak)

## Decision Rules
- Auto-save uses debounce, not throttle — waits for user to pause.
- Clear timeout on component unmount to prevent memory leaks.
- `onSEORescore` is optional prop — no error if not provided.
- PATCH route verifies session ownership to prevent cross-user writes.

## Acceptance Criteria
- Editor auto-saves 2 seconds after last keystroke.
- Save status indicator shows correct states.
- `fix_seo` action triggers SEO rescore via `onSEORescore` callback.
- Unmounting component clears debounce timer.

Status: COMPLETE
Completed: 2026-04-28T11:15:00Z
