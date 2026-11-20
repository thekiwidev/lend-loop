"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequestList } from "@/components/RequestList";
import { TopBar } from "@/components/TopBar";

/** Requests the caller made as a borrower. */
export default function MyRequestsPage() {
  const loans = useQuery(api.loans.myRequests);
  return (
    <>
      <TopBar title="My requests" subtitle="What you’ve asked to borrow" />
      <main className="ll-content">
        <RequestList
          loans={loans}
          direction="outgoing"
          empty={{ title: "You haven’t asked to borrow anything", body: "Find a tool under All tools and pick some dates." }}
        />
      </main>
    </>
  );
}
