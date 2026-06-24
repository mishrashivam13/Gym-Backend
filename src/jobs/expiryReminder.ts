import cron from "node-cron";
import { Member } from "../models/Member";
import { sendExpiryReminderWhatsApp } from "../services/whatsappService";

/* Runs every day at 9:00 AM */
export function startExpiryReminderJob(): void {
  cron.schedule("0 9 * * *", async () => {
    console.log("[Cron] Running expiry reminder check…");

    const now     = new Date();
    const in10    = new Date(now);
    in10.setDate(in10.getDate() + 10);

    /* Start and end of the target day (10 days from now) */
    const dayStart = new Date(in10.getFullYear(), in10.getMonth(), in10.getDate(), 0, 0, 0);
    const dayEnd   = new Date(in10.getFullYear(), in10.getMonth(), in10.getDate(), 23, 59, 59);

    const members = await Member.find({
      status:  "active",
      email:   { $exists: true, $ne: "" },
      endDate: { $gte: dayStart, $lte: dayEnd },
    });

    console.log(`[Cron] Found ${members.length} member(s) expiring in ~10 days`);

    for (const m of members) {
      const daysLeft = Math.ceil((m.endDate.getTime() - now.getTime()) / 86400000);
      const reminderData = { name: m.name, plan: m.plan, endDate: m.endDate, daysLeft };

      try {
        await sendExpiryReminderWhatsApp({ ...reminderData, phone: m.phone });
      } catch (err) {
        console.error(`[Cron] WhatsApp reminder failed for ${m.phone}:`, err);
      }
    }
  });

  console.log("[Cron] Expiry reminder job scheduled (daily 9:00 AM)");
}
