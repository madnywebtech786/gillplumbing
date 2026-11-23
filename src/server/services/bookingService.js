import "server-only";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import Booking from "@/models/Booking";
import Inquiry from "@/models/Inquiry";
import User from "@/models/User";
import { findOrCreateCustomerByPhone } from "@/server/services/customerService";
import { nextReferenceNumber } from "@/lib/numbering";
import { zonedDateTimeToUtc } from "@/lib/dates/business-time";
import { recordAuditEvent } from "@/server/services/auditService";
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  BOOKING_STATUS,
  BOOKING_STATUS_TRANSITIONS,
  INQUIRY_STATUS,
} from "@/constants/statuses";
import { ROLES } from "@/constants/roles";

// Assigned employees must exist, be active, and have role EMPLOYEE (spec
// 12.3) - never trust that the IDs the browser sent are still valid.
async function assertAssignableEmployees(employeeIds, session) {
  if (!employeeIds || employeeIds.length === 0) {
    return;
  }

  const validCount = await User.countDocuments({
    _id: { $in: employeeIds },
    role: ROLES.EMPLOYEE,
    isActive: true,
  }).session(session ?? null);

  if (validCount !== new Set(employeeIds.map(String)).size) {
    throw new Error("One or more assigned employees are invalid, inactive, or not an employee account.");
  }
}

export async function createBooking(
  {
    customerName,
    customerPhone,
    addressLine1,
    addressCity,
    serviceName,
    serviceDescription,
    scheduledDate,
    scheduledTime,
    expectedDurationMinutes,
    assignedEmployeeIds,
    internalNotes,
  },
  actor
) {
  await connectToDatabase();

  await assertAssignableEmployees(assignedEmployeeIds);

  const customer = await findOrCreateCustomerByPhone({
    name: customerName,
    phone: customerPhone,
    createdBy: actor.id,
  });

  const bookingNumber = await nextReferenceNumber("booking");
  const scheduledStartAt = zonedDateTimeToUtc(scheduledDate, scheduledTime);

  const booking = await Booking.create({
    bookingNumber,
    customerId: customer._id,
    customerSnapshot: { name: customerName, phone: customerPhone },
    serviceAddressSnapshot: { line1: addressLine1, city: addressCity || undefined },
    serviceName,
    serviceDescription: serviceDescription || undefined,
    internalNotes: internalNotes || undefined,
    scheduledStartAt,
    expectedDurationMinutes: expectedDurationMinutes || undefined,
    assignedEmployeeIds: assignedEmployeeIds || [],
    status: BOOKING_STATUS.SCHEDULED,
    history: [
      {
        type: "CREATED",
        summary: "Booking created",
        actorId: actor.id,
      },
    ],
    createdBy: actor.id,
  });

  await recordAuditEvent(
    {
      action: AUDIT_ACTION.BOOKING_CREATED,
      entityType: AUDIT_ENTITY_TYPE.BOOKING,
      entityId: booking._id,
      summary: `Booking ${booking.bookingNumber} created`,
    },
    actor
  );

  return booking;
}

