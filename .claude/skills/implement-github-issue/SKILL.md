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

**A STOP is terminal for this run.** On any STOP (Gate A, Gate B, Codex-missing, Codex-failed, loop-exhausted) you email Emad and then do nothing else for this issue: no branch, no PR, no partial "best-guess" deliverable. There is no "email *and* ship anyway" path.

**Core principle:** Gather all context → gate on "is it complete?" and "should we even do this?" → spec → TDD → Codex review until green → PR. Never open a PR until BOTH the local test gate AND a fresh Codex `approve` verdict are green.

## Notifications: email `emad@elitecoders.co`

Every STOP notifies by email via the **gws-gmail** skill (`gws` is at `/usr/local/bin/gws`). Do not use any other channel and do not post the content as a public GitHub comment.

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
4. **Gate B** - should we implement this? State `Gate B: PASS because …` or email + STOP
5. Spec it
6. Implement with TDD on a feature branch (local gate green)
7. Codex `adversarial-review` loop until `approve`
8. Open the PR (ready for review), report the URL

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
- Already implemented/fixed on the default branch, or an **open PR already addresses it** - cite the concrete commit/PR/file:line.
- The issue is `state: CLOSED` (unless the user explicitly asked to reopen-and-implement).
- It's a question/support request, not a code change.
- It needs infra, secrets, or access you don't have.
- Blast radius is too high to do unattended (destructive migration, auth/security rewrite, broad breaking change) - flag for a human.

End this step with `Gate B: PASS because …` or do the email + STOP. Declining is a valid, expected outcome.

## 5. Spec it

Write a short spec the tests and code will target: problem, approach, acceptance criteria, the tests to write, files to touch, risks.

- If an `openspec/` directory exists, follow that repo's OpenSpec proposal convention. **This repo has none**, so keep the spec lightweight (a scratch plan is fine).
- For genuinely ambiguous *design* (multiple reasonable UX/architecture paths), shape it with `superpowers:writing-plans` first. Don't invoke interactive elicitation skills in an unattended run - if design is so open it needs a human's answers, that's a Gate A/B STOP, not a brainstorm.

## 6. Implement with TDD

**REQUIRED SUB-SKILL:** Use `superpowers:test-driven-development`. Red → green → refactor, one acceptance criterion at a time. No implementation code before a failing test.

- Branch off the default branch first, and **assert you're not on it before any commit**:

```bash
git checkout <default-branch> && git pull --ff-only
git checkout -b feat/issue-<N>-<short-slug>
test "$(git rev-parse --abbrev-ref HEAD)" != "<default-branch>" || { echo "ABORT: on default branch"; exit 1; }
```

- Write each test, watch it fail, write minimal code, watch it pass, refactor. Keep the diff scoped to this issue.
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

## 8. Open the PR

Only after the local gate is green AND the **last action before pushing** was a Codex `adversarial-review` returning `verdict == "approve"` on the current HEAD (if you changed anything after the last review, re-review first):

```bash
git push -u origin <branch>
gh pr create --base <default-branch> --title "<concise title>" --body "<body>"
```

PR body MUST include: a change summary, a test plan, `Closes #<N>`, a note that Codex review passed, and any unfixed-finding justifications. Open it **ready for review** (not a draft). Append the "Generated with Claude Code" PR footer (from the harness/global instructions). Report the PR URL.

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
| Out of scope / needs product call / duplicate / open PR exists / too risky | Gate B: email + STOP |
| Codex `needs-attention` | Fix real in-scope findings via TDD, re-review |
| Codex errored / no verdict | Retry once, else email + STOP |
| Codex still red after ~5 rounds | Email summary + STOP |
| Local gate green AND fresh Codex `approve` | Push + open ready PR, report URL |
