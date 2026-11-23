import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import User from "@/models/User";
import Booking from "@/models/Booking";
import Inquiry from "@/models/Inquiry";
import JobReport from "@/models/JobReport";
import LedgerTransaction from "@/models/LedgerTransaction";
import { listRecentAuditActivityForUser } from "@/server/queries/audit";
import { sumSignedLedgerDeltas } from "@/lib/money";
import { BUSINESS_CURRENCY_CODE } from "@/lib/dates/business-time";
import { LEDGER_TRANSACTION_TYPE } from "@/constants/statuses";
import { ROLES } from "@/constants/roles";

export async function getEmployeesList() {
  await connectToDatabase();
  const employees = await User.find({ role: ROLES.EMPLOYEE })
    .sort({ createdAt: -1 })
    .lean();

  return employees.map((employee) => ({
    id: employee._id.toString(),
    name: employee.name,
    email: employee.email,
    phone: employee.phone ?? null,
    isActive: employee.isActive,
    createdAt: employee.createdAt,
  }));
}

export async function getActiveEmployeesForAssignment() {
  await connectToDatabase();
  const employees = await User.find({ role: ROLES.EMPLOYEE, isActive: true })
    .sort({ name: 1 })
    .lean();

  return employees.map((employee) => ({
    id: employee._id.toString(),
    name: employee.name,
  }));
}

export async function getEmployeeDetail(employeeId) {
  await connectToDatabase();

  const employee = await User.findOne({
    _id: employeeId,
    role: ROLES.EMPLOYEE,
  }).lean();

  if (!employee) {
    return null;
  }

  const [bookingsAssigned, inquiriesCreated, jobReports, submittedReportIds, paymentsRecorded, recentActivity] =
    await Promise.all([
      Booking.find({ assignedEmployeeIds: employee._id })
        .sort({ scheduledStartAt: -1 })
        .limit(20)
        .lean(),
      Inquiry.find({ createdBy: employee._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      JobReport.find({ performedBy: employee._id })
        .sort({ workDate: -1 })
        .limit(20)
        .lean(),
      JobReport.find({ performedBy: employee._id, status: "SUBMITTED" }).select("_id").lean(),
      // Payments this employee recorded (informational attribution only -
      // spec 5.7: not necessarily the same as who ultimately owns revenue).
      LedgerTransaction.find({ recordedBy: employee._id, type: LEDGER_TRANSACTION_TYPE.PAYMENT }).lean(),
      listRecentAuditActivityForUser(employee._id),
    ]);

  const reportIds = submittedReportIds.map((report) => report._id);
  const charges =
    reportIds.length > 0
      ? await LedgerTransaction.find({
          jobReportId: { $in: reportIds },
          type: { $in: [LEDGER_TRANSACTION_TYPE.CHARGE, LEDGER_TRANSACTION_TYPE.ADJUSTMENT] },
        }).lean()
      : [];

  const totalBilledMinor = sumSignedLedgerDeltas(charges);
  const totalPaymentsRecordedMinor = -sumSignedLedgerDeltas(paymentsRecorded);

  return {
    totalBilledMinor,
    totalPaymentsRecordedMinor,
    currencyCode: BUSINESS_CURRENCY_CODE,
    id: employee._id.toString(),
    name: employee.name,
    email: employee.email,
    phone: employee.phone ?? null,
    isActive: employee.isActive,
    createdAt: employee.createdAt,
    lastLoginAt: employee.lastLoginAt ?? null,
    bookingsAssigned: bookingsAssigned.map((booking) => ({
      id: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
      scheduledStartAt: booking.scheduledStartAt,
      status: booking.status,
      customerName: booking.customerSnapshot?.name,
    })),
    inquiriesCreated: inquiriesCreated.map((inquiry) => ({
      id: inquiry._id.toString(),
      inquiryNumber: inquiry.inquiryNumber,
      status: inquiry.status,
      customerName: inquiry.customerSnapshot?.name,
      createdAt: inquiry.createdAt,
    })),
    jobReports: jobReports.map((report) => ({
      id: report._id.toString(),
      jobReportNumber: report.jobReportNumber,
      workDate: report.workDate,
      status: report.status,
      customerName: report.customerSnapshot?.name,
      initialBilledAmountMinor: report.initialBilledAmountMinor ?? 0,
    })),
    recentActivity,
  };
}
