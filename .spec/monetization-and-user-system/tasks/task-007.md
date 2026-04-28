---
task: 007
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 2, 3, 6]
---

# Task 007: Auth Middleware — JWT Validation, Refresh, Multi-Device Sessions

## Skills
- .kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Implement Next.js Edge middleware that validates JWTs on all protected routes, injects country/IP context, applies Upstash rate limits per scope, and handles silent token refresh. Add session management endpoints for listing and revoking per-device sessions.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `middleware.ts` | Edge middleware: JWT validation, rate limiting, context injection |
| `lib/auth/session.ts` | getSession, revokeSession, revokeAllSessions helpers |
| `app/api/auth/sessions/route.ts` | GET list all active sessions |
| `app/api/auth/sessions/[id]/route.ts` | DELETE revoke specific session |
| `app/api/auth/logout/route.ts` | POST logout current device |
| `app/api/auth/logout-all/route.ts` | POST logout all devices |

### Modify
_(none)_

---

## Dependencies
```bash
npm install @upstash/ratelimit @upstash/redis

# ENV vars:
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## API Contracts
```
GET  /api/auth/sessions
  → 200 { sessions: [{ id, device_type, ip, country, last_active_at }] }

DELETE /api/auth/sessions/:id
  → 204 (revoked)
  → 404 (not found or not owned by user)

POST /api/auth/logout
  → 200 { ok: true }

POST /api/auth/logout-all
  → 200 { ok: true }
```

---

## Code Templates

### `middleware.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const config = {
  matcher: ['/api/((?!auth/magic-link/callback|webhooks|email/validate).*)'],
};

const redis = Redis.fromEnv();

const authLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'auth:ip',
});

const genLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'gen:user',
});

const webhookLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'webhook:ip',
});

export async function middleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const pathname = req.nextUrl.pathname;

  // Rate limiting by route scope
  if (pathname.startsWith('/api/auth')) {
    const { success, reset } = await authLimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
      );
    }
  }

  if (pathname.startsWith('/api/webhooks')) {
    const { success } = await webhookLimit.limit(ip);
    if (!success) {
      // Alert but still process — alert via background job
      void fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/internal/alert`, {
        method: 'POST',
        body: JSON.stringify({ type: 'webhook_burst', ip }),
      }).catch(() => {});
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }
  }

  // Public routes
  const publicRoutes = ['/api/auth/signup', '/api/auth/magic-link', '/api/auth/verify-email', '/api/email/validate', '/api/pricing'];
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    const res = NextResponse.next();
    res.headers.set('x-client-ip', ip);
    res.headers.set('x-country', req.headers.get('cf-ipcountry') ?? 'XX');
    return res;
  }

  // JWT validation
  const token = req.cookies.get('__Secure-sb-access')?.value ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Validate via Supabase (Edge-compatible)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // Generation rate limit by user
  if (pathname.startsWith('/api/content')) {
    const { success, reset } = await genLimit.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
      );
    }
  }

  const res = NextResponse.next();
  res.headers.set('x-user-id', user.id);
  res.headers.set('x-client-ip', ip);
  res.headers.set('x-country', req.headers.get('cf-ipcountry') ?? 'XX');
  return res;
}
```

### `lib/auth/session.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getSession(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function revokeSession(sessionId: string) {
  // Supabase admin: sign out a specific session
  const { error } = await supabase.auth.admin.signOut(sessionId, 'others');
  return !error;
}

export async function revokeAllSessions(userId: string) {
  const { error } = await supabase.auth.admin.signOut(userId);
  return !error;
}
```

### `app/api/auth/sessions/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data } = await supabase
    .from('user_devices')
    .select('id, fingerprint_hash, user_agent, last_seen_ip, last_seen_at, created_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false });

  return NextResponse.json({ sessions: data ?? [] });
}
```

### `app/api/auth/sessions/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_devices')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

### `app/api/auth/logout/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const token = req.cookies.get('__Secure-sb-access')?.value;
  if (token) {
    await supabase.auth.admin.signOut(token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('__Secure-sb-access');
  res.cookies.delete('__Secure-sb-refresh');
  return res;
}
```

### `app/api/auth/logout-all/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  await supabase.auth.admin.signOut(userId, 'global');

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('__Secure-sb-access');
  res.cookies.delete('__Secure-sb-refresh');
  return res;
}
```

---

## Codebase Context

### Key Patterns in Use
- **Edge middleware:** JWT is validated at the Edge before the route handler runs — no auth logic inside route handlers.
- **HttpOnly cookies:** `__Secure-sb-access` and `__Secure-sb-refresh` set by Supabase client; middleware reads them.
- **Rate limit scopes:** `auth:ip`, `gen:user`, `webhook:ip` — each uses its own Upstash prefix.
- **x-user-id header:** middleware injects into request so route handlers access it via `req.headers.get('x-user-id')`.

---

## Handoff from Previous Task
**Files changed by task 6:** signup, verify-email, magic-link routes; auth helpers.
**Decisions made:** Upstash Redis for rate limits; Supabase JWT validation via `auth.getUser(token)`.
**Context for this task:** `user_devices` and `user_ip_log` tables exist (task 1).
**Open questions left:** none.

---

## Implementation Steps
1. `lib/auth/session.ts` — session helpers.
2. `middleware.ts` — Edge middleware (JWT + rate limits).
3. `app/api/auth/sessions/route.ts` — GET sessions.
4. `app/api/auth/sessions/[id]/route.ts` — DELETE session.
5. `app/api/auth/logout/route.ts` + `app/api/auth/logout-all/route.ts`.
6. `npx tsc --noEmit`
7. Run: `/verify`

_Requirements: 3, 4, 12, 18, 19, 21_

---

## Test Cases

### Middleware behavior
```
- Missing JWT on /api/credits/balance → 401
- Valid JWT on /api/credits/balance → x-user-id header injected
- 11th request/min to /api/auth/* from same IP → 429 with Retry-After
- 31st gen request/min for same user → 429 with Retry-After
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Missing or invalid JWT | Return 401, no info leaked |
| Token near expiry | Supabase client handles silent refresh client-side |
| Auth rate limit exceeded | 429 with `Retry-After` header |
| Webhook burst >100/min | 429 + background alert |
| Session DELETE for wrong user | 404 (not 403 — don't confirm existence) |

---

## Acceptance Criteria
- [ ] Missing JWT on protected route → `401`
- [ ] 11th auth request/min from IP → `429` with `Retry-After`
- [ ] 31st generation request/min for user → `429` with `Retry-After`
- [ ] DELETE /api/auth/sessions/:id revokes device record
- [ ] POST /api/auth/logout-all clears cookies
- [ ] `x-user-id` header present in route handlers after valid auth
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** _(fill via /task-handoff)_
**Open questions:** _(fill via /task-handoff)_

Status: COMPLETE
Completed: 2026-04-28T00:00:00Z
