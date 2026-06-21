import * as apiAuth from "@/lib/auth/api-auth";
import * as auth from "@/lib/auth";
import * as route from "@/app/api/integration-status/route";

// Issue #97: Tenant ID is optional for Outlook - the backend defaults the tenant
// to "common" and the OAuth endpoints are hardcoded to /common/, so a personal
// Microsoft account setup uses only client ID + secret. The integration-status
// check must therefore report Outlook as configured without a tenant ID;
// otherwise the AccountManager "Connect Outlook" button stays disabled and the
// documented personal-account flow can never start. It must also honor the
// documented AZURE_AD_* env-var fallback, since the OAuth routes resolve
// credentials from settings OR env via getOutlook/getGoogleCredentials.

jest.mock("@/lib/auth");

const mockedGetOutlook = auth.getOutlookCredentials as jest.Mock;
const mockedGetGoogle = auth.getGoogleCredentials as jest.Mock;

describe("integration-status Outlook configured (issue #97)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(apiAuth, "authenticateRequest")
      .mockResolvedValue({ userId: "user-1" } as Awaited<
        ReturnType<typeof apiAuth.authenticateRequest>
      >);
    // Google not configured by default; individual tests override as needed.
    mockedGetGoogle.mockResolvedValue({ clientId: "", clientSecret: "" });
  });

  const getJson = async () => {
    const res = await route.GET({} as never);
    return (res as Response).json();
  };

  it("reports Outlook configured with client id + secret and no tenant id", async () => {
    mockedGetOutlook.mockResolvedValue({
      clientId: "client-id",
      clientSecret: "client-secret",
      tenantId: "common",
    });

    const body = await getJson();
    expect(body.outlook.configured).toBe(true);
  });

  it("reports Outlook configured from the env-var fallback (no settings row)", async () => {
    // getOutlookCredentials merges settings OR AZURE_AD_* env vars; the status
    // check must reflect that merged result, not just the settings row.
    mockedGetOutlook.mockResolvedValue({
      clientId: "env-client-id",
      clientSecret: "env-client-secret",
      tenantId: "",
    });

    const body = await getJson();
    expect(body.outlook.configured).toBe(true);
  });

  it("reports Outlook not configured when client id or secret is missing", async () => {
    mockedGetOutlook.mockResolvedValue({
      clientId: "client-id",
      clientSecret: "",
      tenantId: "common",
    });

    const body = await getJson();
    expect(body.outlook.configured).toBe(false);
  });
});
