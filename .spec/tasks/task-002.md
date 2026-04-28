---
task: 002
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 002: Replace module-level Supabase singleton in wallet.ts with factory pattern

## Skills
- .kit/skills/development/code-writing-software-development/SKILL.md
- .kit/skills/security-defensive/secrets-management/SKILL.md

## Agents
- @software-developer-expert

## Commands
- /verify

> Load the skills, agents, and commands listed above before reading anything else using their exact `.kit/` paths.

---

## Objective
Convert from module-level singleton that creates service-role client at module load to factory function to prevent service-role key exposure in client bundles.

---

## Files

### Modify
| File | What to change |
|------|---------------|
| `lib/credits/wallet.ts` | Lines 3–6: Replace module-level singleton with `adminClient()` factory function |

---

## Dependencies
_(none)_

---

## API Contracts
_(none)_

---

## Code Templates

### `lib/credits/wallet.ts` — before → after

**Before (lines 3–6):**
```typescript
// Module-level singleton — created once at module load time
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function resolveWallet(userId: string) {
  const { data } = await supabase.from('credit_wallets')...
}
```

**After:**
```typescript
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function resolveWallet(userId: string) {
  const supabase = adminClient();
  const { data } = await supabase.from('credit_wallets')...
}
```

---

## Codebase Context

### Key Code Snippets
```typescript
// Pattern to follow from lib/billing/razorpay.ts
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

### Key Patterns
- **Factory pattern:** Service-role client created on-demand per function call, never at module load
- **Security:** Never expose `SUPABASE_SERVICE_ROLE_KEY` in module-level singletons that could be bundled client-side

---

## Handoff from Previous Task
_(none yet)_

---

## Implementation Steps
1. Open `lib/credits/wallet.ts`
2. Delete the module-level `const supabase = createClient(...)` block (lines 3–6)
3. Add the `adminClient()` factory function at the top of the file (after imports)
4. Update all functions in the file to call `const supabase = adminClient()` instead of using the module-level singleton
5. Run: `/verify`
6. Test: Call wallet deduction and topup operations; verify they still work
7. Verify: No module-level `const supabase = createClient(` with service-role key exists

_Skills: .kit/skills/development/code-writing-software-development/SKILL.md — refactor module pattern_

---

## Test Cases

```typescript
import { resolveWallet } from './wallet';

describe('Wallet operations with factory pattern', () => {
  it('resolveWallet calls adminClient factory', async () => {
    const mockCreateClient = vi.fn();
    vi.mock('@supabase/ssr', () => ({
      createClient: mockCreateClient,
    }));
    
    await resolveWallet('user-123');
    expect(mockCreateClient).toHaveBeenCalled();
  });

  it('wallet operations still function correctly', async () => {
    const wallet = await resolveWallet('user-123');
    expect(wallet).toBeDefined();
    expect(wallet.id).toBeDefined();
    expect(wallet.balance).toBeDefined();
  });

  it('no module-level singleton exists', async () => {
    // Verify by reading the file: grep for "^const supabase = createClient"
    // Should not exist at module level
  });
});
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Service-role key undefined | Throw error: "SUPABASE_SERVICE_ROLE_KEY not configured" |
| Factory called multiple times | Each call creates a new client (fine for this pattern) |

---

## Acceptance Criteria
- [ ] Module-level singleton replaced with `adminClient()` factory function
- [ ] All references updated to call factory on demand
- [ ] No module-level `const supabase = createClient()` with service-role key exists
- [ ] Wallet deduction and topup operations still function correctly
- [ ] Middleware logs show no errors during wallet operations
- [ ] All existing tests pass
- [ ] `bun run type-check` — zero errors
- [ ] `/verify` passes

---

## Handoff to Next Task
_(fill via /task-handoff)_
