import { prisma } from "@/lib/prisma";
import { TaskSyncManager } from "@/lib/task-sync/task-sync-manager";
import { CalDAVFieldMapper } from "@/lib/task-sync/providers/caldav-field-mapper";
import {
  ExternalTask,
  TaskProviderInterface,
} from "@/lib/task-sync/providers/task-provider.interface";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    taskListMapping: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    task: {
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    taskChange: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockPrisma = prisma as unknown as {
  taskListMapping: { findUnique: jest.Mock; update: jest.Mock };
  task: {
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  taskChange: { findMany: jest.Mock };
};

const WRITE_NOT_SUPPORTED = "CalDAV task write-back is not supported";

/**
 * A provider that reports it does not support write-back and throws on any
 * write call, mirroring the CalDAV import-only provider (GitHub issue #144).
 */
function makeImportOnlyProvider(
  externalTasks: ExternalTask[]
): TaskProviderInterface {
  return {
    getType: () => "CALDAV",
    getName: () => "CalDAV Tasks",
    supportsWriteBack: () => false,
    getTaskLists: jest.fn(),
    getTasks: jest.fn().mockResolvedValue(externalTasks),
    createTask: jest.fn().mockRejectedValue(new Error(WRITE_NOT_SUPPORTED)),
    updateTask: jest.fn().mockRejectedValue(new Error(WRITE_NOT_SUPPORTED)),
    deleteTask: jest.fn().mockRejectedValue(new Error(WRITE_NOT_SUPPORTED)),
    getChanges: jest.fn().mockResolvedValue([]),
    validateConnection: jest.fn().mockResolvedValue(true),
    mapToInternalTask: jest.fn(),
    mapToExternalTask: jest.fn(),
  } as unknown as TaskProviderInterface;
}

function mapping() {
  return {
    id: "map-1",
    providerId: "prov-1",
    projectId: "proj-1",
    externalListId: "https://dav.example.com/cal/tasks/",
    externalListName: "Tasks",
    isAutoScheduled: false,
    provider: { id: "prov-1", type: "CALDAV", userId: "user-1" },
  } as never;
}

describe("TaskSyncManager incoming-only sync for import-only providers (issue #144)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.task.create.mockResolvedValue({});
    mockPrisma.taskListMapping.update.mockResolvedValue({});
  });

  it("imports a new external task without ever calling provider write methods", async () => {
    const external: ExternalTask = {
      id: "uid-1",
      title: "Buy milk",
      listId: "https://dav.example.com/cal/tasks/",
    };
    const provider = makeImportOnlyProvider([external]);

    // No local tasks yet for this project.
    mockPrisma.task.findMany.mockResolvedValue([]);

    const manager = new TaskSyncManager();
    jest.spyOn(manager, "getProvider").mockResolvedValue(provider);
    jest
      .spyOn(manager, "getFieldMapper")
      .mockReturnValue(new CalDAVFieldMapper());

    const result = await manager.syncTaskList(mapping());

    expect(result.success).toBe(true);
    expect(mockPrisma.task.create).toHaveBeenCalledTimes(1);
    // Crucially: no write-back to the CalDAV server is attempted.
    expect(provider.createTask).not.toHaveBeenCalled();
    expect(provider.updateTask).not.toHaveBeenCalled();
    expect(provider.deleteTask).not.toHaveBeenCalled();
  });

  it("does NOT delete a locally-linked task that is missing from the external read", async () => {
    // External read returns NOTHING (e.g. a transient/partial failure).
    const provider = makeImportOnlyProvider([]);

    // A local task previously imported from CalDAV (linked by externalTaskId).
    mockPrisma.task.findMany.mockResolvedValue([
      {
        id: "local-1",
        title: "Previously imported",
        externalTaskId: "uid-1",
        source: "CALDAV",
        updatedAt: new Date(),
        tags: [],
        project: null,
      },
    ]);

    const manager = new TaskSyncManager();
    jest.spyOn(manager, "getProvider").mockResolvedValue(provider);
    jest
      .spyOn(manager, "getFieldMapper")
      .mockReturnValue(new CalDAVFieldMapper());

    const result = await manager.syncTaskList(mapping());

    expect(result.success).toBe(true);
    // The local task must NOT be deleted just because the external read was empty.
    expect(mockPrisma.task.delete).not.toHaveBeenCalled();
    // And no write-back was attempted.
    expect(provider.createTask).not.toHaveBeenCalled();
  });
});
