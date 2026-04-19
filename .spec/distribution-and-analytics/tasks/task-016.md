---
task: "016"
feature: distribution-and-analytics
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: ["002", "014"]
---

# Task 016: Ranking Drop Detection + Refresh Triggers

## Skills
- .kit/skills/integrations/google-analytics-automation/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `lib/analytics/delta.ts` (compare two Search Console snapshots to detect >5 position drops) and `app/api/cron/analytics-delta/route.ts` (cron handler that runs delta detection for all users and inserts `refresh_triggers` rows with duplicate guard).

---

## Files
### Create
| File | Purpose |
|---|---|
| `lib/analytics/delta.ts` | Ranking drop detection + refresh_triggers insert with duplicate guard |
| `app/api/cron/analytics-delta/route.ts` | Cron handler: loop all users, detect drops, insert triggers |

### Modify
| File | What to change |
|---|---|
| — | None |

---

## Dependencies
```bash
# No new packages.

# Env vars:
CRON_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## API Contracts

### POST /api/cron/analytics-delta
**Headers:** `Authorization: Bearer {CRON_SECRET}`
**Response 200:** `{ "data": { "usersProcessed": 3, "triggersCreated": 2 } }`
**Response 401:** `{ "error": { "code": "unauthorized", "message": "Invalid cron secret" } }`

---

## Code Templates

### `lib/analytics/delta.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

const RANKING_DROP_THRESHOLD = 5 // positions worsened by more than this triggers a refresh

export interface RankingDrop {
  query: string
  oldRank: number
  newRank: number
}

interface SnapshotRow {
  data: {
    topQueries?: Array<{ query: string; position: number; clicks: number; impressions: number }>
    cachedAt?: string
  }
  fetched_at: string
}

export function detectRankingDrops(
  oldSnapshot: SnapshotRow,
  newSnapshot: SnapshotRow,
): RankingDrop[] {
  const oldQueries = oldSnapshot.data.topQueries ?? []
  const newQueries = newSnapshot.data.topQueries ?? []

  const oldPositionMap = new Map<string, number>()
  for (const q of oldQueries) {
    oldPositionMap.set(q.query, q.position)
  }

  const drops: RankingDrop[] = []
  for (const q of newQueries) {
    const oldPos = oldPositionMap.get(q.query)
    if (oldPos !== undefined && q.position - oldPos > RANKING_DROP_THRESHOLD) {
      drops.push({ query: q.query, oldRank: oldPos, newRank: q.position })
    }
  }

  return drops
}

export async function insertRefreshTrigger(
  supabase: SupabaseClient,
  params: {
    userId: string
    sessionId: string | null
    query: string
    oldRank: number
    newRank: number
  },
): Promise<boolean> {
  const { error } = await supabase.from('refresh_triggers').insert({
    user_id: params.userId,
    session_id: params.sessionId,
    query: params.query,
    old_rank: params.oldRank,
    new_rank: params.newRank,
    trigger_reason: 'ranking_drop',
    status: 'pending',
  })

  if (error) {
    // Unique partial index violation = duplicate pending trigger — skip silently
    if (error.code === '23505') {
      return false // not inserted (duplicate)
    }
    throw new Error(`Failed to insert refresh trigger: ${error.message}`)
  }

  return true // inserted
}

export async function runDeltaForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  // Get the two most recent search_console snapshots for this user
  const { data: snapshots, error } = await supabase
    .from('analytics_snapshots')
    .select('data, fetched_at')
    .eq('user_id', userId)
    .eq('source', 'search_console')
    .order('fetched_at', { ascending: false })
    .limit(2)

  if (error || !snapshots || snapshots.length < 2) {
    return 0 // Need at least 2 snapshots to compare
  }

  const [newSnapshot, oldSnapshot] = snapshots as SnapshotRow[]
  const drops = detectRankingDrops(oldSnapshot, newSnapshot)

  let triggersCreated = 0
  for (const drop of drops) {
    const inserted = await insertRefreshTrigger(supabase, {
      userId,
      sessionId: null, // session linking is optional; can be enhanced later
      query: drop.query,
      oldRank: drop.oldRank,
      newRank: drop.newRank,
    })
    if (inserted) triggersCreated++
  }

  return triggersCreated
}
```

### `app/api/cron/analytics-delta/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runDeltaForUser } from '@/lib/analytics/delta'

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Invalid cron secret' } },
      { status: 401 }
    )
  }

  const supabase = getServiceRoleClient()

  // Get all distinct user_ids that have search_console snapshots
  const { data: userRows, error: fetchError } = await supabase
    .from('analytics_snapshots')
    .select('user_id')
    .eq('source', 'search_console')

  if (fetchError) {
    console.error('analytics-delta: failed to fetch user ids', { error: fetchError.message })
    return NextResponse.json(
      { error: { code: 'storage_error', message: 'Failed to fetch user IDs' } },
      { status: 500 }
    )
  }

  if (!userRows || userRows.length === 0) {
    return NextResponse.json({ data: { usersProcessed: 0, triggersCreated: 0 } }, { status: 200 })
  }

  // Deduplicate user IDs
  const uniqueUserIds = [...new Set((userRows as Array<{ user_id: string }>).map(r => r.user_id))]

  let usersProcessed = 0
  let triggersCreated = 0

  for (const userId of uniqueUserIds) {
    try {
      const count = await runDeltaForUser(supabase, userId)
      triggersCreated += count
      usersProcessed++
    } catch (err) {
      console.error('analytics-delta: error for user', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      })
      // Continue with next user
    }
  }

  return NextResponse.json({ data: { usersProcessed, triggersCreated } }, { status: 200 })
}
```

---

## Codebase Context

### Key Code Snippets

`analytics_snapshots` table (from migration task-002):
```sql
id, user_id, source TEXT ('ga4'|'search_console'), data JSONB, fetched_at TIMESTAMPTZ
```

`refresh_triggers` table (from migration task-002):
```sql
id, user_id, session_id (nullable FK), query, old_rank, new_rank, trigger_reason, status ('pending'|'resolved'), resolved_at, created_at
UNIQUE INDEX: (session_id, query) WHERE status = 'pending'
```

Unique partial index error code: `23505` (Postgres unique violation).

`runDeltaForUser` fetches 2 most recent snapshots: `[0]` = newest, `[1]` = older.
Ranking worsened = `newPosition > oldPosition` (higher position number = worse rank).

Service role client pattern (same as task-011):
```typescript
createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
```

### Key Patterns in Use
- Delta = `newRank - oldRank > 5` (position number increased by more than 5)
- Duplicate guard: catch error code `23505` and return `false` — do NOT re-throw
- Loop all users independently; failure of one doesn't stop others
- `CRON_SECRET` auth check matches task-011 pattern exactly

---

## Implementation Steps
1. Create `lib/analytics/delta.ts` — paste full code from Code Templates.
2. Create `app/api/cron/analytics-delta/route.ts` — paste full code from Code Templates.

---

## Test Cases

```typescript
// lib/analytics/__tests__/delta.test.ts
import { detectRankingDrops, insertRefreshTrigger } from '../delta'

