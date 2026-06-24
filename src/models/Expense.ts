import mongoose, { Document, Schema, Model } from "mongoose";

export type ExpenseCategory =
  | "rent" | "electricity" | "water" | "equipment" | "maintenance"
  | "staff_salary" | "marketing" | "supplements" | "cleaning" | "other";

export interface IExpense extends Document {
  category: ExpenseCategory;
  amount: number;
  date: Date;
  description?: string;
  paidTo?: string;
}

const expenseSchema = new Schema<IExpense>(
  {
    category:    { type: String, enum: ["rent","electricity","water","equipment","maintenance","staff_salary","marketing","supplements","cleaning","other"], required: true },
    amount:      { type: Number, required: true },
    date:        { type: Date, default: Date.now },
    description: { type: String },
    paidTo:      { type: String },
  },
  { timestamps: true }
);

export const Expense: Model<IExpense> = mongoose.model<IExpense>("Expense", expenseSchema);
