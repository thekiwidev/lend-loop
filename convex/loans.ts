import { ConvexError, v } from "convex/values";
import { paginationOptsValidator, type PaginationOptions } from "convex/server";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireLoanParty, requireUser } from "./lib/access";
import {
  alreadyLentError,
  displayStatus,
  findOverlap,
  isOutToday,
  loanDays,
  requestDatesError,
  todayUtc,
  transitionError,
  type StoredLoanStatus,
} from "./lib/loanRules";
import { recentForLoan, scheduleNotification } from "./automation";
import { insertLoan } from "./lib/counts";

const requestFilter = v.union(v.literal("all"), v.literal("pending"), v.literal("active"), v.literal("closed"));
type RequestFilter = "all" | "pending" | "active" | "closed";

async function approvedLoans(ctx: QueryCtx, toolId: Id<"tools">, exceptId?: Id<"loans">) {
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .collect();
  return loans.filter((l) => l._id !== exceptId);
}

export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const { user } = await requireUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool || tool.removedAt !== undefined) throw new ConvexError("That tool is no longer listed.");
    if (tool.ownerId === user._id) throw new ConvexError("You can't borrow your own tool.");

    const datesError = requestDatesError(startDate, endDate, todayUtc(Date.now()));
    if (datesError) throw new ConvexError(datesError);

    const mine = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .filter((q) => q.and(q.eq(q.field("toolId"), toolId), q.eq(q.field("status"), "pending")))
      .first();
    if (mine) throw new ConvexError("You already have a request waiting for this tool.");

    const clash = findOverlap({ startDate, endDate }, await approvedLoans(ctx, toolId));
    if (clash) throw new ConvexError(alreadyLentError(tool.name, clash));

    const loanId = await insertLoan(ctx, {
      toolId,
      ownerId: tool.ownerId,
      borrowerId: user._id,
      startDate,
      endDate,
      status: "pending",
    });
    await scheduleNotification(ctx, loanId, "pending", "owner");
    return loanId;
  },
});

async function move(ctx: MutationCtx, loanId: Id<"loans">, to: StoredLoanStatus) {
  const { loan, role } = await requireLoanParty(ctx, loanId);
  const error = transitionError(loan.status, to, role);
  if (error) throw new ConvexError(error);

  if (to === "approved") {
    const tool = await ctx.db.get(loan.toolId);
    if (!tool || tool.removedAt !== undefined) throw new ConvexError("That tool is no longer listed.");
    const clash = findOverlap(loan, await approvedLoans(ctx, loan.toolId, loan._id));
    if (clash) throw new ConvexError(alreadyLentError(tool.name, clash));
  }

  await ctx.db.patch(loanId, to === "returned" ? { status: to, returnedAt: Date.now() } : { status: to });
  // The person who did not act is the one who hears about it.
  await scheduleNotification(ctx, loanId, to, role === "owner" ? "borrower" : "owner");
}

export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: (ctx, { loanId }) => move(ctx, loanId, "approved"),
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: (ctx, { loanId }) => move(ctx, loanId, "declined"),
});

export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: (ctx, { loanId }) => move(ctx, loanId, "cancelled"),
});

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: (ctx, { loanId }) => move(ctx, loanId, "returned"),
});

async function toCard(ctx: QueryCtx, loan: Doc<"loans">, otherPartyId: Id<"users">, today: string) {
  const [tool, other, activity] = await Promise.all([
    ctx.db.get(loan.toolId),
    ctx.db.get(otherPartyId),
    recentForLoan(ctx, loan._id),
  ]);
  return {
    _id: loan._id,
    tool: { name: tool?.name ?? "Removed tool", category: tool?.category ?? "other", icon: tool?.icon ?? "box" },
    person: other?.name ?? "A neighbour",
    personTrustedBorrower: other?.trustedBorrower ?? false,
    status: displayStatus(loan, today),
    startDate: loan.startDate,
    endDate: loan.endDate,
    days: loanDays(loan.startDate, loan.endDate),
    activity,
  };
}

/**
 * One page of a person's loans, newest first. Pending and active use the status index;
 * "closed" (declined, cancelled, returned) is the long history, filtered on the way.
 */
function loanPage(ctx: QueryCtx, side: "owner" | "borrower", userId: Id<"users">, filter: RequestFilter, opts: PaginationOptions) {
  if (filter === "pending" || filter === "active") {
    const status = filter === "pending" ? "pending" : "approved";
    const q =
      side === "owner"
        ? ctx.db.query("loans").withIndex("by_owner_status", (i) => i.eq("ownerId", userId).eq("status", status))
        : ctx.db.query("loans").withIndex("by_borrower_status", (i) => i.eq("borrowerId", userId).eq("status", status));
    return q.order("desc").paginate(opts);
  }
  const q =
    side === "owner"
      ? ctx.db.query("loans").withIndex("by_owner", (i) => i.eq("ownerId", userId))
      : ctx.db.query("loans").withIndex("by_borrower", (i) => i.eq("borrowerId", userId));
  const filtered =
    filter === "closed"
      ? q.filter((f) => f.or(f.eq(f.field("status"), "declined"), f.eq(f.field("status"), "cancelled"), f.eq(f.field("status"), "returned")))
      : q;
  return filtered.order("desc").paginate(opts);
}

/** Requests the caller has made as a borrower, a page at a time. */
export const myRequests = query({
  args: { filter: requestFilter, paginationOpts: paginationOptsValidator },
  handler: async (ctx, { filter, paginationOpts }) => {
    const { user } = await requireUser(ctx);
    const today = todayUtc(Date.now());
    const result = await loanPage(ctx, "borrower", user._id, filter, paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((l) => toCard(ctx, l, l.ownerId, today))) };
  },
});

/** Requests for the caller's tools, a page at a time. */
export const incoming = query({
  args: { filter: requestFilter, paginationOpts: paginationOptsValidator },
  handler: async (ctx, { filter, paginationOpts }) => {
    const { user } = await requireUser(ctx);
    const today = todayUtc(Date.now());
    const result = await loanPage(ctx, "owner", user._id, filter, paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((l) => toCard(ctx, l, l.borrowerId, today))) };
  },
});

/**
 * Dashboard numbers. Every count reads only active loans (pending or approved) through an
 * index, never the growing history of finished ones.
 */
export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const today = todayUtc(Date.now());
    const [approved, waiting, lentOut, borrowed] = await Promise.all([
      ctx.db.query("loans").withIndex("by_status", (q) => q.eq("status", "approved")).collect(),
      ctx.db.query("loans").withIndex("by_owner_status", (q) => q.eq("ownerId", user._id).eq("status", "pending")).collect(),
      ctx.db.query("loans").withIndex("by_owner_status", (q) => q.eq("ownerId", user._id).eq("status", "approved")).collect(),
      ctx.db.query("loans").withIndex("by_borrower_status", (q) => q.eq("borrowerId", user._id).eq("status", "approved")).collect(),
    ]);
    return {
      onLoanNow: approved.filter((l) => isOutToday(l, today)).length,
      waitingOnYou: waiting.length,
      overdue: [...lentOut, ...borrowed].filter((l) => l.endDate < today).length,
    };
  },
});

/** Approved date ranges for a tool from today on, so the picker can grey them out. Dates only. */
export const booked = query({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    await requireUser(ctx);
    const today = todayUtc(Date.now());
    const loans = await approvedLoans(ctx, toolId);
    return loans
      .filter((l) => l.endDate >= today)
      .map((l) => ({ startDate: l.startDate, endDate: l.endDate }));
  },
});
