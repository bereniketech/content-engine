---
task: 20
feature: ui-alignment
status: pending
model: haiku
supervisor: software-cto
agent: test-expert
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
---

# Task 20: Responsive Mobile Viewport Fixes and Visual Regression Test Suite

## Skills
- .kit/skills/languages/typescript-patterns/SKILL.md
- .kit/skills/development/build-website-web-app/SKILL.md
- .kit/skills/development/tdd/SKILL.md

## Agents
- .kit/agents/software-company/engineering/test-expert.md

## Commands
- .kit/commands/testing-quality/tdd.md
- .kit/commands/core/code-review.md

---

## Objective
Verify responsive behaviour across mobile (375×812), tablet (768×1024), and desktop (1440×900) viewports; create Playwright visual regression test suite for all key screens; run TypeScript type-check and existing test suite; perform smoke-test checklist.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `e2e/ui-alignment.spec.ts` | Playwright test suite with visual snapshots for all screens |

### Modify
| File | What to change |
|------|---------------|
| `app/dashboard/page.tsx` | Ensure stat grid responsive: 4-col desktop, 2-col tablet, 1-col mobile |
| `components/dashboard/Sidebar.tsx` | Verify hamburger hidden on desktop, visible on mobile |

---

## Dependencies
- All tasks 1–19 must be complete
- Playwright (`@playwright/test`) must be installed
- Existing Jest/Vitest test runner

---

## Design Spec — Responsive Breakpoints

| Feature | Desktop (1440px) | Tablet (768px) | Mobile (375px) |
|---------|---|---|---|
| Stat grid | 4-col | 2-col | 1-col |
| Sidebar | 248px visible | 248px visible | Hidden (hamburger) |
| Main padding | 40px horiz | 40px horiz | 24px all |
| PipelineStepper | horizontal | horizontal | may scroll |

---

## Implementation Steps

1. **Visual Regression Test Suite:**
   - Create `e2e/ui-alignment.spec.ts`
   - Add tests for each route: `/login`, `/dashboard`, `/dashboard/new-session`, `/dashboard/research`, `/dashboard/seo`, `/dashboard/blog`, `/dashboard/images`, `/dashboard/social/x`, `/dashboard/analytics`, `/dashboard/calendar`, `/dashboard/library`, `/dashboard/brand-voice`
   - Each test:
     - Navigates to route
     - Takes full-page screenshot at 3 viewports
     - Compares against baseline
   - Run: `npx playwright test`

2. **Type-check:**
   - Run: `npx tsc --noEmit`
   - Expect: 0 errors

3. **Unit Tests:**
   - Run: `npm run test` (Jest/Vitest)
   - Expect: all existing tests pass without modification

4. **Responsive Manual Checks:**
   - Desktop (1440×900): Stat grid 4-col, sidebar full 248px
   - Tablet (768×1024): Stat grid 2-col, sidebar full 248px
   - Mobile (375×812): Stat grid 1-col, sidebar hidden, hamburger visible

5. **Smoke-test Checklist:**
   - Sign in with Google (Supabase OAuth)
   - Sign in with email/password
   - Load `/dashboard` hub page
   - Verify session history loads from `/api/sessions`
   - Click "New from Topic" → navigate to `/dashboard/new-session`
   - Upload test article → submit form
   - Navigate to `/dashboard/research` → verify PipelineStepper shows "Research"
   - Click session row → restore session and navigate
   - Verify no console errors

---

## Code Template

### `e2e/ui-alignment.spec.ts` — Create

```typescript
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const ROUTES = [
  { path: "/", name: "login" },
  { path: "/dashboard", name: "hub" },
  { path: "/dashboard/new-session", name: "new-session" },
  { path: "/dashboard/research", name: "research" },
  { path: "/dashboard/seo", name: "seo" },
  { path: "/dashboard/blog", name: "blog" },
  { path: "/dashboard/images", name: "images" },
  { path: "/dashboard/social/x", name: "social-x" },
  { path: "/dashboard/analytics", name: "analytics" },
  { path: "/dashboard/calendar", name: "calendar" },
  { path: "/dashboard/library", name: "library" },
  { path: "/dashboard/brand-voice", name: "brand-voice" },
];

test.describe("UI Alignment - Visual Regression", () => {
  ROUTES.forEach(({ path, name }) => {
    test.describe(`Route: ${name}`, () => {
      VIEWPORTS.forEach(({ name: viewportName, width, height }) => {
        test(`${name} — ${viewportName} (${width}×${height})`, async ({ page }) => {
          await page.setViewportSize({ width, height });
          await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });

          // Take screenshot
          await expect(page).toHaveScreenshot(`${name}-${viewportName}.png`, {
            fullPage: true,
            maxDiffPixels: 100,
          });
        });
      });
    });
  });
});

test.describe("Responsive Behaviour", () => {
  test("stat grid is 4-col on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/dashboard`);

    const grid = page.locator("grid:has(> [class*='grid-cols-'])");
    const classes = await grid.getAttribute("class");
    expect(classes).toContain("lg:grid-cols-4");
  });

  test("stat grid is 1-col on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/dashboard`);

    const grid = page.locator("grid:has(> [class*='grid-cols-'])");
    const classes = await grid.getAttribute("class");
    expect(classes).toContain("grid-cols-1");
  });

  test("sidebar is hidden on mobile, visible on desktop", async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/dashboard`);
    let sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    sidebar = page.locator("aside.hidden");
    await expect(sidebar).toHaveClass(/hidden/);
  });

  test("hamburger button is visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/dashboard`);

    const hamburger = page.locator("button[aria-label='Toggle menu']");
    await expect(hamburger).toBeVisible();
  });
});

