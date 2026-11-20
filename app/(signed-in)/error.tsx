"use client";

import { ConvexError } from "convex/values";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";

/** Any query that fails on a signed-in page lands here with a way to try again. */
export default function SignedInError({ error, reset }: { error: Error; reset: () => void }) {
  const message = error instanceof ConvexError && typeof error.data === "string" ? error.data : "Check your connection, then try again.";
  return (
    <main className="ll-content">
      <Banner
        tone="danger"
        title="Couldn’t load this page"
        action={
          <Button size="sm" onClick={reset}>
            Try again
          </Button>
        }
      >
        {message}
      </Banner>
    </main>
  );
}
