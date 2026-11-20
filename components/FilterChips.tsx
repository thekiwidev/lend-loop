"use client";

import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export interface FilterChipOption<V extends string> {
  value: V;
  label: string;
  icon?: string;
  count?: number;
}

export function FilterChips<V extends string>({
  options,
  value,
  onChange,
  label = "Filter",
  className,
}: {
  options: readonly FilterChipOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cx("ll-chips", className)} role="group" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" className={cx("ll-chip", on && "is-on")} aria-pressed={on} onClick={() => onChange(o.value)}>
            {o.icon ? <Icon name={o.icon} size={16} /> : null}
            {o.label}
            {o.count != null ? <span className="ll-chip__count">{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
