"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Button } from "./Button";

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  tone?: "default" | "danger";
  className?: string;
}

/** Closes on Escape and backdrop click; focus moves into the dialog and back when it closes. */
export function Dialog({ open, title, description, children, footer, onClose, tone = "default", className }: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("input, select, textarea, button:not([aria-label='Close'])");
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ll-dialog-layer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        tabIndex={-1}
        className={cx("ll-dialog", className)}
        role={tone === "danger" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <div className="ll-dialog__head">
          <div>
            <h2 id={titleId} className="ll-dialog__title">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="ll-dialog__desc">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" icon="x" aria-label="Close" onClick={onClose} />
        </div>
        {children ? <div className="ll-dialog__body">{children}</div> : null}
        {footer ? <div className="ll-dialog__foot">{footer}</div> : null}
      </div>
    </div>
  );
}
