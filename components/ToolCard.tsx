import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { CATEGORY, CONDITION, type Condition } from "@/lib/labels";
import type { Category } from "@/lib/toolIcons";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { StatusBadge, type ToolStatus } from "./StatusBadge";

export interface ToolCardProps {
  tool: { name: string; category: Category; icon?: string; condition?: Condition; description?: string };
  status?: ToolStatus;
  owner?: { name: string; trusted?: boolean; meta?: string };
  /** ISO end date of the current loan, shown when status is on_loan. */
  until?: string;
  action?: ReactNode;
  className?: string;
}

export function ToolCard({ tool, status, owner, until, action, className }: ToolCardProps) {
  const category = CATEGORY[tool.category] ?? CATEGORY.other;
  return (
    <article className={cx("ll-toolcard", status === "removed" && "is-removed", className)}>
      <div className="ll-toolcard__top">
        <span className="ll-cattile" title={category.label}>
          <Icon name={tool.icon ?? category.icon} size={22} />
        </span>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      <h3 className="ll-toolcard__name">{tool.name}</h3>
      <p className="ll-toolcard__meta">
        {category.label}
        {tool.condition ? (
          <>
            <span className="ll-dot" aria-hidden="true" />
            {CONDITION[tool.condition]} condition
          </>
        ) : null}
      </p>
      {tool.description ? <p className="ll-toolcard__desc">{tool.description}</p> : null}
      {until ? (
        <p className="ll-toolcard__note">
          <Icon name="calendar" size={14} />
          On loan until <span className="ll-mono">{until}</span>
        </p>
      ) : null}
      <div className="ll-toolcard__spacer" />
      {owner || action ? (
        <div className="ll-toolcard__foot">
          {owner ? (
            <div className="ll-owner">
              <Avatar name={owner.name} size="sm" trusted={owner.trusted} />
              <div className="ll-owner__text">
                <span className="ll-owner__name">{owner.name}</span>
                {owner.trusted ? (
                  <span className="ll-owner__trust">
                    <Icon name="shield" size={13} />
                    Trusted lender
                  </span>
                ) : (
                  <span className="ll-owner__sub">{owner.meta ?? "Neighbour"}</span>
                )}
              </div>
            </div>
          ) : (
            <span />
          )}
          {action ?? null}
        </div>
      ) : null}
    </article>
  );
}
