import "server-only";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import LedgerTransaction from "@/models/LedgerTransaction";
import JobReport from "@/models/JobReport";
import { nextReferenceNumber } from "@/lib/numbering";
import { parseDecimalToMinor, subtractMinor, sumSignedLedgerDeltas, formatMinor } from "@/lib/money";
import { recordAuditEvent } from "@/server/services/auditService";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, LEDGER_TRANSACTION_TYPE } from "@/constants/statuses";
import { ROLES } from "@/constants/roles";

// Defense-in-depth: every exported mutation here is admin-only per the
// permission matrix (spec 4.1). The calling Server Action already enforces
// this via requireAdmin(), but the service re-checks so a future caller
// cannot skip it by invoking the service directly.
function assertAdmin(actor) {
  if (actor.role !== ROLES.ADMIN) {
    throw new Error("Forbidden: admin access required");
  }
}

export async function getLedgerTransactionsForJobReport(jobReportId) {
  await connectToDatabase();
  return LedgerTransaction.find({ jobReportId })
    .sort({ occurredAt: 1 })
    .populate("recordedBy", "name")
    .lean();
}

export async function getLedgerTransactionsForCustomer(customerId, { startDate, endDate, type } = {}) {
  await connectToDatabase();

  const query = { customerId };
  if (type) query.type = type;
  if (startDate || endDate) {
    query.occurredAt = {};
    if (startDate) query.occurredAt.$gte = startDate;
    if (endDate) query.occurredAt.$lte = endDate;
  }

  return LedgerTransaction.find(query)
    .sort({ occurredAt: 1 })
    .populate("recordedBy", "name")
    .lean();
}

export function calculateBalanceFromTransactions(transactions) {
  return sumSignedLedgerDeltas(transactions);
}

export async function getJobReportBalance(jobReportId) {
  const transactions = await getLedgerTransactionsForJobReport(jobReportId);
  return sumSignedLedgerDeltas(transactions);
}

export async function getCustomerBalance(customerId) {
  await connectToDatabase();
  const transactions = await LedgerTransaction.find({ customerId }).lean();
  return sumSignedLedgerDeltas(transactions);
}

// Posts the initial CHARGE (and, if money changed hands at the visit, the
// initial PAYMENT) for a job report. Called from inside the transaction
// jobReportService.submitJobReport already has open - never opens its own
// session, matching findOrCreateCustomerByPhone's pattern.
export async function postChargeAndInitialPayment(
  { jobReport, billedAmountMinor, receivedAmountMinor, paymentMethod, paymentReference, currencyCode },
  actor,
  session
) {
  if (receivedAmountMinor > billedAmountMinor) {
    throw new Error("Amount received cannot exceed the billed amount.");
  }

  const baseFields = {
    jobReportId: jobReport._id,
    bookingId: jobReport.bookingId ?? undefined,
    customerId: jobReport.customerId ?? undefined,
    customerSnapshot: {
      name: jobReport.customerSnapshot?.name,
      phone: jobReport.customerSnapshot?.phone,
    },
    currencyCode,
    recordedBy: actor.id,
  };

  if (billedAmountMinor > 0) {
    const transactionNumber = await nextReferenceNumber("transaction", session);
    await LedgerTransaction.create(
      [
        {
          ...baseFields,
          transactionNumber,
          type: LEDGER_TRANSACTION_TYPE.CHARGE,
          signedAmountMinor: billedAmountMinor,
          description: `Charge for job report ${jobReport.jobReportNumber}`,
        },
      ],
      { session }
    );
  }

  if (receivedAmountMinor > 0) {
    const transactionNumber = await nextReferenceNumber("transaction", session);
    await LedgerTransaction.create(
      [
        {
          ...baseFields,
          transactionNumber,
          type: LEDGER_TRANSACTION_TYPE.PAYMENT,
          signedAmountMinor: -receivedAmountMinor,
          paymentMethod,
          reference: paymentReference || undefined,
          description: `Initial payment received for job report ${jobReport.jobReportNumber}`,
        },
      ],
      { session }
    );
  }
}

