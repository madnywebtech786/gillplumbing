import "server-only";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import JobReport from "@/models/JobReport";
import Booking from "@/models/Booking";
import { findOrCreateCustomerByPhone } from "@/server/services/customerService";
import * as ledgerService from "@/server/services/ledgerService";
import LedgerTransaction from "@/models/LedgerTransaction";
import { reverseTransactionInternal } from "@/server/services/ledgerService";
import { nextReferenceNumber } from "@/lib/numbering";
import { parseDecimalToMinor } from "@/lib/money";
import { BUSINESS_CURRENCY_CODE } from "@/lib/dates/business-time";
import { recordAuditEvent } from "@/server/services/auditService";
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  BOOKING_STATUS,
  BOOKING_STATUS_TRANSITIONS,
  JOB_REPORT_SOURCE,
  JOB_REPORT_STATUS,
  LEDGER_TRANSACTION_TYPE,
} from "@/constants/statuses";
import { ROLES } from "@/constants/roles";

// Resolves the customer/service snapshot for a new or edited draft. Shared
// by create and update so the BOOKING-vs-MANUAL snapshot logic lives once.
async function resolveSnapshots(data, actor, session) {
  if (data.source === JOB_REPORT_SOURCE.BOOKING) {
    const booking = await Booking.findById(data.bookingId).session(session ?? null);
    if (!booking) {
      throw new Error("Booking not found.");
    }

    return {
      bookingId: booking._id,
      customerId: booking.customerId ?? undefined,
      customerSnapshot: booking.customerSnapshot,
      serviceAddressSnapshot: booking.serviceAddressSnapshot,
    };
  }

  const customer = await findOrCreateCustomerByPhone(
    {
      name: data.customerName,
      phone: data.customerPhone,
      email: data.customerEmail,
      createdBy: actor.id,
    },
    session
  );

  return {
    bookingId: undefined,
    customerId: customer._id,
    customerSnapshot: {
      name: data.customerName,
      phone: data.customerPhone || undefined,
      email: data.customerEmail || undefined,
    },
    serviceAddressSnapshot: data.addressLine1
      ? { line1: data.addressLine1, city: data.addressCity || undefined }
      : undefined,
  };
}

// Draft billing inputs are staged as draftXxx fields, not the submission
// source of truth, so a later "Submit" with no new form data (the detail
// page's confirm button) still posts what the employee actually entered
// instead of silently defaulting to a zero charge.
function parseDraftBillingFields(data) {
  return {
    draftBilledAmountMinor: data.billedAmount ? parseDecimalToMinor(data.billedAmount) : undefined,
    draftReceivedAmountMinor: data.amountReceived ? parseDecimalToMinor(data.amountReceived) : undefined,
    draftPaymentMethod: data.paymentMethod || undefined,
    draftPaymentReference: data.paymentReference || undefined,
  };
}

export async function createDraft(data, actor) {
  await connectToDatabase();

  const snapshots = await resolveSnapshots(data, actor);
  const jobReportNumber = await nextReferenceNumber("jobReport");

  const report = await JobReport.create({
    jobReportNumber,
    source: data.source,
    ...snapshots,
    serviceSnapshot: data.serviceSnapshot,
    workDate: data.workDate,
    workSummary: data.workSummary || undefined,
    internalNotes: data.internalNotes || undefined,
    ...parseDraftBillingFields(data),
    performedBy: actor.id,
    createdBy: actor.id,
    status: JOB_REPORT_STATUS.DRAFT,
  });

  return report;
}

// Null, not throw, for not-found/not-permitted - matches
// getBookingForActor/getInquiryForActor so pages can 404 uniformly.
export async function getJobReportForActor(jobReportId, actor) {
  await connectToDatabase();

  const report = await JobReport.findById(jobReportId).populate("performedBy", "name").lean();
  if (!report) {
    return null;
  }

  if (actor.role !== ROLES.ADMIN && report.performedBy._id.toString() !== actor.id) {
    return null;
  }

  return report;
}

// Drafts are edited only by the employee who owns them - not even admin,
// since the permission matrix lists "edit own draft" per-role, not an
// admin override (drafts aren't yet a submitted historical record).
async function loadOwnDraftOrThrow(jobReportId, actor) {
  const report = await JobReport.findById(jobReportId);
  if (!report) {
    throw new Error("Job report not found.");
  }
  if (report.performedBy.toString() !== actor.id) {
    throw new Error("You do not have access to this job report.");
  }
  if (report.status !== JOB_REPORT_STATUS.DRAFT) {
    throw new Error("Only draft reports can be edited.");
  }
  return report;
}

