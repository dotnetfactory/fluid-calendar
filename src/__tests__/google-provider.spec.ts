import { GoogleTaskProvider } from "@/lib/task-sync/providers/google-provider";
import { TaskStatus } from "@/types/task";

// Minimal fake shapes to avoid pulling in the googleapis namespace in tests
type FakeTaskListResponse = { data: { items: Array<{ id?: string; title?: string }>; nextPageToken?: string } };
type FakeTasksResponse = { data: { items: Array<{ id?: string; title?: string; notes?: string; status?: string; due?: string; completed?: string; updated?: string; selfLink?: string }>; nextPageToken?: string } };

describe("GoogleTaskProvider mapping", () => {
  const fakeClient = {
    tasklists: {
      list: jest.fn<Promise<FakeTaskListResponse>, [unknown?]>().mockResolvedValue({ data: { items: [] } }),
    },
    tasks: {
      list: jest.fn<Promise<FakeTasksResponse>, [unknown?]>().mockResolvedValue({ data: { items: [] } }),
    },
  } as unknown as ReturnType<typeof import("googleapis").google.tasks>;

  it("maps external task to internal task correctly", () => {
    const provider = new GoogleTaskProvider(fakeClient, "account-id", "user-id");

    const external: import("@/lib/task-sync/providers/task-provider.interface").ExternalTask = {
      id: "t1",
      title: "Buy milk",
      description: "2 liters",
      status: "needsAction",
      listId: "list-1",
      dueDate: new Date(0),
    };

    const result = provider.mapToInternalTask(external, "project-1");

    expect(result.title).toBe("Buy milk");
    expect(result.description).toBe("2 liters");
    expect(result.projectId).toBe("project-1");
    expect(result.status).toBe(TaskStatus.TODO);
  });
});
