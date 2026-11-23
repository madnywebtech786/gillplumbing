import mongoose from "mongoose";
import { ALL_ROLES, ROLES } from "@/constants/roles";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ALL_ROLES, required: true, default: ROLES.EMPLOYEE },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, isActive: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);
