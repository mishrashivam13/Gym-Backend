import mongoose, { Schema, Document } from "mongoose";

export interface IVisitEnquiry extends Document {
  name: string;
  phone: string;
  intent: "immediate" | "1-2days" | "this-week" | "undecided";
  status: "pending" | "followed-up" | "converted" | "lost";
  note?: string;
  convertedMemberId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VisitEnquirySchema = new Schema<IVisitEnquiry>(
  {
    name:    { type: String, required: true, trim: true },
    phone:   { type: String, required: true, trim: true },
    intent:  { type: String, enum: ["immediate", "1-2days", "this-week", "undecided"], default: "undecided" },
    status:  { type: String, enum: ["pending", "followed-up", "converted", "lost"], default: "pending" },
    note:    { type: String },
    convertedMemberId: { type: Schema.Types.ObjectId, ref: "Member" },
  },
  { timestamps: true }
);

export const VisitEnquiry = mongoose.model<IVisitEnquiry>("VisitEnquiry", VisitEnquirySchema);
