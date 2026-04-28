---
task: "051"
feature: competitive-gaps-roadmap
rec: all
title: "Code review pass — all new API routes"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: code-reviewer
depends_on: ["009", "012", "016", "017", "021", "022", "025", "027", "031", "033", "036", "037"]
---

## Skills
- `.kit/skills/development/code-writing-software-development/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/code-reviewer.md`

## Commands
- `.kit/commands/development/code-review.md`

---

## Objective
Conduct a structured code review of all new API routes created in this feature, focusing on consistency, error handling, auth pattern compliance, and TypeScript correctness.

## Files to Review

All new route files:
- `app/api/ingest/route.ts`
- `app/api/roi/route.ts`
- `app/api/schedule/[id]/route.ts`
- `app/api/brand-voice/route.ts`
- `app/api/brand-voice/[id]/route.ts`
- `app/api/brand-voice/score/route.ts`
- `app/api/brief/route.ts`
- `app/api/brief/[id]/route.ts`
- `app/api/detect/route.ts`
- `app/api/edit/route.ts`
- `app/api/cluster/route.ts`
- `app/api/cluster/[id]/route.ts`
- `app/api/workspace/route.ts`
- `app/api/workspace/[id]/invite/route.ts`
- `app/api/approval/route.ts`
- `app/api/approval/[id]/route.ts`

## Review Checklist

For each route file:

1. **Auth pattern:** Uses `requireAuth` at top of handler (not inline)?
2. **OWASP comment:** `// OWASP checklist:` comment present?
3. **JSON parsing:** Body parsed in try/catch returning 400 on failure?
4. **Error format:** All errors follow `{ error: { code: string, message: string } }` shape?
5. **HTTP status codes:** 201 for creates, 200 for reads/updates, 400 bad request, 401 unauth, 403 forbidden, 404 not found, 409 conflict, 422 validation/business, 500 server error?
6. **TypeScript:** No `any` types in route handlers?
7. **Supabase client:** Uses client from `requireAuth` (not new client()) for user-scoped ops?
8. **Input sanitization:** String inputs from body pass through `sanitizeInput()`?
9. **Generic errors:** Catch blocks return generic message, not raw Error.message in production?

## Output

Create `D:/content-engine/.spec/competitive-gaps-roadmap/code-review-findings.md` listing:
- Route file
- Issues found (with line reference)
- Severity: Style / Warning / Error

Fix all Error-level issues inline. Document Warning-level issues for follow-up.

## Acceptance Criteria
- All routes reviewed against 9-item checklist.
- All Error-level issues fixed.
- Findings document created.
- No route missing auth check (would be Error severity).

Status: COMPLETE
Completed: 2026-04-28T12:00:00Z
Notes: 17 routes reviewed. 18 Error-level issues fixed (raw error messages leaked to clients). 31 warnings documented. See code-review-findings.md.
