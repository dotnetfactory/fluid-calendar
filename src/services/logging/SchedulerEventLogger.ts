import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { SlotScore } from "@/types/scheduling";

import { SCHEDULER_VERSION } from "@/services/scheduling/version";

import {
  CompletedInferredReason,
  RescheduleInferredReason,
} from "./InferenceEngine";

const LOG_SOURCE = "SchedulerEventLogger";

/**
 * Event-sourced logger for scheduler decisions and user reactions.
 * All methods are fire-and-forget — failures are logged but never thrown.
 * See docs/scheduling-event-schema-2026-04-21.md for payload shapes.
 */

interface EventBase {
  userId: string;
  taskId?: string;
}

export interface SlotSnapshot {
  start: string;
  end: string;
  score: number;
  factors: SlotScore["factors"];
}

export interface ScheduleDecisionPayload {
  runId: string;
  chosen: SlotSnapshot;
  alternatives: SlotSnapshot[];
  taskContext: {
    projectId: string | null;
    areaId: string | null;
    scheduleId: string | null;
    tagNames: string[];
    duration: number;
    priority: string | null;
    hasDeadline: boolean;
    daysToDeadline: number | null;
    energyLevel: string | null;
    preferredTime: string | null;
    isChunked: boolean;
  };
  runContext: {
    candidateSlotsGenerated: number;
    candidateSlotsAfterFiltering: number;
    searchWindowDays: number;
    filterReasons: Record<string, number>;
  };
}

export interface UserReschedulePayload {
  from: {
    start: string;
    end: string;
    wasSchedulerPlaced: boolean;
    schedulerScore: number | null;
    // Permissive: historical events may carry factor keys that no longer exist
    // in the current SlotScore (e.g. priorityScore removed in 1.1.0).
    schedulerFactors: Record<string, number> | null;
    minutesSinceOriginalPlacement: number | null;
  };
  to: {
    start: string;
    end: string;
    computedFactors: Record<string, number> | null;
    computedScore: number | null;
  };
  rescheduleNumber: number;
  source: "ui_drag" | "ui_edit_modal" | "omnifocus_sync" | "api";
  inferredReason: RescheduleInferredReason | null;
  matchedAlternativeRank: number | null;
}

export interface TaskCompletedPayload {
  completedAt: string;
  wasScheduled: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  completedInScheduledWindow: boolean;
  completionLagMinutes: number | null;
  rescheduleCountBeforeCompletion: number;
  durationEstimatedMinutes: number;
  durationActualMinutes: number | null;
  source: "ui" | "omnifocus_sync" | "api";
  inferredReason: CompletedInferredReason;
  promptedForFeedback: boolean;
}

export interface TaskLockedPayload {
  scheduledStart: string | null;
  scheduledEnd: string | null;
  locked: boolean;
  factorsAtLockTime: SlotScore["factors"] | null;
}

export interface CompletionSignalPayload {
  taskCompletedEventId: string;
  signal: "up" | "down" | "skip";
  latencyMs: number;
  surface: "toast" | "modal" | "morning_review";
}

export interface FeedbackProvidedPayload {
  triggerEventId: string;
  triggerType: string;
  structuredReason: string;
  freeText: string | null;
  skipped: boolean;
  skippedReason: "dismissed" | "rate_limited" | "too_busy" | null;
  promptedInBatch: boolean;
  ratePolicy: {
    dailyAskCount: number;
    consecutiveSkips: number;
    dampenedUntil: string | null;
  };
}

async function writeEvent(
  base: EventBase,
  eventType: string,
  payload: unknown
): Promise<void> {
  try {
    await prisma.schedulerEvent.create({
      data: {
        userId: base.userId,
        taskId: base.taskId ?? null,
        eventType,
        schedulerVersion: SCHEDULER_VERSION,
        payload: payload as object,
      },
    });
  } catch (error) {
    logger.error(
      `Failed to write ${eventType} event`,
      {
        eventType,
        userId: base.userId,
        taskId: base.taskId ?? null,
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
  }
}

export const SchedulerEventLogger = {
  logScheduleDecision(
    base: EventBase,
    payload: ScheduleDecisionPayload
  ): Promise<void> {
    return writeEvent(base, "SCHEDULE_DECISION", payload);
  },

  logUserReschedule(
    base: EventBase,
    payload: UserReschedulePayload
  ): Promise<void> {
    return writeEvent(base, "TASK_RESCHEDULED_BY_USER", payload);
  },

  logTaskCompleted(
    base: EventBase,
    payload: TaskCompletedPayload
  ): Promise<void> {
    return writeEvent(base, "TASK_COMPLETED", payload);
  },

  logTaskLocked(base: EventBase, payload: TaskLockedPayload): Promise<void> {
    return writeEvent(
      base,
      payload.locked ? "TASK_LOCKED" : "TASK_UNLOCKED",
      payload
    );
  },

  // Phase 0b — stubs wired at UI time
  logCompletionSignal(
    base: EventBase,
    payload: CompletionSignalPayload
  ): Promise<void> {
    return writeEvent(base, "COMPLETION_SIGNAL", payload);
  },

  logFeedbackProvided(
    base: EventBase,
    payload: FeedbackProvidedPayload
  ): Promise<void> {
    return writeEvent(base, "FEEDBACK_PROVIDED", payload);
  },
};
