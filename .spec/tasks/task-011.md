---
task: 011
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: [task-003]
---

# Task 011: Route content generation through lib/ai.ts with retry logic

## Objective
Replace direct Anthropic client with `createMessage()` from `lib/ai.ts` to add retry logic and prompt caching.

## Files
### Modify
| File | What to change |
|------|---------------|
| `lib/credits/generate.ts` | Lines 12–13, 50: Remove direct Anthropic client, use abstraction |

## Code Templates

**Before:**
```typescript
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Later...
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: (options.max_tokens as number) ?? 2048,
  messages: [{ role: 'user', content: prompt }],
});
```

**After:**
```typescript
import { createMessage } from '@/lib/ai';

// Remove: const anthropic = new Anthropic(...)

// Later...
const result = await createMessage({
  model: 'claude-sonnet-4-6',
  maxTokens: (options.max_tokens as number) ?? 2048,
  messages: [{ role: 'user', content: prompt }],
});
```

## Acceptance Criteria
- [ ] Direct Anthropic client removed
- [ ] `createMessage()` used from `lib/ai.ts`
- [ ] Retry logic applied on transient errors
- [ ] Prompt caching enabled
- [ ] Test: Generate content with transient API error → verify retry works
- [ ] Token counting updated as needed
- [ ] `/verify` passes
