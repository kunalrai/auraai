import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listQueued = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("goals")
      .withIndex("by_status", (q) => q.eq("status", "QUEUED"))
      .order("asc")
      .take(20);
  },
});

export const updateGoal = mutation({
  args: {
    id: v.id("goals"),
    status: v.union(
      v.literal("QUEUED"),
      v.literal("ACTIVE"),
      v.literal("WORKING"),
      v.literal("DONE")
    ),
    worker: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});
