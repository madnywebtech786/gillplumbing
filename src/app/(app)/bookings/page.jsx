import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getBookingsListForActor } from "@/server/queries/bookings";
import { Table, TableHead, TableBody, TableCell, TableEmptyState } from "@/components/ui/Table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BOOKING_STATUS_DISPLAY } from "@/lib/status-display";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";
import { ROLES } from "@/constants/roles";

export default async function BookingsPage() {
  const actor = await requireUser();
  const bookings = await getBookingsListForActor(actor);

  const columns =
    actor.role === ROLES.ADMIN
      ? ["Booking", "Customer", "Service", "Scheduled", "Assigned to", "Status"]
      : ["Booking", "Customer", "Service", "Scheduled", "Status"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Bookings</h1>
          <p className="text-sm text-ink-muted mt-1">
            {actor.role === ROLES.ADMIN
              ? "All scheduled jobs across the business."
              : "Jobs assigned to you."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings/calendar">
            <Button variant="secondary">Calendar</Button>
          </Link>
          <Link href="/bookings/new">
            <Button>New booking</Button>
          </Link>
        </div>
      </div>

      <Table>
        <TableHead columns={columns} />
        <TableBody>
          {bookings.length === 0 ? (
            <TableEmptyState
              colSpan={columns.length}
              message="No bookings yet. Create one, or convert an inquiry."
            />
          ) : (
            bookings.map((booking) => (
              <ClickableRow key={booking.id} href={`/bookings/${booking.id}`}>
                <TableCell>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {booking.bookingNumber}
                  </Link>
                </TableCell>
                <TableCell>{booking.customerName}</TableCell>
                <TableCell>{booking.serviceName}</TableCell>
                <TableCell>
                  {formatDateTimeInBusinessZone(booking.scheduledStartAt, "PPp")}
                </TableCell>
                {actor.role === ROLES.ADMIN && (
                  <TableCell>
                    {booking.assignedEmployeeNames.length > 0
                      ? booking.assignedEmployeeNames.join(", ")
                      : "Unassigned"}
                  </TableCell>
                )}
                <TableCell>
                  <Badge tone={BOOKING_STATUS_DISPLAY[booking.status]?.tone}>
                    {BOOKING_STATUS_DISPLAY[booking.status]?.label}
                  </Badge>
                </TableCell>
              </ClickableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
