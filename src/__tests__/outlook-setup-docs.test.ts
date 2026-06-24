import { readFileSync } from "fs";
import { join } from "path";

// Issue #97: the Outlook setup docs told self-hosters to register the wrong
// redirect URI (`/api/auth/callback/azure-ad` in the README, a
// `/api/calendar/outlook/callback` variant in docs/_old/outlook.md), causing a
// Microsoft `redirect_uri` mismatch. The app's Outlook connect callback actually
// lives at `/api/calendar/outlook`. These tests pin the docs to that path.

const repoRoot = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

describe("Outlook setup docs (issue #97)", () => {
  describe("README", () => {
    const readme = read("README.md");
    // Scope assertions to the Microsoft Outlook Setup section so unrelated
    // mentions elsewhere cannot mask a wrong/missing instruction.
    const outlookSection = (() => {
      const idx = readme.indexOf("## Microsoft Outlook Setup");
      if (idx === -1) return readme;
      const next = readme.indexOf("\n## ", idx + 1);
      return next === -1 ? readme.slice(idx) : readme.slice(idx, next);
    })();

    it("documents the correct Outlook redirect URI", () => {
      expect(outlookSection).toContain("/api/calendar/outlook");
    });

    it("does not instruct registering the azure-ad NextAuth callback for Outlook connect", () => {
      expect(outlookSection).not.toContain("/api/auth/callback/azure-ad");
    });
  });

  describe("Reference doc (docs/_old/outlook.md)", () => {
    const doc = read("docs/_old/outlook.md");

    it("uses the /api/calendar/outlook redirect URI without a trailing /callback", () => {
      expect(doc).toContain("/api/calendar/outlook");
      expect(doc).not.toContain("/api/calendar/outlook/callback");
    });
  });

  describe("Self-hosting checklist (docs/self-hosting-setup-checklist.md)", () => {
    const checklist = read("docs/self-hosting-setup-checklist.md");
    const outlookSection = (() => {
      const idx = checklist.indexOf("## 3. Outlook Calendar");
      if (idx === -1) return checklist;
      const next = checklist.indexOf("\n## ", idx + 1);
      return next === -1 ? checklist.slice(idx) : checklist.slice(idx, next);
    })();

    it("lists the correct Outlook redirect URI", () => {
      expect(outlookSection).toContain("/api/calendar/outlook");
    });

    it("does not instruct the azure-ad NextAuth callback for Outlook connect", () => {
      expect(outlookSection).not.toContain("/api/auth/callback/azure-ad");
    });
  });

  // Guard every setup doc at once so a stale Outlook callback variant cannot
  // creep back into any one of them.
  describe("No stale Outlook callback variant in any setup doc", () => {
    const docs = [
      "README.md",
      "docs/_old/outlook.md",
      "docs/self-hosting-setup-checklist.md",
    ];
    it.each(docs)("%s has no /api/calendar/outlook/callback variant", (rel) => {
      expect(read(rel)).not.toContain("/api/calendar/outlook/callback");
    });
  });
});
