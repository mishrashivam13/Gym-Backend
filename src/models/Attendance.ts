import mongoose, { Schema, Document } from "mongoose";

export type ShiftType = "morning" | "evening";

export interface IAttendance extends Document {
  memberId: mongoose.Types.ObjectId;
  date: Date;
  shift: ShiftType;
  checkIn: Date;
  checkOut?: Date;
  note?: string;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    date:     { type: Date, required: true },
    shift:    { type: String, enum: ["morning", "evening"], default: "morning" },
    checkIn:  { type: Date, required: true },
    checkOut: { type: Date },
    note:     { type: String },
  },
  { timestamps: true }
);

/* one check-in per member per shift per day */
AttendanceSchema.index({ memberId: 1, date: 1, shift: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>("Attendance", AttendanceSchema);
