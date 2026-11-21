import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { automationKindValidator, automationStatusValidator, loanStatusValidator } from "./schema";
import { todayUtc, type StoredLoanStatus } from "./lib/loanRules";
import { signedHeaders } from "./lib/signature";
import { insertEvent, patchEvent } from "./lib/counts";

/** Waits between attempts after a failed hand-off to n8n: 1, 5 and 15 minutes. */
export const RETRY_DELAYS_MS = [60_000, 300_000, 900_000] as const;
// n8n answers after its own Resend retries (3 tries, 5s apart), so allow well over 15s.
const REQUEST_TIMEOUT_MS = 30_000;

const recipientValidator = v.union(v.literal("owner"), v.literal("borrower"));

/** Called inside the mutation that changed the loan, so the state change and the job commit together. */
export async function scheduleNotification(
  ctx: MutationCtx,
  loanId: Id<"loans">,
  status: StoredLoanStatus,
  recipient: "owner" | "borrower",
) {
  await ctx.scheduler.runAfter(0, internal.automation.sendRequestNotification, {
    loanId,
    status,
    recipient,
    attempt: 0,
  });
}

/** Feeds ActivityLine on request cards. */
export async function recentForLoan(ctx: QueryCtx, loanId: Id<"loans">) {
  const events = await ctx.db
    .query("automationEvents")
    .withIndex("by_loan", (q) => q.eq("loanId", loanId))
    .order("desc")
    .take(3);
  return events.map((e) => ({ kind: e.kind, status: e.status, at: e.at }));
}

/** The minimal payload n8n needs to send one email. Nothing else about either person leaves Convex. */
export const notificationPayload = internalQuery({
  args: { loanId: v.id("loans"), status: loanStatusValidator, recipient: recipientValidator },
  handler: async (ctx, { loanId, status, recipient }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return null;
    const [tool, owner, borrower] = await Promise.all([
      ctx.db.get(loan.toolId),
      ctx.db.get(loan.ownerId),
      ctx.db.get(loan.borrowerId),
    ]);
    if (!tool || !owner || !borrower) return null;
    const to = recipient === "owner" ? owner : borrower;
    const other = recipient === "owner" ? borrower : owner;
    return {
      eventId: `loan:${loanId}:${status}`,
      loanId,
      status,
      recipientRole: recipient,
      recipientEmail: to.email,
      recipientName: to.name,
      otherPartyName: other.name,
      toolName: tool.name,
      startDate: loan.startDate,
      endDate: loan.endDate,
      appUrl: process.env.APP_URL ?? "http://localhost:3000",
    };
  },
});

export const sendRequestNotification = internalAction({
  args: {
    loanId: v.id("loans"),
    status: loanStatusValidator,
    recipient: recipientValidator,
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const { loanId, status, recipient } = args;
    const payload = await ctx.runQuery(internal.automation.notificationPayload, { loanId, status, recipient });
    if (!payload) return;

    const url = process.env.N8N_REQUEST_WEBHOOK_URL;
    const secret = process.env.LENDLOOP_N8N_SECRET;
    const error = url && secret ? await postSigned(url, secret, JSON.stringify(payload)) : "n8n is not configured";
    if (!error) return; // n8n acknowledges the send through /automation/ack.

    if (args.attempt < RETRY_DELAYS_MS.length) {
      await ctx.scheduler.runAfter(RETRY_DELAYS_MS[args.attempt], internal.automation.sendRequestNotification, {
        ...args,
        attempt: args.attempt + 1,
      });
      return;
    }
    await ctx.runMutation(internal.automation.recordEvent, {
      idempotencyKey: payload.eventId,
      loanId: args.loanId,
      kind: "request_notification",
      status: "failed",
      detail: error,
    });
  },
});

/** Returns null on success, otherwise a short reason. */
async function postSigned(url: string, secret: string, body: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = await signedHeaders(secret, "POST", new URL(url).pathname, body, Math.floor(Date.now() / 1000));
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    return res.ok ? null : `n8n answered ${res.status}`;
  } catch (e) {
    return e instanceof Error ? e.message.slice(0, 200) : "request to n8n failed";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Idempotent write-back. Mutations are serialisable, so the lookup and insert cannot race:
 * the same key twice leaves one row. A failed row may later be upgraded to sent.
 */
export const recordEvent = internalMutation({
  args: {
    idempotencyKey: v.string(),
    loanId: v.optional(v.string()),
    kind: automationKindValidator,
    status: automationStatusValidator,
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const loanId = args.loanId === undefined ? undefined : ctx.db.normalizeId("loans", args.loanId);
    if (args.loanId !== undefined && !loanId) return { ok: false as const, reason: "unknown loan" };
    const detail = args.detail?.slice(0, 300);

    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) {
      if (existing.status === "failed" && args.status === "sent") {
        await patchEvent(ctx, existing._id, { status: "sent", at: Date.now(), detail });
      }
      return { ok: true as const, id: existing._id };
    }
    const id = await insertEvent(ctx, {
      idempotencyKey: args.idempotencyKey,
      loanId: loanId ?? undefined,
      kind: args.kind,
      status: args.status,
      at: Date.now(),
      detail,
    });
    return { ok: true as const, id };
  },
});

/** Approved loans past their end date that have not had today's reminder yet. */
export const overdueLoans = internalQuery({
  args: {},
  handler: async (ctx) => {
    const today = todayUtc(Date.now());
    const approved = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const overdue = approved.filter((l) => l.endDate < today);
    const rows = await Promise.all(
      overdue.map(async (loan) => {
        const idempotencyKey = `overdue:${loan._id}:${today}`;
        const done = await ctx.db
          .query("automationEvents")
          .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
          .unique();
        if (done?.status === "sent") return null;
        const [tool, borrower] = await Promise.all([ctx.db.get(loan.toolId), ctx.db.get(loan.borrowerId)]);
        if (!tool || !borrower) return null;
        return {
          loanId: loan._id,
          idempotencyKey,
          borrowerEmail: borrower.email,
          borrowerName: borrower.name,
          toolName: tool.name,
          endDate: loan.endDate,
        };
      }),
    );
    return rows.filter((r) => r !== null);
  },
});
