import { Response } from "express";
import { Member } from "../models/Member";
import { Expense, ExpenseCategory } from "../models/Expense";
import { AuthRequest } from "../middleware/auth";

/* ── Revenue aggregation from feeHistory ── */
export async function getRevenueSummary(req: AuthRequest, res: Response): Promise<void> {
  const { year = new Date().getFullYear() } = req.query;
  const y = Number(year);

  const start = new Date(y, 0, 1);
  const end   = new Date(y + 1, 0, 1);

  /* Monthly revenue from feeHistory */
  const revenueAgg = await Member.aggregate([
    { $unwind: "$feeHistory" },
    { $match: { "feeHistory.date": { $gte: start, $lt: end } } },
    {
      $group: {
        _id:    { month: { $month: "$feeHistory.date" }, plan: "$plan" },
        total:  { $sum: "$feeHistory.amount" },
        count:  { $sum: 1 },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  /* Build 12-month array */
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    total: 0, basic: 0, standard: 0, premium: 0, yearly: 0, count: 0,
  }));

  for (const r of revenueAgg) {
    const m = months[r._id.month - 1];
    m.total += r.total;
    m.count += r.count;
    const plan = r._id.plan as keyof typeof m;
    if (plan in m) (m as Record<string, number>)[plan] += r.total;
  }

  /* Year totals */
  const yearTotal   = months.reduce((s, m) => s + m.total, 0);
  const yearCount   = months.reduce((s, m) => s + m.count, 0);

  /* Expenses for year */
  const expAgg = await Expense.aggregate([
    { $match: { date: { $gte: start, $lt: end } } },
    { $group: { _id: { $month: "$date" }, total: { $sum: "$amount" } } },
  ]);
  const expByMonth = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }));
  for (const e of expAgg) expByMonth[e._id - 1].total = e.total;

  const yearExpenses = expByMonth.reduce((s, e) => s + e.total, 0);

  res.json({
    year: y,
    months,
    expByMonth,
    yearTotal,
    yearCount,
    yearExpenses,
    yearProfit: yearTotal - yearExpenses,
  });
}

export async function getDues(req: AuthRequest, res: Response): Promise<void> {
  /* Members whose planPrice > sum(feeHistory) in their current cycle */
  const members = await Member.find({}, "name phone plan planPrice startDate endDate feeHistory status");

  const dues = members
    .map((m) => {
      const paid = (m.feeHistory ?? [])
        .filter((f) => f.date >= m.startDate)
        .reduce((s, f) => s + f.amount, 0);
      const due = m.planPrice - paid;
      return { _id: m._id, name: m.name, phone: m.phone, plan: m.plan, planPrice: m.planPrice, paid, due, status: m.status, endDate: m.endDate };
    })
    .filter((m) => m.due > 0)
    .sort((a, b) => b.due - a.due);

  res.json({ dues, total: dues.length, totalDue: dues.reduce((s, d) => s + d.due, 0) });
}

export async function getExpenseBreakdown(req: AuthRequest, res: Response): Promise<void> {
  const { year = new Date().getFullYear(), month } = req.query;
  const y = Number(year);

  let start: Date, end: Date;
  if (month) {
    const mo = Number(month);
    start = new Date(y, mo - 1, 1);
    end   = new Date(y, mo, 1);
  } else {
    start = new Date(y, 0, 1);
    end   = new Date(y + 1, 0, 1);
  }

  const agg = await Expense.aggregate([
    { $match: { date: { $gte: start, $lt: end } } },
    { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const list = await Expense.find({ date: { $gte: start, $lt: end } } as object).sort({ date: -1 });
  const grandTotal = agg.reduce((s, a) => s + a.total, 0);

  res.json({ breakdown: agg, list, grandTotal });
}

/* ── Expense CRUD ── */
export async function addExpense(req: AuthRequest, res: Response): Promise<void> {
  const { category, amount, date, description, paidTo } = req.body as {
    category: ExpenseCategory; amount: number; date?: string; description?: string; paidTo?: string;
  };
  if (!category || !amount) { res.status(400).json({ message: "category and amount required" }); return; }
  const exp = await Expense.create({ category, amount, date: date ? new Date(date) : new Date(), description, paidTo });
  res.status(201).json(exp);
}

export async function deleteExpense(req: AuthRequest, res: Response): Promise<void> {
  await Expense.findByIdAndDelete(req.params.id);
  res.json({ message: "deleted" });
}

export async function getTopPlanRevenue(req: AuthRequest, res: Response): Promise<void> {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);

  const agg = await Member.aggregate([
    { $unwind: "$feeHistory" },
    { $match: { "feeHistory.date": { $gte: start } } },
    { $group: { _id: "$plan", total: { $sum: "$feeHistory.amount" }, members: { $addToSet: "$_id" } } },
    { $project: { _id: 1, total: 1, memberCount: { $size: "$members" } } },
    { $sort: { total: -1 } },
  ]);

  res.json(agg);
}

export async function getRecentTransactions(req: AuthRequest, res: Response): Promise<void> {
  const limit = Number(req.query.limit ?? 20);
  const members = await Member.find(
    { "feeHistory.0": { $exists: true } },
    "name phone plan feeHistory"
  );

  const txns = members.flatMap((m) =>
    (m.feeHistory ?? []).map((f) => ({
      memberId: m._id, name: m.name, phone: m.phone, plan: m.plan,
      amount: f.amount, date: f.date, method: f.method, note: f.note,
    }))
  );

  txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(txns.slice(0, limit));
}
