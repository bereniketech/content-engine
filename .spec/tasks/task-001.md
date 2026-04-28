---
task: 001
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 001: Fix hardcoded trust score in content generation

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md

## Agents
- @software-developer-expert

## Commands
- /verify

> Load the skills, agents, and commands listed above before reading anything else using their exact `.kit/` paths. Do not load any context not declared here. Do not load CLAUDE.md. Follow paths exactly — no shortcuts, no variable substitution, no @-imports.

---

## Objective
Replace hardcoded `trustScore = 50` with `await getEffectiveTrustScore(userId)` to enable actual CAPTCHA enforcement based on real user trust scores.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `app/api/content/generate/route.ts` | Line 48: Replace `const trustScore = 50;` with `const trustScore = await getEffectiveTrustScore(userId);` |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `app/api/content/generate/route.ts` — before → after

**Before (line 48):**
```typescript
const trustScore = 50; // default; middleware could inject this via header in a future enhancement
if (requiresCaptcha(trustScore, identical.flagged)) {
  const ok = await verifyCaptcha(captchaToken ?? '', 'generate');
  if (!ok) {
    return NextResponse.json({ error: 'CAPTCHA verification required.' }, { status: 403 });
  }
}
```

**After:**
```typescript
const trustScore = await getEffectiveTrustScore(userId);
if (requiresCaptcha(trustScore, identical.flagged)) {
  const ok = await verifyCaptcha(captchaToken ?? '', 'generate');
  if (!ok) {
    return NextResponse.json({ error: 'CAPTCHA verification required.' }, { status: 403 });
  }
}
```

---

## Codebase Context

### Key Functions
```typescript
// Function signature from lib/trust.ts (expected to exist)
export async function getEffectiveTrustScore(userId: string): Promise<number>

// Function that uses the trust score
function requiresCaptcha(trustScore: number, flagged: boolean): boolean
```

### Key Patterns
- **Trust score enforcement:** Fetch actual trust score from database, not hardcoded default
- **CAPTCHA gating:** Only bypass CAPTCHA when trust score >= 80 AND request is not flagged as identical

---

## Handoff from Previous Task
_(none yet)_

---

## Implementation Steps
1. Open `app/api/content/generate/route.ts`
2. Locate line 48: `const trustScore = 50;`
3. Replace with: `const trustScore = await getEffectiveTrustScore(userId);`
4. Run: `/verify`
5. Test: Call `/api/content/generate` with a user whose trust score is < 40 and verify CAPTCHA is required
6. Verify: Grep for remaining hardcoded trust scores in the file

_Requirements: 1.1 (CAPTCHA enforcement)_
_Skills: .kit/skills/development/code-writing-software-development/SKILL.md — fetch trust score from database instead of hardcoded value_

---

## Test Cases

### File: `app/api/content/generate.test.ts`
```typescript
import { POST } from './route';

describe('Content generation CAPTCHA enforcement', () => {
  it('requires CAPTCHA for trust < 40', async () => {
    const req = new NextRequest(new URL('/api/content/generate', 'http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'generate',
        prompt: 'test prompt',
        captchaToken: null,
      }),
    });
    
    // Mock getEffectiveTrustScore to return 30 (low trust)
    vi.mock('@/lib/trust', () => ({
      getEffectiveTrustScore: vi.fn().mockResolvedValue(30),
    }));
    
    const response = await POST(req);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'CAPTCHA verification required.' });
  });

  it('does not require CAPTCHA for trust >= 80 on non-identical request', async () => {
    const req = new NextRequest(new URL('/api/content/generate', 'http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'generate',
        prompt: 'unique prompt',
        captchaToken: null,
      }),
    });
    
    // Mock getEffectiveTrustScore to return 85 (high trust)
    vi.mock('@/lib/trust', () => ({
      getEffectiveTrustScore: vi.fn().mockResolvedValue(85),
    }));
    
    const response = await POST(req);
    expect(response.status).not.toBe(403);
  });

  it('calls getEffectiveTrustScore with correct userId', async () => {
    const mockGetTrustScore = vi.fn().mockResolvedValue(50);
    vi.mock('@/lib/trust', () => ({
      getEffectiveTrustScore: mockGetTrustScore,
    }));
    
    const req = new NextRequest(new URL('/api/content/generate', 'http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'generate',
        prompt: 'test',
      }),
    });
    
    await POST(req);
    expect(mockGetTrustScore).toHaveBeenCalledWith(expect.any(String)); // userId
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Trust score fetch fails | Return 500 with "Unable to fetch user trust score" |
| Trust score is undefined | Default to 0 (most restrictive) |
| CAPTCHA verification fails | Return 403 with "CAPTCHA verification required." |

---

## Acceptance Criteria
- [ ] WHEN user trust score < 40 THEN /api/content/generate requires CAPTCHA
- [ ] WHEN user trust score >= 80 AND request is not identical THEN no CAPTCHA required
- [ ] WHEN getEffectiveTrustScore returns a value THEN that value is used in requiresCaptcha decision
- [ ] All existing tests pass
- [ ] `bun run type-check` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
_(fill via /task-handoff)_
