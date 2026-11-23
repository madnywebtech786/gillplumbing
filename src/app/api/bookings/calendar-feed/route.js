import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/dal";
import { getBookingsInRangeForActor } from "@/server/queries/bookings";
import { BOOKING_STATUS_DISPLAY } from "@/lib/status-display";

export async function GET(request) {
  const actor = await requireUser();

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start/end." }, { status: 400 });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid start/end." }, { status: 400 });
  }

  const bookings = await getBookingsInRangeForActor(actor, startDate, endDate);

  const events = bookings.map((booking) => ({
    id: booking.id,
    title: booking.customerName,
    start: booking.scheduledStartAt,
    end: booking.expectedDurationMinutes
      ? new Date(
          new Date(booking.scheduledStartAt).getTime() +
            booking.expectedDurationMinutes * 60000
        ).toISOString()
      : undefined,
    // Styling for each status lives in globals.css (.fc-status-*) instead of
    // an inline `color`, so the tile can use a soft tint + accent bar that
    // matches the Badge tone system rather than a solid color chip.
    classNames: [`fc-status-${booking.status.toLowerCase().replaceAll("_", "-")}`],
    extendedProps: {
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerName,
      serviceName: booking.serviceName,
      status: booking.status,
      statusLabel: BOOKING_STATUS_DISPLAY[booking.status]?.label ?? booking.status,
      assignedEmployeeNames: booking.assignedEmployeeNames,
    },
  }));

  return NextResponse.json(events);
}
