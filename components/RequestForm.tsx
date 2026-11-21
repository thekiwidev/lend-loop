"use client";

import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { addDays, todayIso } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { DateRangePicker, defaultEnd, type DateRange } from "./DateRangePicker";
import { Dialog } from "./Dialog";
import { Skeleton } from "./Skeleton";

const MAX_DAYS = 30;

function days(range: DateRange) {
  return Math.round((Date.parse(range.endDate) - Date.parse(range.startDate)) / 86_400_000) + 1;
}

/** Date range request. The server checks every rule again; this only helps people get it right first time. */
export function RequestForm({ tool, onClose }: { tool: { _id: Id<"tools">; name: string; owner: { name: string }; until?: string } | null; onClose: () => void }) {
  const request = useMutation(api.loans.request);
  const booked = useQuery(api.loans.booked, tool ? { toolId: tool._id } : "skip");

  return (
    <Dialog
      open={!!tool}
      onClose={onClose}
      title={tool ? `Borrow the ${tool.name.toLowerCase()}` : ""}
      description={tool ? `${tool.owner.name} gets an email and can approve or decline.` : undefined}
    >
      {tool && booked ? <RangeForm tool={tool} booked={booked} request={request} onClose={onClose} /> : <Skeleton lines={6} />}
    </Dialog>
  );
}

function RangeForm({
  tool,
  booked,
  request,
  onClose,
}: {
  tool: { _id: Id<"tools">; until?: string };
  booked: DateRange[];
  request: (args: { toolId: Id<"tools">; startDate: string; endDate: string }) => Promise<unknown>;
  onClose: () => void;
}) {
  const today = todayIso();
  const firstFree = tool.until && tool.until >= today ? addDays(tool.until, 1) : today;
  const [range, setRange] = useState<DateRange>({ startDate: firstFree, endDate: defaultEnd(firstFree, booked, MAX_DAYS) });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await request({ toolId: tool._id, ...range });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const n = days(range);
  return (
    <form className="ll-form" onSubmit={submit} noValidate>
      {booked.length ? <Banner tone="info">Crossed-out days are already lent. Loans run up to {MAX_DAYS} days.</Banner> : null}
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <DateRangePicker value={range} onChange={setRange} today={today} booked={booked} maxDays={MAX_DAYS} />
      <p className="ll-range label">
        <span className="ll-mono">{range.startDate}</span>
        <span aria-hidden="true">→</span>
        <span className="ll-sr"> to </span>
        <span className="ll-mono">{range.endDate}</span>
        <span className="caption">{n === 1 ? "1 day" : `${n} days`}</span>
      </p>
      <div className="ll-dialog__foot" style={{ padding: 0, border: 0 }}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={saving}>
          Request to borrow
        </Button>
      </div>
    </form>
  );
}
