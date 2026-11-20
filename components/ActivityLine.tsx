import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export type ActivityKind = "info" | "sent" | "reminder" | "failed" | "returned";

export interface ActivityItem {
  kind?: ActivityKind;
  text: ReactNode;
  at?: string;
  dateTime?: string;
}

const ICON: Record<ActivityKind, string> = { sent: "mail", reminder: "bell", failed: "alert", info: "clock", returned: "loop" };

export function ActivityLine({ items, compact, label = "Activity", className }: { items: readonly ActivityItem[]; compact?: boolean; label?: string; className?: string }) {
  return (
    <ul className={cx("ll-activity", compact && "is-compact", className)} aria-label={label}>
      {items.map((item, i) => {
        const kind = item.kind ?? "info";
        return (
          <li key={i} className={`ll-activity__item ll-activity__item--${kind}`}>
            <span className="ll-activity__icon">
              <Icon name={ICON[kind]} size={13} strokeWidth={2} />
            </span>
            <span className="ll-activity__text">{item.text}</span>
            {item.at ? (
              <time className="ll-activity__at" dateTime={item.dateTime}>
                {item.at}
              </time>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
