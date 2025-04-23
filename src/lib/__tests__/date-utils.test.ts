import { newDateFromYMD, roundDateUp } from "../date-utils";

describe("roundDateUp", () => {
  test("should round up to next 30 minutes by default", () => {
    // 8:01 should round to 8:30
    const date1 = newDateFromYMD(2024, 1, 1);
    date1.setHours(8, 1);
    expect(roundDateUp(date1).getMinutes()).toBe(30);
    expect(roundDateUp(date1).getHours()).toBe(8);

    // 8:31 should round to 9:00
    const date2 = newDateFromYMD(2024, 1, 1);
    date2.setHours(8, 31);
    expect(roundDateUp(date2).getMinutes()).toBe(0);
    expect(roundDateUp(date2).getHours()).toBe(9);

    // 8:59 should round to 9:00
    const date3 = newDateFromYMD(2024, 1, 1);
    date3.setHours(8, 59);
    expect(roundDateUp(date3).getMinutes()).toBe(0);
    expect(roundDateUp(date3).getHours()).toBe(9);
  });

  test("should round up to specified minutes", () => {
    // Test rounding to 15 minutes
    const date = newDateFromYMD(2024, 1, 1);
    date.setHours(8, 1);

    const rounded = roundDateUp(date, 15);
    expect(rounded.getMinutes()).toBe(15);
    expect(rounded.getHours()).toBe(8);
  });

  test("should not change time if already at interval", () => {
    // Test exact 30-minute mark
    const date = newDateFromYMD(2024, 1, 1);
    date.setHours(8, 30);

    const rounded = roundDateUp(date);
    expect(rounded.getMinutes()).toBe(30);
    expect(rounded.getHours()).toBe(8);
  });

  test("should handle hour rollover", () => {
    // 23:31 should round to 00:00 next day
    const date = newDateFromYMD(2024, 1, 1);
    date.setHours(23, 31);

    const rounded = roundDateUp(date);
    expect(rounded.getMinutes()).toBe(0);
    expect(rounded.getHours()).toBe(0);
    expect(rounded.getDate()).toBe(2); // Should be next day
  });

  test("should preserve date and only modify time", () => {
    const date = newDateFromYMD(2024, 2, 29); // Leap year
    date.setHours(8, 1);

    const rounded = roundDateUp(date);
    expect(rounded.getFullYear()).toBe(2024);
    expect(rounded.getMonth()).toBe(2); // March
    expect(rounded.getDate()).toBe(29);
  });
});
