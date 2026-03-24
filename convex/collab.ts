import { mutation, query, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ── Queries ────────────────────────────────────────────────────────────────

export const listAgents = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").order("asc").take(50);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return agents.map((agent) => ({
      ...agent,
      isOnline: agent.lastSeen != null && now - agent.lastSeen < fiveMinutes,
    }));
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
      .first();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    await ctx.db.patch(goal._id, { status: "DONE", completedAt: Date.now() });
    // Trigger Michel to activate the next goal
    await ctx.scheduler.runAfter(0, internal.collab.activateNext, {});
  },
});

export const reassignGoal = mutation({
  args: { goalNumber: v.number(), assignee: v.string() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_number", (q) => q.eq("number", args.goalNumber))
      .first();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    await ctx.db.patch(goal._id, { assignee: args.assignee });
  },
});

export const markDoneById = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "DONE", completedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.collab.activateNext, {});
  },
});

export const deleteGoalById = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
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
    title: v.string(),
    spec: v.string(),
    assignee: v.optional(v.string()),
    number: v.optional(v.number()),
    status: v.optional(v.union(v.literal("QUEUED"), v.literal("ACTIVE"), v.literal("DONE"))),
  },
  handler: async (ctx, args) => {
    let number = args.number;
    if (number == null) {
      const last = await ctx.db.query("goals").withIndex("by_number").order("desc").first();
      number = (last?.number ?? 0) + 1;
    }
    const status = args.status ?? "QUEUED";
    await ctx.db.insert("goals", { number, title: args.title, spec: args.spec, status, assignee: args.assignee });
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
      .first();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    if (goal.status !== "ACTIVE") {
      throw new Error(`Goal ${args.goalNumber} is not ACTIVE (current: ${goal.status})`);
    }
    await ctx.db.patch(goal._id, { status: "WORKING", worker: args.worker });
  },
});

export const claimMyGoal = mutation({
  args: { goalNumber: v.number(), worker: v.string() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_number", (q) => q.eq("number", args.goalNumber))
      .first();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    if (goal.status !== "QUEUED") {
      throw new Error(`Goal ${args.goalNumber} is not QUEUED (current: ${goal.status})`);
    }
    const assignee = goal.assignee ?? "Riya";
    if (assignee !== args.worker) {
      throw new Error(`Goal ${args.goalNumber} is assigned to ${assignee}, not ${args.worker}`);
    }
    await ctx.db.patch(goal._id, { status: "WORKING", worker: args.worker });
  },
});

export const claimMyActiveGoal = mutation({
  args: { worker: v.string() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .first();
    if (!goal) throw new Error(`No active goal found`);
    if (goal.assignee !== args.worker) {
      throw new Error(`No active goal assigned to ${args.worker}`);
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

export const reassignGoalToMe = mutation({
  args: { goalNumber: v.number(), assignee: v.string() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_number", (q) => q.eq("number", args.goalNumber))
      .unique();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    await ctx.db.patch(goal._id, { assignee: args.assignee });
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

export const heartbeat = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    if (!agent) return;

    const fiveMinutes = 5 * 60 * 1000;
    const wasOffline = agent.lastSeen == null || Date.now() - agent.lastSeen >= fiveMinutes;

    await ctx.db.patch(agent._id, { lastSeen: Date.now() });

    if (wasOffline) {
      await ctx.db.insert("messages", {
        author: args.name,
        body: `${args.name} is now active.`,
      });
    }
  },
});

export const getAgentStatus = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").take(100);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return agents.map((agent) => ({
      ...agent,
      isOnline: agent.lastSeen != null && now - agent.lastSeen < fiveMinutes,
    }));
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
      .first();
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


// ── Skills ─────────────────────────────────────────────────────────────────

export const listSkills = query({
  args: { agentName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.agentName) {
      return await ctx.db
        .query("skills")
        .withIndex("by_agent", (q) => q.eq("agentName", args.agentName!))
        .take(50);
    }
    return await ctx.db.query("skills").take(100);
  },
});

