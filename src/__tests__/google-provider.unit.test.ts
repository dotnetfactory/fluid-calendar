import { GoogleTaskProvider } from "@/lib/task-sync/providers/google-provider";

describe("GoogleTaskProvider - pagination and retry", () => {
  it("fetches tasks across multiple pages", async () => {
    // First call returns one item and a nextPageToken
    const fakeClient = {
      tasks: {
        list: jest
          .fn()
          .mockResolvedValueOnce({
            data: { items: [{ id: "a", title: "one" }], nextPageToken: "t1" },
          })
          .mockResolvedValueOnce({
            data: { items: [{ id: "b", title: "two" }] },
          }),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    const tasks = await provider.getTasks("list-1");

    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("maps Google `due` to canonical dueDate without importing a local startDate", async () => {
    const fakeClient = {
      tasks: {
        list: jest.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: "a",
                title: "one",
                due: "2025-07-01T00:00:00.000Z",
                start: "2025-06-30T00:00:00.000Z",
              },
            ],
          },
        }),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");
    const tasks = await provider.getTasks("list-1");

    // The task-sync contract keeps startDate local and uses dueDate for provider dates.
    expect(tasks[0].dueDate).toEqual(new Date("2025-07-01T00:00:00.000Z"));
    expect(tasks[0].startDate).toBeUndefined();
  });

  it("sends canonical dueDate as Google `due` when creating a task", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fakeClient = {
      tasks: {
        insert: jest
          .fn()
          .mockImplementation(
            ({ requestBody }: { requestBody: Record<string, unknown> }) => {
              capturedBody = requestBody;
              return { data: { id: "x" } };
            }
          ),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    await provider.createTask("list-1", {
      title: "t",
      dueDate: new Date("2025-08-01T00:00:00.000Z"),
    });

    // Google API field names are introduced only at the provider boundary.
    expect(capturedBody?.due).toBeDefined();
    expect(capturedBody?.due).toBe("2025-08-01T00:00:00.000Z");
    expect(capturedBody?.start).toBeUndefined();
  });

  it("updates and clears Google `due` from canonical dueDate", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fakeClient = {
      tasks: {
        patch: jest
          .fn()
          .mockImplementation(
            ({ requestBody }: { requestBody: Record<string, unknown> }) => {
              capturedBody = requestBody;
              return { data: { id: "x" } };
            }
          ),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    await provider.updateTask("list-1", "t1", {
      dueDate: new Date("2025-09-01T00:00:00.000Z"),
    });

    expect(capturedBody?.due).toBeDefined();
    expect(capturedBody?.due).toBe("2025-09-01T00:00:00.000Z");
    await provider.updateTask("list-1", "t1", { dueDate: null });
    expect(capturedBody).toEqual({ due: null });
  });

  it("does not send local startDate as Google `due` on create", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fakeClient = {
      tasks: {
        insert: jest
          .fn()
          .mockImplementation(
            ({ requestBody }: { requestBody: Record<string, unknown> }) => {
              capturedBody = requestBody;
              return { data: { id: "x" } };
            }
          ),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    await provider.createTask("list-1", {
      title: "t",
      startDate: new Date("2025-10-01T00:00:00.000Z"),
    });

    expect(capturedBody?.due).toBeUndefined();
    expect(capturedBody?.start).toBeUndefined();
  });

  it("does not send or clear Google `due` when only local startDate changes", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fakeClient = {
      tasks: {
        patch: jest
          .fn()
          .mockImplementation(
            ({ requestBody }: { requestBody: Record<string, unknown> }) => {
              capturedBody = requestBody;
              return { data: { id: "x" } };
            }
          ),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    await provider.updateTask("list-1", "t1", {
      startDate: new Date("2025-11-01T00:00:00.000Z"),
    });
    // Local scheduling changes must not alter the provider date.
    expect(capturedBody?.due).toBeUndefined();

    await provider.updateTask("list-1", "t1", { startDate: null });
    expect(capturedBody).toEqual({});
  });

  it("retries transient errors and succeeds", async () => {
    const transientError = Object.assign(new Error("Timeout"), {
      code: "ETIMEDOUT",
    });

    const fakeClient = {
      tasks: {
        list: jest
          .fn()
          .mockRejectedValueOnce(transientError)
          .mockResolvedValueOnce({
            data: { items: [{ id: "c", title: "three" }] },
          }),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    const tasks = await provider.getTasks("list-1");

    expect(tasks).toHaveLength(1);
    expect(fakeClient.tasks.list).toHaveBeenCalledTimes(2);
  });

  it("throws on permanent errors without retry", async () => {
    const permanentError = new Error("Bad request");

    const fakeClient = {
      tasks: {
        list: jest.fn().mockRejectedValue(permanentError),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    await expect(provider.getTasks("list-1")).rejects.toThrow("Bad request");
    expect(fakeClient.tasks.list).toHaveBeenCalledTimes(1);
  });
});
