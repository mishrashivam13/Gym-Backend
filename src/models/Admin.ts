import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdmin extends Document {
  email: string;
  password: string;
  name: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true, default: "Admin" },
  },
  { timestamps: true }
);

adminSchema.pre<IAdmin>("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password as string, 10);
});

adminSchema.methods.comparePassword = function (
  this: IAdmin,
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const Admin: Model<IAdmin> = mongoose.model<IAdmin>("Admin", adminSchema);
