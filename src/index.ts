import "./config/env"; // load .env first
import app from "./app";
import { connectDB } from "./config/db";
import { config } from "./config/env";
import { startExpiryReminderJob } from "./jobs/expiryReminder";
import { startBirthdayWisherJob } from "./jobs/birthdayWisher";

process.on("unhandledRejection", (reason) => console.error("[unhandledRejection]", reason));
process.on("uncaughtException",  (err)    => console.error("[uncaughtException]",  err.message));

connectDB().then(() => {
  app.listen(config.port, () => {
    console.log(`Backend running at http://localhost:${config.port}`);
    startExpiryReminderJob();
    startBirthdayWisherJob();
  });
});
