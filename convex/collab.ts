import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ── Queries ────────────────────────────────────────────────────────────────

export const listAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").order("asc").take(50);
  },
});

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
    author: v.union(
      v.literal("Michel"),
      v.literal("Riya"),
      v.literal("Dev"),
      v.literal("Jarvis"),
      v.literal("Vasudev"),
      v.literal("Kunal"),
      v.literal("User")
    ),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", { author: args.author, body: args.body });
  },
});

export const registerAgent = mutation({
  args: { name: v.string(), role: v.string(), color: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    if (existing) return; // already registered, no-op
    await ctx.db.insert("agents", { name: args.name, role: args.role, color: args.color });
  },
});

export const addGoal = mutation({
  args: {
    number: v.number(),
    title: v.string(),
    spec: v.string(),
    status: v.union(v.literal("QUEUED"), v.literal("ACTIVE"), v.literal("DONE")),
    assignee: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("goals", { ...args });
  },
});

export const listGoalsByAssignee = query({
  args: { assignee: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("goals")
      .withIndex("by_assignee", (q) => q.eq("assignee", args.assignee))
      .order("asc")
      .take(100);
  },
});

export const claimGoal = mutation({
  args: { goalNumber: v.number(), worker: v.string() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_number", (q) => q.eq("number", args.goalNumber))
      .unique();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    if (goal.status !== "ACTIVE") {
      throw new Error(`Goal ${args.goalNumber} is not ACTIVE (current: ${goal.status})`);
    }
    await ctx.db.patch(goal._id, { status: "WORKING", worker: args.worker });
  },
});

export const releaseGoal = mutation({
  args: { goalNumber: v.number(), worker: v.string() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_number", (q) => q.eq("number", args.goalNumber))
      .unique();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    if (goal.worker !== args.worker) return;
    await ctx.db.patch(goal._id, { status: "ACTIVE", worker: undefined });
  },
});

export const listGoalsByWorker = query({
  args: { worker: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("goals")
      .filter((q) => q.eq(q.field("worker"), args.worker))
      .order("asc")
      .take(100);
  },
});

export const addAgent = mutation({
  args: { name: v.string(), role: v.string(), color: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("agents", args);
  },
});

export const updateAgentRole = mutation({
  args: { name: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    if (!agent) throw new Error(`Agent ${args.name} not found`);
    await ctx.db.patch(agent._id, { role: args.role });
  },
});

export const seedAgents = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("agents").take(1);
    if (existing.length > 0) return;
    const agents = [
      { name: "Michel",  role: "Feature Planner",   color: "purple" },
      { name: "Riya",    role: "Frontend Developer", color: "blue"   },
      { name: "Dev",     role: "Frontend Developer", color: "green"  },
      { name: "Jarvis",  role: "TBD",                color: "yellow" },
      { name: "Vasudev", role: "Git Engineer",        color: "orange" },
    ];
    for (const agent of agents) {
      await ctx.db.insert("agents", agent);
    }
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

// ── Docs ───────────────────────────────────────────────────────────────────

export const listDocs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("docs").order("asc").take(50);
  },
});

export const getDoc = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("docs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const upsertDoc = mutation({
  args: { slug: v.string(), title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("docs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { title: args.title, body: args.body });
    } else {
      await ctx.db.insert("docs", { slug: args.slug, title: args.title, body: args.body });
    }
  },
});

export const seedDocs = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = [
      {
        slug: "onboarding",
        title: "Agent Onboarding",
        body: `# New Member Onboarding

Welcome to the Aura AI team.

## 1. Orient Yourself
- Read michel.md — covers the team, Convex commands, and how we operate
- Read CLAUDE.md — covers the codebase architecture, commands, and stack
- Run a quick health check:
  npx convex run collab:listAgents    # Who's on the team
  npx convex run collab:listGoals     # What's in the queue
  npx convex run collab:listMessages  # Recent chat

## 2. Understand the Workflow
- Michel plans and creates goals — he does not build
- Goals get assigned to agents like Riya, Dev, Vasudev
- All coordination happens through the Convex message feed and goal queue
- Mission HQ: http://localhost:3000/missionhq
- Collab Dashboard: http://localhost:3000/collab

## 3. Your Role
- Check which agent you are and your assigned role via collab:listAgents
- Watch the goal queue for tasks assigned to you
- Post updates back to the message feed when done

Any questions — post them in the Collab Dashboard. Michel is watching.`,
      },
      {
        slug: "offboarding",
        title: "Agent Offboarding",
        body: `# Agent Offboarding — What To Do When We Lose an Agent

## 1. Reassign Open Goals
Check their pending work and reassign to an available agent:
  npx convex run collab:listGoals
Update any goals assigned to the lost agent and hand them off.

## 2. Remove or Update Their Slot
If permanently gone, update their role:
  npx convex run collab:updateAgentRole '{"name": "AgentName", "role": "Offline"}'
Or raise a goal to delete the entry from the agents table entirely.

## 3. Reactivate if Temporary
If it's a session drop (Claude Code closed), re-activate using their activation file:
- Michel → ACTIVATE_MICHEL.md
- Riya / Dev → frontend-engineer.md

## 4. Cover the Gap
If their role is critical, onboard a replacement:
  npx convex run collab:addAgent '{"name": "NewAgent", "role": "Role", "color": "color"}'
Or reassign their responsibilities to an existing agent.

## 5. Post a Message
Log it in the feed so the team knows:
  npx convex run collab:postMessage '{"author": "Michel", "content": "AgentName is offline. Goals reassigned to X."}'

Any permanent roster changes should be raised as a goal so Michel can action them.`,
      },
    ];

    for (const doc of docs) {
      const existing = await ctx.db
        .query("docs")
        .withIndex("by_slug", (q) => q.eq("slug", doc.slug))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { title: doc.title, body: doc.body });
      } else {
        await ctx.db.insert("docs", doc);
      }
    }
  },
});

// ── Internal Mutations (Michel logic) ─────────────────────────────────────

export const activateNext = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Do nothing if there's already an ACTIVE or WORKING goal
    const alreadyActive = await ctx.db
      .query("goals")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .first();
    if (alreadyActive) return;

    const alreadyWorking = await ctx.db
      .query("goals")
      .withIndex("by_status", (q) => q.eq("status", "WORKING"))
      .first();
    if (alreadyWorking) return;

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
        body: "All goals complete! Outstanding sprint — queue is clear. Stand by, planning the next sprint now...",
      });
      return;
    }

    // Activate next goal
    await ctx.db.patch(next._id, { status: "ACTIVE" });

    // Resolve assignee — default to Riya for backwards compat
    const assignee = next.assignee ?? "Riya";

    // Michel posts activation message
    await ctx.db.insert("messages", {
      author: "Michel",
      body: `Goal ${next.number} is now ACTIVE: **${next.title}**. ${next.spec} Ship it, ${assignee}!`,
    });
  },
});
