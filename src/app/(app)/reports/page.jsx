import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getBusinessReport } from "@/server/queries/reports";
import { getEmployeesList } from "@/server/queries/employees";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { FieldWrapper, Select } from "@/components/ui/FormField";
import { DatePicker } from "@/components/ui/DatePicker";
import { formatMinor } from "@/lib/money";
import { ALL_BOOKING_STATUSES, ALL_JOB_REPORT_STATUSES } from "@/constants/statuses";
import { BOOKING_STATUS_DISPLAY, JOB_REPORT_STATUS_DISPLAY } from "@/lib/status-display";

export default async function ReportsPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;

  const employees = await getEmployeesList();

  const startDate = params?.startDate ? new Date(`${params.startDate}T00:00:00Z`) : undefined;
  const endDate = params?.endDate ? new Date(`${params.endDate}T23:59:59Z`) : undefined;

  const report = await getBusinessReport({
    startDate,
    endDate,
    employeeId: params?.employeeId || undefined,
    bookingStatus: params?.bookingStatus || undefined,
    jobReportStatus: params?.jobReportStatus || undefined,
  });

  const periodLabel =
    params?.startDate || params?.endDate
      ? `${params?.startDate || "the beginning"} to ${params?.endDate || "now"}`
      : "all time";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Reports</h1>
        <p className="text-sm text-ink-muted mt-1">
          Billing is grouped by charge posting date; collections by payment receipt date; outstanding is a
          current balance as of now.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <FieldWrapper label="From" htmlFor="startDate">
          <DatePicker id="startDate" name="startDate" defaultValue={params?.startDate || ""} />
        </FieldWrapper>
        <FieldWrapper label="To" htmlFor="endDate">
          <DatePicker id="endDate" name="endDate" defaultValue={params?.endDate || ""} />
        </FieldWrapper>
        <FieldWrapper label="Employee" htmlFor="employeeId">
          <Select id="employeeId" name="employeeId" defaultValue={params?.employeeId || ""}>
            <option value="">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <FieldWrapper label="Booking status" htmlFor="bookingStatus">
          <Select id="bookingStatus" name="bookingStatus" defaultValue={params?.bookingStatus || ""}>
            <option value="">All statuses</option>
            {ALL_BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOOKING_STATUS_DISPLAY[status]?.label}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <FieldWrapper label="Job report status" htmlFor="jobReportStatus">
          <Select id="jobReportStatus" name="jobReportStatus" defaultValue={params?.jobReportStatus || "SUBMITTED"}>
            {ALL_JOB_REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {JOB_REPORT_STATUS_DISPLAY[status]?.label}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        <Link href="/reports">
          <Button type="button" variant="ghost">
            Reset filters
          </Button>
        </Link>
      </form>

      <p className="text-xs text-ink-muted -mt-2">Showing: {periodLabel}</p>

      <div>
        <h2 className="font-display text-base font-semibold text-ink mb-3">Inquiries</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          <StatCard label="Created" value={report.inquiries.created} />
          <StatCard label="Converted" value={report.inquiries.converted} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-base font-semibold text-ink mb-3">Bookings</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Created" value={report.bookings.created} />
          <StatCard label="Scheduled" value={report.bookings.scheduled} />
          <StatCard label="Confirmed" value={report.bookings.confirmed} />
          <StatCard label="In progress" value={report.bookings.inProgress} />
          <StatCard label="Completed" value={report.bookings.completed} />
          <StatCard label="Cancelled" value={report.bookings.cancelled} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-base font-semibold text-ink mb-3">Financials</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Billed" value={formatMinor(report.billedMinor, report.currencyCode)} hint="Charges + adjustments" />
          <StatCard label="Collected" value={formatMinor(report.collectedMinor, report.currencyCode)} hint="Payments received" />
          <StatCard label="Refunded" value={formatMinor(report.refundedMinor, report.currencyCode)} />
          <StatCard label="Outstanding" value={formatMinor(report.outstandingMinor, report.currencyCode)} hint="Current, all time" />
        </div>
      </div>

      <Card>
        <CardHeader title="Job reports by employee" description="Submitted reports and billed totals for the selected period." />
        {report.jobReportsByEmployee.length === 0 ? (
          <EmptyState title="No job reports in this period" />
        ) : (
          <Table>
            <TableHead columns={["Employee", "Reports", "Billed"]} />
            <TableBody>
              {report.jobReportsByEmployee.map((row) => (
                <TableRow key={row.employeeId}>
                  <TableCell>{row.employeeName}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{formatMinor(row.billedMinor, report.currencyCode)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
