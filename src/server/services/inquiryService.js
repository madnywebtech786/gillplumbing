import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import Inquiry from "@/models/Inquiry";
import { findOrCreateCustomerByPhone } from "@/server/services/customerService";
import { nextReferenceNumber } from "@/lib/numbering";
import { recordAuditEvent } from "@/server/services/auditService";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, INQUIRY_STATUS } from "@/constants/statuses";
import { ROLES } from "@/constants/roles";

export async function createInquiry(
  { customerName, customerPhone, addressLine1, addressCity, callSummary },
  actor
) {
  await connectToDatabase();

  const customer = await findOrCreateCustomerByPhone({
    name: customerName,
    phone: customerPhone,
    createdBy: actor.id,
  });

  const inquiryNumber = await nextReferenceNumber("inquiry");

  const inquiry = await Inquiry.create({
    inquiryNumber,
    customerId: customer._id,
    customerSnapshot: { name: customerName, phone: customerPhone },
    serviceAddressSnapshot: { line1: addressLine1, city: addressCity || undefined },
    callSummary,
    status: INQUIRY_STATUS.NEW,
    history: [
      {
        type: "CREATED",
        summary: "Inquiry created",
        actorId: actor.id,
      },
    ],
    createdBy: actor.id,
  });

  await recordAuditEvent(
    {
      action: AUDIT_ACTION.INQUIRY_CREATED,
      entityType: AUDIT_ENTITY_TYPE.INQUIRY,
      entityId: inquiry._id,
      summary: `Inquiry ${inquiry.inquiryNumber} created`,
    },
    actor
  );

  return inquiry;
}

// Enforces the ownership rule at the query layer, not just in the UI:
// employees only see inquiries they created, admin sees all (spec 4.2).
export async function listInquiries(actor, { status } = {}) {
  await connectToDatabase();

  const query = {};
  if (actor.role !== ROLES.ADMIN) {
    query.createdBy = actor.id;
  }
  if (status) {
    query.status = status;
  }

  return Inquiry.find(query).sort({ createdAt: -1 }).lean();
}

export async function getInquiryForActor(inquiryId, actor) {
  await connectToDatabase();

  const inquiry = await Inquiry.findById(inquiryId).lean();
  if (!inquiry) {
    return null;
  }

  if (actor.role !== ROLES.ADMIN && inquiry.createdBy.toString() !== actor.id) {
    return null;
  }

  return inquiry;
}

export async function closeInquiry(inquiryId, { closeReason }, actor) {
  await connectToDatabase();

  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) {
    throw new Error("Inquiry not found.");
  }

  if (actor.role !== ROLES.ADMIN && inquiry.createdBy.toString() !== actor.id) {
    throw new Error("You do not have access to this inquiry.");
  }

  if (inquiry.status === INQUIRY_STATUS.CONVERTED) {
    throw new Error("A converted inquiry cannot be closed.");
  }

  inquiry.status = INQUIRY_STATUS.CLOSED;
  inquiry.closeReason = closeReason;
  inquiry.updatedBy = actor.id;
  inquiry.history.push({
    type: "CLOSED",
    summary: `Inquiry closed: ${closeReason}`,
    actorId: actor.id,
  });

  await inquiry.save();

  await recordAuditEvent(
    {
      action: AUDIT_ACTION.INQUIRY_CLOSED,
      entityType: AUDIT_ENTITY_TYPE.INQUIRY,
      entityId: inquiry._id,
      summary: `Inquiry ${inquiry.inquiryNumber} closed: ${closeReason}`,
      metadata: { reason: closeReason },
    },
    actor
  );

  return inquiry;
}

export async function setInquiryFollowUp(inquiryId, followUpAt, actor) {
  await connectToDatabase();

  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) {
    throw new Error("Inquiry not found.");
  }

  if (actor.role !== ROLES.ADMIN && inquiry.createdBy.toString() !== actor.id) {
    throw new Error("You do not have access to this inquiry.");
  }

  inquiry.followUpAt = followUpAt;
  inquiry.status = INQUIRY_STATUS.FOLLOW_UP;
  inquiry.updatedBy = actor.id;
  inquiry.history.push({
    type: "FOLLOW_UP_SET",
    summary: "Follow-up date set",
    actorId: actor.id,
  });

  await inquiry.save();

  await recordAuditEvent(
    {
      action: AUDIT_ACTION.INQUIRY_FOLLOW_UP_SET,
      entityType: AUDIT_ENTITY_TYPE.INQUIRY,
      entityId: inquiry._id,
      summary: `Inquiry ${inquiry.inquiryNumber} follow-up date set`,
    },
    actor
  );

  return inquiry;
}
