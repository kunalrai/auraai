import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

function getCurrentBillingPeriod(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const getOrCreateSummaryRow = internalMutation({
  args: { doctorId: v.string(), billingPeriod: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("usageSummary")
      .withIndex("by_doctor_period", (q) =>
        q.eq("doctorId", args.doctorId).eq("billingPeriod", args.billingPeriod)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("usageSummary", {
      doctorId: args.doctorId,
      billingPeriod: args.billingPeriod,
      smsSent: 0,
      callsMade: 0,
      tokenPrompt: 0,
      tokenCompletion: 0,
      tokenTotal: 0,
      lastUpdatedAt: Date.now(),
    });
  },
});

export const incrementSms = internalMutation({
  args: { doctorId: v.string(), period: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("usageSummary")
      .withIndex("by_doctor_period", (q) =>
        q.eq("doctorId", args.doctorId).eq("billingPeriod", args.period)
      )
      .first();

    if (row) {
      await ctx.db.patch(row._id, {
        smsSent: row.smsSent + 1,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});

export const incrementCall = internalMutation({
  args: { doctorId: v.string(), period: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("usageSummary")
      .withIndex("by_doctor_period", (q) =>
        q.eq("doctorId", args.doctorId).eq("billingPeriod", args.period)
      )
      .first();

    if (row) {
      await ctx.db.patch(row._id, {
        callsMade: row.callsMade + 1,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});

export const incrementTokens = internalMutation({
  args: {
    doctorId: v.string(),
    period: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("usageSummary")
      .withIndex("by_doctor_period", (q) =>
        q.eq("doctorId", args.doctorId).eq("billingPeriod", args.period)
      )
      .first();

    if (row) {
      await ctx.db.patch(row._id, {
        tokenPrompt: row.tokenPrompt + args.promptTokens,
        tokenCompletion: row.tokenCompletion + args.completionTokens,
        tokenTotal: row.tokenTotal + args.totalTokens,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});
