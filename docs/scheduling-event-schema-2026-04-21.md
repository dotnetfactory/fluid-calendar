---
title: Scheduler Event Schema — Phase 0 Logging Spec
status: proposal
tags: [fluidcalendar, ml, schema, logging]
updated: 2026-04-21
---

Concrete specification for the event-logging layer that underpins all future ML and AI-agent work. Designed to start capturing data **now** with a payload shape flexible enough to survive the pivots we don't yet know we'll need.

Related: [[scheduling-ml-agent-roadmap-2026-04-21]] (vision this supports), [[scheduling-engine]] (current algorithm), [[database-schema]] (existing Prisma models).

## Changelog

- **2026-04-21** — Initial spec.
- **2026-04-21** — Added explicit feedback loop: `COMPLETION_SIGNAL` (thumbs up/down), `FEEDBACK_PROVIDED` (structured why), `inferredReason` fields on completion/reschedule events, and a dedicated "Inferred reason codes" section so the logger auto-tags events before any user is asked.

## Design principles

1. **Event-sourced.** Append-only table of immutable events. Never update, never rewrite.
2. **JSON payload.** Typed top-level fields for query-critical values; everything else in a JSON blob that can evolve without migrations.
3. **Capture intent AND outcome.** Log what the scheduler decided (intent) and what the user did in response (outcome). The delta is the learning signal.
4. **Non-blocking.** Logging writes fire-and-forget from the scheduler hot path. Failure to log never breaks a scheduling run.
5. **Privacy by default.** Every event scoped by `userId`. No cross-user aggregation at write time. Feature-vector oriented — never log raw task content if a feature hash will do.
6. **Version-tagged.** Every event carries `schedulerVersion` so offline replay can tell which algorithm produced a decision.

## Table: `SchedulerEvent`

```prisma
model SchedulerEvent {
  id               String   @id @default(cuid())
  userId           String
  eventType        String   // see taxonomy below
  occurredAt       DateTime @default(now())
  schedulerVersion String   // e.g. "1.2.0"
  taskId           String?  // denormalized for common filter
  payload          Json

  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, eventType, occurredAt])
  @@index([taskId, occurredAt])
  @@index([occurredAt])
}
```

**Cascade on user delete** — satisfies "delete user → delete all their events" for privacy compliance.

**Retention**: keep raw events 2 years; plan a nightly ETL after MVP that compacts events older than 90 days into feature rows for training.

**Partitioning**: not needed until `SchedulerEvent` exceeds ~10M rows. Postgres table partitioning by month on `occurredAt` when we hit scale.

## `schedulerVersion` constant

Single constant in code, bumped whenever scoring/filtering logic changes in a way that would affect decisions:

```typescript
// src/services/scheduling/version.ts
export const SCHEDULER_VERSION = "1.2.0";
```

Minor bumps (`1.2.0` → `1.2.1`) for weight tweaks. Major bumps (`1.x` → `2.0`) for paradigm or factor changes (e.g., removing `priorityScore`).

## Event taxonomy

### `SCHEDULE_DECISION` — a task was placed in a slot

**The gold datapoint source.** One event per task placed during a scheduling run.

```typescript
{
  runId: string; // UUID, links all decisions from the same run
  chosen: {
    start: string;           // ISO 8601 UTC
    end: string;
    score: number;           // total weighted score
    factors: {               // per-factor scores before weighting
      workHourAlignment: number;
      energyLevelMatch: number;
      projectProximity: number;
      bufferAdequacy: number;
      timePreference: number;
      deadlineProximity: number;
      priorityScore: number;
    };
  };
  alternatives: Array<{      // top 5 rejected slots, descending by score
    start: string;
    end: string;
    score: number;
    factors: Record<string, number>;
  }>;
  taskContext: {
    projectId: string | null;
    areaId: string | null;
    scheduleId: string | null;
    tagNames: string[];
    duration: number;        // minutes
    priority: string | null; // URGENT/HIGH/MED/LOW/NONE
    hasDeadline: boolean;
    daysToDeadline: number | null;
    energyLevel: string | null;
    preferredTime: string | null;
    isChunked: boolean;      // future-proofing for Phase 11
  };
  runContext: {
    candidateSlotsGenerated: number;
    candidateSlotsAfterFiltering: number;
    searchWindowDays: number;
    filterReasons: Record<string, number>; // {"conflict": 12, "outside_work_hours": 4}
  };
}
```

