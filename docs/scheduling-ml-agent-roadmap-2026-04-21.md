---
title: ML + AI Agent Roadmap for FluidCalendar
status: proposal
tags: [fluidcalendar, ml, ai-agent, roadmap, saas]
updated: 2026-04-21
---

Forward-looking roadmap for evolving FluidCalendar from a heuristic weighted-sum scheduler into a personalized, context-aware planning system suitable for SaaS. Three tracks stacked on the current engine, all gated by one foundation: **event logging from day one.**

Related: [[scheduling-algorithm-review-2026-04-21]] (paradigm analysis), [[scheduling-event-schema-2026-04-21]] (concrete event spec), [[fluidcalendar-fork]] (project page).

## Vision

Three capabilities the current scheduler cannot do:

1. **Learn from your corrections** — every time you drag a task to a better slot, the scheduler should get smarter about *you*.
2. **Predict follow-through** — not just "which slot scores best" but "which slot will you actually do the work in."
3. **Act on life context** — an AI agent that notices "you're driving past Walgreens on the way home" and offers to schedule a prescription pickup in that window.

All three share one prerequisite: a rich event log of scheduling decisions and user responses. Without it, every future model is starting from zero. The cheapest and most important thing to do right now is **start logging**, even before anything consumes the logs.

## Track 1: Per-user preference learning

### Phase A — Weight fitting (target: 300 reschedule events, ~3 months)

**Model:** Ridge logistic regression on `(chosenFeatures − rejectedFeatures)` per reschedule event.

- Input: feature vector of the slot the scheduler chose vs. feature vector of the slot the user moved the task to
- Label: user's move = preference for the target slot over the original
- Output: per-user adjustments to the 7 base factor weights
- Inference: `finalWeight[i] = baseWeight[i] * (1 + userAdjustment[i])`

**Why this first:** small data, fast to train, explainable (coefficients ARE the adjustments), low risk. Keeps hand-authored weights as a prior — user learning only shifts them, doesn't replace them.

**Effort:** moderate. ~2 weeks feature engineering + training pipeline + A/B harness.

**Success metric:** measurable drop in reschedule rate per user after 30 days of learned weights vs. baseline.

### Phase B — Completion prediction (target: 3,000 events, ~9 months)

**Model:** Gradient boosting (XGBoost or LightGBM) predicting `P(task completed in scheduled block)` from slot feature vector + task features.

- Use: re-rank candidate slots by `score × P(followThrough)` instead of just score
- Surfaces tasks that the engine *can* place but the user will never actually do (keep getting rescheduled forward)
- Flag these tasks to the user as "likely to slip — want to break it down or drop it?"

**Why tabular ML not deep learning:** at 3k–30k samples XGBoost crushes neural nets on tabular data. SHAP values give per-decision explainability, which matches the GTD trust requirement.

**Effort:** significant. Feature store, training pipeline, model serving, evaluation harness.

### Phase C — SaaS foundation model (multi-user scale)

**Model:** Cross-user population prior. New users warm-start from population weights, fine-tune on their own reschedules.

- Opt-in only (cross-user data pooling)
- Feature vectors aggregated, no content leaves user scope
- Fine-tuning happens per-user against the base model

**Why this unlocks SaaS:** solves the cold-start problem. Day-one users get a reasonable scheduler without needing 300 reschedules first.

**Effort:** significant. Multi-tenant ML infra, privacy tooling, opt-in UX.

## The Feedback Loop (cross-cutting, gates Track 1 quality)

Behavior logs alone tell us *what* the user did — not *why*. Explicit feedback is what turns a scheduler that predicts behavior into a scheduler that reflects preferences. Placed between Tracks 1 and 2 because it feeds both.

### Design principles

