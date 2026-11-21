"use client";

import { useId, useState } from "react";
import { Button } from "./Button";
import { cx } from "@/lib/cx";

export const PAGE_SIZES = [10, 25, 50, 100] as const;

/** Page numbers to show: first, last, and two either side of the current page, with gaps. */
export function pageNumbers(page: number, pageCount: number): (number | "gap")[] {
  const wanted = new Set([1, pageCount, page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...wanted].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? (["gap", p] as const) : ([p] as const)));
}

export interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  label: string;
}

/** "Showing 26–50 of 132", rows per page, numbered pages and a jump-to-page box. */
export function Pagination({ page, pageCount, pageSize, total, onPage, onPageSize, label }: PaginationProps) {
  const sizeId = useId();
  const jumpId = useId();
  const [jump, setJump] = useState("");
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <nav className="ll-pager" aria-label={`${label} pages`}>
      <p className="ll-pager__summary body-sm">
        {total === 0 ? "Nothing yet" : <>Showing <span className="ll-mono">{first}–{last}</span> of <span className="ll-mono">{total}</span></>}
      </p>
      <div className="ll-pager__size">
        <label htmlFor={sizeId} className="caption">Rows per page</label>
        <select id={sizeId} className="ll-select ll-pager__select" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="ll-pager__pages">
        <Button variant="ghost" size="sm" icon="chevron-right" className="ll-pager__prev" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} />
        {pageNumbers(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="ll-pager__gap" aria-hidden="true">…</span>
          ) : (
            <button key={p} type="button" className={cx("ll-pager__num", p === page && "is-on")} aria-current={p === page ? "page" : undefined} aria-label={`Page ${p}`} onClick={() => onPage(p)}>
              {p}
            </button>
          ),
        )}
        <Button variant="ghost" size="sm" icon="chevron-right" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPage(page + 1)} />
      </div>
      <form
        className="ll-pager__jump"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(jump);
          if (Number.isInteger(n) && n >= 1 && n <= pageCount) onPage(n);
          setJump("");
        }}
      >
        <label htmlFor={jumpId} className="caption">Go to page</label>
        <input id={jumpId} className="ll-input ll-pager__input" type="number" min={1} max={pageCount} inputMode="numeric" value={jump} placeholder={`1–${pageCount}`} onChange={(e) => setJump(e.target.value)} />
        <Button size="sm" type="submit">Go</Button>
      </form>
    </nav>
  );
}
