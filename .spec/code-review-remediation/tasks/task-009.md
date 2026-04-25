---
task: 009
feature: code-review-remediation
status: pending
model: sonnet
supervisor: software-cto
agent: web-backend-expert
depends_on: [008]
---

# Task 009: Create `GET /api/pipeline/state` to move pipeline state server-side (P0)

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

Create `app/api/pipeline/state/route.ts` that reads `content_assets` for a session and returns the step status map, then update `app/dashboard/data-driven/page.tsx` to initialize pipeline state from this endpoint on mount instead of computing it from `useSessionContext` assets.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `app/api/pipeline/state/route.ts` | `GET /api/pipeline/state?sessionId=` endpoint |
| `app/api/pipeline/state/route.test.ts` | Route tests |

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/data-driven/page.tsx` | Initialize step state from `GET /api/pipeline/state` on mount; remove direct Supabase dependency from state init |

---

## Dependencies
```bash
# No new packages
# Requires: SESSION_ID_UUID_REGEX exported from lib/session-assets.ts (task-005)
# Requires: GET /api/sessions exists (task-008)
```

## API Contracts
```
GET /api/pipeline/state?sessionId={uuid}
Headers: Authorization: Bearer <token>

Response 200:
{
  sessionId: string,
  steps: {
    assess?: { status: 'pending' | 'complete', assetId?: string },
    research?: { status: 'pending' | 'complete', assetId?: string },
    article?: { status: 'pending' | 'complete', assetId?: string },
    seoGeo?: { status: 'pending' | 'complete', assetId?: string },
    distribution?: { status: 'pending' | 'complete', assetId?: string }
  }
}

Response 400: { error: { code: 'missing_session_id' | 'invalid_session_id', message: string } }
Response 401: { error: { code: 'unauthorized', message: string } }
Response 404: { error: { code: 'session_not_found', message: string } }
```

---

## Code Templates

### `app/api/pipeline/state/route.ts` (create this file exactly)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { SESSION_ID_UUID_REGEX } from '@/lib/session-assets'

const ASSET_TYPE_TO_STEP: Record<string, string> = {
  dd_assess: 'assess',
  dd_research: 'research',
  dd_article: 'article',
  dd_seo_geo: 'seoGeo',
  dd_multi_format: 'distribution',
}

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
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'missing_session_id', message: 'sessionId query parameter is required' } },
      { status: 400 },
    )
  }

  if (!SESSION_ID_UUID_REGEX.test(sessionId)) {
    return NextResponse.json(
      { error: { code: 'invalid_session_id', message: 'sessionId must be a valid UUID' } },
      { status: 400 },
    )
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (sessionError) {
    return NextResponse.json(
      { error: { code: 'internal', message: sessionError.message } },
      { status: 500 },
    )
  }

  if (!session) {
    return NextResponse.json(
      { error: { code: 'session_not_found', message: 'Session not found' } },
      { status: 404 },
    )
  }

  const { data: assets, error: assetsError } = await supabase
    .from('content_assets')
    .select('id, asset_type')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (assetsError) {
    return NextResponse.json(
      { error: { code: 'internal', message: assetsError.message } },
      { status: 500 },
    )
  }

  const steps: Record<string, { status: 'complete'; assetId: string }> = {}

  for (const asset of assets ?? []) {
    const stepKey = ASSET_TYPE_TO_STEP[asset.asset_type as string]
    if (stepKey) {
      steps[stepKey] = { status: 'complete', assetId: asset.id as string }
    }
  }

  return NextResponse.json({ sessionId, steps })
}
```

### `app/api/pipeline/state/route.test.ts` (create this file exactly)
```typescript
const mockRequireAuth = jest.fn()

jest.mock('@/lib/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

jest.mock('@/lib/session-assets', () => ({
  SESSION_ID_UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
}))

import { GET } from './route'

const VALID_UUID = '12345678-1234-1234-1234-123456789abc'

function makeRequest(params?: Record<string, string>): Request {
  const url = new URL('http://localhost/api/pipeline/state')
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new Request(url.toString(), {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
  })
}

describe('GET /api/pipeline/state', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when requireAuth throws', async () => {
    mockRequireAuth.mockRejectedValueOnce(new Error('unauthorized'))
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(401)
  })

  it('returns 400 when sessionId is missing', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'u1' }, supabase: {} })
    const res = await GET(makeRequest() as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('missing_session_id')
  })

  it('returns 400 for invalid UUID', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'u1' }, supabase: {} })
    const res = await GET(makeRequest({ sessionId: 'not-a-uuid' }) as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('invalid_session_id')
  })

  it('returns 404 when session not found', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'u1' }, supabase: mockSupabase })
    const res = await GET(makeRequest({ sessionId: VALID_UUID }) as never)
    expect(res.status).toBe(404)
  })

  it('returns 200 with step map when session has assets', async () => {
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'sessions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: VALID_UUID }, error: null }),
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({
                data: [{ id: 'asset-1', asset_type: 'dd_assess' }],
                error: null,
              }),
            }),
          }),
        }
      },
    }
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'u1' }, supabase: mockSupabase })
    const res = await GET(makeRequest({ sessionId: VALID_UUID }) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.steps.assess).toEqual({ status: 'complete', assetId: 'asset-1' })
  })
})
```

