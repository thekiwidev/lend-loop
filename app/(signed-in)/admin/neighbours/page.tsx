"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ActionMenu } from "@/components/ActionMenu";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { PagedTable } from "@/components/PagedTable";
import { TopBar } from "@/components/TopBar";
import { errorMessage } from "@/lib/errors";
import { useLastLoaded, usePages } from "@/lib/usePages";

export default function AdminNeighboursPage() {
  const pages = usePages();
  const data = useLastLoaded(useQuery(api.admin.users, { page: pages.page, pageSize: pages.pageSize }));
  const setTrust = useMutation(api.admin.setTrust);
  const [error, setError] = useState<string | null>(null);

  async function updateTrust(userId: Id<"users">, change: { lender?: boolean; borrower?: boolean }) {
    setError(null);
    try {
      await setTrust({ userId, ...change });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <TopBar title="Neighbours" subtitle="Everyone who has signed in, and who is trusted to lend or borrow" />
      <main className="ll-content">
        {error ? <Banner tone="danger" onDismiss={() => setError(null)}>{error}</Banner> : null}
        <PagedTable
          label="Neighbours"
          data={data}
          rowKey={(r) => r._id}
          emptyTitle="No neighbours yet"
          emptyIcon="users"
          onPage={pages.setPage}
          onPageSize={pages.setPageSize}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (r) => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={r.name} size="sm" trusted={r.trustedLender} />
                  {r.name}
                </span>
              ),
            },
            {
              key: "trust",
              header: "Trust",
              render: (r) =>
                r.trustedLender || r.trustedBorrower ? (
                  <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
                    {r.trustedLender ? <Badge tone="brass" icon="shield">Trusted lender</Badge> : null}
                    {r.trustedBorrower ? <Badge tone="pine" icon="check">Trusted borrower</Badge> : null}
                  </span>
                ) : (
                  <span className="caption" style={{ color: "var(--ink-muted)" }}>Not yet</span>
                ),
            },
            {
              key: "actions",
              header: <span className="ll-sr">Actions</span>,
              align: "right",
              render: (r) => (
                <ActionMenu
                  label={`Trust options for ${r.name}`}
                  items={[
                    { label: "Trusted lender", checked: r.trustedLender, onToggle: () => updateTrust(r._id, { lender: !r.trustedLender }) },
                    { label: "Trusted borrower", checked: r.trustedBorrower, onToggle: () => updateTrust(r._id, { borrower: !r.trustedBorrower }) },
                  ]}
                />
              ),
            },
          ]}
        />
      </main>
    </>
  );
}
