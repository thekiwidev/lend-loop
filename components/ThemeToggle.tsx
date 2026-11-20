"use client";

import { useSyncExternalStore } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export const THEME_STORAGE_KEY = "lendloop-theme";
type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
}

const OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: "light", icon: "sun", label: "Light" },
  { value: "dark", icon: "moon", label: "Dark" },
];

export function ThemeToggle({ compact, className }: { compact?: boolean; className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  return (
    <div className={cx("ll-seg", className)} role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map((o) => {
        const on = theme === o.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} className={cx("ll-seg__btn", on && "is-on")} onClick={() => applyTheme(o.value)}>
            <Icon name={o.icon} size={16} />
            {compact ? <span className="ll-sr">{o.label}</span> : o.label}
          </button>
        );
      })}
    </div>
  );
}
