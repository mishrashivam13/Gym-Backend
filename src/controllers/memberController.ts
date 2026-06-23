import { Request, Response } from "express";
import { Member } from "../models/Member";
import { sendWelcomeEmail } from "../services/emailService";

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
  const { name, email, phone, address, plan, planPrice, startDate, endDate, paymentMethod } =
    req.body as {
      name: string; email?: string; phone: string; address?: string;
      plan: "basic" | "standard" | "premium" | "yearly"; planPrice: number; startDate: string; endDate: string;
      paymentMethod?: PayMethod;
    };

  const feeHistory = planPrice
    ? [{ amount: Number(planPrice), date: startDate ? new Date(startDate) : new Date(), method: paymentMethod ?? "cash" as PayMethod }]
    : [];

  const member = await Member.create({ name, email, phone, address, plan, planPrice: Number(planPrice), startDate: new Date(startDate), endDate: new Date(endDate), feeHistory });

  // Send welcome email (non-blocking)
  if (email) {
    const amountPaid = feeHistory.reduce((s, f) => s + f.amount, 0);
    sendWelcomeEmail({
      name, email, plan,
      planPrice: Number(planPrice),
      amountPaid,
      startDate: new Date(startDate),
      endDate:   new Date(endDate),
    }).catch((err) => console.error("[Email] Welcome email failed:", err));
  }

  res.status(201).json(member);
}

export async function updateMember(req: Request, res: Response): Promise<void> {
  const member = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!member) { res.status(404).json({ message: "Member not found" }); return; }
  res.json(member);
}

export async function deleteMember(req: Request, res: Response): Promise<void> {
  await Member.findByIdAndDelete(req.params.id);
  res.json({ message: "Member deleted" });
}

export async function addFeePayment(req: Request, res: Response): Promise<void> {
  const member = await Member.findById(req.params.id);
  if (!member) { res.status(404).json({ message: "Member not found" }); return; }
  const { amount, method, note, date } = req.body as { amount: number; method: string; note?: string; date?: string };
  member.feeHistory.push({ amount, method: method as "cash", note, date: date ? new Date(date) : new Date() });
  await member.save();
  res.json(member);
}
