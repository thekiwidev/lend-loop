"use client";

import { DataTable, type DataTableColumn } from "./DataTable";
import { Pagination } from "./Pagination";

export interface Paged<Row> {
  rows: Row[];
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

/** A DataTable fed one numbered page at a time, with the page controls under it. */
export function PagedTable<Row>({
  data,
  label,
  columns,
  rowKey,
  emptyTitle,
  emptyIcon,
  rowClassName,
  onPage,
  onPageSize,
}: {
  data: Paged<Row> | undefined;
  label: string;
  columns: readonly DataTableColumn<Row>[];
  rowKey: (row: Row) => string;
  emptyTitle: string;
  emptyIcon?: string;
  rowClassName?: (row: Row) => string | undefined;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <section className="ll-section">
      <DataTable caption={label} rows={data?.rows} rowKey={rowKey} columns={columns} emptyTitle={emptyTitle} emptyIcon={emptyIcon} rowClassName={rowClassName} />
      {data ? <Pagination label={label} page={data.page} pageCount={data.pageCount} pageSize={data.pageSize} total={data.total} onPage={onPage} onPageSize={onPageSize} /> : null}
    </section>
  );
}
