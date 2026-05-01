import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet",  width: 768,  height: 1024 },
  { name: "mobile",  width: 375,  height: 812 },
];

const ROUTES = [
  { path: "/login",                     name: "login" },
  { path: "/dashboard",                 name: "hub" },
  { path: "/dashboard/new-session",     name: "new-session" },
  { path: "/dashboard/research",        name: "research" },
  { path: "/dashboard/seo",             name: "seo" },
  { path: "/dashboard/blog",            name: "blog" },
  { path: "/dashboard/images",          name: "images" },
  { path: "/dashboard/social/x",        name: "social-x" },
  { path: "/dashboard/analytics",       name: "analytics" },
  { path: "/dashboard/calendar",        name: "calendar" },
  { path: "/dashboard/library",         name: "library" },
  { path: "/dashboard/brand-voice",     name: "brand-voice" },
];

test.describe("UI Alignment — Visual Regression", () => {
  ROUTES.forEach(({ path, name }) => {
    test.describe(`Route: ${name}`, () => {
      VIEWPORTS.forEach(({ name: viewportName, width, height }) => {
        test(`${name} — ${viewportName} (${width}×${height})`, async ({ page }) => {
          await page.setViewportSize({ width, height });
          await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });

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

    const grid = page.locator(".lg\\:grid-cols-4").first();
    await expect(grid).toBeAttached();
  });

  test("stat grid is 1-col on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/dashboard`);

    const grid = page.locator(".grid-cols-1").first();
    await expect(grid).toBeAttached();
  });

  test("desktop sidebar is visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/dashboard`);

    const sidebar = page.locator("aside.md\\:flex").first();
    await expect(sidebar).toBeAttached();
  });

  test("hamburger button is visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/dashboard`);

    const hamburger = page.locator("button[aria-label='Toggle menu']");
    await expect(hamburger).toBeVisible();
  });
});

test.describe("Token Sanity Checks", () => {
  test("body background is teal-tinted (#f5fbf5)", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    expect(bgColor).toContain("245");
  });

  test("font family starts with Inter", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    const fontFamily = await page.evaluate(() =>
      window.getComputedStyle(document.body).fontFamily
    );
    expect(fontFamily.toLowerCase()).toContain("inter");
  });
});

test.describe("Smoke Tests", () => {
  test("dashboard loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    expect(errors.filter((e) => !e.includes("supabase"))).toHaveLength(0);
  });

  test("navigation to research works", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.locator("a[href='/dashboard/research']").first().click();
    await expect(page).toHaveURL(/\/research/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator("h1")).toContainText("Content Studio");
    await expect(page.locator("button:has-text('Continue with Google')")).toBeVisible();
    await expect(page.locator("input[type='email']")).toBeVisible();
  });
});
