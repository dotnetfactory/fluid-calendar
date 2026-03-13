/**
 * Integration tests for Google Tasks provider
 *
 * These tests are skipped by default. To run them, set the following env vars:
 * - RUN_GOOGLE_INTEGRATION_TESTS=true
 * - GOOGLE_TEST_ACCOUNT_ID=<connectedAccount.id>
 * - GOOGLE_TEST_USER_ID=<connectedAccount.userId>
 * - GOOGLE_TEST_LIST_ID=<tasklist id to use for testing>
 *
 * Be careful: these tests operate on a real Google Tasks account and will create/update/delete tasks.
 */

const enabled = process.env.RUN_GOOGLE_INTEGRATION_TESTS === "true";

const accountId = process.env.GOOGLE_TEST_ACCOUNT_ID;
const userId = process.env.GOOGLE_TEST_USER_ID;
const listId = process.env.GOOGLE_TEST_LIST_ID;

describe("Google Tasks integration", () => {
  if (!enabled || !accountId || !userId || !listId) {
    test.skip("integration tests disabled or missing env vars", () => {});
    return;
  }

  jest.setTimeout(30000);

  it("can create, update, and delete a task", async () => {
    const { getGoogleTasksClient } = await import("@/lib/task-sync/providers/google-provider");
    const client = await getGoogleTasksClient(accountId, userId);

    // Create
    const created = (await client.tasks.insert({ tasklist: listId, requestBody: { title: "FC Integration Test - create" } })).data;
    expect(created.id).toBeTruthy();

    // Update
    const updated = (await client.tasks.patch({ tasklist: listId, task: created.id!, requestBody: { notes: "updated note" } })).data;
    expect(updated.notes).toBe("updated note");

    // Delete
    await client.tasks.delete({ tasklist: listId, task: created.id! });

    // Confirm deletion by attempting to get the task (should 404)
    let got = null;
    try {
      got = (await client.tasks.get({ tasklist: listId, task: created.id! })).data;
    } catch {
      // expected
    }

    expect(got).toBeNull();
  });
});
