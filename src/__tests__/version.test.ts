import {
  FALLBACK_APP_VERSION,
  GITHUB_REPO_URL,
  getAppVersion,
  getVersionGithubUrl,
} from "@/lib/version";

describe("version helpers", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_VERSION;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_VERSION;
    } else {
      process.env.NEXT_PUBLIC_APP_VERSION = originalEnv;
    }
  });

  describe("getAppVersion", () => {
    it("returns the value from NEXT_PUBLIC_APP_VERSION when set", () => {
      process.env.NEXT_PUBLIC_APP_VERSION = "1.2.3";
      expect(getAppVersion()).toBe("1.2.3");
    });

    it("trims surrounding whitespace from the env value", () => {
      process.env.NEXT_PUBLIC_APP_VERSION = "  2.0.0  ";
      expect(getAppVersion()).toBe("2.0.0");
    });

    it("falls back when the env var is unset", () => {
      delete process.env.NEXT_PUBLIC_APP_VERSION;
      expect(getAppVersion()).toBe(FALLBACK_APP_VERSION);
    });

    it("falls back when the env var is an empty string", () => {
      process.env.NEXT_PUBLIC_APP_VERSION = "";
      expect(getAppVersion()).toBe(FALLBACK_APP_VERSION);
    });

    it("falls back when the env var is only whitespace", () => {
      process.env.NEXT_PUBLIC_APP_VERSION = "   ";
      expect(getAppVersion()).toBe(FALLBACK_APP_VERSION);
    });
  });

  describe("getVersionGithubUrl", () => {
    // The link must always resolve to a real GitHub page. Not every package
    // version has a published GitHub release tag (e.g. 0.1.0 has none), so the
    // badge links to the repository root - always valid, and exactly "the
    // github page" the feature requires.
    it("links to the repository root", () => {
      expect(getVersionGithubUrl()).toBe(GITHUB_REPO_URL);
    });

    it("links to the repository root regardless of the current version", () => {
      process.env.NEXT_PUBLIC_APP_VERSION = "0.1.0";
      expect(getVersionGithubUrl()).toBe(GITHUB_REPO_URL);
    });
  });
});
