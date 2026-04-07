import { expect, test } from "@playwright/test";

/**
 * E2E tests for the landing page at `/`.
 * Verifies the landing page renders correctly in both SaaS and OS modes
 * (the mode depends on the running server configuration).
 */

test.describe("Landing Page", () => {
  test("landing page returns 200 and is not blank", async ({ page }) => {
    const response = await page.goto("/", {
      waitUntil: "networkidle",
    });
    expect(response?.status()).toBe(200);

    // Page body should have visible content (not blank/white)
    const bodyText = await page.evaluate(
      () => document.body.innerText.trim().length
    );
    expect(bodyText).toBeGreaterThan(100);
  });

  test("landing page has navigation with FluidCalendar branding", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Nav should contain the FluidCalendar brand
    await expect(page.getByText("FluidCalendar").first()).toBeVisible();
  });

  test("landing page has a hero section with heading", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Should have an h1 heading
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    const h1Text = await h1.textContent();
    expect(h1Text?.length).toBeGreaterThan(10);
  });

  test("landing page has a sign-in or CTA button", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Should have a sign-in or trial CTA button
    const signInButton = page.getByRole("button", { name: /sign in/i });
    const trialButton = page.getByRole("button", { name: /free|trial|get/i });

    const hasSignIn = await signInButton.isVisible().catch(() => false);
    const hasTrial = await trialButton.isVisible().catch(() => false);

    expect(hasSignIn || hasTrial).toBe(true);
  });

  test("landing page has a features section", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Should have a Features heading or section
    await expect(page.getByText("Features").first()).toBeVisible();
  });

  test("landing page has no server error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto("/", { waitUntil: "networkidle" });

    expect(response?.status()).toBeLessThan(500);
    // Should not contain Next.js error messages
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("Application error");
  });

  test("landing page screenshot is not blank", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const screenshot = await page.screenshot();
    // Screenshot should be a non-trivial size (blank pages produce very small screenshots)
    expect(screenshot.byteLength).toBeGreaterThan(10000);
  });
});