export async function addPayment(jobReportId, { amount, paymentMethod, reference, note }, actor) {
  assertAdmin(actor);
  await connectToDatabase();

  const amountMinor = parseDecimalToMinor(amount);

  const session = await mongoose.startSession();
  let transaction;
  try {
    await session.withTransaction(async () => {
      const jobReport = await JobReport.findById(jobReportId).session(session);
      if (!jobReport) {
        throw new Error("Job report not found.");
      }

      // Balance must be read inside the transaction so a concurrent payment
      // attempt that reads a stale balance hits a write conflict and retries
      // with a fresh read, instead of both attempts passing the check and
      // overpaying the job (spec 11.5, Milestone 5 acceptance criteria).
      const transactions = await LedgerTransaction.find({ jobReportId }).session(session).lean();
      const currentBalance = sumSignedLedgerDeltas(transactions);

      if (amountMinor > currentBalance) {
        throw new Error(
          `Payment of ${formatMinor(amountMinor, jobReport.currencyCode)} exceeds the outstanding balance of ${formatMinor(currentBalance, jobReport.currencyCode)}.`
        );
      }

      const transactionNumber = await nextReferenceNumber("transaction", session);
      const [created] = await LedgerTransaction.create(
        [
          {
            transactionNumber,
            jobReportId: jobReport._id,
            bookingId: jobReport.bookingId ?? undefined,
            customerId: jobReport.customerId ?? undefined,
            customerSnapshot: {
              name: jobReport.customerSnapshot?.name,
              phone: jobReport.customerSnapshot?.phone,
            },
            type: LEDGER_TRANSACTION_TYPE.PAYMENT,
            signedAmountMinor: -amountMinor,
            currencyCode: jobReport.currencyCode,
            paymentMethod,
            reference: reference || undefined,
            description: note || `Payment recorded for job report ${jobReport.jobReportNumber}`,
            occurredAt: new Date(),
            recordedBy: actor.id,
          },
        ],
        { session }
      );
      transaction = created;

      await recordAuditEvent(
        {
          action: AUDIT_ACTION.PAYMENT_RECORDED,
          entityType: AUDIT_ENTITY_TYPE.LEDGER_TRANSACTION,
          entityId: transaction._id,
          summary: `Payment of ${formatMinor(amountMinor, jobReport.currencyCode)} recorded for job report ${jobReport.jobReportNumber}`,
          metadata: { jobReportId: jobReport._id, amountMinor, paymentMethod },
        },
        actor,
        session
      );
    });
  } finally {
    await session.endSession();
  }

  return transaction;
}

export async function addAdjustment(jobReportId, { newBilledAmount, reason }, actor) {
  assertAdmin(actor);
  await connectToDatabase();

  const newAmountMinor = parseDecimalToMinor(newBilledAmount);

  const session = await mongoose.startSession();
  let transaction;
  try {
    await session.withTransaction(async () => {
      const jobReport = await JobReport.findById(jobReportId).session(session);
      if (!jobReport) {
        throw new Error("Job report not found.");
      }

      const transactions = await LedgerTransaction.find({ jobReportId }).session(session).lean();
      const currentEffectiveBilled = sumSignedLedgerDeltas(
        transactions.filter(
          (tx) => tx.type === LEDGER_TRANSACTION_TYPE.CHARGE || tx.type === LEDGER_TRANSACTION_TYPE.ADJUSTMENT
        )
      );

      const delta = subtractMinor(newAmountMinor, currentEffectiveBilled);
      if (delta === 0) {
        throw new Error("New amount matches the current billed amount; no adjustment needed.");
      }

      const transactionNumber = await nextReferenceNumber("transaction", session);
      const [created] = await LedgerTransaction.create(
        [
          {
            transactionNumber,
            jobReportId: jobReport._id,
            bookingId: jobReport.bookingId ?? undefined,
            customerId: jobReport.customerId ?? undefined,
            customerSnapshot: {
              name: jobReport.customerSnapshot?.name,
              phone: jobReport.customerSnapshot?.phone,
            },
            type: LEDGER_TRANSACTION_TYPE.ADJUSTMENT,
            signedAmountMinor: delta,
            currencyCode: jobReport.currencyCode,
            description: `Bill amount adjusted from ${formatMinor(currentEffectiveBilled, jobReport.currencyCode)} to ${formatMinor(newAmountMinor, jobReport.currencyCode)}: ${reason}`,
            recordedBy: actor.id,
          },
        ],
        { session }
      );
      transaction = created;

      await recordAuditEvent(
        {
          action: AUDIT_ACTION.ADJUSTMENT_POSTED,
          entityType: AUDIT_ENTITY_TYPE.LEDGER_TRANSACTION,
          entityId: transaction._id,
          summary: `Adjustment posted for job report ${jobReport.jobReportNumber}: ${reason}`,
          before: { billedAmountMinor: currentEffectiveBilled },
          after: { billedAmountMinor: newAmountMinor },
          metadata: { jobReportId: jobReport._id, reason },
        },
        actor,
        session
      );
    });
  } finally {
    await session.endSession();
  }

  return transaction;
}

