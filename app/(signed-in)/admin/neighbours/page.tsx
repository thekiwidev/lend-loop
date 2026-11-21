"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/Avatar";
import { Banner } from "@/components/Banner";
import { PagedTable } from "@/components/PagedTable";
import { TopBar } from "@/components/TopBar";
import { errorMessage } from "@/lib/errors";
import { useLastLoaded, usePages } from "@/lib/usePages";

export default function AdminNeighboursPage() {
  const pages = usePages();
  const data = useLastLoaded(useQuery(api.admin.users, { page: pages.page, pageSize: pages.pageSize }));
  const setTrusted = useMutation(api.admin.setTrustedLender);
  const [error, setError] = useState<string | null>(null);

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
      <TopBar title="Neighbours" subtitle="Everyone who has signed in, and who is a trusted lender" />
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
      </main>
    </>
  );
}
