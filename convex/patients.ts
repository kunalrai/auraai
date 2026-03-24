import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "./_generated/server";
import { internal, api } from "./_generated/api";

interface ExtractedPrescription {
  patientName: string;
  dob: string;
  phone: string;
  diagnosis: string;
  medications: string;
  followUpInterval: string | null;
}

interface ParsePrescriptionResult {
  success: boolean;
  error?: string;
  patientId?: string;
  patientName?: string;
  reminderDate?: number | null;
  followUpInterval?: string | null;
}

export const upsert = mutation({
  args: {
    name: v.string(),
    dob: v.string(),
    phone: v.string(),
    doctorId: v.string(),
    diagnosis: v.string(),
    medications: v.string(),
    prescriptionUrl: v.optional(v.string()),
    doctorNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .first();

    const visit = {
      date: Date.now(),
      diagnosis: args.diagnosis,
      medications: args.medications,
      prescriptionUrl: args.prescriptionUrl,
      doctorNote: args.doctorNote,
    };

    if (existing && existing.name === args.name && existing.phone === args.phone) {
      await ctx.db.patch(existing._id, {
        visits: [...existing.visits, visit],
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("patients", {
        name: args.name,
        dob: args.dob,
        phone: args.phone,
        doctorId: args.doctorId,
        visits: [visit],
      });
      return id;
    }
  },
});

export const upsertWithId = mutation({
  args: {
    patientId: v.id("patients"),
    diagnosis: v.string(),
    medications: v.string(),
    prescriptionUrl: v.optional(v.string()),
    doctorNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new Error("Patient not found");

    const visit = {
      date: Date.now(),
      diagnosis: args.diagnosis,
      medications: args.medications,
      prescriptionUrl: args.prescriptionUrl,
      doctorNote: args.doctorNote,
    };

    await ctx.db.patch(args.patientId, {
      visits: [...patient.visits, visit],
    });
  },
});

export const getByName = query({
  args: { doctorId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    const searchTerm = args.name.toLowerCase();
    return patients
      .filter((p) => p.name.toLowerCase().includes(searchTerm))
      .sort((a, b) => {
        const aLatest = a.visits[a.visits.length - 1]?.date ?? 0;
        const bLatest = b.visits[b.visits.length - 1]?.date ?? 0;
        return bLatest - aLatest;
      })
      .map((p) => ({
        ...p,
        latestVisit: p.visits[p.visits.length - 1] ?? null,
      }));
  },
});

export const getHistory = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) return null;
    return {
      ...patient,
      visits: [...patient.visits].sort((a, b) => b.date - a.date),
    };
  },
});

export const list = query({
  args: { doctorId: v.string() },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();
    return patients
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        ...p,
        latestVisit: p.visits[p.visits.length - 1] ?? null,
      }));
  },
});

export const listWithDateRange = query({
  args: { doctorId: v.string(), startDate: v.number(), endDate: v.number() },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    return patients
      .filter((p) =>
        p.visits.some((v) => v.date >= args.startDate && v.date <= args.endDate)
      )
      .map((p) => ({
        ...p,
        visits: p.visits.filter((v) => v.date >= args.startDate && v.date <= args.endDate),
      }))
      .sort((a, b) => {
        const aLatest = a.visits[a.visits.length - 1]?.date ?? 0;
        const bLatest = b.visits[b.visits.length - 1]?.date ?? 0;
        return bLatest - aLatest;
      });
  },
});

export const getById = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) return null;
    return {
      ...patient,
      latestVisit: patient.visits[patient.visits.length - 1] ?? null,
    };
  },
});

export const createReminder = mutation({
  args: {
    patientId: v.id("patients"),
    patientName: v.string(),
    patientPhone: v.string(),
    reminderDate: v.number(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reminders", {
      patientId: args.patientId,
      patientName: args.patientName,
      patientPhone: args.patientPhone,
      reminderDate: args.reminderDate,
      message: args.message,
      status: "PENDING",
    });
  },
});

export const listPendingReminders = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("reminders")
      .withIndex("by_status_date", (q) =>
        q.eq("status", "PENDING").lte("reminderDate", now)
      )
      .collect();
  },
});

export const markReminderSent = mutation({
  args: {
    reminderId: v.id("reminders"),
    responseCode: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reminderId, { status: "SENT" });
    await ctx.db.insert("reminderLog", {
      reminderId: args.reminderId,
      sentAt: Date.now(),
      responseCode: args.responseCode,
      error: args.error,
    });
  },
});

