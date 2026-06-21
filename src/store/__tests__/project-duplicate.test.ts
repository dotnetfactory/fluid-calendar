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

  it("refreshes the task store so cloned tasks appear immediately", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => newProject,
    }) as unknown as typeof fetch;
    const fetchTasks = jest
      .spyOn(useTaskStore.getState(), "fetchTasks")
      .mockResolvedValue();

    await useProjectStore.getState().duplicateProject("src-1");

    expect(fetchTasks).toHaveBeenCalledTimes(1);
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
});
