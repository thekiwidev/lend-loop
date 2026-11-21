import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { verify } from "../convex/lib/signature";

const modules = import.meta.glob("../convex/**/*.ts");

const AMAKA = { subject: "user_amaka", name: "Amaka Obi", email: "amaka@example.com" };
const CHIDI = { subject: "user_chidi", name: "Chidi Okafor", email: "chidi@example.com" };
const ADMIN = { subject: "user_admin", name: "Ada Admin", email: "ada@example.com", role: "admin" };

function future(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const FIRST_PAGE = { numItems: 12, cursor: null };

const drill = { name: "Cordless drill", category: "power", condition: "good", icon: "drill", description: "18V" } as const;

async function setup() {
  const t = convexTest(schema, modules);
  const amaka = t.withIdentity(AMAKA);
  const chidi = t.withIdentity(CHIDI);
  const admin = t.withIdentity(ADMIN);
  await amaka.action(api.users.sync, {});
  await chidi.action(api.users.sync, {});
  await admin.action(api.users.sync, {});
  const toolId = await amaka.mutation(api.tools.create, drill);
  return { t, amaka, chidi, admin, toolId };
}

describe("tools", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    ctx = await setup();
  });

  it("refuses edits and removal from someone other than the owner", async () => {
    await expect(ctx.chidi.mutation(api.tools.update, { toolId: ctx.toolId, ...drill, name: "Mine now" })).rejects.toThrow(
      "Only the owner can change this listing.",
    );
    await expect(ctx.chidi.mutation(api.tools.remove, { toolId: ctx.toolId })).rejects.toThrow(
      "Only the owner can change this listing.",
    );
  });

  it("rejects an icon outside the catalogue", async () => {
    await expect(ctx.amaka.mutation(api.tools.create, { ...drill, icon: "<svg>" })).rejects.toThrow("Pick an icon");
  });

  it("rejects over-long names", async () => {
    await expect(ctx.amaka.mutation(api.tools.create, { ...drill, name: "x".repeat(81) })).rejects.toThrow("under 80");
  });

  it("requires sign-in for the full list", async () => {
    await expect(ctx.t.query(api.tools.list, { paginationOpts: FIRST_PAGE })).rejects.toThrow("Sign in to continue.");
  });

  it("gives the public list no owner fields", async () => {
    const rows = await ctx.t.query(api.tools.listPublic, {});
    expect(rows).toEqual([{ name: "Cordless drill", category: "power", icon: "drill" }]);
  });

  it("cancels pending requests when a tool is removed", async () => {
    const loanId = await ctx.chidi.mutation(api.loans.request, { toolId: ctx.toolId, startDate: future(1), endDate: future(2) });
    await ctx.amaka.mutation(api.tools.remove, { toolId: ctx.toolId });
    const loan = await ctx.t.run((db) => db.db.get(loanId));
    expect(loan?.status).toBe("cancelled");
  });

  it("refuses removal while an approved loan exists", async () => {
    const loanId = await ctx.chidi.mutation(api.loans.request, { toolId: ctx.toolId, startDate: future(1), endDate: future(2) });
    await ctx.amaka.mutation(api.loans.approve, { loanId });
    await expect(ctx.amaka.mutation(api.tools.remove, { toolId: ctx.toolId })).rejects.toThrow("approved loan");
  });
});

