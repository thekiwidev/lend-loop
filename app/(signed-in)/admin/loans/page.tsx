"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PagedTable } from "@/components/PagedTable";
import { StatusBadge } from "@/components/StatusBadge";
import { TopBar } from "@/components/TopBar";
import { relativeTime } from "@/lib/dates";
import { useLastLoaded, usePages } from "@/lib/usePages";
import { useNow } from "@/lib/useNow";

const AUTOMATION_LABEL = { request_notification: "Email", overdue_reminder: "Reminder", workflow_error: "Workflow" } as const;

export default function AdminLoansPage() {
  const pages = usePages();
  const data = useLastLoaded(useQuery(api.admin.loans, { page: pages.page, pageSize: pages.pageSize }));
  const now = useNow();
  return (
    <>
      <TopBar title="All loans" subtitle="Every request on the street, newest first" />
      <main className="ll-content">
        <PagedTable
          label="All loans"
          data={data}
          rowKey={(r) => r._id}
          emptyTitle="No loans yet"
          emptyIcon="loop"
          onPage={pages.setPage}
          onPageSize={pages.setPageSize}
          columns={[
            { key: "toolName", header: "Tool" },
            { key: "ownerName", header: "Owner" },
            { key: "borrowerName", header: "Borrower" },
            { key: "startDate", header: "From", mono: true },
            { key: "endDate", header: "Until", mono: true },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            {
              key: "lastAutomation",
              header: "Last automation",
              render: (r) =>
                r.lastAutomation ? (
                  <span className={r.lastAutomation.status === "failed" ? "text-clay-ink" : undefined}>
                    {AUTOMATION_LABEL[r.lastAutomation.kind]} {r.lastAutomation.status}, {relativeTime(r.lastAutomation.at, now)}
                  </span>
                ) : (
                  <span className="text-ink-subtle">None</span>
                ),
            },
          ]}
        />
      </main>
    </>
  );
}
