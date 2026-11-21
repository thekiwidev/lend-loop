"use client";

import { RequestList } from "@/components/RequestList";
import { TopBar } from "@/components/TopBar";

/** Requests for the caller's tools: approve, decline, mark returned. */
export default function IncomingPage() {
  return (
    <>
      <TopBar title="Incoming requests" subtitle="Neighbours asking to borrow your tools" />
      <main className="ll-content">
        <RequestList
          direction="incoming"
          empty={{ title: "No requests yet", body: "When a neighbour asks to borrow one of your tools, it shows up here and you get an email." }}
        />
      </main>
    </>
  );
}
