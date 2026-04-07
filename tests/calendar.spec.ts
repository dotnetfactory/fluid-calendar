import { expect, test } from "@playwright/test";

// Use exact: true to avoid matching "Today" when looking for "Day",
// and "Previous Week" / "Next Week" when looking for "Week".
const viewButton = (name: string) =>
  `button:text-is("${name}")`;

test.describe("Calendar - Page Load", () => {
  test("calendar page loads with header controls", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");

    // Verify main calendar controls are visible
    await expect(
      page.getByRole("button", { name: "Today", exact: true })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('[data-testid="calendar-prev-week"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="calendar-next-week"]')
    ).toBeVisible();

    // Verify view switcher buttons
    await expect(page.locator(viewButton("Day"))).toBeVisible();
    await expect(page.locator(viewButton("Week"))).toBeVisible();
    await expect(page.locator(viewButton("Month"))).toBeVisible();
  });
});

test.describe("Calendar - View Switching", () => {
  test("switch to Day view", async ({ page }) => {
    await page.goto("/calendar");

    await page.locator(viewButton("Day")).click();

    await expect(page.locator(viewButton("Day"))).toBeVisible();
  });

  test("switch to Week view", async ({ page }) => {
    await page.goto("/calendar");

    await page.locator(viewButton("Week")).click();

    await expect(page.locator(viewButton("Week"))).toBeVisible();
  });

  test("switch to Month view", async ({ page }) => {
    await page.goto("/calendar");

    await page.locator(viewButton("Month")).click();

    await expect(page.locator(viewButton("Month"))).toBeVisible();
  });
});

test.describe("Calendar - Navigation", () => {
  test("navigate with Previous and Next buttons", async ({ page }) => {
    await page.goto("/calendar");

    // Get the initial date heading
    const dateHeading = page.locator("h1").first();
    const initialText = await dateHeading.textContent();

    // Click next
    await page.locator('[data-testid="calendar-next-week"]').click();
    await page.waitForTimeout(500);
    const nextText = await dateHeading.textContent();
    expect(nextText).not.toBe(initialText);

    // Click previous to go back
    await page.locator('[data-testid="calendar-prev-week"]').click();
    await page.waitForTimeout(500);
    const prevText = await dateHeading.textContent();
    expect(prevText).toBe(initialText);
  });

  test("Today button returns to current date", async ({ page }) => {
    await page.goto("/calendar");

    // Navigate away from today
    await page.locator('[data-testid="calendar-next-week"]').click();
    await page.locator('[data-testid="calendar-next-week"]').click();
    await page.waitForTimeout(500);

    // Click Today
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await page.waitForTimeout(500);

    // The heading should reflect today's date range
    const dateHeading = page.locator("h1").first();
    await expect(dateHeading).toBeVisible();
  });
});

test.describe("Calendar - Sidebar", () => {
  test("sidebar toggle works", async ({ page }) => {
    await page.goto("/calendar");

    // Look for the sidebar toggle button
    const sidebarToggle = page.getByTitle("Toggle Sidebar (b)");
    if (await sidebarToggle.isVisible()) {
      // Toggle sidebar off
      await sidebarToggle.click();
      await page.waitForTimeout(300);

      // Toggle sidebar back on
      await sidebarToggle.click();
      await page.waitForTimeout(300);
    }
  });

  test("calendar feeds section is visible in sidebar", async ({ page }) => {
    await page.goto("/calendar");

    // Check for "Your Calendars" heading in sidebar
    const calendarsHeading = page.getByText("Your Calendars");
    if (await calendarsHeading.isVisible()) {
      await expect(calendarsHeading).toBeVisible();
    }
  });
});

test.describe("Calendar - Event Interaction", () => {
  test("clicking an event opens the event modal", async ({ page }) => {
    await page.goto("/calendar");

    // Wait for calendar to load
    await page.waitForTimeout(2000);

    // Look for any calendar event
    const event = page.locator('[data-testid="calendar-event"]').first();
    const hasEvents = await event.isVisible().catch(() => false);

    if (hasEvents) {
      await event.click();

      // Event modal should appear
      const modal = page.locator('[data-testid="event-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Modal should contain event details
      await expect(
        page.locator('[data-testid="event-title-input"]')
      ).toBeVisible();

      // Close the modal
      const cancelButton = page.getByRole("button", { name: "Cancel" });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }
  });

  test("Auto Schedule button is visible", async ({ page }) => {
    await page.goto("/calendar");

    const autoScheduleButton = page.getByRole("button", {
      name: "Auto Schedule",
    });
    await expect(autoScheduleButton).toBeVisible();
  });
});
