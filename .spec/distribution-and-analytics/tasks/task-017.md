---
task: "017"
feature: distribution-and-analytics
status: COMPLETE
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["002", "015", "016"]
---

# Task 017: Refresh Trigger Banner + Regenerate Flow

## Skills
- .kit/skills/development/build-website-web-app/SKILL.md
- .kit/skills/marketing-growth/content-strategy/SKILL.md

## Agents
- @web-frontend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `app/api/analytics/refresh-triggers/route.ts` (GET list + PATCH resolve), `app/api/analytics/refresh-triggers/[id]/route.ts` (PATCH per trigger), `components/sections/RefreshTriggerBanner.tsx` (banner with Regenerate + Dismiss), and wire it into `app/dashboard/analytics/page.tsx`.

---

## Files
### Create
| File | Purpose |
|---|---|
| `app/api/analytics/refresh-triggers/route.ts` | GET pending triggers for auth user |
| `app/api/analytics/refresh-triggers/[id]/route.ts` | PATCH resolve a trigger |
| `components/sections/RefreshTriggerBanner.tsx` | Banner: shows pending triggers with Regenerate + Dismiss |

### Modify
| File | What to change |
|---|---|
| `app/dashboard/analytics/page.tsx` | Add `<RefreshTriggerBanner />` above `<AnalyticsDashboard />` |

---

## Dependencies
```bash
# No new packages.
# No new env vars.
```

---

## API Contracts

### GET /api/analytics/refresh-triggers
**Headers:** `Authorization: Bearer <jwt>`
**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "query": "ai seo tool", "oldRank": 3, "newRank": 12, "sessionId": "uuid-or-null", "status": "pending", "createdAt": "..." }
  ]
}
```

### PATCH /api/analytics/refresh-triggers/:id
**Request:** `{ "status": "resolved" }`
**Response 200:** `{ "data": { "id": "uuid", "status": "resolved" } }`
**Response 404:** `{ "error": { "code": "not_found" } }`

---

## Code Templates

### `app/api/analytics/refresh-triggers/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  const { user, supabase } = auth

  const { data, error } = await supabase
    .from('refresh_triggers')
    .select('id, query, old_rank, new_rank, session_id, status, created_at')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to fetch refresh triggers' } },
      { status: 500 }
    )
  }

  const triggers = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    query: row.query,
    oldRank: row.old_rank,
    newRank: row.new_rank,
    sessionId: row.session_id,
    status: row.status,
    createdAt: row.created_at,
  }))

  return NextResponse.json({ data: triggers }, { status: 200 })
}
```

### `app/api/analytics/refresh-triggers/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  const { user, supabase } = auth

  const { id } = params

  let body: { status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'invalid_json', message: 'Invalid JSON' } }, { status: 400 })
  }

  if (body.status !== 'resolved') {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'Only status "resolved" is accepted' } },
      { status: 400 }
    )
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('refresh_triggers')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: { code: 'not_found', message: 'Refresh trigger not found' } },
      { status: 404 }
    )
  }

  if ((existing as Record<string, unknown>).user_id !== user.id) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Not authorized' } },
      { status: 403 }
    )
  }

  const { error: updateError } = await supabase
    .from('refresh_triggers')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to update trigger' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { id, status: 'resolved' } }, { status: 200 })
}
```

### `components/sections/RefreshTriggerBanner.tsx`

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, RefreshCw, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface RefreshTrigger {
  id: string
  query: string
  oldRank: number
  newRank: number
  sessionId: string | null
  status: 'pending' | 'resolved'
}

async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function resolveTrigger(id: string, token: string): Promise<void> {
  const response = await fetch(`/api/analytics/refresh-triggers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'resolved' }),
  })
  if (!response.ok) throw new Error(`Failed to resolve trigger: ${response.status}`)
}

async function triggerRegenerate(sessionId: string, token: string): Promise<void> {
  // Calls the existing /api/flywheel or /api/improve endpoint with the session
  // Use /api/flywheel if available, otherwise a no-op for now
  await fetch('/api/flywheel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId, action: 'refresh' }),
  })
}

