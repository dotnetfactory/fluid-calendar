import { ApiHttpError } from "@/lib/api/v1";
import { parseApiDate, parseOptionalApiDate } from "@/lib/api/dates";

describe("parseApiDate", () => {
  it("accepts RFC 3339 date-times with offsets", () => {
    expect(parseApiDate("2026-06-24T15:00:00Z", "start").toISOString()).toBe(
      "2026-06-24T15:00:00.000Z"
    );
    expect(parseApiDate("2026-06-24T17:00:00+02:00", "start").toISOString()).toBe(
      "2026-06-24T15:00:00.000Z"
    );
    expect(parseApiDate("2026-06-24T15:00:00.500Z", "start")).toBeInstanceOf(
      Date
    );
  });

  it("accepts a calendar date as UTC midnight", () => {
    expect(parseApiDate("2026-06-24", "from").toISOString()).toBe(
      "2026-06-24T00:00:00.000Z"
    );
  });

  it("rejects non-RFC-3339 strings", () => {
    for (const bad of [
      "tomorrow",
      "06/24/2026",
      "2026-06-24T15:00:00", // no offset
      "2026-13-01T00:00:00Z", // impossible month
      "not-a-date",
      "",
    ]) {
      expect(() => parseApiDate(bad, "start")).toThrow(ApiHttpError);
    }
  });

  it("rejects non-string input", () => {
    expect(() => parseApiDate(1750000000000, "start")).toThrow(ApiHttpError);
    expect(() => parseApiDate(null, "start")).toThrow(ApiHttpError);
  });

  it("surfaces the offending field on the error", () => {
    try {
      parseApiDate("nope", "dueDate");
      fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiHttpError);
      expect((e as ApiHttpError).opts?.field).toBe("dueDate");
    }
  });
});

describe("parseOptionalApiDate", () => {
  it("returns null for empty values", () => {
    expect(parseOptionalApiDate(undefined, "x")).toBeNull();
    expect(parseOptionalApiDate(null, "x")).toBeNull();
    expect(parseOptionalApiDate("", "x")).toBeNull();
  });

  it("validates when a value is present", () => {
    expect(parseOptionalApiDate("2026-06-24T15:00:00Z", "x")).toBeInstanceOf(
      Date
    );
    expect(() => parseOptionalApiDate("bad", "x")).toThrow(ApiHttpError);
  });
});
