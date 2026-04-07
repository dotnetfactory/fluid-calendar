import { expect, test } from "@playwright/test";

test.describe("Password Reset - Request Form", () => {
  test("page loads with email form", async ({ page }) => {
    await page.goto("/auth/reset-password");

    // Verify heading
    await expect(
      page.getByRole("heading", { name: "Reset Password" })
    ).toBeVisible();

    // Verify email input and submit button
    await expect(page.locator("#email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send Reset Link" })
    ).toBeVisible();
  });

  test("back to sign in link navigates correctly", async ({ page }) => {
    await page.goto("/auth/reset-password");

    // Click "Back to Sign In" button
    await page.getByRole("button", { name: "Back to Sign In" }).click();

    // Should navigate to sign-in page
    await page.waitForURL(/\/auth\/signin/, { timeout: 5000 });
    expect(page.url()).toContain("/auth/signin");
  });

  test("shows validation for empty email", async ({ page }) => {
    await page.goto("/auth/reset-password");

    // Submit the form without filling email
    await page.getByRole("button", { name: "Send Reset Link" }).click();

    // Should show Zod validation error for required email
    await expect(
      page.getByText("Please enter a valid email address")
    ).toBeVisible();
  });
});

test.describe("Password Reset - Token Form", () => {
  test("shows password form when token param present", async ({ page }) => {
    await page.goto("/auth/reset-password?token=test-token");

    // Verify heading still says "Reset Password"
    await expect(
      page.getByRole("heading", { name: "Reset Password" })
    ).toBeVisible();

    // Verify description changes for token mode
    await expect(
      page.getByText("Enter your new password below")
    ).toBeVisible();

    // Verify password fields are visible
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reset Password" })
    ).toBeVisible();
  });

  test("shows validation for mismatched passwords", async ({ page }) => {
    await page.goto("/auth/reset-password?token=test-token");

    // Fill with mismatched passwords
    await page.locator("#password").fill("ValidPass1!");
    await page.locator("#confirmPassword").fill("DifferentPass1!");
    await page.getByRole("button", { name: "Reset Password" }).click();

    // Should show mismatch error
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });
});