export function RefreshTriggerBanner() {
  const [triggers, setTriggers] = useState<RefreshTrigger[]>([])
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const fetchTriggers = useCallback(async () => {
    const token = await getAuthToken()
    if (!token) return

    try {
      const response = await fetch('/api/analytics/refresh-triggers', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const json = await response.json()
        setTriggers(json.data ?? [])
      }
    } catch { /* silently ignore */ }
  }, [])

  useEffect(() => { fetchTriggers() }, [fetchTriggers])

  if (triggers.length === 0) return null

  const handleRegenerate = async (trigger: RefreshTrigger) => {
    setLoadingIds(prev => new Set(prev).add(trigger.id))
    const token = await getAuthToken()
    if (!token) { setLoadingIds(prev => { const s = new Set(prev); s.delete(trigger.id); return s }); return }

    try {
      if (trigger.sessionId) {
        await triggerRegenerate(trigger.sessionId, token)
      }
      await resolveTrigger(trigger.id, token)
      setTriggers(prev => prev.filter(t => t.id !== trigger.id))
    } catch {
      // Remove from loading even on error
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(trigger.id); return s })
    }
  }

  const handleDismiss = async (trigger: RefreshTrigger) => {
    setLoadingIds(prev => new Set(prev).add(trigger.id))
    const token = await getAuthToken()
    if (!token) { setLoadingIds(prev => { const s = new Set(prev); s.delete(trigger.id); return s }); return }

    try {
      await resolveTrigger(trigger.id, token)
      setTriggers(prev => prev.filter(t => t.id !== trigger.id))
    } catch {
      // ignore
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(trigger.id); return s })
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Content needs refresh</p>
          <p className="mt-0.5 text-xs text-amber-700">
            {triggers.length} {triggers.length === 1 ? 'query has' : 'queries have'} dropped in ranking.
          </p>
          <div className="mt-3 space-y-2">
            {triggers.map((trigger) => {
              const isLoading = loadingIds.has(trigger.id)
              return (
                <div key={trigger.id} className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-white px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">&quot;{trigger.query}&quot;</p>
                    <p className="text-xs text-amber-700">
                      was <span className="font-semibold">#{Math.round(trigger.oldRank)}</span>{' '}
                      now <span className="font-semibold text-red-600">#{Math.round(trigger.newRank)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => handleRegenerate(trigger)}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <><RefreshCw className="mr-1 h-3 w-3" /> Regenerate</>
                      )}
                    </Button>
                    <button
                      type="button"
                      className="text-amber-500 hover:text-amber-800"
                      disabled={isLoading}
                      onClick={() => handleDismiss(trigger)}
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Updated `app/dashboard/analytics/page.tsx`

```typescript
import { AnalyticsDashboard } from '@/components/sections/AnalyticsDashboard'
import { RefreshTriggerBanner } from '@/components/sections/RefreshTriggerBanner'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live data from Google Analytics 4 and Search Console.
        </p>
      </div>

      <RefreshTriggerBanner />

      <AnalyticsDashboard />
    </div>
  )
}
```

---

## Codebase Context

### Key Code Snippets

`refresh_triggers` table columns (from task-002 migration):
```
id, user_id, session_id (nullable), query, old_rank, new_rank, trigger_reason, status ('pending'|'resolved'), resolved_at, created_at
```

Existing flywheel route: `app/api/flywheel/` exists — check if it accepts `{ sessionId, action }`. If not, the `triggerRegenerate` function will fail silently and the trigger will still be resolved. This is acceptable behavior (dismiss + regenerate decoupled).

`requireAuth` pattern, `getSupabaseBrowserClient` pattern — same as all previous tasks.

### Key Patterns in Use
- Banner renders nothing (`return null`) when `triggers.length === 0`
- Loading state per trigger (Set of IDs) — not a single boolean
- Dismiss and Regenerate both resolve the trigger — difference is whether `/api/flywheel` is called first
- `'use client'` required for the banner component
- `app/dashboard/analytics/page.tsx` is a Server Component — import banner as a client component

---

## Implementation Steps
1. Create `app/api/analytics/refresh-triggers/route.ts` from Code Templates (GET handler).
2. Create `app/api/analytics/refresh-triggers/[id]/route.ts` from Code Templates (PATCH handler).
3. Create `components/sections/RefreshTriggerBanner.tsx` from Code Templates.
4. Modify `app/dashboard/analytics/page.tsx` — add `<RefreshTriggerBanner />` import and JSX above `<AnalyticsDashboard />`.

---

## Test Cases

Manual browser test:
```
1. Insert a refresh_triggers row manually in Supabase for your user with status='pending'
2. Navigate to /dashboard/analytics
3. Should see amber banner with the query, old rank, and new rank
4. Click "Regenerate" — spinner appears; on completion row disappears from banner
5. Refresh page — trigger no longer shows (status='resolved')
6. Click X (dismiss) on a different trigger — same result without regeneration
7. When no pending triggers: banner not visible
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `/api/flywheel` not implemented | `triggerRegenerate` call fails silently; trigger still resolved via `resolveTrigger` |
| Multiple triggers for same query | All shown independently |
| `sessionId` is null | Skip `triggerRegenerate` call; still resolve the trigger |
| Dismiss clicked | Calls `resolveTrigger` only (no regeneration) |

---

## Acceptance Criteria
- [ ] WHEN pending triggers exist, THEN amber banner shown above analytics grid with count
- [ ] WHEN no pending triggers, THEN banner not rendered
- [ ] WHEN user clicks Regenerate, THEN button shows spinner, trigger resolved, row removed from banner
- [ ] WHEN user clicks Dismiss (X), THEN trigger resolved without calling flywheel, row removed
- [ ] WHEN GET /api/analytics/refresh-triggers returns 0 rows, THEN banner hidden
- [ ] WHEN PATCH /api/analytics/refresh-triggers/:id with status='resolved', THEN trigger updated and 200 returned

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-018 writes unit tests for publish libs and analytics caching
**Open questions:** _(fill via /task-handoff)_
