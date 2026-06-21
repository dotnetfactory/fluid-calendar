import { existsSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Guards the Copilot coding-agent custom-instructions file (issue #147).
 *
 * GitHub Copilot reads repository-wide instructions from
 * `.github/copilot-instructions.md`. This test asserts the file exists at that
 * canonical path and carries the load-bearing guidance it is meant to convey,
 * so the file cannot be silently emptied or stripped of its key sections.
 */
describe("Copilot custom instructions", () => {
  const filePath = join(process.cwd(), ".github", "copilot-instructions.md");

  it("exists at the GitHub-recognized path", () => {
    expect(existsSync(filePath)).toBe(true);
  });

  const read = () => readFileSync(filePath, "utf8");

  it("is non-empty", () => {
    expect(read().trim().length).toBeGreaterThan(0);
  });

  it("documents setup and the verification gate", () => {
    const content = read();
    expect(content).toContain("npm install --legacy-peer-deps");
    expect(content).toContain("npm run test:unit");
    expect(content).toContain("npm run lint");
    expect(content).toContain("npm run type-check");
  });

  it("captures the SAAS vs open-source separation", () => {
    const content = read();
    expect(content).toContain("src/saas/");
    expect(content).toMatch(/\.saas\.ts/);
    expect(content).toMatch(/\.open\.ts/);
  });

  it("captures core code-style conventions", () => {
    const content = read();
    expect(content).toContain("@/lib/prisma");
    expect(content).toContain("@/lib/date-utils");
    expect(content).toContain("@/lib/logger");
    expect(content).toContain("LOG_SOURCE");
    expect(content).toContain("CHANGELOG.md");
  });
});
