import mongoose from "mongoose";
import { ALL_AUDIT_ACTIONS, ALL_AUDIT_ENTITY_TYPES } from "@/constants/statuses";
import { ALL_ROLES } from "@/constants/roles";

const AuditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: { type: String, enum: ALL_ROLES, required: true },
    action: { type: String, enum: ALL_AUDIT_ACTIONS, required: true },
    entityType: { type: String, enum: ALL_AUDIT_ENTITY_TYPES, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    summary: { type: String, required: true, trim: true },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
