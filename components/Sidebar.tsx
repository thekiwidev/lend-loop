"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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

export interface UserAction {
  label: string;
  icon: string;
  onClick: () => void;
}

export interface SidebarProps {
  items: readonly NavItem[];
  active?: string;
  user?: { name: string; email?: string; role?: string; trusted?: boolean };
  /** Shown in a menu when the user block is clicked (manage account, sign out). */
  userActions?: readonly UserAction[];
  footer?: ReactNode;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ items, active, user, userActions, footer, onNavigate, className }: SidebarProps) {
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
      {user ? <UserBlock user={user} actions={userActions ?? []} /> : null}
    </nav>
  );
}

function UserBlock({ user, actions }: { user: NonNullable<SidebarProps["user"]>; actions: readonly UserAction[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="ll-account" ref={root}>
      {open ? (
        <div id={menuId} className="ll-account__menu" role="menu">
          <p className="ll-account__role caption">{user.role ?? "Neighbour"}</p>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              className="ll-account__item"
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
            >
              <Icon name={a.icon} size={16} />
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" className="ll-sidebar__user ll-account__trigger" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((o) => !o)}>
        <Avatar name={user.name} size="sm" trusted={user.trusted} />
        <span className="ll-sidebar__usertext">
          <span className="ll-sidebar__username">{user.name}</span>
          <span className="ll-sidebar__userrole">{user.email || user.role || "Neighbour"}</span>
        </span>
        <Icon name="chevron-down" size={16} className="ll-account__chev" />
      </button>
    </div>
  );
}
