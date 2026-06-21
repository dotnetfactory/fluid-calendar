import { formatTime } from "@/lib/autoSchedule";

// Issue #129: the time-selection dropdowns in the Auto-Schedule settings tab
// (Working Hours start/end, energy-level ranges) must honor the user's 12h/24h
// preference from General settings instead of always rendering 24-hour times.

describe("formatTime", () => {
  describe("24-hour format", () => {
    it("zero-pads a morning hour", () => {
      expect(formatTime(9, "24h")).toBe("09:00");
    });

    it("renders an evening hour as 24-hour time", () => {
      expect(formatTime(20, "24h")).toBe("20:00");
    });

    it("renders midnight as 00:00", () => {
      expect(formatTime(0, "24h")).toBe("00:00");
    });

    it("renders noon as 12:00", () => {
      expect(formatTime(12, "24h")).toBe("12:00");
    });
  });

  describe("12-hour format", () => {
    it("renders an evening hour with a PM suffix", () => {
      expect(formatTime(20, "12h")).toBe("8:00 PM");
    });

    it("renders a morning hour with an AM suffix", () => {
      expect(formatTime(9, "12h")).toBe("9:00 AM");
    });

    it("renders midnight as 12:00 AM", () => {
      expect(formatTime(0, "12h")).toBe("12:00 AM");
    });

    it("renders noon as 12:00 PM", () => {
      expect(formatTime(12, "12h")).toBe("12:00 PM");
    });

    it("renders 11 PM correctly", () => {
      expect(formatTime(23, "12h")).toBe("11:00 PM");
    });
  });

  describe("default behavior", () => {
    it("defaults to 24-hour format when no preference is given", () => {
      expect(formatTime(20)).toBe("20:00");
    });
  });
});
