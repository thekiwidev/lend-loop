"use client";

import { useState } from "react";
import { addDays } from "@/lib/dates";
import { cx } from "@/lib/cx";
import { Button } from "./Button";

export interface DateRange {
  startDate: string;
  endDate: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** How long a loan runs when the borrower only picks a start date. */
export const DEFAULT_LOAN_DAYS = 7;
const MONTHS_AHEAD = 6;

function overlaps(a: string, b: string, booked: readonly DateRange[]) {
  return booked.some((r) => r.startDate <= b && a <= r.endDate);
}

/** The default end: a week after start, cut short before the next booking. */
export function defaultEnd(start: string, booked: readonly DateRange[], maxDays: number): string {
  for (let k = Math.min(DEFAULT_LOAN_DAYS, maxDays) - 1; k > 0; k--) {
    const end = addDays(start, k);
    if (!overlaps(start, end, booked)) return end;
  }
  return start;
}

function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
}

function shiftMonth(month: string, by: number): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 7);
}

function label(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * Range calendar. The first click sets the start and a default end a week later; the next
 * click on a later day moves the end. Past and booked days cannot be picked; a click that
 * would cross a booking or run past `maxDays` starts a new range there instead.
 */
export function DateRangePicker({ value, onChange, today, booked, maxDays }: { value: DateRange; onChange: (range: DateRange) => void; today: string; booked: readonly DateRange[]; maxDays: number }) {
  const [month, setMonth] = useState(value.startDate.slice(0, 7));
  const [pickingEnd, setPickingEnd] = useState(false);
  const lastMonth = shiftMonth(today.slice(0, 7), MONTHS_AHEAD);
  const lastEnd = addDays(value.startDate, maxDays - 1);

  function disabled(date: string) {
    return date < today || overlaps(date, date, booked);
  }

  function validEnd(date: string) {
    return date >= value.startDate && date <= lastEnd && !overlaps(value.startDate, date, booked);
  }

  function pick(date: string) {
    // A day that cannot end the current range starts a new one instead.
    if (!pickingEnd || !validEnd(date)) {
      onChange({ startDate: date, endDate: defaultEnd(date, booked, maxDays) });
      setPickingEnd(true);
    } else {
      onChange({ startDate: value.startDate, endDate: date });
      setPickingEnd(false);
    }
  }

  return (
    <div className="ll-cal">
      <div className="ll-cal__head">
        <Button variant="ghost" size="sm" icon="chevron-right" className="ll-cal__prev" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, -1))} />
        <p className="ll-cal__month" aria-live="polite">
          {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
        </p>
        <Button variant="ghost" size="sm" icon="chevron-right" aria-label="Next month" disabled={month >= lastMonth} onClick={() => setMonth(shiftMonth(month, 1))} />
      </div>
      <div className="ll-cal__grid" role="grid" aria-label="Choose dates">
        {WEEKDAYS.map((d) => (
          <span key={d} className="ll-cal__dow" aria-hidden="true">
            {d}
          </span>
        ))}
        {monthCells(month).map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const isStart = date === value.startDate;
          const isEnd = date === value.endDate;
          const inRange = date > value.startDate && date < value.endDate;
          const isBooked = overlaps(date, date, booked);
          return (
            <button
              key={date}
              type="button"
              className={cx("ll-cal__day", inRange && "is-range", (isStart || isEnd) && "is-edge", isBooked && "is-booked", date === today && "is-today")}
              aria-pressed={isStart || isEnd || inRange}
              aria-label={`${label(date)}${isBooked ? ", already lent" : ""}`}
              disabled={disabled(date)}
              onClick={() => pick(date)}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="ll-cal__hint caption">{pickingEnd ? `Pick the day you'll bring it back, up to ${label(lastEnd)}.` : "Pick the day you'll collect it."}</p>
    </div>
  );
}
