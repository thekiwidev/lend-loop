"use client";

import { RequestList } from "@/components/RequestList";
import { TopBar } from "@/components/TopBar";

/** Requests the caller made as a borrower. */
export default function MyRequestsPage() {
  return (
    <>
      <TopBar title="My requests" subtitle="What you’ve asked to borrow" />
      <main className="ll-content">
        <RequestList
          direction="outgoing"
          empty={{ title: "You haven’t asked to borrow anything", body: "Find a tool under All tools and pick some dates." }}
        />
      </main>
    </>
  );
}