export const markReminderFailed = mutation({
  args: {
    reminderId: v.id("reminders"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reminderId, { status: "FAILED" });
    await ctx.db.insert("reminderLog", {
      reminderId: args.reminderId,
      sentAt: Date.now(),
      error: args.error,
    });
  },
});

export const parsePrescription = action({
  args: {
    storageId: v.string(),
    doctorId: v.string(),
  },
  handler: async (ctx, args: { storageId: string; doctorId: string }): Promise<{
    success: boolean;
    error?: string;
    patientId?: string;
    patientName?: string;
    reminderDate?: number | null;
    followUpInterval?: string | null;
  }> => {
    const imageUrl = await ctx.storage.getUrl(args.storageId as any);
    if (!imageUrl) {
      return { success: false, error: "Could not retrieve image from storage." };
    }

    const systemPrompt = `You are a medical data extractor. You will receive an image of a medical prescription. Extract the following fields and return ONLY valid JSON (no markdown, no explanation):
{
  "patientName": "string - extract the patient's full name",
  "dob": "string - date of birth in YYYY-MM-DD format if visible, otherwise empty string",
  "phone": "string - patient's phone number if visible, otherwise empty string",
  "diagnosis": "string - the diagnosis or condition mentioned",
  "medications": "string - comma-separated list of medications prescribed",
  "followUpInterval": "string - follow-up interval like '3 days', '2 weeks', '1 month', or null if not mentioned"
}
Return empty string for any field that cannot be determined from the image.`;

    const result = await ctx.runAction(api.ai.chatWithVision, {
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract patient information from this prescription image." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      userId: args.doctorId,
    });

    let extracted: ExtractedPrescription | null = null;

    try {
      const cleaned = result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(cleaned) as ExtractedPrescription;
    } catch {
      return { success: false, error: "Failed to parse AI response: " + result.text };
    }

    if (!extracted || !extracted.patientName) {
      return { success: false, error: "Could not extract patient name from the prescription." };
    }

    const patientId = await ctx.runMutation(internal.patients.upsertInternal, {
      name: extracted.patientName,
      dob: extracted.dob || "",
      phone: extracted.phone || "",
      doctorId: args.doctorId,
      diagnosis: extracted.diagnosis || "",
      medications: extracted.medications || "",
      prescriptionUrl: imageUrl,
      doctorNote: undefined,
    });

    let reminderDate: number | null = null;
    if (extracted.followUpInterval) {
      const now = Date.now();
      const interval = extracted.followUpInterval.toLowerCase();
      const match = interval.match(/(\d+)\s*(day|week|month)s?/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const msPerDay = 24 * 60 * 60 * 1000;
        if (unit === "day") reminderDate = now + value * msPerDay;
        else if (unit === "week") reminderDate = now + value * 7 * msPerDay;
        else if (unit === "month") reminderDate = now + value * 30 * msPerDay;
      }

      if (reminderDate) {
        await ctx.runMutation(api.patients.createReminder, {
          patientId,
          patientName: extracted.patientName,
          patientPhone: extracted.phone || "",
          reminderDate,
          message: "Your follow-up visit is due. Please call the clinic to book.",
        });
      }
    }

    return {
      success: true,
      patientId,
      patientName: extracted.patientName,
      reminderDate,
      followUpInterval: extracted.followUpInterval,
    };
  },
});

export const upsertInternal = internalMutation({
  args: {
    name: v.string(),
    dob: v.string(),
    phone: v.string(),
    doctorId: v.string(),
    diagnosis: v.string(),
    medications: v.string(),
    prescriptionUrl: v.optional(v.string()),
    doctorNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    const existing = patients.find(
      (p) => p.name === args.name && p.phone === args.phone
    );

    const visit = {
      date: Date.now(),
      diagnosis: args.diagnosis,
      medications: args.medications,
      prescriptionUrl: args.prescriptionUrl,
      doctorNote: args.doctorNote,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        visits: [...existing.visits, visit],
      });
      return existing._id;
    } else {
      return await ctx.db.insert("patients", {
        name: args.name,
        dob: args.dob,
        phone: args.phone,
        doctorId: args.doctorId,
        visits: [visit],
      });
    }
  },
});
