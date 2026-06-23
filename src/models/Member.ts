import mongoose, { Document, Schema, Model } from "mongoose";

export type PlanType = "basic" | "standard" | "premium" | "yearly";
export type MemberStatus = "active" | "expired" | "paused";
export type FitnessGoal = "weight_loss" | "muscle_gain" | "maintenance" | "endurance" | "flexibility";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export interface IFeePayment {
  amount: number;
  date: Date;
  method: "cash" | "upi" | "card" | "bank";
  note?: string;
}

export interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IMember extends Document {
  // Basic info
  name: string;
  email?: string;
  phone: string;
  address?: string;

  // Plan
  plan: PlanType;
  planPrice: number;
  startDate: Date;
  endDate: Date;
  status: MemberStatus;
  joiningDate: Date;
  feeHistory: IFeePayment[];
  photo?: string;

  // Physical profile
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  height?: number;   // cm
  weight?: number;   // kg

  // Fitness profile
  fitnessGoal?: FitnessGoal;
  activityLevel?: ActivityLevel;
  healthNotes?: string;

  // Emergency contact
  emergencyContact?: IEmergencyContact;
}

const feePaymentSchema = new Schema<IFeePayment>(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, enum: ["cash", "upi", "card", "bank"], default: "cash" },
    note: { type: String },
  },
  { _id: false }
);

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String },
    phone: { type: String },
    relation: { type: String },
  },
  { _id: false }
);

const memberSchema = new Schema<IMember>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String },
    plan: { type: String, enum: ["basic", "standard", "premium", "yearly"], required: true },
    planPrice: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "expired", "paused"], default: "active" },
    joiningDate: { type: Date, default: Date.now },
    feeHistory: { type: [feePaymentSchema], default: [] },
    photo: { type: String },

    // Physical
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    height: { type: Number },
    weight: { type: Number },

    // Fitness
    fitnessGoal: { type: String, enum: ["weight_loss", "muscle_gain", "maintenance", "endurance", "flexibility"] },
    activityLevel: { type: String, enum: ["sedentary", "light", "moderate", "active"] },
    healthNotes: { type: String },

    // Emergency
    emergencyContact: { type: emergencyContactSchema },
  },
  { timestamps: true }
);

memberSchema.pre("save", function () {
  if (this.endDate < new Date()) this.status = "expired";
});

export const Member: Model<IMember> = mongoose.model<IMember>("Member", memberSchema);
