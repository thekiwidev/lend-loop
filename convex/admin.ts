import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { displayStatus, isOutToday, todayUtc } from "./lib/loanRules";

// Failed automations are shown as "100+" past this, so the count never scans the whole log.
const FAILED_COUNT_CAP = 100;

/** Street-wide numbers from active loans only (pending, approved), read through indexes. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const today = todayUtc(Date.now());
    const [approved, pending, failed] = await Promise.all([
      ctx.db.query("loans").withIndex("by_status", (q) => q.eq("status", "approved")).collect(),
      ctx.db.query("loans").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
      ctx.db.query("automationEvents").withIndex("by_status", (q) => q.eq("status", "failed")).take(FAILED_COUNT_CAP),
    ]);
    return {
      onLoan: approved.filter((l) => isOutToday(l, today)).length,
      pending: pending.length,
      overdue: approved.filter((l) => l.endDate < today).length,
      failedAutomations: failed.length,
      failedCapped: failed.length === FAILED_COUNT_CAP,
    };
  },
});

export const loans = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const today = todayUtc(Date.now());
    const result = await ctx.db.query("loans").order("desc").paginate(paginationOpts);
    const page = await Promise.all(
      result.page.map(async (loan) => {
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
    return { ...result, page };
  },
});

export const tools = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.query("tools").order("desc").paginate(paginationOpts);
    const page = await Promise.all(
      result.page.map(async (tool) => {
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
    return { ...result, page };
  },
});

/** Emails stay server-side even for admins: the table needs names only. */
export const users = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.query("users").order("desc").paginate(paginationOpts);
    return { ...result, page: result.page.map((u) => ({ _id: u._id, name: u.name, trustedLender: u.trustedLender })) };
  },
});

export const workflowErrors = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("automationEvents")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .order("desc")
      .paginate(paginationOpts);
    return { ...result, page: result.page.map((e) => ({ _id: e._id, kind: e.kind, at: e.at, detail: e.detail ?? "" })) };
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
