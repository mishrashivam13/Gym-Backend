import mongoose, { Schema, Document } from "mongoose";

export interface ITrainerAttendance extends Document {
  trainerId: mongoose.Types.ObjectId;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  note?: string;
}

const TrainerAttendanceSchema = new Schema<ITrainerAttendance>(
  {
    trainerId: { type: Schema.Types.ObjectId, ref: "Trainer", required: true },
    date:      { type: Date, required: true },
    checkIn:   { type: Date, required: true },
    checkOut:  { type: Date },
    note:      { type: String },
  },
  { timestamps: true }
);

TrainerAttendanceSchema.index({ trainerId: 1, date: 1 }, { unique: true });

export const TrainerAttendance = mongoose.model<ITrainerAttendance>("TrainerAttendance", TrainerAttendanceSchema);
