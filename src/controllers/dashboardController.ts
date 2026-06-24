import { Request, Response } from "express";
import { Member } from "../models/Member";
import { Enquiry } from "../models/Enquiry";
import { Attendance } from "../models/Attendance";
import { TrainerAttendance } from "../models/TrainerAttendance";
import { Trainer } from "../models/Trainer";
import { VisitEnquiry } from "../models/VisitEnquiry";
import { Expense } from "../models/Expense";

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  const now          = new Date();
  const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd     = new Date(todayStart.getTime() + 86400000);
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7Days      = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  /* Last 6 months for mini chart */
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleDateString("en-IN", { month: "short" }) };
  });

  const [
    totalMembers, activeMembers, expiredMembers, pausedMembers,
    totalEnquiries, newEnquiries,
    expiringThisWeek, expiringMembers,
    recentMembers,
    monthlyRevenueAgg, totalRevenueAgg,
    planBreakdown,
    todayAttCount, trainerAttCount,
    totalTrainers, activeTrainers,
    pendingWalkIns,
    last6MonthsRevAgg,
    monthExpenses,
    upcomingBirthdays,
    recentTransactions,
    pendingDuesAgg,
  ] = await Promise.all([
    /* Members */
    Member.countDocuments(),
    Member.countDocuments({ status: "active" }),
    Member.countDocuments({ status: "expired" }),
    Member.countDocuments({ status: "paused" }),

    /* Enquiries */
    Enquiry.countDocuments(),
    Enquiry.countDocuments({ status: "new" }),

    /* Expiring */
    Member.countDocuments({ status: "active", endDate: { $gte: now, $lte: in7Days } }),
    Member.find({ status: "active", endDate: { $gte: now, $lte: in7Days } })
      .select("name phone plan endDate").sort({ endDate: 1 }).limit(5),

    /* Recent members */
    Member.find().sort({ createdAt: -1 }).limit(5).select("name phone plan status endDate joiningDate"),

    /* Revenue this month */
    Member.aggregate([
      { $unwind: "$feeHistory" },
      { $match: { "feeHistory.date": { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$feeHistory.amount" } } },
    ]),

    /* Total revenue */
    Member.aggregate([
      { $unwind: "$feeHistory" },
      { $group: { _id: null, total: { $sum: "$feeHistory.amount" } } },
    ]),

    /* Plan breakdown */
    Member.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$plan", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    /* Today's member attendance */
    Attendance.countDocuments({ date: { $gte: todayStart, $lt: todayEnd } }),

    /* Today's trainer attendance */
    TrainerAttendance.countDocuments({ date: { $gte: todayStart, $lt: todayEnd } }),

    /* Trainers */
    Trainer.countDocuments(),
    Trainer.countDocuments({ status: "active" }),

    /* Pending walk-ins */
    VisitEnquiry.countDocuments({ status: "pending" }),

    /* Last 6 months revenue */
    Member.aggregate([
      { $unwind: "$feeHistory" },
      {
        $group: {
          _id:   { year: { $year: "$feeHistory.date" }, month: { $month: "$feeHistory.date" } },
          total: { $sum: "$feeHistory.amount" },
        },
      },
    ]),

    /* This month expenses */
    Expense.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    /* Upcoming birthdays next 7 days */
    Member.aggregate([
      { $match: { dateOfBirth: { $exists: true, $ne: null }, phone: { $exists: true, $ne: "" } } },
      {
        $addFields: {
          birthMonth: { $month: "$dateOfBirth" },
          birthDay:   { $dayOfMonth: "$dateOfBirth" },
          thisYearBday: {
            $dateFromParts: {
              year: now.getFullYear(), month: { $month: "$dateOfBirth" }, day: { $dayOfMonth: "$dateOfBirth" },
            },
          },
        },
      },
      {
        $match: {
          thisYearBday: { $gte: todayStart, $lte: new Date(now.getTime() + 7 * 86400000) },
        },
      },
      { $project: { name: 1, phone: 1, plan: 1, dateOfBirth: 1, thisYearBday: 1 } },
      { $sort: { thisYearBday: 1 } },
      { $limit: 5 },
    ]),

    /* Recent transactions */
    Member.aggregate([
      { $unwind: "$feeHistory" },
      { $sort: { "feeHistory.date": -1 } },
      { $limit: 5 },
      { $project: { name: 1, plan: 1, "feeHistory.amount": 1, "feeHistory.date": 1, "feeHistory.method": 1 } },
    ]),

    /* Pending dues */
    Member.aggregate([
      {
        $project: {
          name: 1, plan: 1, planPrice: 1,
          paid: {
            $reduce: {
              input: "$feeHistory",
              initialValue: 0,
              in: { $add: ["$$value", "$$this.amount"] },
            },
          },
        },
      },
      { $addFields: { due: { $subtract: ["$planPrice", "$paid"] } } },
      { $match: { due: { $gt: 0 } } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$due" } } },
    ]),
  ]);

  /* Build 6-month chart data */
  const revMap = new Map(last6MonthsRevAgg.map((r: { _id: { year: number; month: number }; total: number }) => [`${r._id.year}-${r._id.month}`, r.total]));
  const chart6 = last6Months.map((m) => ({
    label: m.label,
    total: revMap.get(`${m.year}-${m.month}`) ?? 0,
  }));

  res.json({
    members:    { total: totalMembers, active: activeMembers, expired: expiredMembers, paused: pausedMembers, expiringThisWeek },
    enquiries:  { total: totalEnquiries, new: newEnquiries },
    revenue:    { thisMonth: monthlyRevenueAgg[0]?.total ?? 0, total: totalRevenueAgg[0]?.total ?? 0, expenses: monthExpenses[0]?.total ?? 0 },
    planBreakdown,
    attendance: { members: todayAttCount, trainers: trainerAttCount },
    trainers:   { total: totalTrainers, active: activeTrainers },
    walkIns:    { pending: pendingWalkIns },
    dues:       { count: pendingDuesAgg[0]?.count ?? 0, total: pendingDuesAgg[0]?.total ?? 0 },
    chart6,
    recentMembers,
    expiringMembers,
    upcomingBirthdays,
    recentTransactions,
  });
}
