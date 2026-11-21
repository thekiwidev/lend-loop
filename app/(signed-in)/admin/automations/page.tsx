"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PagedTable } from "@/components/PagedTable";
import { TopBar } from "@/components/TopBar";
import { relativeTime } from "@/lib/dates";
import { useLastLoaded, usePages } from "@/lib/usePages";
import { useNow } from "@/lib/useNow";

const KIND_LABEL = { request_notification: "Email", overdue_reminder: "Reminder", workflow_error: "Workflow" } as const;

export default function AdminAutomationsPage() {
  const pages = usePages();
  const data = useLastLoaded(useQuery(api.admin.workflowErrors, { page: pages.page, pageSize: pages.pageSize }));
  const now = useNow();
  return (
    <>
      <TopBar title="Failed automations" subtitle="Emails and workflows that did not go through" />
      <main className="ll-content">
        <PagedTable
          label="Failed automations"
          data={data}
          rowKey={(r) => r._id}
          emptyTitle="Nothing has failed"
          emptyIcon="check"
          onPage={pages.setPage}
          onPageSize={pages.setPageSize}
          columns={[
            { key: "kind", header: "Kind", render: (r) => KIND_LABEL[r.kind] },
            { key: "detail", header: "What happened" },
            { key: "at", header: "When", render: (r) => relativeTime(r.at, now) },
          ]}
        />
      </main>
    </>
  );
}
