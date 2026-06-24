import { prisma } from "@/lib/prisma";

import { TimeSlot } from "@/types/scheduling";
import { TaskStatus } from "@/types/task";

import { CalendarServiceImpl } from "../CalendarServiceImpl";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: jest.fn() },
    calendarEvent: { findMany: jest.fn() },
  },
}));

const mockTaskFind = prisma.task.findMany as unknown as jest.Mock;
const mockEventFind = prisma.calendarEvent.findMany as unknown as jest.Mock;

const slot = {
  start: new Date(2026, 5, 24, 10, 0, 0),
  end: new Date(2026, 5, 24, 10, 30, 0),
} as TimeSlot;

/**
 * A completed task keeps its scheduledStart/End (so it can still be displayed),
 * but its time is free. The conflict queries must therefore exclude completed
 * tasks — otherwise checking a task off can't compact the remaining tasks into
 * the slot it vacated (they'd still see it as busy).
 */
describe("CalendarServiceImpl — completed tasks do not block their slot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventFind.mockResolvedValue([]); // no calendar events
    mockTaskFind.mockResolvedValue([]); // no busy tasks returned
  });

  it("findBatchConflicts excludes completed tasks from the busy-task query", async () => {
    await new CalendarServiceImpl().findBatchConflicts(
      [{ slot, taskId: "t1" }],
      ["cal1"],
      "u1"
    );

    expect(mockTaskFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: TaskStatus.COMPLETED },
        }),
      })
    );
  });

  it("findConflicts excludes completed tasks from the busy-task query", async () => {
    await new CalendarServiceImpl().findConflicts(slot, ["cal1"], "u1");

    expect(mockTaskFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: TaskStatus.COMPLETED },
        }),
      })
    );
  });
});
