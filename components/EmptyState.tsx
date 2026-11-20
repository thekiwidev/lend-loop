import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export function EmptyState({ icon = "box", title, body, action, compact, className }: { icon?: string; title: ReactNode; body?: ReactNode; action?: ReactNode; compact?: boolean; className?: string }) {
  return (
    <div className={cx("ll-empty", compact && "is-compact", className)}>
      <span className="ll-empty__icon">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="ll-empty__title">{title}</h3>
      {body ? <p className="ll-empty__body">{body}</p> : null}
      {action ? <div className="ll-empty__action">{action}</div> : null}
    </div>
  );
}
