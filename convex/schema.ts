import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  doctors: defineTable({
    userId: v.string(),
    name: v.string(),
    clinicName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

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
    lastSeen: v.optional(v.number()),
  }),

  kv: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  settings: defineTable({
    userId: v.string(),
    aiModel: v.string(),
  }).index("by_user", ["userId"]),

  tokenUsage: defineTable({
    userId: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_user_created", ["userId", "createdAt"]),

  skills: defineTable({
    agentName: v.string(), // "Riya" | "Michel" | "*" (global)
    type: v.string(),      // "wakeup" | "protocol" | "onboarding"
    title: v.string(),
    body: v.string(),
  }).index("by_agent", ["agentName"]).index("by_agent_type", ["agentName", "type"]),

  patients: defineTable({
    name: v.string(),
    dob: v.string(),
    phone: v.string(),
    doctorId: v.string(),
    visits: v.array(v.object({
      date: v.number(),
      diagnosis: v.string(),
      medications: v.string(),
      prescriptionUrl: v.optional(v.string()),
      doctorNote: v.optional(v.string()),
    })),
  }).index("by_doctor", ["doctorId"]),

  reminders: defineTable({
    patientId: v.id("patients"),
    patientName: v.string(),
    patientPhone: v.string(),
    reminderDate: v.number(),
    message: v.string(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("SENT"),
      v.literal("FAILED")
    ),
  }).index("by_status_date", ["status", "reminderDate"]),

  reminderLog: defineTable({
    reminderId: v.id("reminders"),
    sentAt: v.number(),
    responseCode: v.optional(v.number()),
    error: v.optional(v.string()),
  }),

  commLog: defineTable({
    doctorId: v.string(),
    patientId: v.id("patients"),
    patientName: v.string(),
    patientPhone: v.string(),
    type: v.union(v.literal("SMS"), v.literal("CALL")),
    status: v.union(v.literal("SENT"), v.literal("FAILED"), v.literal("ANSWERED"), v.literal("NO_ANSWER")),
    sentAt: v.number(),
    message: v.optional(v.string()),
    error: v.optional(v.string()),
  }).index("by_doctor", ["doctorId"]).index("by_patient", ["patientId"]),
});
