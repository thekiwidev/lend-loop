"use client";

import { useMutation, usePaginatedQuery, type ReactMutation } from "convex/react";
import type { FunctionReference } from "convex/server";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { activityItems } from "@/lib/activity";
import { errorMessage } from "@/lib/errors";
import { useNow } from "@/lib/useNow";
import type { Category } from "@/lib/toolIcons";
import { Banner } from "./Banner";
import { EmptyState } from "./EmptyState";
import { FilterChips } from "./FilterChips";
import { LoadMore, PAGE_SIZE } from "./LoadMore";
import { RequestCard, type RequestCardProps } from "./RequestCard";
import { Skeleton } from "./Skeleton";
import type { LoanStatus } from "./StatusBadge";

export interface LoanCard {
  _id: Id<"loans">;
  tool: { name: string; category: Category; icon: string };
  person: string;
  personTrustedBorrower: boolean;
  status: LoanStatus;
  startDate: string;
  endDate: string;
  days: number;
  activity: { kind: "request_notification" | "overdue_reminder" | "workflow_error"; status: "sent" | "failed"; at: number }[];
}

type Filter = "all" | "pending" | "active" | "closed";
type Action = NonNullable<RequestCardProps["busy"]>;
type LoanMutation = ReactMutation<FunctionReference<"mutation", "public", { loanId: Id<"loans"> }, null>>;

/** Stack of request cards with a status filter, shared by incoming and my requests. Filtered and paged on the server. */
export function RequestList({ direction, empty }: { direction: "incoming" | "outgoing"; empty: { title: string; body: string } }) {
  const [filter, setFilter] = useState<Filter>("all");
  const paged = usePaginatedQuery(direction === "incoming" ? api.loans.incoming : api.loans.myRequests, { filter }, { initialNumItems: PAGE_SIZE });
  const loans: LoanCard[] | undefined = paged.status === "LoadingFirstPage" ? undefined : paged.results;
  const [busy, setBusy] = useState<{ id: Id<"loans">; action: Action } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const cancel = useMutation(api.loans.cancel);
  const markReturned = useMutation(api.loans.markReturned);
  const now = useNow();

  async function run(id: Id<"loans">, action: Action, mutation: LoanMutation) {
    setBusy({ id, action });
    setError(null);
    try {
      await mutation({ loanId: id });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const options = [
    { value: "all" as Filter, label: "All" },
    { value: "pending" as Filter, label: "Pending" },
    { value: "active" as Filter, label: direction === "incoming" ? "Lent out" : "Borrowed" },
    { value: "closed" as Filter, label: "Closed" },
  ];
  const shown = loans;

  return (
    <section className="ll-section">
      <div className="ll-section__head">
        <FilterChips label="Status" options={options} value={filter} onChange={setFilter} />
      </div>
      {error ? <Banner tone="danger" onDismiss={() => setError(null)}>{error}</Banner> : null}
      {shown === undefined ? (
        <Skeleton lines={5} />
      ) : shown.length === 0 ? (
        <EmptyState icon={direction === "incoming" ? "inbox" : "send"} title={filter === "all" ? empty.title : "Nothing with this status"} body={filter === "all" ? empty.body : undefined} />
      ) : (
        <div className="ll-stack">
          {shown.map((loan) => (
            <RequestCard
              key={loan._id}
              direction={direction}
              tool={loan.tool}
              person={loan.person}
              trustedBorrower={loan.personTrustedBorrower}
              status={loan.status}
              start={loan.startDate}
              end={loan.endDate}
              days={loan.days}
              activity={activityItems(loan.activity, now)}
              busy={busy?.id === loan._id ? busy.action : null}
              onApprove={() => run(loan._id, "approve", approve)}
              onDecline={() => run(loan._id, "decline", decline)}
              onCancel={() => run(loan._id, "cancel", cancel)}
              onReturn={() => run(loan._id, "return", markReturned)}
            />
          ))}
        </div>
      )}
      <LoadMore query={paged} />
    </section>
  );
}
