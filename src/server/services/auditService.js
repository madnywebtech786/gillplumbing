import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import AuditLog from "@/models/AuditLog";

// Records one audit event. Pass `session` whenever the caller already has a
// MongoDB transaction open so the audit row commits atomically with the
// operation it describes (spec 9.8: "created in the same MongoDB transaction
// as the operation whenever possible").
export async function recordAuditEvent(
  { action, entityType, entityId, summary, before, after, metadata },
  actor,
  session
) {
  await connectToDatabase();

  await AuditLog.create(
    [
      {
        actorUserId: actor.id,
        actorRole: actor.role,
        action,
        entityType,
        entityId,
        summary,
        before: before ?? undefined,
        after: after ?? undefined,
        metadata: metadata ?? undefined,
      },
    ],
    { session }
  );
}
