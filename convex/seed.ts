import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { todayUtc } from "./lib/loanRules";
import { insertLoan, insertTool, insertUser, rebuildCounts } from "./lib/counts";

// Dev-only sample data: `bunx convex run seed:run`. Internal, so no client can call it.
// Sample neighbours get example.com addresses and noEmail, so they are never emailed: their
// notifications are recorded as sent without reaching n8n, and reminders skip them.

const NEIGHBOURS = [
  { clerkId: "seed_amaka", name: "Amaka Obi", trustedLender: true },
  { clerkId: "seed_tunde", name: "Tunde Bello", trustedLender: false },
  { clerkId: "seed_zainab", name: "Zainab Yusuf", trustedLender: false },
  { clerkId: "seed_chidi", name: "Chidi Okafor", trustedLender: true },
  { clerkId: "seed_ifeoma", name: "Ifeoma Nwosu", trustedLender: false },
];

type Tool = Omit<Doc<"tools">, "_id" | "_creationTime" | "ownerId" | "removedAt">;

const TOOLS: { owner: string; tool: Tool }[] = [
  { owner: "seed_amaka", tool: { name: "Cordless drill", category: "power", condition: "good", icon: "drill", description: "Bosch 18V, two batteries, charger and a box of bits." } },
  { owner: "seed_tunde", tool: { name: "Hedge trimmer", category: "garden", condition: "fair", icon: "hedge-trimmer", description: "Petrol. Blade sharpened in October." } },
  { owner: "seed_zainab", tool: { name: "Stand mixer", category: "kitchen", condition: "new", icon: "mixer", description: "KitchenAid with dough hook and whisk." } },
  { owner: "seed_chidi", tool: { name: "4-person tent", category: "camping", condition: "good", icon: "tent", description: "Pitched twice. Pegs and footprint included." } },
  { owner: "seed_ifeoma", tool: { name: "Pressure washer", category: "power", condition: "good", icon: "pressure-washer", description: "135 bar, with patio cleaner attachment." } },
  { owner: "seed_amaka", tool: { name: "Extension ladder", category: "other", condition: "worn", icon: "ladder", description: "6m aluminium. Feet are scuffed but solid." } },
  { owner: "seed_tunde", tool: { name: "Lawn mower", category: "garden", condition: "good", icon: "lawn-mower", description: "Electric, 32cm cut, grass box included." } },
  { owner: "seed_chidi", tool: { name: "Camping lantern", category: "camping", condition: "new", icon: "lantern", description: "Rechargeable LED, about 20 hours." } },
];

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function upsertNeighbour(ctx: MutationCtx, n: (typeof NEIGHBOURS)[number]): Promise<Id<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", n.clerkId))
    .unique();
  if (existing) return existing._id;
  const email = `${n.clerkId.replace("seed_", "")}@example.com`;
  return insertUser(ctx, { ...n, email, noEmail: true });
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Seeds an empty shed only. Checking for a seed_ user is not enough: linked neighbours
    // carry real Clerk ids, so a second run would duplicate everyone.
    if (await ctx.db.query("tools").first()) return "Already seeded. Run seed:reset first to start again.";

    const ids = new Map<string, Id<"users">>();
    for (const n of NEIGHBOURS) ids.set(n.clerkId, await upsertNeighbour(ctx, n));

    const toolIds: Id<"tools">[] = [];
    for (const { owner, tool } of TOOLS) {
      toolIds.push(await insertTool(ctx, { ...tool, ownerId: ids.get(owner)! }));
    }

    const today = todayUtc(Date.now());
    // The hedge trimmer is out with Zainab until in four days.
    await insertLoan(ctx, {
      toolId: toolIds[1],
      ownerId: ids.get("seed_tunde")!,
      borrowerId: ids.get("seed_zainab")!,
      startDate: shiftDays(today, -2),
      endDate: shiftDays(today, 4),
      status: "approved",
    });

    const realUser = (await ctx.db.query("users").collect()).find((u) => !u.clerkId.startsWith("seed_"));
    if (!realUser) {
      return "Seeded sample tools. Sign in once and run the seed again after clearing it to get an overdue loan and an incoming request.";
    }

    // Overdue: the real user borrowed the pressure washer and it was due back three days ago.
    await insertLoan(ctx, {
      toolId: toolIds[4],
      ownerId: ids.get("seed_ifeoma")!,
      borrowerId: realUser._id,
      startDate: shiftDays(today, -8),
      endDate: shiftDays(today, -3),
      status: "approved",
    });

    // Incoming: Chidi wants to borrow a tool the real user lists.
    const ownTool = await insertTool(ctx, {
      ownerId: realUser._id,
      name: "Circular saw",
      category: "power",
      condition: "good",
      icon: "saw",
      description: "Makita 165mm, spare blade in the case.",
    });
    await insertLoan(ctx, {
      toolId: ownTool,
      ownerId: realUser._id,
      borrowerId: ids.get("seed_chidi")!,
      startDate: shiftDays(today, 2),
      endDate: shiftDays(today, 4),
      status: "pending",
    });
    return `Seeded sample tools, an overdue loan for ${realUser.name} and an incoming request.`;
  },
});

/**
 * Dev-only: points a seeded neighbour at a real Clerk test account, so signing in as that
 * account opens the seeded user with its tools and loans. Run by scripts/seed-clerk-users.ts.
 */
export const linkClerkUser = internalMutation({
  args: { seedId: v.string(), clerkId: v.string() },
  handler: async (ctx, { seedId, clerkId }) => {
    const byClerk = (id: string) => ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", id)).unique();
    if (await byClerk(clerkId)) return "already linked";
    const seeded = await byClerk(seedId);
    if (!seeded) return "not seeded";
    await ctx.db.patch(seeded._id, { clerkId });
    return "linked";
  },
});

/**
 * Dev-only: deletes every tool, loan and automation event, and the sample neighbours
 * (example.com addresses). Real users stay, so they can sign straight back in.
 */
export const reset = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["automationEvents", "loans", "tools"] as const) {
      for (const row of await ctx.db.query(table).collect()) await ctx.db.delete(row._id);
    }
    let neighbours = 0;
    for (const user of await ctx.db.query("users").collect()) {
      if (user.email.endsWith("@example.com")) {
        await ctx.db.delete(user._id);
        neighbours++;
      }
    }
    await rebuildCounts(ctx);
    return `Cleared tools, loans, automation events and ${neighbours} sample neighbours.`;
  },
});

/** Rebuilds the admin page counts from the tables. Run once after upgrading: `bunx convex run seed:rebuildAdminCounts`. */
export const rebuildAdminCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    await rebuildCounts(ctx);
    return "Counts rebuilt.";
  },
});
