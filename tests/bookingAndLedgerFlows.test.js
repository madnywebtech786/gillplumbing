import { describe, expect, it } from "vitest";
import { createAdminActor, createEmployeeActor } from "./helpers.js";
import { createInquiry, getInquiryForActor } from "@/server/services/inquiryService";
import {
  convertInquiryToBooking,
  rescheduleBooking,
  getBookingForActor,
} from "@/server/services/bookingService";
import { createAndSubmitJobReport } from "@/server/services/jobReportService";
import {
  addPayment,
  addAdjustment,
  reverseTransaction,
  getJobReportBalance,
} from "@/server/services/ledgerService";
import LedgerTransaction from "@/models/LedgerTransaction";
import { LEDGER_TRANSACTION_TYPE } from "@/constants/statuses";

async function createTestInquiry(actor, overrides = {}) {
  return createInquiry(
    {
      customerName: overrides.customerName ?? "Henry",
      customerPhone: overrides.customerPhone ?? "555-1001",
      addressLine1: "10 Main St",
      callSummary: "Running toilet",
    },
    actor
  );
}

describe("inquiry to booking conversion (spec 18.2 #4, Workflow B)", () => {
  it("converts exactly once and is atomic", async () => {
    const employee = await createEmployeeActor();
    const inquiry = await createTestInquiry(employee);

    const booking = await convertInquiryToBooking(
      inquiry._id,
      { serviceName: "Toilet repair", scheduledDate: "2026-11-25", scheduledTime: "10:00" },
      employee
    );

    expect(booking.inquiryId.toString()).toBe(inquiry._id.toString());

    const convertedInquiry = await getInquiryForActor(inquiry._id, employee);
    expect(convertedInquiry.status).toBe("CONVERTED");
    expect(convertedInquiry.convertedBookingId.toString()).toBe(booking._id.toString());
  });

  it("rejects converting an already-converted inquiry", async () => {
    const employee = await createEmployeeActor();
    const inquiry = await createTestInquiry(employee);

    await convertInquiryToBooking(
      inquiry._id,
      { serviceName: "Toilet repair", scheduledDate: "2026-11-25", scheduledTime: "10:00" },
      employee
    );

    await expect(
      convertInquiryToBooking(
        inquiry._id,
        { serviceName: "Toilet repair, again", scheduledDate: "2026-11-26", scheduledTime: "10:00" },
        employee
      )
    ).rejects.toThrow(/already been converted/i);
  });
});

describe("booking reschedule history (spec 18.2 #17)", () => {
  it("preserves old and new schedule in history", async () => {
    const employee = await createEmployeeActor();
    const inquiry = await createTestInquiry(employee);
    const booking = await convertInquiryToBooking(
      inquiry._id,
      { serviceName: "Toilet repair", scheduledDate: "2026-11-25", scheduledTime: "10:00" },
      employee
    );
    const originalStart = booking.scheduledStartAt;

    await rescheduleBooking(booking._id, { scheduledDate: "2026-11-27", scheduledTime: "14:00" }, employee);

    const updated = await getBookingForActor(booking._id);
    expect(updated.scheduledStartAt.toISOString()).not.toBe(originalStart.toISOString());

    const rescheduleEvent = updated.history.find((event) => event.type === "RESCHEDULED");
    expect(rescheduleEvent).toBeDefined();
    expect(new Date(rescheduleEvent.metadata.previousStartAt).toISOString()).toBe(originalStart.toISOString());
  });
});

describe("job report submission posts ledger entries (spec 18.2 #9-10)", () => {
  it("posts exactly one CHARGE and one PAYMENT for a submission with an initial payment", async () => {
    const employee = await createEmployeeActor();

    const report = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Ivy",
        customerPhone: "555-1002",
        serviceSnapshot: "Water heater install",
        workDate: "2026-11-20",
        workSummary: "Installed new water heater",
        billedAmount: "500.00",
        amountReceived: "200.00",
        paymentMethod: "CASH",
      },
      employee
    );

    const transactions = await LedgerTransaction.find({ jobReportId: report._id }).lean();
    const charges = transactions.filter((tx) => tx.type === LEDGER_TRANSACTION_TYPE.CHARGE);
    const payments = transactions.filter((tx) => tx.type === LEDGER_TRANSACTION_TYPE.PAYMENT);

    expect(charges).toHaveLength(1);
    expect(charges[0].signedAmountMinor).toBe(50000);
    expect(payments).toHaveLength(1);
    expect(payments[0].signedAmountMinor).toBe(-20000);

    const balance = await getJobReportBalance(report._id);
    expect(balance).toBe(30000);
  });

  it("posts no CHARGE when the billed amount is zero", async () => {
    const employee = await createEmployeeActor();

    const report = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Jack",
        customerPhone: "555-1003",
        serviceSnapshot: "Courtesy inspection",
        workDate: "2026-11-20",
        workSummary: "No charge inspection",
        billedAmount: "0",
        amountReceived: "0",
      },
      employee
    );

    const transactions = await LedgerTransaction.find({ jobReportId: report._id }).lean();
    expect(transactions).toHaveLength(0);
  });
});

