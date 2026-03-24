import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { GenericId } from "convex/values";

interface PendingReminder {
  _id: GenericId<"reminders">;
  patientId: GenericId<"patients">;
  patientName: string;
  patientPhone: string;
}

export const dispatch = action({
  args: {},
  handler: async (ctx): Promise<{ sent: number; failed: number; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const doctorId = identity.subject;

    const pending: PendingReminder[] = await ctx.runQuery(api.patients.listPendingReminders, { doctorId });

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
      const smsMessage = `Hi ${reminder.patientName}, this is a reminder from your doctor. Your follow-up visit is due today. Please call the clinic to book your appointment.`;

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
              Body: smsMessage,
            }),
          }
        );

        if (response.ok) {
          await ctx.runMutation(api.patients.markReminderSent, {
            reminderId: reminder._id,
            responseCode: response.status,
            error: undefined,
          });
          await ctx.runMutation(api.commLog.record, {
            doctorId,
            patientId: reminder.patientId,
            patientName: reminder.patientName,
            patientPhone: reminder.patientPhone,
            type: "SMS",
            status: "SENT",
            message: smsMessage,
            error: undefined,
          });
          sent++;
        } else {
          const errorText = await response.text();
          await ctx.runMutation(api.patients.markReminderFailed, {
            reminderId: reminder._id,
            error: `HTTP ${response.status}: ${errorText}`,
          });
          await ctx.runMutation(api.commLog.record, {
            doctorId,
            patientId: reminder.patientId,
            patientName: reminder.patientName,
            patientPhone: reminder.patientPhone,
            type: "SMS",
            status: "FAILED",
            message: smsMessage,
            error: `HTTP ${response.status}: ${errorText}`,
          });
          failed++;
        }
      } catch (err: any) {
        const errMsg = err?.message ?? "unknown error";
        await ctx.runMutation(api.patients.markReminderFailed, {
          reminderId: reminder._id,
          error: errMsg,
        });
        await ctx.runMutation(api.commLog.record, {
          doctorId,
          patientId: reminder.patientId,
          patientName: reminder.patientName,
          patientPhone: reminder.patientPhone,
          type: "SMS",
          status: "FAILED",
          message: smsMessage,
          error: errMsg,
        });
        failed++;
      }
    }

    return { sent, failed, message: `${sent} reminders sent, ${failed} failed.` };
  },
});
