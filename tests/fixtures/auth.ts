import { test as setup, expect } from "@playwright/test";

const authFile = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || "test@fluidcalendar.com";
  const password = process.env.TEST_USER_PASSWORD || "testpassword123";

  // Sign in
  await page.goto("/auth/signin");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]:has-text("Sign In")').click();

  // Wait for redirect — may go to /calendar, /setup, or /pricing
  await page.waitForURL(/\/(calendar|setup|pricing)/, { timeout: 15000 });
  expect(page.url()).not.toContain("/auth/signin");

  // Activate trial subscription if redirected to pricing
  if (page.url().includes("/pricing")) {
    // Use the page's fetch to call the trial API (inherits auth cookies)
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/subscription/trial/activate", {
        method: "POST",
      });
      return { status: res.status, body: await res.json() };
    });

    if (result.status === 200 || result.body?.error?.includes("already")) {
      // Trial activated or already active — navigate to calendar
      await page.goto("/calendar");
      await page.waitForURL(/\/calendar/, { timeout: 15000 });
    }
  }

  // Save storage state for reuse
  await page.context().storageState({ path: authFile });
});
