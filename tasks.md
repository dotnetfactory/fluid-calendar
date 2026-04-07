# v2 Branch Tasks

Tracking the work needed to make the `v2` branch build, run, and deploy in both
**OS** and **SaaS** modes. Updated as work progresses.

---

## Phase 1 — Get both builds green

### Public repo (`src/`) — Next.js 15 stub fixes

- [ ] `src/app/(marketing)/learn/learn/[slug]/page.tsx` — accept `params: Promise<{ slug: string }>` and forward to the imported saas component
- [ ] `src/app/book/book/[username]/[slug]/page.tsx` — accept `params: Promise<{ username: string; slug: string }>` and forward
- [ ] `src/app/book/book/manage/[bookingId]/page.tsx` — accept `params: Promise<{ bookingId: string }>` and forward (target page is `"use client"` and ignores params, but Next 15 PageProps still requires it on the file-level Page export)

### SaaS submodule (`saas/`) — Next.js 15 + missing exports + Stripe drift

- [ ] `saas/api/waitlist/entries/[id]/route.ts` — change handler signature to `{ params: Promise<{ id: string }> }` and `await` inside
- [ ] `saas/api/waitlist/invitations/[id]/resend/route.ts` — same
- [ ] `saas/api/subscription/early-bird-status/route.ts` — `GET` should accept `(_request: NextRequest)` so the OS stub can forward `req`
- [ ] `saas/api/waitlist/join/route.ts` — same fix for `GET()`
- [ ] `saas/src/services/subscription.ts` — re-export `LifetimeSubscriptionRequest` type (and any other symbols `useSubscription` needs)
- [ ] `saas/lib/email/email-service.ts` — actually `export type EmailJobData` (currently only imports it) so the shim works
- [ ] `saas/lib/stripe/index.ts` — bump `apiVersion` to `"2025-08-27.basil"` to match the SDK and the public-repo file

### Verification
- [ ] `npm run lint` — clean
- [ ] `npm run type-check` — clean (OS-only via `tsconfig.check.json`)
- [ ] `npx tsc --noEmit -p tsconfig.json` — clean (full project incl. saas/)
- [ ] `NEXT_PUBLIC_ENABLE_SAAS_FEATURES=false npm run build:os` — clean
- [ ] `npm run build` — clean (with submodule)
- [ ] `npm run dev` smoke test — `/`, `/tasks`, `/calendar`, `/settings` load
- [ ] `NEXT_PUBLIC_ENABLE_SAAS_FEATURES=true npm run dev` — `/pricing`, `/admin`, `/subscription/...` load

### Commit & push order (per CLAUDE.md)
- [ ] Commit + push inside `saas/` submodule first
- [ ] Update parent `v2` to bump submodule pointer + ship public-stub fixes
- [ ] Push parent `v2`

---

## Phase 2 — CI green for both build paths

- [ ] Verify GitHub Actions on `v2`: `lint-and-typecheck`, `build-os`, `build-saas`, `test`
- [ ] Add a `npx tsc --noEmit -p tsconfig.json` step in `build-saas` so SaaS-mode type errors are caught in CI (they currently aren't — `tsconfig.check.json` excludes `saas/`)
- [ ] Confirm `build-os` uses `actions/checkout@v4` **without** submodules so it truly mirrors a public clone

---

## Phase 3 — Deployment plan (OS image)

- [ ] Audit `Dockerfile` (root) — Next.js 15 standalone output, base image, Node version, prisma generate step, env vars
- [ ] Verify `docker build -f Dockerfile -t fc-os .` succeeds in a clean clone with no `saas/` submodule
- [ ] Document required runtime env vars for OS: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, optional Google/Outlook/CalDAV creds
- [ ] Verify Prisma migration story for fresh OS deploys (`npx prisma migrate deploy` in entrypoint or pre-deploy job)
- [ ] Run the image locally with a Postgres container, hit `/`, `/api/health` if any, log in flow
- [ ] Tag a release candidate image and update `docker/production/Dockerfile` if it's a separate publish path
- [ ] Refresh `README.md` self-host instructions if anything changed

---

## Phase 4 — Deployment plan (SaaS image + k8s)

- [ ] Audit `saas/Dockerfile.saas` — confirms `NEXT_PUBLIC_ENABLE_SAAS_FEATURES=true`, builds worker, uses Infisical correctly
- [ ] Verify `docker build -f saas/Dockerfile.saas -t fc-saas .` succeeds with the submodule populated
- [ ] Confirm `npm run build:worker` produces a runnable `dist/saas/jobs/worker-with-aliases.js`
- [ ] Run worker locally against a Redis container; queue a test job (e.g. daily-summary)
- [ ] `kubectl apply --dry-run=server -f saas/k8s/` — manifests lint clean
- [ ] Verify the migration job in `saas/k8s/` runs `npm run prisma:update` against the right schema (root + saas merged)
- [ ] Confirm Stripe webhook URL, Resend API key, Infisical projectId are all wired through k8s secrets
- [ ] End-to-end staging deploy: app pod + worker pod + migration job + ingress + Stripe webhook test event

---

## Phase 5 — Documentation cleanup (post-deploy)

- [ ] Rewrite the open-core sections of `CLAUDE.md` to describe the alias-based architecture (no more references to `scripts/setup-saas.ts`, `scripts/clean-saas-symlinks.ts`, or `saas/package.json` merging — none of those exist)
- [ ] Decide on Prisma schema single source of truth (currently `prisma/schema.prisma` and `saas/prisma/schema.prisma` duplicate all SaaS models — they will drift). Document the decision.
- [ ] Investigate `next.config.ts` `transpilePackages` line — passes an absolute filesystem path which is not the documented Next.js usage. Either remove it (if dead) or convert `saas/` into a real workspace package.
- [ ] Update `README.md` with the two clone paths (with/without submodule) and the `dev`/`dev:os` scripts

---

## Done ✅

- [x] Push local `v2` to `origin/v2` and set upstream (was `5fc070c..852880a` then `..26ab679`)
- [x] `fix(logger): allow undefined in LogMetadata to preserve backward compatibility` — restored undefined support so the ~80 SaaS log callsites still compile after `852880a`
