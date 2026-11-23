import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import Inquiry from "@/models/Inquiry";
import User from "@/models/User";
import { ROLES } from "@/constants/roles";

export async function getInquiriesListForActor(actor, { status } = {}) {
  await connectToDatabase();

  const query = {};
  if (actor.role !== ROLES.ADMIN) {
    query.createdBy = actor.id;
  }
  if (status) {
    query.status = status;
  }

  const inquiries = await Inquiry.find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("createdBy", "name")
    .lean();

  return inquiries.map((inquiry) => ({
    id: inquiry._id.toString(),
    inquiryNumber: inquiry.inquiryNumber,
    customerName: inquiry.customerSnapshot?.name,
    customerPhone: inquiry.customerSnapshot?.phone,
    addressCity: inquiry.serviceAddressSnapshot?.city ?? null,
    callSummary: inquiry.callSummary,
    status: inquiry.status,
    followUpAt: inquiry.followUpAt ?? null,
    createdAt: inquiry.createdAt,
    createdByName: inquiry.createdBy?.name ?? "Unknown",
    convertedBookingId: inquiry.convertedBookingId?.toString() ?? null,
  }));
}

export async function getInquiryDetailForActor(inquiryId, actor) {
  await connectToDatabase();

  const inquiry = await Inquiry.findById(inquiryId)
    .populate("createdBy", "name")
    .populate("history.actorId", "name")
    .lean();

  if (!inquiry) {
    return null;
  }

  if (actor.role !== ROLES.ADMIN && inquiry.createdBy?._id.toString() !== actor.id) {
    return null;
  }

  return {
    id: inquiry._id.toString(),
    inquiryNumber: inquiry.inquiryNumber,
    customerName: inquiry.customerSnapshot?.name,
    customerPhone: inquiry.customerSnapshot?.phone,
    address: inquiry.serviceAddressSnapshot ?? null,
    callSummary: inquiry.callSummary,
    status: inquiry.status,
    followUpAt: inquiry.followUpAt ?? null,
    closeReason: inquiry.closeReason ?? null,
    createdAt: inquiry.createdAt,
    createdByName: inquiry.createdBy?.name ?? "Unknown",
    convertedBookingId: inquiry.convertedBookingId?.toString() ?? null,
    history: (inquiry.history ?? []).map((event) => ({
      type: event.type,
      summary: event.summary,
      occurredAt: event.occurredAt,
      actorName: event.actorId?.name ?? "Unknown",
    })),
  };
}
