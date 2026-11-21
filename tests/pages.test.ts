import { describe, expect, it } from "vitest";
import { pageWindow } from "../convex/lib/pages";
import { pageNumbers } from "../components/Pagination";

describe("pageWindow", () => {
  it("finds the newest row of each page", () => {
    expect(pageWindow(57, 1, 25)).toMatchObject({ page: 1, pageCount: 3, topIndex: 56 });
    expect(pageWindow(57, 3, 25)).toMatchObject({ page: 3, topIndex: 6 });
  });

  it("clamps the page and page size", () => {
    expect(pageWindow(57, 9, 25).page).toBe(3);
    expect(pageWindow(57, 0, 25).page).toBe(1);
    expect(pageWindow(57, 1, 500).pageSize).toBe(100);
    expect(pageWindow(0, 1, 25)).toMatchObject({ pageCount: 1, topIndex: null });
  });
});

describe("pageNumbers", () => {
  it("shows first, last and two either side with gaps", () => {
    expect(pageNumbers(6, 12)).toEqual([1, "gap", 4, 5, 6, 7, 8, "gap", 12]);
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
  });
});
