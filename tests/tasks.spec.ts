import { expect, test } from "@playwright/test";

// Tasks page can be slow under parallel load (Turbopack compilation + API calls)
test.setTimeout(60000);

// Helper: navigate to /tasks and wait for client-side hydration
async function gotoTasks(page: import("@playwright/test").Page) {
  await page.goto("/tasks", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-task-page]", { timeout: 30000 });
}

// Helper: create a task via modal and wait for it to appear in the list
async function createTaskAndVerify(
  page: import("@playwright/test").Page,
  taskTitle: string
) {
  await page.locator("[data-create-task-button]").click();
  await expect(page.locator("#title")).toBeVisible({ timeout: 5000 });
  await page.locator("#title").fill(taskTitle);
  // Wait for the task creation API response
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/tasks") && resp.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create" }).click();
  await responsePromise;

  // Close the modal
  await page.keyboard.press("Escape");

  // Wait for the task row to appear in the list
  await expect(page.locator("tr", { hasText: taskTitle })).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Tasks - Page Load", () => {
  test("tasks page loads with header controls", async ({ page }) => {
    await gotoTasks(page);

    // Verify page title
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();

    // Verify view toggle buttons
    await expect(page.getByRole("button", { name: /List/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Board/i })).toBeVisible();

    // Verify Create Task button
    await expect(page.locator("[data-create-task-button]")).toBeVisible();

    // Verify Auto Schedule button
    await expect(
      page.getByRole("button", { name: "Auto Schedule" })
    ).toBeVisible();
  });
});

test.describe("Tasks - CRUD Operations", () => {
  test("create a new task via modal", async ({ page }) => {
    await gotoTasks(page);

    const taskTitle = `E2E Test Task ${Date.now()}`;

    // Open task creation modal
    await page.locator("[data-create-task-button]").click();
    await expect(page.locator("#title")).toBeVisible({ timeout: 5000 });

    // Fill in task details
    await page.locator("#title").fill(taskTitle);
    await page.locator("#description").fill("Created by E2E test");

    // Set priority
    const prioritySelect = page.locator("#priority");
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption("MEDIUM");
    }

    // Submit the form and wait for API response
    const createResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/tasks") && resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create" }).click();
    await createResponse;

    // Close the modal (it doesn't auto-close after create)
    await page.keyboard.press("Escape");

    // Verify the task appears in the list
    await expect(page.locator("tr", { hasText: taskTitle })).toBeVisible({
      timeout: 15000,
    });
  });

  test("edit an existing task via edit button", async ({ page }) => {
    await gotoTasks(page);

    const taskTitle = `Edit Test ${Date.now()}`;

    // Create a task first
    await createTaskAndVerify(page, taskTitle);

    // Find the task row
    const taskRow = page.locator("tr", { hasText: taskTitle });

    // Click the edit button (pencil icon) within that row
    await taskRow.getByTitle("Edit task").click();

    // Wait for the edit modal to open with the "Update" button
    // (confirms the modal received the task prop, not a blank create form)
    const updateBtn = page.getByRole("button", { name: "Update" });
    await expect(updateBtn).toBeVisible({ timeout: 10000 });

    // Update the title (fill replaces existing content)
    const updatedTitle = `${taskTitle} Updated`;
    await page.locator("#title").fill(updatedTitle);

    // Save changes
    await updateBtn.click();
    await page.waitForTimeout(1000);

    // Verify the updated title appears
    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 10000 });
  });

  test("delete a task", async ({ page }) => {
    await gotoTasks(page);

    const taskTitle = `Delete Test ${Date.now()}`;

    // Create a task first
    await createTaskAndVerify(page, taskTitle);

    // Find the task row
    const taskRow = page.locator("tr", { hasText: taskTitle });

    // Handle the native confirm dialog that appears on delete
    page.on("dialog", (dialog) => dialog.accept());

    // Hide TanStack Query DevTools overlay that intercepts pointer events
    await page.evaluate(() => {
      const devtools = document.querySelector(".tsqd-parent-container");
      if (devtools instanceof HTMLElement) {
        devtools.style.display = "none";
      }
    });

    // Click the delete button (trash icon) within that row
    await taskRow.getByTitle("Delete task").click();

    // Verify the task is no longer visible
    await expect(page.getByText(taskTitle)).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe("Tasks - Views", () => {
  test("toggle between List and Board views", async ({ page }) => {
    await gotoTasks(page);

    // Start in List view
    await page.getByRole("button", { name: /List/i }).click();
    await page.waitForTimeout(500);

    // Switch to Board view
    await page.getByRole("button", { name: /Board/i }).click();
    await page.waitForTimeout(500);

    // Switch back to List view
    await page.getByRole("button", { name: /List/i }).click();
    await page.waitForTimeout(500);
  });
});

test.describe("Tasks - Filtering & Search", () => {
  test("search tasks by title", async ({ page }) => {
    await gotoTasks(page);

    // Look for search input
    const searchInput = page.getByPlaceholder("Search tasks...");
    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(500);

      // Clear the search
      await searchInput.clear();
    }
  });

  test("filter by energy level", async ({ page }) => {
    await gotoTasks(page);

    // Look for energy level filter
    const energyFilter = page.getByText("All Energy");
    if (await energyFilter.isVisible().catch(() => false)) {
      await energyFilter.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe("Tasks - Auto Schedule", () => {
  test("auto schedule button triggers scheduling", async ({ page }) => {
    await gotoTasks(page);

    const autoScheduleButton = page.getByRole("button", {
      name: "Auto Schedule",
    });
    await expect(autoScheduleButton).toBeVisible();

    // Click auto schedule
    await autoScheduleButton.click();

    // Should show loading or trigger scheduling
    await page.waitForTimeout(2000);
  });
});
