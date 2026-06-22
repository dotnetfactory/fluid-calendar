# docker-quickstart Specification

## Purpose
TBD - created by archiving change issue-151-docker-quickstart-port. Update Purpose after archive.
## Requirements
### Requirement: Container bind address and port are pinned independent of the operator's .env

The Docker quick-start `app` service SHALL fix the container's HTTP bind address and port to `0.0.0.0:3000` regardless of any `PORT` or `HOSTNAME` value present in the operator's `.env`, so that the published `app` port mapping always reaches a listening server. Because the published image's Next.js standalone server binds to `process.env.HOSTNAME:process.env.PORT`, and the `app` service loads the operator's `.env` via `env_file`, the compose file SHALL set `PORT=3000` and `HOSTNAME=0.0.0.0` in the `app` service's `environment` (which takes precedence over `env_file`).

#### Scenario: App service pins PORT and HOSTNAME to a reachable bind target

- **WHEN** the `app` service in `docker-compose.yml` is inspected
- **THEN** it sets `PORT=3000` in its `environment`
- **AND** it sets `HOSTNAME=0.0.0.0` in its `environment`
- **AND** the container side of its published `ports` mapping is `3000`

#### Scenario: Operator .env is still loaded

- **WHEN** the `app` service in `docker-compose.yml` is inspected
- **THEN** it still loads the operator's configuration via `env_file: .env`
- **AND** the pinned `PORT`/`HOSTNAME` override any `PORT`/`HOSTNAME` the operator placed in `.env`

### Requirement: Quick-start docs explain the container port behavior

The README Docker quick-start SHALL state that the container's port is managed by compose (fixed at 3000) and that placing `PORT` in `.env` does not change the published port, directing operators who want a different host port to change the host side of the `ports` mapping.

#### Scenario: README documents the port behavior

- **WHEN** a self-hoster reads the Docker quick-start section of `README.md`
- **THEN** it explains that the container listens on port 3000 and that setting `PORT` in `.env` does not change the published port
- **AND** it tells operators to change the host side of the `ports` mapping to use a different host port
- **AND** it warns that changing the host port also requires updating `NEXTAUTH_URL` (and the other browser-facing URL variables) to the same origin, since the app derives its OAuth redirect URLs from `NEXTAUTH_URL`

