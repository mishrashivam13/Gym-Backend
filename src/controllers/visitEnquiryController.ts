import mongoose from "mongoose";
import { Response } from "express";
import { VisitEnquiry } from "../models/VisitEnquiry";
import { Member } from "../models/Member";
import { AuthRequest } from "../middleware/auth";

export async function getVisitEnquiries(req: AuthRequest, res: Response): Promise<void> {
  const { status, intent, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (intent) filter.intent = intent;
  if (search) filter.$or = [
    { name:  { $regex: search, $options: "i" } },
    { phone: { $regex: search, $options: "i" } },
  ];

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [enquiries, total] = await Promise.all([
    VisitEnquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    VisitEnquiry.countDocuments(filter),
  ]);

  res.json({ enquiries, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}

export async function createVisitEnquiry(req: AuthRequest, res: Response): Promise<void> {
  const { name, phone, intent, note } = req.body as {
    name: string; phone: string;
    intent?: "immediate" | "1-2days" | "this-week" | "undecided";
    note?: string;
  };
  const enquiry = await VisitEnquiry.create({ name, phone, intent: intent ?? "undecided", note });
  res.status(201).json(enquiry);
}

export async function updateVisitEnquiry(req: AuthRequest, res: Response): Promise<void> {
  const { status, note, intent } = req.body as { status?: string; note?: string; intent?: string };
  const enquiry = await VisitEnquiry.findByIdAndUpdate(
    req.params.id,
    { ...(status && { status }), ...(note !== undefined && { note }), ...(intent && { intent }) },
    { returnDocument: "after" }
  );
  if (!enquiry) { res.status(404).json({ message: "Not found" }); return; }
  res.json(enquiry);
}

export async function deleteVisitEnquiry(req: AuthRequest, res: Response): Promise<void> {
  await VisitEnquiry.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
}

export async function convertToMember(req: AuthRequest, res: Response): Promise<void> {
  const enquiry = await VisitEnquiry.findById(req.params.id);
  if (!enquiry) { res.status(404).json({ message: "Not found" }); return; }

  type PayMethod = "cash" | "upi" | "card" | "bank";
  type PlanType  = "basic" | "standard" | "premium" | "yearly";
  const { plan, planPrice, startDate, endDate, paymentMethod, email, address } = req.body as {
    plan: PlanType; planPrice: number; startDate: string; endDate: string;
    paymentMethod?: PayMethod; email?: string; address?: string;
  };

  const feeHistory = planPrice
    ? [{ amount: Number(planPrice), date: new Date(startDate), method: (paymentMethod ?? "cash") as PayMethod }]
    : [];

  const member = await Member.create({
    name: enquiry.name,
    phone: enquiry.phone,
    email,
    address,
    plan,
    planPrice: Number(planPrice),
    startDate: new Date(startDate),
    endDate:   new Date(endDate),
    feeHistory,
  });

  enquiry.status = "converted";
  enquiry.convertedMemberId = (member as { _id: mongoose.Types.ObjectId })._id;
  await enquiry.save();

  res.status(201).json({ member, enquiry });
}
