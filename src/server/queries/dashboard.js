import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import Booking from "@/models/Booking";
import Inquiry from "@/models/Inquiry";
import JobReport from "@/models/JobReport";
import LedgerTransaction from "@/models/LedgerTransaction";
import { sumSignedLedgerDeltas } from "@/lib/money";
import { getTodayDayKey, dayKeyRangeToUtc, BUSINESS_CURRENCY_CODE } from "@/lib/dates/business-time";
import { BOOKING_STATUS, LEDGER_TRANSACTION_TYPE } from "@/constants/statuses";

// "Today's completed jobs" is defined as submitted job reports with a work
// date of today (spec 8.4 - label the definition consistently), not booking
// status, since a booking can be marked COMPLETED without a report existing
// yet and vice versa (spec 5.4).
export async function getAdminDashboardData() {
  await connectToDatabase();

  const todayKey = getTodayDayKey();
  const { start: todayStart, end: todayEnd } = dayKeyRangeToUtc(todayKey, todayKey);

  const [
    todaysBookings,
    todaysCompletedReports,
    newInquiriesToday,
    todaysSubmittedReports,
    recentInquiries,
    recentJobReports,
  ] = await Promise.all([
    Booking.find({ scheduledStartAt: { $gte: todayStart, $lte: todayEnd } })
      .sort({ scheduledStartAt: 1 })
      .populate("assignedEmployeeIds", "name")
      .lean(),
    JobReport.countDocuments({ status: "SUBMITTED", workDate: todayKey }),
    Inquiry.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    JobReport.find({ status: "SUBMITTED", workDate: todayKey }).select("_id").lean(),
    Inquiry.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name")
      .lean(),
    JobReport.find({ status: "SUBMITTED" })
      .sort({ submittedAt: -1 })
      .limit(5)
      .populate("performedBy", "name")
      .lean(),
  ]);

  const todaysReportIds = todaysSubmittedReports.map((report) => report._id);

  const [todaysPostedTransactions, todaysPaymentTransactions, allOutstandingTransactions, recentPayments] =
    await Promise.all([
      LedgerTransaction.find({
        jobReportId: { $in: todaysReportIds },
        type: { $in: [LEDGER_TRANSACTION_TYPE.CHARGE, LEDGER_TRANSACTION_TYPE.ADJUSTMENT] },
      }).lean(),
      LedgerTransaction.find({
        type: LEDGER_TRANSACTION_TYPE.PAYMENT,
        occurredAt: { $gte: todayStart, $lte: todayEnd },
      }).lean(),
      LedgerTransaction.find({}).lean(),
      LedgerTransaction.find({ type: LEDGER_TRANSACTION_TYPE.PAYMENT })
        .sort({ occurredAt: -1 })
        .limit(5)
        .populate("recordedBy", "name")
        .lean(),
    ]);

  const totalBilledTodayMinor = sumSignedLedgerDeltas(todaysPostedTransactions);
  const totalCollectedTodayMinor = -sumSignedLedgerDeltas(todaysPaymentTransactions);
  const totalOutstandingMinor = sumSignedLedgerDeltas(allOutstandingTransactions);

  return {
    currencyCode: BUSINESS_CURRENCY_CODE,
    todaysBookingsCount: todaysBookings.length,
    todaysCompletedJobsCount: todaysCompletedReports,
    newInquiriesTodayCount: newInquiriesToday,
    totalBilledTodayMinor,
    totalCollectedTodayMinor,
    totalOutstandingMinor,
    todaysSchedule: todaysBookings.map((booking) => ({
      id: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerSnapshot?.name,
      serviceName: booking.serviceName,
      scheduledStartAt: booking.scheduledStartAt,
      status: booking.status,
      assignedEmployeeNames: (booking.assignedEmployeeIds ?? []).map((e) => e?.name).filter(Boolean),
    })),
    recentInquiries: recentInquiries.map((inquiry) => ({
      id: inquiry._id.toString(),
      inquiryNumber: inquiry.inquiryNumber,
      customerName: inquiry.customerSnapshot?.name,
      status: inquiry.status,
      createdAt: inquiry.createdAt,
      createdByName: inquiry.createdBy?.name ?? "Unknown",
    })),
    recentJobReports: recentJobReports.map((report) => ({
      id: report._id.toString(),
      jobReportNumber: report.jobReportNumber,
      customerName: report.customerSnapshot?.name,
      performedByName: report.performedBy?.name ?? "Unknown",
      workDate: report.workDate,
      initialBilledAmountMinor: report.initialBilledAmountMinor ?? 0,
      currencyCode: report.currencyCode ?? BUSINESS_CURRENCY_CODE,
    })),
    recentPayments: recentPayments.map((tx) => ({
      id: tx._id.toString(),
      transactionNumber: tx.transactionNumber,
      customerName: tx.customerSnapshot?.name ?? null,
      signedAmountMinor: tx.signedAmountMinor,
      currencyCode: tx.currencyCode,
      occurredAt: tx.occurredAt,
      recordedByName: tx.recordedBy?.name ?? "Unknown",
    })),
  };
}

export async function getEmployeeDashboardData(actor) {
  await connectToDatabase();

  const todayKey = getTodayDayKey();
  const { start: todayStart, end: todayEnd } = dayKeyRangeToUtc(todayKey, todayKey);

  const [todaysBookings, todaysOwnReports] = await Promise.all([
    Booking.find({
      scheduledStartAt: { $gte: todayStart, $lte: todayEnd },
      status: { $ne: BOOKING_STATUS.CANCELLED },
    })
      .sort({ scheduledStartAt: 1 })
      .populate("assignedEmployeeIds", "name")
      .lean(),
    JobReport.find({ performedBy: actor.id, status: "SUBMITTED", workDate: todayKey }).lean(),
  ]);

  const reportIds = todaysOwnReports.map((report) => report._id);
  const currencyCode = todaysOwnReports[0]?.currencyCode ?? BUSINESS_CURRENCY_CODE;

  let totalBilledMinor = 0;
  let totalCollectedMinor = 0;
  let totalOutstandingMinor = 0;

  if (reportIds.length > 0) {
    const transactions = await LedgerTransaction.find({ jobReportId: { $in: reportIds } }).lean();
    totalBilledMinor = sumSignedLedgerDeltas(
      transactions.filter(
        (tx) => tx.type === LEDGER_TRANSACTION_TYPE.CHARGE || tx.type === LEDGER_TRANSACTION_TYPE.ADJUSTMENT
      )
    );
    totalCollectedMinor = -sumSignedLedgerDeltas(
      transactions.filter((tx) => tx.type === LEDGER_TRANSACTION_TYPE.PAYMENT)
    );
    totalOutstandingMinor = sumSignedLedgerDeltas(transactions);
  }

  return {
    currencyCode,
    todaysBookings: todaysBookings.map((booking) => ({
      id: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerSnapshot?.name,
      serviceName: booking.serviceName,
      scheduledStartAt: booking.scheduledStartAt,
      status: booking.status,
      isAssignedToActor: (booking.assignedEmployeeIds ?? []).some(
        (employee) => employee?._id?.toString() === actor.id
      ),
    })),
    todaysSubmittedCount: todaysOwnReports.length,
    totalBilledMinor,
    totalCollectedMinor,
    totalOutstandingMinor,
  };
}
