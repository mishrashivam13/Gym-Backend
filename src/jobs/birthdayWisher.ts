import cron from "node-cron";
import { Member } from "../models/Member";
import { sendBirthdayWhatsApp } from "../services/whatsappService";

/* Runs every day at 10:00 AM */
export function startBirthdayWisherJob(): void {
  cron.schedule("0 10 * * *", async () => {
    console.log("[Cron] Running birthday wish check…");

    const now   = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day   = now.getDate();

    /* Match members whose birth month and day equal today */
    const members = await Member.aggregate([
      {
        $match: {
          dateOfBirth: { $exists: true, $ne: null },
          phone:       { $exists: true, $ne: "" },
        },
      },
      {
        $addFields: {
          birthMonth: { $month: "$dateOfBirth" },
          birthDay:   { $dayOfMonth: "$dateOfBirth" },
        },
      },
      {
        $match: { birthMonth: month, birthDay: day },
      },
      {
        $project: { name: 1, phone: 1, plan: 1 },
      },
    ]);

    console.log(`[Cron] Found ${members.length} birthday(s) today`);

    for (const m of members) {
      try {
        await sendBirthdayWhatsApp({ name: m.name, phone: m.phone, plan: m.plan });
        console.log(`[Cron] Birthday wish sent to ${m.name} (${m.phone})`);
      } catch (err) {
        console.error(`[Cron] Birthday wish failed for ${m.name}:`, err);
      }
    }
  });

  console.log("[Cron] Birthday wisher job scheduled (daily 10:00 AM)");
}
