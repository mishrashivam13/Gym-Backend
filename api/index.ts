import "../src/config/env"; // load env vars from .env (local) — on Vercel, vars come from dashboard
import app from "../src/app";
import { connectDB } from "../src/config/db";

// Connect DB once per cold start (cached for warm invocations)
let ready = false;
const ensureDB = async () => {
  if (!ready) { await connectDB(); ready = true; }
};

export default async function handler(req: import("http").IncomingMessage, res: import("http").ServerResponse) {
  await ensureDB();
  return app(req, res);
}
