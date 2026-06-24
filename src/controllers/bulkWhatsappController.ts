import { Response } from "express";
import { Member } from "../models/Member";
import { AuthRequest } from "../middleware/auth";
import { getClient } from "../services/whatsappService";
import { config } from "../config/env";

type TargetGroup = "all" | "active" | "expired" | "expiring-soon" | "plan";

function buildMessage(template: string, name: string, plan: string, endDate: Date): string {
  return template
    .replace(/\{name\}/gi, name)
    .replace(/\{plan\}/gi, plan.charAt(0).toUpperCase() + plan.slice(1))
    .replace(/\{endDate\}/gi, endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }));
}

export async function previewBulk(req: AuthRequest, res: Response): Promise<void> {
  const { targetGroup, plan } = req.query as { targetGroup?: TargetGroup; plan?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter = buildFilter(targetGroup ?? "active", plan);
  const count  = await Member.countDocuments({ ...filter, phone: { $exists: true, $ne: "" } });
  res.json({ count });
}

export async function sendBulk(req: AuthRequest, res: Response): Promise<void> {
  const { targetGroup, plan, message } = req.body as {
    targetGroup: TargetGroup; plan?: string; message: string;
  };

  if (!message?.trim()) { res.status(400).json({ message: "Message is required" }); return; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter = buildFilter(targetGroup, plan);
  const members = await Member.find({ ...filter, phone: { $exists: true, $ne: "" } })
    .select("name phone plan endDate")
    .limit(500);

  if (members.length === 0) { res.status(400).json({ message: "No members match this filter" }); return; }

  const client = getClient();
  let sent = 0, failed = 0;
  const errors: string[] = [];

  for (const m of members) {
    try {
      const body = buildMessage(message, m.name, m.plan, m.endDate);
      const to   = `whatsapp:+91${m.phone.replace(/\D/g, "").replace(/^91/, "")}`;
      await client.messages.create({ from: config.twilio.from, to, body });
      sent++;
      /* small delay to avoid Twilio rate limits */
      await new Promise((r) => setTimeout(r, 300));
    } catch (err: unknown) {
      failed++;
      errors.push(`${m.name} (${m.phone}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  res.json({ sent, failed, total: members.length, errors: errors.slice(0, 10) });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFilter(targetGroup: TargetGroup, plan?: string): Record<string, any> {
  const now     = new Date();
  const in7days = new Date(now); in7days.setDate(now.getDate() + 7);

  switch (targetGroup) {
    case "active":        return { status: "active" };
    case "expired":       return { status: "expired" };
    case "expiring-soon": return { status: "active", endDate: { $gte: now, $lte: in7days } };
    case "plan":          return { status: "active", ...(plan ? { plan } : {}) };
    case "all":
    default:              return {};
  }
}
