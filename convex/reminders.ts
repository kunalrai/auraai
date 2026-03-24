import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { GenericId } from "convex/values";

export const dispatch = action({
  args: {},
  handler: async (ctx): Promise<{ sent: number; failed: number; message: string }> => {
    const pending: { _id: GenericId<"reminders">; patientName: string; patientPhone: string }[] = await ctx.runQuery(api.patients.listPendingReminders, {});

    if (!pending || pending.length === 0) {
      return { sent: 0, failed: 0, message: "No pending reminders." };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      for (const reminder of pending) {
        await ctx.runMutation(api.patients.markReminderFailed, {
          reminderId: reminder._id,
          error: "no SMS provider configured",
        });
      }
      return { sent: 0, failed: pending.length, message: "Twilio not configured. All reminders marked as failed." };
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    let sent = 0;
    let failed = 0;

    for (const reminder of pending) {
      const message = `Hi ${reminder.patientName}, this is a reminder from your doctor. Your follow-up visit is due today. Please call the clinic to book your appointment.`;

      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: reminder.patientPhone,
              From: fromNumber,
              Body: message,
            }),
          }
        );

        if (response.ok) {
          await ctx.runMutation(api.patients.markReminderSent, {
            reminderId: reminder._id,
            responseCode: response.status,
            error: undefined,
          });
          sent++;
        } else {
          const errorText = await response.text();
          await ctx.runMutation(api.patients.markReminderFailed, {
            reminderId: reminder._id,
            error: `HTTP ${response.status}: ${errorText}`,
          });
          failed++;
        }
      } catch (err: any) {
        await ctx.runMutation(api.patients.markReminderFailed, {
          reminderId: reminder._id,
          error: err?.message ?? "unknown error",
        });
        failed++;
      }
    }

    return { sent, failed, message: `${sent} reminders sent, ${failed} failed.` };
  },
});