// Converts an inquiry into a booking atomically: the booking is created and
// the inquiry is flipped to CONVERTED in a single transaction, so a failure
// partway through never leaves an inquiry marked converted without a booking
// (or vice versa). Requires a MongoDB replica set (Atlas provides this).
export async function convertInquiryToBooking(
  inquiryId,
  {
    serviceName,
    serviceDescription,
    scheduledDate,
    scheduledTime,
    expectedDurationMinutes,
    assignedEmployeeIds,
    internalNotes,
  },
  actor
) {
  await connectToDatabase();

  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) {
    throw new Error("Inquiry not found.");
  }

  if (actor.role !== ROLES.ADMIN && inquiry.createdBy.toString() !== actor.id) {
    throw new Error("You do not have access to this inquiry.");
  }

  if (inquiry.status === INQUIRY_STATUS.CONVERTED) {
    throw new Error("This inquiry has already been converted.");
  }
  if (inquiry.status === INQUIRY_STATUS.CLOSED) {
    throw new Error("A closed inquiry cannot be converted to a booking.");
  }

  await assertAssignableEmployees(assignedEmployeeIds);

  const bookingNumber = await nextReferenceNumber("booking");
  const scheduledStartAt = zonedDateTimeToUtc(scheduledDate, scheduledTime);

  const session = await mongoose.startSession();
  let booking;
  try {
    await session.withTransaction(async () => {
      const [createdBooking] = await Booking.create(
        [
          {
            bookingNumber,
            customerId: inquiry.customerId,
            customerSnapshot: inquiry.customerSnapshot,
            serviceAddressSnapshot: inquiry.serviceAddressSnapshot,
            inquiryId: inquiry._id,
            serviceName,
            serviceDescription: serviceDescription || undefined,
            internalNotes: internalNotes || undefined,
            scheduledStartAt,
            expectedDurationMinutes: expectedDurationMinutes || undefined,
            assignedEmployeeIds: assignedEmployeeIds || [],
            status: BOOKING_STATUS.SCHEDULED,
            history: [
              {
                type: "CREATED",
                summary: `Booking created from inquiry ${inquiry.inquiryNumber}`,
                actorId: actor.id,
              },
            ],
            createdBy: actor.id,
          },
        ],
        { session }
      );
      booking = createdBooking;

      inquiry.status = INQUIRY_STATUS.CONVERTED;
      inquiry.convertedBookingId = booking._id;
      inquiry.updatedBy = actor.id;
      inquiry.history.push({
        type: "CONVERTED",
        summary: `Converted to booking ${bookingNumber}`,
        actorId: actor.id,
      });
      await inquiry.save({ session });

      await recordAuditEvent(
        {
          action: AUDIT_ACTION.BOOKING_CREATED,
          entityType: AUDIT_ENTITY_TYPE.BOOKING,
          entityId: booking._id,
          summary: `Booking ${booking.bookingNumber} created from inquiry ${inquiry.inquiryNumber}`,
        },
        actor,
        session
      );
      await recordAuditEvent(
        {
          action: AUDIT_ACTION.INQUIRY_CONVERTED,
          entityType: AUDIT_ENTITY_TYPE.INQUIRY,
          entityId: inquiry._id,
          summary: `Inquiry ${inquiry.inquiryNumber} converted to booking ${booking.bookingNumber}`,
        },
        actor,
        session
      );
    });
  } finally {
    await session.endSession();
  }

  return booking;
}

// Employees can view and act on all bookings, not only ones assigned to
// them (spec 4.1/4.2/8.5/8.7). The employeeId filter is an admin-only
// narrowing option.
export async function listBookingsForActor(actor, { status, employeeId } = {}) {
  await connectToDatabase();

  const query = {};
  if (actor.role === ROLES.ADMIN && employeeId) {
    query.assignedEmployeeIds = employeeId;
  }
  if (status) {
    query.status = status;
  }

  return Booking.find(query).sort({ scheduledStartAt: -1 }).lean();
}

export async function getBookingForActor(bookingId) {
  await connectToDatabase();
  return Booking.findById(bookingId).lean();
}

export async function rescheduleBooking(bookingId, { scheduledDate, scheduledTime }, actor) {
  await connectToDatabase();

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found.");
  }
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    throw new Error("A cancelled booking cannot be rescheduled.");
  }

  const previousStartAt = booking.scheduledStartAt;
  const newStartAt = zonedDateTimeToUtc(scheduledDate, scheduledTime);
  booking.scheduledStartAt = newStartAt;
  booking.updatedBy = actor.id;
  booking.history.push({
    type: "RESCHEDULED",
    summary: "Booking rescheduled",
    actorId: actor.id,
    metadata: { previousStartAt },
  });

  await booking.save();

  await recordAuditEvent({
    action: AUDIT_ACTION.BOOKING_RESCHEDULED,
    entityType: AUDIT_ENTITY_TYPE.BOOKING,
    entityId: booking._id,
    summary: `Booking ${booking.bookingNumber} rescheduled`,
    before: { scheduledStartAt: previousStartAt },
    after: { scheduledStartAt: newStartAt },
  }, actor);

  return booking;
}

