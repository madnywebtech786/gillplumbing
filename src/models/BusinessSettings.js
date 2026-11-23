import mongoose from "mongoose";

const SINGLETON_KEY = "default";

const BusinessSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: SINGLETON_KEY },
    businessName: { type: String, required: true, trim: true },
    timeZone: { type: String, required: true },
    currencyCode: { type: String, required: true },
    defaultAppointmentDurationMinutes: { type: Number, min: 1 },
    remindersEnabled: { type: Boolean, default: false },
    reminderChannel: { type: String, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

BusinessSettingsSchema.statics.SINGLETON_KEY = SINGLETON_KEY;

export default mongoose.models.BusinessSettings ||
  mongoose.model("BusinessSettings", BusinessSettingsSchema);
