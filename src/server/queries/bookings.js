import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import Booking from "@/models/Booking";
import Inquiry from "@/models/Inquiry";
import { ROLES } from "@/constants/roles";
import { BOOKING_STATUS } from "@/constants/statuses";

function serializeBooking(booking) {
  return {
    id: booking._id.toString(),
    bookingNumber: booking.bookingNumber,
    customerName: booking.customerSnapshot?.name,
    customerPhone: booking.customerSnapshot?.phone,
    addressLine1: booking.serviceAddressSnapshot?.line1 ?? null,
    addressCity: booking.serviceAddressSnapshot?.city ?? null,
    serviceName: booking.serviceName,
    serviceDescription: booking.serviceDescription ?? null,
    scheduledStartAt: booking.scheduledStartAt,
    expectedDurationMinutes: booking.expectedDurationMinutes ?? null,
    status: booking.status,
    cancelReason: booking.cancelReason ?? null,
    inquiryId: booking.inquiryId?.toString() ?? null,
    assignedEmployeeNames: (booking.assignedEmployeeIds ?? [])
      .map((employee) => employee?.name)
      .filter(Boolean),
    assignedEmployeeIds: (booking.assignedEmployeeIds ?? []).map((employee) =>
      employee?._id ? employee._id.toString() : employee.toString()
    ),
    createdAt: booking.createdAt,
    createdByName: booking.createdBy?.name ?? "Unknown",
  };
}

// Employees can view all bookings, not only ones assigned to them (spec
// 4.1/4.2/8.5/8.7). The employeeId filter is an admin-only narrowing option.
export async function getBookingsListForActor(actor, { status, employeeId } = {}) {
  await connectToDatabase();

  const query = {};
  if (actor.role === ROLES.ADMIN && employeeId) {
    query.assignedEmployeeIds = employeeId;
  }
  if (status) {
    query.status = status;
  }

  const bookings = await Booking.find(query)
    .sort({ scheduledStartAt: -1 })
    .limit(200)
    .populate("assignedEmployeeIds", "name")
    .populate("createdBy", "name")
    .lean();

  return bookings.map(serializeBooking);
}

// Date-range lookup for the calendar UI, which requests whatever window the
// currently visible month/week/day view spans (FullCalendar passes exact
// UTC instants for that window, so no business-timezone day-key conversion
// is needed here, unlike the day-key based helper above).
export async function getBookingsInRangeForActor(actor, startUtc, endUtc) {
  await connectToDatabase();

  const query = {
    scheduledStartAt: { $gte: startUtc, $lt: endUtc },
    // Cancelled bookings stay visible in the booking list/detail history
    // (spec 5.4) but are excluded from the calendar view - a cancelled slot
    // isn't a real commitment on the schedule.
    status: { $ne: BOOKING_STATUS.CANCELLED },
  };

  const bookings = await Booking.find(query)
    .sort({ scheduledStartAt: 1 })
    .populate("assignedEmployeeIds", "name")
    .populate("createdBy", "name")
    .lean();

  return bookings.map(serializeBooking);
}

export async function getBookingDetailForActor(bookingId, actor) {
  await connectToDatabase();

  const booking = await Booking.findById(bookingId)
    .populate("assignedEmployeeIds", "name email")
    .populate("createdBy", "name")
    .populate("history.actorId", "name")
    .lean();

  if (!booking) {
    return null;
  }

  const serialized = serializeBooking(booking);

  // An employee can view this booking (spec 4.1/4.2: all employees see all
  // bookings), but the inquiry it was converted from is only visible to its
  // creator or an admin (spec 4.2). Rather than show a "Converted from
  // inquiry" link that 404s for everyone else, only hand the page an
  // inquiryId the current actor can actually open - the page's existing
  // `{booking.inquiryId && (...)}` check then just doesn't render it.
  if (serialized.inquiryId && actor.role !== ROLES.ADMIN) {
    const inquiry = await Inquiry.findById(serialized.inquiryId).select("createdBy").lean();
    if (!inquiry || inquiry.createdBy?.toString() !== actor.id) {
      serialized.inquiryId = null;
    }
  }

  return {
    ...serialized,
    internalNotes: booking.internalNotes ?? null,
    address: booking.serviceAddressSnapshot ?? null,
    history: (booking.history ?? []).map((event) => ({
      type: event.type,
      summary: event.summary,
      occurredAt: event.occurredAt,
      actorName: event.actorId?.name ?? "Unknown",
    })),
  };
}
