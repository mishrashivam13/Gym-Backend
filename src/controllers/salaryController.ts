import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Trainer } from "../models/Trainer";
import { TrainerAttendance } from "../models/TrainerAttendance";
import { SalaryRecord } from "../models/SalaryRecord";

/* Working days in a month (Mon–Sat = 26 approx) */
function workingDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate(); // total days
  let working = 0;
  for (let d = 1; d <= days; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) working++; // exclude Sunday
  }
  return working;
}

/* Generate / refresh salary records for all active trainers for a month */
export async function generateMonthlySalary(req: AuthRequest, res: Response): Promise<void> {
  const { month, year } = req.body as { month: number; year: number };
  if (!month || !year) { res.status(400).json({ message: "month and year required" }); return; }

  const trainers    = await Trainer.find({ status: "active" });
  const workingDays = workingDaysInMonth(year, month);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 1);

  const results = [];

  for (const t of trainers) {
    if (!t.salary) continue;

    const presentDays = await TrainerAttendance.countDocuments({
      trainerId: t._id,
      date: { $gte: monthStart, $lt: monthEnd },
    });

    const calculatedAmount = Math.round((presentDays / workingDays) * t.salary);

    /* Upsert — don't overwrite paidAmount/bonus/deduction if already set */
    const existing = await SalaryRecord.findOne({ trainerId: t._id, month, year });

    if (existing) {
      existing.baseSalary       = t.salary;
      existing.workingDays      = workingDays;
      existing.presentDays      = presentDays;
      existing.calculatedAmount = calculatedAmount;
      existing.netPayable       = calculatedAmount + (existing.bonus ?? 0) - (existing.deduction ?? 0);
      if (existing.paidAmount >= existing.netPayable) existing.status = "paid";
      else if (existing.paidAmount > 0) existing.status = "partial";
      else existing.status = "unpaid";
      await existing.save();
      results.push(existing);
    } else {
      const rec = await SalaryRecord.create({
        trainerId: t._id, month, year,
        baseSalary: t.salary, workingDays, presentDays,
        calculatedAmount, netPayable: calculatedAmount,
        paidAmount: 0, bonus: 0, deduction: 0, status: "unpaid",
      });
      results.push(rec);
    }
  }

  res.json({ generated: results.length, records: results });
}

/* Get salary records for a month */
export async function getMonthlySalary(req: AuthRequest, res: Response): Promise<void> {
  const { month, year } = req.query as { month: string; year: string };
  const records = await SalaryRecord.find({ month: Number(month), year: Number(year) })
    .populate("trainerId", "name phone specialization imageUrl salary")
    .sort({ status: 1 });
  res.json(records);
}

/* Update salary record (mark paid / add bonus / deduction) */
export async function updateSalaryRecord(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { paidAmount, bonus, deduction, note, paidDate } = req.body as {
    paidAmount?: number; bonus?: number; deduction?: number; note?: string; paidDate?: string;
  };

  const rec = await SalaryRecord.findById(id);
  if (!rec) { res.status(404).json({ message: "Record not found" }); return; }

  if (bonus     !== undefined) { rec.bonus     = bonus; }
  if (deduction !== undefined) { rec.deduction = deduction; }
  if (note      !== undefined) rec.note = note;
  if (paidDate  !== undefined) rec.paidDate = new Date(paidDate);

  rec.netPayable = rec.calculatedAmount + rec.bonus - rec.deduction;

  if (paidAmount !== undefined) {
    rec.paidAmount = paidAmount;
    rec.paidDate   = paidDate ? new Date(paidDate) : new Date();
  }

  if (rec.paidAmount >= rec.netPayable) rec.status = "paid";
  else if (rec.paidAmount > 0)          rec.status = "partial";
  else                                  rec.status = "unpaid";

  await rec.save();
  res.json(rec);
}

/* Get full salary history for a trainer */
export async function getTrainerSalaryHistory(req: AuthRequest, res: Response): Promise<void> {
  const { trainerId } = req.params;
  const records = await SalaryRecord.find({ trainerId })
    .populate("trainerId", "name phone specialization imageUrl")
    .sort({ year: -1, month: -1 });
  res.json(records);
}

/* Summary: total salary payout for a month */
export async function getSalarySummary(req: AuthRequest, res: Response): Promise<void> {
  const { month, year } = req.query as { month: string; year: string };
  const agg = await SalaryRecord.aggregate([
    { $match: { month: Number(month), year: Number(year) } },
    {
      $group: {
        _id: null,
        totalPayable: { $sum: "$netPayable" },
        totalPaid:    { $sum: "$paidAmount" },
        totalPending: { $sum: { $subtract: ["$netPayable", "$paidAmount"] } },
        count:        { $sum: 1 },
        paid:         { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
        unpaid:       { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
        partial:      { $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] } },
      },
    },
  ]);
  res.json(agg[0] ?? { totalPayable: 0, totalPaid: 0, totalPending: 0, count: 0, paid: 0, unpaid: 0, partial: 0 });
}
