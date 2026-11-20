import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  section?: string;
  count?: number;
  urgent?: boolean;
}

export function Sidebar({ items, active, user, footer, onNavigate, className }: { items: readonly NavItem[]; active?: string; user?: { name: string; role?: string; trusted?: boolean }; footer?: ReactNode; onNavigate?: () => void; className?: string }) {
  const sections = [...new Set(items.map((i) => i.section ?? ""))];
  return (
    <nav className={cx("ll-sidebar", className)} aria-label="Main">
      <div className="ll-sidebar__brand">
        <Link href="/app" aria-label="LendLoop home">
          <Logo size="md" />
        </Link>
      </div>
      <div className="ll-sidebar__groups">
        {sections.map((section) => (
          <div key={section || "_"} className="ll-sidebar__group">
            {section ? <p className="ll-sidebar__section">{section}</p> : null}
            <ul>
              {items
                .filter((i) => (i.section ?? "") === section)
                .map((item) => {
                  const on = item.id === active;
                  return (
                    <li key={item.id}>
                      <Link href={item.href} title={item.label} className={cx("ll-navitem", on && "is-active")} aria-current={on ? "page" : undefined} onClick={onNavigate}>
                        <Icon name={item.icon} size={18} />
                        <span className="ll-navitem__label">{item.label}</span>
                        {item.count ? <span className={cx("ll-navitem__count", item.urgent && "is-urgent")}>{item.count}</span> : null}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      {footer ?? null}
      {user ? (
        <div className="ll-sidebar__user">
          <Avatar name={user.name} size="sm" trusted={user.trusted} />
          <div className="ll-sidebar__usertext">
            <span className="ll-sidebar__username">{user.name}</span>
            <span className="ll-sidebar__userrole">{user.role ?? "Neighbour"}</span>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
