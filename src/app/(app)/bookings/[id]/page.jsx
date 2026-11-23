import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getBookingDetailForActor } from "@/server/queries/bookings";
import { getActiveEmployeesForAssignment } from "@/server/queries/employees";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RescheduleBookingDialog } from "@/components/forms/RescheduleBookingDialog";
import { CancelBookingDialog } from "@/components/forms/CancelBookingDialog";
import { BookingStatusForm } from "@/components/forms/BookingStatusForm";
import { AssignEmployeesDialog } from "@/components/forms/AssignEmployeesDialog";
import { BOOKING_STATUS_DISPLAY } from "@/lib/status-display";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";
import { BOOKING_STATUS } from "@/constants/statuses";
import { ROLES } from "@/constants/roles";

export default async function BookingDetailPage({ params }) {
  const actor = await requireUser();
  const { id } = await params;

  const booking = await getBookingDetailForActor(id, actor);
  if (!booking) {
    notFound();
  }

  const canManage = booking.status !== BOOKING_STATUS.CANCELLED;
  const employees =
    actor.role === ROLES.ADMIN ? await getActiveEmployeesForAssignment() : [];

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <Link href="/bookings" className="text-sm text-ink-muted hover:text-ink">
        ← Back to bookings
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {booking.bookingNumber}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Created by {booking.createdByName} on{" "}
            {formatDateTimeInBusinessZone(booking.createdAt, "PPp")}
          </p>
        </div>
        <Badge tone={BOOKING_STATUS_DISPLAY[booking.status]?.tone}>
          {BOOKING_STATUS_DISPLAY[booking.status]?.label}
        </Badge>
      </div>

      {booking.inquiryId && (
        <Card className="bg-accent-soft border-accent/30">
          <p className="text-sm text-ink">
            Converted from{" "}
            <Link
              href={`/inquiries/${booking.inquiryId}`}
              className="font-medium text-accent hover:underline"
            >
              inquiry →
            </Link>
          </p>
        </Card>
      )}

      {booking.cancelReason && (
        <Card className="bg-danger-soft border-danger/30">
          <p className="text-sm text-ink">Cancelled: {booking.cancelReason}</p>
        </Card>
      )}

      {canManage && (
        <div className="flex flex-wrap items-end gap-2">
          <BookingStatusForm bookingId={booking.id} currentStatus={booking.status} />
          <RescheduleBookingDialog bookingId={booking.id} />
          {actor.role === ROLES.ADMIN && (
            <AssignEmployeesDialog
              bookingId={booking.id}
              employees={employees}
              assignedEmployeeIds={booking.assignedEmployeeIds}
            />
          )}
          <CancelBookingDialog bookingId={booking.id} />
        </div>
      )}

      <Card>
        <CardHeader title="Customer" />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-muted">Name</dt>
            <dd className="text-ink font-medium">{booking.customerName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-ink font-medium">{booking.customerPhone}</dd>
          </div>
          {booking.address?.line1 && (
            <div className="col-span-2">
              <dt className="text-ink-muted">Service address</dt>
              <dd className="text-ink font-medium">
                {booking.address.line1}
                {booking.address.city ? `, ${booking.address.city}` : ""}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <CardHeader title="Job details" />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-muted">Service</dt>
            <dd className="text-ink font-medium">{booking.serviceName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Scheduled</dt>
            <dd className="text-ink font-medium">
              {formatDateTimeInBusinessZone(booking.scheduledStartAt, "PPp")}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Assigned to</dt>
            <dd className="text-ink font-medium">
              {booking.assignedEmployeeNames.length > 0
                ? booking.assignedEmployeeNames.join(", ")
                : "Unassigned"}
            </dd>
          </div>
          {booking.serviceDescription && (
            <div className="col-span-2">
              <dt className="text-ink-muted">Description</dt>
              <dd className="text-ink">{booking.serviceDescription}</dd>
            </div>
          )}
          {booking.internalNotes && (
            <div className="col-span-2">
              <dt className="text-ink-muted">Internal notes</dt>
              <dd className="text-ink">{booking.internalNotes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <CardHeader title="History" />
        <ul className="flex flex-col divide-y divide-border">
          {booking.history.map((event, index) => (
            <li key={index} className="py-2 text-sm">
              <p className="text-ink">{event.summary}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {event.actorName} · {formatDateTimeInBusinessZone(event.occurredAt, "PPp")}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
