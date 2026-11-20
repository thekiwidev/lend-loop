import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export type Tone = "neutral" | "pine" | "brass" | "sky" | "clay" | "clay-solid";

export function Badge({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: string; children?: ReactNode; className?: string }) {
  return (
    <span className={cx("ll-badge", `ll-badge--${tone}`, className)}>
      {icon ? <Icon name={icon} size={14} strokeWidth={2} /> : null}
      {children}
    </span>
  );
}
