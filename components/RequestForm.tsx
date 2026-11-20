"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { addDays, todayIso } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { TextField } from "./TextField";

const MAX_DAYS = 30;

/** Date range request. The server checks every rule again; this only helps people get it right first time. */
export function RequestForm({ tool, onClose }: { tool: { _id: Id<"tools">; name: string; owner: { name: string }; until?: string } | null; onClose: () => void }) {
  const request = useMutation(api.loans.request);
  const today = todayIso();
  const firstFree = tool?.until ? addDays(tool.until, 1) : today;
  const [start, setStart] = useState(firstFree);
  const [end, setEnd] = useState(firstFree);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dateError = end < start ? "End date must be on or after the start date." : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!tool || dateError) return;
    setSaving(true);
    setError(null);
    try {
      await request({ toolId: tool._id, startDate: start, endDate: end });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!tool}
      onClose={onClose}
      title={tool ? `Borrow the ${tool.name.toLowerCase()}` : ""}
      description={tool ? `${tool.owner.name} gets an email and can approve or decline.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="request-form" loading={saving} disabled={!!dateError}>
            Request to borrow
          </Button>
        </>
      }
    >
      <form id="request-form" className="ll-form" onSubmit={submit} noValidate>
        {tool?.until ? <Banner tone="info">On loan until {tool.until}. Pick dates after that.</Banner> : null}
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <div className="ll-form__row">
          <TextField type="date" label="From" value={start} min={today} onChange={(e) => setStart(e.target.value)} />
          <TextField type="date" label="Until" value={end} min={start} max={addDays(start, MAX_DAYS - 1)} error={dateError} hint={`Up to ${MAX_DAYS} days.`} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </form>
    </Dialog>
  );
}
