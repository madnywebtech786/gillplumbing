import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import AuditLog from "@/models/AuditLog";

function serializeAuditEntry(entry) {
  return {
    id: entry._id.toString(),
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId.toString(),
    summary: entry.summary,
    actorName: entry.actorUserId?.name ?? "Unknown",
    actorRole: entry.actorRole,
    createdAt: entry.createdAt,
  };
}

export async function listAuditLogForActor({ entityType, action, actorUserId, startDate, endDate } = {}) {
  await connectToDatabase();

  const query = {};
  if (entityType) query.entityType = entityType;
  if (action) query.action = action;
  if (actorUserId) query.actorUserId = actorUserId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const entries = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("actorUserId", "name")
    .lean();

  return entries.map(serializeAuditEntry);
}

export async function listRecentAuditActivityForUser(actorUserId, limit = 20) {
  await connectToDatabase();

  const entries = await AuditLog.find({ actorUserId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("actorUserId", "name")
    .lean();

  return entries.map(serializeAuditEntry);
}

export async function getAuditLogForEntity(entityType, entityId) {
  await connectToDatabase();

  const entries = await AuditLog.find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .populate("actorUserId", "name")
    .lean();

  return entries.map(serializeAuditEntry);
}