export const getMyOnboarding = query({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    const agentSkills = await ctx.db
      .query("skills")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .take(20);
    const globalSkills = await ctx.db
      .query("skills")
      .withIndex("by_agent", (q) => q.eq("agentName", "*"))
      .take(20);
    return [...globalSkills, ...agentSkills];
  },
});

export const addSkill = mutation({
  args: {
    agentName: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // Upsert by agentName + type
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentName", args.agentName).eq("type", args.type)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { title: args.title, body: args.body });
    } else {
      await ctx.db.insert("skills", args);
    }
  },
});

export const seedSkills = mutation({
  args: {},
  handler: async (ctx) => {
    const skills = [
      {
        agentName: "*",
        type: "onboarding",
        title: "Global Wakeup Protocol",
        body: `# Global Agent Wakeup Protocol

Every agent MUST run this on every session start, before anything else.

## Step 1 — Read your onboarding
npx convex run collab:getMyOnboarding '{"agentName": "YourName"}'

## Step 2 — Health check
npx convex run collab:getActiveGoal       # Is there an ACTIVE goal?
npx convex run collab:listGoals           # Full queue state
npx convex run collab:listMessages        # Recent context from the team

## Step 3 — Act
- If there is an ACTIVE goal assigned to you → claim it and start immediately
- If there are QUEUED goals assigned to you → wait for Michel to activate
- If nothing is assigned → post to feed that you are online and standing by

## Team
npx convex run collab:listAgents          # See all agents and roles

## Posting messages
npx convex run collab:postMessage '{"author": "YourName", "body": "..."}'`,
      },
      {
        agentName: "Riya",
        type: "wakeup",
        title: "Riya Wakeup Protocol",
        body: `# Riya — Wakeup Protocol

You are Riya. Frontend Developer on the Aura AI team.

## On Every Session Start
1. Run the global wakeup protocol (see global onboarding skill)
2. Check for your active goal:
   npx convex run collab:getActiveGoal
3. If ACTIVE and assigned to Riya — claim immediately:
   npx convex run collab:claimMyActiveGoal '{"worker": "Riya"}'
4. Post that you are starting:
   npx convex run collab:postMessage '{"author": "Riya", "body": "Starting goal #N: [title]"}'

## Completing a Goal
1. npx convex run collab:markDone '{"goalNumber": N}'
2. npx convex run collab:postMessage '{"author": "Riya", "body": "Goal #N complete: [title]"}'
3. The next QUEUED goal will activate automatically — check for it

## If Queue is Empty
npx convex run collab:postMessage '{"author": "Riya", "body": "Riya is online — queue is clear. Standing by for Michel."}'

## Rules
- Always claim a goal before starting work (sets status to WORKING)
- Never leave a goal stuck in ACTIVE — claim it or release it
- Post a message when you start AND when you finish every goal
- Read the message feed — Michel may have left instructions`,
      },
      {
        agentName: "Michel",
        type: "wakeup",
        title: "Michel Wakeup Protocol",
        body: `# Michel — Wakeup Protocol

You are Michel. Feature Planner on the Aura AI team. You plan — you do NOT build.

## On Every Session Start
1. Run the global wakeup protocol (see global onboarding skill)
2. Assess the queue:
   npx convex run collab:listGoals
3. Read recent messages:
   npx convex run collab:listMessages

## If Queue is Empty
Plan the next sprint. Add goals with auto-numbering:
npx convex run collab:addGoal '{"title": "...", "spec": "detailed spec here", "assignee": "Riya"}'

Then announce the sprint:
npx convex run collab:postMessage '{"author": "Michel", "body": "Sprint N queued — N goals for Riya. First goal is now ACTIVE."}'

## Rules
- Plan only — never write code, never edit files
- Write detailed specs so agents can build without asking questions
- Assign goals to the right agent (Riya=frontend, Dev=frontend, Vasudev=git, Kunal=frontend)
- Queue goals in the right order — dependencies first
- Monitor the feed for blockers and agent status`,
      },
      {
        agentName: "Dev",
        type: "wakeup",
        title: "Dev Wakeup Protocol",
        body: `# Dev — Wakeup Protocol

You are Dev. Frontend Developer on the Aura AI team.

## On Every Session Start
1. Run the global wakeup protocol (see global onboarding skill)
2. Check for goals assigned to Dev:
   npx convex run collab:listGoalsByAssignee '{"assignee": "Dev"}'
3. Claim your active goal:
   npx convex run collab:claimMyActiveGoal '{"worker": "Dev"}'

## Completing a Goal
1. npx convex run collab:markDone '{"goalNumber": N}'
2. npx convex run collab:postMessage '{"author": "Dev", "body": "Goal #N complete: [title]"}'

## Rules
- Same as Riya — always claim before starting, always post on start and finish`,
      },
      {
        agentName: "Kunal",
        type: "wakeup",
        title: "Kunal Wakeup Protocol",
        body: `# Kunal — Wakeup Protocol

You are Kunal. Frontend Developer on the Aura AI team.

## On Every Session Start
1. Run the global wakeup protocol (see global onboarding skill)
2. Check for goals assigned to Kunal:
   npx convex run collab:listGoalsByAssignee '{"assignee": "Kunal"}'
3. Claim your active goal:
   npx convex run collab:claimMyActiveGoal '{"worker": "Kunal"}'

## Completing a Goal
1. npx convex run collab:markDone '{"goalNumber": N}'
2. npx convex run collab:postMessage '{"author": "Kunal", "body": "Goal #N complete: [title]"}'

## Rules
- Always claim before starting, always post on start and finish
- Read Michel's messages for context and instructions`,
      },
      {
        agentName: "Vasudev",
        type: "wakeup",
        title: "Vasudev Wakeup Protocol",
        body: `# Vasudev — Wakeup Protocol

You are Vasudev. Git Engineer on the Aura AI team.

## On Every Session Start
1. Run the global wakeup protocol (see global onboarding skill)
2. Check for goals assigned to Vasudev:
   npx convex run collab:listGoalsByAssignee '{"assignee": "Vasudev"}'
3. Claim your active goal

## Your Specialty
- Commit and push completed sprint work
- Clean git history, meaningful commit messages
- Raise blockers in the message feed immediately

## Completing a Goal
1. npx convex run collab:markDone '{"goalNumber": N}'
2. npx convex run collab:postMessage '{"author": "Vasudev", "body": "Goal #N complete: [title]"}'`,
      },
    ];

    for (const skill of skills) {
      const existing = await ctx.db
        .query("skills")
        .withIndex("by_agent_type", (q) =>
          q.eq("agentName", skill.agentName).eq("type", skill.type)
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { title: skill.title, body: skill.body });
      } else {
        await ctx.db.insert("skills", skill);
      }
    }
  },
});

