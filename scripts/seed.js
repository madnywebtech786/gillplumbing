// Dev-only seed script: ensures BusinessSettings exists, and optionally
// adds clearly-fake sample data for demoing. Safe to re-run.
//
// Usage: node scripts/seed.js

require("dotenv").config({ path: ".env" });

async function main() {
  const mongoose = require("mongoose");
  await mongoose.connect(process.env.MONGODB_URI);

  const BusinessSettingsSchema = new mongoose.Schema(
    {
      key: { type: String, unique: true, default: "default" },
      businessName: String,
      timeZone: String,
      currencyCode: String,
      defaultAppointmentDurationMinutes: Number,
      remindersEnabled: { type: Boolean, default: false },
      reminderChannel: { type: String, default: null },
    },
    { timestamps: true }
  );
  const BusinessSettings =
    mongoose.models.BusinessSettings ||
    mongoose.model("BusinessSettings", BusinessSettingsSchema);

  const existing = await BusinessSettings.findOne({ key: "default" });
  if (existing) {
    console.log("Business settings already seeded. Skipping.");
  } else {
    await BusinessSettings.create({
      key: "default",
      businessName: "Calgary Plumbing Co. (Demo)",
      timeZone: "America/Edmonton",
      currencyCode: "CAD",
      defaultAppointmentDurationMinutes: 60,
      remindersEnabled: false,
      reminderChannel: null,
    });
    console.log("Created default business settings (Calgary / CAD).");
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
