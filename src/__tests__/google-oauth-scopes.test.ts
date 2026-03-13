import { getAuthOptions } from "@/lib/auth/auth-options"; 

jest.mock("next-auth/providers/google", () => {
  return jest.fn((opts: unknown) => ({ __mockGoogleOpts: opts }));
});

jest.mock("@/lib/auth", () => {
  return {
    getGoogleCredentials: jest.fn().mockResolvedValue({ clientId: "id", clientSecret: "secret" }),
    getOutlookCredentials: jest.fn().mockResolvedValue({ clientId: "id", clientSecret: "secret", tenantId: "common" }),
  };
});

describe("Google OAuth scopes in Auth Options", () => {
  it("includes tasks scope in NextAuth GoogleProvider config", async () => {
    const options = await getAuthOptions();

    // Find our mocked provider object
    const provider = (options.providers as unknown as Array<Record<string, unknown>>).find((p) =>
      p && Object.prototype.hasOwnProperty.call(p, "__mockGoogleOpts")
    );
    expect(provider).toBeDefined();

    const providerObj = provider as unknown as { __mockGoogleOpts: { authorization: { params: { scope: string } } } };
    const scope = providerObj.__mockGoogleOpts.authorization.params.scope;
    expect(scope).toMatch("https://www.googleapis.com/auth/tasks");
  });
});
