#!/bin/sh
# Run against a built image: sh tests/container-startup.sh <image>
set -eu

image=${1:?Pass the built FluidCalendar image tag}
test_name="fluid-startup-$$"
scratch=$(mktemp -d)
cleanup() {
  docker rm -fv "$test_name-app" "$test_name-db" >/dev/null 2>&1 || true
  docker network rm "$test_name" >/dev/null 2>&1 || true
  rm -rf "$scratch"
}
trap cleanup EXIT
trap 'exit 1' INT TERM

# Both the CLI and engines must be available without npm or CDN access.
docker run --rm --network none --entrypoint node "$image" -e '
  require("node:assert/strict").equal(
    require("prisma/package.json").version,
    require("@prisma/client/package.json").version
  );'
docker run --rm --network none --entrypoint node "$image" \
  ./node_modules/prisma/build/index.js --version

docker network create --internal "$test_name" >/dev/null
docker run -d --name "$test_name-db" --network "$test_name" \
  --network-alias db --tmpfs /var/lib/postgresql/data -e POSTGRES_PASSWORD=test -e POSTGRES_DB=fluid \
  postgres:16-alpine >/dev/null
attempt=0
until docker exec "$test_name-db" pg_isready -U postgres >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 90 ] || { echo 'Postgres did not become ready'; docker logs "$test_name-db"; exit 1; }
  sleep 1
done

run_app() {
  docker run --rm --name "$test_name-app" --network "$test_name" \
    -e DATABASE_URL=postgresql://postgres:test@db:5432/fluid "$@" "$image" \
    node -e 'console.log("APP_STARTED")'
}

# Run the image's real entrypoint, schema, and migrations with no internet route.
run_app >"$scratch/first.log" 2>&1 || { cat "$scratch/first.log"; exit 1; }
grep -q '^APP_STARTED$' "$scratch/first.log"
echo "PASS: $image fresh migrations offline"
run_app >"$scratch/restart.log" 2>&1 || { cat "$scratch/restart.log"; exit 1; }
grep -q '^APP_STARTED$' "$scratch/restart.log"
echo "PASS: $image healthy restart offline"

# Exercise the default application command too, using disposable local settings.
docker run -d --name "$test_name-app" --network "$test_name" \
  -e DATABASE_URL=postgresql://postgres:test@db:5432/fluid \
  -e HOSTNAME=0.0.0.0 -e PORT=3000 -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=disposable-container-startup-test-secret \
  -e NEXT_PUBLIC_ENABLE_SAAS_FEATURES=false \
  -e STRIPE_SECRET_KEY=sk_test_build_placeholder \
  -e STRIPE_WEBHOOK_SECRET=whsec_build_placeholder \
  -e RESEND_API_KEY=re_build_placeholder "$image" >/dev/null
attempt=0
until docker exec "$test_name-app" node -e '
  fetch("http://127.0.0.1:3000/setup").then(async response => {
    require("node:assert/strict").equal(response.status, 200);
    require("node:assert/strict").match(await response.text(), /FluidCalendar Setup/);
  }).catch(() => process.exit(1));' >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 90 ] || { docker logs "$test_name-app"; exit 1; }
  sleep 1
done
docker exec "$test_name-app" node -e '
  const assert = require("node:assert/strict");
  const client = new (require("@prisma/client").PrismaClient)();
  (async () => {
    assert.equal(await client.user.count(), 0);
    const response = await fetch("http://127.0.0.1:3000/api/setup/check");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).needsSetup, true);
  })().catch(error => { console.error(error); process.exitCode = 1; })
    .finally(() => client.$disconnect());'
docker rm -f "$test_name-app" >/dev/null
echo "PASS: $image default server serves setup and queries its database offline"

printf 'invalid schema\n' >"$scratch/schema.prisma"
chmod 644 "$scratch/schema.prisma"
if run_app -v "$scratch/schema.prisma:/app/prisma/schema.prisma:ro" >"$scratch/generate.log" 2>&1; then
  echo 'Generation failure incorrectly started the app'; exit 1
fi
if grep -q '^APP_STARTED$' "$scratch/generate.log"; then
  echo 'Generation failure unexpectedly ran the app'; exit 1
fi
grep -q 'P1012' "$scratch/generate.log"
echo "PASS: $image generation failure blocks startup"

docker exec "$test_name-db" psql -U postgres -d fluid -v ON_ERROR_STOP=1 -c \
  "INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at) VALUES ('00000000-0000-0000-0000-000000000504', 'test', 'failed_startup_test', now());" >/dev/null
if run_app >"$scratch/migrate.log" 2>&1; then
  echo 'Migration failure incorrectly started the app'; exit 1
fi
if grep -q '^APP_STARTED$' "$scratch/migrate.log"; then
  echo 'Migration failure unexpectedly ran the app'; exit 1
fi
grep -q 'P3009' "$scratch/migrate.log"
echo "PASS: $image uses its bundled CLI offline and stops on generation/migration failures"