describe("loans", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    ctx = await setup();
  });

  it("refuses borrowing your own tool", async () => {
    await expect(
      ctx.amaka.mutation(api.loans.request, { toolId: ctx.toolId, startDate: future(1), endDate: future(2) }),
    ).rejects.toThrow("You can't borrow your own tool.");
  });

  it("lets only the owner approve", async () => {
    const loanId = await ctx.chidi.mutation(api.loans.request, { toolId: ctx.toolId, startDate: future(1), endDate: future(2) });
    await expect(ctx.chidi.mutation(api.loans.approve, { loanId })).rejects.toThrow("Only the owner can do that.");
    await expect(ctx.admin.mutation(api.loans.approve, { loanId })).rejects.toThrow("That request isn't yours.");
    await ctx.amaka.mutation(api.loans.approve, { loanId });
  });

  it("allows one pending request per borrower per tool", async () => {
    await ctx.chidi.mutation(api.loans.request, { toolId: ctx.toolId, startDate: future(1), endDate: future(2) });
    await expect(
      ctx.chidi.mutation(api.loans.request, { toolId: ctx.toolId, startDate: future(5), endDate: future(6) }),
    ).rejects.toThrow("already have a request");
  });

  it("refuses to approve a loan that overlaps an approved one", async () => {
    const other = { subject: "user_zainab", name: "Zainab Yusuf", email: "z@example.com" };
    const zainab = ctx.t.withIdentity(other);
    await zainab.action(api.users.sync, {});
    const first = await ctx.chidi.mutation(api.loans.request, { toolId: ctx.toolId, startDate: future(1), endDate: future(3) });
    const second = await zainab.mutation(api.loans.request, { toolId: ctx.toolId, startDate: future(3), endDate: future(4) });
    await ctx.amaka.mutation(api.loans.approve, { loanId: first });
    await expect(ctx.amaka.mutation(api.loans.approve, { loanId: second })).rejects.toThrow("is already lent for");
  });

  it("schedules a notification in the same transaction", async () => {
    await ctx.chidi.mutation(api.loans.request, { toolId: ctx.toolId, startDate: future(1), endDate: future(2) });
    const jobs = await ctx.t.run((c) => c.db.system.query("_scheduled_functions").collect());
    expect(jobs.map((j) => j.name)).toContain("automation:sendRequestNotification");
  });
});

describe("admin", () => {
  it("refuses non-admins", async () => {
    const { chidi } = await setup();
    await expect(chidi.query(api.admin.stats, {})).rejects.toThrow("Only neighbourhood admins");
    const users = await setup();
    await expect(users.amaka.mutation(api.admin.setTrustedLender, { userId: "x" as Id<"users">, trusted: true })).rejects.toThrow();
  });

  it("lets an admin mark a trusted lender", async () => {
    const { admin, t } = await setup();
    const { page: users } = await admin.query(api.admin.users, { paginationOpts: FIRST_PAGE });
    const amaka = users.find((u) => u.name === "Amaka Obi")!;
    await admin.mutation(api.admin.setTrustedLender, { userId: amaka._id, trusted: true });
    const row = await t.run((c) => c.db.get(amaka._id));
    expect(row?.trustedLender).toBe(true);
    expect(users[0]).not.toHaveProperty("email");
  });
});

describe("recordEvent", () => {
  it("leaves one row when the same key arrives twice, and upgrades failed to sent", async () => {
    const { t, chidi, toolId } = await setup();
    const loanId = await chidi.mutation(api.loans.request, { toolId, startDate: future(1), endDate: future(2) });
    const event = { idempotencyKey: `loan:${loanId}:pending`, loanId, kind: "request_notification" as const };
    await t.mutation(internal.automation.recordEvent, { ...event, status: "failed" });
    await t.mutation(internal.automation.recordEvent, { ...event, status: "sent" });
    await t.mutation(internal.automation.recordEvent, { ...event, status: "sent" });
    const rows = await t.run((c) => c.db.query("automationEvents").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("sent");
  });

  it("refuses an unknown loan id", async () => {
    const { t } = await setup();
    const result = await t.mutation(internal.automation.recordEvent, {
      idempotencyKey: "k",
      loanId: "not-a-loan",
      kind: "request_notification",
      status: "sent",
    });
    expect(result).toEqual({ ok: false, reason: "unknown loan" });
  });
});

describe("sendRequestNotification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("posts a signed minimal payload to n8n after a loan request", async () => {
    vi.useFakeTimers();
    process.env.N8N_REQUEST_WEBHOOK_URL = "http://n8n.test/webhook/lendloop-request";
    process.env.LENDLOOP_N8N_SECRET = "s3cret";
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { t, chidi, toolId } = await setup();
    await chidi.mutation(api.loans.request, { toolId, startDate: future(1), endDate: future(2) });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://n8n.test/webhook/lendloop-request");
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;
    const check = await verify({
      secret: "s3cret",
      timestamp: headers["X-LendLoop-Timestamp"],
      signature: headers["X-LendLoop-Signature"],
      method: "POST",
      path: "/webhook/lendloop-request",
      body,
      nowSeconds: Number(headers["X-LendLoop-Timestamp"]),
    });
    expect(check).toEqual({ ok: true });
    const payload = JSON.parse(body);
    expect(payload).toMatchObject({ status: "pending", recipientRole: "owner", recipientEmail: "amaka@example.com", otherPartyName: "Chidi Okafor" });
    expect(Object.keys(payload).sort()).toEqual(
      ["appUrl", "endDate", "eventId", "loanId", "otherPartyName", "recipientEmail", "recipientName", "recipientRole", "startDate", "status", "toolName"].sort(),
    );
  });

  it("retries three times, then records one failed event", async () => {
    vi.useFakeTimers();
    process.env.N8N_REQUEST_WEBHOOK_URL = "http://n8n.test/webhook/lendloop-request";
    process.env.LENDLOOP_N8N_SECRET = "s3cret";
    const fetchMock = vi.fn(async () => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const { t, chidi, toolId } = await setup();
    await chidi.mutation(api.loans.request, { toolId, startDate: future(1), endDate: future(2) });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const rows = await t.run((c) => c.db.query("automationEvents").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "failed", kind: "request_notification", detail: "n8n answered 503" });
  });
});

