import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { api } from "@/convex/_generated/api";
import { Banner } from "@/components/Banner";
import { EmptyState } from "@/components/EmptyState";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/Skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToolCard } from "@/components/ToolCard";

async function loadTools() {
  // Read at request time: the list changes as neighbours lend and return.
  await connection();
  try {
    return await fetchQuery(api.tools.listPublic, {});
  } catch {
    return null;
  }
}

/** Public landing page. Shows available tools with no owner or action. */
export default function LandingPage() {
  return (
    <main className="ll-landing">
      <div className="ll-landing__head">
        <Logo size="lg" />
        <ThemeToggle compact />
      </div>
      <section className="ll-landing__hero">
        <h1 className="display-xl">Borrow what you need. Lend what you don’t.</h1>
        <p className="body">
          LendLoop is the street’s shared shed. List the drill, ladder or tent sitting in your cupboard, and ask to borrow
          what a neighbour already owns.
        </p>
        <div>
          <Link href="/sign-in" className="ll-btn ll-btn--primary ll-btn--lg">
            <span className="ll-btn__label">Sign in to lend or borrow</span>
          </Link>
        </div>
      </section>
      <section className="ll-section" aria-labelledby="available">
        <div className="ll-section__head">
          <h2 id="available" className="ll-section__title">
            Available on the street now
          </h2>
        </div>
        <Suspense fallback={<Skeleton variant="card" count={3} />}>
          <AvailableTools />
        </Suspense>
      </section>
    </main>
  );
}

async function AvailableTools() {
  const tools = await loadTools();
  return (
    <>
      {tools === null ? (
        <Banner tone="danger" title="Couldn’t load the tool list">
          Refresh the page to try again.
        </Banner>
      ) : tools.length === 0 ? (
        <EmptyState
          icon="wrench"
          title="Nothing listed yet"
          body="A ladder, a drill, a cake tin. Whatever’s sitting in your cupboard is someone’s whole weekend project."
        />
      ) : (
        <div className="ll-grid">
          {tools.map((tool, i) => (
            <ToolCard key={i} tool={tool} status="available" />
          ))}
        </div>
      )}
    </>
  );
}
