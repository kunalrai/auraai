import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

interface CommLogSummary {
  totalSms: number;
  totalCalls: number;
  totalSent: number;
  totalFailed: number;
  todayCount: number;
  thisMonthCount: number;
}

export const record = mutation({
  args: {
    doctorId: v.string(),
    patientId: v.id("patients"),
    patientName: v.string(),
    patientPhone: v.string(),
    type: v.union(v.literal("SMS"), v.literal("CALL")),
    status: v.union(v.literal("SENT"), v.literal("FAILED"), v.literal("ANSWERED"), v.literal("NO_ANSWER")),
    message: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("commLog", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      patientName: args.patientName,
      patientPhone: args.patientPhone,
      type: args.type,
      status: args.status,
      sentAt: Date.now(),
      message: args.message,
      error: args.error,
    });
  },
});

export const getSummary = query({
  args: { doctorId: v.string() },
  handler: async (ctx, args): Promise<CommLogSummary> => {
    const logs = await ctx.db
      .query("commLog")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfDay);
    startOfMonth.setDate(1);

    const smsLogs = logs.filter((l) => l.type === "SMS");
    const callLogs = logs.filter((l) => l.type === "CALL");

    return {
      totalSms: smsLogs.length,
      totalCalls: callLogs.length,
      totalSent: logs.filter((l) => l.status === "SENT" || l.status === "ANSWERED").length,
      totalFailed: logs.filter((l) => l.status === "FAILED" || l.status === "NO_ANSWER").length,
      todayCount: logs.filter((l) => l.sentAt >= startOfDay.getTime()).length,
      thisMonthCount: logs.filter((l) => l.sentAt >= startOfMonth.getTime()).length,
    };
  },
});

export const getHistory = query({
  args: { doctorId: v.string(), type: v.optional(v.union(v.literal("SMS"), v.literal("CALL"))), status: v.optional(v.union(v.literal("SENT"), v.literal("FAILED"), v.literal("ANSWERED"), v.literal("NO_ANSWER"))) },
  handler: async (ctx, args) => {
    let logs = await ctx.db
      .query("commLog")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    if (args.type) {
      logs = logs.filter((l) => l.type === args.type);
    }
    if (args.status) {
      logs = logs.filter((l) => l.status === args.status);
    }

    return logs
      .sort((a, b) => b.sentAt - a.sentAt)
      .slice(0, 50);
  },
});
