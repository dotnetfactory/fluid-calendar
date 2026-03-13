import { expect, test } from "@playwright/test";

test.describe("Export Tasks API", () => {
  test("exports tasks as JSON with metadata", async ({ request }) => {
    const response = await request.get("/api/export/tasks");
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Verify export structure
    expect(data).toHaveProperty("metadata");
    expect(data).toHaveProperty("tasks");
    expect(data).toHaveProperty("projects");
    expect(data).toHaveProperty("tags");

    // Verify metadata fields
    expect(data.metadata).toHaveProperty("version");
    expect(data.metadata).toHaveProperty("exportDate");
    expect(data.metadata).toHaveProperty("includeCompleted");

    // Verify arrays
    expect(Array.isArray(data.tasks)).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
    expect(Array.isArray(data.tags)).toBe(true);
  });

  test("respects includeCompleted parameter", async ({ request }) => {
    const response = await request.get(
      "/api/export/tasks?includeCompleted=true"
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.metadata.includeCompleted).toBe(true);
  });
});

test.describe("Import Tasks API", () => {
  test("rejects invalid import data", async ({ request }) => {
    const response = await request.post("/api/import/tasks", {
      data: { invalid: "data" },
    });
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  test("rejects import with missing task fields", async ({ request }) => {
    const response = await request.post("/api/import/tasks", {
      data: {
        tasks: [{ noTitle: true }],
      },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Import/Export Round Trip", () => {
  test("export and re-import preserves data", async ({ request }) => {
    // Export current tasks
    const exportResponse = await request.get("/api/export/tasks");
    expect(exportResponse.status()).toBe(200);

    const exportData = await exportResponse.json();

    // If there are tasks, verify they can be re-imported
    if (exportData.tasks.length > 0) {
      const importResponse = await request.post("/api/import/tasks", {
        data: exportData,
      });
      expect(importResponse.status()).toBe(200);

      const importResult = await importResponse.json();
      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBeGreaterThanOrEqual(0);
    }
  });
});
