## Why

The documented Docker quick-start (`cp .env.example .env` -> edit -> `docker compose up -d` -> open `http://localhost:3000`) silently fails for some self-hosters (issue #151). The reporter's app container logs `Local: http://...:80` even though `docker-compose.yml` publishes `3000:3000`, so nothing answers on host port 3000.

Root cause: the `app` service uses `env_file: .env`, which injects **every** variable from the operator's `.env` into the container - including an unrelated `PORT`. The published image runs the Next.js standalone `server.js`, which honors `process.env.PORT` for its bind port. If the operator's `.env` contains, e.g., `PORT=80` (a common, generic variable name), the app binds to 80 inside the container while compose still maps host `3000 -> container 3000`, so `http://localhost:3000` connects to nothing. This was confirmed by a contributor in the issue thread (the `:80` log line being the tell) and reproduces the report exactly. Copying `.env.example` as-is works only because it happens to contain no `PORT`.

## What Changes

- Pin the container's listen port in `docker-compose.yml`: add `environment: - PORT=3000` to the `app` service. A compose `environment` entry takes precedence over the same key from `env_file`, so the app always binds to 3000 inside the container regardless of any `PORT` in the operator's `.env`, keeping the `3000:3000` publish working.
- Document in the README quick-start that the container port is managed by compose and that setting `PORT` in `.env` does not change the published port (to remap, change the host side of the `ports` mapping).
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
