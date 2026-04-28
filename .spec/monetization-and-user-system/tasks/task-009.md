---
task: 009
feature: monetization-and-user-system
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [1, 2, 3, 7, 8]
---

# Task 009: Content Engine Integration — Atomic Credit Deduction

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/core/karpathy-principles/SKILL.md

## Agents
- .kit/agents/software-company/engineering/web-backend-expert.md

## Commands
- .kit/commands/core/task-handoff.md
- .kit/commands/development/verify.md

> Load the skills and agents listed above before reading anything else.

---

## Objective
Wire credit deduction atomically into the content generation flow: deduct before calling Anthropic, refund on AI failure, log everything. Never trust client-supplied credit costs. Support async long-running jobs with `202 + job_id` pattern.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `lib/config/credit-costs.ts` | Server-side action→credit-cost map |
| `lib/credits/generate.ts` | Atomic generate-with-deduction wrapper |
| `app/api/content/generate/route.ts` | Generation endpoint (deduct → generate → refund on failure) |
| `app/api/jobs/[id]/route.ts` | Async job status polling |

### Modify
_(none — wraps existing AI logic if present)_

---

## Dependencies
```bash
# Already installed: @anthropic-ai/sdk
# ENV vars (already active):
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## API Contracts
```
POST /api/content/generate
  Headers: x-user-id (middleware)
  Body: { action_type: string; prompt: string; options?: Record<string, unknown> }
  200 → { result: string; credits_remaining: number; request_id: string }
  202 → { job_id: string }  (async path for heavy workloads)
  402 → { error: 'Insufficient credits. Please top up to continue.' }
  401 → { error: 'Unauthorized.' }

GET /api/jobs/:id
  → 200 { status: 'pending' | 'completed' | 'failed'; result?: string; credits_remaining?: number }
  → 404
```

---

## Code Templates

### `lib/config/credit-costs.ts`
```typescript
// Server-side only — never import this in client components
export const CREDIT_COSTS: Record<string, number> = {
  'content.generate.short':      5,
  'content.generate.long':       15,
  'content.generate.thread':     10,
  'content.generate.blog':       20,
  'content.image.generate':      25,
  'content.seo.analyze':         8,
  'content.research.brief':      12,
} as const;

export function getCreditCost(actionType: string): number {
  const cost = CREDIT_COSTS[actionType];
  if (cost === undefined) throw new Error(`Unknown action type: ${actionType}`);
  return cost;
}
```

### `lib/credits/generate.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { resolveWallet, deductCredits } from '@/lib/credits/wallet';
import { getCreditCost } from '@/lib/config/credit-costs';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export type GenerateResult = {
  result: string;
  credits_remaining: number;
  request_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
};

