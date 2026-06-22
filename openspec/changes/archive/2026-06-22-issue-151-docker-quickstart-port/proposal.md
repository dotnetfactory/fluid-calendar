## Why

The documented Docker quick-start (`cp .env.example .env` -> edit -> `docker compose up -d` -> open `http://localhost:3000`) silently fails for some self-hosters (issue #151). The reporter's app container logs `Local: http://...:80` even though `docker-compose.yml` publishes `3000:3000`, so nothing answers on host port 3000.

Root cause: the `app` service uses `env_file: .env`, which injects **every** variable from the operator's `.env` into the container - including an unrelated `PORT`. The published image runs the Next.js standalone `server.js`, which binds to `process.env.HOSTNAME:process.env.PORT`. If the operator's `.env` contains, e.g., `PORT=80` (a common, generic variable name), the app binds to 80 inside the container while compose still maps host `3000 -> container 3000`, so `http://localhost:3000` connects to nothing. This was confirmed by a contributor in the issue thread (the `:80` log line being the tell) and reproduces the report exactly. Copying `.env.example` as-is works only because it happens to contain no `PORT`. A stray `HOSTNAME` (e.g. `localhost`) in `.env` is the same failure class via the bind *address*: the server binds to loopback inside the container, again leaving the publish pointed at an unreachable address.

## What Changes

- Pin the container's bind address and port in `docker-compose.yml`: add `environment: - PORT=3000` and `- HOSTNAME=0.0.0.0` to the `app` service. A compose `environment` entry takes precedence over the same key from `env_file`, so the Next.js standalone server (which binds to `HOSTNAME:PORT`) always listens on `0.0.0.0:3000` inside the container regardless of any `PORT`/`HOSTNAME` in the operator's `.env`, keeping the `3000:3000` publish working.
- Document in the README quick-start that the container bind target is managed by compose and that setting `PORT`/`HOSTNAME` in `.env` does not change where the app binds (to remap the host port, change the host side of the `ports` mapping, and update `NEXTAUTH_URL` and the other browser-facing URL variables to the same origin).
- No application-code change; this is a Docker compose + docs fix.

## Capabilities

### New Capabilities

- `docker-quickstart`: The documented Docker quick-start setup for self-hosting FluidCalendar (the `docker-compose.yml` app/db services and the README quick-start steps), specifically the guarantee that the app is reachable on the published host port after following the steps.

### Modified Capabilities

<!-- None: no existing spec covers the Docker quick-start setup. -->

## Impact

- `docker-compose.yml` (`app` service: add `environment: - PORT=3000`).
- `README.md` (Docker quick-start note about the container port).
- `CHANGELOG.md` (`[unreleased]` entry).
- No API, schema, or application-runtime-behavior change. No new dependencies.
