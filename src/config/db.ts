import mongoose from "mongoose";
import { config } from "./env";

// Cache connection across serverless invocations
let cached = (global as Record<string, unknown>)._mongoConn as
  | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
  | undefined;

if (!cached) {
  cached = (global as Record<string, unknown>)._mongoConn = { conn: null, promise: null };
}

export async function connectDB(): Promise<void> {
  if (cached!.conn) return;

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(config.mongoUri).then((m) => m);
  }

  try {
    cached!.conn = await cached!.promise;
    console.log("MongoDB connected");
  } catch (err) {
    cached!.promise = null;
    console.error("MongoDB connection error:", err);
    if (process.env.NODE_ENV !== "production") process.exit(1);
    throw err;
  }
}
