import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const authStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return { userId: identity.subject, email: identity.email };
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("doctors")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const createProfile = mutation({
  args: {
    name: v.string(),
    clinicName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("doctors")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        clinicName: args.clinicName,
        email: args.email,
        phone: args.phone,
      });
      return existing._id;
    }

    return await ctx.db.insert("doctors", {
      userId: identity.subject,
      name: args.name,
      clinicName: args.clinicName,
      email: args.email,
      phone: args.phone,
      createdAt: Date.now(),
    });
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    clinicName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const profile = await ctx.db
      .query("doctors")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile) throw new Error("Doctor profile not found");

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.clinicName !== undefined) updates.clinicName = args.clinicName;
    if (args.phone !== undefined) updates.phone = args.phone;

    await ctx.db.patch(profile._id, updates);
  },
});
