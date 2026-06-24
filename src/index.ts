import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "./config/env";
import { connectDB } from "./config/db";
import adminRoutes from "./routes/admin";
import memberRoutes from "./routes/members";
import enquiryRoutes from "./routes/enquiries";
import visitEnquiryRoutes from "./routes/visitEnquiries";
import attendanceRoutes from "./routes/attendance";
import trainerRoutes from "./routes/trainers";
import bulkWhatsappRoutes from "./routes/bulkWhatsapp";
import financeRoutes from "./routes/finance";
import salaryRoutes from "./routes/salary";
import dashboardRoutes from "./routes/dashboard";
import { startExpiryReminderJob } from "./jobs/expiryReminder";
import { startBirthdayWisherJob } from "./jobs/birthdayWisher";

const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "centrum-gym-backend" });
});

app.use("/api/admin", adminRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/visit-enquiries", visitEnquiryRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/trainers",        trainerRoutes);
app.use("/api/bulk-whatsapp",   bulkWhatsappRoutes);
app.use("/api/finance",         financeRoutes);
app.use("/api/salary",          salaryRoutes);
app.use("/api/dashboard",       dashboardRoutes);

/* ── Global async error handler ── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err.message);
  res.status(500).json({ message: err.message ?? "Internal server error" });
});

/* ── Prevent process crash on unhandled rejections ── */
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err.message);
});

connectDB().then(() => {
  app.listen(config.port, () => {
    console.log(`Backend running at http://localhost:${config.port}`);
    startExpiryReminderJob();
    startBirthdayWisherJob();
  });
});
