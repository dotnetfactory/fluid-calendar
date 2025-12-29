import * as googleModule from "@/lib/google";
import * as route from "@/app/api/calendar/google/auth/route";

jest.mock("@/lib/google");

describe("Calendar Google auth route", () => {
  it("requests tasks scope when generating auth URL", async () => {
    const generateAuthUrl = jest.fn().mockReturnValue("https://redirect");
    jest.spyOn(googleModule, "createGoogleOAuthClient").mockResolvedValue(
      { generateAuthUrl } as unknown as ReturnType<typeof googleModule.createGoogleOAuthClient>
    );

    await route.GET();

    expect(generateAuthUrl).toHaveBeenCalled();
    const arg = generateAuthUrl.mock.calls[0][0];
    expect(Array.isArray(arg.scope)).toBe(true);
    expect(arg.scope).toContain("https://www.googleapis.com/auth/tasks");
  });
});
