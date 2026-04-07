import { expect, test } from "@playwright/test";

test.describe("Focus Mode - Page Load", () => {
  test("focus page loads with three-panel layout", async ({ page }) => {
    await page.goto("/focus");

    // Wait for loading state to disappear
    await expect(page.getByText("Loading focus mode...")).toBeHidden({
      timeout: 10000,
    });

    // Verify three-panel layout using actual content from each panel
    // Left sidebar: Task queue with "Top Tasks" heading
    await expect(page.getByText("Top Tasks")).toBeVisible();
    // Right sidebar: Quick Actions panel
    await expect(page.getByText("Quick Actions")).toBeVisible();
    // Main content: shows task or "No task selected"
    const mainArea = page.locator("main.flex-1.overflow-y-auto");
    await expect(mainArea).toBeVisible();
  });

  test("task queue sidebar renders", async ({ page }) => {
    await page.goto("/focus");
    await expect(page.getByText("Loading focus mode...")).toBeHidden({
      timeout: 10000,
    });

    // TaskQueue shows "Top Tasks" heading in the left sidebar
    await expect(page.getByText("Top Tasks")).toBeVisible();
  });

  test("quick actions sidebar renders", async ({ page }) => {
    await page.goto("/focus");
    await expect(page.getByText("Loading focus mode...")).toBeHidden({
      timeout: 10000,
    });

    // QuickActions panel heading
    await expect(page.getByText("Quick Actions")).toBeVisible();
    // Action buttons should be visible
    await expect(page.getByText("Complete Task")).toBeVisible();
    await expect(page.getByText("Edit Task")).toBeVisible();
    await expect(page.getByText("Delete Task")).toBeVisible();
  });

  test("shows no-task-selected state", async ({ page }) => {
    await page.goto("/focus");
    await expect(page.getByText("Loading focus mode...")).toBeHidden({
      timeout: 10000,
    });

    // When no task is selected in the main area, shows this message
    await expect(page.getByText("No task selected")).toBeVisible();
  });
});
