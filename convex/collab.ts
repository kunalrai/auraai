import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ── Queries ────────────────────────────────────────────────────────────────

export const listGoals = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("goals").withIndex("by_number").order("asc").take(100);
  },
});

export const listMessages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").order("asc").take(200);
  },
});

export const getActiveGoal = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("goals")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .first();
  },
});

// ── Public Mutations ───────────────────────────────────────────────────────

export const markDone = mutation({
  args: { goalNumber: v.number() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_number", (q) => q.eq("number", args.goalNumber))
      .unique();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    await ctx.db.patch(goal._id, { status: "DONE", completedAt: Date.now() });
    // Trigger Michel to activate the next goal
    await ctx.scheduler.runAfter(0, internal.collab.activateNext, {});
  },
});

export const postMessage = mutation({
  args: {
    author: v.union(v.literal("Michel"), v.literal("Riya"), v.literal("Dev"), v.literal("Jarvis"), v.literal("Vasudev")),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", { author: args.author, body: args.body });
  },
});

export const addGoal = mutation({
  args: {
    number: v.number(),
    title: v.string(),
    spec: v.string(),
    status: v.union(v.literal("QUEUED"), v.literal("ACTIVE"), v.literal("DONE")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("goals", { ...args });
  },
});

export const resetGoalToQueued = mutation({
  args: { goalNumber: v.number() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_number", (q) => q.eq("number", args.goalNumber))
      .unique();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    await ctx.db.patch(goal._id, { status: "QUEUED", completedAt: undefined });
  },
});

export const seedGoals = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("goals").take(1);
    if (existing.length > 0) return; // already seeded

    const goals = [
      { number: 6,  status: "DONE" as const,   title: "Patient Visit History",         spec: "Expandable visit history timeline per patient in PatientsView.tsx — sorted newest first, colour-coded status, notes snippet." },
      { number: 7,  status: "ACTIVE" as const,  title: "Email Reminder Support",        spec: "Add email reminder button using mailto: pre-filled with AI-generated reminder copy. Add to PatientsView.tsx and DoctorDashboard.tsx." },
      { number: 8,  status: "QUEUED" as const,  title: "Doctor Availability Setup",     spec: "Add availability section in SettingsView.tsx — day checkboxes + time range inputs. Save to doctors/{uid}. AI warns if slot outside hours." },
      { number: 9,  status: "QUEUED" as const,  title: "Bulk Appointment Actions",      spec: "Checkboxes on appointment cards. Floating action bar for batch Complete/Cancel/Delete. Select-all for current filter. Batch Firestore writes." },
      { number: 10, status: "QUEUED" as const,  title: "Recurring Appointments (AI)",   spec: "Extend parseBookingRequest() to detect recurrence field. AIAssistant creates multiple Firestore docs. Conflict detection applied per date." },
    ];

    for (const goal of goals) {
      await ctx.db.insert("goals", { ...goal, completedAt: goal.status === "DONE" ? Date.now() : undefined });
    }
  },
});

// ── Internal Mutations (Michel logic) ─────────────────────────────────────

export const activateNext = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Do nothing if there's already an ACTIVE goal
    const alreadyActive = await ctx.db
      .query("goals")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .first();
    if (alreadyActive) return;

    // Find the lowest-numbered QUEUED goal
    const next = await ctx.db
      .query("goals")
      .withIndex("by_status", (q) => q.eq("status", "QUEUED"))
      .order("asc")
      .first();

    if (!next) {
      // Check if there are any DONE goals — only announce if there are goals at all
      const anyDone = await ctx.db
        .query("goals")
        .withIndex("by_status", (q) => q.eq("status", "DONE"))
        .first();
      if (!anyDone) return; // No goals seeded yet, stay silent

      // All goals done — Michel announces completion once (check last message to avoid duplicates)
      const lastMsg = await ctx.db.query("messages").order("desc").first();
      if (lastMsg?.body.includes("queue is clear")) return;

      await ctx.db.insert("messages", {
        author: "Michel",
        body: "All goals complete! Outstanding sprint Riya — queue is clear. Stand by, planning the next sprint now...",
      });
      return;
    }

    // Activate next goal
    await ctx.db.patch(next._id, { status: "ACTIVE" });

    // Michel posts activation message
    await ctx.db.insert("messages", {
      author: "Michel",
      body: `Goal ${next.number} is now ACTIVE: **${next.title}**. ${next.spec} Ship it, Riya!`,
    });
  },
});
