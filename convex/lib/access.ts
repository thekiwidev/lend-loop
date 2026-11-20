import { ConvexError } from "convex/values";
import type { UserIdentity } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// Every public query and mutation starts with one of these. They are the security gate;
// the Next.js proxy only decides what page to show.

export interface Viewer {
  identity: UserIdentity;
  user: Doc<"users">;
  isAdmin: boolean;
}

/** The role claim comes from the Clerk-signed JWT (public metadata), never from arguments. */
export function hasAdminRole(identity: UserIdentity): boolean {
  return identity.role === "admin";
}

export async function requireIdentity(ctx: QueryCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Sign in to continue.");
  return identity;
}

export async function findUserByClerkId(ctx: QueryCtx, clerkId: string): Promise<Doc<"users"> | null> {
  return ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

export async function requireUser(ctx: QueryCtx): Promise<Viewer> {
  const identity = await requireIdentity(ctx);
  const user = await findUserByClerkId(ctx, identity.subject);
  if (!user) throw new ConvexError("Your account is still being set up. Refresh the page.");
  return { identity, user, isAdmin: hasAdminRole(identity) };
}

export async function requireAdmin(ctx: QueryCtx): Promise<Viewer> {
  const viewer = await requireUser(ctx);
  if (!viewer.isAdmin) throw new ConvexError("Only neighbourhood admins can do that.");
  return viewer;
}

export async function requireToolOwner(ctx: QueryCtx, toolId: Id<"tools">) {
  const viewer = await requireUser(ctx);
  const tool = await ctx.db.get(toolId);
  if (!tool || tool.removedAt !== undefined) throw new ConvexError("That tool is no longer listed.");
  if (tool.ownerId !== viewer.user._id) throw new ConvexError("Only the owner can change this listing.");
  return { ...viewer, tool };
}

export async function requireLoanParty(ctx: QueryCtx, loanId: Id<"loans">) {
  const viewer = await requireUser(ctx);
  const loan = await ctx.db.get(loanId);
  if (!loan) throw new ConvexError("That request no longer exists.");
  const role =
    loan.ownerId === viewer.user._id ? "owner" : loan.borrowerId === viewer.user._id ? "borrower" : null;
  if (!role) throw new ConvexError("That request isn't yours.");
  return { ...viewer, loan, role } as const;
}
