import { resolveOutlookAccountEmail } from "@/lib/outlook";

// Issue #97: personal Microsoft accounts (outlook.com / hotmail.com / M365
// Personal/Family) return `mail: null` from Graph /me and carry the address in
// `userPrincipalName`. The Outlook connect callback must fall back to
// userPrincipalName so these accounts can connect instead of failing with
// `profile-fetch-failed`.

describe("resolveOutlookAccountEmail (issue #97)", () => {
  it("uses mail when present (work/school account)", () => {
    expect(
      resolveOutlookAccountEmail({
        mail: "user@contoso.com",
        userPrincipalName: "user@contoso.onmicrosoft.com",
      })
    ).toBe("user@contoso.com");
  });

  it("falls back to userPrincipalName when mail is null (personal account)", () => {
    expect(
      resolveOutlookAccountEmail({
        mail: null,
        userPrincipalName: "someone@outlook.com",
      })
    ).toBe("someone@outlook.com");
  });

  it("falls back to userPrincipalName when mail is an empty string", () => {
    expect(
      resolveOutlookAccountEmail({
        mail: "",
        userPrincipalName: "someone@hotmail.com",
      })
    ).toBe("someone@hotmail.com");
  });

  it("returns null when neither mail nor userPrincipalName is usable", () => {
    expect(
      resolveOutlookAccountEmail({ mail: null, userPrincipalName: "" })
    ).toBeNull();
    expect(resolveOutlookAccountEmail(null)).toBeNull();
    expect(resolveOutlookAccountEmail(undefined)).toBeNull();
  });
});
