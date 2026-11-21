"use client";

import { useState } from "react";

/** Page and page-size state for a numbered table; a new page size goes back to page 1. */
export function usePages(initialSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setSize] = useState(initialSize);
  return { page, pageSize, setPage, setPageSize: (size: number) => (setSize(size), setPage(1)) };
}

/** Keeps showing the previous page while the next one loads, instead of flashing a skeleton. */
export function useLastLoaded<T>(value: T | undefined): T | undefined {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return value ?? last;
}
