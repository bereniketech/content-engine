---
task: 023
feature: stability-roadmap
status: COMPLETE
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
completed_at: 2026-04-28T00:00:00Z
---

# Task 023: Document higherTier tie-breaking logic with comment

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md

## Agents
- @software-developer-expert

## Commands
- /verify

---

## Objective
Add clarifying comment to `higherTier()` function explaining that `>=` operator implements tie-breaking by preferring the first argument (stored country tier over detected tier), making the semantic explicit and preventing future confusion.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `lib/billing/razorpay.ts` | Lines 20–22: Add comment explaining tie-breaking |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `lib/billing/razorpay.ts` — before → after

**Before (lines 20–22, no explanation):**
```typescript
const TIER_RANK: Record<string, number> = { Tier1: 4, Tier2: 3, Tier3: 2, Tier4: 1 };

function higherTier(a: { tier_name: string }, b: { tier_name: string }) {
  return (TIER_RANK[a.tier_name] ?? 4) >= (TIER_RANK[b.tier_name] ?? 4) ? a : b;
}
```

**After (with clarifying comment):**
```typescript
const TIER_RANK: Record<string, number> = { Tier1: 4, Tier2: 3, Tier3: 2, Tier4: 1 };

function higherTier(a: { tier_name: string }, b: { tier_name: string }) {
  // Return higher tier; on tie (same rank), prefer first argument (stored country tier wins over detected tier)
  return (TIER_RANK[a.tier_name] ?? 4) >= (TIER_RANK[b.tier_name] ?? 4) ? a : b;
}
```

---

## Codebase Context

### Why This Matters
The `>=` operator is semantically correct but unintuitive. Most developers expect `>` for "return higher", so the `>=` seems like a bug.

**The comment clarifies:**
1. **Equality case:** When both tiers have the same rank
2. **Tie-breaking rule:** First argument wins (not random, not second argument)
3. **Use case:** Stored country tier (from database) takes precedence over detected tier (from IP/VPN check)

### Related Context
```typescript
// Typical usage: prefer stored tier if it matches detected tier
function selectUserPricingTier(
  storedCountryTier: { tier_name: string },
  detectedCountryTier: { tier_name: string }
) {
  const finalTier = higherTier(storedCountryTier, detectedCountryTier);
  // If both tiers are equal, storedCountryTier wins (first argument)
  return finalTier;
}
```

---

## Handoff from Previous Task
_(none yet)_

---

## Implementation Steps
1. Open `lib/billing/razorpay.ts`
2. Locate the `higherTier` function (lines 20–22)
3. Add comment above the return statement:
   ```typescript
   // Return higher tier; on tie (same rank), prefer first argument (stored country tier wins over detected tier)
   ```
4. Run: `/verify`
5. Verify: Comment is clear and explains the `>=` tie-breaking behavior

_Skills: .kit/skills/development/code-writing-software-development/SKILL.md — add clarifying comments_

---

## Test Cases

```typescript
import { /* export higherTier if needed */ } from './razorpay';

describe('higherTier tie-breaking', () => {
  it('returns tier with higher rank', () => {
    const tier1 = { tier_name: 'Tier1', rank: 4 };  // higher
    const tier3 = { tier_name: 'Tier3', rank: 2 };  // lower
    
    const result = higherTier(tier1, tier3);
    expect(result.tier_name).toBe('Tier1');
  });

  it('prefers first argument on tie (same rank)', () => {
    const storedTier = { tier_name: 'Tier2', rank: 3 };   // stored (first arg)
    const detectedTier = { tier_name: 'Tier2', rank: 3 }; // detected (second arg)
    
    const result = higherTier(storedTier, detectedTier);
    // Should return first argument (storedTier) on tie
    expect(result).toBe(storedTier);
  });

  it('returns lower tier rank when first arg is lower', () => {
    const tier3 = { tier_name: 'Tier3', rank: 2 }; // lower (first)
    const tier1 = { tier_name: 'Tier1', rank: 4 }; // higher (second)
    
    const result = higherTier(tier3, tier1);
    expect(result.tier_name).toBe('Tier1');
  });

  it('comment explains >= tie-breaking semantic', () => {
    // This is a documentation test - just verify the function exists and is documented
    const code = higherTier.toString();
    // Comment should be visible in source (verified by code review)
    expect(code).toBeDefined();
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Both tiers have same rank | Return first argument (tie-breaking rule) |
| First tier rank > second | Return first tier |
| Second tier rank > first | Return second tier |
| Tier name unknown (not in TIER_RANK) | Default rank to 4, apply same logic |

---

## Acceptance Criteria
- [ ] Comment added above `higherTier()` return statement
- [ ] Comment explains `>=` means "higher or equal"
- [ ] Comment explains tie-breaking: first argument wins on equality
- [ ] Comment explains use case: stored tier vs. detected tier
- [ ] Comment is clear and unambiguous (not cryptic)
- [ ] No functional change to the function
- [ ] All existing tests pass
- [ ] Code review confirms comment is helpful
- [ ] `/verify` passes

---

## Handoff to Next Task
_(fill via /task-handoff)_
