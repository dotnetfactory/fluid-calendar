import {
  inferCompletedReason,
  inferRescheduleReason,
} from "../services/logging/InferenceEngine";

describe("inferCompletedReason", () => {
  const base = {
    wasScheduled: true,
    completionLagMinutes: 0,
    completedInScheduledWindow: true,
    rescheduleCountBeforeCompletion: 0,
    scheduleLockedAtCompletion: false,
    isRepeatPatternMatch: false,
  };

  it("returns completed_unscheduled when task was never scheduled", () => {
    expect(
      inferCompletedReason({ ...base, wasScheduled: false })
    ).toBe("completed_unscheduled");
  });

  it("returns pattern_locked_in when repeat task matches its usual slot", () => {
    expect(
      inferCompletedReason({ ...base, isRepeatPatternMatch: true })
    ).toBe("pattern_locked_in");
  });

  it("returns user_locked_and_completed when user pinned the slot and hit it", () => {
    expect(
      inferCompletedReason({
        ...base,
        scheduleLockedAtCompletion: true,
        completedInScheduledWindow: true,
      })
    ).toBe("user_locked_and_completed");
  });

  it("returns completed_after_many_reschedules when 3+ reschedules occurred", () => {
    expect(
      inferCompletedReason({
        ...base,
        rescheduleCountBeforeCompletion: 3,
        completionLagMinutes: 10,
      })
    ).toBe("completed_after_many_reschedules");
  });

  it("returns scheduler_right when completion is within 15 min of scheduled window end", () => {
    expect(
      inferCompletedReason({ ...base, completionLagMinutes: 5 })
    ).toBe("scheduler_right");
    expect(
      inferCompletedReason({ ...base, completionLagMinutes: -10 })
    ).toBe("scheduler_right");
  });

  it("returns completed_slightly_early for -30 <= lag < -15", () => {
    expect(
      inferCompletedReason({ ...base, completionLagMinutes: -25 })
    ).toBe("completed_slightly_early");
  });

  it("returns completed_slightly_late for 15 < lag <= 30", () => {
    expect(
      inferCompletedReason({ ...base, completionLagMinutes: 25 })
    ).toBe("completed_slightly_late");
  });

  it("returns completed_much_earlier for lag < -120", () => {
    expect(
      inferCompletedReason({
        ...base,
        completionLagMinutes: -200,
        completedInScheduledWindow: false,
      })
    ).toBe("completed_much_earlier");
  });

  it("returns completed_much_later for lag > 120", () => {
    expect(
      inferCompletedReason({
        ...base,
        completionLagMinutes: 200,
        completedInScheduledWindow: false,
      })
    ).toBe("completed_much_later");
  });

  it("returns completed_same_day_off_window for lag between 30 and 120 out of window", () => {
    expect(
      inferCompletedReason({
        ...base,
        completionLagMinutes: 60,
        completedInScheduledWindow: false,
      })
    ).toBe("completed_same_day_off_window");
  });
});

describe("inferRescheduleReason", () => {
  const morning = new Date("2026-04-21T09:00:00.000Z");
  const afternoon = new Date("2026-04-21T14:00:00.000Z");
  const nextDay = new Date("2026-04-22T09:00:00.000Z");

  const base = {
    fromStart: morning,
    toStart: afternoon,
    rescheduleNumber: 1,
    source: "ui_drag" as const,
    matchedAlternativeRank: null,
  };

  it("returns alternative_preferred when user picks an alternative from the original decision", () => {
    expect(
      inferRescheduleReason({ ...base, matchedAlternativeRank: 2 })
    ).toBe("alternative_preferred");
    expect(
      inferRescheduleReason({ ...base, matchedAlternativeRank: 5 })
    ).toBe("alternative_preferred");
  });

  it("returns of_sourced_reschedule for omnifocus-originated moves", () => {
    expect(
      inferRescheduleReason({ ...base, source: "omnifocus_sync" })
    ).toBe("of_sourced_reschedule");
  });

  it("returns repeated_reschedule when rescheduleNumber >= 3", () => {
    expect(
      inferRescheduleReason({ ...base, rescheduleNumber: 3 })
    ).toBe("repeated_reschedule");
    expect(
      inferRescheduleReason({ ...base, rescheduleNumber: 5 })
    ).toBe("repeated_reschedule");
  });

  it("returns moved_earlier_same_day when to-slot precedes from-slot same day", () => {
    expect(
      inferRescheduleReason({
        ...base,
        fromStart: afternoon,
        toStart: morning,
      })
    ).toBe("moved_earlier_same_day");
  });

  it("returns moved_later_same_day when to-slot is after from-slot same day", () => {
    expect(inferRescheduleReason(base)).toBe("moved_later_same_day");
  });

  it("returns moved_different_day when to-slot is on a different calendar day", () => {
    expect(
      inferRescheduleReason({ ...base, toStart: nextDay })
    ).toBe("moved_different_day");
  });

  it("prioritises alternative_preferred over other rules", () => {
    expect(
      inferRescheduleReason({
        ...base,
        matchedAlternativeRank: 2,
        rescheduleNumber: 5,
      })
    ).toBe("alternative_preferred");
  });
});
