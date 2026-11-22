"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { PagedTable } from "@/components/PagedTable";
import { StatusBadge } from "@/components/StatusBadge";
import { TopBar } from "@/components/TopBar";
import { CATEGORY } from "@/lib/labels";
import { errorMessage } from "@/lib/errors";
import { useLastLoaded, usePages } from "@/lib/usePages";

type Removing = { _id: Id<"tools">; name: string; ownerName: string };

export default function AdminListingsPage() {
  const pages = usePages();
  const data = useLastLoaded(useQuery(api.admin.tools, { page: pages.page, pageSize: pages.pageSize }));
  const removeTool = useMutation(api.admin.removeTool);
  const [removing, setRemoving] = useState<Removing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setRemoving(null);
    setError(null);
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    setError(null);
    try {
      await removeTool({ toolId: removing._id });
      setRemoving(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

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
            {
              key: "actions",
              header: <span className="ll-sr">Actions</span>,
              align: "right",
              render: (r) =>
                r.removed ? null : (
                  <Button variant="ghost" size="sm" icon="trash" aria-label={`Remove ${r.name}`} onClick={() => setRemoving(r)}>
                    Remove
                  </Button>
                ),
            },
          ]}
        />
      </main>
      <Dialog
        open={!!removing}
        tone="danger"
        onClose={close}
        title={removing ? `Remove ${removing.ownerName}'s ${removing.name.toLowerCase()}?` : ""}
        description="Neighbours will no longer see it. Any requests still waiting are cancelled and the borrowers are emailed. A listing with an approved loan can't be removed until it is returned."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Keep listing
            </Button>
            <Button variant="danger" icon="trash" loading={busy} onClick={confirmRemove}>
              Remove listing
            </Button>
          </>
        }
      >
        {error ? <Banner tone="danger">{error}</Banner> : null}
      </Dialog>
    </>
  );
}
