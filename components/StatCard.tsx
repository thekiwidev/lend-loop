import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export function StatCard({ label, value, icon, tone = "neutral", hint, className }: { label: string; value: ReactNode; icon?: string; tone?: "neutral" | "pine" | "brass" | "sky" | "clay"; hint?: ReactNode; className?: string }) {
  return (
    <div className={cx("ll-stat", className)}>
      <div className="ll-stat__top">
        <span className="ll-stat__label">{label}</span>
        {icon ? (
          <span className={`ll-stat__icon ll-stat__icon--${tone}`}>
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <div className="ll-stat__value">{value}</div>
      {hint ? <div className="ll-stat__hint">{hint}</div> : null}
    </div>
  );
}
