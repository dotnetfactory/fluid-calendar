import { expect, test } from "@playwright/test";

/**
 * Smoke tests to verify the app loads correctly after the SaaS submodule migration.
 * These tests check that public pages render, protected routes redirect,
 * and SaaS-specific routes are available.
 */

test.describe("Smoke Tests - Public Pages", () => {
  test("landing page loads", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/auth/signin");
    // Should render the sign-in page without errors
    await expect(page.locator("body")).toBeVisible();
    // Should not show a Next.js error overlay
    await expect(page.locator("#__next-build-error")).not.toBeVisible();
  });

  test("terms page loads", async ({ page }) => {
    const response = await page.goto("/terms");
    expect(response?.status()).toBeLessThan(500);
  });

  test("privacy page loads", async ({ page }) => {
    const response = await page.goto("/privacy");
    expect(response?.status()).toBeLessThan(500);
  });

  test("learn page loads", async ({ page }) => {
    const response = await page.goto("/learn");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Smoke Tests - SaaS Routes", () => {
  test("pricing page loads", async ({ page }) => {
    const response = await page.goto("/pricing");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("beta page loads", async ({ page }) => {
    const response = await page.goto("/beta");
    expect(response?.status()).toBeLessThan(500);
  });

  test("beta join page loads", async ({ page }) => {
    const response = await page.goto("/beta/join");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Smoke Tests - Protected Routes Redirect", () => {
  test("calendar redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/calendar");
    // Should redirect to sign-in page
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });

  test("tasks redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/tasks");
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });

  test("settings redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });

  test("focus redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/focus");
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });
});

test.describe("Smoke Tests - API Health", () => {
  test("API routes return valid responses (not 500)", async ({ request }) => {
    // These endpoints should return 401 (unauthorized) not 500 (server error)
    const endpoints = [
      "/api/calendar/feeds",
      "/api/tasks",
      "/api/subscription/status",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(
        response.status(),
        `${endpoint} returned ${response.status()}`
      ).not.toBe(500);
    }
  });
});
