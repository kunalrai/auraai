import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

const DEFAULT_MODEL = "gemini-3-flash-preview";

export const getAiModel = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return existing?.aiModel ?? DEFAULT_MODEL;
  },
});

export const getAiModelInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return existing?.aiModel ?? DEFAULT_MODEL;
  },
});

export const saveAiModel = mutation({
  args: { userId: v.string(), aiModel: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { aiModel: args.aiModel });
    } else {
      await ctx.db.insert("settings", { userId: args.userId, aiModel: args.aiModel });
    }
  },
});