### `SCHEDULE_RUN` — a full scheduling run completed

Aggregate event emitted once per run, after all decisions are logged.

```typescript
{
  runId: string;
  runType: "interactive" | "full_rebalance" | "auto_sync" | "manual";
  triggeredBy: "task_edit" | "feed_sync" | "manual_button" | "scheduled" | "startup";
  durationMs: number;
  tasksConsidered: number;
  tasksPlaced: number;
  tasksUnplaced: number;
  unplacedReasons: Record<string, number>; // {"no_slots_found": 3, "conflict": 2}
}
```

### `TASK_RESCHEDULED_BY_USER` — user manually moved a scheduled task

**The gold label for preference learning.** Fires ONLY when `changeSource !== "scheduler"`.

```typescript
{
  from: {
    start: string;
    end: string;
    wasSchedulerPlaced: boolean;
    schedulerScore: number | null;
    schedulerFactors: Record<string, number> | null; // recovered from prior SCHEDULE_DECISION by taskId
    minutesSinceOriginalPlacement: number | null;
  };
  to: {
    start: string;
    end: string;
    computedFactors: Record<string, number>; // score the new slot at reschedule time with current algorithm
    computedScore: number;
  };
  rescheduleNumber: number; // 1st, 2nd, 3rd time this task has been moved since last placement
  source: "ui_drag" | "ui_edit_modal" | "omnifocus_sync" | "api";
  inferredReason: string | null; // see "Inferred reason codes" section; null if no rule matched
  matchedAlternativeRank: number | null; // if the "to" slot was ranked #2/#3/etc. in the original SCHEDULE_DECISION, 1-indexed
}
```

### `TASK_COMPLETED` — task marked complete

**The outcome signal.** Tells us whether the scheduler's placement actually worked.

```typescript
{
  completedAt: string;
  wasScheduled: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  completedInScheduledWindow: boolean;    // within [start - 15min, end + 15min]
  completionLagMinutes: number | null;    // negative if early, positive if late
  rescheduleCountBeforeCompletion: number;
  durationEstimatedMinutes: number;
  durationActualMinutes: number | null;   // only if we can observe it
  source: "ui" | "omnifocus_sync" | "api";
  inferredReason: string;                 // see "Inferred reason codes"; always populated
  promptedForFeedback: boolean;           // did the UI show a thumbs/why prompt?
}
```

### `TASK_POSTPONED` — task bumped to a future date

```typescript
{
  previousScheduled: { start: string; end: string } | null;
  postponedUntil: string;
  postponeCount: number;
  source: "ui" | "omnifocus_sync" | "api";
}
```

### `TASK_LOCKED` / `TASK_UNLOCKED` — user pinned/unpinned a placement

Lock is a **strong positive signal**: "this exact placement is correct, don't move it."

```typescript
{
  scheduledStart: string | null;
  scheduledEnd: string | null;
  locked: boolean;
  factorsAtLockTime: Record<string, number> | null; // score breakdown at moment of lock
}
```

### `TASK_DURATION_ADJUSTED` — user edited task duration

Signal for planning accuracy. If estimated < actual consistently for a user, learn to inflate estimates.

```typescript
{
  fromMinutes: number;
  toMinutes: number;
  source: "user_edit" | "completion_feedback";
}
```

### `COMPLETION_SIGNAL` — one-click thumbs up/down at completion

**The cheapest feedback mechanism.** Shown as a non-modal toast immediately after completion. One tap to answer, free skip.

