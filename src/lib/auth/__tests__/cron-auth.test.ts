import { NextRequest } from "next/server";

import { verifyCronSecret } from "@/lib/auth/cron-auth";

function reqWith(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set("authorization", authHeader);
  return { headers } as unknown as NextRequest;
}

describe("verifyCronSecret", () => {
  const ORIGINAL = process.env.CRON_SECRET;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIGINAL;
  });

  it("is disabled (fail closed) when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(verifyCronSecret(reqWith("Bearer anything"))).toBe("disabled");
  });

  it("is unauthorized when no Authorization header is present", () => {
    process.env.CRON_SECRET = "s3cret-value";
    expect(verifyCronSecret(reqWith())).toBe("unauthorized");
  });

  it("is unauthorized when the scheme isn't Bearer", () => {
    process.env.CRON_SECRET = "s3cret-value";
    expect(verifyCronSecret(reqWith("Basic s3cret-value"))).toBe("unauthorized");
  });

  it("is unauthorized when the bearer token is empty", () => {
    process.env.CRON_SECRET = "s3cret-value";
    expect(verifyCronSecret(reqWith("Bearer "))).toBe("unauthorized");
  });

  it("is unauthorized when the secret doesn't match", () => {
    process.env.CRON_SECRET = "s3cret-value";
    expect(verifyCronSecret(reqWith("Bearer wrong-value"))).toBe("unauthorized");
  });

  it("is unauthorized for a value that merely shares a prefix", () => {
    process.env.CRON_SECRET = "s3cret-value";
    expect(verifyCronSecret(reqWith("Bearer s3cret-valu"))).toBe("unauthorized");
  });

  it("is ok when the bearer token matches CRON_SECRET", () => {
    process.env.CRON_SECRET = "s3cret-value";
    expect(verifyCronSecret(reqWith("Bearer s3cret-value"))).toBe("ok");
  });
});
