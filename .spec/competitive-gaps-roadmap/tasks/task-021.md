---
task: "021"
feature: competitive-gaps-roadmap
rec: R3
title: "Create GET/POST /api/brand-voice routes"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-backend-expert
depends_on: ["020"]
---

## Skills
- `.kit/skills/development/api-design/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-backend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Create the base brand voice API route handling list (GET) and create (POST) operations with max-5 limit enforcement.

## Files

### Create
- `D:/content-engine/app/api/brand-voice/route.ts`

## Dependencies
- TASK-020: `brand_voices` table exists
- `lib/auth.ts` — `requireAuth`

## API Contracts

**GET /api/brand-voice:**
```typescript
// Response 200
{ data: BrandVoice[] }

interface BrandVoice {
  id: string
  name: string
  toneAdjectives: string[]
  writingSamples: string[]
  forbiddenPhrases: string[]
  formalityLevel: 'formal' | 'casual' | 'neutral'
  isActive: boolean
  createdAt: string
}
```

**POST /api/brand-voice:**
```typescript
// Request
{
  name: string
  toneAdjectives?: string[]
  writingSamples?: string[]
  forbiddenPhrases?: string[]
  formalityLevel?: 'formal' | 'casual' | 'neutral'
}

// Response 201
{ data: BrandVoice }

// Response 409 — limit exceeded
{ error: { code: 'limit_exceeded'; message: 'Maximum 5 brand voice profiles allowed' } }

// Response 400
{ error: { code: 'validation_error'; message: string } }
```

## Codebase Context

Column naming: DB uses `snake_case` (`tone_adjectives`), API returns `camelCase` (`toneAdjectives`). Apply transformation in route.

Existing routes in this project use this pattern for camelCase transformation:
```typescript
function mapBrandVoice(row: Record<string, unknown>): BrandVoice {
  return {
    id: row.id as string,
    name: row.name as string,
    toneAdjectives: row.tone_adjectives as string[],
    // ...
  }
}
```

## Implementation Steps

1. Create `app/api/brand-voice/route.ts`:

**GET handler:**
```typescript
export async function GET(request: NextRequest) {
  // Auth, supabase
  // Query: SELECT * FROM brand_voices WHERE user_id = auth.uid() ORDER BY created_at
  // Map rows to camelCase BrandVoice objects
  // Return { data: [...] }
}
```

**POST handler:**
```typescript
export async function POST(request: NextRequest) {
  // Auth, supabase
  // Count existing voices: SELECT count(*) WHERE user_id = auth.uid()
  // If count >= 5: return 409 limit_exceeded
  // Validate body: name required, formalityLevel in allowed values
  // Insert row with user_id
  // Return 201 with created row
}
```

2. Validation:
   - `name`: required, non-empty string, max 100 chars
   - `formalityLevel`: must be 'formal', 'casual', or 'neutral' if provided
   - `toneAdjectives`, `writingSamples`, `forbiddenPhrases`: arrays of strings if provided

3. Security: all queries use `supabase` client from `requireAuth` (user's RLS-scoped client).

## Test Cases

- GET authenticated → returns array of brand voices (can be empty)
- POST valid payload → 201 with created voice
- POST when 5 voices exist → 409 limit_exceeded
- POST missing `name` → 400 validation_error
- POST invalid `formalityLevel` → 400 validation_error
- GET unauthenticated → 401

## Decision Rules
- Count check must happen before insert to prevent race condition (acceptable for non-critical UX feature).
- API response uses camelCase keys — DB uses snake_case.
- `user_id` always set from `auth.user.id`, never from request body.

## Acceptance Criteria
- `GET /api/brand-voice` returns user's brand voices as camelCase JSON.
- `POST /api/brand-voice` creates voice and returns 201.
- `POST /api/brand-voice` returns 409 when user has 5 existing voices.
- Auth required — 401 on missing token.
- `name` required — 400 if missing.

Status: COMPLETE
Completed: 2026-04-28T07:26:35Z
