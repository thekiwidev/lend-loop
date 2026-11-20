"use client";

import { useSyncExternalStore } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

export const THEME_STORAGE_KEY = "lendloop-theme";
const CHANGE_EVENT = "lendloop-theme-change";
type Preference = "light" | "dark" | "system";

function readPreference(): Preference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function systemTheme(): "light" | "dark" {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyPreference(preference: Preference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
  document.documentElement.setAttribute("data-theme", preference === "system" ? systemTheme() : preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  // "System" follows the OS live, not only at page load.
  const onSystemChange = () => {
    if (readPreference() === "system") document.documentElement.setAttribute("data-theme", systemTheme());
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const OPTIONS: { value: Preference; icon: string; label: string }[] = [
  { value: "light", icon: "sun", label: "Light" },
  { value: "dark", icon: "moon", label: "Dark" },
  { value: "system", icon: "monitor", label: "System" },
];

export function ThemeToggle({ compact, className }: { compact?: boolean; className?: string }) {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as Preference);
  return (
    <div className={cx("ll-seg", className)} role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map((o) => {
        const on = preference === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={compact ? o.label : undefined}
            className={cx("ll-seg__btn", on && "is-on")}
            onClick={() => applyPreference(o.value)}
          >
            <Icon name={o.icon} size={16} />
            {compact ? <span className="ll-sr">{o.label}</span> : o.label}
          </button>
        );
      })}
    </div>
  );
}