```typescript
{
  taskCompletedEventId: string;  // reference to the TASK_COMPLETED event this pairs with
  signal: "up" | "down" | "skip";
  latencyMs: number;              // how long between completion and signal — high = dismissed reflexively
  surface: "toast" | "modal" | "morning_review";
}
```

Semantics:
- `up`: "this was the right time" → strong positive reinforcement for the placement
- `down`: "this was NOT the right time" → triggers optional `FEEDBACK_PROVIDED` follow-up ("what would've been better?")
- `skip`: neutral, counts toward fatigue dampening (3 skips in a row → back off prompts for a week)

### `FEEDBACK_PROVIDED` — structured why/what-would-be-better answer

**The detailed reason signal.** Fired after a `COMPLETION_SIGNAL: down`, a missed-task prompt, a moved-up prompt, or any hard-case prompt during morning review.

```typescript
{
  triggerEventId: string;        // references the event that prompted this ask
  triggerType:
    | "thumbs_down_follow_up"
    | "missed_task"
    | "moved_up"
    | "moved_back"
    | "many_reschedules"
    | "long_slipping"
    | "sampled_positive"          // rare sampled ask even on success ("is this slot still right?")
    | "morning_review_batch";
  structuredReason: string;       // chip value picked by user (enum per triggerType, see below)
  freeText: string | null;        // optional "other" text
  skipped: boolean;               // user dismissed without answering
  skippedReason: "dismissed" | "rate_limited" | "too_busy" | null;
  promptedInBatch: boolean;       // part of a morning-review digest vs. inline interruption
  ratePolicy: {
    dailyAskCount: number;        // how many asks the user has seen today
    consecutiveSkips: number;     // how many skips in a row across all prompt types
    dampenedUntil: string | null; // if user hit skip threshold, when we resume asking
  };
}
```

**Chip values by `triggerType`:**

| triggerType | structuredReason chips |
|---|---|
| `thumbs_down_follow_up` | `earlier_today`, `later_today`, `different_day`, `different_energy`, `different_context`, `other` |
| `missed_task` | `ran_out_of_time`, `low_energy`, `wrong_context`, `task_too_big`, `got_interrupted`, `didnt_want_to`, `other` |
| `moved_up` | `dependency_freed`, `felt_urgent`, `momentum`, `free_time_appeared`, `other` |
| `moved_back` | `too_ambitious`, `blocked`, `priorities_changed`, `duration_underestimated`, `other` |
| `many_reschedules` | `too_ambitious`, `blocked`, `priorities_changed`, `duration_underestimated`, `needs_breakdown`, `other` |
| `long_slipping` | `still_matters`, `needs_breakdown`, `delegate`, `drop`, `defer_indefinitely`, `other` |
| `sampled_positive` | `perfect_slot`, `ok_slot`, `actually_prefer_different`, `other` |

### `AGENT_PROPOSAL_SHOWN` / `AGENT_PROPOSAL_ACCEPTED` / `AGENT_PROPOSAL_REJECTED`

*Future events for the AI agent layer (not MVP).* Track user reactions to morning-review proposals.

## Inferred reason codes

**Philosophy: infer aggressively, ask only when inference is ambiguous.** The logger auto-tags every completion and reschedule event with an `inferredReason` before any user prompt is considered. This covers ~60% of events with zero user friction and ensures even skipped/dismissed prompts produce useful data.

### For `TASK_COMPLETED`

Evaluated in order — first matching rule wins.