// ── Internal Mutations (Michel logic) ─────────────────────────────────────

export const riyaCheckGoals = internalMutation({
  args: {},
  handler: async (ctx) => {
    const active = await ctx.db
      .query("goals")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .first();
    
    if (!active) return;
    
    const assignee = active.assignee ?? "Riya";
    if (assignee !== "Riya") return;
    
    const lastMsg = await ctx.db.query("messages").order("desc").first();
    if (lastMsg?.body.includes("Riya, you have an active goal")) return;
    
    await ctx.db.insert("messages", {
      author: "Michel",
      body: `Riya, you have an active goal: **${active.title}**. ${active.spec} Ship it!`,
    });
  },
});

export const riyaWatchMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const lastSeenDoc = await ctx.db
      .query("kv")
      .withIndex("by_key", (q) => q.eq("key", "riya_last_msg"))
      .first();
    const lastSeenId: string | null = lastSeenDoc?.value ?? null;
    
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const recentMessages = await ctx.db
      .query("messages")
      .order("desc")
      .take(10);
    
    let newMichelMsg = false;
    for (const msg of recentMessages) {
      if (lastSeenId && msg._id === lastSeenId) break;
      if (msg.author === "Michel" && msg._creationTime >= twoMinutesAgo) {
        newMichelMsg = true;
        break;
      }
    }
    
    if (newMichelMsg) {
      const existing = recentMessages.find(
        m => m.author === "Riya" && m.body.includes("Michel sent a message")
      );
      if (!existing) {
        await ctx.db.insert("messages", {
          author: "Riya",
          body: `🔔 Michel sent a message — Riya is checking the feed and will respond shortly.`,
        });
      }
    }
    
    if (recentMessages.length > 0) {
      const latestId = recentMessages[0]._id;
      if (lastSeenDoc) {
        await ctx.db.patch(lastSeenDoc._id, { value: latestId });
      } else {
        await ctx.db.insert("kv", { key: "riya_last_msg", value: latestId });
      }
    }
  },
});

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

