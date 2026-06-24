import { Response } from "express";
import { Attendance, ShiftType } from "../models/Attendance";
import { Member } from "../models/Member";
import { AuthRequest } from "../middleware/auth";

function dayBounds(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return { start, end };
}

/* Detect shift from current time — morning 5:30-11:30, evening 16:00-22:30 */
function detectShift(now: Date): ShiftType | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 330 && mins <= 690)   return "morning"; // 5:30 – 11:30
  if (mins >= 960 && mins <= 1350)  return "evening"; // 16:00 – 22:30
  return null;
}

/* GET /api/attendance/today */
export async function getToday(req: AuthRequest, res: Response): Promise<void> {
  const { start, end } = dayBounds(new Date());
  const records = await Attendance.find({ date: { $gte: start, $lte: end } })
    .populate("memberId", "name phone plan status")
    .sort({ shift: 1, checkIn: -1 });
  res.json(records);
}

/* GET /api/attendance?memberId=&from=&to=&page=&limit=&shift= */
export async function getAttendance(req: AuthRequest, res: Response): Promise<void> {
  const { memberId, from, to, page = "1", limit = "30", shift } = req.query as Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (memberId) filter.memberId = memberId;
  if (shift)    filter.shift = shift;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to)   filter.date.$lte = new Date(to);
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate("memberId", "name phone plan")
      .sort({ date: -1, shift: 1, checkIn: -1 })
      .skip(skip).limit(parseInt(limit)),
    Attendance.countDocuments(filter),
  ]);
  res.json({ records, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}

/* GET /api/attendance/member/:memberId */
export async function getMemberAttendance(req: AuthRequest, res: Response): Promise<void> {
  const { memberId } = req.params;
  const { month, year } = req.query as Record<string, string>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { memberId };
  if (month && year) {
    const y = parseInt(year), m = parseInt(month) - 1;
    filter.date = { $gte: new Date(y, m, 1), $lte: new Date(y, m + 1, 0, 23, 59, 59) };
  }

  const records = await Attendance.find(filter).sort({ date: -1 });
  const totalDays = records.length;
  res.json({ records, totalDays });
}

/* GET /api/attendance/stats */
export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  const now = new Date();
  const { start: todayStart, end: todayEnd } = dayBounds(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [morningToday, eveningToday, monthCount, totalMembers] = await Promise.all([
    Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, shift: "morning" }),
    Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, shift: "evening" }),
    Attendance.countDocuments({ date: { $gte: monthStart } }),
    Member.countDocuments({ status: "active" }),
  ]);

  res.json({ todayCount: morningToday + eveningToday, morningToday, eveningToday, monthCount, totalMembers });
}

/* POST /api/attendance/check-in  body: { memberId, shift?, note? } */
export async function checkIn(req: AuthRequest, res: Response): Promise<void> {
  const { memberId, shift: shiftBody, note } = req.body as { memberId: string; shift?: ShiftType; note?: string };
  const member = await Member.findById(memberId);
  if (!member) { res.status(404).json({ message: "Member not found" }); return; }
  if (member.status !== "active") { res.status(400).json({ message: "Member plan is not active" }); return; }

  const now   = new Date();
  const shift: ShiftType = shiftBody ?? detectShift(now) ?? "morning";
  const { start, end } = dayBounds(now);

  const existing = await Attendance.findOne({ memberId, date: { $gte: start, $lte: end }, shift });
  if (existing) { res.status(409).json({ message: `Already checked in for ${shift} shift`, record: existing }); return; }

  const record = await Attendance.create({
    memberId,
    date:    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    shift,
    checkIn: now,
    note,
  });

  const populated = await record.populate("memberId", "name phone plan");
  res.status(201).json(populated);
}

/* PATCH /api/attendance/:id/check-out */
export async function checkOut(req: AuthRequest, res: Response): Promise<void> {
  const record = await Attendance.findById(req.params.id);
  if (!record) { res.status(404).json({ message: "Record not found" }); return; }
  if (record.checkOut) { res.status(400).json({ message: "Already checked out" }); return; }

  record.checkOut = new Date();
  await record.save();
  const populated = await record.populate("memberId", "name phone plan");
  res.json(populated);
}

/* DELETE /api/attendance/:id */
export async function deleteAttendance(req: AuthRequest, res: Response): Promise<void> {
  await Attendance.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
}