describe("users.sync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CLERK_SECRET_KEY;
  });

  it("takes name and email from Clerk's API, not the token", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test_x";
    const fetchMock = vi.fn(async () =>
      Response.json({
        first_name: "Gabriel",
        last_name: "Adedotun",
        primary_email_address_id: "e2",
        email_addresses: [
          { id: "e1", email_address: "old@example.com" },
          { id: "e2", email_address: "gabriel@example.com" },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const t = convexTest(schema, modules);
    await t.withIdentity({ subject: "user_g" }).action(api.users.sync, {});
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.clerk.com/v1/users/user_g");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_x");
    const rows = await t.run((c) => c.db.query("users").collect());
    expect(rows).toMatchObject([{ clerkId: "user_g", name: "Gabriel Adedotun", email: "gabriel@example.com" }]);
  });

  it("falls back to token claims when Clerk is unreachable", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test_x";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    const t = convexTest(schema, modules);
    await t.withIdentity(AMAKA).action(api.users.sync, {});
    const rows = await t.run((c) => c.db.query("users").collect());
    expect(rows).toMatchObject([{ name: "Amaka Obi", email: "amaka@example.com" }]);
  });
});

describe("pagination", () => {
  it("returns one page of tools at a time and continues from the cursor", async () => {
    const { amaka, chidi } = await setup();
    for (let i = 0; i < 4; i++) await amaka.mutation(api.tools.create, { ...drill, name: `Drill ${i}` });
    const first = await chidi.query(api.tools.list, { paginationOpts: { numItems: 3, cursor: null } });
    expect(first.page).toHaveLength(3);
    expect(first.isDone).toBe(false);
    const second = await chidi.query(api.tools.list, { paginationOpts: { numItems: 3, cursor: first.continueCursor } });
    expect(second.page.length).toBeGreaterThan(0);
    const names = [...first.page, ...second.page].map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("filters requests by status on the server", async () => {
    const { amaka, chidi, toolId } = await setup();
    const loanId = await chidi.mutation(api.loans.request, { toolId, startDate: future(1), endDate: future(2) });
    await amaka.mutation(api.loans.decline, { loanId });
    await chidi.mutation(api.loans.request, { toolId, startDate: future(5), endDate: future(6) });
    const pending = await chidi.query(api.loans.myRequests, { filter: "pending", paginationOpts: FIRST_PAGE });
    const closed = await chidi.query(api.loans.myRequests, { filter: "closed", paginationOpts: FIRST_PAGE });
    expect(pending.page.map((l) => l.status)).toEqual(["pending"]);
    expect(closed.page.map((l) => l.status)).toEqual(["declined"]);
    const incoming = await amaka.query(api.loans.incoming, { filter: "all", paginationOpts: FIRST_PAGE });
    expect(incoming.page).toHaveLength(2);
  });

  it("counts dashboard numbers from active loans", async () => {
    const { amaka, chidi, toolId } = await setup();
    await chidi.mutation(api.loans.request, { toolId, startDate: future(1), endDate: future(2) });
    expect(await amaka.query(api.loans.dashboardStats, {})).toEqual({ onLoanNow: 0, waitingOnYou: 1, overdue: 0 });
  });
});
