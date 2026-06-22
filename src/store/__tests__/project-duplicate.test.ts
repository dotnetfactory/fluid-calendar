import { useProjectStore } from "@/store/project";
import { useTaskStore } from "@/store/task";

import { Project, ProjectStatus } from "@/types/project";

describe("useProjectStore.duplicateProject", () => {
  const newProject: Project = {
    id: "new-1",
    name: "Copy of Acme",
    status: ProjectStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { tasks: 2 },
  };

  beforeEach(() => {
    useProjectStore.setState({ projects: [], error: null, loading: false });
    // `fetchTasks` is spied on the live task-store singleton; clear call
    // history (clearAllMocks) before restoring the original implementation so
    // no spy's call count leaks into the next test.
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("POSTs the new name to the duplicate endpoint", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => newProject,
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(useTaskStore.getState(), "fetchTasks").mockResolvedValue();

    await useProjectStore.getState().duplicateProject("src-1", "Copy of Acme");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/src-1/duplicate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Copy of Acme" }),
      })
    );
  });

  it("prepends the duplicated project to state", async () => {
    const existing: Project = {
      id: "existing-1",
      name: "Existing",
      status: ProjectStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    useProjectStore.setState({ projects: [existing] });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => newProject,
    }) as unknown as typeof fetch;
    jest.spyOn(useTaskStore.getState(), "fetchTasks").mockResolvedValue();

    await useProjectStore.getState().duplicateProject("src-1");

    const { projects } = useProjectStore.getState();
    expect(projects.map((p) => p.id)).toEqual(["new-1", "existing-1"]);
  });

  it("refreshes the task store and reports tasksRefreshed on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => newProject,
    }) as unknown as typeof fetch;
    const fetchTasks = jest
      .spyOn(useTaskStore.getState(), "fetchTasks")
      .mockImplementation(async () => {
        // A successful refresh clears any prior task-store error.
        useTaskStore.setState({ error: null });
      });

    const result = await useProjectStore
      .getState()
      .duplicateProject("src-1");

    expect(fetchTasks).toHaveBeenCalledTimes(1);
    expect(result.project.id).toBe("new-1");
    expect(result.tasksRefreshed).toBe(true);
  });

  it("throws and records an error when the request fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    const fetchTasks = jest
      .spyOn(useTaskStore.getState(), "fetchTasks")
      .mockResolvedValue();

    await expect(
      useProjectStore.getState().duplicateProject("src-1")
    ).rejects.toThrow();
    expect(useProjectStore.getState().error).toBeInstanceOf(Error);
    expect(fetchTasks).not.toHaveBeenCalled();
  });

  it("reports tasksRefreshed=false (not a failure) when the post-commit task refresh fails", async () => {
    // The server-side duplicate succeeds, but the follow-up task refresh
    // fails. `fetchTasks` swallows its own error (records it on the task
    // store and resolves). The duplicate must NOT be reported as a failure
    // in this case: that would invite the user to retry and create a second
    // copy. Instead it resolves successfully with tasksRefreshed=false so the
    // caller can prompt a reload.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => newProject,
    }) as unknown as typeof fetch;
    jest
      .spyOn(useTaskStore.getState(), "fetchTasks")
      .mockImplementation(async () => {
        useTaskStore.setState({ error: new Error("Failed to fetch tasks") });
      });

    const result = await useProjectStore
      .getState()
      .duplicateProject("src-1");

    expect(result.project.id).toBe("new-1");
    expect(result.tasksRefreshed).toBe(false);
    // The duplicate itself did not fail, so the project store error stays null.
    expect(useProjectStore.getState().error).toBeNull();
  });
});
