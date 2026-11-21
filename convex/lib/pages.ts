import { v } from "convex/values";

// Numbered pages, newest first. The aggregate count gives the total and, through `at`,
// the _creationTime where any page starts, so a page reads only its own rows.

export const pageArgs = { page: v.number(), pageSize: v.number() };
export const MAX_PAGE_SIZE = 100;

export interface PageWindow {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
  /** Ascending index of the newest row on this page; null when there are no rows. */
  topIndex: number | null;
}

export function pageWindow(total: number, page: number, pageSize: number): PageWindow {
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize) || 1));
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(pageCount, Math.max(1, Math.floor(page) || 1));
  const offset = (current - 1) * size;
  return { page: current, pageSize: size, pageCount, total, topIndex: total === 0 ? null : total - 1 - offset };
}
