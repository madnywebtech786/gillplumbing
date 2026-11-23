import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import Inquiry from "@/models/Inquiry";
import Booking from "@/models/Booking";
import JobReport from "@/models/JobReport";
import LedgerTransaction from "@/models/LedgerTransaction";
import { sumSignedLedgerDeltas } from "@/lib/money";
import { dayKeyRangeToUtc, BUSINESS_CURRENCY_CODE } from "@/lib/dates/business-time";
import { BOOKING_STATUS, LEDGER_TRANSACTION_TYPE } from "@/constants/statuses";

// Admin-only business report (spec 8.11/19). Each total uses the date basis
// documented in spec section 19: inquiries/bookings by createdAt or
// scheduledStartAt, job reports by workDate, billed/adjustments by ledger
// occurredAt, payments/refunds by occurredAt, outstanding is current (not
// period-scoped).
export async function getBusinessReport({ startDate, endDate, employeeId, bookingStatus, jobReportStatus } = {}) {
  await connectToDatabase();

  const range = startDate && endDate ? { $gte: startDate, $lte: endDate } : undefined;

  const inquiryQuery = {};
  if (range) inquiryQuery.createdAt = range;

  const bookingQuery = {};
  if (range) bookingQuery.createdAt = range;
  if (bookingStatus) bookingQuery.status = bookingStatus;

  const jobReportQuery = { status: jobReportStatus || "SUBMITTED" };
  if (employeeId) jobReportQuery.performedBy = employeeId;
  if (startDate && endDate) {
    jobReportQuery.workDate = {
      $gte: startDate.toISOString().slice(0, 10),
      $lte: endDate.toISOString().slice(0, 10),
    };
  }

  const ledgerQuery = range ? { occurredAt: range } : {};

  const [inquiries, bookings, jobReports, ledgerTransactions, allOutstandingTransactions] = await Promise.all([
    Inquiry.find(inquiryQuery).select("status createdAt").lean(),
    Booking.find(bookingQuery).select("status createdAt").lean(),
    JobReport.find(jobReportQuery)
      .select("performedBy initialBilledAmountMinor currencyCode workDate")
      .populate("performedBy", "name")
      .lean(),
    LedgerTransaction.find(ledgerQuery).lean(),
    LedgerTransaction.find({}).lean(),
  ]);

  const convertedInquiries = inquiries.filter((inquiry) => inquiry.status === "CONVERTED").length;

  const bookingsByStatus = bookings.reduce((acc, booking) => {
    acc[booking.status] = (acc[booking.status] ?? 0) + 1;
    return acc;
  }, {});

  const jobReportsByEmployee = new Map();
  for (const report of jobReports) {
    const key = report.performedBy?._id?.toString() ?? "unknown";
    const name = report.performedBy?.name ?? "Unknown";
    const entry = jobReportsByEmployee.get(key) ?? { employeeId: key, employeeName: name, count: 0, billedMinor: 0 };
    entry.count += 1;
    entry.billedMinor += report.initialBilledAmountMinor ?? 0;
    jobReportsByEmployee.set(key, entry);
  }

  const billedMinor = sumSignedLedgerDeltas(
    ledgerTransactions.filter(
      (tx) => tx.type === LEDGER_TRANSACTION_TYPE.CHARGE || tx.type === LEDGER_TRANSACTION_TYPE.ADJUSTMENT
    )
  );
  const collectedMinor = -sumSignedLedgerDeltas(
    ledgerTransactions.filter((tx) => tx.type === LEDGER_TRANSACTION_TYPE.PAYMENT)
  );
  const refundedMinor = sumSignedLedgerDeltas(
    ledgerTransactions.filter((tx) => tx.type === LEDGER_TRANSACTION_TYPE.REFUND)
  );
  const outstandingMinor = sumSignedLedgerDeltas(allOutstandingTransactions);

  return {
    currencyCode: BUSINESS_CURRENCY_CODE,
    inquiries: {
      created: inquiries.length,
      converted: convertedInquiries,
    },
    bookings: {
      created: bookings.length,
      scheduled: bookingsByStatus[BOOKING_STATUS.SCHEDULED] ?? 0,
      confirmed: bookingsByStatus[BOOKING_STATUS.CONFIRMED] ?? 0,
      inProgress: bookingsByStatus[BOOKING_STATUS.IN_PROGRESS] ?? 0,
      completed: bookingsByStatus[BOOKING_STATUS.COMPLETED] ?? 0,
      cancelled: bookingsByStatus[BOOKING_STATUS.CANCELLED] ?? 0,
    },
    jobReportsByEmployee: Array.from(jobReportsByEmployee.values()).sort((a, b) => b.billedMinor - a.billedMinor),
    billedMinor,
    collectedMinor,
    refundedMinor,
    outstandingMinor,
  };
}
