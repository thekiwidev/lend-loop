import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { displayStatus, isOutToday, todayUtc } from "./lib/loanRules";

// shortcut: admin tables read at most this many rows; paginate for larger neighbourhoods.
const LIMIT = 500;

export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const today = todayUtc(Date.now());
    const tools = await ctx.db.query("tools").take(LIMIT);
    const loans = await ctx.db.query("loans").take(LIMIT);
    const failed = await ctx.db
      .query("automationEvents")
      .order("desc")
      .take(LIMIT);
    return {
      toolsListed: tools.filter((t) => t.removedAt === undefined).length,
      onLoan: loans.filter((l) => isOutToday(l, today)).length,
      pending: loans.filter((l) => l.status === "pending").length,
      overdue: loans.filter((l) => displayStatus(l, today) === "overdue").length,
      failedAutomations: failed.filter((e) => e.status === "failed").length,
    };
  },
});

export const loans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const today = todayUtc(Date.now());
    const rows = await ctx.db.query("loans").order("desc").take(LIMIT);
    return Promise.all(
      rows.map(async (loan) => {
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
  },
});

export const tools = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("tools").order("desc").take(LIMIT);
    return Promise.all(
      rows.map(async (tool) => {
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
  },
});

/** Emails stay server-side even for admins: the table needs names only. */
export const users = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("users").take(LIMIT);
    return rows.map((u) => ({ _id: u._id, name: u.name, trustedLender: u.trustedLender }));
  },
});

export const workflowErrors = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("automationEvents").order("desc").take(LIMIT);
    return rows
      .filter((e) => e.status === "failed")
      .slice(0, 20)
      .map((e) => ({ _id: e._id, kind: e.kind, at: e.at, detail: e.detail ?? "" }));
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
