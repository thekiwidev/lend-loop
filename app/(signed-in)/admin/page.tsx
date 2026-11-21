"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/Avatar";
import { Banner } from "@/components/Banner";
import { DataTable } from "@/components/DataTable";
import { LoadMore, PAGE_SIZE } from "@/components/LoadMore";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { TopBar } from "@/components/TopBar";
import { relativeTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/useNow";
import { CATEGORY } from "@/lib/labels";

const AUTOMATION_LABEL = { request_notification: "Email", overdue_reminder: "Reminder", workflow_error: "Workflow" } as const;

/** Admin overview. Every query here is refused by Convex for non-admins. */
export default function AdminPage() {
  const stats = useQuery(api.admin.stats);
  const opts = { initialNumItems: PAGE_SIZE };
  const loans = usePaginatedQuery(api.admin.loans, {}, opts);
  const tools = usePaginatedQuery(api.admin.tools, {}, opts);
  const users = usePaginatedQuery(api.admin.users, {}, opts);
  const failures = usePaginatedQuery(api.admin.workflowErrors, {}, opts);
  const rows = <T,>(q: { status: string; results: T[] }) => (q.status === "LoadingFirstPage" ? undefined : q.results);
  const setTrusted = useMutation(api.admin.setTrustedLender);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();

  async function toggleTrusted(userId: Id<"users">, trusted: boolean) {
    setError(null);
    try {
      await setTrusted({ userId, trusted });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <TopBar title="Admin" subtitle="Every loan and listing on the street" />
      <main className="ll-content">
        <div className="ll-stats">
          <StatCard label="On loan now" value={stats?.onLoan ?? "–"} icon="loop" tone="sky" />
          <StatCard label="Pending requests" value={stats?.pending ?? "–"} icon="clock" tone="brass" />
          <StatCard label="Overdue" value={stats?.overdue ?? "–"} icon="alert" tone="clay" />
          <StatCard label="Failed automations" value={stats ? `${stats.failedAutomations}${stats.failedCapped ? "+" : ""}` : "–"} icon="bell" tone={stats?.failedAutomations ? "clay" : "neutral"} />
        </div>

        {error ? <Banner tone="danger" onDismiss={() => setError(null)}>{error}</Banner> : null}

        <section className="ll-section" aria-labelledby="loans">
          <h2 id="loans" className="ll-section__title">All loans</h2>
          <DataTable
            caption="All loans"
            rows={rows(loans)}
            rowKey={(r) => r._id}
            emptyTitle="No loans yet"
            emptyIcon="loop"
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
          <LoadMore query={loans} />
        </section>

        <section className="ll-section" aria-labelledby="listings">
          <h2 id="listings" className="ll-section__title">All listings</h2>
          <DataTable
            caption="All listings"
            rows={rows(tools)}
            rowKey={(r) => r._id}
            emptyTitle="No tools listed yet"
            rowClassName={(r) => (r.removed ? "is-removed" : undefined)}
            columns={[
              { key: "name", header: "Tool" },
              { key: "category", header: "Category", render: (r) => CATEGORY[r.category].label },
              { key: "ownerName", header: "Owner" },
              { key: "removed", header: "Status", render: (r) => <StatusBadge status={r.removed ? "removed" : "available"}>{r.removed ? "Removed" : "Listed"}</StatusBadge> },
            ]}
          />
          <LoadMore query={tools} />
        </section>

        <section className="ll-section" aria-labelledby="neighbours">
          <h2 id="neighbours" className="ll-section__title">Neighbours</h2>
          <DataTable
            caption="Neighbours"
            rows={rows(users)}
            rowKey={(r) => r._id}
            emptyTitle="No neighbours yet"
            emptyIcon="users"
            columns={[
              { key: "name", header: "Name", render: (r) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar name={r.name} size="sm" trusted={r.trustedLender} />{r.name}</span> },
              {
                key: "trustedLender",
                header: "Trusted lender",
                align: "right",
                render: (r) => (
                  <button type="button" role="switch" aria-checked={r.trustedLender} aria-label={`Trusted lender: ${r.name}`} className="ll-switch" onClick={() => toggleTrusted(r._id, !r.trustedLender)}>
                    <span className="ll-switch__track" />
                    {r.trustedLender ? "Trusted" : "Not yet"}
                  </button>
                ),
              },
            ]}
          />
          <LoadMore query={users} />
        </section>

        <section className="ll-section" aria-labelledby="failures">
          <h2 id="failures" className="ll-section__title">Failed automations</h2>
          <DataTable
            caption="Failed automations"
            rows={rows(failures)}
            rowKey={(r) => r._id}
            emptyTitle="Nothing has failed"
            emptyIcon="check"
            columns={[
              { key: "kind", header: "Kind", render: (r) => AUTOMATION_LABEL[r.kind] },
              { key: "detail", header: "What happened" },
              { key: "at", header: "When", render: (r) => relativeTime(r.at, now) },
            ]}
          />
          <LoadMore query={failures} />
        </section>
      </main>
    </>
  );
}
