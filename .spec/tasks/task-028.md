---
task: 028
feature: stability-roadmap
status: pending
model: haiku
supervisor: software-cto
agent: security-reviewer
depends_on: []
---

# Task 028: Execute security review checklist and document findings

## Skills
- .kit/skills/testing-quality/security-review/SKILL.md
- .kit/skills/security-defensive/threat-modeling/SKILL.md

## Agents
- @security-reviewer

## Commands
- /verify

---

## Objective
Execute comprehensive security checklist covering code, configuration, and deployment. Verify no hardcoded credentials, service-role keys are server-only, PCI data is not logged, CAPTCHA validation works, webhook signatures are timing-safe, admin auth is enforced, rate limiting is complete, session invalidation works, and trust score enforcement is active.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `SECURITY_AUDIT.md` | Detailed security audit results and findings |
| `.security/checklist.txt` | Executable checklist (not committed) |

### Verify
| File | What to check |
|------|---------------|
| Source code | No hardcoded credentials, PCI data, or secrets |
| Environment | Service-role keys only in server functions |
| API endpoints | Rate limiting, auth enforcement, input validation |
| Webhook handling | Signature verification, no raw body logging |
| Session management | Logout invalidates session |
| Trust scoring | Enforced on all protected endpoints |

---

## Dependencies
_(none)_

---

## Code Templates

### Security Checklist (from stability-roadmap-10-10.md)

```bash
#!/bin/bash
# SECURITY_CHECKLIST.sh

echo "=== SECURITY AUDIT CHECKLIST ==="
echo ""

# 1. Hardcoded credentials
echo "[ ] Checking for hardcoded credentials..."
CREDS=$(grep -r "password\|secret\|api_key\|token" src/ \
  | grep -v "node_modules" \
  | grep -v "\.env" \
  | grep -v "process.env" \
  | grep -E "=\s*['\"]" \
  | wc -l)
echo "  Found $CREDS potential hardcoded values (should be 0)"

# 2. Service-role key exposure
echo "[ ] Checking SUPABASE_SERVICE_ROLE_KEY usage..."
ROLEKEY=$(grep -r "SUPABASE_SERVICE_ROLE_KEY" src/ \
  | grep -v "process.env" \
  | grep -v "\.env" \
  | wc -l)
echo "  Found $ROLEKEY raw key usages (should be 0)"
echo "  Service-role key should only appear in:"
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/ | grep "process.env" | head -3

# 3. PCI-sensitive data in logs
echo "[ ] Checking for PCI-sensitive data in logs..."
for PATTERN in "card" "cvv" "number" "body_preview" "raw_body"; do
  COUNT=$(grep -r "$PATTERN" src/ \
    | grep -v "node_modules" \
    | grep -i "log\|console\|trace" \
    | wc -l)
  [ $COUNT -gt 0 ] && echo "  ⚠️  Found '$PATTERN' in logging: $COUNT occurrences"
done
echo "  (All should be 0)"

# 4. CAPTCHA validation
echo "[ ] Checking CAPTCHA token validation..."
grep -r "verifyCaptcha" src/app/api/content/generate/route.ts
echo "  (Should show CAPTCHA verification in route)"

# 5. Webhook signature verification
echo "[ ] Checking webhook signature verification..."
grep -r "verifyWebhookSignature\|timingSafeEqual" src/app/api/webhooks/
echo "  (Should show timing-safe comparison)"

# 6. Admin authorization
echo "[ ] Checking admin route protection..."
grep -r "requireAdmin" src/app/api/admin/
echo "  (All admin routes should use requireAdmin)"

# 7. Rate limiting
echo "[ ] Checking rate limiters on endpoints..."
for ENDPOINT in "/api/content/generate" "/api/auth/signup" "/api/webhooks/razorpay"; do
  grep -r "rateLimit\|Ratelimit" src/ | grep "$ENDPOINT" | head -1
done
echo "  (All endpoints should have rate limiters)"

# 8. Session invalidation
echo "[ ] Checking session invalidation on logout..."
grep -r "logout\|invalidate.*session" src/app/api/auth/
echo "  (Logout should invalidate session)"

# 9. Trust score enforcement
echo "[ ] Checking trust score enforcement..."
grep -r "getEffectiveTrustScore\|requiresCaptcha" src/app/api/content/generate/
echo "  (Content generation should enforce trust scores)"

echo ""
echo "=== END CHECKLIST ==="
```

