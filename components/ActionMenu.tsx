"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Icon } from "./Icon";

export type ActionMenuItem = { label: string; checked: boolean; onToggle: () => void };

/** "•••" button that opens a small menu of on/off options. Each option toggles on its own. */
export function ActionMenu({ label, items }: { label: string; items: readonly ActionMenuItem[] }) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const open = position !== null;
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setPosition(null);
    };
    // Fixed position goes stale when anything scrolls, so close instead of following.
    const dismiss = () => setPosition(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  // Fixed, not absolute: tables scroll horizontally, which would clip an absolute menu.
  function toggle() {
    if (open || !trigger.current) return setPosition(null);
    const r = trigger.current.getBoundingClientRect();
    const right = window.innerWidth - r.right;
    const below = window.innerHeight - r.bottom > 120;
    setPosition(below ? { top: r.bottom + 4, right } : { bottom: window.innerHeight - r.top + 4, right });
  }

  return (
    <div className="ll-actionmenu" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="ll-actionmenu__trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
      >
        <Icon name="more" size={18} strokeWidth={3} />
      </button>
      {open ? (
        <div id={menuId} className="ll-actionmenu__menu" role="menu" style={position ?? undefined}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitemcheckbox"
              aria-checked={item.checked}
              className="ll-account__item"
              onClick={() => {
                setPosition(null);
                item.onToggle();
              }}
            >
              <span className="ll-actionmenu__check">{item.checked ? <Icon name="check" size={16} strokeWidth={2} /> : null}</span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