describe('detectRankingDrops', () => {
  const makeSnapshot = (queries: Array<{ query: string; position: number }>) => ({
    data: { topQueries: queries.map(q => ({ ...q, clicks: 10, impressions: 100 })) },
    fetched_at: new Date().toISOString(),
  })

  it('detects drop > 5 positions', () => {
    const old = makeSnapshot([{ query: 'ai tool', position: 3 }])
    const newer = makeSnapshot([{ query: 'ai tool', position: 9 }])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(1)
    expect(drops[0].query).toBe('ai tool')
    expect(drops[0].oldRank).toBe(3)
    expect(drops[0].newRank).toBe(9)
  })

  it('does not detect drop <= 5 positions', () => {
    const old = makeSnapshot([{ query: 'seo guide', position: 4 }])
    const newer = makeSnapshot([{ query: 'seo guide', position: 8 }])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(0)
  })

  it('does not detect improvement', () => {
    const old = makeSnapshot([{ query: 'content tool', position: 10 }])
    const newer = makeSnapshot([{ query: 'content tool', position: 2 }])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(0)
  })

  it('ignores queries not in old snapshot', () => {
    const old = makeSnapshot([])
    const newer = makeSnapshot([{ query: 'new query', position: 15 }])
    const drops = detectRankingDrops(old, newer)
    expect(drops).toHaveLength(0)
  })
})

describe('insertRefreshTrigger', () => {
  it('returns false on unique constraint violation (code 23505)', async () => {
    const supabase = {
      from: () => ({ insert: () => Promise.resolve({ error: { code: '23505', message: 'unique violation' } }) }),
    } as any
    const result = await insertRefreshTrigger(supabase, {
      userId: 'u1', sessionId: null, query: 'test', oldRank: 3, newRank: 12,
    })
    expect(result).toBe(false)
  })

  it('returns true on successful insert', async () => {
    const supabase = {
      from: () => ({ insert: () => Promise.resolve({ error: null }) }),
    } as any
    const result = await insertRefreshTrigger(supabase, {
      userId: 'u1', sessionId: null, query: 'test', oldRank: 3, newRank: 12,
    })
    expect(result).toBe(true)
  })
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| User has only 1 snapshot | `runDeltaForUser` returns 0 — need 2 to compare |
| Duplicate pending trigger | Catch error code `23505`, return `false` — no re-throw |
| `newRank - oldRank` exactly equals 5 | NOT a drop — threshold is strictly `> 5` |
| `session_id` in trigger | Set to `null` for now — future enhancement can link to session via content indexing |

---

## Acceptance Criteria
- [ ] WHEN two snapshots exist and a query dropped by 6 positions, THEN `refresh_triggers` row inserted
- [ ] WHEN query dropped by exactly 5 positions, THEN NO trigger inserted
- [ ] WHEN trigger already pending for same query (23505 error), THEN function returns false without throwing
- [ ] WHEN only 1 snapshot exists for a user, THEN 0 triggers created for that user
- [ ] WHEN cron called without CRON_SECRET, THEN returns 401
- [ ] WHEN no users have search_console snapshots, THEN returns `{ usersProcessed: 0, triggersCreated: 0 }`

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-017 builds the RefreshTriggerBanner UI and PATCH endpoint for resolving triggers
**Open questions:** _(fill via /task-handoff)_
