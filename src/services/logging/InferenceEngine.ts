/**
 * Pure inference rules for tagging scheduler events with a reason code.
 * Documented in docs/scheduling-event-schema-2026-04-21.md § "Inferred reason codes".
 *
 * Kept stateless and side-effect-free so it can be unit-tested in isolation.
 */

export interface CompletedInferenceInput {
  wasScheduled: boolean;
  completionLagMinutes: number | null;
  completedInScheduledWindow: boolean;
  rescheduleCountBeforeCompletion: number;
  scheduleLockedAtCompletion: boolean;
  isRepeatPatternMatch: boolean;
}

export type CompletedInferredReason =
  | "completed_unscheduled"
  | "scheduler_right"
  | "completed_slightly_early"
  | "completed_slightly_late"
  | "completed_much_earlier"
  | "completed_much_later"
  | "completed_same_day_off_window"
  | "first_try_hit"
  | "completed_after_many_reschedules"
  | "user_locked_and_completed"
  | "pattern_locked_in";

export function inferCompletedReason(
  input: CompletedInferenceInput
): CompletedInferredReason {
  const {
    wasScheduled,
    completionLagMinutes,
    completedInScheduledWindow,
    rescheduleCountBeforeCompletion,
    scheduleLockedAtCompletion,
    isRepeatPatternMatch,
  } = input;

  if (!wasScheduled) return "completed_unscheduled";

  if (isRepeatPatternMatch) return "pattern_locked_in";

  if (scheduleLockedAtCompletion && completedInScheduledWindow) {
    return "user_locked_and_completed";
  }

  const lag = completionLagMinutes ?? 0;
  const absLag = Math.abs(lag);

  if (rescheduleCountBeforeCompletion >= 3) {
    return "completed_after_many_reschedules";
  }

  if (absLag <= 15) return "scheduler_right";

  if (lag < 0 && lag >= -30) return "completed_slightly_early";
  if (lag > 0 && lag <= 30) return "completed_slightly_late";

  if (lag < -120) return "completed_much_earlier";
  if (lag > 120) return "completed_much_later";

  if (!completedInScheduledWindow) return "completed_same_day_off_window";

  if (rescheduleCountBeforeCompletion === 0) return "first_try_hit";

  return "completed_same_day_off_window";
}

export interface RescheduleInferenceInput {
  fromStart: Date;
  toStart: Date;
  rescheduleNumber: number;
  source: "ui_drag" | "ui_edit_modal" | "omnifocus_sync" | "api";
  matchedAlternativeRank: number | null;
}

export type RescheduleInferredReason =
  | "alternative_preferred"
  | "moved_earlier_same_day"
  | "moved_later_same_day"
  | "moved_different_day"
  | "repeated_reschedule"
  | "of_sourced_reschedule"
  | "generic_reschedule";

export function inferRescheduleReason(
  input: RescheduleInferenceInput
): RescheduleInferredReason {
  const {
    fromStart,
    toStart,
    rescheduleNumber,
    source,
    matchedAlternativeRank,
  } = input;

  if (matchedAlternativeRank !== null && matchedAlternativeRank >= 2) {
    return "alternative_preferred";
  }

  if (source === "omnifocus_sync") return "of_sourced_reschedule";

  if (rescheduleNumber >= 3) return "repeated_reschedule";

  const sameDay =
    fromStart.getFullYear() === toStart.getFullYear() &&
    fromStart.getMonth() === toStart.getMonth() &&
    fromStart.getDate() === toStart.getDate();

  if (sameDay) {
    return toStart < fromStart ? "moved_earlier_same_day" : "moved_later_same_day";
  }

  return "moved_different_day";
}
