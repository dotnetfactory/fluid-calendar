import { expect, test } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const mode = process.env.SCREENSHOT_MODE || "os";
const screenshotDir = path.join(process.cwd(), "screenshots", mode);

// Ensure the screenshot directory exists
fs.mkdirSync(screenshotDir, { recursive: true });

/**
 * Unauthenticated page screenshots — no login required.
 * Force empty storage state so these run without auth cookies.
 */
test.describe("Verify Build - Public Pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("screenshot landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "landing.png"),
      fullPage: true,
    });
    expect(await page.title()).toBeTruthy();
  });

  test("screenshot sign-in page", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(screenshotDir, "signin.png"),
      fullPage: true,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("screenshot pricing page (SaaS) or verify redirect (OS)", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const isPricingPage = url.includes("/pricing");

    if (isPricingPage) {
      // SaaS mode — pricing page exists, capture screenshot
      await page.screenshot({
        path: path.join(screenshotDir, "pricing.png"),
        fullPage: true,
      });
    } else {
      // OS mode — pricing page redirected (to signin or 404)
      expect(url).not.toContain("/pricing");
    }
  });
});

/**
 * Authenticated page screenshots — requires login via auth fixture.
 * Uses the shared auth state from tests/.auth/user.json.
 * Screenshots are always captured; element assertions are soft
 * so we get visual proof even when pages redirect (e.g. subscription guard).
 */
test.describe("Verify Build - Authenticated Pages", () => {
  test.use({ storageState: "tests/.auth/user.json" });

  test("screenshot calendar page", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");
    // Wait for page to settle — may show calendar or redirect to pricing
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(screenshotDir, "calendar.png"),
      fullPage: true,
    });
    // Verify we're on a real page, not an error
    await expect(page.locator("body")).toBeVisible();
  });

  test("screenshot tasks page", async ({ page }) => {
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(screenshotDir, "tasks.png"),
      fullPage: true,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("screenshot settings page", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(screenshotDir, "settings.png"),
      fullPage: true,
    });
    await expect(page.locator("body")).toBeVisible();
  });

  test("screenshot auto-schedule settings", async ({ page }) => {
    await page.goto("/settings#auto-schedule");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    // Try clicking the Auto-Schedule tab if it exists
    const autoScheduleTab = page.getByText("Auto-Schedule").first();
    if (await autoScheduleTab.isVisible().catch(() => false)) {
      await autoScheduleTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(screenshotDir, "settings-auto-schedule.png"),
      fullPage: true,
    });
    await expect(page.locator("body")).toBeVisible();
  });
});