export async function updateBookingStatus(bookingId, { status }, actor) {
  await connectToDatabase();

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found.");
  }

  const allowedTransitions = BOOKING_STATUS_TRANSITIONS[booking.status] || [];
  if (!allowedTransitions.includes(status)) {
    throw new Error(`Cannot change status from ${booking.status} to ${status}.`);
  }

  const previousStatus = booking.status;
  booking.status = status;
  booking.updatedBy = actor.id;
  booking.history.push({
    type: "STATUS_CHANGED",
    summary: `Status changed from ${previousStatus} to ${status}`,
    actorId: actor.id,
  });

  await booking.save();

  await recordAuditEvent({
    action: AUDIT_ACTION.BOOKING_STATUS_CHANGED,
    entityType: AUDIT_ENTITY_TYPE.BOOKING,
    entityId: booking._id,
    summary: `Booking ${booking.bookingNumber} status changed from ${previousStatus} to ${status}`,
    before: { status: previousStatus },
    after: { status },
  }, actor);

  return booking;
}

export async function cancelBooking(bookingId, { cancelReason }, actor) {
  await connectToDatabase();

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found.");
  }

  const allowedTransitions = BOOKING_STATUS_TRANSITIONS[booking.status] || [];
  if (!allowedTransitions.includes(BOOKING_STATUS.CANCELLED)) {
    throw new Error("This booking cannot be cancelled.");
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancelReason = cancelReason;
  booking.updatedBy = actor.id;
  booking.history.push({
    type: "CANCELLED",
    summary: `Booking cancelled: ${cancelReason}`,
    actorId: actor.id,
  });

  await booking.save();

  await recordAuditEvent({
    action: AUDIT_ACTION.BOOKING_CANCELLED,
    entityType: AUDIT_ENTITY_TYPE.BOOKING,
    entityId: booking._id,
    summary: `Booking ${booking.bookingNumber} cancelled: ${cancelReason}`,
    metadata: { reason: cancelReason },
  }, actor);

  return booking;
}

export async function assignEmployeesToBooking(bookingId, { assignedEmployeeIds }, actor) {
  // Defense-in-depth: admin-only per the permission matrix (spec 4.1/8.7).
  // The calling Server Action already enforces this via requireAdmin(), but
  // the service re-checks so a future caller cannot skip it by calling the
  // service directly.
  if (actor.role !== ROLES.ADMIN) {
    throw new Error("Forbidden: admin access required");
  }

  await connectToDatabase();

  await assertAssignableEmployees(assignedEmployeeIds);

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found.");
  }

  const previousEmployeeIds = (booking.assignedEmployeeIds || []).map((id) => id.toString());
  booking.assignedEmployeeIds = assignedEmployeeIds || [];
  booking.updatedBy = actor.id;
  booking.history.push({
    type: "EMPLOYEES_ASSIGNED",
    summary: "Assigned employees updated",
    actorId: actor.id,
  });

  await booking.save();

  await recordAuditEvent({
    action: AUDIT_ACTION.BOOKING_EMPLOYEES_ASSIGNED,
    entityType: AUDIT_ENTITY_TYPE.BOOKING,
    entityId: booking._id,
    summary: `Booking ${booking.bookingNumber} assigned employees updated`,
    before: { assignedEmployeeIds: previousEmployeeIds },
    after: { assignedEmployeeIds: assignedEmployeeIds || [] },
  }, actor);

  return booking;
}
