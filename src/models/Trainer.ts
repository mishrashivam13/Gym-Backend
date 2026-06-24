import mongoose, { Schema, Document } from "mongoose";

export interface ITrainer extends Document {
  name: string;
  phone: string;
  email?: string;
  specialization?: string;
  experience?: number;
  salary?: number;
  joiningDate: Date;
  status: "active" | "inactive";
  imageUrl?: string;
  address?: string;
  note?: string;
}

const TrainerSchema = new Schema<ITrainer>(
  {
    name:           { type: String, required: true, trim: true },
    phone:          { type: String, required: true, trim: true },
    email:          { type: String, trim: true },
    specialization: { type: String },
    experience:     { type: Number },
    salary:         { type: Number },
    joiningDate:    { type: Date, default: Date.now },
    status:         { type: String, enum: ["active", "inactive"], default: "active" },
    imageUrl:       { type: String },
    address:        { type: String },
    note:           { type: String },
  },
  { timestamps: true }
);

export const Trainer = mongoose.model<ITrainer>("Trainer", TrainerSchema);
