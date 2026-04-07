import { expect, test } from "@playwright/test";

// The sign-in page has two "Sign In" elements: a tab button and a form submit button.
// Use the form submit button for clicking.
const signInSubmit = 'button[type="submit"]:has-text("Sign In")';

test.describe("Auth - Sign In Page", () => {
  test("sign-in page renders with email and password form", async ({
    page,
  }) => {
    await page.goto("/auth/signin");

    // Verify form fields are visible
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator(signInSubmit)).toBeVisible();

    // Verify page heading
    await expect(
      page.getByText("Sign in to FluidCalendar")
    ).toBeVisible();
  });

  test("sign-in with invalid credentials shows error", async ({ page }) => {
    await page.goto("/auth/signin");

    await page.locator("#email").fill("invalid@example.com");
    await page.locator("#password").fill("wrongpassword");
    await page.locator(signInSubmit).click();

    // Should stay on sign-in page and show an error toast or message
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/auth/signin");
  });

  test("sign-in with valid credentials redirects to calendar", async ({
    page,
  }) => {
    test.skip(
      process.env.SKIP_AUTH_TEST === "true",
      "Explicitly skipped via SKIP_AUTH_TEST=true"
    );

    // Use defaults matching the auth fixture
    const email = process.env.TEST_USER_EMAIL || "test@fluidcalendar.com";
    const password = process.env.TEST_USER_PASSWORD || "testpassword123";

    await page.goto("/auth/signin");

    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator(signInSubmit).click();

    // Should redirect to calendar or setup page
    await page.waitForURL(/\/(calendar|setup)/, { timeout: 15000 });
    expect(page.url()).not.toContain("/auth/signin");
  });
});

test.describe("Auth - Protected Routes", () => {
  test("calendar redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/calendar");
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });

  test("tasks redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
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

  test("focus redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/focus");
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });
});

test.describe("Auth - Sign Up Tab", () => {
  test("sign-up tab is visible when public signup is enabled", async ({
    page,
  }) => {
    await page.goto("/auth/signin");

    // Sign Up tab may or may not be visible depending on config
    const signUpTab = page.getByRole("tab", { name: "Sign Up" });
    const isVisible = await signUpTab.isVisible().catch(() => false);

    if (isVisible) {
      await signUpTab.click();
      await expect(page.locator("#signup-email")).toBeVisible();
      await expect(page.locator("#signup-password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create Account" })
      ).toBeVisible();
    }
  });
});
