import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "../_generated/api";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import type { WithoutSystemFields } from "convex/server";
import type { MutationCtx } from "../_generated/server";

// Every insert, delete and status change on these tables goes through the helpers below, so
// the counts match the tables. Keys are _creationTime: offset N is the Nth oldest row.

export const loanCount = new TableAggregate<{ Key: number; DataModel: DataModel; TableName: "loans" }>(components.loanCount, {
  sortKey: (d) => d._creationTime,
});
export const toolCount = new TableAggregate<{ Key: number; DataModel: DataModel; TableName: "tools" }>(components.toolCount, {
  sortKey: (d) => d._creationTime,
});
export const userCount = new TableAggregate<{ Key: number; DataModel: DataModel; TableName: "users" }>(components.userCount, {
  sortKey: (d) => d._creationTime,
});
/** Namespaced by status, so failed automations can be counted and paged on their own. */
export const eventCount = new TableAggregate<{ Namespace: "sent" | "failed"; Key: number; DataModel: DataModel; TableName: "automationEvents" }>(
  components.eventCount,
  { namespace: (d) => d.status, sortKey: (d) => d._creationTime },
);

/** Rebuilds all four counts from the tables. Dev and recovery only: reads every row. */
export async function rebuildCounts(ctx: MutationCtx) {
  await Promise.all([loanCount.clearAll(ctx), toolCount.clearAll(ctx), userCount.clearAll(ctx), eventCount.clearAll(ctx)]);
  for (const d of await ctx.db.query("loans").collect()) await loanCount.insert(ctx, d);
  for (const d of await ctx.db.query("tools").collect()) await toolCount.insert(ctx, d);
  for (const d of await ctx.db.query("users").collect()) await userCount.insert(ctx, d);
  for (const d of await ctx.db.query("automationEvents").collect()) await eventCount.insert(ctx, d);
}

type New<T extends "loans" | "tools" | "users" | "automationEvents"> = WithoutSystemFields<Doc<T>>;

export async function insertLoan(ctx: MutationCtx, value: New<"loans">) {
  const id = await ctx.db.insert("loans", value);
  await loanCount.insert(ctx, (await ctx.db.get(id))!);
  return id;
}

export async function insertTool(ctx: MutationCtx, value: New<"tools">) {
  const id = await ctx.db.insert("tools", value);
  await toolCount.insert(ctx, (await ctx.db.get(id))!);
  return id;
}

export async function insertUser(ctx: MutationCtx, value: New<"users">) {
  const id = await ctx.db.insert("users", value);
  await userCount.insert(ctx, (await ctx.db.get(id))!);
  return id;
}

export async function insertEvent(ctx: MutationCtx, value: New<"automationEvents">) {
  const id = await ctx.db.insert("automationEvents", value);
  await eventCount.insert(ctx, (await ctx.db.get(id))!);
  return id;
}

/** Patches an automation event and moves it between the sent and failed counts. */
export async function patchEvent(ctx: MutationCtx, id: Id<"automationEvents">, patch: Partial<New<"automationEvents">>) {
  const before = (await ctx.db.get(id))!;
  await ctx.db.patch(id, patch);
  await eventCount.replace(ctx, before, (await ctx.db.get(id))!);
}
