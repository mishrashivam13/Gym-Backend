import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
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
import chatRoutes from "./routes/chat";

const app = express();

app.use(cors({
  origin: (_origin, cb) => cb(null, true), // allow all origins
  credentials: true,
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "Centrum Gym Backend", version: "1.0.0" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "centrum-gym-backend" });
});

app.use("/api/admin",          adminRoutes);
app.use("/api/members",        memberRoutes);
app.use("/api/enquiries",      enquiryRoutes);
app.use("/api/visit-enquiries",visitEnquiryRoutes);
app.use("/api/attendance",     attendanceRoutes);
app.use("/api/trainers",       trainerRoutes);
app.use("/api/bulk-whatsapp",  bulkWhatsappRoutes);
app.use("/api/finance",        financeRoutes);
app.use("/api/salary",         salaryRoutes);
app.use("/api/dashboard",      dashboardRoutes);
app.use("/api/chat",           chatRoutes);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err.message);
  res.status(500).json({ message: err.message ?? "Internal server error" });
});

export default app;
