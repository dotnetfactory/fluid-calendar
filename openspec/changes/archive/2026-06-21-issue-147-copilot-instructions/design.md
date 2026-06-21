## Context

GitHub Copilot's coding agent reads repository-wide custom instructions from a
single Markdown file at `.github/copilot-instructions.md` (the path described in
GitHub's "Best practices for Copilot coding agent" doc referenced by issue #147).
This repo already documents its conventions for human and other AI contributors in
`CLAUDE.md` and `openspec/project.md`, but Copilot does not read those, so it needs
its own file. The challenge is keeping a third instruction file consistent with the
two that already exist, without code changes.

## Goals / Non-Goals

**Goals:**

- Give Copilot's coding agent the same project context human contributors get.
- Surface the highest-risk rule first: the SAAS vs open-source build separation.
- Keep the file short and high-signal so it stays maintainable and Copilot uses it.

**Non-Goals:**

- No path-specific instructions (`.github/instructions/*.instructions.md`) - one
  repository-wide file is sufficient for this codebase's size.
- No changes to application code, CI, build config, or the existing `CLAUDE.md` /
  `openspec/project.md`.
- Not duplicating every rule from `CLAUDE.md`; the file links back to it as the
  source of truth and captures the load-bearing subset.

## Decisions

- **Single `.github/copilot-instructions.md` over per-path instruction files.** This
  is the path GitHub auto-discovers for the coding agent; a single file matches the
  doc the issue cites and is enough at this repo's scale. Alternative considered:
  `.github/instructions/*.instructions.md` with `applyTo` globs - rejected as
  premature for one cohesive Next.js app.
- **Mirror, not fork, of `CLAUDE.md`.** The file is derived from `CLAUDE.md` and
  `openspec/project.md` and names `CLAUDE.md` as the canonical source, so the two do
  not drift into conflicting advice. Alternative: a fully independent doc - rejected
  because two contradictory instruction sets are worse than one.
- **Lead with SAAS/open-source separation.** It is the most error-prone area
  (getting it wrong leaks SAAS code into the public repo), so it is called out
  prominently rather than buried in a conventions list.

## Risks / Trade-offs

- [Drift: the new file diverges from `CLAUDE.md` over time] → Keep it concise, point
  to `CLAUDE.md` as source of truth, and capture only stable load-bearing rules.
- [Over-long instructions dilute Copilot's attention] → Bias toward brevity; prefer
  the few rules most likely to be violated over exhaustive coverage.

## Migration Plan

Add the file; no deploy or rollback steps. Reverting is deleting the file - it has no
runtime effect.

## Open Questions

None.
