/**
 * Full E2E Test Suite Orchestrator
 *
 * Runs the complete test suite including:
 * 1. SaaS mode tests (standard projects)
 * 2. OS build + OS-specific tests
 *
 * Usage:
 *   npx tsx scripts/run-e2e-full.ts              # Run everything
 *   npx tsx scripts/run-e2e-full.ts --skip-os     # Skip OS build phase
 *   npx tsx scripts/run-e2e-full.ts --only-os     # Only run OS build phase
 */

import { execSync, spawn, ChildProcess } from "child_process";
import http from "http";

const args = process.argv.slice(2);
const skipOs = args.includes("--skip-os");
const onlyOs = args.includes("--only-os");

const OS_PORT = 3001;
const OS_BASE_URL = `http://localhost:${OS_PORT}`;

function log(message: string) {
  console.log(`\n[e2e-full] ${message}`);
}

function runCommand(command: string, env?: Record<string, string>): boolean {
  log(`Running: ${command}`);
  try {
    execSync(command, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    return true;
  } catch {
    return false;
  }
}

function waitForServer(
  url: string,
  timeoutMs: number = 60000
): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();

    const check = () => {
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }

      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve(true);
          } else {
            setTimeout(check, 1000);
          }
        })
        .on("error", () => {
          setTimeout(check, 1000);
        });
    };

    check();
  });
}

function startOsServer(): ChildProcess {
  log(`Starting OS server on port ${OS_PORT}...`);
  const server = spawn("npx", ["next", "start", "-p", String(OS_PORT)], {
    stdio: "pipe",
    env: {
      ...process.env,
      NEXT_PUBLIC_ENABLE_SAAS_FEATURES: "false",
      PORT: String(OS_PORT),
    },
    detached: false,
  });

  server.stdout?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line) console.log(`  [os-server] ${line}`);
  });

  server.stderr?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line) console.error(`  [os-server] ${line}`);
  });

  return server;
}

function killServer(server: ChildProcess) {
  log("Stopping OS server...");
  server.kill("SIGTERM");
}

async function runOsPhase(): Promise<boolean> {
  // Step 1: Build OS version
  log("Building open-source version...");
  const buildOk = runCommand("npm run build:os");
  if (!buildOk) {
    console.error("[e2e-full] OS build failed!");
    return false;
  }

  // Step 2: Start OS server
  const server = startOsServer();

  try {
    // Step 3: Wait for server
    log(`Waiting for OS server at ${OS_BASE_URL}...`);
    const ready = await waitForServer(OS_BASE_URL);
    if (!ready) {
      console.error("[e2e-full] OS server failed to start within timeout!");
      return false;
    }
    log("OS server is ready.");

    // Step 4: Run OS tests
    const testOk = runCommand(
      "npx playwright test --project=os-build",
      {
        TEST_OS_BUILD: "true",
        TEST_BASE_URL: OS_BASE_URL,
      }
    );

    return testOk;
  } finally {
    killServer(server);
  }
}

async function main() {
  let saasOk = true;
  let osOk = true;

  // Phase 1: SaaS mode tests
  if (!onlyOs) {
    log("=== Phase 1: SaaS Mode Tests ===");
    saasOk = runCommand(
      "npx playwright test --project=setup --project=chromium --project=chromium-saas --project=authenticated --project=authenticated-saas"
    );

    if (!saasOk) {
      log("SaaS mode tests failed!");
    } else {
      log("SaaS mode tests passed.");
    }
  }

  // Phase 2: OS build tests
  if (!skipOs) {
    log("=== Phase 2: OS Build Tests ===");
    osOk = await runOsPhase();

    if (!osOk) {
      log("OS build tests failed!");
    } else {
      log("OS build tests passed.");
    }
  }

  // Summary
  log("=== Results ===");
  if (!onlyOs) log(`  SaaS tests: ${saasOk ? "PASSED" : "FAILED"}`);
  if (!skipOs) log(`  OS tests:   ${osOk ? "PASSED" : "FAILED"}`);

  const allPassed = saasOk && osOk;
  log(allPassed ? "All tests passed!" : "Some tests failed.");
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("[e2e-full] Unexpected error:", error);
  process.exit(1);
});
