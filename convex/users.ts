import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";
import { findUserByClerkId, hasAdminRole } from "./lib/access";

const MAX_NAME = 80;

type Profile = { name: string; email: string };

/**
 * The caller's name and email straight from Clerk's Backend API, so they do not depend on
 * which claims the JWT template carries. Null when CLERK_SECRET_KEY is unset or Clerk fails.
 */
async function clerkProfile(clerkId: string): Promise<Profile | null> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return null;
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as {
      first_name: string | null;
      last_name: string | null;
      primary_email_address_id: string | null;
      email_addresses: { id: string; email_address: string }[];
    };
    const email = user.email_addresses.find((e) => e.id === user.primary_email_address_id)?.email_address ?? "";
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    return { name, email };
  } catch {
    return null;
  }
}

/** Upserts the caller's user row. Called once by the app shell on every visit. */
export const sync = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Sign in to continue.");
    const fromClerk = await clerkProfile(identity.subject);
    const email = fromClerk?.email || identity.email || "";
    const name = (fromClerk?.name || identity.name || identity.givenName || email.split("@")[0] || "Neighbour")
      .trim()
      .slice(0, MAX_NAME);
    await ctx.runMutation(internal.users.upsert, { clerkId: identity.subject, name, email });
  },
});

export const upsert = internalMutation({
  args: { clerkId: v.string(), name: v.string(), email: v.string() },
  handler: async (ctx, { clerkId, name, email }) => {
    const existing = await findUserByClerkId(ctx, clerkId);
    if (!existing) {
      await ctx.db.insert("users", { clerkId, name, email, trustedLender: false });
      return;
    }
    if (existing.name !== name || existing.email !== email) {
      await ctx.db.patch(existing._id, { name, email });
    }
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
