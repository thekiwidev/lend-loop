"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { ToolCard } from "@/components/ToolCard";
import { ToolForm, type EditableTool } from "@/components/ToolForm";
import { TopBar } from "@/components/TopBar";
import { errorMessage } from "@/lib/errors";

/** The caller's listings: create, edit, remove. */
export default function ListingsPage() {
  const tools = useQuery(api.tools.mine);
  const remove = useMutation(api.tools.remove);
  const [editing, setEditing] = useState<EditableTool | "new" | null>(null);
  const [removing, setRemoving] = useState<EditableTool | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    setError(null);
    try {
      await remove({ toolId: removing._id });
      setRemoving(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar
        title="My listings"
        subtitle="What you lend to the street"
        actions={
          <Button variant="primary" icon="plus" onClick={() => setEditing("new")}>
            List a tool
          </Button>
        }
      />
      <main className="ll-content">
        {tools === undefined ? (
          <div className="ll-grid">
            <Skeleton variant="card" count={3} />
          </div>
        ) : tools.length === 0 ? (
          <EmptyState
            icon="wrench"
            title="You haven’t listed anything yet"
            body="A ladder, a drill, a cake tin. Whatever’s sitting in your cupboard is someone’s whole weekend project."
            action={
              <Button variant="primary" icon="plus" onClick={() => setEditing("new")}>
                List a tool
              </Button>
            }
          />
        ) : (
          <div className="ll-grid">
            {tools.map((tool) => (
              <ToolCard
                key={tool._id}
                tool={tool}
                status={tool.status}
                until={tool.until}
                action={
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    <Button variant="ghost" size="sm" icon="trash" aria-label={`Remove ${tool.name}`} onClick={() => setRemoving(tool)} />
                    <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(tool)}>
                      Edit
                    </Button>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </main>
      {editing ? <ToolForm key={editing === "new" ? "new" : editing._id} open tool={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      <Dialog
        open={!!removing}
        tone="danger"
        onClose={() => {
          setRemoving(null);
          setError(null);
        }}
        title={removing ? `Remove the ${removing.name.toLowerCase()}?` : ""}
        description="Neighbours will no longer see it. Any requests still waiting are cancelled and the borrowers are emailed."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
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
