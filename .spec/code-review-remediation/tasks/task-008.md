---
task: 008
feature: code-review-remediation
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: []
---

# Task 008: Create `GET /api/sessions` to eliminate dashboard N+1 queries

## Skills
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/rules/common/security.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/development/verify.md

> Load the skills, agents, and commands listed above before reading anything else using their exact `.kit/` paths. Do not load any context not declared here. Do not load CLAUDE.md. Follow paths exactly — no shortcuts, no variable substitution, no @-imports.

---

## Objective

Create `app/api/sessions/route.ts` that returns a user's sessions with assets in one Supabase query, and update the dashboard to use it instead of direct browser Supabase calls.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/api/sessions/route.ts` | `GET /api/sessions` endpoint |
| `app/api/sessions/route.test.ts` | Route tests |

### Modify
| File | What to change |
|------|---------------|
| `lib/context/SessionContext.tsx` | Replace `supabase.from("sessions")` calls with `fetch('/api/sessions')` |

---

## Dependencies
```bash
# No new packages — uses existing @supabase/supabase-js and next/server
```

## API Contracts
```
GET /api/sessions
Headers: Authorization: Bearer <token>
Query params: id? (string) — optional session UUID filter

Response 200:
{
  sessions: Array<{
    id: string
    created_at: string
    input_type: string
    input_data: unknown
    assets: ContentAsset[]
  }>
}

Response 401: { error: { code: 'unauthorized', message: 'Authentication required' } }
Response 500: { error: { code: 'internal', message: string } }
```

---

## Code Templates

### `app/api/sessions/route.ts` (create this file exactly)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mapAssetRowToContentAsset, SESSION_ID_UUID_REGEX } from '@/lib/session-assets'

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await requireAuth(request)
  } catch {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 },
    )
  }

  const { user, supabase } = auth
  const { searchParams } = new URL(request.url)
  const idParam = searchParams.get('id')

  try {
    let query = supabase
      .from('sessions')
      .select(`
        id,
        created_at,
        input_type,
        input_data,
        content_assets (
          id,
          session_id,
          asset_type,
          content,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (idParam !== null) {
      if (!SESSION_ID_UUID_REGEX.test(idParam)) {
        return NextResponse.json(
          { error: { code: 'invalid_session_id', message: 'id must be a valid UUID' } },
          { status: 400 },
        )
      }
      query = query.eq('id', idParam)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: { code: 'internal', message: error.message } },
        { status: 500 },
      )
    }

    const sessions = (data ?? []).map((row) => ({
      id: row.id as string,
      created_at: row.created_at as string,
      input_type: row.input_type as string,
      input_data: row.input_data,
      assets: ((row.content_assets ?? []) as Parameters<typeof mapAssetRowToContentAsset>[0][]).map(
        mapAssetRowToContentAsset,
      ),
    }))

    return NextResponse.json({ sessions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: 'internal', message } },
      { status: 500 },
    )
  }
}
```

### `app/api/sessions/route.test.ts` (create this file exactly)
```typescript
const mockRequireAuth = jest.fn()

jest.mock('@/lib/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

jest.mock('@/lib/session-assets', () => ({
  SESSION_ID_UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  mapAssetRowToContentAsset: (row: Record<string, unknown>) => ({ ...row, mapped: true }),
}))

import { GET } from './route'

function makeRequest(params?: Record<string, string>): Request {
  const url = new URL('http://localhost/api/sessions')
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new Request(url.toString(), {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
  })
}

describe('GET /api/sessions', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when requireAuth throws', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('unauthorized'))
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('unauthorized')
  })

  it('returns 200 with sessions array for authenticated user', async () => {
    const mockData = [
      { id: 'abc', created_at: '2026-01-01', input_type: 'topic', input_data: {}, content_assets: [] },
    ]
    mockRequireAuth.mockResolvedValueOnce({
      user: { id: 'user-1' },
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      },
    })
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.sessions)).toBe(true)
    expect(body.sessions).toHaveLength(1)
  })

  it('returns 400 for invalid UUID id param', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: {} })
    const res = await GET(makeRequest({ id: 'not-a-uuid' }) as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('invalid_session_id')
  })
})
```

---

## Codebase Context

### Key Code Snippets
```typescript
// requireAuth in lib/auth.ts:39–41 (return shape)
export async function requireAuth(
  request: NextRequest,
): Promise<{ user: User; token: string; supabase: SupabaseClient }>
```

```typescript
// mapAssetRowToContentAsset in lib/session-assets.ts:47–60
export function mapAssetRowToContentAsset(row: ContentAssetRow): ContentAsset {
  return {
    id: row.id,
    // ... maps remaining fields
  }
}
```

```typescript
// Existing direct supabase.from("sessions") in lib/context/SessionContext.tsx:94
const { data, error } = await supabase
  .from("sessions")
  .select("id, created_at, input_type, input_data")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
```

### Key Patterns in Use
- **All routes call `requireAuth` at the top** before any DB access
- **Error shape:** `{ error: { code: string, message: string } }` with HTTP status
- **Supabase join syntax:** `select('id, content_assets(id, ...)')` for related table
- **`SESSION_ID_UUID_REGEX` already exported from task-005** — import from `@/lib/session-assets`

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes.

**Files changed by previous task:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for this task:** _(fill via /task-handoff)_
**Open questions left:** _(fill via /task-handoff)_

---

## Implementation Steps
1. `app/api/sessions/route.ts` — create file with exact content from Code Templates
2. `app/api/sessions/route.test.ts` — create test file with exact content above
3. Run: `npx jest app/api/sessions/route.test.ts` — must pass (3 tests)
4. Read `lib/context/SessionContext.tsx` — identify all `supabase.from("sessions")` calls
5. `lib/context/SessionContext.tsx` — replace direct supabase session queries with `fetch('/api/sessions', { headers: { authorization: \`Bearer \${token}\` } })` and parse `body.sessions`
6. Run: `npm run type-check` — zero errors
7. Run: `/verify`

_Requirements: 9.1, 9.2, 9.3_

---

## Test Cases

### File: `app/api/sessions/route.test.ts`
(Full file content given in Code Templates above.)

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| `content_assets` join column names differ from `ContentAssetRow` field names | Use the exact DB column names in `select()`; `mapAssetRowToContentAsset` handles the mapping |
| `SESSION_ID_UUID_REGEX` not yet exported (task-005 not yet run) | Add the regex locally for now: `const SESSION_ID_UUID_REGEX = /^[0-9a-f]{8}...$/i` — task-005 will deduplicate it |
| `SessionContext.tsx` uses `token` from Supabase session — confirm token field name | Read `SessionContext.tsx` first; the `session.access_token` is passed to `Authorization: Bearer` |

---

## Acceptance Criteria
- [ ] WHEN `GET /api/sessions` is called with a valid Bearer token THEN it returns `{ sessions: [...] }` with status 200
- [ ] WHEN `GET /api/sessions` is called without auth THEN it returns status 401
- [ ] WHEN `npx jest app/api/sessions/route.test.ts` is run THEN all 3 tests pass
- [ ] WHEN `npm run type-check` is run THEN it reports zero errors
- [ ] All existing tests pass

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_

Status: COMPLETE
Completed: 2026-04-25T00:00:00Z
