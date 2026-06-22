## 1. Tests (write first, watch them fail)

- [x] 1.1 Add a Jest test that parses `docker-compose.yml` and asserts the `app` service sets `PORT=3000` via `environment:` (so a `PORT` from the operator's `env_file` cannot change the container's bind port)
- [x] 1.2 Extend the test to assert the `app` service still publishes the container side as port 3000 (a `3000` container-side in the `ports` mapping), keeping the pinned `PORT` and the published container port consistent
- [x] 1.3 Extend the test to assert the `app` service still uses `env_file: .env` (we override `PORT`, we do not stop loading the operator's `.env`)

## 2. Fix docker-compose

- [x] 2.1 Add `environment:` with `PORT=3000` to the `app` service in `docker-compose.yml`

## 3. Docs + changelog

- [x] 3.1 Add a short note to the README Docker quick-start that the container port is fixed at 3000 by compose and that setting `PORT` in `.env` does not change the published port (to use a different host port, change the host side of the `ports` mapping)
- [x] 3.2 Add a `CHANGELOG.md` entry under `[unreleased]` for the Docker quick-start port fix

## 4. Verify

- [x] 4.1 Run the local gate (unit tests + type-check + lint) and confirm green
