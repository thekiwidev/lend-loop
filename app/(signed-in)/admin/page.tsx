"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/Avatar";
import { Banner } from "@/components/Banner";
import { DataTable } from "@/components/DataTable";
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
  const loans = useQuery(api.admin.loans);
  const tools = useQuery(api.admin.tools);
  const users = useQuery(api.admin.users);
  const failures = useQuery(api.admin.workflowErrors);
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
          <StatCard label="Tools listed" value={stats?.toolsListed ?? "–"} icon="wrench" />
          <StatCard label="On loan now" value={stats?.onLoan ?? "–"} icon="loop" tone="sky" />
          <StatCard label="Pending requests" value={stats?.pending ?? "–"} icon="clock" tone="brass" />
          <StatCard label="Overdue" value={stats?.overdue ?? "–"} icon="alert" tone="clay" hint={stats?.failedAutomations ? `${stats.failedAutomations} failed automations` : undefined} />
        </div>

        {error ? <Banner tone="danger" onDismiss={() => setError(null)}>{error}</Banner> : null}

        <section className="ll-section" aria-labelledby="loans">
          <h2 id="loans" className="ll-section__title">All loans</h2>
          <DataTable
            caption="All loans"
            rows={loans}
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
        </section>

        <section className="ll-section" aria-labelledby="listings">
          <h2 id="listings" className="ll-section__title">All listings</h2>
          <DataTable
            caption="All listings"
            rows={tools}
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
        </section>

        <section className="ll-section" aria-labelledby="neighbours">
          <h2 id="neighbours" className="ll-section__title">Neighbours</h2>
          <DataTable
            caption="Neighbours"
            rows={users}
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
        </section>

        <section className="ll-section" aria-labelledby="failures">
          <h2 id="failures" className="ll-section__title">Failed automations</h2>
          <DataTable
            caption="Failed automations"
            rows={failures}
            rowKey={(r) => r._id}
            emptyTitle="Nothing has failed"
            emptyIcon="check"
            columns={[
              { key: "kind", header: "Kind", render: (r) => AUTOMATION_LABEL[r.kind] },
              { key: "detail", header: "What happened" },
              { key: "at", header: "When", render: (r) => relativeTime(r.at, now) },
            ]}
          />
        </section>
      </main>
    </>
  );
}
