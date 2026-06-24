import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { Admin } from "../models/Admin";
import { AuthRequest } from "../middleware/auth";

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    { adminId: admin._id.toString(), email: admin.email },
    config.jwtSecret,
    { expiresIn: "30d" }
  );

  res.json({ token, message: "Login successful", name: admin.name });
}

export async function adminDashboard(req: AuthRequest, res: Response): Promise<void> {
  const admin = await Admin.findById(req.adminId).select("-password");
  if (!admin) {
    res.status(404).json({ message: "Admin not found" });
    return;
  }
  res.json({ message: `Welcome, ${admin.name}!`, admin });
}
