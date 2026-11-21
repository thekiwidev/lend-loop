import { describe, expect, it } from "vitest";
import { defaultEnd } from "../components/DateRangePicker";

describe("defaultEnd", () => {
  it("gives a week from any start date", () => {
    expect(defaultEnd("2026-11-30", [], 30)).toBe("2026-12-06");
  });

  it("stops the day before the next booking", () => {
    expect(defaultEnd("2026-11-24", [{ startDate: "2026-11-27", endDate: "2026-11-29" }], 30)).toBe("2026-11-26");
  });

  it("falls back to one day when the next day is booked", () => {
    expect(defaultEnd("2026-11-24", [{ startDate: "2026-11-25", endDate: "2026-11-25" }], 30)).toBe("2026-11-24");
  });
});
