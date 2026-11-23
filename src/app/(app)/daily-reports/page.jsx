import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getJobReportsListForActor, getDailyReportSummaryForActor } from "@/server/queries/jobReports";
import { getEmployeesList } from "@/server/queries/employees";
import { Table, TableHead, TableBody, TableCell, TableEmptyState } from "@/components/ui/Table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Select } from "@/components/ui/FormField";
import { DatePicker } from "@/components/ui/DatePicker";
import { JOB_REPORT_STATUS_DISPLAY } from "@/lib/status-display";
import { formatMinor } from "@/lib/money";
import { getTodayDayKey, formatDateTimeInBusinessZone } from "@/lib/dates/business-time";
import { ALL_JOB_REPORT_STATUSES, ALL_JOB_REPORT_SOURCES } from "@/constants/statuses";
import { ROLES } from "@/constants/roles";

export default async function DailyReportsPage({ searchParams }) {
  const actor = await requireUser();
  const params = await searchParams;

  if (actor.role === ROLES.ADMIN) {
    return <AdminJobReportsView actor={actor} params={params} />;
  }

  const workDate = params?.date || getTodayDayKey();
  const [reports, summary] = await Promise.all([
    getJobReportsListForActor(actor, { workDate }),
    getDailyReportSummaryForActor(actor, workDate),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">My Daily Reports</h1>
          <p className="text-sm text-ink-muted mt-1">Work you've recorded for the selected day.</p>
        </div>
        <Link href="/daily-reports/new">
          <Button>Add Job Entry</Button>
        </Link>
      </div>

      <form className="flex items-end gap-2">
        <FieldWrapper label="Date" htmlFor="date">
          <DatePicker id="date" name="date" defaultValue={workDate} />
        </FieldWrapper>
        <Button type="submit" variant="secondary">
          View
        </Button>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Submitted jobs" value={summary.submittedCount} />
        <StatCard label="Billed" value={formatMinor(summary.totalBilledMinor, summary.currencyCode)} />
        <StatCard label="Collected" value={formatMinor(summary.totalCollectedMinor, summary.currencyCode)} />
        <StatCard label="Outstanding" value={formatMinor(summary.totalOutstandingMinor, summary.currencyCode)} />
      </div>

      <JobReportsTable reports={reports} />
    </div>
  );
}

async function AdminJobReportsView({ actor, params }) {
  const employees = await getEmployeesList();
  const filters = {
    employeeId: params?.employeeId || undefined,
    workDate: params?.date || undefined,
    status: params?.status || undefined,
    source: params?.source || undefined,
  };
  const reports = await getJobReportsListForActor(actor, filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Job Reports</h1>
          <p className="text-sm text-ink-muted mt-1">All submitted and draft work across the business.</p>
        </div>
        <Link href="/daily-reports/new">
          <Button>Add Job Entry</Button>
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-2">
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
        <FieldWrapper label="Work date" htmlFor="date">
          <DatePicker id="date" name="date" defaultValue={params?.date || ""} />
        </FieldWrapper>
        <FieldWrapper label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={params?.status || ""}>
            <option value="">All statuses</option>
            {ALL_JOB_REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {JOB_REPORT_STATUS_DISPLAY[status]?.label}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <FieldWrapper label="Source" htmlFor="source">
          <Select id="source" name="source" defaultValue={params?.source || ""}>
            <option value="">All sources</option>
            {ALL_JOB_REPORT_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        <Link href="/daily-reports">
          <Button type="button" variant="ghost">
            Reset filters
          </Button>
        </Link>
      </form>

      <JobReportsTable reports={reports} showEmployee />
    </div>
  );
}

function JobReportsTable({ reports, showEmployee = false }) {
  const columns = showEmployee
    ? ["Report", "Employee", "Customer", "Service", "Work date", "Billed", "Status"]
    : ["Report", "Customer", "Service", "Work date", "Billed", "Status"];

  return (
    <Table>
      <TableHead columns={columns} />
      <TableBody>
        {reports.length === 0 ? (
          <TableEmptyState colSpan={columns.length} message="No job reports yet." />
        ) : (
          reports.map((report) => (
            <ClickableRow key={report.id} href={`/daily-reports/${report.id}`}>
              <TableCell>
                <Link href={`/daily-reports/${report.id}`} className="font-medium hover:text-accent">
                  {report.jobReportNumber}
                </Link>
              </TableCell>
              {showEmployee && <TableCell>{report.performedByName}</TableCell>}
              <TableCell>{report.customerName}</TableCell>
              <TableCell>{report.serviceSnapshot}</TableCell>
              <TableCell>{formatDateTimeInBusinessZone(new Date(`${report.workDate}T00:00:00Z`), "PP")}</TableCell>
              <TableCell>{formatMinor(report.initialBilledAmountMinor, report.currencyCode)}</TableCell>
              <TableCell>
                <Badge tone={JOB_REPORT_STATUS_DISPLAY[report.status]?.tone}>
                  {JOB_REPORT_STATUS_DISPLAY[report.status]?.label}
                </Badge>
              </TableCell>
            </ClickableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
