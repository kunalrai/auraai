import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

function getCurrentBillingPeriod(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const recordUsageInternal = internalMutation({
  args: {
    userId: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();
    await ctx.db.insert("tokenUsage", {
      userId: args.userId,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      createdAt,
    });

    const period = getCurrentBillingPeriod(createdAt);
    await ctx.runMutation(internal.billing.getOrCreateSummaryRow, {
      doctorId: args.userId,
      billingPeriod: period,
    });
    await ctx.runMutation(internal.billing.incrementTokens, {
      doctorId: args.userId,
      period,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
    });
  },
});

export const recordUsage = mutation({
  args: {
    userId: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();
    await ctx.db.insert("tokenUsage", {
      userId: args.userId,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      createdAt,
    });

    const period = getCurrentBillingPeriod(createdAt);
    await ctx.runMutation(internal.billing.getOrCreateSummaryRow, {
      doctorId: args.userId,
      billingPeriod: period,
    });
    await ctx.runMutation(internal.billing.incrementTokens, {
      doctorId: args.userId,
      period,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
    });
  },
});

export const getSummary = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    if (identity.subject !== args.userId) throw new Error("Unauthorized");
    const records = await ctx.db
      .query("tokenUsage")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayStart = startOfToday.getTime();
    const startOfMonth = new Date(startOfToday);
    startOfMonth.setDate(1);
    const monthStart = startOfMonth.getTime();

    const byModel: Record<string, number> = {};
    let totalAll = 0;
    let totalToday = 0;
    let totalMonth = 0;

    for (const r of records) {
      totalAll += r.totalTokens;
      if (r.createdAt >= todayStart) totalToday += r.totalTokens;
      if (r.createdAt >= monthStart) totalMonth += r.totalTokens;
      byModel[r.model] = (byModel[r.model] ?? 0) + r.totalTokens;
    }

    return {
      totalAll,
      totalToday,
      totalMonth,
      byModel: Object.entries(byModel).map(([model, tokens]) => ({ model, tokens })),
    };
  },
});

export const getHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    if (identity.subject !== args.userId) throw new Error("Unauthorized");
    const records = await ctx.db
      .query("tokenUsage")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);

    return records.map((r) => ({
      model: r.model,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      createdAt: r.createdAt,
    }));
  },
});
