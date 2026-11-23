// One-time setup script: creates the first admin account from
// INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD env vars. Safe to run
// multiple times — does nothing if an admin already exists.
//
// Usage: node scripts/bootstrap-admin.js

require("dotenv").config({ path: ".env" });

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in .env"
    );
    process.exit(1);
  }

  const mongoose = require("mongoose");
  const bcrypt = require("bcryptjs");

  await mongoose.connect(process.env.MONGODB_URI);

  const UserSchema = new mongoose.Schema(
    {
      name: String,
      email: { type: String, unique: true, lowercase: true },
      passwordHash: String,
      role: String,
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const existingAdmin = await User.findOne({ role: "ADMIN" });
  if (existingAdmin) {
    console.log(`Admin already exists (${existingAdmin.email}). Skipping.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await User.create({
    name: "Admin",
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "ADMIN",
    isActive: true,
  });

  console.log(`Created first admin: ${admin.email}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Bootstrap failed:", error.message);
  process.exit(1);
});
