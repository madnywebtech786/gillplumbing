import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getAdminDashboardData, getEmployeeDashboardData } from "@/server/queries/dashboard";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { ROLES } from "@/constants/roles";
import { BOOKING_STATUS_DISPLAY, INQUIRY_STATUS_DISPLAY } from "@/lib/status-display";
import { formatMinor } from "@/lib/money";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {user.role === ROLES.ADMIN ? "Dashboard" : "My Dashboard"}
        </h1>
        <p className="text-sm text-ink-muted mt-1">Welcome back, {user.name}.</p>
      </div>

      {user.role === ROLES.ADMIN ? <AdminDashboard /> : <EmployeeDashboard actor={user} />}
    </div>
  );
}

async function AdminDashboard() {
  const data = await getAdminDashboardData();

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Today's bookings" value={data.todaysBookingsCount} />
        <StatCard label="Today's completed jobs" value={data.todaysCompletedJobsCount} hint="Submitted reports" />
        <StatCard label="New inquiries today" value={data.newInquiriesTodayCount} />
        <StatCard label="Billed today" value={formatMinor(data.totalBilledTodayMinor, data.currencyCode)} />
        <StatCard label="Collected today" value={formatMinor(data.totalCollectedTodayMinor, data.currencyCode)} />
        <StatCard label="Outstanding balance" value={formatMinor(data.totalOutstandingMinor, data.currencyCode)} hint="All open job reports" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Today's booking schedule" />
        {data.todaysSchedule.length === 0 ? (
          <EmptyState title="No bookings scheduled for today" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.todaysSchedule.map((booking) => (
              <li key={booking.id} className="py-2 flex items-center justify-between gap-4 text-sm">
                <span>
                  {formatDateTimeInBusinessZone(booking.scheduledStartAt, "p")} · {booking.customerName} ·{" "}
                  {booking.serviceName}
                  {booking.assignedEmployeeNames.length > 0 && (
                    <span className="text-ink-muted"> ({booking.assignedEmployeeNames.join(", ")})</span>
                  )}
                </span>
                <Badge tone={BOOKING_STATUS_DISPLAY[booking.status]?.tone}>
                  {BOOKING_STATUS_DISPLAY[booking.status]?.label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader title="Recent inquiries" />
          {data.recentInquiries.length === 0 ? (
            <EmptyState title="No inquiries yet" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.recentInquiries.map((inquiry) => (
                <li key={inquiry.id} className="py-2 flex items-center justify-between text-sm">
                  <Link href={`/inquiries/${inquiry.id}`} className="hover:text-accent">
                    {inquiry.inquiryNumber} · {inquiry.customerName}
                  </Link>
                  <Badge tone={INQUIRY_STATUS_DISPLAY[inquiry.status]?.tone}>
                    {INQUIRY_STATUS_DISPLAY[inquiry.status]?.label}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent job reports" />
          {data.recentJobReports.length === 0 ? (
            <EmptyState title="No job reports yet" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.recentJobReports.map((report) => (
                <li key={report.id} className="py-2 flex items-center justify-between text-sm">
                  <Link href={`/daily-reports/${report.id}`} className="hover:text-accent">
                    {report.jobReportNumber} · {report.customerName}
                  </Link>
                  <span className="text-ink-muted">
                    {report.performedByName} · {formatMinor(report.initialBilledAmountMinor, report.currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent payment activity" />
        {data.recentPayments.length === 0 ? (
          <EmptyState title="No payments recorded yet" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.recentPayments.map((payment) => (
              <li key={payment.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  {payment.customerName ?? "—"} · {formatDateTimeInBusinessZone(payment.occurredAt, "PPp")}
                </span>
                <span className="text-ink-muted">
                  {formatMinor(-payment.signedAmountMinor, payment.currencyCode)} by {payment.recordedByName}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

async function EmployeeDashboard({ actor }) {
  const data = await getEmployeeDashboardData(actor);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Link href="/inquiries/new">
          <Button>New Inquiry</Button>
        </Link>
        <Link href="/daily-reports/new">
          <Button variant="secondary">Add Job Entry</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Submitted jobs today" value={data.todaysSubmittedCount} />
        <StatCard label="Billed" value={formatMinor(data.totalBilledMinor, data.currencyCode)} hint="Your reports today" />
        <StatCard label="Collected" value={formatMinor(data.totalCollectedMinor, data.currencyCode)} hint="Your reports today" />
        <StatCard label="Outstanding" value={formatMinor(data.totalOutstandingMinor, data.currencyCode)} hint="Your reports today" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Today's bookings" description="All bookings for today; yours are marked Assigned." />
        {data.todaysBookings.length === 0 ? (
          <EmptyState title="No bookings scheduled for today" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.todaysBookings.map((booking) => (
              <li key={booking.id} className="py-2 flex items-center justify-between gap-4 text-sm">
                <Link href={`/bookings/${booking.id}`} className="hover:text-accent">
                  {formatDateTimeInBusinessZone(booking.scheduledStartAt, "p")} · {booking.customerName} ·{" "}
                  {booking.serviceName}
                </Link>
                <div className="flex items-center gap-2">
                  {booking.isAssignedToActor && <Badge tone="accent">Assigned</Badge>}
                  <Badge tone={BOOKING_STATUS_DISPLAY[booking.status]?.tone}>
                    {BOOKING_STATUS_DISPLAY[booking.status]?.label}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
