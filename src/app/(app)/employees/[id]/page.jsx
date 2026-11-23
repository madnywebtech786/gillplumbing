import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getEmployeeDetail } from "@/server/queries/employees";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { EmployeeStatusToggle } from "@/components/forms/EmployeeStatusToggle";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";
import { formatMinor } from "@/lib/money";
import {
  AUDIT_ACTION_DISPLAY,
  BOOKING_STATUS_DISPLAY,
  INQUIRY_STATUS_DISPLAY,
  JOB_REPORT_STATUS_DISPLAY,
} from "@/lib/status-display";

export default async function EmployeeDetailPage({ params }) {
  await requireAdmin();
  const { id } = await params;

  const employee = await getEmployeeDetail(id);
  if (!employee) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/employees" className="text-sm text-ink-muted hover:text-ink">
        ← Back to employees
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {employee.name}
          </h1>
          <p className="text-sm text-ink-muted mt-1">{employee.email}</p>
          {employee.phone && <p className="text-sm text-ink-muted">{employee.phone}</p>}
        </div>
        <EmployeeStatusToggle employeeId={employee.id} isActive={employee.isActive} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-ink-muted">Status</p>
          <Badge tone={employee.isActive ? "success" : "danger"} className="mt-2">
            {employee.isActive ? "Active" : "Deactivated"}
          </Badge>
        </Card>
        <Card>
          <p className="text-sm text-ink-muted">Joined</p>
          <p className="font-display text-lg font-semibold text-ink mt-1">
            {formatDateTimeInBusinessZone(employee.createdAt, "PP")}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-ink-muted">Total billed (submitted reports)</p>
          <p className="font-display text-lg font-semibold text-ink mt-1">
            {formatMinor(employee.totalBilledMinor, employee.currencyCode)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-ink-muted">Payments recorded</p>
          <p className="font-display text-lg font-semibold text-ink mt-1">
            {formatMinor(employee.totalPaymentsRecordedMinor, employee.currencyCode)}
          </p>
          <p className="text-xs text-ink-muted mt-1">Informational attribution only</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Bookings assigned" />
        {employee.bookingsAssigned.length === 0 ? (
          <EmptyState title="No bookings assigned yet" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {employee.bookingsAssigned.map((booking) => (
              <li key={booking.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  {booking.bookingNumber} · {booking.customerName}
                </span>
                <Badge tone={BOOKING_STATUS_DISPLAY[booking.status]?.tone}>
                  {BOOKING_STATUS_DISPLAY[booking.status]?.label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Inquiries created" />
        {employee.inquiriesCreated.length === 0 ? (
          <EmptyState title="No inquiries created yet" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {employee.inquiriesCreated.map((inquiry) => (
              <li key={inquiry.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  {inquiry.inquiryNumber} · {inquiry.customerName}
                </span>
                <Badge tone={INQUIRY_STATUS_DISPLAY[inquiry.status]?.tone}>
                  {INQUIRY_STATUS_DISPLAY[inquiry.status]?.label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Job reports" />
        {employee.jobReports.length === 0 ? (
          <EmptyState title="No job reports yet" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {employee.jobReports.map((report) => (
              <li key={report.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  {report.jobReportNumber} · {report.customerName} · {report.workDate}
                </span>
                <Badge tone={JOB_REPORT_STATUS_DISPLAY[report.status]?.tone}>
                  {JOB_REPORT_STATUS_DISPLAY[report.status]?.label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Recent activity" />
        {employee.recentActivity.length === 0 ? (
          <EmptyState title="No recorded activity yet" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {employee.recentActivity.map((event) => (
              <li key={event.id} className="py-2 text-sm">
                <p className="text-ink">{AUDIT_ACTION_DISPLAY[event.action]?.label ?? event.action}: {event.summary}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {formatDateTimeInBusinessZone(event.createdAt, "PPp")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
