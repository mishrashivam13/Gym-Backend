import { Request, Response } from "express";
import { Member } from "../models/Member";
import { sendWelcomeWhatsApp, sendPaymentReceiptWhatsApp, sendRenewalWhatsApp } from "../services/whatsappService";

export async function getMembers(req: Request, res: Response): Promise<void> {
  const { status, plan, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (plan) filter.plan = plan;
  if (search) filter.$or = [
    { name: { $regex: search, $options: "i" } },
    { phone: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [members, total] = await Promise.all([
    Member.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Member.countDocuments(filter),
  ]);

  res.json({ members, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}

export async function getMemberById(req: Request, res: Response): Promise<void> {
  const member = await Member.findById(req.params.id);
  if (!member) { res.status(404).json({ message: "Member not found" }); return; }
  res.json(member);
}

export async function createMember(req: Request, res: Response): Promise<void> {
  type PayMethod = "cash" | "upi" | "card" | "bank";
  const { name, email, phone, address, plan, planPrice, amountPaid, startDate, endDate, paymentMethod } =
    req.body as {
      name: string; email?: string; phone: string; address?: string;
      plan: "basic" | "standard" | "premium" | "yearly";
      planPrice: number; amountPaid?: number;
      startDate: string; endDate: string; paymentMethod?: PayMethod;
    };

  /* If amountPaid provided use it, otherwise fall back to full planPrice */
  const paidNow = amountPaid !== undefined ? Number(amountPaid) : Number(planPrice);

  const feeHistory = paidNow > 0
    ? [{ amount: paidNow, date: startDate ? new Date(startDate) : new Date(), method: paymentMethod ?? "cash" as PayMethod }]
    : [];

  const member = await Member.create({ name, email, phone, address, plan, planPrice: Number(planPrice), startDate: new Date(startDate), endDate: new Date(endDate), feeHistory });

  const msgData = { name, plan, planPrice: Number(planPrice), amountPaid: paidNow, startDate: new Date(startDate), endDate: new Date(endDate) };

  // Send welcome WhatsApp (non-blocking)
  sendWelcomeWhatsApp({ ...msgData, phone })
    .catch((err) => console.error("[WhatsApp] Welcome message failed:", err));

  res.status(201).json(member);
}

export async function updateMember(req: Request, res: Response): Promise<void> {
  const member = await Member.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after", runValidators: true });
  if (!member) { res.status(404).json({ message: "Member not found" }); return; }
  res.json(member);
}

export async function deleteMember(req: Request, res: Response): Promise<void> {
  await Member.findByIdAndDelete(req.params.id);
  res.json({ message: "Member deleted" });
}

export async function renewMember(req: Request, res: Response): Promise<void> {
  type PayMethod = "cash" | "upi" | "card" | "bank";
  const member = await Member.findById(req.params.id);
  if (!member) { res.status(404).json({ message: "Member not found" }); return; }

  const { plan, planPrice, startDate, endDate, amountPaid, paymentMethod } = req.body as {
    plan: "basic" | "standard" | "premium" | "yearly";
    planPrice: number; startDate: string; endDate: string;
    amountPaid?: number; paymentMethod?: PayMethod;
  };

  const paidNow = amountPaid !== undefined ? Number(amountPaid) : 0;
  const newStart = new Date(startDate);
  const newEnd   = new Date(endDate);

  member.plan      = plan;
  member.planPrice = Number(planPrice);
  member.startDate = newStart;
  member.endDate   = newEnd;
  member.status    = "active";

  if (paidNow > 0) {
    member.feeHistory.push({ amount: paidNow, date: newStart, method: paymentMethod ?? "cash", note: "Renewal payment" });
  }

  await member.save();
  res.json(member);

  /* Send renewal WhatsApp (non-blocking) */
  sendRenewalWhatsApp({
    name: member.name, phone: member.phone, plan,
    planPrice: Number(planPrice), amountPaid: paidNow,
    startDate: newStart, endDate: newEnd,
  }).catch((err) => console.error("[WhatsApp] Renewal message failed:", err));
}

export async function addFeePayment(req: Request, res: Response): Promise<void> {
  const member = await Member.findById(req.params.id);
  if (!member) { res.status(404).json({ message: "Member not found" }); return; }
  const { amount, method, note, date } = req.body as { amount: number; method: string; note?: string; date?: string };

  const payDate = date ? new Date(date) : new Date();
  member.feeHistory.push({ amount, method: method as "cash", note, date: payDate });
  await member.save();
  res.json(member);

  /* Send payment receipt WhatsApp (non-blocking) */
  const totalPaid = member.feeHistory.reduce((s, f) => s + f.amount, 0);
  sendPaymentReceiptWhatsApp({
    name: member.name, phone: member.phone, plan: member.plan,
    amount: Number(amount), method, date: payDate,
    totalPaid, planPrice: member.planPrice, endDate: member.endDate,
  }).catch((err) => console.error("[WhatsApp] Receipt failed:", err));
}
