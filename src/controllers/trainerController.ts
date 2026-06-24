import { Response } from "express";
import fs from "fs";
import path from "path";
import { Trainer } from "../models/Trainer";
import { TrainerAttendance } from "../models/TrainerAttendance";
import { AuthRequest } from "../middleware/auth";

/* ── CRUD ── */
export async function getTrainers(req: AuthRequest, res: Response): Promise<void> {
  const { status, search } = req.query as Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (search) filter.$or = [
    { name:  { $regex: search, $options: "i" } },
    { phone: { $regex: search, $options: "i" } },
  ];
  const trainers = await Trainer.find(filter).sort({ createdAt: -1 });
  res.json(trainers);
}

export async function getTrainerById(req: AuthRequest, res: Response): Promise<void> {
  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) { res.status(404).json({ message: "Trainer not found" }); return; }
  res.json(trainer);
}

export async function createTrainer(req: AuthRequest, res: Response): Promise<void> {
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const { name, phone, email, specialization, experience, salary, joiningDate, address, note } =
    req.body as Record<string, string>;

  const trainer = await Trainer.create({
    name, phone, email, specialization, address, note,
    experience: experience ? Number(experience) : undefined,
    salary:     salary     ? Number(salary)     : undefined,
    joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
    imageUrl,
  });
  res.status(201).json(trainer);
}

export async function updateTrainer(req: AuthRequest, res: Response): Promise<void> {
  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) { res.status(404).json({ message: "Trainer not found" }); return; }

  if (req.file) {
    if (trainer.imageUrl) {
      const old = path.join(process.cwd(), trainer.imageUrl);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    req.body.imageUrl = `/uploads/${req.file.filename}`;
  }

  const updated = await Trainer.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
  res.json(updated);
}

export async function deleteTrainer(req: AuthRequest, res: Response): Promise<void> {
  const trainer = await Trainer.findById(req.params.id);
  if (trainer?.imageUrl) {
    const p = path.join(process.cwd(), trainer.imageUrl);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  await Trainer.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
}

/* ── Trainer Attendance ── */
function dayBounds(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return { s, e };
}

export async function getTrainerAttendanceToday(req: AuthRequest, res: Response): Promise<void> {
  const { s, e } = dayBounds(new Date());
  const records = await TrainerAttendance.find({ date: { $gte: s, $lte: e } })
    .populate("trainerId", "name phone specialization imageUrl")
    .sort({ checkIn: -1 });
  res.json(records);
}

export async function trainerCheckIn(req: AuthRequest, res: Response): Promise<void> {
  const { trainerId } = req.body as { trainerId: string };
  const trainer = await Trainer.findById(trainerId);
  if (!trainer) { res.status(404).json({ message: "Trainer not found" }); return; }

  const now = new Date();
  const { s, e } = dayBounds(now);
  const existing = await TrainerAttendance.findOne({ trainerId, date: { $gte: s, $lte: e } });
  if (existing) { res.status(409).json({ message: "Already checked in", record: existing }); return; }

  const record = await TrainerAttendance.create({
    trainerId,
    date:    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    checkIn: now,
  });
  const populated = await record.populate("trainerId", "name phone specialization imageUrl");
  res.status(201).json(populated);
}

export async function trainerCheckOut(req: AuthRequest, res: Response): Promise<void> {
  const record = await TrainerAttendance.findById(req.params.id);
  if (!record) { res.status(404).json({ message: "Not found" }); return; }
  if (record.checkOut) { res.status(400).json({ message: "Already checked out" }); return; }
  record.checkOut = new Date();
  await record.save();
  const populated = await record.populate("trainerId", "name phone specialization imageUrl");
  res.json(populated);
}

export async function getTrainerAttendanceHistory(req: AuthRequest, res: Response): Promise<void> {
  const { trainerId, from, to, page = "1", limit = "30" } = req.query as Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (trainerId) filter.trainerId = trainerId;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to)   filter.date.$lte = new Date(to);
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [records, total] = await Promise.all([
    TrainerAttendance.find(filter)
      .populate("trainerId", "name phone specialization imageUrl")
      .sort({ date: -1, checkIn: -1 })
      .skip(skip).limit(parseInt(limit)),
    TrainerAttendance.countDocuments(filter),
  ]);
  res.json({ records, total, pages: Math.ceil(total / parseInt(limit)) });
}

export async function deleteTrainerAttendance(req: AuthRequest, res: Response): Promise<void> {
  await TrainerAttendance.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
}
