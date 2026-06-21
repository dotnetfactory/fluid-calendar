import { NextRequest } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/projects/[id]/duplicate/route";

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    task: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockAuth = authenticateRequest as jest.Mock;
const mockPrisma = prisma as unknown as {
  project: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
  task: { create: jest.Mock };
  $transaction: jest.Mock;
};

const USER_ID = "user-1";

function makeRequest(body?: string): NextRequest {
  return new NextRequest("http://localhost/api/projects/p1/duplicate", {
    method: "POST",
    body,
  });
}

function params() {
  return Promise.resolve({ id: "p1" });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: USER_ID });
  // The transaction callback runs against a tx with the same mocked methods.
  mockPrisma.$transaction.mockImplementation((cb) =>
    cb({
      project: {
        create: mockPrisma.project.create,
        findUniqueOrThrow: mockPrisma.project.findUniqueOrThrow,
      },
      task: { create: mockPrisma.task.create },
    })
  );
});

describe("POST /api/projects/[id]/duplicate", () => {
  it("rejects a non-empty malformed JSON body with 400 and does not write", async () => {
    const res = await POST(makeRequest("{"), { params: params() });
    expect(res?.status).toBe(400);
    expect(mockPrisma.project.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.project.create).not.toHaveBeenCalled();
  });

  it("rejects a non-string name with 400", async () => {
    const res = await POST(makeRequest(JSON.stringify({ name: 123 })), {
      params: params(),
    });
    expect(res?.status).toBe(400);
    expect(mockPrisma.project.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the project is not owned/found", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest(), { params: params() });
    expect(res?.status).toBe(404);
    expect(mockPrisma.project.create).not.toHaveBeenCalled();
  });

  it("only requests the owner's incomplete tasks (and their owned tags)", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      name: "Acme",
      description: "d",
      color: "#fff",
      tasks: [],
    });
    mockPrisma.project.create.mockResolvedValue({ id: "new-1" });
    mockPrisma.project.findUniqueOrThrow.mockResolvedValue({
      id: "new-1",
      name: "Copy of Acme",
      _count: { tasks: 0 },
    });

    await POST(makeRequest(), { params: params() });

    const findArgs = mockPrisma.project.findUnique.mock.calls[0][0];
    expect(findArgs.where).toEqual({ id: "p1", userId: USER_ID });
    expect(findArgs.include.tasks.where).toEqual({
      userId: USER_ID,
      status: { not: "completed" },
    });
    expect(findArgs.include.tasks.include.tags.where).toEqual({
      userId: USER_ID,
    });
  });

  it("defaults the name to 'Copy of <name>' when none is provided", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      name: "Acme",
      description: "d",
      color: "#fff",
      tasks: [],
    });
    mockPrisma.project.create.mockResolvedValue({ id: "new-1" });
    mockPrisma.project.findUniqueOrThrow.mockResolvedValue({
      id: "new-1",
      _count: { tasks: 0 },
    });

    await POST(makeRequest(), { params: params() });

    expect(mockPrisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Copy of Acme",
          status: "active",
          userId: USER_ID,
        }),
      })
    );
  });

  it("uses the provided name and copies each incomplete task", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      name: "Acme",
      description: "d",
      color: "#fff",
      tasks: [
        {
          id: "t1",
          title: "A",
          status: "todo",
          tags: [],
          userId: USER_ID,
        },
        {
          id: "t2",
          title: "B",
          status: "in_progress",
          tags: [{ id: "tag-1" }],
          userId: USER_ID,
        },
      ],
    });
    mockPrisma.project.create.mockResolvedValue({ id: "new-1" });
    mockPrisma.project.findUniqueOrThrow.mockResolvedValue({
      id: "new-1",
      name: "Template",
      _count: { tasks: 2 },
    });

    const res = await POST(makeRequest(JSON.stringify({ name: "Template" })), {
      params: params(),
    });

    expect(res?.status).toBe(200);
    expect(mockPrisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Template" }),
      })
    );
    expect(mockPrisma.task.create).toHaveBeenCalledTimes(2);
  });
});
