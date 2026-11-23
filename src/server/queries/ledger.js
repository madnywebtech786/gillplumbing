import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import LedgerTransaction from "@/models/LedgerTransaction";
import { formatMinor } from "@/lib/money";

function serializeTransaction(tx) {
  return {
    id: tx._id.toString(),
    transactionNumber: tx.transactionNumber,
    type: tx.type,
    signedAmountMinor: tx.signedAmountMinor,
    formattedAmount: formatMinor(tx.signedAmountMinor, tx.currencyCode),
    currencyCode: tx.currencyCode,
    description: tx.description,
    customerName: tx.customerSnapshot?.name ?? null,
    jobReportId: tx.jobReportId?._id?.toString() ?? tx.jobReportId?.toString() ?? null,
    jobReportNumber: tx.jobReportId?.jobReportNumber ?? null,
    bookingId: tx.bookingId?.toString() ?? null,
    occurredAt: tx.occurredAt,
    recordedByName: tx.recordedBy?.name ?? "Unknown",
    paymentMethod: tx.paymentMethod ?? null,
    reference: tx.reference ?? null,
    reversesTransactionId: tx.reversesTransactionId?.toString() ?? null,
  };
}

// Admin-only read. Gated by requireAdmin() in the calling page, matching
// ledger/page.jsx's existing precedent, since there is no role-based
// filtering variance to express here (employees never reach this query).
export async function getJobReportLedgerForActor(jobReportId) {
  await connectToDatabase();

  const transactions = await LedgerTransaction.find({ jobReportId })
    .sort({ occurredAt: 1 })
    .populate("recordedBy", "name")
    .lean();

  return transactions.map(serializeTransaction);
}

export async function getCustomerLedgerForActor(customerId) {
  await connectToDatabase();

  const transactions = await LedgerTransaction.find({ customerId })
    .sort({ occurredAt: 1 })
    .populate("recordedBy", "name")
    .populate("jobReportId", "jobReportNumber")
    .lean();

  return transactions.map(serializeTransaction);
}

export async function listLedgerTransactions({ startDate, endDate, type, customerId, recordedBy } = {}) {
  await connectToDatabase();

  const query = {};
  if (type) query.type = type;
  if (customerId) query.customerId = customerId;
  if (recordedBy) query.recordedBy = recordedBy;
  if (startDate || endDate) {
    query.occurredAt = {};
    if (startDate) query.occurredAt.$gte = startDate;
    if (endDate) query.occurredAt.$lte = endDate;
  }

  const transactions = await LedgerTransaction.find(query)
    .sort({ occurredAt: -1 })
    .limit(200)
    .populate("recordedBy", "name")
    .populate("jobReportId", "jobReportNumber")
    .lean();

  return transactions.map(serializeTransaction);
}
