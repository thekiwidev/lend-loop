"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Button } from "./Button";
import { useNavDrawer } from "./AppShell";

/** Page header inside the app shell. The menu button opens the sidebar drawer on mobile. */
export function TopBar({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  const drawer = useNavDrawer();
  return (
    <header className={cx("ll-topbar", className)}>
      <Button variant="ghost" icon="menu" className="ll-topbar__menu" aria-label="Open menu" aria-expanded={drawer.open} onClick={drawer.toggle} />
      <div className="ll-topbar__titles">
        <h1 className="ll-topbar__title">{title}</h1>
        {subtitle ? <p className="ll-topbar__sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="ll-topbar__actions">{actions}</div> : null}
    </header>
  );
}
