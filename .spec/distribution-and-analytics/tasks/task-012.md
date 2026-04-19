---
task: "012"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["010"]
---

# Task 012: Schedule Modal + CalendarPanel Extension

## Skills
- .kit/skills/development/build-website-web-app/SKILL.md

## Agents
- @web-frontend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `components/sections/ScheduleModal.tsx` (datetime picker modal for scheduling a post) and extend `components/sections/CalendarPanel.tsx` to show status badges for queued/published/failed posts and schedule/cancel actions per slot.

---

## Files
### Create
| File | Purpose |
|---|---|
| `components/sections/ScheduleModal.tsx` | Datetime picker modal that calls POST /api/schedule |

### Modify
| File | What to change |
|---|---|
| `components/sections/CalendarPanel.tsx` | Add: fetch scheduled posts on load; display badges; schedule/cancel buttons per slot |

---

## Dependencies
```bash
# No new packages needed.
# Env vars: none (all server-side).
```

---

## API Contracts
This task consumes:
- `GET /api/schedule?sessionId={id}` → `{ data: [{ id, platform, status, publishAt, assetType }] }`
- `POST /api/schedule` with `{ sessionId, platform, publishAt, assetType, contentSnapshot }`
- `DELETE /api/schedule/{id}`

---

## Code Templates

### `components/sections/ScheduleModal.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface ScheduleModalProps {
  platform: string
  sessionId: string
  assetType: string
  contentSnapshot: Record<string, unknown>
  onScheduled: (id: string, publishAt: string) => void
  onClose: () => void
}

async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function ScheduleModal({
  platform,
  sessionId,
  assetType,
  contentSnapshot,
  onScheduled,
  onClose,
}: ScheduleModalProps) {
  const [publishAt, setPublishAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Minimum datetime: 5 minutes from now
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16) // "YYYY-MM-DDTHH:MM"

  const isValidDate = publishAt.length > 0 && new Date(publishAt).getTime() > Date.now() + 4 * 60 * 1000

  const handleSchedule = async () => {
    if (!isValidDate || loading) return
    setLoading(true)
    setError('')

    const token = await getAuthToken()
    if (!token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          platform,
          publishAt: new Date(publishAt).toISOString(),
          assetType,
          contentSnapshot,
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        setError(json?.error?.message ?? `Error ${response.status}`)
        setLoading(false)
        return
      }

      onScheduled(json.data.id, json.data.publishAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Schedule post to {platform === 'x' ? 'X' : platform}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Publish date &amp; time
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              min={minDateTime}
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Must be at least 5 minutes from now.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isValidDate || loading}
              onClick={handleSchedule}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</>
              ) : (
                'Schedule'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### CalendarPanel.tsx modifications

At the top of `CalendarPanel.tsx`, add these imports after existing imports:
```typescript
import { useEffect, useState, useCallback } from 'react'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { ScheduleModal } from '@/components/sections/ScheduleModal'
import { getSupabaseBrowserClient } from '@/lib/supabase'
```

Add this type and fetcher inside the component (before the return):
```typescript
type ScheduledPost = {
  id: string
  platform: string
  status: 'queued' | 'published' | 'failed' | 'cancelled'
  publishAt: string
  assetType: string
}

type ModalState = {
  platform: string
  assetType: string
  contentSnapshot: Record<string, unknown>
} | null

// Add these state declarations after existing useState calls:
const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
const [modalState, setModalState] = useState<ModalState>(null)

// Add this effect to fetch scheduled posts:
const sessionId = assets[0]?.sessionId ?? null  // Get sessionId from first asset

const fetchScheduledPosts = useCallback(async () => {
  if (!sessionId) return
  const supabase = getSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return

  try {
    const response = await fetch(`/api/schedule?sessionId=${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) {
      const json = await response.json()
      setScheduledPosts((json.data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        platform: p.platform,
        status: p.status,
        publishAt: p.publish_at,
        assetType: p.asset_type,
      })))
    }
  } catch { /* silently ignore */ }
}, [sessionId])

useEffect(() => { fetchScheduledPosts() }, [fetchScheduledPosts])

// Helper to get scheduled post for a platform:
function getScheduledPost(platform: string): ScheduledPost | undefined {
  const platformKey = platform.toLowerCase().replace(' thread', '').replace(' ', '_')
  return scheduledPosts.find(p => p.platform === platformKey || p.platform === `social_${platformKey}`)
}

