import { prisma } from "@/lib/prisma";
import { CalendarServiceImpl } from "@/services/scheduling/CalendarServiceImpl";
import { TimeSlot } from "@/types/scheduling";

// Regression test for issue #176 ("Auto Scheduling is putting tasks too close
// together"): bufferMinutes must enforce a real gap between a candidate slot and
// existing busy intervals, not merely prevent overlap. Buffer is applied by
// padding the busy interval, so a slot that merely abuts a task/event now
// conflicts unless it keeps bufferMinutes of clearance.

jest.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: jest.fn() },
    calendarEvent: { findMany: jest.fn() },
  },
}));

const mockPrisma = prisma as unknown as {
  task: { findMany: jest.Mock };
  calendarEvent: { findMany: jest.Mock };
};

const USER = "user-1";

function slot(startISO: string, endISO: string): TimeSlot {
  return {
    start: new Date(startISO),
    end: new Date(endISO),
    score: 0,
    conflicts: [],
    energyLevel: null,
    isWithinWorkHours: true,
    hasBufferTime: false,
  };
}

/** A scheduled task occupying 10:00–10:30. With buffer=15 it "owns" 09:45–10:45. */
function arrangeScheduledTask() {
  // getEvents() returns [] for an empty calendar list without touching prisma,
  // so the only DB reads are the two task.findMany calls.
  mockPrisma.task.findMany
    .mockResolvedValueOnce([
      {
        id: "busy",
        title: "Existing task",
        scheduledStart: new Date("2026-06-22T10:00:00Z"),
        scheduledEnd: new Date("2026-06-22T10:30:00Z"),
      },
    ]) // scheduledTasks
    .mockResolvedValueOnce([]); // pushedBlockIds
}

async function conflictsFor(candidate: TimeSlot, bufferMinutes: number) {
  const svc = new CalendarServiceImpl();
  const results = await svc.findBatchConflicts(
    [{ slot: candidate, taskId: "new" }],
    [], // no calendars selected -> event check is a no-op
    USER,
    "new",
    bufferMinutes
  );
  return results[0].conflicts;
}

beforeEach(() => jest.clearAllMocks());

describe("findBatchConflicts buffer enforcement (#176)", () => {
  it("rejects a slot that starts the instant the task ends (no buffer gap)", async () => {
    arrangeScheduledTask();
    const c = await conflictsFor(
      slot("2026-06-22T10:30:00Z", "2026-06-22T11:00:00Z"),
      15
    );
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("task");
  });

  it("accepts a slot that keeps the full buffer after the task", async () => {
    arrangeScheduledTask();
    const c = await conflictsFor(
      slot("2026-06-22T10:45:00Z", "2026-06-22T11:15:00Z"),
      15
    );
    expect(c).toHaveLength(0);
  });

  it("rejects a slot that ends inside the pre-task buffer", async () => {
    arrangeScheduledTask();
    const c = await conflictsFor(
      slot("2026-06-22T09:30:00Z", "2026-06-22T10:00:00Z"),
      15
    );
    expect(c).toHaveLength(1);
  });

  it("preserves legacy behavior (back-to-back allowed) when buffer is 0", async () => {
    arrangeScheduledTask();
    const c = await conflictsFor(
      slot("2026-06-22T10:30:00Z", "2026-06-22T11:00:00Z"),
      0
    );
    expect(c).toHaveLength(0);
  });
});
