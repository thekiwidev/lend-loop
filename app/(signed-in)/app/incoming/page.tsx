"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequestList } from "@/components/RequestList";
import { TopBar } from "@/components/TopBar";

/** Requests for the caller's tools: approve, decline, mark returned. */
export default function IncomingPage() {
  const loans = useQuery(api.loans.incoming);
  return (
    <>
      <TopBar title="Incoming requests" subtitle="Neighbours asking to borrow your tools" />
      <main className="ll-content">
        <RequestList
          loans={loans}
          direction="incoming"
          empty={{ title: "No requests yet", body: "When a neighbour asks to borrow one of your tools, it shows up here and you get an email." }}
        />
      </main>
    </>
  );
}
