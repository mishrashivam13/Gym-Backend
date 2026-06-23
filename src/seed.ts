import { connectDB } from "./config/db";
import { Admin } from "./models/Admin";

async function seed() {
  await connectDB();

  const existing = await Admin.findOne({ email: "admin@centrumgym.com" });
  if (existing) {
    console.log("Admin already exists:", existing.email);
    process.exit(0);
  }

  await Admin.create({
    email: "admin@centrumgym.com",
    password: "Admin@123",
    name: "Centrum Admin",
  });

  console.log("Admin created: admin@centrumgym.com / Admin@123");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