| Condition | `inferredReason` | Prompt policy |
|---|---|---|
| `wasScheduled = false` | `completed_unscheduled` | Don't prompt |
| `|completionLagMinutes| <= 15` | `scheduler_right` | Don't prompt (strongest positive) |
| `-30 <= completionLagMinutes < -15` | `completed_slightly_early` | Don't prompt |
| `15 < completionLagMinutes <= 30` | `completed_slightly_late` | Don't prompt |
| `completionLagMinutes < -120` | `completed_much_earlier` | Prompt (moved_up ask) |
| `completionLagMinutes > 120` | `completed_much_later` | Prompt (thumbs + why) |
| Completed on scheduled day, outside window by <2h | `completed_same_day_off_window` | Thumbs only, no why |
| `rescheduleCountBeforeCompletion == 0` AND in-window | `first_try_hit` | Thumbs only, sampled |
| `rescheduleCountBeforeCompletion >= 3` | `completed_after_many_reschedules` | Prompt (why?) |
| Task was `scheduleLocked=true` at completion AND in-window | `user_locked_and_completed` | Don't prompt (already told us) |
| Repeat task; completed in its expected slot for 3rd+ occurrence | `pattern_locked_in` | Don't prompt |

**Sampled positive asks:** For events tagged `scheduler_right` or `first_try_hit`, ask 1 in 20 times with a light "quick check — still a good slot for this?" prompt. Prevents silent lock-in of suboptimal placements.

### For `TASK_RESCHEDULED_BY_USER`

Evaluated in order.

| Condition | `inferredReason` |
|---|---|
| `to` slot matches an alternative in the prior `SCHEDULE_DECISION` (rank 2 or 3) | `alternative_preferred` (carry `matchedAlternativeRank`) |
| `to` slot is earlier than `from` on the same day | `moved_earlier_same_day` |
| `to` slot is later than `from` on the same day | `moved_later_same_day` |
| `to` slot is on a different calendar day | `moved_different_day` |
| `rescheduleNumber >= 3` | `repeated_reschedule` |
| `source = "omnifocus_sync"` | `of_sourced_reschedule` |
| Default | `generic_reschedule` |

### For missed tasks (inferred, not a direct event)

Missed tasks don't fire a TASK_COMPLETED. A nightly batch job inspects yesterday's scheduled tasks and emits synthetic events for misses:

| Condition | Event fired | `inferredReason` |
|---|---|---|
| Scheduled for yesterday, not completed, not postponed | `TASK_MISSED` (new event type, deferred to post-MVP) | `unknown_miss` |
| Scheduled yesterday, still scheduled for a future day (auto-rebalanced forward) | `TASK_MISSED` | `auto_rebalanced_forward` |
| Scheduled yesterday, postponed by user | Already covered by `TASK_POSTPONED` | n/a |

### Aggregate-pattern codes (computed nightly, not per-event)

Not event tags — these are derived features surfaced in dashboards and fed into ML:

- `afternoon_preference` — user consistently moves AM → PM tasks
- `morning_preference` — inverse
- `context_pattern_@computer_morning` — tasks with @computer tag consistently complete in AM slots
- `chronic_slipper_N` — specific task postponed/rescheduled 5+ times
- `duration_underestimator_N` — user consistently edits duration upward on their tasks

## Fatigue management

Encoded in the logger and shared across all prompt types:

| Rule | Threshold | Action |
|---|---|---|
| Daily ask cap | 3 prompts/day | Suppress further asks until tomorrow |
| Consecutive skips | 3 in a row | Dampen prompt frequency by 50% for 7 days |
| Morning review compliance | User completes ritual 3+ days in a row | Full prompt frequency (reward loyalty) |
| Downward trend | Compliance drops below 30% over 14 days | Switch to "minimal asks" — only `long_slipping` and `many_reschedules` triggers fire |
| Opt-out | User toggles feedback off in settings | No prompts ever; inference-only logging continues |

All state stored on the `User` model or a dedicated `UserFeedbackState` record. Every `FEEDBACK_PROVIDED` event carries the current `ratePolicy` snapshot so analysis can correlate compliance with learning quality.

## Instrumentation points

Where each event gets emitted in the current codebase:

