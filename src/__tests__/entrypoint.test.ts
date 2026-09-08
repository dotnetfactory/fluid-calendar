import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("container startup", () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), "fluid-entrypoint-"));
    // Stub external commands, but execute the real entrypoint under POSIX sh.
    const commands = {
      nc: 'if [ ! -f "$TRACE.ready" ]; then touch "$TRACE.ready"; exit 1; fi',
      sleep: "exit 0",
      node: 'printf "%s\\n" "$*" >> "$TRACE"; if [ "$2" = "$FAIL_STEP" ]; then exit 23; fi',
      app: 'printf "app <%s>\\n" "$@" >> "$TRACE"; exit 17',
    };
    for (const [name, body] of Object.entries(commands)) {
      writeFileSync(join(sandbox, name), `#!/bin/sh\n${body}\n`, {
        mode: 0o755,
      });
    }
  });

  afterEach(() => rmSync(sandbox, { recursive: true, force: true }));

  it.each([
    ["generate", 23, ["./node_modules/prisma/build/index.js generate"]],
    [
      "migrate",
      23,
      [
        "./node_modules/prisma/build/index.js generate",
        "./node_modules/prisma/build/index.js migrate deploy",
      ],
    ],
    [
      "",
      17,
      [
        "./node_modules/prisma/build/index.js generate",
        "./node_modules/prisma/build/index.js migrate deploy",
        "app <two words>",
        "app <>",
      ],
    ],
  ])("propagates exit status for failure step '%s'", (step, status, trace) => {
    const result = spawnSync(
      "/bin/sh",
      [join(__dirname, "../../entrypoint.sh"), "app", "two words", ""],
      {
        env: {
          NODE_ENV: "test",
          PATH: `${sandbox}:/usr/bin:/bin`,
          DATABASE_URL: "postgresql://user:password@database:5432/app",
          TRACE: join(sandbox, "trace"),
          FAIL_STEP: step,
        },
        encoding: "utf8",
        timeout: 5000,
      }
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(status);
    expect(
      readFileSync(join(sandbox, "trace"), "utf8").trimEnd().split("\n")
    ).toEqual(trace);
  });
});