### `SECURITY_AUDIT.md` (Results template)

```markdown
# Security Audit Results

**Date:** 2026-04-28  
**Auditor:** security-reviewer  
**Status:** ✅ PASSED

---

## 1. Hardcoded Credentials

**Finding:** ✅ PASS  
**Check:** Grep for `password`, `secret`, `api_key` in source code  
**Result:** 0 hardcoded values found  
**Evidence:**
```bash
grep -r "password\|secret\|api_key" src/ | grep -v process.env | wc -l
# Output: 0
```

---

## 2. Service-Role Key Exposure

**Finding:** ✅ PASS  
**Check:** Service-role key only used in server functions (not client bundles)  
**Result:** All uses wrapped in `process.env.SUPABASE_SERVICE_ROLE_KEY`  
**Files Checked:**
- lib/credits/wallet.ts — factory pattern ✅
- lib/credits/generate.ts — factory pattern ✅
- lib/admin/auth.ts — factory pattern ✅
- lib/billing/razorpay.ts — factory pattern ✅

**Evidence:**
```bash
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/app/ | wc -l
# Output: 0 (no client-side usage)
```

---

## 3. PCI-Sensitive Data in Logs

**Finding:** ✅ PASS  
**Check:** No raw payment data, card numbers, or body previews logged  
**Result:** All PCI data filtered  
**Files Checked:**
- app/api/webhooks/razorpay/route.ts — uses body hash ✅
- lib/billing/webhookHandlers.ts — no raw bodies ✅
- lib/logger.ts — PCI fields excluded ✅

**Evidence:**
```bash
grep -r "body_preview\|card\|cvv" src/ | grep -i log | wc -l
# Output: 0
```

---

## 4. CAPTCHA Token Validation

**Finding:** ✅ PASS  
**Check:** CAPTCHA verification present in content generation  
**Result:** `verifyCaptcha()` called before returning content  
**Code:**
```typescript
if (requiresCaptcha(trustScore, identical.flagged)) {
  const ok = await verifyCaptcha(captchaToken ?? '', 'generate');
  if (!ok) {
    return NextResponse.json({ error: 'CAPTCHA verification required.' }, { status: 403 });
  }
}
```

---

## 5. Webhook Signature Verification

**Finding:** ✅ PASS  
**Check:** Webhook signatures verified (timing-safe if possible)  
**Result:** `verifyWebhookSignature()` called on all webhooks  
**Status:** Uses `crypto.createHmac()` with `timingSafeEqual()` ✅

**Code:**
```typescript
if (!verifyWebhookSignature(rawBody, signature)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}
```

---

## 6. Admin Authorization

**Finding:** ✅ PASS  
**Check:** All admin endpoints require authorization  
**Result:** `requireAdmin()` enforced on all admin routes  
**Routes Checked:**
- /api/admin/users — ✅
- /api/admin/settings — ✅
- /api/admin/reports — ✅

---

## 7. Rate Limiting

**Finding:** ✅ PASS  
**Check:** All public/auth endpoints have rate limits  
**Status:**
- Signup: 3 per IP per 24h ✅
- Content generation: 30 per user per min ✅
- Webhooks: 100 per IP per min ✅
- Auth: 10 per IP per min ✅

---

## 8. Session Invalidation

**Finding:** ✅ PASS  
**Check:** Logout endpoint invalidates session  
**Code:**
```typescript
// app/api/auth/logout/route.ts
await supabase.auth.signOut();
res.cookies.delete('__Secure-sb-access');
```

---

## 9. Trust Score Enforcement

**Finding:** ✅ PASS  
**Check:** Trust scores enforced on protected endpoints  
**Result:** `getEffectiveTrustScore()` called in content generation  
**Status:** All trust thresholds properly implemented

---

## Summary

| Check | Result | Evidence |
|-------|--------|----------|
| No hardcoded credentials | ✅ | grep output: 0 matches |
| Service-role key secure | ✅ | All in process.env |
| No PCI data in logs | ✅ | No raw bodies logged |
| CAPTCHA validation | ✅ | Enforced in generate route |
| Webhook signatures | ✅ | All verified |
| Admin auth | ✅ | requireAdmin enforced |
| Rate limiting | ✅ | All endpoints covered |
| Session invalidation | ✅ | Logout clears cookies |
| Trust score enforcement | ✅ | CAPTCHA gated on score |

**Overall Result:** ✅ **PASSED — All security checks cleared**

**Recommendations:**
1. Consider external security audit for payment flows (optional but recommended)
2. Implement OWASP dependency scanning in CI/CD
3. Schedule quarterly security reviews
4. Monitor security advisories for Node.js and dependencies

---

**Audit Completed By:** security-reviewer  
**Date:** 2026-04-28  
**Status:** APPROVED FOR PRODUCTION
```

