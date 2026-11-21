"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PagedTable } from "@/components/PagedTable";
import { StatusBadge } from "@/components/StatusBadge";
import { TopBar } from "@/components/TopBar";
import { CATEGORY } from "@/lib/labels";
import { useLastLoaded, usePages } from "@/lib/usePages";

export default function AdminListingsPage() {
  const pages = usePages();
  const data = useLastLoaded(useQuery(api.admin.tools, { page: pages.page, pageSize: pages.pageSize }));
  return (
    <>
      <TopBar title="All listings" subtitle="Every tool ever listed, including removed ones" />
      <main className="ll-content">
        <PagedTable
          label="All listings"
          data={data}
          rowKey={(r) => r._id}
          emptyTitle="No tools listed yet"
          rowClassName={(r) => (r.removed ? "is-removed" : undefined)}
          onPage={pages.setPage}
          onPageSize={pages.setPageSize}
          columns={[
            { key: "name", header: "Tool" },
            { key: "category", header: "Category", render: (r) => CATEGORY[r.category].label },
            { key: "ownerName", header: "Owner" },
            { key: "removed", header: "Status", render: (r) => <StatusBadge status={r.removed ? "removed" : "available"}>{r.removed ? "Removed" : "Listed"}</StatusBadge> },
          ]}
        />
      </main>
    </>
  );
}