| Event | Location | Trigger |
|---|---|---|
| `SCHEDULE_DECISION` | `SchedulingService.scheduleMultipleTasks` — after `scoreSlots` + slot chosen, before committing placement | once per task placed |
| `SCHEDULE_RUN` | `TaskSchedulingService.scheduleAllTasksForUser` — on completion | once per run |
| `TASK_RESCHEDULED_BY_USER` | Task update API route (`PUT /api/tasks/[id]`) — when `scheduledStart`/`scheduledEnd` change AND `changeSource !== "scheduler"` | user edit |
| `TASK_COMPLETED` | Same route — when `status` changes to `COMPLETED` | user or OF sync |
| `TASK_POSTPONED` | Same route — when `postponedUntil` set | user or OF sync |
| `TASK_LOCKED`/`UNLOCKED` | Same route — when `scheduleLocked` flips | user |
| `TASK_DURATION_ADJUSTED` | Same route — when `duration` changes | user |
| `COMPLETION_SIGNAL` | New endpoint `POST /api/feedback/completion-signal` — called by the toast UI on 👍/👎/skip | user UI click |
| `FEEDBACK_PROVIDED` | New endpoint `POST /api/feedback/reason` — called by the chip-picker modal | user UI click |

## Echo prevention

The scheduler calls the same task-update code paths that the UI does. We must NOT log scheduler-triggered updates as `TASK_RESCHEDULED_BY_USER`.

**Reuse the existing `changeSource` pattern** from the OF bidirectional sync (see [[task-sync-engine]]). Task updates from the scheduler carry `changeSource: "scheduler"`; user edits carry `"user"`. The logger checks `changeSource` before emitting user-reaction events.

