---
name: implement-github-issue
description: >-
  Use when asked to implement, build, fix, ship, "take", or "do" a specific
  GitHub issue end-to-end and open a PR for it. Triggers: "implement issue
  123", "work on this ticket", "address this GitHub issue", "do issue #N and
  open a PR", pasting a GitHub issue URL with intent to build it,
  autonomous issue-to-PR.
---

# Implement a GitHub Issue (issue → PR)

## Overview

Take a single GitHub issue from raw ticket to an opened pull request, autonomously. The input is an **issue reference** (number or URL) from the user's invocation; if none was given, ask for it before anything else.

**The constraint comes first.** This skill has hard STOP gates. "Autonomous" means you do not pause to ask permission to *proceed* once a gate passes - it does **NOT** license skipping a gate. Every gate must be evaluated and its verdict stated in your output before you move on.

**A STOP is terminal for this run.** On any STOP (Gate A, Gate B, Codex-missing, Codex-failed, loop-exhausted) you email Emad and then do nothing else for this issue: no branch, no PR, no partial "best-guess" deliverable. There is no "email *and* ship anyway" path. (One STOP variant does more than email: if you determine the issue is **already implemented** on the default branch, you also close it with an explanatory comment - see Gate B, step 4.) If a STOP happens *after* the worktree was created (e.g. a step-7 loop-exhausted STOP), still **clean up the worktree** (step 10) before stopping - leaving the branch unpushed is fine, but do not leave the worktree behind.

**Work in an isolated worktree.** All implementation happens in a dedicated git worktree under `.claude/worktrees` (step 6), never in the main checkout, and the worktree is always removed when the run ends (step 10).

**Core principle:** Gather all context → gate on "is it complete?" and "should we even do this?" → spec → TDD → Codex review until green → PR. Never open a PR until BOTH the local test gate AND a fresh Codex `approve` verdict are green.

## Notifications: email `emad@elitecoders.co`

Every STOP notifies by email via the **gws-gmail** skill (`gws` is at `/usr/local/bin/gws`). Do not use any other channel and do not post the content as a public GitHub comment. (The **one exception** is the "already-implemented" close in Gate B - there you post a closing comment on the issue *and* email; see step 4.)

**REQUIRED SUB-SKILL:** Use `gws-gmail` (its `+send` helper) to send. Confirm its exact flags from that skill before the first send:

```bash
gws gmail +send --to emad@elitecoders.co --subject "[issue-bot] #<N> ..." --body "<body>"
```

Every body MUST include: the issue URL, the issue title, and a precise, actionable statement of why work stopped / what is needed.

**The notification must actually land.** After sending, confirm the command exited 0 and reported success. If it fails, retry once; if it still fails, STOP and surface the blocker as your final visible message - never proceed to implement just because a notification could not be delivered. A failed notification is itself a STOP.

## Checklist (create one todo per item)

1. Preflight: repo + default branch, **issue-repo match**, resolve the **test/lint gate**, **detect Codex**
2. Gather full context (issue body + every comment + every load-bearing image + linked PRs)
3. **Gate A** - is context complete? State `Gate A: PASS because …` or email + STOP
4. **Gate B** - should we implement this? State `Gate B: PASS because …` or email + STOP (already-implemented → also comment + close the issue)
5. Spec it via **OpenSpec** (proposal + design + tasks)
6. Implement with TDD in an isolated **worktree** under `.claude/worktrees`, checking off `tasks.md` as you go (local gate green)
7. Codex `adversarial-review` loop until `approve`
8. **Finalize the OpenSpec change**: complete `tasks.md` and **archive** the change
9. Open the PR (ready for review), report the URL
10. **Clean up the worktree** (always - on PR-opened and on any STOP after the worktree exists)
11. **Hand the PR to `review-merge-port-pr`** as a separate subagent (review → merge → SAAS port)

---

## 1. Preflight

```bash
gh repo view --json nameWithOwner,defaultBranchRef -q '.nameWithOwner + " " + .defaultBranchRef.name'
```

