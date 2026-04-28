---
task: 024
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 024: Validate and clamp max_tokens in content generation route

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md

## Agents
- @software-developer-expert

## Commands
- /verify

---

## Objective
Add validation and clamping for `options.max_tokens` in the content generation route to prevent users from requesting excessively large outputs that could exhaust credits or overload the AI backend.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `app/api/content/generate/route.ts` | Lines 35–37: Validate and clamp `max_tokens` option |

---

## Dependencies
_(none)_

---

## API Contracts

```
POST /api/content/generate
Headers: Authorization, Content-Type
Request: {
  action_type: string,
  prompt: string,
  options?: {
    max_tokens?: number  // Will be clamped to [256, 4096]
  },
  captchaToken?: string
}
Response 200: {
  result: string,
  tokens_used: number,
  credits_deducted: number
}
Response 400: {
  error: 'options.max_tokens must be between 256 and 4096'
}
Response 422: {
  error: 'Invalid request body'
}
```

---

## Code Templates

### `app/api/content/generate/route.ts` — before → after

**Before (lines 35–37, no validation):**
```typescript
const { action_type, prompt, options, captchaToken } = body;
// options passed directly without validation
const result = await generateWithDeduction(userId, action_type, prompt, options ?? {});
```

**After (with validation):**
```typescript
const { action_type, prompt, options, captchaToken } = body;

// Validate and clamp options to prevent abuse
const MIN_TOKENS = 256;
const MAX_TOKENS = 4096;

if (options?.max_tokens !== undefined) {
  const requestedTokens = options.max_tokens;
  
  // Validate is a number
  if (typeof requestedTokens !== 'number' || !Number.isInteger(requestedTokens)) {
    return NextResponse.json(
      { error: 'options.max_tokens must be an integer' },
      { status: 400 }
    );
  }
  
  // Validate is within bounds
  if (requestedTokens < MIN_TOKENS || requestedTokens > MAX_TOKENS) {
    return NextResponse.json(
      { error: `options.max_tokens must be between ${MIN_TOKENS} and ${MAX_TOKENS}` },
      { status: 400 }
    );
  }
}

const sanitizedOptions = {
  max_tokens: Math.min(options?.max_tokens ?? 2048, MAX_TOKENS),
};

const result = await generateWithDeduction(userId, action_type, prompt, sanitizedOptions);
```

---

## Codebase Context

### Current Vulnerability
```typescript
// Current code (VULNERABLE)
const { action_type, prompt, options, captchaToken } = body;
const result = await generateWithDeduction(userId, action_type, prompt, options ?? {});

// User can send: { "max_tokens": 100000 }
// This requests 100k tokens, exhausting credits and overloading AI backend
```

### Risk Assessment
- **Attack vector:** User sends `{ "max_tokens": 100000 }` in request
- **Impact:** 
  - User exhausts credits 25× faster than intended
  - AI backend receives huge request, impacts other users
  - Potential DoS on inference infrastructure
- **Severity:** MEDIUM (abuse vector, not direct data loss)

### Mitigation
- **Minimum:** 256 tokens (meaningful minimum for content generation)
- **Maximum:** 4096 tokens (~1,500 words; reasonable limit for SaaS tier)
- **Default:** 2048 tokens (if not specified)
- **Validation:** Type check + bounds check + clear error message

---

## Handoff from Previous Task
_(none yet)_

---

## Implementation Steps
1. Open `app/api/content/generate/route.ts`
2. Locate line 35: `const { action_type, prompt, options, captchaToken } = body;`
3. After destructuring, add validation block:
   ```typescript
   const MIN_TOKENS = 256;
   const MAX_TOKENS = 4096;
   
   if (options?.max_tokens !== undefined) {
     const requestedTokens = options.max_tokens;
     if (typeof requestedTokens !== 'number' || !Number.isInteger(requestedTokens)) {
       return NextResponse.json(
         { error: 'options.max_tokens must be an integer' },
         { status: 400 }
       );
     }
     if (requestedTokens < MIN_TOKENS || requestedTokens > MAX_TOKENS) {
       return NextResponse.json(
         { error: `options.max_tokens must be between ${MIN_TOKENS} and ${MAX_TOKENS}` },
         { status: 400 }
       );
     }
   }
   ```
