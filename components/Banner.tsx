import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Button } from "./Button";
import { Icon } from "./Icon";

type Tone = "info" | "success" | "warning" | "danger";
const ICON: Record<Tone, string> = { info: "info", success: "check", warning: "clock", danger: "alert" };

export function Banner({ tone = "info", title, children, action, onDismiss, icon, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode; onDismiss?: () => void; icon?: string; className?: string }) {
  return (
    <div className={cx("ll-banner", `ll-banner--${tone}`, className)} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={icon ?? ICON[tone]} size={18} className="ll-banner__icon" />
      <div className="ll-banner__body">
        {title ? <p className="ll-banner__title">{title}</p> : null}
        {children ? <p className="ll-banner__text">{children}</p> : null}
      </div>
      {action ? <div className="ll-banner__action">{action}</div> : null}
      {onDismiss ? <Button variant="ghost" size="sm" icon="x" aria-label="Dismiss" onClick={onDismiss} /> : null}
    </div>
  );
}
