---
task: 19
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 18]
---

# Task 19: Redesign Auth Screen (Login/Signup)

## Objective
Create/update `app/(auth)/login/page.tsx` and `app/(auth)/layout.tsx`: centered card layout with radial gradient background, logo, heading, email/password inputs with focus states, Google SSO button, Sign In button.

## Files

### Create
| File | Purpose |
|------|---------|
| `app/(auth)/layout.tsx` | Full-screen auth layout with gradient background |
| `app/(auth)/login/page.tsx` | Centered login card with form |

### Modify
| File | What to change |
|------|---------------|
| `app/page.tsx` | Redirect to `/login` |

---

## Dependencies
- Task 1 (tokens)
- Task 2 (fonts)
- Supabase auth integration (existing)

---

## Design Spec
- Layout: `app/(auth)/layout.tsx` full-screen bg with radial teal+blue gradient
- Card: `max-width: 420px`, `border-radius: 24px` (rounded-xl), `shadow-lg`, `padding: 32px 36px`
- Logo: 72×72px, `rounded-lg` (16px), `object-cover`, from `public/logo.png`
- Heading: "Content Studio", 26px bold, `text-foreground`, -0.02em letter-spacing
- Subtitle: "Sign in to your workspace", 14px, `text-foreground-3`
- Google button: h-12, `bg-card`, `border border-border`, `rounded-sm` (8px)
- Email/Password: `border-foreground-4`, on focus: `border-secondary` + `ring-secondary/10`
- Sign In button: `bg-primary` `text-primary-foreground`, w-full, h-[52px], `rounded-md` (12px), 15px bold
- Signup link: "Don't have an account? Create"

---

## Implementation Steps

1. Create `app/(auth)/layout.tsx` with full-screen gradient background
2. Create `app/(auth)/login/page.tsx` with centered card
3. Implement form with email/password inputs
4. Add Google SSO button
5. Add Sign In button
6. Add signup link
7. Update `app/page.tsx` to redirect to `/login`
8. Test: verify card centred, gradient applied, form works

---

## Code Template (excerpt)

### `app/(auth)/layout.tsx`
```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(circle at 30% 50%, rgba(0,105,76,0.15), transparent), radial-gradient(circle at 70% 30%, rgba(0,96,168,0.1), transparent), hsl(var(--background))",
      }}
    >
      {children}
    </div>
  );
}
```

### `app/(auth)/login/page.tsx` (excerpt)
```tsx
<div className="w-full max-w-[420px] bg-card rounded-xl shadow-lg p-9">
  <Image src="/logo.png" alt="Content Studio" width={72} height={72} className="rounded-lg" />
  <h1 className="text-[26px] font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
    Content Studio
  </h1>
  <p className="text-[14px] text-foreground-3">Sign in to your workspace</p>
  {/* Form fields */}
</div>
```

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Inline styles for gradient | Use `var(--gradient-*)` tokens or CSS variables for gradients; if dynamic, map to design token values in style prop |
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

## Acceptance Criteria
- [ ] WHEN auth card renders THEN max-width is 420px and border-radius uses `var(--radius-xl)` token
- [ ] WHEN email input is focused THEN border is secondary colour token with ring
- [ ] WHEN page loads THEN radial gradient background is applied using token-mapped values
- [ ] WHEN Sign In button renders THEN background uses primary colour token
- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)

---

## Handoff to Next Task
**Files changed:** `app/(auth)/layout.tsx` created, `app/(auth)/login/page.tsx` created, `app/page.tsx` updated
**Context:** Auth screens are now designed. Task 20 is responsive testing and visual regression suite.

Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
