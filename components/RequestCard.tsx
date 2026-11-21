import { cx } from "@/lib/cx";
import { CATEGORY } from "@/lib/labels";
import type { Category } from "@/lib/toolIcons";
import { ActivityLine, type ActivityItem } from "./ActivityLine";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { StatusBadge, type LoanStatus } from "./StatusBadge";

export interface RequestCardProps {
  tool: { name: string; category: Category; icon?: string };
  person: string;
  /** Incoming only: the requester is marked a trusted borrower. */
  trustedBorrower?: boolean;
  direction?: "incoming" | "outgoing";
  status: LoanStatus;
  start: string;
  end: string;
  days?: number;
  activity?: readonly ActivityItem[];
  /** The action in flight, so its button can show a spinner. */
  busy?: "approve" | "decline" | "cancel" | "return" | null;
  onApprove?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onReturn?: () => void;
  className?: string;
}

/** Offers only the actions the loan's state allows. */
export function RequestCard({ tool, person, trustedBorrower, direction = "incoming", status, start, end, days, activity, busy, onApprove, onDecline, onCancel, onReturn, className }: RequestCardProps) {
  const category = CATEGORY[tool.category] ?? CATEGORY.other;
  const incoming = direction === "incoming";
  const disabled = !!busy;
  return (
    <article className={cx("ll-request", `ll-request--${status}`, className)}>
      <span className="ll-cattile ll-cattile--sm" title={category.label}>
        <Icon name={tool.icon ?? category.icon} size={18} />
      </span>
      <div className="ll-request__body">
        <div className="ll-request__head">
          <h3 className="ll-request__title">{tool.name}</h3>
          <StatusBadge status={status} />
        </div>
        <p className="ll-request__who">
          {incoming ? (
            <>
              <strong>{person}</strong> wants to borrow this
              {trustedBorrower ? (
                <>
                  {" "}
                  <Badge tone="pine" icon="check">Trusted borrower</Badge>
                </>
              ) : null}
            </>
          ) : (
            <>
              Lent by <strong>{person}</strong>
            </>
          )}
        </p>
        <p className="ll-request__dates">
          <Icon name="calendar" size={14} />
          <span className="ll-mono">{start}</span>
          <span aria-hidden="true">→</span>
          <span className="ll-sr"> to </span>
          <span className="ll-mono">{end}</span>
          {days ? <span className="ll-request__days">{days === 1 ? "1 day" : `${days} days`}</span> : null}
        </p>
        {!incoming && (status === "approved" || status === "overdue") ? (
          // Explain over disable: only the owner can confirm they have it back.
          <p className="ll-request__note">Hand it back to {person.split(" ")[0]}; they mark it returned.</p>
        ) : null}
        {activity && activity.length ? <ActivityLine items={activity} compact /> : null}
      </div>
      {status === "pending" && incoming ? (
        <div className="ll-request__actions">
          <Button variant="ghost" size="sm" onClick={onDecline} loading={busy === "decline"} disabled={disabled}>
            Decline
          </Button>
          <Button variant="primary" size="sm" icon="check" onClick={onApprove} loading={busy === "approve"} disabled={disabled}>
            Approve
          </Button>
        </div>
      ) : null}
      {status === "pending" && !incoming ? (
        <div className="ll-request__actions">
          <Button variant="ghost" size="sm" onClick={onCancel} loading={busy === "cancel"} disabled={disabled}>
            Cancel request
          </Button>
        </div>
      ) : null}
      {(status === "approved" || status === "overdue") && incoming ? (
        <div className="ll-request__actions">
          <Button size="sm" icon="loop" onClick={onReturn} loading={busy === "return"} disabled={disabled}>
            Mark returned
          </Button>
        </div>
      ) : null}
    </article>
  );
}
