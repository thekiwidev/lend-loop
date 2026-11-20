import { mutation, query } from "./_generated/server";
import { findUserByClerkId, hasAdminRole, requireIdentity } from "./lib/access";

const MAX_NAME = 80;

/** Upserts the caller's user row from the verified identity. Called once by the app shell. */
export const sync = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const name = (identity.name ?? identity.givenName ?? identity.email ?? "Neighbour").trim().slice(0, MAX_NAME);
    const email = identity.email ?? "";
    const existing = await findUserByClerkId(ctx, identity.subject);
    if (!existing) {
      return ctx.db.insert("users", { clerkId: identity.subject, name, email, trustedLender: false });
    }
    if (existing.name !== name || existing.email !== email) {
      await ctx.db.patch(existing._id, { name, email });
    }
    return existing._id;
  },
});

/** The signed-in user's own profile and sidebar counts; null until `sync` has run. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await findUserByClerkId(ctx, identity.subject);
    if (!user) return null;
    const myTools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const incoming = await ctx.db
      .query("loans")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const outgoing = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();
    return {
      name: user.name,
      // The caller's own address only; other people's emails never reach the client.
      email: user.email,
      trustedLender: user.trustedLender,
      isAdmin: hasAdminRole(identity),
      counts: {
        listings: myTools.filter((t) => t.removedAt === undefined).length,
        incomingPending: incoming.filter((l) => l.status === "pending").length,
        myPending: outgoing.filter((l) => l.status === "pending").length,
      },
    };
  },
});
