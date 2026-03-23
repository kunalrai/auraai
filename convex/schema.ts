import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  goals: defineTable({
    number: v.number(),
    title: v.string(),
    status: v.union(
      v.literal("QUEUED"),
      v.literal("ACTIVE"),
      v.literal("WORKING"),
      v.literal("DONE")
    ),
    spec: v.string(),
    completedAt: v.optional(v.number()),
    assignee: v.optional(v.string()),
    worker: v.optional(v.string()),
  }).index("by_number", ["number"]).index("by_status", ["status"]).index("by_assignee", ["assignee"]),

  messages: defineTable({
    author: v.string(),
    body: v.string(),
  }),

  agents: defineTable({
    name: v.string(),
    role: v.string(),
    color: v.string(),
  }),

  docs: defineTable({
    slug: v.string(),
    title: v.string(),
    body: v.string(),
  }).index("by_slug", ["slug"]),
});
