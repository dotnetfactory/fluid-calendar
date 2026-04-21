---
title: Scheduling Algorithm Review — Paradigm, GTD Fit, and Improvement Roadmap
status: active
tags: [fluidcalendar, scheduling, gtd, research]
updated: 2026-04-21
---

Deep research review of the FluidCalendar auto-scheduling algorithm. Evaluates the current weighted-sum scoring paradigm against alternatives (CP, MILP, metaheuristics, RL, game theory), surveys how commercial auto-schedulers actually work, and produces a ranked set of concrete improvements aligned with GTD methodology.

Related: [[scheduling-engine]] (current algorithm reference), [[fluidcalendar-fork]] (project page).

## 1. Is weighted-sum scoring the right paradigm?

Weighted-sum scoring with greedy assignment is the workhorse of personal scheduling tools for one reason: it's the only paradigm that cleanly meets the three binding constraints of this domain — sub-second interactive latency, explainability (the user must be able to predict why a slot was chosen), and incremental updates (one task added, or one event moved, should not trigger a 30-second recompute). At ~250 tasks and a 14–90 day horizon, it is absolutely defensible. But the current implementation is under-using the paradigm.

**Weighted-sum scoring (current).** Greedy assignment with linear scoring is O(tasks × slots) and runs in milliseconds. It is trivially explainable ("we put it here because the deadline pressure was 0.82, energy match was 1.0, etc."), easy to tune, and easy to maintain. The classic failure mode is that it is myopic: it commits task 1 to the best slot for task 1 without considering that task 7 could only fit there. For 250 tasks on a 14-day horizon (~14 × 8h × 2 slots/hr = 224 slots per day = ~3,100 slots), there is vastly more slot supply than task demand for most users, so the myopia rarely bites. It bites hard only near deadlines, which is exactly where scheduler failures tend to be noticed.

