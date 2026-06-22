import { readFileSync } from "fs";
import { join } from "path";

import { parse as parseYaml } from "yaml";

// Issue #151: the Docker quick-start failed for operators whose `.env` contained
// an unrelated `PORT` (e.g. `PORT=80`). `docker-compose.yml` forwards the whole
// `.env` into the app container via `env_file`, and the published image's
// Next.js standalone server honors `process.env.PORT` for its bind port - so the
// app bound to the wrong port while compose still mapped host 3000 -> container
// 3000, leaving nothing on localhost:3000. The fix pins `PORT=3000` on the app
// service's `environment` (which overrides `env_file`), so the published port
// always reaches a listening server. These tests pin that behavior + the docs.

const repoRoot = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

interface ComposeService {
  environment?: string[] | Record<string, string | number | null>;
  env_file?: string | string[];
  ports?: Array<string | number | { target?: number; published?: number }>;
}

describe("Docker quick-start (issue #151)", () => {
  const compose = parseYaml(read("docker-compose.yml")) as {
    services: Record<string, ComposeService>;
  };
  const app = compose.services.app;

  // Normalize the app service `environment` (list or map form) to a plain map.
  const appEnv: Record<string, string> = (() => {
    const env = app.environment;
    if (!env) return {};
    if (Array.isArray(env)) {
      return Object.fromEntries(
        env.map((entry) => {
          const idx = entry.indexOf("=");
          return idx === -1
            ? [entry, ""]
            : [entry.slice(0, idx), entry.slice(idx + 1)];
        })
      );
    }
    return Object.fromEntries(
      Object.entries(env).map(([k, v]) => [k, String(v ?? "")])
    );
  })();

  it("pins the container PORT to 3000 via environment (overrides any .env PORT)", () => {
    expect(appEnv.PORT).toBe("3000");
  });

  it("publishes the app on container port 3000, matching the pinned PORT", () => {
    const ports = app.ports ?? [];
    const containerPorts = ports.map((p) => {
      if (typeof p === "object") return String(p.target ?? "");
      // "host:container" or "container" -> take the container side
      const str = String(p);
      const parts = str.split(":");
      return parts[parts.length - 1].split("/")[0];
    });
    expect(containerPorts).toContain("3000");
  });

  it("still loads the operator's .env via env_file", () => {
    const envFile = app.env_file;
    const envFiles = Array.isArray(envFile)
      ? envFile
      : envFile
        ? [envFile]
        : [];
    expect(envFiles).toContain(".env");
  });

  describe("README quick-start docs", () => {
    const readme = read("README.md");
    // Scope assertions to the Docker quick-start section.
    const section = (() => {
      const idx = readme.indexOf("### Quick Start with Docker");
      if (idx === -1) return readme;
      const next = readme.indexOf("\n### ", idx + 1);
      return next === -1 ? readme.slice(idx) : readme.slice(idx, next);
    })();

    // Isolate the explicit port note so trivial mentions elsewhere in the
    // quick-start (e.g. the NEXTAUTH_URL line in the env example) cannot mask a
    // missing instruction.
    const portNote = (() => {
      const idx = section.indexOf("Note on the port");
      if (idx === -1) return "";
      const next = section.indexOf("\n\n", idx);
      return next === -1 ? section.slice(idx) : section.slice(idx, next);
    })();

    it("explains the container port is fixed and PORT in .env does not change it", () => {
      expect(portNote).toContain("PORT");
      expect(portNote.toLowerCase()).toContain("ports");
    });

    it("warns that changing the host port also requires updating NEXTAUTH_URL to the same origin", () => {
      // Issue #151 review: the quick-start sets NEXTAUTH_URL=http://localhost:3000
      // and the app derives OAuth redirect URLs from it, so remapping the host
      // port without updating NEXTAUTH_URL breaks auth. The note must say so.
      expect(portNote).toContain("NEXTAUTH_URL");
    });
  });
});
