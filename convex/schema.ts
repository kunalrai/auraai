import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  goals: defineTable({
    number: v.number(),
    title: v.string(),
    status: v.union(
      v.literal("QUEUED"),
      v.literal("ACTIVE"),
      v.literal("DONE")
    ),
    spec: v.string(),
    completedAt: v.optional(v.number()),
  }).index("by_number", ["number"]).index("by_status", ["status"]),

  messages: defineTable({
    author: v.union(v.literal("Michel"), v.literal("Riya"), v.literal("Dev"), v.literal("Jarvis"), v.literal("Vasudev")),
    body: v.string(),
  }),
});