export async function generateWithDeduction(
  userId: string,
  actionType: string,
  prompt: string,
  options: Record<string, unknown> = {}
): Promise<GenerateResult> {
  const requestId = crypto.randomUUID();
  const cost = getCreditCost(actionType);

  const wallet = await resolveWallet(userId);
  if (!wallet) throw Object.assign(new Error('Wallet not found.'), { status: 402 });
  if (wallet.balance < cost) {
    throw Object.assign(new Error('Insufficient credits. Please top up to continue.'), { status: 402 });
  }

  // Deduct BEFORE generation (idempotent via request_id)
  const balanceAfterDeduct = await deductCredits(wallet.id, cost, actionType, requestId, userId);

  const start = Date.now();
  let result: string;
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: (options.max_tokens as number) ?? 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    result = response.content[0].type === 'text' ? response.content[0].text : '';
    promptTokens = response.usage.input_tokens;
    completionTokens = response.usage.output_tokens;
  } catch (aiError) {
    // Refund on AI failure
    await supabase.rpc('fn_refund_credits', { p_request_id: requestId });

    // Log failure
    await supabase.from('generation_log').insert({
      user_id: userId,
      action_type: actionType,
      model_used: 'claude-sonnet-4-6',
      prompt_tokens: 0,
      completion_tokens: 0,
      latency_ms: Date.now() - start,
      status: 'failed',
      request_id: requestId,
      error: String(aiError),
    }).catch(() => {});

    throw aiError;
  }

  const latencyMs = Date.now() - start;

  // Log success
  await supabase.from('generation_log').insert({
    user_id: userId,
    action_type: actionType,
    model_used: 'claude-sonnet-4-6',
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    latency_ms: latencyMs,
    status: 'success',
    request_id: requestId,
  }).catch(() => {});

  return {
    result,
    credits_remaining: balanceAfterDeduct,
    request_id: requestId,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    latency_ms: latencyMs,
  };
}
```

### `app/api/content/generate/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateWithDeduction } from '@/lib/credits/generate';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { action_type, prompt, options } = await req.json();

  if (!action_type || !prompt) {
    return NextResponse.json({ error: 'action_type and prompt are required.' }, { status: 400 });
  }

  try {
    const result = await generateWithDeduction(userId, action_type, prompt, options ?? {});
    return NextResponse.json({
      result: result.result,
      credits_remaining: result.credits_remaining,
      request_id: result.request_id,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    const message = (err as Error).message;

    if (status === 402) {
      return NextResponse.json({ error: message }, { status: 402 });
    }
    return NextResponse.json({ error: 'Generation failed. Credits have been refunded.' }, { status: 500 });
  }
}
```

### `app/api/jobs/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data } = await supabase
    .from('generation_log')
    .select('status, request_id')
    .eq('request_id', params.id)
    .eq('user_id', userId)
    .single();

  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  return NextResponse.json({ status: data.status, job_id: data.request_id });
}
```

---

## Codebase Context

### Key Patterns in Use
- **Deduct before generate:** balance checked + deducted atomically via RPC before AI call.
- **Refund on AI failure:** `fn_refund_credits(request_id)` compensates using the same idempotency key.
- **Cost from server config only:** `getCreditCost(actionType)` throws if unknown — client cannot influence cost.
- **generation_log table:** requires a migration — add this table as part of task 9 if not already in task 1's migration.

### Migration needed (if generation_log not in task 1)
```sql
CREATE TABLE IF NOT EXISTS public.generation_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id),
  action_type      TEXT        NOT NULL,
  model_used       TEXT        NOT NULL,
  prompt_tokens    INT         NOT NULL DEFAULT 0,
  completion_tokens INT        NOT NULL DEFAULT 0,
  latency_ms       INT         NOT NULL,
  status           TEXT        NOT NULL,   -- 'success' | 'failed'
  request_id       UUID        NOT NULL UNIQUE,
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gen_log_user ON public.generation_log (user_id, created_at DESC);
```

---

## Handoff from Previous Task
**Files changed by task 8:** `lib/credits/wallet.ts` with `resolveWallet`, `deductCredits`, `topupCredits`.
**Files changed by task 3:** `fn_deduct_credits`, `fn_refund_credits` RPCs.
**Decisions made:** Deduct before AI call; refund via compensating RPC on failure.

---

## Implementation Steps
1. Create `lib/config/credit-costs.ts`.
2. Add `generation_log` table migration if not in task 1.
3. `lib/credits/generate.ts` — atomic generate wrapper.
4. `app/api/content/generate/route.ts`.
5. `app/api/jobs/[id]/route.ts`.
6. `npx tsc --noEmit`
7. Run: `/verify`

_Requirements: 6, 12, 21, 26_

---

## Test Cases

### Expected behaviors
```
POST /api/content/generate with insufficient balance → 402, no AI call
POST /api/content/generate success → balance debited exactly once
POST /api/content/generate (AI fails) → balance restored to pre-call value
POST with duplicate request_id retry → same result (idempotent via RPC)
POST without x-user-id → 401
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Balance < cost | 402 before any AI call |
| AI call throws | Call `fn_refund_credits(request_id)` then rethrow as 500 |
| Unknown `action_type` | 400 ("Unknown action type") |
| Client sends `cost` in body | Ignored — `getCreditCost(actionType)` from server config |
| Long-running action | Return 202 `{job_id}`, poll `/api/jobs/:id` |

---

## Acceptance Criteria
- [ ] Insufficient balance → `402` with no AI call
- [ ] Successful generation → balance debited exactly once
- [ ] AI error → balance restored to pre-call value
- [ ] `getCreditCost` with unknown type throws; route returns 400
- [ ] All generation events logged to `generation_log`
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
