---
task: 006
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: software-developer-expert
depends_on: []
---

# Task 006: Remove PCI-sensitive data from webhook body logging

## Objective
Replace `body_preview` in `abuse_logs` with SHA256 hash to prevent PCI/GDPR compliance violations.

## Files
### Modify
| File | What to change |
|------|---------------|
| `app/api/webhooks/razorpay/route.ts` | Line 22: Remove raw body, add hash instead |

## Code Templates

**Before:**
```typescript
await supabase.from('abuse_logs').insert({
  event_type: 'webhook_signature_mismatch',
  ip_address: ip,
  metadata: { signature, body_preview: rawBody.slice(0, 200) },
});
```

**After:**
```typescript
const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
await supabase.from('abuse_logs').insert({
  event_type: 'webhook_signature_mismatch',
  ip_address: ip,
  metadata: { signature, body_hash: bodyHash },
});
```

## Acceptance Criteria
- [ ] `body_preview` removed from metadata
- [ ] `body_hash` (SHA256) stored instead
- [ ] No PCI-sensitive data logged
- [ ] Abuse logs table is PCI-compliant
- [ ] `/verify` passes
