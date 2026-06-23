import express from "express";
import cors from "cors";
import { config } from "./config/env";
import { connectDB } from "./config/db";
import adminRoutes from "./routes/admin";
import memberRoutes from "./routes/members";
import enquiryRoutes from "./routes/enquiries";
import dashboardRoutes from "./routes/dashboard";
import { startExpiryReminderJob } from "./jobs/expiryReminder";

const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "centrum-gym-backend" });
});

app.use("/api/admin", adminRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/dashboard", dashboardRoutes);

connectDB().then(() => {
  app.listen(config.port, () => {
    console.log(`Backend running at http://localhost:${config.port}`);
    startExpiryReminderJob();
  });
});
