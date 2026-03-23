import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const DEFAULT_MODEL = "z-ai/glm-4.5-air:free";

export const chat = action({
  args: {
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
    userId: v.string(),
  },
  handler: async (ctx, args: { messages: { role: string; content: string }[]; userId: string }) => {
    const existing = await ctx.runQuery(internal.settings.getAiModelInternal, { userId: args.userId });
    const model: string = existing ?? DEFAULT_MODEL;

    const systemInstruction = "You are Aura, an AI employee for a doctor's office. Your job is to manage appointments, answer patient queries, and help the doctor stay organized. Be professional, efficient, and empathetic. If a user wants to book an appointment, ask for their name and preferred time if not provided.";

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
