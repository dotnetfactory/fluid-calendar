import { SlotScorer } from "../SlotScorer";
import { AutoScheduleSettings, Task } from "@prisma/client";
import { TimeSlot } from "@/types/scheduling";
import { addDays, subDays, newDate, addMinutes } from "@/lib/date-utils";

// Mock the logger
jest.mock("@/lib/logger", () => ({
  // logger: {
  //   log: function (message: string, data?: Record<string, unknown>) {
  //     console.log(message, data);
  //   },
  // },
  logger: {
    log: jest.fn(),
  },
}));

describe("SlotScorer", () => {
  let slotScorer: SlotScorer;
  let mockSettings: AutoScheduleSettings;
  let baseTask: Task;
  let baseSlot: TimeSlot;
  let now: Date;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    now = newDate();
    now.setHours(10, 0, 0, 0); // Set to 10 AM for consistent testing

    mockSettings = {
      id: "test",
      userId: "test",
      workDays: "[1,2,3,4,5]",
      workHourStart: 9,
      workHourEnd: 20,
      selectedCalendars: "[]",
      bufferMinutes: 15,
      createdAt: now,
      updatedAt: now,
      highEnergyStart: 9,
      highEnergyEnd: 12,
      mediumEnergyStart: 13,
      mediumEnergyEnd: 15,
      lowEnergyStart: 15,
      lowEnergyEnd: 17,
      groupByProject: false,
    };

    baseTask = {
      id: "test-task",
      userId: "test-user",
      title: "Test Task",
      description: null,
      status: "todo",
      dueDate: null,
      startDate: null,
      duration: 30,
      priority: null,
      energyLevel: null,
      preferredTime: null,
      isAutoScheduled: true,
      scheduleLocked: false,
      scheduledStart: null,
      scheduledEnd: null,
      scheduleScore: null,
      lastScheduled: null,
      isRecurring: false,
      recurrenceRule: null,
      lastCompletedDate: null,
      externalTaskId: null,
      source: null,
      lastSyncedAt: null,
      projectId: null,
      createdAt: now,
      updatedAt: now,
      postponedUntil: null,
      completedAt: null,
    };

    baseSlot = {
      start: now,
      end: addDays(now, 1),
      score: 0,
      conflicts: [],
      energyLevel: null,
      isWithinWorkHours: true,
      hasBufferTime: true,
    };

    slotScorer = new SlotScorer(mockSettings);
  });

  describe("scoreDeadlineProximity", () => {
    it("should return neutral score (0.5) for tasks with no due date", () => {
      const task = { ...baseTask, dueDate: null };
      const result = slotScorer.scoreSlot(baseSlot, task);
      expect(result.factors.deadlineProximity).toBe(0.5);
    });

    it("should return a score > 1 for overdue tasks", () => {
      // Test with yesterday
      const yesterdayTask = {
        ...baseTask,
        dueDate: subDays(now, 1),
      };
      const yesterdayResult = slotScorer.scoreSlot(baseSlot, yesterdayTask);
      expect(yesterdayResult.factors.deadlineProximity).toBeGreaterThan(1);

      // Test with last week
      const lastWeekTask = {
        ...baseTask,
        dueDate: subDays(now, 7),
      };
      const lastWeekResult = slotScorer.scoreSlot(baseSlot, lastWeekTask);
      expect(lastWeekResult.factors.deadlineProximity).toBeGreaterThan(1);
    });

    it("should score future due dates with decreasing urgency", () => {
      // Due today (but not overdue)
      const todayTask = {
        ...baseTask,
        dueDate: addDays(now, 0),
      };
      const todayResult = slotScorer.scoreSlot(baseSlot, todayTask);
      expect(todayResult.factors.deadlineProximity).toBeGreaterThan(0.8); // High urgency

      // Due tomorrow
      const tomorrowTask = {
        ...baseTask,
        dueDate: addDays(now, 1),
      };
      const tomorrowResult = slotScorer.scoreSlot(baseSlot, tomorrowTask);
      expect(tomorrowResult.factors.deadlineProximity).toBeGreaterThan(0.5);
      expect(tomorrowResult.factors.deadlineProximity).toBeLessThan(
        todayResult.factors.deadlineProximity
      );

      // Due next week
      const nextWeekTask = {
        ...baseTask,
        dueDate: addDays(now, 7),
      };
      const nextWeekResult = slotScorer.scoreSlot(baseSlot, nextWeekTask);
      // Expect a low but non-zero score for tasks a week away
      expect(nextWeekResult.factors.deadlineProximity).toBeGreaterThan(0.05);
      expect(nextWeekResult.factors.deadlineProximity).toBeLessThan(0.2); // Should be significantly lower
      expect(nextWeekResult.factors.deadlineProximity).toBeLessThan(
        tomorrowResult.factors.deadlineProximity
      );
    });

    it("should maintain score order: overdue > today > tomorrow > next week", () => {
      const tasks = {
        overdue: { ...baseTask, dueDate: subDays(now, 1) },
        today: { ...baseTask, dueDate: now },
        tomorrow: { ...baseTask, dueDate: addDays(now, 1) },
        nextWeek: { ...baseTask, dueDate: addDays(now, 7) },
      };

      const scores = {
        overdue: slotScorer.scoreSlot(baseSlot, tasks.overdue).factors
          .deadlineProximity,
        today: slotScorer.scoreSlot(baseSlot, tasks.today).factors
          .deadlineProximity,
        tomorrow: slotScorer.scoreSlot(baseSlot, tasks.tomorrow).factors
          .deadlineProximity,
        nextWeek: slotScorer.scoreSlot(baseSlot, tasks.nextWeek).factors
          .deadlineProximity,
      };

      expect(scores.overdue).toBeGreaterThan(scores.today);
      expect(scores.today).toBeGreaterThan(scores.tomorrow);
      expect(scores.tomorrow).toBeGreaterThan(scores.nextWeek);
    });

    it("should scale overdue tasks based on days overdue", () => {
      // Test with yesterday
      const yesterdayTask = {
        ...baseTask,
        dueDate: subDays(now, 1),
      };
      const yesterdayResult = slotScorer.scoreSlot(baseSlot, yesterdayTask);
      expect(yesterdayResult.factors.deadlineProximity).toBeCloseTo(1.07, 1); // ~1.07 for 1 day overdue

      // Test with last week
      const lastWeekTask = {
        ...baseTask,
        dueDate: subDays(now, 7),
      };
      const lastWeekResult = slotScorer.scoreSlot(baseSlot, lastWeekTask);
      expect(lastWeekResult.factors.deadlineProximity).toBeCloseTo(1.5, 1); // ~1.5 for 1 week overdue

      // Verify that last week scores higher than yesterday
      expect(lastWeekResult.factors.deadlineProximity).toBeGreaterThan(
        yesterdayResult.factors.deadlineProximity
      );
    });

    it("should scale overdue scores based on how long they've been overdue", () => {
      // One day overdue
      const oneDayOverdueTask = {
        ...baseTask,
        dueDate: subDays(now, 1),
      };
      const oneDayResult = slotScorer.scoreSlot(baseSlot, oneDayOverdueTask);

      // One week overdue
      const oneWeekOverdueTask = {
        ...baseTask,
        dueDate: subDays(now, 7),
      };
      const oneWeekResult = slotScorer.scoreSlot(baseSlot, oneWeekOverdueTask);

      // Two weeks overdue (should be maximum score)
      const twoWeeksOverdueTask = {
        ...baseTask,
        dueDate: subDays(now, 14),
      };
      const twoWeeksResult = slotScorer.scoreSlot(
        baseSlot,
        twoWeeksOverdueTask
      );

      // Three weeks overdue (should be capped at maximum score)
      const threeWeeksOverdueTask = {
        ...baseTask,
        dueDate: subDays(now, 21),
      };
      const threeWeeksResult = slotScorer.scoreSlot(
        baseSlot,
        threeWeeksOverdueTask
      );

      // Verify scaling
      expect(oneDayResult.factors.deadlineProximity).toBeGreaterThan(1.0); // More than non-overdue
      expect(oneWeekResult.factors.deadlineProximity).toBeGreaterThan(
        oneDayResult.factors.deadlineProximity
      ); // One week should be higher than one day
      expect(twoWeeksResult.factors.deadlineProximity).toBeCloseTo(2.0, 1); // Should hit max score
      expect(threeWeeksResult.factors.deadlineProximity).toBeCloseTo(2.0, 1); // Should be capped at max score

      // Verify specific ranges
      expect(oneDayResult.factors.deadlineProximity).toBeCloseTo(1.07, 1); // ~1.07 for 1 day overdue
      expect(oneWeekResult.factors.deadlineProximity).toBeCloseTo(1.5, 1); // ~1.5 for 1 week overdue
    });
  });

  describe("scoreSlot", () => {
    it("should score overdue tasks with future slot", () => {
      // Create a slot 1 hour from now
      const futureSlot: TimeSlot = {
        start: addMinutes(now, 60),
        end: addMinutes(now, 120), // 2 hours from now
        score: 0,
        conflicts: [],
        energyLevel: null,
        isWithinWorkHours: true,
        hasBufferTime: true,
      };

      // Task due yesterday
      const yesterdayTask = {
        ...baseTask,
        dueDate: subDays(now, 1),
      };
      const yesterdayScore = slotScorer.scoreSlot(futureSlot, yesterdayTask);

      // Task due 7 days ago
      const weekAgoTask = {
        ...baseTask,
        dueDate: subDays(now, 7),
      };
      const weekAgoScore = slotScorer.scoreSlot(futureSlot, weekAgoTask);

      // High priority task with no due date
      const highPriorityTask = {
        ...baseTask,
        dueDate: null,
        priority: "high",
      };
      const highPriorityScore = slotScorer.scoreSlot(
        futureSlot,
        highPriorityTask
      );

      // Verify overdue scoring
      expect(yesterdayScore.factors.deadlineProximity).toBeCloseTo(1.07, 1); // ~1.07 for 1 day overdue
      expect(weekAgoScore.factors.deadlineProximity).toBeCloseTo(1.5, 1); // ~1.5 for 1 week overdue
      expect(weekAgoScore.factors.deadlineProximity).toBeGreaterThan(
        yesterdayScore.factors.deadlineProximity
      );

      // Verify total scores include other factors
      expect(yesterdayScore.total).toBeGreaterThan(0); // Should have a positive total score
      expect(weekAgoScore.total).toBeGreaterThan(yesterdayScore.total); // Week-old task should score higher

      // Verify overdue tasks score higher than high priority task
      expect(yesterdayScore.total).toBeGreaterThan(highPriorityScore.total); // Even 1-day overdue should beat high priority
      expect(weekAgoScore.total).toBeGreaterThan(highPriorityScore.total); // Week-old overdue should definitely beat high priority

      // Verify high priority task has expected scores
      expect(highPriorityScore.factors.deadlineProximity).toBe(0.5); // Neutral deadline score
      expect(highPriorityScore.factors.priorityScore).toBe(1.0); // Maximum priority score
    });

    it("should score same task differently based on slot timing", () => {
      // Create two slots: one hour from now and one week from now
      const slotDuration = 60; // 1 hour duration for both slots
      const commonSlotProps = {
        score: 0,
        conflicts: [],
        energyLevel: null,
        isWithinWorkHours: true,
        hasBufferTime: true,
      };

      const hourFromNowSlot: TimeSlot = {
        ...commonSlotProps,
        start: addMinutes(now, 60),
        end: addMinutes(now, 60 + slotDuration),
      };

      const weekFromNowSlot: TimeSlot = {
        ...commonSlotProps,
        start: addMinutes(addDays(now, 7), 60), // Same time of day, but a week later
        end: addMinutes(addDays(now, 7), 60 + slotDuration),
      };

      // Test with an overdue task
      const overdueTask = {
        ...baseTask,
        dueDate: subDays(now, 1), // Due yesterday
      };

      const hourFromNowScore = slotScorer.scoreSlot(
        hourFromNowSlot,
        overdueTask
      );
      const weekFromNowScore = slotScorer.scoreSlot(
        weekFromNowSlot,
        overdueTask
      );

      // Earlier slot should score higher for overdue task
      expect(hourFromNowScore.total).toBeGreaterThan(weekFromNowScore.total);

      // Both slots should reflect overdue status and time-based penalty
      expect(hourFromNowScore.factors.deadlineProximity).toBeCloseTo(1.09, 1); // Base score ~1.07 plus small penalty
      expect(weekFromNowScore.factors.deadlineProximity).toBeCloseTo(0.55, 1); // ~50% penalty for week-later slot

      // Test with a high priority task
      const highPriorityTask = {
        ...baseTask,
        dueDate: null,
        priority: "high",
      };

      const highPriorityHourScore = slotScorer.scoreSlot(
        hourFromNowSlot,
        highPriorityTask
      );
      const highPriorityWeekScore = slotScorer.scoreSlot(
        weekFromNowSlot,
        highPriorityTask
      );

      // Earlier slot should still score higher for high priority task
      expect(highPriorityHourScore.total).toBeGreaterThan(
        highPriorityWeekScore.total
      );

      // Priority scores should be the same for both slots
      expect(highPriorityHourScore.factors.priorityScore).toBe(1.0);
      expect(highPriorityWeekScore.factors.priorityScore).toBe(1.0);
    });
  });

  describe("timePreference scoring", () => {
    it("should score morning slots highest for morning preference", () => {
      const morningTask = { ...baseTask, preferredTime: "morning" };

      // Test different times of day
      const slots = {
        early: {
          ...baseSlot,
          start: new Date(now.setHours(6, 0)),
          end: new Date(now.setHours(7, 0)),
        },
        morning: {
          ...baseSlot,
          start: new Date(now.setHours(10, 0)),
          end: new Date(now.setHours(11, 0)),
        },
        afternoon: {
          ...baseSlot,
          start: new Date(now.setHours(14, 0)),
          end: new Date(now.setHours(15, 0)),
        },
        evening: {
          ...baseSlot,
          start: new Date(now.setHours(19, 0)),
          end: new Date(now.setHours(20, 0)),
        },
      };

      const scores = {
        early: slotScorer.scoreSlot(slots.early, morningTask).factors
          .timePreference,
        morning: slotScorer.scoreSlot(slots.morning, morningTask).factors
          .timePreference,
        afternoon: slotScorer.scoreSlot(slots.afternoon, morningTask).factors
          .timePreference,
        evening: slotScorer.scoreSlot(slots.evening, morningTask).factors
          .timePreference,
      };

      // Morning slots (5-12) should score 1.0
      expect(scores.early).toBe(1.0);
      expect(scores.morning).toBe(1.0);
      // Other times should score 0
      expect(scores.afternoon).toBe(0);
      expect(scores.evening).toBe(0);
    });

    it("should score afternoon slots highest for afternoon preference", () => {
      const afternoonTask = { ...baseTask, preferredTime: "afternoon" };

      const slots = {
        morning: {
          ...baseSlot,
          start: new Date(now.setHours(10, 0)),
          end: new Date(now.setHours(11, 0)),
        },
        earlyAfternoon: {
          ...baseSlot,
          start: new Date(now.setHours(13, 0)),
          end: new Date(now.setHours(14, 0)),
        },
        lateAfternoon: {
          ...baseSlot,
          start: new Date(now.setHours(16, 0)),
          end: new Date(now.setHours(17, 0)),
        },
        evening: {
          ...baseSlot,
          start: new Date(now.setHours(19, 0)),
          end: new Date(now.setHours(20, 0)),
        },
      };

      const scores = {
        morning: slotScorer.scoreSlot(slots.morning, afternoonTask).factors
          .timePreference,
        earlyAfternoon: slotScorer.scoreSlot(
          slots.earlyAfternoon,
          afternoonTask
        ).factors.timePreference,
        lateAfternoon: slotScorer.scoreSlot(slots.lateAfternoon, afternoonTask)
          .factors.timePreference,
        evening: slotScorer.scoreSlot(slots.evening, afternoonTask).factors
          .timePreference,
      };

      // Afternoon slots (12-17) should score 1.0
      expect(scores.earlyAfternoon).toBe(1.0);
      expect(scores.lateAfternoon).toBe(1.0);
      // Other times should score 0
      expect(scores.morning).toBe(0);
      expect(scores.evening).toBe(0);
    });

    it("should score evening slots highest for evening preference", () => {
      const eveningTask = { ...baseTask, preferredTime: "evening" };

      const slots = {
        morning: {
          ...baseSlot,
          start: new Date(now.setHours(10, 0)),
          end: new Date(now.setHours(11, 0)),
        },
        afternoon: {
          ...baseSlot,
          start: new Date(now.setHours(14, 0)),
          end: new Date(now.setHours(15, 0)),
        },
        earlyEvening: {
          ...baseSlot,
          start: new Date(now.setHours(17, 30)),
          end: new Date(now.setHours(18, 30)),
        },
        lateEvening: {
          ...baseSlot,
          start: new Date(now.setHours(20, 0)),
          end: new Date(now.setHours(21, 0)),
        },
      };

      const scores = {
        morning: slotScorer.scoreSlot(slots.morning, eveningTask).factors
          .timePreference,
        afternoon: slotScorer.scoreSlot(slots.afternoon, eveningTask).factors
          .timePreference,
        earlyEvening: slotScorer.scoreSlot(slots.earlyEvening, eveningTask)
          .factors.timePreference,
        lateEvening: slotScorer.scoreSlot(slots.lateEvening, eveningTask)
          .factors.timePreference,
      };

      // Evening slots (17-22) should score 1.0
      expect(scores.earlyEvening).toBe(1.0);
      expect(scores.lateEvening).toBe(1.0);
      // Other times should score 0
      expect(scores.morning).toBe(0);
      expect(scores.afternoon).toBe(0);
    });

    it("should favor earlier slots when no time preference is set", () => {
      const task = { ...baseTask, preferredTime: null };

      // Create slots at different times in the future
      const slots = {
        hour: {
          ...baseSlot,
          start: addMinutes(now, 60),
          end: addMinutes(now, 120),
        },
        day: {
          ...baseSlot,
          start: addDays(now, 1),
          end: addDays(addMinutes(now, 60), 1),
        },
        week: {
          ...baseSlot,
          start: addDays(now, 7),
          end: addDays(addMinutes(now, 60), 7),
        },
        twoWeeks: {
          ...baseSlot,
          start: addDays(now, 14),
          end: addDays(addMinutes(now, 60), 14),
        },
      };

      const scores = {
        hour: slotScorer.scoreSlot(slots.hour, task).factors.timePreference,
        day: slotScorer.scoreSlot(slots.day, task).factors.timePreference,
        week: slotScorer.scoreSlot(slots.week, task).factors.timePreference,
        twoWeeks: slotScorer.scoreSlot(slots.twoWeeks, task).factors
          .timePreference,
      };

      // Verify exponential decay over time
      expect(scores.hour).toBeGreaterThan(0.9); // Almost 1.0 for immediate slots
      expect(scores.day).toBeGreaterThan(scores.week); // Earlier slots score higher
      expect(scores.week).toBeGreaterThan(scores.twoWeeks);
      expect(scores.twoWeeks).toBeGreaterThan(0); // Still positive but low

      // Verify the decay rate (7-day half-life)
      expect(scores.week).toBeCloseTo(0.5, 1); // Should be about 0.5 after a week
    });

    it("should combine time preference with other factors correctly", () => {
      const task = { ...baseTask, preferredTime: "morning", priority: "high" };

      // Create two morning slots
      const slots = {
        goodMorning: {
          ...baseSlot,
          start: new Date(now.setHours(9, 0)),
          end: new Date(now.setHours(10, 0)),
          isWithinWorkHours: true,
          hasBufferTime: true,
        },
        badMorning: {
          ...baseSlot,
          start: new Date(now.setHours(9, 0)),
          end: new Date(now.setHours(10, 0)),
          isWithinWorkHours: false, // Outside work hours
          hasBufferTime: false, // No buffer
        },
      };

      const scores = {
        good: slotScorer.scoreSlot(slots.goodMorning, task),
        bad: slotScorer.scoreSlot(slots.badMorning, task),
      };

      // Both should have perfect time preference scores
      expect(scores.good.factors.timePreference).toBe(1.0);
      expect(scores.bad.factors.timePreference).toBe(1.0);

      // But total scores should differ due to other factors
      expect(scores.good.total).toBeGreaterThan(scores.bad.total);
    });
  });
});