Decision: treat `omnifocus_sync`-sourced reschedules as user reschedules (they originated from the user's action in OF, just arrived via a different path). Flag with `source: "omnifocus_sync"` in the payload so analysis can segment if needed.

## Service: `SchedulerEventLogger`

Thin wrapper around Prisma inserts. Fire-and-forget from call sites.

```typescript
// src/services/logging/SchedulerEventLogger.ts

interface EventBase {
  userId: string;
  taskId?: string;
}

export class SchedulerEventLogger {
  async logScheduleDecision(base: EventBase, payload: ScheduleDecisionPayload): Promise<void>;
  async logScheduleRun(base: EventBase, payload: ScheduleRunPayload): Promise<void>;
  async logUserReschedule(base: EventBase, payload: UserReschedulePayload): Promise<void>;
  async logTaskCompleted(base: EventBase, payload: TaskCompletedPayload): Promise<void>;
  async logTaskPostponed(base: EventBase, payload: TaskPostponedPayload): Promise<void>;
  async logTaskLocked(base: EventBase, payload: TaskLockedPayload): Promise<void>;
  async logDurationAdjusted(base: EventBase, payload: DurationAdjustedPayload): Promise<void>;
}
```

**Implementation notes:**
- Each method does one Prisma insert. No batching for MVP (latency is fine).
- Errors logged to console + Sentry, never thrown. Scheduling must not fail because logging failed.
- `SCHEDULER_VERSION` baked in by the logger, not passed by callers.
- Caller passes the enriched payload; the logger does not re-query the DB to fill fields.

## Phase 0 MVP — start this week

Minimum viable logging to begin data collection immediately. Split into **Phase 0a (silent logging)** and **Phase 0b (thumbs UI)** so the backend goes live first, UI follows.

### Phase 0a — Silent logging (days 1–2)

1. **Prisma migration** adding `SchedulerEvent` table.
2. **`SchedulerEventLogger`** service with six methods: `logScheduleDecision`, `logUserReschedule`, `logTaskCompleted`, `logTaskLocked`, `logCompletionSignal`, `logFeedbackProvided`. Last two no-op until UI wired; stubs exist so call sites don't need rewrite later.
3. **`InferenceEngine`** module that takes raw event payloads and returns `inferredReason` per the rules above. Unit-tested in isolation.
4. **Instrument `SCHEDULE_DECISION`** in `SchedulingService.scheduleMultipleTasks`.
5. **Instrument `TASK_RESCHEDULED_BY_USER`** in task update route, with `changeSource` echo prevention and `inferredReason` populated by the engine.
6. **Instrument `TASK_COMPLETED`** in task update route (status transition), with `inferredReason` populated.
7. **Instrument `TASK_LOCKED`** in task update route (flip detection).

Phase 0a ships without any UI. Logging runs silently. `promptedForFeedback` is always `false`.

### Phase 0b — Thumbs UI + follow-up (days 3–4)

1. **Completion toast UI** — non-modal "Was this the right time? 👍/👎/skip" after any `TASK_COMPLETED`.
2. **Emit `COMPLETION_SIGNAL`** on click or dismiss.
3. **Follow-up modal on 👎** — chips for `thumbs_down_follow_up` triggerType, 2-click max.
4. **Emit `FEEDBACK_PROVIDED`** on chip click or skip.
5. **Fatigue state tracking** — minimal `UserFeedbackState` with `dailyAskCount`, `consecutiveSkips`, `dampenedUntil`.

### Deferred to post-MVP (M1+)

- `SCHEDULE_RUN` aggregates (computable from decisions via SQL)
- `TASK_POSTPONED`, `TASK_DURATION_ADJUSTED` (nice to have)
- `TASK_MISSED` synthetic events (nightly batch job)
- Morning-review batched prompts (`missed_task`, `moved_up`, `long_slipping`, `many_reschedules` triggers)
- Sampled-positive prompts (1-in-20 on `scheduler_right` events)
- Aggregate-pattern computation (`afternoon_preference` etc. — needs 30+ days of data)
- Dashboard for browsing events
- ETL compaction (not needed until 90+ days of data)
- Agent proposal events (when the agent layer exists)

Cost of MVP: Phase 0a ~2 days. Phase 0b ~2 days. Ship 0a first, verify silent logging works end-to-end, then wire UI.

## Pivot playbook

If the event shape turns out wrong:

- **Too much payload volume.** Drop `alternatives` from `SCHEDULE_DECISION` (keep only top-1 runner-up). Cuts ~70% of the row size. Can do retroactively: new events omit, old events keep, analysis handles both.
- **Missing a critical field.** Add it to the TypeScript payload type, start writing it. Old events have `undefined`; analysis code treats `undefined` as "unknown, exclude from this window."
- **Wrong event granularity.** Add a new event type, start writing it, stop writing the old one. Both coexist in the table. Document the cutover date in this file's Changelog.
- **User retention concerns.** Add a per-user kill switch (`User.loggingEnabled`). Default on for self-hosted, opt-in for SaaS.

**Hard rule: never rewrite historical events.** If the schema changes, the transformer lives in analysis code, not in the table.

## Open questions (flag before implementation)

- **Duration of `alternatives` list.** Top 5 feels right, but might be overkill. If storage is tight, top 3 probably captures the interesting signal (chosen vs. next-best vs. anchor). Default to 5, review after 30 days.
- **How to identify which `SCHEDULE_DECISION` corresponds to a later `TASK_RESCHEDULED_BY_USER`.** Lookup by `taskId` with latest `occurredAt`. Index on `(taskId, occurredAt)` exists.
- **Completion window definition.** Proposing ±15 min around scheduled block as "completed in window." Tune after we see real data.
- **Retention for SaaS users who churn.** GDPR "right to be forgotten" means cascade delete on user delete — already in schema. Good.
- **Whether to log on self-hosted deployments.** Default yes, but provide `ENABLE_SCHEDULER_LOGGING` env var for users who don't want it. Off-by-default feels wrong; on-by-default with opt-out feels right.

## Privacy policy notes (draft language for later)

- Events are scoped per-user and only retrievable by the user or a system-admin debugging on the user's behalf.
- No cross-user data aggregation without explicit opt-in.
- Event export: "Download my scheduling history" button in Settings returns JSON of all their events.
- Event delete: cascade on user delete; also a "Clear my history" option in Settings.
- Training: any cross-user model training is opt-in and uses feature vectors, never raw task titles/descriptions.
