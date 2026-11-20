import { describe, expect, it } from "vitest";
import {
  alreadyLentError,
  canTransition,
  displayStatus,
  formatRange,
  isIsoDate,
  isOutToday,
  isOverdue,
  loanDays,
  rangesOverlap,
  requestDatesError,
  todayUtc,
  transitionError,
  type Actor,
  type StoredLoanStatus,
} from "../convex/lib/loanRules";

const STATUSES: StoredLoanStatus[] = ["pending", "approved", "declined", "cancelled", "returned"];
const ACTORS: Actor[] = ["owner", "borrower"];
const ALLOWED = new Set(["pending>approved>owner", "pending>declined>owner", "pending>cancelled>borrower", "approved>returned>owner"]);

describe("transitions", () => {
  for (const from of STATUSES) {
    for (const to of STATUSES) {
      for (const by of ACTORS) {
        const key = `${from}>${to}>${by}`;
        it(`${key} is ${ALLOWED.has(key) ? "allowed" : "refused"}`, () => {
          expect(canTransition(from, to, by)).toBe(ALLOWED.has(key));
          expect(transitionError(from, to, by) === null).toBe(ALLOWED.has(key));
        });
      }
    }
  }

  it("tells a borrower that only the owner can approve", () => {
    expect(transitionError("pending", "approved", "borrower")).toBe("Only the owner can do that.");
  });

  it("explains a finished request", () => {
    expect(transitionError("declined", "approved", "owner")).toBe("This request is already declined.");
  });
});

describe("dates", () => {
  it("formats today in UTC", () => {
    expect(todayUtc(Date.parse("2026-11-20T23:30:00-05:00"))).toBe("2026-11-21");
  });

  it("accepts only real calendar dates", () => {
    expect(isIsoDate("2026-11-24")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("24/11/2026")).toBe(false);
  });

  it("counts loan days inclusively", () => {
    expect(loanDays("2026-11-24", "2026-11-24")).toBe(1);
    expect(loanDays("2026-11-24", "2026-11-26")).toBe(3);
    expect(loanDays("2026-11-30", "2026-12-02")).toBe(3);
  });

  const today = "2026-11-20";
  it.each([
    ["2026-11-19", "2026-11-21", "Start date can't be in the past."],
    ["2026-11-22", "2026-11-21", "End date must be on or after the start date."],
    ["2026-11-20", "2026-12-20", "Loans can last at most 30 days."],
    ["nope", "2026-11-21", "Dates must look like 2026-11-24."],
  ])("refuses %s to %s", (start, end, message) => {
    expect(requestDatesError(start, end, today)).toBe(message);
  });

  it.each([
    ["2026-11-20", "2026-11-20"],
    ["2026-11-20", "2026-12-19"],
  ])("accepts %s to %s", (start, end) => {
    expect(requestDatesError(start, end, today)).toBeNull();
  });
});

describe("overlap", () => {
  const lent = { startDate: "2026-11-24", endDate: "2026-11-26" };
  it.each([
    [{ startDate: "2026-11-20", endDate: "2026-11-24" }, true],
    [{ startDate: "2026-11-26", endDate: "2026-11-28" }, true],
    [{ startDate: "2026-11-25", endDate: "2026-11-25" }, true],
    [{ startDate: "2026-11-20", endDate: "2026-11-30" }, true],
    [{ startDate: "2026-11-20", endDate: "2026-11-23" }, false],
    [{ startDate: "2026-11-27", endDate: "2026-11-28" }, false],
  ])("%o overlaps: %s", (range, expected) => {
    expect(rangesOverlap(range, lent)).toBe(expected);
    expect(rangesOverlap(lent, range)).toBe(expected);
  });

  it("uses the design system's voice", () => {
    expect(alreadyLentError("Drill", lent)).toBe("The drill is already lent for 24–26 Nov.");
    expect(formatRange({ startDate: "2026-11-30", endDate: "2026-12-02" })).toBe("30 Nov–2 Dec");
  });
});

describe("derived status", () => {
  const today = "2026-11-20";
  it("marks approved loans past their end date as overdue", () => {
    expect(isOverdue({ status: "approved", endDate: "2026-11-19" }, today)).toBe(true);
    expect(isOverdue({ status: "approved", endDate: "2026-11-20" }, today)).toBe(false);
    expect(isOverdue({ status: "returned", endDate: "2026-11-01" }, today)).toBe(false);
    expect(displayStatus({ status: "approved", endDate: "2026-11-19" }, today)).toBe("overdue");
  });

  it("is out today only inside an approved range", () => {
    expect(isOutToday({ status: "approved", startDate: "2026-11-20", endDate: "2026-11-21" }, today)).toBe(true);
    expect(isOutToday({ status: "approved", startDate: "2026-11-21", endDate: "2026-11-22" }, today)).toBe(false);
    expect(isOutToday({ status: "pending", startDate: "2026-11-19", endDate: "2026-11-22" }, today)).toBe(false);
  });
});
