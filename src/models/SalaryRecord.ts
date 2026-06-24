import mongoose, { Schema, Document } from "mongoose";

export interface ISalaryRecord extends Document {
  trainerId:        mongoose.Types.ObjectId;
  month:            number;   // 1-12
  year:             number;
  baseSalary:       number;   // trainer's set salary
  workingDays:      number;   // total working days in month (default 26)
  presentDays:      number;   // days present from attendance
  calculatedAmount: number;   // (presentDays / workingDays) * baseSalary
  paidAmount:       number;
  bonus:            number;
  deduction:        number;
  netPayable:       number;   // calculatedAmount + bonus - deduction
  status:           "unpaid" | "partial" | "paid";
  paidDate?:        Date;
  note?:            string;
}

const SalaryRecordSchema = new Schema<ISalaryRecord>(
  {
    trainerId:        { type: Schema.Types.ObjectId, ref: "Trainer", required: true },
    month:            { type: Number, required: true, min: 1, max: 12 },
    year:             { type: Number, required: true },
    baseSalary:       { type: Number, required: true },
    workingDays:      { type: Number, default: 26 },
    presentDays:      { type: Number, default: 0 },
    calculatedAmount: { type: Number, default: 0 },
    paidAmount:       { type: Number, default: 0 },
    bonus:            { type: Number, default: 0 },
    deduction:        { type: Number, default: 0 },
    netPayable:       { type: Number, default: 0 },
    status:           { type: String, enum: ["unpaid","partial","paid"], default: "unpaid" },
    paidDate:         { type: Date },
    note:             { type: String },
  },
  { timestamps: true }
);

SalaryRecordSchema.index({ trainerId: 1, month: 1, year: 1 }, { unique: true });

export const SalaryRecord = mongoose.model<ISalaryRecord>("SalaryRecord", SalaryRecordSchema);
