import { Request, Response } from "express";
import { Member } from "../models/Member";
import { Enquiry } from "../models/Enquiry";

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalMembers,
    activeMembers,
    expiredMembers,
    pausedMembers,
    totalEnquiries,
    newEnquiries,
    contactedEnquiries,
    expiringThisWeek,
    recentMembers,
    recentEnquiries,
    monthlyRevenueAgg,
    totalRevenueAgg,
    planBreakdown,
  ] = await Promise.all([
    Member.countDocuments(),
    Member.countDocuments({ status: "active" }),
    Member.countDocuments({ status: "expired" }),
    Member.countDocuments({ status: "paused" }),
    Enquiry.countDocuments(),
    Enquiry.countDocuments({ status: "new" }),
    Enquiry.countDocuments({ status: "contacted" }),
    Member.countDocuments({ status: "active", endDate: { $gte: now, $lte: in7Days } }),
    Member.find().sort({ createdAt: -1 }).limit(5).select("name phone plan status endDate"),
    Enquiry.find().sort({ createdAt: -1 }).limit(5).select("name phone message status createdAt"),
    Member.aggregate([
      { $unwind: "$feeHistory" },
      { $match: { "feeHistory.date": { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$feeHistory.amount" } } },
    ]),
    Member.aggregate([
      { $unwind: "$feeHistory" },
      { $group: { _id: null, total: { $sum: "$feeHistory.amount" } } },
    ]),
    Member.aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    members: { total: totalMembers, active: activeMembers, expired: expiredMembers, paused: pausedMembers, expiringThisWeek },
    enquiries: { total: totalEnquiries, new: newEnquiries, contacted: contactedEnquiries },
    revenue: {
      thisMonth: monthlyRevenueAgg[0]?.total ?? 0,
      total: totalRevenueAgg[0]?.total ?? 0,
    },
    planBreakdown,
    recentMembers,
    recentEnquiries,
  });
}