1. **Infer first, ask only on ambiguity.** See [[scheduling-event-schema-2026-04-21#inferred-reason-codes]] for the full inference matrix. ~60% of events get an `inferredReason` automatically, with zero user friction.
2. **1-click baseline, 2-click ceiling.** A thumbs up/down toast on every completion. Escalate to a chip picker only on 👎 or miss/slip triggers. Never more than 2 clicks for routine feedback.
3. **Batch hard questions into the morning review ritual.** Missed tasks, multi-reschedules, long-slipping items get asked once per day during planning — never mid-day interruptions.
4. **Fatigue management is first-class.** 3/day cap, consecutive-skip backoff, morning-ritual-streak rewards, an explicit opt-out toggle.
5. **Always show learning.** "Last week you said afternoons don't work for deep work. I've moved those to mornings this week — did it help?" The reward keeps compliance up.
6. **Start aggressive, instrument compliance, auto-dampen.** User's explicit preference (2026-04-21): begin with ask-on-every-completion thumbs, let data tell us when to throttle.

### UX surfaces

| Surface | When | Interaction | Cost |
|---|---|---|---|
| Completion toast | After any `TASK_COMPLETED` | 👍 / 👎 / skip | 1 click |
| Thumbs-down follow-up | After 👎 | "What would've been better?" chip picker | 1 additional click |
| Morning review digest | 6am or on first app open of the day | Batched asks for yesterday's misses, moved-up, many-reschedules | 30–60 sec total |
| Long-slipping review | Weekly, inside morning review | "This task has been postponed 5 times. Still matters?" | 1 click |
| Sampled positive | 1-in-20 completions marked `scheduler_right` | "Quick check — still the right slot for this?" | 1 click, easy skip |
| Learning receipt | Weekly | "Here's what I learned about you this week — apply it?" | 1 click confirm |

### Events that capture it

Defined in the schema spec:
- `COMPLETION_SIGNAL` — 1-click thumbs up/down/skip
- `FEEDBACK_PROVIDED` — structured chip answer with optional free text
- `inferredReason` field on `TASK_COMPLETED` and `TASK_RESCHEDULED_BY_USER` — populated by the logger before any prompt fires

### How this feeds Track 1 (personalization)

- **Explicit labels are higher-signal than behavioral deltas.** A 👎 with `structuredReason: "different_energy"` is a cleaner training example than a reschedule event that might mean a dozen things.
- **Chip values become new features.** Aggregates like "this user flags `low_energy` on 40% of afternoon deep-work tasks" become direct inputs to per-user weight fitting.
- **Discover missing factors.** If `"other"` free-text clusters around "kids were home," that's a new context tag to consider supporting.
- **Calibrate completion prediction.** Labeled "missed because too big" events feed a chunking-recommendation signal separately from "missed because low energy."

### How this feeds Track 2 (AI agent)

The morning-review ritual is the natural home for batched feedback. The agent that already asks "you're driving to Pease tomorrow, schedule these calls?" is also the agent that asks "you missed deep-work yesterday — why?" Same surface, same ritual, same 60-second time budget.

### Rollout path

- **Phase 0b (days 3–4 of MVP):** Thumbs toast + thumbs-down follow-up. Inline only. No batching yet. Start aggressive.
- **M1 (+30 days):** Compliance dashboard (per-user acceptance rate, skip rate, dampening triggers). Tune thresholds from real data, not guesses.
- **M2 (+60 days):** `TASK_MISSED` synthetic events + morning-review digest for missed/moved-up/many-reschedules. Migrates hard asks out of inline prompts.
- **M3 (+90 days):** Sampled-positive prompts ship; learning-receipts UI ships. User starts seeing what the system learned.
- **M4 (+120 days):** AI agent morning review integrates the feedback digest. One unified ritual.

## Track 2: AI agent morning review

Can start in parallel with Track 1 Phase A — only requires the existing calendar/task data plus a few context fetchers.

### Architecture

Scheduled Claude agent runs at 6am local. Agent has tools:

| Tool | What it does | Data source |
|---|---|---|
| `getSchedule(day)` | Fetch today's planned tasks + events with locations | FC DB + GCal |
| `getUpcomingDrives(day)` | Infer drive segments from events with locations | Apple MapKit / Google Maps Directions API |
| `getDriveCompatibleTasks()` | Tasks tagged @calls / @voice / @audio | FC DB tag filter |
| `getLocationTaggedTasks()` | Tasks with a @location:* tag near any drive waypoint | FC DB + geo radius |
| `getUserPatterns(context)` | "Nicholas usually does prescription pickups on Thursdays between 5–7pm" | Event log aggregates |
| `getWeather(day, location)` | Feasibility check for outdoor tasks | Weather API |
| `proposeScheduleChange(diff)` | Emit a structured proposal for user approval | UI |

### Example outputs

> "You're driving to Pease at 10am tomorrow. You have three open calls tagged @phone. Move them to the drive time?" `[Accept All] [Pick] [Skip]`

> "On your way home from Pease you'll pass Walgreens. Your prescription has been sitting in the @errands list for 4 days. Add a 15-min pickup stop?" `[Accept] [Skip]`

> "Weather Thursday is rain. Three @home-outside tasks are scheduled. Move them to Friday (clear)?" `[Accept] [Skip]`

### Design principles

1. **Proposes, never auto-applies.** Agent builds a diff, user reviews, approves individual items. You own your commitments (GTD compliance).
2. **Morning ritual, not constant nagging.** One structured digest per day. This matches Sunsama's "planning ritual is the product" insight.
3. **Explains its reasoning.** Every proposal cites the trigger ("noticed drive to Pease", "noticed @errands task near waypoint").
4. **Learns from accept/reject.** Agent proposals become another event type — a new labeled signal feeding back into Track 1.
5. **Houses the feedback digest.** Batched hard-question prompts (missed, many-reschedules, long-slipping) live inside this ritual rather than interrupting the day. See [[#the-feedback-loop-cross-cutting-gates-track-1-quality]].

### Effort

MVP (drives + location errands): moderate. ~3 weeks to get the route inference and errand matching working. The Claude harness is straightforward — a scheduled cron + a tool-using agent loop + a UI for the digest.

## Track 3: Cross-task constraints (optional future)

If the scheduler ever needs to respect constraints that cross tasks — "max 4 hours deep work per day," "no two demanding tasks back-to-back," "respect project days" — the current greedy algorithm will hit its myopia ceiling. At that point, migrate to CP-SAT + scoring hybrid (see [[scheduling-algorithm-review-2026-04-21#1-is-weighted-sum-scoring-the-right-paradigm]]).

Not on the critical path. Only pursue if user feedback demands cross-task coordination.

## SaaS considerations

Getting the foundation right now is cheap; retrofitting later is expensive.

**Data model:**
- Every event scoped by `userId`
- Payload as JSON (schema can evolve)
- Retention: raw events 2 years, compacted feature rows after 90 days
- Partition by month when volume exceeds ~10M rows

**Privacy:**
- Per-user isolation by default
- Feature-vector logging only for population models
- Export: user can dump all their events as JSON
- Delete: cascade delete events on user delete
- Opt-in explicit for cross-user training

**Observability:**
- Dashboard for browsing events per user (debug + trust)
- Aggregates: reschedule rate, completion rate by feature, unplaced task reasons
- Event replay: feed old events through new scheduler versions to evaluate improvements offline

## Milestones

| ID | Milestone | Target | Depends on |
|---|---|---|---|
| M0a | **Silent event logging live** (schema + logger + inference engine, no UI) | now, days 1–2 | — |
| M0b | **Thumbs UI + follow-up modal** (1-click signal on every completion) | days 3–4 | M0a |
| M1 | Compliance dashboard + fatigue tuning | +30 days | M0b |
| M2 | Morning-review digest for missed/moved-up/many-reschedules + `TASK_MISSED` synthesis | +60 days | M1 |
| M2.5 | First weight-fitting experiment | +90 days | enough reschedule events |
| M3 | Sampled-positive prompts + weekly learning receipts | +90 days | M2 |
| M4 | AI agent morning review (drives + errands + feedback digest) | +120 days | M2, M3 |
| M5 | Completion prediction model | +180 days | M2.5 |
| M6 | Multi-tenant infra + cross-user prior | SaaS launch | M5 |

M0a is the gate. Everything downstream is waiting on logs. M0b unlocks explicit-feedback data flow.

## Open questions

- **Location/route data source.** Apple MapKit (native macOS framework, no quota) vs. Google Maps Directions (richer, quota-limited, SaaS friendly). Probably Google for SaaS, MapKit for the self-hosted single-user case. Could abstract behind a `RouteService` interface.
- **Agent harness.** Claude API with tool use (cleanest) vs. local via Claude Code scheduled trigger (matches current infra — see `operations/run-sitrep.sh` pattern). Probably Claude API for SaaS, local harness for dev.
- **Opt-in UX for cross-user training.** Needs to be clear, reversible, and tied to a real value exchange ("turn this on and new users learn faster"). Not opt-out by default.
- **Event retention policy tuning.** 2 years raw might be overkill for MVP; 90 days compacted to features may be enough. Defer until we see volume.
- **What counts as a "completed in the scheduled block"?** Strict window match? Within ±15 min? Any completion on the scheduled day? Decide early so the outcome signal stays consistent.

## Pivot strategy

The event payload is JSON by design — schema can evolve without migrations. But we should be disciplined:

- **Never rewrite old payloads.** Add a transformer for analysis if old shapes break.
- **Bump `schedulerVersion` on every algorithm change.** Every event carries it, which lets offline replay distinguish decisions from different scheduler versions.
- **CHANGELOG at the top of the schema spec.** Every payload shape change logged there.
- **Pivot triggers:**
  - *Too much data.* Drop `alternatives` array (top 5 slots) from SCHEDULE_DECISION — keep only chosen + one runner-up. Cuts payload ~70%.
  - *Wrong data.* Add new event type, start writing it, stop writing the old one. Old events remain for historical context, new analysis works on new shape.
  - *Cross-user data not usable.* Keep per-user logging, drop the aggregation pipeline. Track 1 Phase C becomes optional.

## The one-line take

Log decisions and user reactions, unmodified, from today. Every other capability on this roadmap is a function of how much of that log you have.
