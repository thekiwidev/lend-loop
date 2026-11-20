"use client";

import { useEffect, useState } from "react";

/** Current time, refreshed every minute, so "2 min ago" stays honest without impure renders. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
