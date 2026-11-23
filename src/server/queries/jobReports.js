import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import JobReport from "@/models/JobReport";
import LedgerTransaction from "@/models/LedgerTransaction";
import * as jobReportService from "@/server/services/jobReportService";
import { getAuditLogForEntity } from "@/server/queries/audit";
import { sumSignedLedgerDeltas } from "@/lib/money";
import { dayKeyRangeToUtc, BUSINESS_CURRENCY_CODE } from "@/lib/dates/business-time";
import { AUDIT_ENTITY_TYPE, LEDGER_TRANSACTION_TYPE } from "@/constants/statuses";
import { ROLES } from "@/constants/roles";

function serializeJobReport(report) {
  return {
    id: report._id.toString(),
    jobReportNumber: report.jobReportNumber,
    source: report.source,
    bookingId: report.bookingId?.toString() ?? null,
    customerName: report.customerSnapshot?.name,
    customerPhone: report.customerSnapshot?.phone ?? null,
    serviceSnapshot: report.serviceSnapshot,
    workDate: report.workDate,
    workSummary: report.workSummary ?? null,
    internalNotes: report.internalNotes ?? null,
    status: report.status,
    submittedAt: report.submittedAt ?? null,
    voidedAt: report.voidedAt ?? null,
    voidReason: report.voidReason ?? null,
    initialBilledAmountMinor: report.initialBilledAmountMinor ?? 0,
    currencyCode: report.currencyCode ?? BUSINESS_CURRENCY_CODE,
    draftBilledAmountMinor: report.draftBilledAmountMinor ?? 0,
    draftReceivedAmountMinor: report.draftReceivedAmountMinor ?? 0,
    draftPaymentMethod: report.draftPaymentMethod ?? null,
    draftPaymentReference: report.draftPaymentReference ?? null,
    performedById: (report.performedBy?._id ?? report.performedBy)?.toString(),
    performedByName: report.performedBy?.name ?? "Unknown",
    createdAt: report.createdAt,
  };
}

export async function getJobReportsListForActor(actor, filters) {
  const reports = await jobReportService.listJobReportsForActor(actor, filters);
  return reports.map(serializeJobReport);
}

// Per-day Billed/Collected/Outstanding for the employee (or admin-selected
// employee) daily report page. Billed and outstanding are about the day's
// submitted reports regardless of when paid; collected uses the payment's
// own occurredAt date, not the report's workDate (spec 7.4).
export async function getDailyReportSummaryForActor(actor, dayKey, { employeeId } = {}) {
  await connectToDatabase();

  const reportQuery = { status: "SUBMITTED", workDate: dayKey };
  if (actor.role !== ROLES.ADMIN) {
    reportQuery.performedBy = actor.id;
  } else if (employeeId) {
    reportQuery.performedBy = employeeId;
  }

  const reports = await JobReport.find(reportQuery).select("_id currencyCode").lean();
  const reportIds = reports.map((report) => report._id);
  const currencyCode = reports[0]?.currencyCode ?? BUSINESS_CURRENCY_CODE;

  if (reportIds.length === 0) {
    return {
      submittedCount: 0,
      totalBilledMinor: 0,
      totalCollectedMinor: 0,
      totalOutstandingMinor: 0,
      currencyCode,
    };
  }

  const allTransactions = await LedgerTransaction.find({ jobReportId: { $in: reportIds } }).lean();

  const totalBilledMinor = sumSignedLedgerDeltas(
    allTransactions.filter(
      (tx) => tx.type === LEDGER_TRANSACTION_TYPE.CHARGE || tx.type === LEDGER_TRANSACTION_TYPE.ADJUSTMENT
    )
  );

  const { start, end } = dayKeyRangeToUtc(dayKey, dayKey);
  const totalCollectedMinor = -sumSignedLedgerDeltas(
    allTransactions.filter(
      (tx) =>
        tx.type === LEDGER_TRANSACTION_TYPE.PAYMENT &&
        new Date(tx.occurredAt) >= start &&
        new Date(tx.occurredAt) <= end
    )
  );

  const totalOutstandingMinor = sumSignedLedgerDeltas(allTransactions);

  return {
    submittedCount: reports.length,
    totalBilledMinor,
    totalCollectedMinor,
    totalOutstandingMinor,
    currencyCode,
  };
}

export async function getJobReportDetailForActor(jobReportId, actor) {
  const report = await jobReportService.getJobReportForActor(jobReportId, actor);
  if (!report) {
    return null;
  }

  const auditHistory =
    actor.role === ROLES.ADMIN ? await getAuditLogForEntity(AUDIT_ENTITY_TYPE.JOB_REPORT, report._id) : [];

  const transactions = await LedgerTransaction.find({ jobReportId: report._id })
    .sort({ occurredAt: 1 })
    .populate("recordedBy", "name")
    .lean();

  const balanceMinor = sumSignedLedgerDeltas(transactions);
  const collectedMinor = -sumSignedLedgerDeltas(
    transactions.filter((tx) => tx.type === LEDGER_TRANSACTION_TYPE.PAYMENT)
  );
  const billedMinor = sumSignedLedgerDeltas(
    transactions.filter(
      (tx) => tx.type === LEDGER_TRANSACTION_TYPE.CHARGE || tx.type === LEDGER_TRANSACTION_TYPE.ADJUSTMENT
    )
  );

  return {
    ...serializeJobReport(report),
    address: report.serviceAddressSnapshot ?? null,
    balanceMinor,
    collectedMinor,
    billedMinor,
    auditHistory,
    ledger: transactions.map((tx) => ({
      id: tx._id.toString(),
      transactionNumber: tx.transactionNumber,
      type: tx.type,
      signedAmountMinor: tx.signedAmountMinor,
      currencyCode: tx.currencyCode,
      description: tx.description,
      paymentMethod: tx.paymentMethod ?? null,
      reference: tx.reference ?? null,
      occurredAt: tx.occurredAt,
      recordedByName: tx.recordedBy?.name ?? "Unknown",
      reversesTransactionId: tx.reversesTransactionId?.toString() ?? null,
      isReversed: transactions.some(
        (other) => other.reversesTransactionId?.toString() === tx._id.toString()
      ),
    })),
  };
}