export async function recordRefund(jobReportId, { amount, reason, reference }, actor) {
  assertAdmin(actor);
  await connectToDatabase();

  const amountMinor = parseDecimalToMinor(amount);

  const session = await mongoose.startSession();
  let transaction;
  try {
    await session.withTransaction(async () => {
      const jobReport = await JobReport.findById(jobReportId).session(session);
      if (!jobReport) {
        throw new Error("Job report not found.");
      }

      const transactionNumber = await nextReferenceNumber("transaction", session);
      const [created] = await LedgerTransaction.create(
        [
          {
            transactionNumber,
            jobReportId: jobReport._id,
            bookingId: jobReport.bookingId ?? undefined,
            customerId: jobReport.customerId ?? undefined,
            customerSnapshot: {
              name: jobReport.customerSnapshot?.name,
              phone: jobReport.customerSnapshot?.phone,
            },
            type: LEDGER_TRANSACTION_TYPE.REFUND,
            signedAmountMinor: amountMinor,
            currencyCode: jobReport.currencyCode,
            reference: reference || undefined,
            description: `Refund issued: ${reason}`,
            recordedBy: actor.id,
          },
        ],
        { session }
      );
      transaction = created;

      await recordAuditEvent(
        {
          action: AUDIT_ACTION.REFUND_RECORDED,
          entityType: AUDIT_ENTITY_TYPE.LEDGER_TRANSACTION,
          entityId: transaction._id,
          summary: `Refund of ${formatMinor(amountMinor, jobReport.currencyCode)} recorded for job report ${jobReport.jobReportNumber}: ${reason}`,
          metadata: { jobReportId: jobReport._id, amountMinor, reason },
        },
        actor,
        session
      );
    });
  } finally {
    await session.endSession();
  }

  return transaction;
}

// Creates the exact-opposite REVERSAL row for an existing transaction.
// Shared by reverseTransaction (opens its own session) and
// jobReportService.voidJobReport (passes its own already-open session), so
// the "opposite entry" logic is written once.
export async function reverseTransactionInternal(original, reason, actor, session) {
  const alreadyReversed = await LedgerTransaction.findOne({ reversesTransactionId: original._id }).session(session);
  if (alreadyReversed) {
    throw new Error("This transaction has already been reversed.");
  }

  const transactionNumber = await nextReferenceNumber("transaction", session);
  const [reversal] = await LedgerTransaction.create(
    [
      {
        transactionNumber,
        jobReportId: original.jobReportId,
        bookingId: original.bookingId ?? undefined,
        customerId: original.customerId ?? undefined,
        customerSnapshot: original.customerSnapshot,
        type: LEDGER_TRANSACTION_TYPE.REVERSAL,
        signedAmountMinor: -original.signedAmountMinor,
        currencyCode: original.currencyCode,
        reversesTransactionId: original._id,
        description: `Reversal of ${original.transactionNumber}: ${reason}`,
        recordedBy: actor.id,
      },
    ],
    { session }
  );

  await recordAuditEvent(
    {
      action: AUDIT_ACTION.TRANSACTION_REVERSED,
      entityType: AUDIT_ENTITY_TYPE.LEDGER_TRANSACTION,
      entityId: reversal._id,
      summary: `Transaction ${original.transactionNumber} reversed: ${reason}`,
      metadata: { reversesTransactionId: original._id, reason },
    },
    actor,
    session
  );

  return reversal;
}

export async function reverseTransaction(transactionId, { reason }, actor) {
  assertAdmin(actor);
  await connectToDatabase();

  const session = await mongoose.startSession();
  let reversal;
  try {
    await session.withTransaction(async () => {
      const original = await LedgerTransaction.findById(transactionId).session(session);
      if (!original) {
        throw new Error("Transaction not found.");
      }
      reversal = await reverseTransactionInternal(original, reason, actor, session);
    });
  } finally {
    await session.endSession();
  }

  return reversal;
}
