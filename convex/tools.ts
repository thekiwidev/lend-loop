import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { categoryValidator, conditionValidator } from "./schema";
import { requireToolOwner, requireUser } from "./lib/access";
import { isOutToday, todayUtc } from "./lib/loanRules";
import { isToolIcon } from "../lib/toolIcons";
import { scheduleNotification } from "./automation";

export const MAX_TOOL_NAME = 80;
export const MAX_TOOL_DESCRIPTION = 500;
// shortcut: lists read at most this many rows; add pagination when a neighbourhood outgrows it.
const LIST_LIMIT = 300;

const toolInput = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  icon: v.string(),
  description: v.string(),
};

type ToolInput = {
  name: string;
  category: Doc<"tools">["category"];
  condition: Doc<"tools">["condition"];
  icon: string;
  description: string;
};

function cleanToolInput(input: ToolInput): ToolInput {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) throw new ConvexError("Give the tool a name.");
  if (name.length > MAX_TOOL_NAME) throw new ConvexError(`Keep the name under ${MAX_TOOL_NAME} characters.`);
  if (description.length > MAX_TOOL_DESCRIPTION) {
    throw new ConvexError(`Keep the description under ${MAX_TOOL_DESCRIPTION} characters.`);
  }
  if (!isToolIcon(input.icon)) throw new ConvexError("Pick an icon from the list.");
  return { ...input, name, description };
}

export type ToolStatus = "available" | "on_loan";

/** Derived, never stored: on loan when an approved loan covers today. */
export async function toolAvailability(
  ctx: QueryCtx,
  toolId: Id<"tools">,
  today: string,
): Promise<{ status: ToolStatus; until?: string }> {
  const approved = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .collect();
  const current = approved.find((loan) => isOutToday(loan, today));
  return current ? { status: "on_loan", until: current.endDate } : { status: "available" };
}

/** Public landing page: available tools only, and nothing about who owns them. */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const today = todayUtc(Date.now());
    const tools = await ctx.db.query("tools").order("desc").take(LIST_LIMIT);
    const listed = tools.filter((t) => t.removedAt === undefined);
    const rows = await Promise.all(
      listed.map(async (t) => ({ tool: t, availability: await toolAvailability(ctx, t._id, today) })),
    );
    return rows
      .filter((r) => r.availability.status === "available")
      .map(({ tool }) => ({ name: tool.name, category: tool.category, icon: tool.icon }));
  },
});

/** Every listed tool for signed-in neighbours, with owner name and availability. */
export const list = query({
  args: { category: v.optional(categoryValidator) },
  handler: async (ctx, { category }) => {
    const { user } = await requireUser(ctx);
    const today = todayUtc(Date.now());
    const tools = category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", category))
          .order("desc")
          .take(LIST_LIMIT)
      : await ctx.db.query("tools").order("desc").take(LIST_LIMIT);
    const myPending = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    const pendingToolIds = new Set(myPending.map((l) => l.toolId));

    return Promise.all(
      tools
        .filter((t) => t.removedAt === undefined)
        .map(async (t) => {
          const owner = await ctx.db.get(t.ownerId);
          const availability = await toolAvailability(ctx, t._id, today);
          return {
            _id: t._id,
            name: t.name,
            category: t.category,
            condition: t.condition,
            icon: t.icon,
            description: t.description,
            owner: { name: owner?.name ?? "A neighbour", trusted: owner?.trustedLender ?? false },
            isMine: t.ownerId === user._id,
            requestPending: pendingToolIds.has(t._id),
            ...availability,
          };
        }),
    );
  },
});

/** The caller's own listings. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const today = todayUtc(Date.now());
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
    return Promise.all(
      tools
        .filter((t) => t.removedAt === undefined)
        .map(async (t) => ({
          _id: t._id,
          name: t.name,
          category: t.category,
          condition: t.condition,
          icon: t.icon,
          description: t.description,
          ...(await toolAvailability(ctx, t._id, today)),
        })),
    );
  },
});

export const create = mutation({
  args: toolInput,
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    return ctx.db.insert("tools", { ...cleanToolInput(args), ownerId: user._id });
  },
});

export const update = mutation({
  args: { toolId: v.id("tools"), ...toolInput },
  handler: async (ctx, { toolId, ...fields }) => {
    await requireToolOwner(ctx, toolId);
    await ctx.db.patch(toolId, cleanToolInput(fields));
  },
});

/** Soft delete. Refused while an approved loan is out or booked; pending requests are cancelled. */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const { tool } = await requireToolOwner(ctx, toolId);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", toolId))
      .collect();
    if (loans.some((l) => l.status === "approved")) {
      throw new ConvexError(`The ${tool.name.toLowerCase()} has an approved loan. Mark it returned before removing it.`);
    }
    for (const loan of loans.filter((l) => l.status === "pending")) {
      await ctx.db.patch(loan._id, { status: "cancelled" });
      await scheduleNotification(ctx, loan._id, "cancelled", "borrower");
    }
    await ctx.db.patch(toolId, { removedAt: Date.now() });
  },
});
