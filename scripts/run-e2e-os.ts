/**
 * OS Build E2E Test Runner
 *
 * Builds the open-source version, starts it on port 3001,
 * and runs the OS-specific tests against it.
 *
 * Usage:
 *   npx tsx scripts/run-e2e-os.ts
 */

import { execSync, spawn, ChildProcess } from "child_process";
import http from "http";

const OS_PORT = 3001;
const OS_BASE_URL = `http://localhost:${OS_PORT}`;

function log(message: string) {
  console.log(`\n[e2e-os] ${message}`);
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

async function main() {
  // Step 1: Build OS version
  log("Building open-source version...");
  const buildOk = runCommand("npm run build:os");
  if (!buildOk) {
    console.error("[e2e-os] OS build failed!");
    process.exit(1);
  }

  // Step 2: Start OS server
  const server = startOsServer();

  try {
    // Step 3: Wait for server
    log(`Waiting for OS server at ${OS_BASE_URL}...`);
    const ready = await waitForServer(OS_BASE_URL);
    if (!ready) {
      console.error("[e2e-os] OS server failed to start within timeout!");
      process.exit(1);
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

    if (!testOk) {
      log("OS tests failed!");
      process.exit(1);
    }

    log("OS tests passed!");
  } finally {
    killServer(server);
  }
}

main().catch((error) => {
  console.error("[e2e-os] Unexpected error:", error);
  process.exit(1);
});
