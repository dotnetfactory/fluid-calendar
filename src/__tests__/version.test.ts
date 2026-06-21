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
    it("links to the release tag for a real version", () => {
      expect(getVersionGithubUrl("1.2.3")).toBe(
        `${GITHUB_REPO_URL}/releases/tag/v1.2.3`
      );
    });

    it("does not double-prefix a version that already starts with v", () => {
      expect(getVersionGithubUrl("v1.2.3")).toBe(
        `${GITHUB_REPO_URL}/releases/tag/v1.2.3`
      );
    });

    it("links to the repo root when the version is the fallback", () => {
      expect(getVersionGithubUrl(FALLBACK_APP_VERSION)).toBe(GITHUB_REPO_URL);
    });

    it("links to the repo root when no version is provided", () => {
      delete process.env.NEXT_PUBLIC_APP_VERSION;
      expect(getVersionGithubUrl()).toBe(GITHUB_REPO_URL);
    });

    it("uses the resolved app version when called with no argument", () => {
      process.env.NEXT_PUBLIC_APP_VERSION = "9.9.9";
      expect(getVersionGithubUrl()).toBe(
        `${GITHUB_REPO_URL}/releases/tag/v9.9.9`
      );
    });
  });
});