4. Replace `options ?? {}` with validated `sanitizedOptions`:
   ```typescript
   const sanitizedOptions = {
     max_tokens: Math.min(options?.max_tokens ?? 2048, MAX_TOKENS),
   };
   const result = await generateWithDeduction(userId, action_type, prompt, sanitizedOptions);
   ```
5. Run: `/verify`
6. Test: Send requests with various `max_tokens` values (0, 256, 4096, 100000) and verify validation

_Skills: .kit/skills/development/code-writing-software-development/SKILL.md — input validation at API boundary_

---

## Test Cases

```typescript
import { POST } from './route';
import { NextRequest } from 'next/server';

describe('Content generation options validation', () => {
  it('rejects max_tokens below minimum (256)', async () => {
    const req = new NextRequest(new URL('/api/content/generate', 'http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'generate',
        prompt: 'test',
        options: { max_tokens: 100 },
      }),
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('between 256 and 4096');
  });

  it('rejects max_tokens above maximum (4096)', async () => {
    const req = new NextRequest(new URL('/api/content/generate', 'http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'generate',
        prompt: 'test',
        options: { max_tokens: 100000 },
      }),
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('between 256 and 4096');
  });

  it('accepts max_tokens within bounds', async () => {
    const req = new NextRequest(new URL('/api/content/generate', 'http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'generate',
        prompt: 'test',
        options: { max_tokens: 2048 },
      }),
    });
    
    const response = await POST(req);
    // Should proceed (may fail for other reasons, but not max_tokens validation)
    expect(response.status).not.toBe(400);
  });

  it('rejects non-integer max_tokens', async () => {
    const req = new NextRequest(new URL('/api/content/generate', 'http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'generate',
        prompt: 'test',
        options: { max_tokens: 2048.5 },
      }),
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('must be an integer');
  });

  it('uses default (2048) when max_tokens not specified', async () => {
    const req = new NextRequest(new URL('/api/content/generate', 'http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'generate',
        prompt: 'test',
        // No options specified
      }),
    });
    
    const response = await POST(req);
    // Should use default 2048
    expect(response.status).not.toBe(400);
  });

  it('clamps max_tokens to MAX_TOKENS on pass-through', async () => {
    // Even if validation passes, ensure generateWithDeduction receives clamped value
    const mockGenerateWithDeduction = vi.fn();
    vi.mock('@/lib/credits/generate', () => ({
      generateWithDeduction: mockGenerateWithDeduction,
    }));
    
    const req = new NextRequest(new URL('/api/content/generate', 'http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'generate',
        prompt: 'test',
        options: { max_tokens: 3000 },
      }),
    });
    
    await POST(req);
    expect(mockGenerateWithDeduction).toHaveBeenCalledWith(
      expect.any(String), // userId
      'generate',
      'test',
      expect.objectContaining({ max_tokens: 3000 })
    );
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| `max_tokens` not specified | Use default 2048 (no error) |
| `max_tokens` is string | Return 400: "must be an integer" |
| `max_tokens` is float | Return 400: "must be an integer" |
| `max_tokens` < 256 | Return 400: "must be between 256 and 4096" |
| `max_tokens` > 4096 | Return 400: "must be between 256 and 4096" |
| `max_tokens` valid (256–4096) | Use specified value, pass to generateWithDeduction |

---

## Acceptance Criteria
- [ ] WHEN `max_tokens` is not specified THEN default to 2048 (no error)
- [ ] WHEN `max_tokens` < 256 THEN return 400 with clear message
- [ ] WHEN `max_tokens` > 4096 THEN return 400 with clear message
- [ ] WHEN `max_tokens` is not an integer THEN return 400 with clear message
- [ ] WHEN `max_tokens` is valid (256–4096) THEN use it in generation
- [ ] User cannot request > 4096 tokens (prevents abuse/DoS)
- [ ] Error messages are clear and include bounds (256–4096)
- [ ] All existing tests pass
- [ ] `bun run type-check` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
_(fill via /task-handoff)_