**Constraint satisfaction / constraint programming (CP-SAT, OR-Tools).** CP shines when you have hard constraints that resist the greedy heuristic — mutual exclusion, precedence, resource capacity. For personal scheduling with soft preferences and a single "resource" (the person), CP is overkill. The research literature confirms it: [Refanidis and Yorke-Smith's "constraint-based approach to scheduling an individual's activities"](https://homepage.tudelft.nl/0p6y8/papers/n82.pdf) explicitly frames personal activity scheduling as "more than a CSP — it is an optimization problem," and their system still needs a utility function bolted on top. Modern CP-SAT solvers can handle 250 tasks in well under a second ([OR-Tools scheduling docs](https://developers.google.com/optimization/scheduling)), so latency isn't the blocker. The real blocker is explainability — CP solvers return "here's the assignment," not "here's why slot X beat slot Y by 0.07 points." For a GTD practitioner who needs to trust and override the scheduler, this matters.

**MILP.** Strictly worse than CP for this problem. MILP needs big-M reformulations for disjunctive constraints (see [MDPI production scheduling comparison](https://www.mdpi.com/2076-3417/13/10/6003)), which balloons model size. CP-SAT uniformly dominates for scheduling. Skip.

**Metaheuristics (GA, SA, tabu).** Simulated annealing and genetic algorithms are appropriate when the search space is too large for exact methods. 250 tasks × 3,000 slots isn't that large. SA's strength is escaping local optima in rugged landscapes; the personal-scheduling landscape is smooth (most tasks are near-indifferent between adjacent slots). SA would add 2–10 seconds of runtime and obscure explainability, buying nothing. Skip unless hard constraints later make the problem NP-hard in practice.

**RL / learned scoring.** The most interesting long-term direction. Real academic work exists — [CMU's "Learning user preferences in distributed calendar scheduling"](https://www.ri.cmu.edu/pub_files/2015/3/oh2004-patat.pdf) and [Kim et al., NESA 2018](https://arxiv.org/abs/1809.01316). Both show you can infer a user's preference model from observed scheduling behavior. The practical path is NOT end-to-end RL (too few signals, too slow to train, unexplainable). The practical path is *offline weight learning from reschedule events*: every time the user drags a scheduled task, that is a labeled preference datapoint. Aggregate 200–500 of those and you can fit the factor weights with ridge regression.

**Hybrid: CP for hard constraints, scoring for preferences.** This is where the scheduler should end up at the next major rewrite. Use CP-SAT to enumerate *feasible* slots respecting work hours, DayBlocks, buffers, and calendar conflicts — which is what filtering already does, but a solver handles it more robustly for cross-task constraints (e.g., "don't schedule both deep-work tasks adjacent to each other without a break"). Then score remaining slots with the weighted sum. You get the best of both: exact handling of hard constraints, explainable preference handling. At 250 tasks it's still sub-second.

**Verdict on paradigm:** Weighted-sum scoring is the right paradigm *for now*. The identified problems are bugs in the weight allocation, not in the paradigm. A hybrid CP + scoring rewrite is justified later when cross-task constraints become important (e.g., respecting a daily deep-work cap, grouping like work, respecting context-switch costs).

## 2. Game theory — applicable or not?

Single-user time-blocking is single-agent optimization. The "tasks bid for slots" framing is a category error: tasks don't have preferences, *the user* has preferences over (task, slot) pairs. Dressing that up as an auction is notation theater — you end up implementing the same weighted-sum scoring with auction vocabulary, and you've added an objective function that's harder to explain.

Legitimate game-theoretic framings exist but don't apply here:

- **Combinatorial auctions for multi-stakeholder scheduling.** Relevant when scheduling across teams where each person has private utility ([Cramton/Shoham/Steinberg canonical text](https://cramton.umd.edu/ca-book/cramton-shoham-steinberg-combinatorial-auctions.pdf), [iterative combinatorial auction mechanism for parallel machine scheduling](https://www.tandfonline.com/doi/full/10.1080/00207543.2021.1950938)). Useful for meeting-scheduling-across-org, not useful for one person blocking 250 personal tasks.
- **Nash bargaining across a family calendar.** Only relevant if modeling spouse-vs-self as two negotiating agents. For personal calendar, no.
- **Market-based meeting scheduling.** Academic curiosity. Irrelevant here.

**Verdict:** Misapplication. Don't go down this road. The one place game theory *could* become relevant is if the scheduler starts coordinating with a spouse's or team's calendar for shared blocks — then a bargaining solution concept becomes a clean way to resolve conflicts. Until then it is pure overhead.

## 3. How commercial auto-schedulers actually do this

None of them publish their algorithms in full, but help-center documentation + reverse-engineering from user-facing knobs tells a consistent story.

**Motion.** Strict hierarchical ordering: ASAP > hard deadlines > priority + deadline tie-breaking > duration/chunking ([Motion auto-scheduling docs](https://www.usemotion.com/help/time-management/auto-scheduling), [Motion FAQ](https://www.usemotion.com/help/project-management/task/task-scheduling-faq)). This is a lexicographic priority scheme, not a weighted sum. Motion's help center is explicit: "Priority always comes first, meaning nothing outranks an ASAP task unless there is no available time." Chunking is a first-class feature — long tasks split automatically to fit gaps. No evidence of energy-level scoring. No evidence of learned weights. Reshuffles dozens of times per day on any calendar change.

**Reclaim.ai.** Describes itself as "constraint optimization analyzing thousands of permutations" weighing working hours, meeting density, deadlines, and habit preferences ([Reclaim help center](https://help.reclaim.ai/en/articles/6207587-how-reclaim-manages-your-schedule-automatically)). Priority is a 4-level system (P1–P4) with higher priority overbooking lower. Claims ~15-second reshuffle latency. Probably a mix of CP for feasibility + scoring for preferences, but this is speculation — they don't document it.

**SkedPal.** Unique approach: "Time Maps" are colored preference grids (green/yellow/red/black by hour-of-week) that the user defines, and tasks are assigned to a Time Map ([SkedPal time maps](https://skedpal.com/knowledge-base/introduction-to-time-maps/)). The scheduler greedily fills green first, falls back to yellow, then red. This is effectively a user-authored version of the `energyLevelMatch` + `timePreference` factors combined. Much more transparent than inferring time preferences from an "energy level" tag.

**TimeHero.** Straight lexicographic: earliest deadline first, tie-break on priority ([TimeHero help](https://help.timehero.com/en/articles/1270270-timehero-basics)). Adds a "risk score" based on how much buffer exists before deadline. Simple. Explainable.

**Akiflow.** Not really an auto-scheduler — it's a time-blocking UI with drag-and-drop ([Akiflow time blocking](https://akiflow.com/features/time-blocking)). The "AI" is mostly natural-language input and suggestions. User does the placement.

**Sunsama.** Explicitly philosophical: the planning ritual is the point, not the algorithm ([Sunsama daily planning](https://help.sunsama.com/docs/daily-planning)). Auto-scheduling is a helper, not the engine. Uses "at roughly" time hints (similar to preferredTime) and task splitting.

**Trevor AI.** Learned duration prediction from history, slot suggestions based on availability + personalized model ([Trevor AI guide](https://www.trevorai.com/blog/plan-your-day-with-trevor-ai-the-ultimate-guide)). Pro plan has a "Personal AI Model" that learns patterns — the only tool publicly claiming per-user learned scheduling.

**Cross-tool patterns:**
1. Priority is almost always lexicographic tier-first, not a score blended with other factors. The `priorityScore`-as-dead-weight observation is the commercial-tool consensus.
2. Deadline + priority is the dominant pair. Energy and time-of-day preferences are user-declared (SkedPal Time Maps, Motion's work hours), rarely inferred.
3. Chunking is universal and under-weighted in the current FluidCalendar design.
4. Nobody auto-infers "energy levels." They let users paint time-maps.

## 4. GTD-specific critique

GTD is a context-and-available-time selection framework ("when I'm at the computer with 30 minutes and medium energy, what can I do?"), not a scheduling framework. Allen has softened on time-blocking — in his 2014+ coaching and on the [GTD forums](https://forum.gettingthingsdone.com/threads/power-use-of-your-calendar.16765/) he supports it as "inner-committee corralling" — but the canonical position is that the calendar is the "hard landscape" (inviolate commitments) and the action lists are the "soft choices" you pick from in the moment. Auto-scheduling *moves soft choices onto the hard landscape*, which is the orthodox tension.

For auto-scheduling as a time-blocking *layer* on top of GTD, the tension is resolvable, but only if the scheduler respects GTD ontology:

**GTD-compatible factors in the current scoring:**
- `bufferAdequacy` — respects the "hard landscape" by keeping meetings around their edges. Good.
- `timePreference` — maps cleanly to GTD's "time available" criterion. Good.
- `projectProximity` — matches GTD's weekly review + batching instinct. Good when enabled.

**Factors fighting GTD:**
- `priorityScore` at 18% blended into slot scoring. GTD explicitly rejects priority-as-scheduling-signal; priority is one of four selection criteria *at the moment of doing*, not a scheduling input.
- `deadlineProximity` at 31% is misallocated *for a GTD-strict configuration* where due dates mean hard external deadlines only. If 80% of tasks have no due date, 31% of scoring weight is dormant for them and then overwhelming for the 20% that do. The weight is correct in shape (deadlines should dominate when they exist) but wrong in global allocation (weight should be *conditional* on having a deadline).
- `energyLevelMatch` is GTD-compatible in principle (GTD explicitly lists "energy available" as a selection criterion) but the current implementation has it pre-set per task, which is not how GTD works. In GTD you evaluate energy *at the moment*, not at capture time. Making the user tag every task with an energy level is a capture-time burden that violates GTD's "ubiquitous capture, minimal clarification" principle.

**Should context tags play into scoring?** Yes, and heavily. Context is THE primary GTD selection criterion. A scheduler that ignores context tags is scheduling "do laundry" into a 10am-at-the-computer slot because the deadline math said so. Context tags should operate as *hard filters* (binary gate: does this slot's context match the task's context tag?) not as scoring factors. You need context-to-slot mapping: working hours blocks tagged with available contexts (@computer during the workday, @home-inside in the evenings, @home-outside on weekends). This is essentially SkedPal's Time Maps in GTD vocabulary.

**Literature:** Not much academic work on GTD-specific scheduling. Relevant community writing converges on the pattern: time-block *project* slots (e.g., "deep work on project X, 9–11am Tuesday"), leave the next-action selection to context-based lists in the moment ([Samphy Y's "GTD and Time Blocking"](https://ysamphy.com/gtd-and-time-blocking/), [Dave Edwards on Medium](https://daveedwardsmedia.medium.com/time-locking-gtd-ff3f8d086da4)). This suggests the scheduler should maybe be scheduling *project-hour-blocks*, not individual tasks — an interesting paradigm shift worth considering.

## 5. Concrete recommendations (ranked)

**1. Remove `priorityScore` from slot scoring. Keep it in task ordering.**
*Change:* Drop the factor from the weighted sum entirely. Do not redistribute its weight; set total weight to 8.0. Task-level priority is already applied via the ordering step.
*Why:* Constant-across-slots factors are mathematically inert in slot selection. Motion, TimeHero, and effectively all commercial tools treat priority as a *task-ordering* signal, not a slot-scoring signal.
*Effort:* Trivial.
*Risk:* None.

**2. Make `deadlineProximity` conditional.**
*Change:* When task has no due date, set its weight to 0 and renormalize. When task has a due date, use current formula at weight 3.0. This means tasks with due dates compete on deadline; tasks without compete on the other factors at their full weight.
*Why:* Aligns with GTD convention where due date = hard deadline. For a task without a deadline, neutral 0.5 across 31% of scoring just dampens every other signal by a third.
*Effort:* Trivial.
*Risk:* Low — formally equivalent to saying "deadline pressure only matters when there is a deadline."

**3. Remove `workHourAlignment` from scoring.**
*Change:* Delete the factor. Slots are already pre-filtered to work hours; the score is tautological.
*Why:* Pure dead weight.
*Effort:* Trivial.
*Risk:* None.

**4. Make context tags a hard filter, add context-to-slot mapping.**
*Change:* Tag each work-hour block with available contexts. During candidate generation, filter slots whose contexts don't include any of the task's contexts (OR logic within the task's tags — if a task has @computer OR @calls, either context qualifies).
*Why:* This is the single biggest GTD alignment fix. It encodes "do the right thing in the right context" into the scheduler.
*Effort:* Moderate — data model change (contexts on DayBlocks or work-hour blocks).
*Risk:* Medium. Over-filtering can make tasks un-schedulable. Need a fallback ("un-schedulable tasks remain on the list without a block").

**5. Replace `energyLevelMatch` with user-painted time preference grid (SkedPal Time Maps model).**
*Change:* Instead of tagging every task with energy=high/med/low, let the user paint the week with preference colors (green/yellow/red). Tasks optionally declare a preferred tier. Score = color value of the slot's hour, modulated by the task's tier if set.
*Why:* SkedPal's model is more transparent than trying to auto-map "energy level" to hours. Avoids the capture-time burden of tagging every task with an energy level, which violates GTD minimalism. [Circadian research](https://hbr.org/2015/01/the-ideal-work-schedule-as-determined-by-circadian-rhythms) supports hour-of-day preferences as real, but chronotype-specific — user-painted is more accurate than hardcoded morning=high-energy defaults.
*Effort:* Significant. UI for grid painting, data model, migration.
*Risk:* Medium. Best introduced alongside the context-filter change.

**6. Rebalance remaining weights.** After removing priorityScore and workHourAlignment and conditionalizing deadlineProximity:
- `bufferAdequacy`: 1.5 (from 0.8 — buffer matters more than currently weighted)
- `timePreference` (or Time Map value): 2.5
- `deadlineProximity`: 3.0 (conditional)
- `projectProximity`: 1.5 (up from 0.5; turn on by default — research consensus is batching same-project work beats context-switching)
- `energyLevelMatch` (or Time Map tier modulation): 1.5

Total: 10.0 base (or 7.0 when no deadline). Starting points only; see #9.
*Effort:* Trivial.
*Risk:* Requires empirical validation.

**7. Add `sequentialProjectAwareness` (new factor).**
*Change:* Score slots higher when the immediately preceding scheduled block is the same project (warm context). Decay by idle hours. Weight: 0.8.
*Why:* Deep-work research (Newport, attention-residue literature) shows context switches cost ~20 min of recovered focus. Batching same-project work is the cheapest performance improvement available.
*Effort:* Moderate. Requires looking at the placement graph, not just the task.
*Risk:* Low.

**8. Add `dayOfWeekPreference` (new factor, optional per task).**
*Change:* Let tasks optionally declare day-of-week preference (e.g., "Mondays only" for weekly reviews). Binary match.
*Why:* Weekly-review tasks, admin-day tasks, etc. are real GTD patterns. Cheap to support.
*Effort:* Trivial (data model + filter).
*Risk:* None.

**9. Offline weight learning from reschedule signals.**
*Change:* Log every reschedule event (user moves task from slot A to slot B). Label A as negative, B as positive. After accumulating ~300 events, fit weights via logistic regression on (feature vector of B - feature vector of A). Update weights monthly, keep the old weights as fallback.
*Why:* Turns manual corrections into signal. Much cheaper than RL, more robust than hand-tuning. This is what Trevor AI's "Personal AI Model" is doing under the hood.
*Effort:* Significant. Need logging infrastructure, feature extraction, training pipeline, A/B evaluation.
*Risk:* Medium. Regularize heavily (ridge); small sample sizes overfit. Keep hand-authored weights as a prior and learn a small per-user adjustment.

**10. Consider paradigm migration to CP + scoring hybrid (long-term).**
*When it's justified:* If you start wanting cross-task constraints (e.g., max 4 hours deep work/day, no two difficult tasks back-to-back, respect project-day groupings), the greedy algorithm's myopia will hurt. At that point, switch to CP-SAT for feasibility + scoring for preference ranking.
*Effort:* Significant rewrite.
*Risk:* Explainability regression if not designed carefully.

## 6. Verdict

Stay with weighted-sum scoring and iterate. The paradigm fits the scale, the latency budget, and — crucially — the explainability requirement that a GTD practitioner needs to trust and override the system. The current implementation's problems are not paradigm problems; they are weight-allocation problems compounded by one misfit factor (priority-in-slot-scoring) and two dormant factors (workHourAlignment, deadlineProximity for tasks without deadline). Fix those, add context-as-hard-filter, and you've harvested 80% of the value. Log reschedule events now so in six months you can learn weights from actual corrections — that is the path that eventually makes this scheduler feel like it belongs to this user, rather than feeling like a generic productivity app that happened to be pointed at their tasks. Paradigm migration to CP+scoring is a real option but only justified if cross-task constraints become wanted. Don't reach for game theory, metaheuristics, or end-to-end RL — they solve problems this app doesn't have.

## Sources

- [Motion Auto-scheduling docs](https://www.usemotion.com/help/time-management/auto-scheduling)
- [Motion Task Scheduling FAQ](https://www.usemotion.com/help/project-management/task/task-scheduling-faq)
- [Reclaim.ai: How Reclaim manages your schedule automatically](https://help.reclaim.ai/en/articles/6207587-how-reclaim-manages-your-schedule-automatically)
- [SkedPal: Introduction to Time Maps](https://skedpal.com/knowledge-base/introduction-to-time-maps/)
- [SkedPal: How It Works](https://www.skedpal.com/how-it-works)
- [Sunsama: Auto-scheduling docs](https://help.sunsama.com/docs/timeboxing-auto-scheduling)
- [Sunsama: Daily Planning philosophy](https://help.sunsama.com/docs/daily-planning)
- [TimeHero basics help center](https://help.timehero.com/en/articles/1270270-timehero-basics)
- [Trevor AI: Plan your day guide](https://www.trevorai.com/blog/plan-your-day-with-trevor-ai-the-ultimate-guide)
- [Akiflow: Time Blocking](https://akiflow.com/features/time-blocking)
- [Why David Allen Seems to be Changing His Mind About Time Blocking](https://scheduleu.org/why-david-allen-seems-to-be-changing-his-mind-about-scheduling/)
- [GTD Forums: Power Use of Your Calendar](https://forum.gettingthingsdone.com/threads/power-use-of-your-calendar.16765/)
- [Samphy Y: GTD and Time Blocking](https://ysamphy.com/gtd-and-time-blocking/)
- [Dave Edwards: Time Blocking & GTD](https://daveedwardsmedia.medium.com/time-locking-gtd-ff3f8d086da4)
- [Refanidis & Yorke-Smith: A Constraint-Based Approach to Scheduling an Individual's Activities](https://homepage.tudelft.nl/0p6y8/papers/n82.pdf)
- [CMU: Learning User Preferences in Distributed Calendar Scheduling](https://www.ri.cmu.edu/pub_files/2015/3/oh2004-patat.pdf)
- [Kim et al.: Learning User Preferences and Understanding Calendar Contexts for Event Scheduling (NESA)](https://arxiv.org/abs/1809.01316)
- [Cramton, Shoham, Steinberg: Combinatorial Auctions (canonical text)](https://cramton.umd.edu/ca-book/cramton-shoham-steinberg-combinatorial-auctions.pdf)
- [Iterative combinatorial auction mechanism for multi-agent parallel machine scheduling](https://www.tandfonline.com/doi/full/10.1080/00207543.2021.1950938)
- [Google OR-Tools Scheduling docs](https://developers.google.com/optimization/scheduling)
- [MDPI: MILP vs CP for Production Scheduling](https://www.mdpi.com/2076-3417/13/10/6003)
- [HBR: The Ideal Work Schedule, as Determined by Circadian Rhythms](https://hbr.org/2015/01/the-ideal-work-schedule-as-determined-by-circadian-rhythms)
- [Circadian Rhythms in Attention (PMC/NIH)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6430172/)
- [Sunsama Blog: When Are You the Most Productive (Circadian Rhythms)](https://www.sunsama.com/blog/when-are-you-the-most-productive)
