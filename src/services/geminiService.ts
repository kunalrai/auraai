import { GoogleGenAI, Type } from "@google/genai";
import { format } from "date-fns";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface BookingDetails {
  patientName: string;
  patientContact?: string;
  startTime: string;
  notes?: string;
  reminderType?: 'text' | 'phone' | 'email' | 'none';
  recurrence?: { frequency: 'weekly' | 'monthly'; count: number };
}

export interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export interface TextPart {
  text: string;
}

export type Part = TextPart | ImagePart;

export interface UsageMetadata {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  text: string;
  usage?: UsageMetadata;
}

const DEFAULT_MODEL = "gemini-3-flash-preview";

export const parseBookingRequest = async (prompt: string, currentDateTime: string, model: string = DEFAULT_MODEL): Promise<BookingDetails | null> => {
  const response = await ai.models.generateContent({
    model,
    contents: `Current date and time: ${currentDateTime}. 
    User request: "${prompt}". 
    Extract appointment details. If details are missing, return null. 
    Notes should include any specific reason for the visit.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          patientName: { type: Type.STRING },
          patientContact: { type: Type.STRING },
          startTime: { type: Type.STRING, description: "ISO 8601 format" },
          notes: { type: Type.STRING },
          reminderType: { type: Type.STRING, enum: ["text", "phone", "email", "none"] },
          recurrence: {
            type: Type.OBJECT,
            properties: {
              frequency: { type: Type.STRING, enum: ["weekly", "monthly"] },
              count: { type: Type.INTEGER }
            }
          }
        },
        required: ["patientName", "startTime"]
      }
    }
  });

  try {
    return JSON.parse(response.text) as BookingDetails;
  } catch (e) {
    console.error("Failed to parse booking request", e);
    return null;
  }
};

export const generateReminderMessage = async (patientName: string, doctorName: string, startTime: string, type: 'text' | 'email', model: string = DEFAULT_MODEL): Promise<string> => {
  const response = await ai.models.generateContent({
    model,
    contents: `Generate a polite ${type} reminder for ${patientName} about their appointment with Dr. ${doctorName} on ${format(new Date(startTime), 'PPPP p')}.`,
  });
  return response.text;
};

export const chatWithAssistant = async (
  history: { role: 'user' | 'assistant', content: string }[],
  currentDateTime: string,
  doctorName: string,
  model: string = DEFAULT_MODEL,
  imageData?: { mimeType: string; data: string }
) => {
  const systemInstruction = `You are Aura, an AI employee for Dr. ${doctorName}. 
  Your job is to manage appointments, answer patient queries, and help the doctor stay organized. 
  Current date and time: ${currentDateTime}. 
  Be professional, efficient, and empathetic. 
  If a user wants to book an appointment, ask for their name and preferred time if not provided.
  If the user sends an image, analyze it carefully and describe what you see, or extract any relevant information.`;

  const lastMessage = history[history.length - 1].content;

  const parts: Part[] = [{ text: lastMessage }];
  if (imageData) {
    parts.push({ inlineData: { mimeType: imageData.mimeType, data: imageData.data } });
  }

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction,
    }
  });

  const usage = response.usageMetadata ? {
    promptTokens: response.usageMetadata.promptTokenCount ?? 0,
    completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
    totalTokens: response.usageMetadata.totalTokenCount ?? 0,
  } : undefined;

  return { text: response.text ?? "", usage };
};
