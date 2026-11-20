import type { ActivityItem } from "@/components/ActivityLine";
import { relativeTime } from "./dates";

type Event = { kind: "request_notification" | "overdue_reminder" | "workflow_error"; status: "sent" | "failed"; at: number };

/** Turns automation events into ActivityLine items ("Reminder sent 2 days ago"). */
export function activityItems(events: readonly Event[], now: number): ActivityItem[] {
  return events.map((e) => ({
    kind: e.status === "failed" ? "failed" : e.kind === "overdue_reminder" ? "reminder" : "sent",
    text:
      e.status === "failed"
        ? e.kind === "overdue_reminder"
          ? "Reminder failed"
          : "Notification failed"
        : e.kind === "overdue_reminder"
          ? "Reminder sent"
          : "Email sent",
    at: relativeTime(e.at, now),
    dateTime: new Date(e.at).toISOString(),
  }));
}