export async function updateOwnDraft(jobReportId, data, actor) {
  await connectToDatabase();

  const report = await loadOwnDraftOrThrow(jobReportId, actor);
  const snapshots = await resolveSnapshots(data, actor);

  report.source = data.source;
  report.bookingId = snapshots.bookingId;
  report.customerId = snapshots.customerId;
  report.customerSnapshot = snapshots.customerSnapshot;
  report.serviceAddressSnapshot = snapshots.serviceAddressSnapshot;
  report.serviceSnapshot = data.serviceSnapshot;
  report.workDate = data.workDate;
  report.workSummary = data.workSummary || undefined;
  report.internalNotes = data.internalNotes || undefined;

  const draftBilling = parseDraftBillingFields(data);
  report.draftBilledAmountMinor = draftBilling.draftBilledAmountMinor;
  report.draftReceivedAmountMinor = draftBilling.draftReceivedAmountMinor;
  report.draftPaymentMethod = draftBilling.draftPaymentMethod;
  report.draftPaymentReference = draftBilling.draftPaymentReference;

  await report.save();
  return report;
}

export async function deleteOwnDraft(jobReportId, actor) {
  await connectToDatabase();

  const report = await loadOwnDraftOrThrow(jobReportId, actor);
  await JobReport.deleteOne({ _id: jobReportId });

  await recordAuditEvent(
    {
      action: AUDIT_ACTION.JOB_REPORT_DRAFT_DELETED,
      entityType: AUDIT_ENTITY_TYPE.JOB_REPORT,
      entityId: report._id,
      summary: `Draft job report ${report.jobReportNumber} deleted`,
    },
    actor
  );
}

// The core atomic operation: flips a draft to SUBMITTED and posts its
// charge/initial-payment ledger entries in one MongoDB transaction, so a
// failure partway through never leaves a report submitted without its
// financial postings (spec 5.5 step 8, Milestone 5 acceptance criteria).
export async function submitJobReport(jobReportId, submissionData, actor) {
  await connectToDatabase();

  const session = await mongoose.startSession();
  let report;
  try {
    await session.withTransaction(async () => {
      report = await JobReport.findById(jobReportId).session(session);
      if (!report) {
        throw new Error("Job report not found.");
      }
      if (report.performedBy.toString() !== actor.id) {
        throw new Error("You do not have access to this job report.");
      }
      if (report.status !== JOB_REPORT_STATUS.DRAFT) {
        throw new Error("Only draft reports can be submitted.");
      }

      const workSummary = submissionData.workSummary || report.workSummary;
      if (!workSummary) {
        throw new Error("Work summary is required to submit.");
      }

      // Falls back to the draft's own staged billing fields so submitting
      // an existing draft with no new form data (the detail page's confirm
      // button) still posts what the employee actually entered, instead of
      // defaulting to a zero charge.
      const billedAmountMinor = submissionData.billedAmount
        ? parseDecimalToMinor(submissionData.billedAmount)
        : report.draftBilledAmountMinor ?? 0;
      const receivedAmountMinor = submissionData.amountReceived
        ? parseDecimalToMinor(submissionData.amountReceived)
        : report.draftReceivedAmountMinor ?? 0;
      const paymentMethod = submissionData.paymentMethod || report.draftPaymentMethod || undefined;
      const paymentReference = submissionData.paymentReference || report.draftPaymentReference || undefined;

      if (receivedAmountMinor > 0 && !paymentMethod) {
        throw new Error("A payment method is required when an amount was received.");
      }
      if (receivedAmountMinor > billedAmountMinor) {
        throw new Error("Amount received cannot exceed the billed amount.");
      }

      report.workSummary = workSummary;
      report.internalNotes = submissionData.internalNotes || report.internalNotes;
      report.status = JOB_REPORT_STATUS.SUBMITTED;
      report.submittedAt = new Date();
      report.initialBilledAmountMinor = billedAmountMinor;
      report.currencyCode = BUSINESS_CURRENCY_CODE;
      await report.save({ session });

      await ledgerService.postChargeAndInitialPayment(
        {
          jobReport: report,
          billedAmountMinor,
          receivedAmountMinor,
          paymentMethod,
          paymentReference,
          currencyCode: BUSINESS_CURRENCY_CODE,
        },
        actor,
        session
      );

      await recordAuditEvent(
        {
          action: AUDIT_ACTION.JOB_REPORT_SUBMITTED,
          entityType: AUDIT_ENTITY_TYPE.JOB_REPORT,
          entityId: report._id,
          summary: `Job report ${report.jobReportNumber} submitted`,
          after: { billedAmountMinor, receivedAmountMinor },
        },
        actor,
        session
      );

      // Auto-complete the linked booking on report submission (product
      // decision, overriding the spec's V1 default of a manual-only
      // completion step). Guarded against CANCELLED (no transitions allowed
      // out of it) and an already-COMPLETED booking, so a second employee's
      // report against the same booking doesn't re-trigger a redundant
      // status change/history entry.
      if (report.bookingId) {
        const booking = await Booking.findById(report.bookingId).session(session);
        if (
          booking &&
          booking.status !== BOOKING_STATUS.COMPLETED &&
          (BOOKING_STATUS_TRANSITIONS[booking.status] || []).includes(BOOKING_STATUS.COMPLETED)
        ) {
          const previousStatus = booking.status;
          booking.status = BOOKING_STATUS.COMPLETED;
          booking.updatedBy = actor.id;
          booking.history.push({
            type: "STATUS_CHANGED",
            summary: `Status changed from ${previousStatus} to ${BOOKING_STATUS.COMPLETED} (job report ${report.jobReportNumber} submitted)`,
            actorId: actor.id,
          });
          await booking.save({ session });

          await recordAuditEvent(
            {
              action: AUDIT_ACTION.BOOKING_STATUS_CHANGED,
              entityType: AUDIT_ENTITY_TYPE.BOOKING,
              entityId: booking._id,
              summary: `Booking ${booking.bookingNumber} status changed from ${previousStatus} to ${BOOKING_STATUS.COMPLETED} (job report ${report.jobReportNumber} submitted)`,
              before: { status: previousStatus },
              after: { status: BOOKING_STATUS.COMPLETED },
            },
            actor,
            session
          );
        }
      }
    });
  } finally {
    await session.endSession();
  }

  return report;
}

