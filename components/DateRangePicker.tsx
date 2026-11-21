"use client";

import { useState } from "react";
import { addDays } from "@/lib/dates";
import { cx } from "@/lib/cx";
import { Button } from "./Button";
import { Icon } from "./Icon";

export interface DateRange {
  startDate: string;
  endDate: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** How long a loan runs when the borrower only picks a collection day. */
export const DEFAULT_LOAN_DAYS = 7;
const MONTHS_AHEAD = 6;

function overlaps(a: string, b: string, booked: readonly DateRange[]) {
  return booked.some((r) => r.startDate <= b && a <= r.endDate);
}

/** The default return day: a week after collection, cut short before the next booking. */
export function defaultEnd(start: string, booked: readonly DateRange[], maxDays: number): string {
  for (let k = Math.min(DEFAULT_LOAN_DAYS, maxDays) - 1; k > 0; k--) {
    const end = addDays(start, k);
    if (!overlaps(start, end, booked)) return end;
  }
  return start;
}

/** The latest return day for a collection day: 30 days, or the day before the next booking. */
export function latestEnd(start: string, booked: readonly DateRange[], maxDays: number): string {
  let end = start;
  for (let k = 1; k < maxDays; k++) {
    const next = addDays(start, k);
    if (overlaps(next, next, booked)) break;
    end = next;
  }
  return end;
}

function label(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function shortLabel(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
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

interface MonthCalendarProps {
  label: string;
  selected: string;
  range: DateRange;
  today: string;
  booked: readonly DateRange[];
  isDisabled: (date: string) => boolean;
  onPick: (date: string) => void;
}

/** One month grid. The other end of the range stays highlighted for context. */
function MonthCalendar({ label: gridLabel, selected, range, today, booked, isDisabled, onPick }: MonthCalendarProps) {
  const [month, setMonth] = useState(selected.slice(0, 7));
  const lastMonth = shiftMonth(today.slice(0, 7), MONTHS_AHEAD);
  return (
    <div className="ll-cal">
      <div className="ll-cal__head">
        <Button variant="ghost" size="sm" icon="chevron-right" className="ll-cal__prev" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, -1))} />
        <p className="ll-cal__month" aria-live="polite">
          {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
        </p>
        <Button variant="ghost" size="sm" icon="chevron-right" aria-label="Next month" disabled={month >= lastMonth} onClick={() => setMonth(shiftMonth(month, 1))} />
      </div>
      <div className="ll-cal__grid" role="group" aria-label={gridLabel}>
        {WEEKDAYS.map((d) => (
          <span key={d} className="ll-cal__dow" aria-hidden="true">
            {d}
          </span>
        ))}
        {monthCells(month).map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const isBooked = overlaps(date, date, booked);
          const edge = date === range.startDate || date === range.endDate;
          return (
            <button
              key={date}
              type="button"
              className={cx(
                "ll-cal__day",
                date > range.startDate && date < range.endDate && "is-range",
                edge && "is-edge",
                date === selected && "is-selected",
                isBooked && "is-booked",
                date === today && "is-today",
              )}
              aria-pressed={date === selected}
              aria-label={`${label(date)}${isBooked ? ", already lent" : ""}`}
              disabled={isDisabled(date)}
              onClick={() => onPick(date)}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Two steps with their own calendar: the collection day, then the return day. Picking a
 * collection day sets the return day a week later (cut short before the next booking) and
 * moves on to the return calendar, where only valid return days can be chosen.
 */
export function DateRangePicker({ value, onChange, today, booked, maxDays }: { value: DateRange; onChange: (range: DateRange) => void; today: string; booked: readonly DateRange[]; maxDays: number }) {
  const [step, setStep] = useState<"collect" | "return">("collect");
  const lastEnd = latestEnd(value.startDate, booked, maxDays);

  const tabs = [
    { id: "collect" as const, title: "Collect on", date: value.startDate },
    { id: "return" as const, title: "Return by", date: value.endDate },
  ];

  return (
    <div className="ll-dates">
      <div className="ll-dates__tabs" role="tablist" aria-label="Borrowing dates">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={step === t.id} className={cx("ll-dates__tab", step === t.id && "is-on")} onClick={() => setStep(t.id)}>
            <span className="ll-dates__title caption">{t.title}</span>
            <span className="ll-dates__value">
              <Icon name="calendar" size={16} />
              {shortLabel(t.date)}
            </span>
          </button>
        ))}
      </div>
      {step === "collect" ? (
        <MonthCalendar
          key="collect"
          label="Collection day"
          selected={value.startDate}
          range={value}
          today={today}
          booked={booked}
          isDisabled={(d) => d < today || overlaps(d, d, booked)}
          onPick={(d) => {
            onChange({ startDate: d, endDate: defaultEnd(d, booked, maxDays) });
            setStep("return");
          }}
        />
      ) : (
        <MonthCalendar
          key="return"
          label="Return day"
          selected={value.endDate}
          range={value}
          today={today}
          booked={booked}
          isDisabled={(d) => d < value.startDate || d > lastEnd}
          onPick={(d) => onChange({ startDate: value.startDate, endDate: d })}
        />
      )}
      <p className="ll-cal__hint caption">
        {step === "collect"
          ? "Pick the day you'll collect it. Crossed-out days are already lent."
          : `Pick the day you'll bring it back, up to ${label(lastEnd)}.`}
      </p>
    </div>
  );
}