- Confirm you're in a git repo with a GitHub remote. Record the **default branch** (e.g. `main`) for the PR base and Codex base.
- **Issue-repo match.** If the issue was given as a full URL, parse its `owner/repo` and compare to `nameWithOwner` above. If they differ, the current checkout is the wrong repo → email Emad ("issue is in X but cwd is Y; I only operate in the current checkout") + STOP. For a bare number, assume the current repo.
- **Resolve the gate commands for THIS repo.** Read `package.json` scripts (or detect the toolchain: pytest / `go test` / `cargo test` / etc.). Record `TESTS`, `TYPECHECK`, `LINT`. For fluid-calendar: `TESTS="npm run test:unit"`, `TYPECHECK="npm run type-check"`, `LINT="npm run lint"`. If you cannot determine a real test+lint gate, that breaks the "no PR until green" invariant → Gate B decline (email + STOP). Do **not** run `npm run format` (it rewrites the whole repo); use `npm run format:check` or prettier on changed files only, and treat formatting as non-gating.
- **Detect Codex now (fail fast).** Codex is often installed under a different nvm node than the session default, so `which codex` may fail though it works. Probe it - and always invoke Codex with that bin dir on PATH (including this first probe, so the persistent Codex broker isn't spawned under a codex-less node):

```bash
codex_dir="$(command -v codex >/dev/null 2>&1 && dirname "$(command -v codex)" || for d in ~/.nvm/versions/node/*/bin; do [ -x "$d/codex" ] && echo "$d" && break; done)"
if [ -z "$codex_dir" ]; then echo "CODEX_MISSING"; else
  PATH="$codex_dir:$PATH" codex --version && PATH="$codex_dir:$PATH" codex app-server --help >/dev/null 2>&1 && echo "CODEX_READY ($codex_dir)" || echo "CODEX_MISSING"
fi
```

If `CODEX_MISSING` (no node has a working `codex` with `app-server` support): email Emad ("Cannot run Codex review for #N - codex CLI unavailable; please install/auth it") + STOP. Do not `npm install -g @openai/codex` - it's a PATH/node-version mismatch, not a missing package. (Note: `codex_dir` is a shell variable and does **not** survive across separate Bash calls - re-derive it inline wherever you invoke Codex, see step 7.)

## 2. Gather full context

```bash
gh issue view <N> --json number,title,state,body,author,labels,url,comments,milestone,assignees
```

- If the number doesn't exist, `gh` exits non-zero → email Emad ("issue #N not found in <repo>") + STOP.
- Read the **body and every comment**. For large threads, prioritize the body, stated acceptance criteria, and the most recent maintainer comments; summarize as you go.
- **View every load-bearing image.** Find image refs in body + comments (markdown `![](url)`, `<img src>`, bare `github.com/user-attachments/assets/...` and `*.githubusercontent.com/...`). Download each to a **unique** filename and **Read** it so you actually see it:

```bash
mkdir -p /tmp/issue-<N>-img
# try authenticated (private repos); fall back to unauth; verify it's really an image
curl -sL -H "Authorization: token $(gh auth token)" "<url>" -o /tmp/issue-<N>-img/img-1 || curl -sL "<url>" -o /tmp/issue-<N>-img/img-1
file /tmp/issue-<N>-img/img-1   # confirm image/* before trusting it as context
```

- Check for an existing PR already addressing this issue: `gh pr list --state open --search "<N>"` and the issue's linked/cross-referenced PRs. Note any.

## 3. Gate A - Is the context complete?

You may proceed **only if** you can answer all four, and you must **state the answers in your output**: (1) desired behavior, (2) acceptance criteria, (3) repro (for bugs), (4) every load-bearing image rendered.

**Missing context → email + STOP** when any holds:
- The desired outcome is unclear or not inferable.
- A bug with no repro steps, or you cannot reproduce it, or key env info is absent.
- A **load-bearing** image/log won't download or render *and the text alone is insufficient*. (If the textual description already fully specifies the work, a missing decorative screenshot is not blocking - say so.)
- Acceptance criteria are undefined. If you **infer** them, quote the exact issue sentence/image that supports the inference; an inference with no supporting text is missing context, not present context.
- Comments conflict and nothing resolves which to follow.

End this step with `Gate A: PASS because …` or do the email + STOP. Do not comment on the issue.

## 4. Gate B - Should we implement this? (only if Gate A passed)

First **ground it**: grep/rg the affected area named in the issue and skim recent commits/PRs touching it, so the decline reasons below are evidence-based, not guessed.

**Decline (email your reasoning + STOP)** when any holds:
- Out of scope / not aligned with the project's purpose.
- It needs a product or design decision the issue does not settle.
- **Already implemented/fixed on the default branch** - cite the concrete commit/PR/file:line. This is a special terminal outcome: **close the issue with a comment AND email** (see "Already-implemented → close + comment + email" below), not just email.
- An **open PR already addresses it** (not yet merged) - cite the concrete PR/file:line; email + STOP, but do **not** close the issue (the open PR will close it on merge).
- The issue is `state: CLOSED` (unless the user explicitly asked to reopen-and-implement).
- It's a question/support request, not a code change.
- It needs infra, secrets, or access you don't have.
- Blast radius is too high to do unattended (destructive migration, auth/security rewrite, broad breaking change) - flag for a human.

End this step with `Gate B: PASS because …` or do the email + STOP (or the already-implemented close below). Declining is a valid, expected outcome.

### Already-implemented → close + comment + email

When (and only when) you determine the issue is **already implemented/fixed on the default branch** - you can cite the concrete commit/PR/file:line that delivers the requested behavior - this is the one decline reason where you also act on the issue itself:

1. **Comment on the issue** explaining it's already implemented, citing the evidence (commit SHA / merged PR / `file:line`) and, if useful, how to verify. Keep it factual and courteous.
2. **Close the issue** as completed.

```bash
gh issue comment <N> --body "This is already implemented on \`<default-branch>\` as of <commit/PR> (see \`<file:line>\`). Closing as completed - reopen if your scenario differs."
gh issue close <N> --reason completed
```

3. **Email Emad** as usual (the email is still required) noting that you closed #N as already-implemented, with the same evidence.

This is the single exception to "do not comment on the issue" and "do not post to GitHub" - it applies ONLY to the already-implemented case. Every other Gate A/B decline stays email-only with no issue comment and no close (a human decides). Do not close an issue just because an open PR addresses it, or for out-of-scope / needs-a-decision / too-risky declines.

## 5. Spec it - via OpenSpec

**This repo uses OpenSpec** (an `openspec/` directory with `project.md`, `specs/`, and `changes/`). Specs go through the OpenSpec proposal convention, not an ad-hoc scratch plan.

**REQUIRED SUB-SKILL:** Use `openspec-propose` (the `/opsx:propose` flow) to create the change. Drive it non-interactively from the issue you already gathered - the issue body, acceptance criteria, and rendered images are your input, so do **not** invoke its interactive "what do you want to build?" prompt:

```bash
openspec new change "issue-<N>-<short-slug>"      # scaffolds openspec/changes/issue-<N>-<short-slug>/
openspec status --change "issue-<N>-<short-slug>" --json   # get artifact build order
```

- Generate the change artifacts (`proposal.md` = what & why, `design.md` = how, `tasks.md` = implementation steps) using `openspec instructions <artifact-id> --change "<name>" --json`, grounding each in the issue's stated behavior and acceptance criteria. `tasks.md` is the checklist your TDD loop (step 6) implements against.
- Validate before implementing: `openspec validate "issue-<N>-<short-slug>"` must pass.
- If `openspec` is somehow unavailable in this repo (no `openspec/` dir, CLI missing), fall back to a lightweight scratch spec (problem, approach, acceptance criteria, tests to write, files to touch, risks) and note the fallback in the PR body - but the default and expected path is OpenSpec.
- For genuinely ambiguous *design* (multiple reasonable UX/architecture paths), capture the chosen approach in the OpenSpec `design.md`. Don't invoke interactive elicitation skills in an unattended run - if design is so open it needs a human's answers, that's a Gate A/B STOP, not a brainstorm.

You implement against the change's `tasks.md` (step 6) and then **complete and archive** it (step 8) before opening the PR, so the PR carries the finished, archived spec.

## 6. Implement with TDD

**REQUIRED SUB-SKILL:** Use `superpowers:test-driven-development`. Red → green → refactor, one acceptance criterion at a time. No implementation code before a failing test.

- **Create an isolated worktree** off the **latest** default branch, on a fresh feature branch, under `.claude/worktrees`, and do all work there. **Always `git fetch origin` first and branch from `origin/<default-branch>`** (not a possibly-stale local `<default-branch>`) so you start from current `main` and minimize merge conflicts at PR time. This keeps the main checkout untouched. Ensure `.claude/worktrees/` is git-ignored (add it to `.gitignore` if it is not) so the worktree never shows up as untracked changes. **Assert you're not on the default branch before any commit**:

```bash
git fetch origin                            # always pull the latest main first
git worktree add -b feat/issue-<N>-<short-slug> .claude/worktrees/issue-<N> origin/<default-branch>
cd .claude/worktrees/issue-<N>
test "$(git rev-parse --abbrev-ref HEAD)" != "<default-branch>" || { echo "ABORT: on default branch"; exit 1; }
```

- From here on, run all commands (TDD, the local gate, commits, the Codex review, the push, and `gh pr create`) **from inside the worktree directory**. Record the worktree path - you remove it in step 10.
- Write each test, watch it fail, write minimal code, watch it pass, refactor. Keep the diff scoped to this issue.
- **Track progress in the OpenSpec change**: as each `tasks.md` item's tests go green, check it off (`- [x]`) in `openspec/changes/issue-<N>-<short-slug>/tasks.md`. Keep `tasks.md` an accurate record of what's done.
- Before review the **local gate must be green**: run `TESTS && TYPECHECK && LINT`. Fix until all pass. Commit (the Co-Authored-By / Claude-Session commit trailers come from the harness/global instructions, not the repo).

## 7. Codex review loop until `approve`

Use **`adversarial-review`** - it returns a structured, machine-readable verdict (the plain `review` subcommand returns only prose and has no `verdict` field, so the loop can't branch on it). Codex reviews the committed branch diff vs the base, in a **read-only** sandbox. Run it **as one self-contained command** (so the inline `codex_dir` is live):

```bash
codex_dir="$(command -v codex >/dev/null 2>&1 && dirname "$(command -v codex)" || for d in ~/.nvm/versions/node/*/bin; do [ -x "$d/codex" ] && echo "$d" && break; done)"
COMPANION="$(ls -t ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | head -1)"
PATH="$codex_dir:$PATH" node "$COMPANION" adversarial-review --wait --scope branch --base <default-branch> --json
```

Parse `payload.result`: `verdict` (`approve` | `needs-attention`), `findings[]` (each `severity`, `title`, `body`, `file`, `line_start`, `line_end`, `confidence`, `recommendation`), `summary`, `next_steps`.

**The loop:**
- `verdict == "approve"` with no unresolved critical/high finding → **GREEN. Exit.**
- Otherwise, for each finding: fix the real, in-scope ones **via TDD** (add/adjust a test, then fix), re-run the local gate, commit, and **re-run the review**. Repeat.

**This skill auto-fixes findings without pausing** - the default Codex rule ("never auto-apply fixes; ask the user first") is overridden here because the user authorized "review it in a loop until green." But auto-fix applies only to findings **on the lines your change introduced or directly required**; a finding in pre-existing/unrelated code is out of scope - record it in the PR body, don't silently fix it.

**A finding is REAL** unless you can cite the code that disproves it. Do **not** dismiss a finding solely because its `confidence` is low (that's the model's confidence, not a license to skip). You must fix every critical/high finding; for any finding you don't fix (including medium/low judged out-of-scope), record a one-line justification in the PR body.

**Sandbox gotcha (narrow):** the review runs read-only, so `jest` can't WRITE its haste-map cache. *Only* an error about jest being unable to write its cache is a phantom - reproduce in the writable env (`TESTS`) to confirm. An assertion failure, type error, or lint finding surfaced by the review is NOT a phantom; fix it.

**If the review fails** (non-zero exit, timeout, or `payload.parseError` / no parseable `verdict`): that is NOT an approval. Retry once; if it still produces no verdict, treat it like CODEX_MISSING (email + STOP). Never open a PR without a parsed `verdict == "approve"`.

**Loop guard (no infinite loops):** cap at ~5 rounds. If still not green, email Emad a summary and STOP. Don't relabel a hard in-scope technical finding as "out of scope" just to bail - running out of rounds on real in-scope findings is an honest STOP-and-email.

## 8. Finalize the OpenSpec change (complete tasks + archive)

Once the implementation is green (local gate + Codex `approve`), finalize the OpenSpec change created in step 5:

- **Complete `tasks.md`**: ensure every implemented task is checked off (`- [x]`) and the file reflects the final reality. If a planned task was intentionally dropped, note why inline rather than leaving it falsely unchecked.
- **Archive the change** with the OpenSpec tooling (the `openspec-archive` / `/opsx:archive` flow). This validates the change, moves `openspec/changes/issue-<N>-<short-slug>/` into `openspec/changes/archive/`, and folds any spec deltas into the live `openspec/specs/`:

```bash
openspec validate "issue-<N>-<short-slug>"
openspec archive "issue-<N>-<short-slug>" --yes
```

- Archiving touches **only OpenSpec markdown** (proposal/design/tasks/specs), not code, so it does **not** re-open the Codex code-review gate. Commit the archive result alongside the implementation so the PR carries the completed-and-archived spec. (If, while finalizing, you changed any *code*, re-run the Codex review per step 7 before pushing.)
- If you fell back to a lightweight scratch spec in step 5 (no OpenSpec available), there is nothing to archive - skip this step and say so in the PR body.

## 9. Open the PR

Only after the local gate is green AND the **last action before pushing** was a Codex `adversarial-review` returning `verdict == "approve"` on the current HEAD (if you changed any *code* after the last review, re-review first; an OpenSpec archive of spec docs alone does not require re-review):

```bash
git push -u origin <branch>
gh pr create --base <default-branch> --title "<concise title>" --body "<body>"
```

PR body MUST include: a change summary, a test plan, `Closes #<N>`, a note that Codex review passed, a note that an OpenSpec change was created and archived (its archived path under `openspec/changes/archive/`), and any unfixed-finding justifications. Open it **ready for review** (not a draft). Append the "Generated with Claude Code" PR footer (from the harness/global instructions). Report the PR URL.

## 10. Clean up the worktree

Always remove the worktree created in step 6 once the run ends - whether you opened a PR or hit a STOP after the worktree existed. The pushed branch and the opened PR are unaffected by removing the worktree (the branch lives on the remote; the local branch just stops being checked out anywhere).

```bash
cd <main checkout>                         # leave the worktree dir first
git worktree remove .claude/worktrees/issue-<N>
# if it refuses due to leftover state and you are sure, add --force
git worktree prune
```

Do this even on the email + STOP paths once a worktree exists. The only thing that should remain after a run is the remote branch/PR (on success) or nothing (on STOP) - never a leftover worktree.

## 11. Hand off to `review-merge-port-pr` (separate subagent)

Once the PR is open (step 9) **and your worktree is cleaned up (step 10)**, dispatch a **separate subagent** to take the PR the rest of the way - review it, get it green, merge it, and port to SAAS - via the `review-merge-port-pr` skill. This runs only on the success path (a PR exists); a STOP never reaches here.

- Launch **one subagent** (the general-purpose agent) and instruct it to invoke the `review-merge-port-pr` skill on the PR you just opened. Example prompt: *"Use the `review-merge-port-pr` skill to take PR #<N> in `dotnetfactory/fluid-calendar` all the way to done: review it, get both reviewers green, merge it, and port to SAAS if needed."*
- Run it as a **distinct subagent** so its review/merge work has its own context and its own worktree, independent of this implementation run.
- **Ordering matters:** clean up *this* run's worktree (step 10) **before** the subagent merges - `gh pr merge --delete-branch` cannot delete a branch that is still checked out in your worktree.
- The subagent owns the merge decision, the SAAS port, and the merge/blocker email notifications defined in that skill. This skill's job ends at a clean hand-off; report the PR URL and that you dispatched the review subagent.

## Rationalizations - STOP if you think any of these

| Excuse | Reality |
|--------|---------|
| "It's clearly implementable, I'll satisfy the gates while coding" | Gates are preconditions. State `Gate A/B: PASS because …` *before* the first line of code, or STOP. |
| "I can infer the acceptance criteria" | Only if you can quote the issue text/image that implies them. Otherwise Gate A FAIL → email + STOP. |
| "The screenshot won't load but I get the gist" | Only OK if the text fully specifies the work. If the image is load-bearing → Gate A FAIL. |
| "`which codex` failed, Codex isn't installed" | Check other node versions (step 1). Only STOP if no node has a working `codex`. |
| "Codex flaked / returned no JSON, but local tests pass, I'll ship" | A broken review is not an approval. Retry once, else email + STOP. |
| "Codex flagged it, the skill says auto-fix" (on unrelated code) | Auto-fix is in-scope only. Note out-of-scope findings; don't sprawl the diff. |
| "It's a sandbox failure" (about an assertion/type/lint error) | The carve-out is ONLY jest cache-write errors. Reproduce in the writable env. |
| "Low confidence, not a real finding" | Confidence is the model's. Disprove it with code or fix it. |
| "I emailed about the uncertainty AND did my best guess" | A STOP is terminal: email, then no branch/PR/partial work. |
| "The email send errored but I'll keep going" | A failed notification is itself a STOP. Retry once, else surface and stop. |
| "I'm out of review rounds, this finding is 'out of scope'" | Don't relabel real in-scope findings. Out of rounds = honest STOP + email. |

## Quick reference

| Situation | Action |
|---|---|
| No issue ref given | Ask for it |
| Issue URL repo ≠ current checkout | Email + STOP |
| Issue number not found | Email + STOP |
| Issue is CLOSED | Gate B decline (unless told to reopen) |
| No working `codex` on any node | Email + STOP |
| Can't determine a test/lint gate | Gate B decline (email + STOP) |
| Load-bearing image won't render / repro unclear / no acceptance criteria | Gate A: email + STOP |
| Already implemented on default branch | Gate B: comment + close issue (`--reason completed`) + email |
| Out of scope / needs product call / open PR exists / too risky | Gate B: email + STOP (no issue comment, no close) |
| Codex `needs-attention` | Fix real in-scope findings via TDD, re-review |
| Codex errored / no verdict | Retry once, else email + STOP |
| Codex still red after ~5 rounds | Email summary + STOP (then clean up worktree) |
| Spec the work (step 5) | OpenSpec: `openspec new change "issue-<N>-<slug>"` → proposal/design/tasks |
| Implementing (step 6+) | Work in a worktree at `.claude/worktrees/issue-<N>`; check off `tasks.md` as tests go green |
| Implementation green (step 8) | Complete `tasks.md`, `openspec archive "issue-<N>-<slug>" --yes`, commit |
| Local gate green AND fresh Codex `approve` | Push + open ready PR, report URL |
| Run ends (PR opened OR any post-worktree STOP) | `git worktree remove .claude/worktrees/issue-<N>` |
| PR opened + worktree cleaned (step 11) | Dispatch a subagent to run `review-merge-port-pr` on PR #<N> |
