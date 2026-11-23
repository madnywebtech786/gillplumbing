import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getJobReportDetailForActor } from "@/server/queries/jobReports";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from "@/components/ui/Table";
import { SubmitDraftButton } from "@/components/forms/SubmitDraftButton";
import { DeleteDraftButton } from "@/components/forms/DeleteDraftButton";
import { VoidJobReportDialog } from "@/components/forms/VoidJobReportDialog";
import { AddPaymentDialog } from "@/components/forms/AddPaymentDialog";
import { AddAdjustmentDialog } from "@/components/forms/AddAdjustmentDialog";
import { RecordRefundDialog } from "@/components/forms/RecordRefundDialog";
import { ReverseTransactionDialog } from "@/components/forms/ReverseTransactionDialog";
import {
  AUDIT_ACTION_DISPLAY,
  JOB_REPORT_STATUS_DISPLAY,
  LEDGER_TRANSACTION_TYPE_DISPLAY,
} from "@/lib/status-display";
import { formatMinor } from "@/lib/money";
import { formatDateTimeInBusinessZone } from "@/lib/dates/business-time";
import { JOB_REPORT_STATUS } from "@/constants/statuses";
import { ROLES } from "@/constants/roles";

export default async function JobReportDetailPage({ params }) {
  const actor = await requireUser();
  const { id } = await params;

  const report = await getJobReportDetailForActor(id, actor);
  if (!report) {
    notFound();
  }

  // Only the owning employee submits/edits/deletes their own draft - not
  // admin, matching the permission matrix and jobReportService's ownership
  // checks (drafts aren't yet a submitted historical record).
  const canManageAsOwnDraft = report.status === JOB_REPORT_STATUS.DRAFT && report.performedById === actor.id;
  const isAdmin = actor.role === ROLES.ADMIN;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <Link href="/daily-reports" className="text-sm text-ink-muted hover:text-ink">
        ← Back to job reports
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{report.jobReportNumber}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {report.performedByName} · {formatDateTimeInBusinessZone(report.createdAt, "PPp")}
          </p>
        </div>
        <Badge tone={JOB_REPORT_STATUS_DISPLAY[report.status]?.tone}>
          {JOB_REPORT_STATUS_DISPLAY[report.status]?.label}
        </Badge>
      </div>

      {report.status === JOB_REPORT_STATUS.VOIDED && (
        <Card className="bg-danger-soft border-danger/30">
          <p className="text-sm text-ink">
            Voided {formatDateTimeInBusinessZone(report.voidedAt, "PPp")}: {report.voidReason}
          </p>
        </Card>
      )}

      {canManageAsOwnDraft && (
        <div className="flex flex-wrap items-end gap-2">
          <Link href={`/daily-reports/${report.id}/edit`}>
            <Button variant="secondary" size="sm">
              Edit draft
            </Button>
          </Link>
          <SubmitDraftButton jobReportId={report.id} />
          <DeleteDraftButton jobReportId={report.id} />
        </div>
      )}

      {isAdmin && report.status === JOB_REPORT_STATUS.SUBMITTED && (
        <div className="flex flex-wrap items-end gap-2">
          <AddPaymentDialog
            jobReportId={report.id}
            outstandingBalanceMinor={report.balanceMinor}
            currencyCode={report.currencyCode}
          />
          <AddAdjustmentDialog jobReportId={report.id} />
          <RecordRefundDialog jobReportId={report.id} />
          <VoidJobReportDialog jobReportId={report.id} />
        </div>
      )}

      <Card>
        <CardHeader title="Customer" />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-muted">Name</dt>
            <dd className="text-ink font-medium">{report.customerName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-ink font-medium">{report.customerPhone || "—"}</dd>
          </div>
          {report.address?.line1 && (
            <div className="col-span-2">
              <dt className="text-ink-muted">Service address</dt>
              <dd className="text-ink font-medium">
                {report.address.line1}
                {report.address.city ? `, ${report.address.city}` : ""}
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
            <dd className="text-ink font-medium">{report.serviceSnapshot}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Work date</dt>
            <dd className="text-ink font-medium">{report.workDate}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Source</dt>
            <dd className="text-ink font-medium">{report.source}</dd>
          </div>
          {report.workSummary && (
            <div className="col-span-2">
              <dt className="text-ink-muted">Work summary</dt>
              <dd className="text-ink">{report.workSummary}</dd>
            </div>
          )}
          {report.internalNotes && (
            <div className="col-span-2">
              <dt className="text-ink-muted">Internal notes</dt>
              <dd className="text-ink">{report.internalNotes}</dd>
            </div>
          )}
        </dl>
      </Card>

      {report.status !== JOB_REPORT_STATUS.DRAFT && (
        <Card>
          <CardHeader title="Financial summary" />
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-ink-muted">Billed</dt>
              <dd className="text-ink font-medium">{formatMinor(report.billedMinor, report.currencyCode)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Collected</dt>
              <dd className="text-ink font-medium">{formatMinor(report.collectedMinor, report.currencyCode)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Outstanding</dt>
              <dd className="text-ink font-medium">{formatMinor(report.balanceMinor, report.currencyCode)}</dd>
            </div>
          </dl>
        </Card>
      )}

      {isAdmin && report.ledger.length > 0 && (
        <Card>
          <CardHeader title="Ledger" />
          <Table>
            <TableHead columns={["Date", "Type", "Description", "Amount", "Recorded by", "Actions"]} />
            <TableBody>
              {report.ledger.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatDateTimeInBusinessZone(tx.occurredAt, "PPp")}</TableCell>
                  <TableCell>
                    <Badge tone={LEDGER_TRANSACTION_TYPE_DISPLAY[tx.type]?.tone}>
                      {LEDGER_TRANSACTION_TYPE_DISPLAY[tx.type]?.label}
                    </Badge>
                    {tx.isReversed && (
                      <Badge tone="neutral" className="ml-1">
                        Reversed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell>{formatMinor(tx.signedAmountMinor, tx.currencyCode)}</TableCell>
                  <TableCell>{tx.recordedByName}</TableCell>
                  <TableCell>
                    {!tx.isReversed && tx.type !== "REVERSAL" && (
                      <ReverseTransactionDialog transactionId={tx.id} jobReportId={report.id} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {isAdmin && report.status === JOB_REPORT_STATUS.SUBMITTED && report.ledger.length === 0 && (
        <Table>
          <TableHead columns={["Ledger"]} />
          <TableBody>
            <TableEmptyState colSpan={1} message="No ledger transactions yet." />
          </TableBody>
        </Table>
      )}

      {isAdmin && report.auditHistory.length > 0 && (
        <Card>
          <CardHeader title="History" />
          <ul className="flex flex-col divide-y divide-border">
            {report.auditHistory.map((event) => (
              <li key={event.id} className="py-2 text-sm">
                <p className="text-ink">{AUDIT_ACTION_DISPLAY[event.action]?.label ?? event.action}: {event.summary}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {event.actorName} · {formatDateTimeInBusinessZone(event.createdAt, "PPp")}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
