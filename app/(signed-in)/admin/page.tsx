"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Icon } from "@/components/Icon";
import { StatCard } from "@/components/StatCard";
import { TopBar } from "@/components/TopBar";

/** Admin overview: live numbers and a way into each full table. Every query is admin-only in Convex. */
export default function AdminOverviewPage() {
  const stats = useQuery(api.admin.stats);
  const links = [
    { href: "/admin/loans", label: "All loans", icon: "loop", count: stats?.loans },
    { href: "/admin/listings", label: "All listings", icon: "wrench", count: stats?.tools },
    { href: "/admin/neighbours", label: "Neighbours", icon: "users", count: stats?.users },
    { href: "/admin/automations", label: "Failed automations", icon: "alert", count: stats?.failedAutomations },
  ];
  return (
    <>
      <TopBar title="Admin" subtitle="Every loan and listing on the street" />
      <main className="ll-content">
        <div className="ll-stats">
          <StatCard label="On loan now" value={stats?.onLoan ?? "–"} icon="loop" tone="sky" />
          <StatCard label="Pending requests" value={stats?.pending ?? "–"} icon="clock" tone="brass" />
          <StatCard label="Overdue" value={stats?.overdue ?? "–"} icon="alert" tone="clay" />
          <StatCard label="Failed automations" value={stats?.failedAutomations ?? "–"} icon="bell" tone={stats?.failedAutomations ? "clay" : "neutral"} />
        </div>
        <div className="ll-admin-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="ll-admin-link">
              <span className="ll-admin-link__top">
                <span className="label">{l.label}</span>
                <Icon name={l.icon} size={18} />
              </span>
              <span className="ll-admin-link__count">{l.count ?? "–"}</span>
              <span className="caption" style={{ color: "var(--ink-muted)" }}>View all <Icon name="arrow-right" size={12} className="inline" /></span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