export async function createAndSubmitJobReport(data, actor) {
  const draft = await createDraft(data, actor);
  return submitJobReport(draft._id, data, actor);
}

export async function voidJobReport(jobReportId, { voidReason }, actor) {
  // Defense-in-depth: admin-only per the permission matrix (spec 4.1). The
  // calling Server Action already enforces this via requireAdmin(), but the
  // service re-checks so a future caller cannot skip it by calling the
  // service directly.
  if (actor.role !== ROLES.ADMIN) {
    throw new Error("Forbidden: admin access required");
  }

  await connectToDatabase();

  const session = await mongoose.startSession();
  let report;
  try {
    await session.withTransaction(async () => {
      report = await JobReport.findById(jobReportId).session(session);
      if (!report) {
        throw new Error("Job report not found.");
      }
      if (report.status !== JOB_REPORT_STATUS.SUBMITTED) {
        throw new Error("Only a submitted report can be voided.");
      }

      const transactions = await LedgerTransaction.find({
        jobReportId: report._id,
        type: { $ne: LEDGER_TRANSACTION_TYPE.REVERSAL },
      }).session(session);

      for (const transaction of transactions) {
        const alreadyReversed = await LedgerTransaction.findOne({
          reversesTransactionId: transaction._id,
        }).session(session);
        if (!alreadyReversed) {
          await reverseTransactionInternal(
            transaction,
            `Job report ${report.jobReportNumber} voided: ${voidReason}`,
            actor,
            session
          );
        }
      }

      report.status = JOB_REPORT_STATUS.VOIDED;
      report.voidedAt = new Date();
      report.voidReason = voidReason;
      await report.save({ session });

      await recordAuditEvent(
        {
          action: AUDIT_ACTION.JOB_REPORT_VOIDED,
          entityType: AUDIT_ENTITY_TYPE.JOB_REPORT,
          entityId: report._id,
          summary: `Job report ${report.jobReportNumber} voided: ${voidReason}`,
          metadata: { reason: voidReason },
        },
        actor,
        session
      );
    });
  } finally {
    await session.endSession();
  }

  return report;
}

// Employees see only their own reports; admin sees all, optionally filtered
// (spec 4.1/4.2 ownership rule, spec 8.8 admin filter list).
export async function listJobReportsForActor(actor, filters = {}) {
  await connectToDatabase();

  const query = {};
  if (actor.role !== ROLES.ADMIN) {
    query.performedBy = actor.id;
  } else if (filters.employeeId) {
    query.performedBy = filters.employeeId;
  }
  if (filters.workDate) query.workDate = filters.workDate;
  if (filters.status) query.status = filters.status;
  if (filters.source) query.source = filters.source;
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.bookingId) query.bookingId = filters.bookingId;

  return JobReport.find(query)
    .sort({ workDate: -1, createdAt: -1 })
    .limit(200)
    .populate("performedBy", "name")
    .lean();
}