### `app/dashboard/data-driven/page.tsx` — pipeline state init change
**In the `useEffect` that calls `buildRestoredPipelineState`, add a fetch call to seed from server:**

The useEffect block starting at line ~219 currently reads:
```typescript
useEffect(() => {
    if (!isValidSession || !dataInput) {
        setStepState(createEmptyStepStateMap());
        setStepKeys([]);
        setIsReady(false);
        setIncludeResearch(false);
        return;
    }

    const restored = buildRestoredPipelineState({
        mode,
        assets,
    });
    // ... sets state from restored
}, [assets, dataInput, isValidSession, mode]);
```

Add a `useEffect` that runs on mount (when `sessionId` becomes available) to fetch from `/api/pipeline/state` and pre-populate steps that are already complete:
```typescript
useEffect(() => {
    if (!sessionId || !token) return;

    void fetch(`/api/pipeline/state?sessionId=${sessionId}`, {
        headers: { authorization: `Bearer ${token}` },
    })
        .then((res) => res.json())
        .then((body: { steps?: Record<string, { status: string; assetId: string }> }) => {
            if (!body.steps) return;
            setStepState((current) => {
                const updated = { ...current };
                for (const [key, val] of Object.entries(body.steps ?? {})) {
                    if (val.status === 'complete') {
                        updated[key as StepKey] = {
                            ...current[key as StepKey],
                            status: 'complete',
                        } as never;
                    }
                }
                return updated;
            });
        })
        .catch(() => { /* ignore — fall back to client-derived state */ });
}, [sessionId, token]);
```

Note: `token` is available from the Supabase session in `useSessionContext`. If it is not currently exposed, add it to the context or read it from `supabase.auth.getSession()` inside the effect.

---

## Codebase Context

### Key Code Snippets
```typescript
// StepKey type usage in page.tsx — set of valid step names
type StepKey = 'assess' | 'research' | 'article' | 'seoGeo' | 'distribution'
```

```typescript
// buildRestoredPipelineState called at page.tsx:229
const restored = buildRestoredPipelineState({ mode, assets })
```

```typescript
// requireAuth return shape — lib/auth.ts:39
async function requireAuth(request: NextRequest): Promise<{ user: User; token: string; supabase: SupabaseClient }>
```

```typescript
// Supabase content_assets table query pattern — lib/session-assets.ts:88
const { data, error } = await supabase
  .from('content_assets')
  .select('id, session_id, asset_type, content, created_at, updated_at')
  .eq('session_id', sessionId)
```

### Key Patterns in Use
- **asset_type values for data-driven steps:** `dd_assess`, `dd_research`, `dd_article`, `dd_seo_geo`, `dd_multi_format` — grep `content_assets` inserts to confirm exact strings
- **Step status on error:** Server only returns `'complete'` steps — missing steps are `'pending'` by default
- **Page hydrates from both client and server:** The client-side `buildRestoredPipelineState` still runs; the server fetch supplements it for cross-session persistence

---

## Handoff from Previous Task
> Populated by /task-handoff after task-008 completes.

**Files changed by previous task:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for this task:** _(fill via /task-handoff)_
**Open questions left:** _(fill via /task-handoff)_

---

## Implementation Steps
1. `app/api/pipeline/state/route.ts` — create file with exact content from Code Templates
2. `app/api/pipeline/state/route.test.ts` — create test file with exact content above
3. Run: `npx jest app/api/pipeline/state/route.test.ts` — must pass (5 tests)
4. Verify `asset_type` values — run `grep -rn "asset_type.*dd_" app/api/` to confirm exact strings used in DB inserts
5. `app/dashboard/data-driven/page.tsx` — add the `useEffect` with `fetch('/api/pipeline/state')` as shown in Code Templates
6. Run: `npm run type-check` — zero errors
7. Run: `/verify`

_Requirements: 1.1, 1.2, 1.3, 1.4_

---

## Test Cases

### File: `app/api/pipeline/state/route.test.ts`
(Full file content given in Code Templates above — 5 tests.)

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| `asset_type` values differ from `ASSET_TYPE_TO_STEP` map | Grep `app/api/data-driven/*/route.ts` for `.insert.*asset_type` to get exact values; update `ASSET_TYPE_TO_STEP` accordingly |
| `token` not available in `useSessionContext` | Read `lib/context/SessionContext.tsx`; if `session.access_token` is available, pass it; if not, call `supabase.auth.getSession()` inside the effect |
| `fetch` inside `useEffect` causes SSR issues | Wrap in `typeof window !== 'undefined'` guard — this is a browser-only call |

---

## Acceptance Criteria
- [ ] WHEN `GET /api/pipeline/state?sessionId={uuid}` is called with valid auth THEN it returns `{ sessionId, steps }` with status 200
- [ ] WHEN `GET /api/pipeline/state` is called without `sessionId` THEN it returns status 400
- [ ] WHEN `npx jest app/api/pipeline/state/route.test.ts` is run THEN all 5 tests pass
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
