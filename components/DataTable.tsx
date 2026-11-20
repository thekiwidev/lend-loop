import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  render?: (row: Row) => ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
  mono?: boolean;
}

export interface DataTableProps<Row> {
  columns: readonly DataTableColumn<Row>[];
  /** undefined while loading. */
  rows: readonly Row[] | undefined;
  rowKey: (row: Row) => string;
  caption?: string;
  error?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyBody?: string;
  emptyIcon?: string;
  rowClassName?: (row: Row) => string | undefined;
  className?: string;
}

export function DataTable<Row>({ columns, rows, rowKey, caption, error, onRetry, emptyTitle = "Nothing here yet", emptyBody, emptyIcon = "box", rowClassName, className }: DataTableProps<Row>) {
  const full = (child: ReactNode) => (
    <tr className="ll-table__state">
      <td colSpan={columns.length}>{child}</td>
    </tr>
  );
  let body: ReactNode;
  if (error) {
    body = full(
      <Banner tone="danger" title="Couldn’t load this list" action={onRetry ? <Button size="sm" onClick={onRetry}>Try again</Button> : null}>
        Check your connection, then try again.
      </Banner>,
    );
  } else if (rows === undefined) {
    body = [0, 1, 2, 3].map((i) => (
      <tr key={i}>
        {columns.map((c, j) => (
          <td key={c.key}>
            <span className="ll-skel ll-skel--text" style={{ width: `${45 + ((i * 17 + j * 23) % 45)}%` }} />
          </td>
        ))}
      </tr>
    ));
  } else if (!rows.length) {
    body = full(<EmptyState compact icon={emptyIcon} title={emptyTitle} body={emptyBody} />);
  } else {
    body = rows.map((row) => (
      <tr key={rowKey(row)} className={rowClassName?.(row)}>
        {columns.map((c) => (
          <td key={c.key} className={cx(c.align && `ll-al-${c.align}`, c.mono && "ll-mono")}>
            {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
          </td>
        ))}
      </tr>
    ));
  }
  return (
    <div className={cx("ll-tablewrap", className)}>
      <table className="ll-table" aria-busy={rows === undefined || undefined}>
        {caption ? <caption className="ll-sr">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" style={c.width ? { width: c.width } : undefined} className={c.align ? `ll-al-${c.align}` : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