// Cancel handler:
const handleCancel = async (postId: string) => {
  const supabase = getSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return

  await fetch(`/api/schedule/${postId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  await fetchScheduledPosts()
}
```

In the slot button JSX, after the existing `<p>` elements inside each slot button, add a status badge based on `getScheduledPost(slot.platform)`:

```typescript
{/* Status badge — add inside the slot button, after the text paragraphs */}
{(() => {
  const sp = getScheduledPost(slot.platform)
  if (!sp) return (
    <button
      type="button"
      className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      onClick={(e) => {
        e.stopPropagation()
        setModalState({ platform: slot.platform.toLowerCase(), assetType: `social_${slot.platform.toLowerCase()}`, contentSnapshot: {} })
      }}
    >
      <Clock className="h-3 w-3" /> Schedule
    </button>
  )
  if (sp.status === 'queued') return (
    <div className="mt-2 flex items-center justify-between gap-1 text-xs text-amber-600">
      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(sp.publishAt).toLocaleString()}</span>
      <button type="button" onClick={(e) => { e.stopPropagation(); handleCancel(sp.id) }} className="text-xs text-muted-foreground underline">Cancel</button>
    </div>
  )
  if (sp.status === 'published') return (
    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
      <CheckCircle2 className="h-3 w-3" /> Published
    </div>
  )
  if (sp.status === 'failed') return (
    <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
      <XCircle className="h-3 w-3" /> Failed
    </div>
  )
  return null
})()}
```

After the closing `</Card>` in the return, add the modal:
```typescript
{modalState && sessionId && (
  <ScheduleModal
    platform={modalState.platform}
    sessionId={sessionId}
    assetType={modalState.assetType}
    contentSnapshot={modalState.contentSnapshot}
    onScheduled={(id, publishAt) => {
      setModalState(null)
      fetchScheduledPosts()
    }}
    onClose={() => setModalState(null)}
  />
)}
```

---

## Codebase Context

### Key Code Snippets

Existing `CalendarPanel.tsx` structure (summary — file already exists at `components/sections/CalendarPanel.tsx`):
```typescript
'use client'
import { useMemo, useState } from 'react'
// ... other imports
import { useSessionContext } from '@/lib/context/SessionContext'

export function CalendarPanel() {
  const router = useRouter()
  const { assets } = useSessionContext()
  const [copied, setCopied] = useState(false)
  const normalizedAssets = useMemo(() => assets.filter(...).map(...), [assets])
  const slots = useMemo<CalendarSlot[]>(() => { ... }, [normalizedAssets])
  // ...
  return (
    <Card>
      <CardHeader>...</CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-5">
          {slots.map((slot) => (
            <button key={slot.day} type="button" onClick={() => router.push(slot.route)} ...>
              {/* slot content */}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

`assets` from `useSessionContext()` — each asset has shape `{ id, sessionId, assetType, content: Record<string, unknown> }`.

`getSupabaseBrowserClient()` from `lib/supabase.ts` — singleton browser Supabase client.

### Key Patterns in Use
- `'use client'` directive on all interactive components
- `useState` + `useEffect` + `useCallback` from React
- Icons from `lucide-react`: `Clock`, `CheckCircle2`, `XCircle`
- Tailwind status colors: `text-amber-600` (queued), `text-green-600` (published), `text-destructive` (failed)

---

## Implementation Steps
1. Create `components/sections/ScheduleModal.tsx` — paste full code from Code Templates.
2. Open `components/sections/CalendarPanel.tsx` and apply the listed modifications:
   a. Add new imports at top.
   b. Add `ScheduledPost` type, `ModalState` type, `scheduledPosts` state, `modalState` state.
   c. Add `fetchScheduledPosts` callback and `useEffect`.
   d. Add `getScheduledPost` helper and `handleCancel` handler.
   e. Inside each slot button's JSX, add the status badge IIFE block.
   f. After closing `</Card>`, add the `ScheduleModal` conditional render.

---

## Test Cases

Manual test:
```
1. Open Calendar page with a session that has generated content
2. Should see "Schedule" link on each slot
3. Click "Schedule" on X Thread slot → ScheduleModal opens
4. Select datetime less than 5 minutes away → "Schedule" button stays disabled
5. Select datetime 10 minutes away → "Schedule" button enables
6. Click "Schedule" → modal closes, slot shows clock badge with datetime
7. Reload page → badge persists (data from API)
8. Click "Cancel" on queued slot → badge disappears
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `sessionId` not available from assets | Skip fetching scheduled posts; show "Schedule" link but `sessionId` will be empty (POST /api/schedule will return 400 — handled by modal error state) |
| Multiple scheduled posts for same platform | Show the most recently created one |
| Modal's `onClose` called | Set `modalState` to null — modal unmounts |

---

## Acceptance Criteria
- [ ] WHEN CalendarPanel loads with a valid session, THEN scheduled posts are fetched from API
- [ ] WHEN slot has no scheduled post, THEN "Schedule" clock link is shown
- [ ] WHEN user clicks "Schedule", THEN ScheduleModal opens for that platform
- [ ] WHEN datetime < 5 min from now selected, THEN "Schedule" button is disabled
- [ ] WHEN scheduling succeeds, THEN modal closes and badge appears on slot
- [ ] WHEN slot is queued, THEN clock badge with datetime and "Cancel" link shown
- [ ] WHEN user cancels a queued slot, THEN DELETE called and badge disappears
- [ ] WHEN slot is published, THEN green checkmark badge shown

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-013 builds GA4 analytics API
**Open questions:** _(fill via /task-handoff)_
