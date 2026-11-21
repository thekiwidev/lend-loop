import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { displayStatus, isOutToday, todayUtc } from "./lib/loanRules";
import { eventCount, loanCount, toolCount, userCount } from "./lib/counts";
import { pageArgs, pageWindow } from "./lib/pages";

/** Street-wide numbers from active loans only (pending, approved), read through indexes. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const today = todayUtc(Date.now());
    const [approved, pending, failedAutomations, loans, tools, users] = await Promise.all([
      ctx.db.query("loans").withIndex("by_status", (q) => q.eq("status", "approved")).collect(),
      ctx.db.query("loans").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
      eventCount.count(ctx, { namespace: "failed" }),
      loanCount.count(ctx),
      toolCount.count(ctx),
      userCount.count(ctx),
    ]);
    return {
      onLoan: approved.filter((l) => isOutToday(l, today)).length,
      pending: pending.length,
      overdue: approved.filter((l) => l.endDate < today).length,
      failedAutomations,
      loans,
      tools,
      users,
    };
  },
});

export const loans = query({
  args: pageArgs,
  handler: async (ctx, { page, pageSize }) => {
    await requireAdmin(ctx);
    const today = todayUtc(Date.now());
    const w = pageWindow(await loanCount.count(ctx), page, pageSize);
    const top = w.topIndex === null ? null : (await loanCount.at(ctx, w.topIndex)).key;
    const docs = top === null ? [] : await ctx.db.query("loans").withIndex("by_creation_time", (q) => q.lte("_creationTime", top)).order("desc").take(w.pageSize);
    const rows = await Promise.all(
      docs.map(async (loan) => {
        const [tool, owner, borrower, lastEvent] = await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.ownerId),
          ctx.db.get(loan.borrowerId),
          ctx.db
            .query("automationEvents")
            .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
            .order("desc")
            .first(),
        ]);
        return {
          _id: loan._id,
          toolName: tool?.name ?? "Removed tool",
          ownerName: owner?.name ?? "Unknown",
          borrowerName: borrower?.name ?? "Unknown",
          startDate: loan.startDate,
          endDate: loan.endDate,
          status: displayStatus(loan, today),
          lastAutomation: lastEvent ? { kind: lastEvent.kind, status: lastEvent.status, at: lastEvent.at } : null,
        };
      }),
    );
    return { ...w, rows };
  },
});

export const tools = query({
  args: pageArgs,
  handler: async (ctx, { page, pageSize }) => {
    await requireAdmin(ctx);
    const w = pageWindow(await toolCount.count(ctx), page, pageSize);
    const top = w.topIndex === null ? null : (await toolCount.at(ctx, w.topIndex)).key;
    const docs = top === null ? [] : await ctx.db.query("tools").withIndex("by_creation_time", (q) => q.lte("_creationTime", top)).order("desc").take(w.pageSize);
    const rows = await Promise.all(
      docs.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        return {
          _id: tool._id,
          name: tool.name,
          category: tool.category,
          ownerName: owner?.name ?? "Unknown",
          removed: tool.removedAt !== undefined,
        };
      }),
    );
    return { ...w, rows };
  },
});

/** Emails stay server-side even for admins: the table needs names only. */
export const users = query({
  args: pageArgs,
  handler: async (ctx, { page, pageSize }) => {
    await requireAdmin(ctx);
    const w = pageWindow(await userCount.count(ctx), page, pageSize);
    const top = w.topIndex === null ? null : (await userCount.at(ctx, w.topIndex)).key;
    const docs = top === null ? [] : await ctx.db.query("users").withIndex("by_creation_time", (q) => q.lte("_creationTime", top)).order("desc").take(w.pageSize);
    return { ...w, rows: docs.map((u) => ({ _id: u._id, name: u.name, trustedLender: u.trustedLender })) };
  },
});

export const workflowErrors = query({
  args: pageArgs,
  handler: async (ctx, { page, pageSize }) => {
    await requireAdmin(ctx);
    const failed = { namespace: "failed" as const };
    const w = pageWindow(await eventCount.count(ctx, failed), page, pageSize);
    const top = w.topIndex === null ? null : (await eventCount.at(ctx, w.topIndex, failed)).key;
    const docs =
      top === null
        ? []
        : await ctx.db
            .query("automationEvents")
            .withIndex("by_status", (q) => q.eq("status", "failed").lte("_creationTime", top))
            .order("desc")
            .take(w.pageSize);
    return { ...w, rows: docs.map((e) => ({ _id: e._id, kind: e.kind, at: e.at, detail: e.detail ?? "" })) };
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) return;
    await ctx.db.patch(userId, { trustedLender: trusted });
  },
});