---

## Acceptance Criteria
- [ ] Security checklist script created and executable
- [ ] All 9 checks run and pass
- [ ] No hardcoded credentials found
- [ ] Service-role key only in server functions
- [ ] No PCI-sensitive data in logs
- [ ] CAPTCHA validation implemented
- [ ] Webhook signatures verified (timing-safe)
- [ ] Admin routes protected with `requireAdmin()`
- [ ] Rate limiters on all public endpoints
- [ ] Session invalidation on logout
- [ ] Trust score enforcement active
- [ ] `SECURITY_AUDIT.md` created with findings
- [ ] All findings documented
- [ ] `/verify` passes

---

## Implementation Steps
1. Create `SECURITY_AUDIT.md` file
2. Create `SECURITY_CHECKLIST.sh` script
3. Run checklist: `bash SECURITY_CHECKLIST.sh`
4. Document any findings in `SECURITY_AUDIT.md`
5. For each finding: categorize as PASS, WARNING, or FAIL
6. Provide evidence (grep output, code snippets, test results)
7. Document any follow-up actions needed
8. Run `/verify`

---

## Test Cases

```bash
# Test 1: Run security checklist
bash SECURITY_CHECKLIST.sh > security-audit-results.txt
grep "PASS\|FAIL" security-audit-results.txt | wc -l
# Expected: 9 items checked

# Test 2: Verify no hardcoded credentials
grep -r "password\|secret\|api_key" src/ \
  | grep -v "process.env" \
  | grep -v "\.env" \
  | grep -E "=\s*['\"]" \
  | wc -l
# Expected: 0

# Test 3: Verify service-role key not in client code
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/app/
# Expected: empty (no matches)

# Test 4: Verify CAPTCHA in content generation
grep -A 5 "requiresCaptcha" src/app/api/content/generate/route.ts | \
  grep "verifyCaptcha"
# Expected: Found

# Test 5: Verify rate limiters on endpoints
grep -r "rateLimit\|Ratelimit" src/ | grep -E "signup|generate|webhook" | wc -l
# Expected: > 3
```

---

## Decision Rules
| Scenario | Action |
|----------|--------|
| Hardcoded credential found | Move to env var immediately; escalate to team |
| Service-role key in client code | Refactor to server-only; blocking production |
| PCI data in logs | Remove immediately; PCI violation |
| CAPTCHA validation missing | Add to generate route; security issue |
| Webhook signature not verified | Add verification; security issue |
| Admin auth missing | Add requireAdmin; security issue |
| Rate limiter missing | Add to endpoint; abuse vector |

---

## Handoff to Next Task
_(fill via /task-handoff)_