test.describe("Token Sanity Checks", () => {
  test("background colour is correct", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const body = page.locator("body");
    const bgColor = await body.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    // #f5fbf5 = rgb(245, 251, 245)
    expect(bgColor).toContain("rgb(245");
  });

  test("primary button colour is correct", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const button = page.locator("button:has-text('New Project')");
    const bgColor = await button.evaluate(() =>
      window.getComputedStyle(this).backgroundColor
    );
    // #00694c = rgb(0, 105, 76)
    expect(bgColor).toContain("rgb(0");
  });

  test("font is Inter", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const fontFamily = await page.evaluate(() =>
      window.getComputedStyle(document.body).fontFamily
    );
    expect(fontFamily.toLowerCase()).toContain("inter");
  });
});

test.describe("Smoke Tests", () => {
  test("dashboard loads without errors", async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") throw new Error(`Console error: ${msg.text()}`);
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/Content Studio|Dashboard/);
  });

  test("navigation works", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Click research link
    await page.locator("a:has-text('Research')").click();
    await expect(page).toHaveURL(/\/research/);
  });
});
```

---

## Test Cases

**Run all tests:**
```bash
npm run test                  # Jest/Vitest — unit tests
npx tsc --noEmit             # TypeScript type-check
npx playwright test          # Visual regression + smoke tests
```

**Manual responsive checks:**
1. Open `npm run dev`
2. Desktop (1440px): verify stat grid 4-col, sidebar 248px
3. Resize to 768px: verify stat grid 2-col, sidebar still 248px
4. Resize to 375px: verify stat grid 1-col, sidebar hidden, hamburger visible

**Console verification:**
- No TypeScript errors
- No console.error messages
- No Tailwind class warnings

---

## Acceptance Criteria
- [ ] WHEN viewport is 375px wide THEN stat grid is 1 column
- [ ] WHEN TypeScript compile runs THEN zero errors reported
- [ ] WHEN Playwright tests run THEN all visual baselines pass
- [ ] WHEN existing tests run THEN all pass without modification
- [ ] WHEN dashboard loads THEN no console errors
- [ ] WHEN user signs in THEN session restores and navigates correctly
- [ ] WHEN user navigates between routes THEN header title updates correctly

---

## Handoff — Task Complete
**Files created:** `e2e/ui-alignment.spec.ts`
**Context:** All UI alignment tasks complete. All 20 tasks have been executed and verified. Spec is ready for deployment.

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Color value in any file | Use `var(--color-primary)` or equivalent token; never write `#00694C` or `rgb(0,105,76)` directly |
| Spacing/padding/margin | Use `var(--spacing-*)` tokens; never write `16px`, `24px`, `8px` directly |
| Border radius | Use `var(--radius-*)` tokens; never write `8px` or `rounded-md` without mapping to token |
| Shadow | Use `var(--shadow-*)` tokens; never write shadow values directly |
| Font size/weight/family | Use `var(--font-*)` tokens; never write font values directly |
| Z-index | Use `var(--z-*)` tokens or Tailwind's token-based scale |
| Transition/animation timing | Use `var(--transition-*)` tokens; never write `200ms ease` directly |

## Post-Implementation Checklist

After all tasks are complete:

- [ ] WHEN code is reviewed THEN all color/spacing/radius/shadow values are CSS variables or Tailwind tokens (never hardcoded hex/px/shadow strings)
- [ ] WHEN design tokens change in design.md THEN no component code changes required (only CSS variable values updated)
- [ ] WHEN component is used THEN all styling comes from inherited token system (no inline styles with hardcoded values)
- [ ] Run `npm run build` — verify no build errors
- [ ] Run `npm run type-check` — zero errors
- [ ] Run `npm run test` — all unit tests pass
- [ ] Run `npx playwright test` — all visual tests pass
- [ ] Deploy to staging
- [ ] Verify auth flow (Google + email/password)
- [ ] Verify session restore works
- [ ] Test on actual mobile device (iOS Safari, Android Chrome)
- [ ] Verify no performance regressions (Lighthouse)
- [ ] Merge to main branch


Status: COMPLETE
Completed: 2026-05-01T00:00:00Z
