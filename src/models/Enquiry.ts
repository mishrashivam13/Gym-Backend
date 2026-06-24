import mongoose, { Document, Schema, Model } from "mongoose";

export type EnquiryStatus = "new" | "contacted" | "closed";

export interface IEnquiry extends Document {
  name: string;
  email?: string;
  phone: string;
  message: string;
  status: EnquiryStatus;
  note?: string;
  source?: "walk-in" | "online" | "referral" | "chatbot" | "other";
}

const enquirySchema = new Schema<IEnquiry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new" },
    note:   { type: String },
    source: { type: String, enum: ["walk-in", "online", "referral", "chatbot", "other"] },
  },
  { timestamps: true }
);

export const Enquiry: Model<IEnquiry> = mongoose.model<IEnquiry>("Enquiry", enquirySchema);