describe("later payments and balance recalculation (spec 18.2 #11-13)", () => {
  it("admin adds a second later payment and the balance recalculates correctly", async () => {
    const admin = await createAdminActor();
    const employee = await createEmployeeActor();

    const report = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Karen",
        customerPhone: "555-1004",
        serviceSnapshot: "Pipe replacement",
        workDate: "2026-11-20",
        workSummary: "Replaced section of pipe",
        billedAmount: "500.00",
        amountReceived: "200.00",
        paymentMethod: "CASH",
      },
      employee
    );

    expect(await getJobReportBalance(report._id)).toBe(30000);

    await addPayment(report._id, { amount: "100.00", paymentMethod: "CARD" }, admin);
    expect(await getJobReportBalance(report._id)).toBe(20000);

    await addPayment(report._id, { amount: "200.00", paymentMethod: "CARD" }, admin);
    expect(await getJobReportBalance(report._id)).toBe(0);
  });

  it("rejects a payment that exceeds the outstanding balance", async () => {
    const admin = await createAdminActor();
    const employee = await createEmployeeActor();

    const report = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Leo",
        customerPhone: "555-1005",
        serviceSnapshot: "Faucet replacement",
        workDate: "2026-11-20",
        workSummary: "Replaced faucet",
        billedAmount: "150.00",
        amountReceived: "0",
      },
      employee
    );

    await expect(addPayment(report._id, { amount: "200.00", paymentMethod: "CASH" }, admin)).rejects.toThrow(
      /exceeds the outstanding balance/i
    );

    // Balance is unaffected by the rejected attempt.
    expect(await getJobReportBalance(report._id)).toBe(15000);
  });
});

describe("adjustments and reversals preserve history (spec 18.2 #14-15)", () => {
  it("adjustment creates a new ledger row and changes the effective balance without touching the original charge", async () => {
    const admin = await createAdminActor();
    const employee = await createEmployeeActor();

    const report = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Mona",
        customerPhone: "555-1006",
        serviceSnapshot: "Drain snake",
        workDate: "2026-11-20",
        workSummary: "Cleared drain",
        billedAmount: "300.00",
        amountReceived: "0",
      },
      employee
    );

    await addAdjustment(report._id, { newBilledAmount: "350.00", reason: "Extra parts used" }, admin);

    const transactions = await LedgerTransaction.find({ jobReportId: report._id }).sort({ createdAt: 1 }).lean();
    expect(transactions).toHaveLength(2);
    expect(transactions[0].type).toBe(LEDGER_TRANSACTION_TYPE.CHARGE);
    expect(transactions[0].signedAmountMinor).toBe(30000);
    expect(transactions[1].type).toBe(LEDGER_TRANSACTION_TYPE.ADJUSTMENT);
    expect(transactions[1].signedAmountMinor).toBe(5000);

    expect(await getJobReportBalance(report._id)).toBe(35000);
  });

  it("reversal creates an opposite entry without deleting the original, and cannot be reversed twice", async () => {
    const admin = await createAdminActor();
    const employee = await createEmployeeActor();

    const report = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Nora",
        customerPhone: "555-1007",
        serviceSnapshot: "Sump pump repair",
        workDate: "2026-11-20",
        workSummary: "Repaired sump pump",
        billedAmount: "400.00",
        amountReceived: "400.00",
        paymentMethod: "CASH",
      },
      employee
    );

    const payment = await LedgerTransaction.findOne({
      jobReportId: report._id,
      type: LEDGER_TRANSACTION_TYPE.PAYMENT,
    });
    expect(payment).not.toBeNull();

    const reversal = await reverseTransaction(payment._id, { reason: "Recorded in error" }, admin);
    expect(reversal.signedAmountMinor).toBe(-payment.signedAmountMinor);

    const stillExists = await LedgerTransaction.findById(payment._id);
    expect(stillExists).not.toBeNull();

    await expect(reverseTransaction(payment._id, { reason: "Try again" }, admin)).rejects.toThrow(
      /already been reversed/i
    );
  });
});
