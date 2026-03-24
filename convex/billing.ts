import { v } from "convex/values";
import { internalMutation, internalAction, query } from "./_generated/server";
import { internal, api } from "./_generated/api";

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

export const getMyCurrentPeriod = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const period = getCurrentBillingPeriod(Date.now());
    return await ctx.db
      .query("usageSummary")
      .withIndex("by_doctor_period", (q) =>
        q.eq("doctorId", identity.subject).eq("billingPeriod", period)
      )
      .first();
  },
});

export const getMyUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const rows = await ctx.db
      .query("usageSummary")
      .withIndex("by_doctor_period", (q) => q.eq("doctorId", identity.subject))
      .collect();
    return rows.sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod)).slice(0, 6);
  },
});

export const getAllDoctorUsage = query({
  args: { billingPeriod: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const adminUid = process.env.ADMIN_UID;
    if (!adminUid || identity.subject !== adminUid) throw new Error("Forbidden");
    return await ctx.db
      .query("usageSummary")
      .withIndex("by_period", (q) => q.eq("billingPeriod", args.billingPeriod))
      .collect();
  },
});

export const backfillAllPeriods = internalAction({
  args: {},
  handler: async (ctx) => {
    const doctors = new Map<string, Map<string, { smsSent: number; callsMade: number; tokenPrompt: number; tokenCompletion: number; tokenTotal: number }>>();

    const commLogs = await ctx.runQuery(api.commLog.scanAll, {});
    for (const log of commLogs) {
      const period = getCurrentBillingPeriod(log.sentAt);
      if (!doctors.has(log.doctorId)) doctors.set(log.doctorId, new Map());
      const periodMap = doctors.get(log.doctorId)!;
      if (!periodMap.has(period)) periodMap.set(period, { smsSent: 0, callsMade: 0, tokenPrompt: 0, tokenCompletion: 0, tokenTotal: 0 });
      const p = periodMap.get(period)!;
      if (log.type === "SMS" && log.status === "SENT") p.smsSent++;
      if (log.type === "CALL" && (log.status === "SENT" || log.status === "ANSWERED")) p.callsMade++;
    }

    const tokenRecords = await ctx.runQuery(api.tokenUsage.scanAll, {});
    for (const r of tokenRecords) {
      const period = getCurrentBillingPeriod(r.createdAt);
      if (!doctors.has(r.userId)) doctors.set(r.userId, new Map());
      const periodMap = doctors.get(r.userId)!;
      if (!periodMap.has(period)) periodMap.set(period, { smsSent: 0, callsMade: 0, tokenPrompt: 0, tokenCompletion: 0, tokenTotal: 0 });
      const p = periodMap.get(period)!;
      p.tokenPrompt += r.promptTokens;
      p.tokenCompletion += r.completionTokens;
      p.tokenTotal += r.totalTokens;
    }

    for (const [doctorId, periodMap] of doctors.entries()) {
      for (const [period, stats] of periodMap.entries()) {
        await ctx.runMutation(internal.billing.getOrCreateSummaryRow, { doctorId, billingPeriod: period });
        await ctx.runMutation(internal.billing.backfillSetRow, {
          doctorId,
          billingPeriod: period,
          smsSent: stats.smsSent,
          callsMade: stats.callsMade,
          tokenPrompt: stats.tokenPrompt,
          tokenCompletion: stats.tokenCompletion,
          tokenTotal: stats.tokenTotal,
        });
      }
    }

    return { doctorsProcessed: doctors.size };
  },
});

export const backfillSetRow = internalMutation({
  args: {
    doctorId: v.string(),
    billingPeriod: v.string(),
    smsSent: v.number(),
    callsMade: v.number(),
    tokenPrompt: v.number(),
    tokenCompletion: v.number(),
    tokenTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("usageSummary")
      .withIndex("by_doctor_period", (q) =>
        q.eq("doctorId", args.doctorId).eq("billingPeriod", args.billingPeriod)
      )
      .first();

    if (row) {
      await ctx.db.patch(row._id, {
        smsSent: args.smsSent,
        callsMade: args.callsMade,
        tokenPrompt: args.tokenPrompt,
        tokenCompletion: args.tokenCompletion,
        tokenTotal: args.tokenTotal,
        lastUpdatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("usageSummary", {
        doctorId: args.doctorId,
        billingPeriod: args.billingPeriod,
        smsSent: args.smsSent,
        callsMade: args.callsMade,
        tokenPrompt: args.tokenPrompt,
        tokenCompletion: args.tokenCompletion,
        tokenTotal: args.tokenTotal,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});
