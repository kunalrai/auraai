import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

const DEFAULT_MODEL = "z-ai/glm-4.5-air:free";

function extractPatientName(text: string): string | null {
  const patterns = [
    /(?:patient|about|for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:patient|about|for|with)\s+([A-Z][a-z]+)/,
    /([A-Z][a-z]+)\s+(?:patient|patient's)/,
    /(?:history|prescription|last visit|summary)\s+(?:of|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:what did i prescribe|when is|follow.up)\s+([A-Z][a-z]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function formatVisitHistory(patient: { name: string; visits: { date: number; diagnosis: string; medications: string; doctorNote?: string }[] }): string {
  const sorted = [...patient.visits].sort((a, b) => b.date - a.date);
  const recent = sorted.slice(0, 3);
  return recent
    .map((v, i) => {
      const date = new Date(v.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      return `[${i + 1}] ${date} — Diagnosis: ${v.diagnosis || "N/A"}, Medications: ${v.medications || "N/A"}${v.doctorNote ? `, Note: ${v.doctorNote}` : ""}`;
    })
    .join("\n");
}

export const chat = action({
  args: {
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
    userId: v.string(),
  },
  handler: async (ctx, args: { messages: { role: string; content: string }[]; userId: string }) => {
    const existing = await ctx.runQuery(internal.settings.getAiModelInternal, { userId: args.userId });
    const model: string = existing ?? DEFAULT_MODEL;

    const baseSystemInstruction = "You are Aura, an AI employee for a doctor's office. Your job is to manage appointments, answer patient queries, and help the doctor stay organized. Be professional, efficient, and empathetic. If a user wants to book an appointment, ask for their name and preferred time if not provided.";

    const lastUserMessage = args.messages.filter((m) => m.role === "user").pop()?.content ?? "";
    let systemInstruction = baseSystemInstruction;

    const patientName = extractPatientName(lastUserMessage);
    if (patientName) {
      const patients = await ctx.runQuery(api.patients.getByName, {
        doctorId: args.userId,
        name: patientName,
      });
      if (patients && patients.length > 0) {
        const patient = patients[0];
        const history = formatVisitHistory(patient);
        systemInstruction = `${baseSystemInstruction}\n\nPatient History for ${patient.name}: ${patient.dob ? `DOB: ${patient.dob}, ` : ""}Phone: ${patient.phone}\n${history}`;
      }
    }

    const weekMatch = lastUserMessage.match(/this\s+week|seen\s+this\s+week|patients?\s+(?:seen\s+)?this\s+week/i);
    if (weekMatch) {
      const now = Date.now();
      const startOfWeek = now - 7 * 24 * 60 * 60 * 1000;
      const patients = await ctx.runQuery(api.patients.listWithDateRange, {
        doctorId: args.userId,
        startDate: startOfWeek,
        endDate: now,
      });
      if (patients && patients.length > 0) {
        const list = patients.map((p: any) => `- ${p.name}: ${p.visits.length} visit(s), latest: ${new Date(p.visits[p.visits.length - 1]?.date).toLocaleDateString()}`).join("\n");
        systemInstruction = `${baseSystemInstruction}\n\nPatients seen this week:\n${list}`;
      }
    }

    const messages = [
      { role: "system", content: systemInstruction },
      ...args.messages,
    ];

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { text: "OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your Convex environment variables.", usage: null };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { text: `OpenRouter API error: ${response.status} - ${error}`, usage: null };
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
    const text: string = data.choices?.[0]?.message?.content ?? "";

    if (data.usage) {
      await ctx.runMutation(internal.tokenUsage.recordUsageInternal, {
        userId: args.userId,
        model,
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      });
    }

    return { text, usage: data.usage ?? null };
  },
});

interface VisionMessagePart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export const chatWithVision = action({
  args: {
    messages: v.array(v.object({ role: v.string(), content: v.any() })),
    userId: v.string(),
  },
  handler: async (ctx, args: { messages: { role: string; content: string | VisionMessagePart[] }[]; userId: string }) => {
    const existing = await ctx.runQuery(internal.settings.getAiModelInternal, { userId: args.userId });
    const model: string = existing ?? DEFAULT_MODEL;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { text: "OpenRouter API key not configured.", usage: null };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages: args.messages }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { text: `OpenRouter API error: ${response.status} - ${error}`, usage: null };
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
    const text: string = data.choices?.[0]?.message?.content ?? "";

    if (data.usage) {
      await ctx.runMutation(internal.tokenUsage.recordUsageInternal, {
        userId: args.userId,
        model,
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      });
    }

    return { text, usage: data.usage ?? null };
  },
});
