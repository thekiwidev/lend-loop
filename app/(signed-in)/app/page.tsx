"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { LoadMore, PAGE_SIZE } from "@/components/LoadMore";
import { RequestForm } from "@/components/RequestForm";
import { Skeleton } from "@/components/Skeleton";
import { StatCard } from "@/components/StatCard";
import { ToolCard } from "@/components/ToolCard";
import { ToolForm } from "@/components/ToolForm";
import { TopBar } from "@/components/TopBar";
import { CATEGORIES, CATEGORY } from "@/lib/labels";
import type { Category } from "@/lib/toolIcons";

type Filter = Category | "all";
type Tool = ReturnType<typeof usePaginatedQuery<typeof api.tools.list>>["results"][number];

/** Dashboard: stats, every listed tool with a category filter, and request-to-borrow. */
export default function DashboardPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const tools = usePaginatedQuery(api.tools.list, filter === "all" ? {} : { category: filter }, { initialNumItems: PAGE_SIZE });
  const stats = useQuery(api.loans.dashboardStats);
  const me = useQuery(api.users.me);
  const [requesting, setRequesting] = useState<Tool | null>(null);
  const [listing, setListing] = useState(false);

  const shown = tools.status === "LoadingFirstPage" ? undefined : tools.results;
  const chips = [
    { value: "all" as Filter, label: "All" },
    ...CATEGORIES.map((c) => ({ value: c as Filter, label: CATEGORY[c].label, icon: CATEGORY[c].icon })),
  ];
  const waiting = stats?.waitingOnYou;

  return (
    <>
      <TopBar
        title="All tools"
        subtitle="Everything your neighbours lend"
        actions={
          <Button variant="primary" icon="plus" onClick={() => setListing(true)}>
            List a tool
          </Button>
        }
      />
      <main className="ll-content">
        <div className="ll-stats">
          <StatCard label="Your listings" value={me?.counts.listings ?? "–"} icon="wrench" />
          <StatCard label="On loan now" value={stats?.onLoanNow ?? "–"} icon="loop" tone="sky" hint="Across the street" />
          <StatCard label="Waiting on you" value={waiting ?? "–"} icon="inbox" tone="brass" hint={waiting ? <Link href="/app/incoming">Review requests</Link> : undefined} />
          <StatCard label="Overdue" value={stats?.overdue ?? "–"} icon="alert" tone="clay" hint="Lent or borrowed by you" />
        </div>
        <section className="ll-section" aria-labelledby="shed">
          <div className="ll-section__head">
            <h2 id="shed" className="ll-section__title">
              Neighbourhood shed
            </h2>
            <FilterChips label="Category" options={chips} value={filter} onChange={setFilter} />
          </div>
          {shown === undefined ? (
            <div className="ll-grid">
              <Skeleton variant="card" count={6} />
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={filter === "all" ? "wrench" : CATEGORY[filter].icon}
              title={filter === "all" ? "Nothing listed yet" : `No ${CATEGORY[filter].label.toLowerCase()} yet`}
              body="Be the first on the street to list one."
              action={
                <Button variant="primary" icon="plus" onClick={() => setListing(true)}>
                  List a tool
                </Button>
              }
            />
          ) : (
            <div className="ll-grid">
              {shown.map((tool) => (
                <ToolCard
                  key={tool._id}
                  tool={tool}
                  status={tool.status}
                  until={tool.until}
                  owner={tool.isMine ? { name: "You", meta: "Your listing" } : tool.owner}
                  action={<ToolAction tool={tool} onRequest={() => setRequesting(tool)} />}
                />
              ))}
            </div>
          )}
          <LoadMore query={tools} />
        </section>
      </main>
      {requesting ? <RequestForm key={requesting._id} tool={requesting} onClose={() => setRequesting(null)} /> : null}
      {listing ? <ToolForm open onClose={() => setListing(false)} /> : null}
    </>
  );
}

function ToolAction({ tool, onRequest }: { tool: { _id: Id<"tools">; isMine: boolean; requestPending: boolean }; onRequest: () => void }) {
  if (tool.isMine) {
    return (
      <Link href="/app/listings" className="ll-btn ll-btn--ghost ll-btn--sm">
        <span className="ll-btn__label">Manage</span>
      </Link>
    );
  }
  if (tool.requestPending) {
    return (
      <Link href="/app/requests" className="ll-btn ll-btn--ghost ll-btn--sm">
        <span className="ll-btn__label">Request sent</span>
      </Link>
    );
  }
  return (
    <Button variant="primary" size="sm" onClick={onRequest}>
      Request
    </Button>
  );
}
