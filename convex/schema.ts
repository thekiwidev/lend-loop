import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const categoryValidator = v.union(
  v.literal("power"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("other"),
);

export const conditionValidator = v.union(
  v.literal("new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("worn"),
);

export const loanStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);

export const automationKindValidator = v.union(
  v.literal("request_notification"),
  v.literal("overdue_reminder"),
  v.literal("workflow_error"),
);

export const automationStatusValidator = v.union(v.literal("sent"), v.literal("failed"));

export default defineSchema({
  // Role is not stored here: it lives in Clerk public metadata and arrives in the signed JWT.
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    trustedLender: v.boolean(),
  }).index("by_clerkId", ["clerkId"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    icon: v.string(),
    description: v.string(),
    removedAt: v.optional(v.number()),
  })
    .index("by_category", ["category"])
    .index("by_owner", ["ownerId"]),

  loans: defineTable({
    toolId: v.id("tools"),
    // Denormalised from the tool so access checks need one read.
    ownerId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatusValidator,
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool", ["toolId"])
    .index("by_tool_status", ["toolId", "status"])
    .index("by_borrower", ["borrowerId"])
    .index("by_borrower_status", ["borrowerId", "status"])
    .index("by_owner", ["ownerId"])
    .index("by_owner_status", ["ownerId", "status"])
    .index("by_status", ["status"]),

  automationEvents: defineTable({
    // Absent for workflow-level errors that cannot be tied to one loan.
    loanId: v.optional(v.id("loans")),
    kind: automationKindValidator,
    idempotencyKey: v.string(),
    status: automationStatusValidator,
    at: v.number(),
    detail: v.optional(v.string()),
  })
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_status", ["status"])
    .index("by_loan", ["loanId"]),
});
