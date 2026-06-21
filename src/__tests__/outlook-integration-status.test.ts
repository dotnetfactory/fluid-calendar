import * as apiAuth from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import * as route from "@/app/api/integration-status/route";

// Issue #97: Tenant ID is optional for Outlook - the backend defaults the tenant
// to "common" and the OAuth endpoints are hardcoded to /common/, so a personal
// Microsoft account setup uses only client ID + secret. The integration-status
// check must therefore report Outlook as configured without a tenant ID;
// otherwise the AccountManager "Connect Outlook" button stays disabled and the
// documented personal-account flow can never start.

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: { systemSettings: { findFirst: jest.fn() } },
}));

const mockedFindFirst = prisma.systemSettings.findFirst as jest.Mock;

describe("integration-status Outlook configured (issue #97)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(apiAuth, "authenticateRequest")
      .mockResolvedValue({ userId: "user-1" } as Awaited<
        ReturnType<typeof apiAuth.authenticateRequest>
      >);
  });

  const getJson = async () => {
    const res = await route.GET({} as never);
    return (res as Response).json();
  };

  it("reports Outlook configured with client id + secret and no tenant id", async () => {
    mockedFindFirst.mockResolvedValue({
      outlookClientId: "client-id",
      outlookClientSecret: "client-secret",
      outlookTenantId: null,
    });

    const body = await getJson();
    expect(body.outlook.configured).toBe(true);
  });

  it("reports Outlook not configured when client id or secret is missing", async () => {
    mockedFindFirst.mockResolvedValue({
      outlookClientId: "client-id",
      outlookClientSecret: null,
      outlookTenantId: null,
    });

    const body = await getJson();
    expect(body.outlook.configured).toBe(false);
  });
});
