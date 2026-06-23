import { Request, Response } from "express";
import { Enquiry } from "../models/Enquiry";

export async function getEnquiries(req: Request, res: Response): Promise<void> {
  const { status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) filter.$or = [
    { name: { $regex: search, $options: "i" } },
    { phone: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Enquiry.countDocuments(filter),
  ]);

  res.json({ enquiries, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}

export async function createEnquiry(req: Request, res: Response): Promise<void> {
  const enquiry = await Enquiry.create(req.body);
  res.status(201).json(enquiry);
}

export async function updateEnquiryStatus(req: Request, res: Response): Promise<void> {
  const { status, note } = req.body as { status: string; note?: string };
  const enquiry = await Enquiry.findByIdAndUpdate(
    req.params.id,
    { status, ...(note !== undefined && { note }) },
    { new: true }
  );
  if (!enquiry) { res.status(404).json({ message: "Enquiry not found" }); return; }
  res.json(enquiry);
}

export async function deleteEnquiry(req: Request, res: Response): Promise<void> {
  await Enquiry.findByIdAndDelete(req.params.id);
  res.json({ message: "Enquiry deleted" });
}