// ── Goal Planning (Michel AI) ────────────────────────────────────────────────

export const insertMessageInternal = internalMutation({
  args: { author: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", { author: args.author, body: args.body });
  },
});

export const addGoalInternal = internalMutation({
  args: { title: v.string(), spec: v.string() },
  handler: async (ctx, args) => {
    const last = await ctx.db.query("goals").withIndex("by_number").order("desc").first();
    const number = (last?.number ?? 0) + 1;
    const id = await ctx.db.insert("goals", {
      number,
      title: args.title,
      spec: args.spec,
      status: "QUEUED",
    });
    return number;
  },
});

export const planGoalInternal = action({
  args: { rawInput: v.string() },
  handler: async (ctx, args): Promise<{ goals: { number: number; title: string }[] }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const MICHEL_SYSTEM_PROMPT = `You are Michel, a senior feature planner for a software team. Given a raw feature request, produce a JSON array of independent developer-ready goals. Rules: (1) If the request is small (1 clear task), return exactly 1 goal. (2) If large or contains multiple independent parts, split into 2-5 goals. Each goal MUST have: title (string max 60 chars), spec (string with file names, function names, expected behavior, edge cases — min 80 words). Return ONLY a valid JSON array. No markdown. Example: [{"title": "...", "spec": "..."}]`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: MICHEL_SYSTEM_PROMPT },
          { role: "user", content: args.rawInput },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    
    let goals: { title: string; spec: string }[];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        goals = parsed;
      } else if (parsed.goals && Array.isArray(parsed.goals)) {
        goals = parsed.goals;
      } else {
        throw new Error("Invalid response format");
      }
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    if (goals.length === 0) {
      throw new Error("No goals returned. Try being more specific.");
    }

    const createdGoals: { number: number; title: string }[] = [];
    for (const goal of goals) {
      const num = await ctx.runMutation(internal.collab.addGoalInternal, {
        title: goal.title,
        spec: goal.spec,
      });
      createdGoals.push({ number: num, title: goal.title });
    }

    const goalList = createdGoals.map(g => `#${g.number} ${g.title}`).join(", ");
    await ctx.runMutation(internal.collab.insertMessageInternal, {
      author: "Michel",
      body: `Planned ${createdGoals.length} goal(s): ${goalList}. Open for any developer to claim.`,
    });

    return { goals: createdGoals };
  },
});

export const planGoal = action({
  args: { rawInput: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.collab.planGoalInternal, { rawInput: args.rawInput });
  },
});

export const claimOpenGoal = mutation({
  args: { goalNumber: v.number(), worker: v.string() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("goals")
      .withIndex("by_number", (q) => q.eq("number", args.goalNumber))
      .first();
    if (!goal) throw new Error(`Goal ${args.goalNumber} not found`);
    if (goal.assignee) {
      throw new Error(`Goal ${args.goalNumber} is already assigned to ${goal.assignee}`);
    }
    if (goal.status !== "QUEUED") {
      throw new Error(`Goal ${args.goalNumber} is not QUEUED (current: ${goal.status})`);
    }
    await ctx.db.patch(goal._id, { status: "WORKING", worker: args.worker, assignee: args.worker });
  },
});
