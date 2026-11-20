"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";

const DELAY_MS = 150;

/** Appears only after 150ms so fast loads never flash a placeholder. */
export function Skeleton({ variant = "text", lines = 3, count = 1, className }: { variant?: "text" | "card"; lines?: number; count?: number; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return <span className="ll-sr">Loading</span>;

  if (variant === "card") {
    return (
      <>
        <span className="ll-sr">Loading</span>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={cx("ll-toolcard ll-skelcard", className)} aria-hidden="true">
            <div className="ll-toolcard__top">
              <span className="ll-skel" style={{ width: 44, height: 44, borderRadius: "var(--radius-md)" }} />
              <span className="ll-skel" style={{ width: 72, height: 24, borderRadius: "var(--radius-pill)" }} />
            </div>
            <span className="ll-skel ll-skel--text" style={{ width: "70%", height: 16 }} />
            <span className="ll-skel ll-skel--text" style={{ width: "45%" }} />
            <span className="ll-skel ll-skel--text" style={{ width: "90%" }} />
            <div className="ll-toolcard__foot">
              <span className="ll-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
              <span className="ll-skel" style={{ width: 84, height: 32, borderRadius: "var(--radius-md)" }} />
            </div>
          </div>
        ))}
      </>
    );
  }
  return (
    <div className={cx("ll-skelstack", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="ll-skel ll-skel--text" style={{ width: `${i === lines - 1 ? 60 : 100 - ((i * 7) % 20)}%` }} />
      ))}
    </div>
  );
}
