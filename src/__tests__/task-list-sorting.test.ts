import {
  PRIORITY_SORT_RANK,
  ENERGY_LEVEL_SORT_RANK,
  compareTaskPriority,
  compareTaskEnergyLevel,
} from "@/components/tasks/utils/task-list-utils";

import { EnergyLevel, Priority, Task, TaskStatus } from "@/types/task";

// Minimal Task factory: only the fields the sort comparators inspect matter; the
// rest are filled with inert defaults so the object satisfies the Task type.
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Test task",
    status: TaskStatus.TODO,
    tags: [],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    isRecurring: false,
    isAutoScheduled: false,
    scheduleLocked: false,
    ...overrides,
  };
}

// Sort a list with a comparator that takes a direction multiplier (1 asc, -1 desc),
// mirroring how TaskList applies `direction` to each case's result.
function sortBy(
  tasks: Task[],
  compare: (a: Task, b: Task, direction: number) => number,
  direction: 1 | -1
): Task[] {
  return [...tasks].sort((a, b) => compare(a, b, direction));
}

describe("rank maps", () => {
  it("ranks priority none < low < medium < high", () => {
    expect(PRIORITY_SORT_RANK[Priority.NONE]).toBeLessThan(
      PRIORITY_SORT_RANK[Priority.LOW]
    );
    expect(PRIORITY_SORT_RANK[Priority.LOW]).toBeLessThan(
      PRIORITY_SORT_RANK[Priority.MEDIUM]
    );
    expect(PRIORITY_SORT_RANK[Priority.MEDIUM]).toBeLessThan(
      PRIORITY_SORT_RANK[Priority.HIGH]
    );
  });

  it("ranks energy low < medium < high", () => {
    expect(ENERGY_LEVEL_SORT_RANK[EnergyLevel.LOW]).toBeLessThan(
      ENERGY_LEVEL_SORT_RANK[EnergyLevel.MEDIUM]
    );
    expect(ENERGY_LEVEL_SORT_RANK[EnergyLevel.MEDIUM]).toBeLessThan(
      ENERGY_LEVEL_SORT_RANK[EnergyLevel.HIGH]
    );
  });
});

describe("compareTaskPriority", () => {
  const high = makeTask({ id: "high", priority: Priority.HIGH });
  const medium = makeTask({ id: "medium", priority: Priority.MEDIUM });
  const low = makeTask({ id: "low", priority: Priority.LOW });
  const none = makeTask({ id: "none", priority: Priority.NONE });
  const missing = makeTask({ id: "missing", priority: null });

  it("ascending: none, low, medium, high (semantic, not alphabetical)", () => {
    const result = sortBy(
      [high, low, none, medium],
      compareTaskPriority,
      1
    ).map((t) => t.id);
    expect(result).toEqual(["none", "low", "medium", "high"]);
  });

  it("descending: high, medium, low, none", () => {
    const result = sortBy(
      [low, high, none, medium],
      compareTaskPriority,
      -1
    ).map((t) => t.id);
    expect(result).toEqual(["high", "medium", "low", "none"]);
  });

  it("tasks without a priority sort last in ascending order", () => {
    const result = sortBy(
      [missing, high, low],
      compareTaskPriority,
      1
    ).map((t) => t.id);
    expect(result[result.length - 1]).toBe("missing");
  });

  it("tasks without a priority sort last in descending order", () => {
    const result = sortBy(
      [missing, high, low],
      compareTaskPriority,
      -1
    ).map((t) => t.id);
    expect(result[result.length - 1]).toBe("missing");
  });

  // The DB column is a plain String, so a stale/imported value outside the enum
  // (e.g. "urgent") can reach the comparator. It must bucket deterministically
  // (last, like missing) instead of producing NaN that leaves rows interleaved.
  it("an unknown persisted priority string sorts last in both directions", () => {
    const unknown = makeTask({
      id: "unknown",
      priority: "urgent" as unknown as Priority,
    });
    const asc = sortBy([unknown, high, low], compareTaskPriority, 1).map(
      (t) => t.id
    );
    const desc = sortBy([unknown, high, low], compareTaskPriority, -1).map(
      (t) => t.id
    );
    expect(asc[asc.length - 1]).toBe("unknown");
    expect(desc[desc.length - 1]).toBe("unknown");
  });

  it("comparing two unknown priority strings is stable (returns 0)", () => {
    const u1 = makeTask({ id: "u1", priority: "urgent" as unknown as Priority });
    const u2 = makeTask({ id: "u2", priority: "later" as unknown as Priority });
    expect(compareTaskPriority(u1, u2, 1)).toBe(0);
    expect(compareTaskPriority(u1, u2, -1)).toBe(0);
  });
});

describe("compareTaskEnergyLevel", () => {
  const high = makeTask({ id: "high", energyLevel: EnergyLevel.HIGH });
  const medium = makeTask({ id: "medium", energyLevel: EnergyLevel.MEDIUM });
  const low = makeTask({ id: "low", energyLevel: EnergyLevel.LOW });
  const missing = makeTask({ id: "missing", energyLevel: null });

  it("ascending: low, medium, high (semantic, not alphabetical)", () => {
    const result = sortBy(
      [high, low, medium],
      compareTaskEnergyLevel,
      1
    ).map((t) => t.id);
    expect(result).toEqual(["low", "medium", "high"]);
  });

  it("descending: high, medium, low", () => {
    const result = sortBy(
      [low, high, medium],
      compareTaskEnergyLevel,
      -1
    ).map((t) => t.id);
    expect(result).toEqual(["high", "medium", "low"]);
  });

  it("tasks without an energy level sort last in ascending order", () => {
    const result = sortBy(
      [missing, high, low],
      compareTaskEnergyLevel,
      1
    ).map((t) => t.id);
    expect(result[result.length - 1]).toBe("missing");
  });

  it("tasks without an energy level sort last in descending order", () => {
    const result = sortBy(
      [missing, high, low],
      compareTaskEnergyLevel,
      -1
    ).map((t) => t.id);
    expect(result[result.length - 1]).toBe("missing");
  });

  it("an unknown persisted energy string sorts last in both directions", () => {
    const unknown = makeTask({
      id: "unknown",
      energyLevel: "extreme" as unknown as EnergyLevel,
    });
    const asc = sortBy([unknown, high, low], compareTaskEnergyLevel, 1).map(
      (t) => t.id
    );
    const desc = sortBy([unknown, high, low], compareTaskEnergyLevel, -1).map(
      (t) => t.id
    );
    expect(asc[asc.length - 1]).toBe("unknown");
    expect(desc[desc.length - 1]).toBe("unknown");
  });
});
