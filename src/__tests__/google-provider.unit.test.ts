import { GoogleTaskProvider } from "@/lib/task-sync/providers/google-provider";

describe("GoogleTaskProvider - pagination and retry", () => {
  it("fetches tasks across multiple pages", async () => {
    // First call returns one item and a nextPageToken
    const fakeClient = {
      tasks: {
        list: jest
          .fn()
          .mockResolvedValueOnce({ data: { items: [{ id: "a", title: "one" }], nextPageToken: "t1" } })
          .mockResolvedValueOnce({ data: { items: [{ id: "b", title: "two" }] } }),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    const tasks = await provider.getTasks("list-1");

    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("maps external `due` to internal startDate and ignores external due as dueDate", async () => {
    const fakeClient = {
      tasks: {
        list: jest.fn().mockResolvedValue({ data: { items: [{ id: "a", title: "one", due: "2025-07-01T00:00:00.000Z", start: "2025-06-30T00:00:00.000Z" }] } }),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");
    const tasks = await provider.getTasks("list-1");

    // `due` should map to internal startDate per single-date sync policy
    expect(tasks[0].startDate).toBeInstanceOf(Date);
    // dueDate should not be populated from external `due`
    expect(tasks[0].dueDate).toBeUndefined();
  });

  it("maps startDate in create and sends it as `due` on the external task", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fakeClient = {
      tasks: {
        insert: jest.fn().mockImplementation(({ requestBody }: { requestBody: Record<string, unknown> }) => {
          capturedBody = requestBody;
          return { data: { id: "x" } };
        }),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    await provider.createTask("list-1", { title: "t", startDate: new Date("2025-08-01T00:00:00.000Z") });

    // We send the internal startDate as external `due`
    expect((capturedBody! as Record<string, unknown>)["due"]).toBeDefined();
    expect(new Date((capturedBody! as Record<string, unknown>)["due"] as string).toISOString()).toBe(new Date("2025-08-01T00:00:00.000Z").toISOString());
    expect((capturedBody! as Record<string, unknown>)["start"]).toBeUndefined();
  });

  it("updates `due` when updates.startDate is provided", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fakeClient = {
      tasks: {
        patch: jest.fn().mockImplementation(({ requestBody }: { requestBody: Record<string, unknown> }) => {
          capturedBody = requestBody;
          return { data: { id: "x" } };
        }),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    await provider.updateTask("list-1", "t1", { startDate: new Date("2025-09-01T00:00:00.000Z") });

    expect((capturedBody! as Record<string, unknown>)["due"]).toBeDefined();
    expect(new Date((capturedBody! as Record<string, unknown>)["due"] as string).toISOString()).toBe(new Date("2025-09-01T00:00:00.000Z").toISOString());
  });

  it("does not send internal dueDate as external `due` on create (dueDate is local-only)", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fakeClient = {
      tasks: {
        insert: jest.fn().mockImplementation(({ requestBody }: { requestBody: Record<string, unknown> }) => {
          capturedBody = requestBody;
          return { data: { id: "x" } };
        }),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    await provider.createTask("list-1", { title: "t", dueDate: new Date("2025-10-01T00:00:00.000Z") });

    expect((capturedBody! as Record<string, unknown>)["due"]).toBeUndefined();
    expect((capturedBody! as Record<string, unknown>)["start"]).toBeUndefined();
  });

  it("ignores updates.dueDate (dueDate is local-only) and only applies updates.startDate", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fakeClient = {
      tasks: {
        patch: jest.fn().mockImplementation(({ requestBody }: { requestBody: Record<string, unknown> }) => {
          capturedBody = requestBody;
          return { data: { id: "x" } };
        }),
      },
      tasklists: { list: jest.fn().mockResolvedValue({ data: { items: [] } }) },
    } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

    const provider = new GoogleTaskProvider(fakeClient, "acc", "user");

    await provider.updateTask("list-1", "t1", { dueDate: new Date("2025-11-01T00:00:00.000Z") });
    // since dueDate is not mapped externally, patch body should not include `due`
    expect((capturedBody! as Record<string, unknown>)["due"]).toBeUndefined();

    await provider.updateTask("list-1", "t1", { dueDate: null });
    expect((capturedBody! as Record<string, unknown>)["due"]).toBeUndefined();
  });

  it("retries transient errors and succeeds", async () => {
    const transientError = Object.assign(new Error("Timeout"), { code: "ETIMEDOUT" });

    const fakeClient = {
      tasks: {
        list: jest
          .fn()
          .mockRejectedValueOnce(transientError)
          .mockResolvedValueOnce({ data: { items: [{ id: "c", title: "three" }] } }),
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