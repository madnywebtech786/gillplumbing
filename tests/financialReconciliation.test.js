import { describe, expect, it } from "vitest";
import { createAdminActor, createEmployeeActor } from "./helpers.js";
import { createAndSubmitJobReport } from "@/server/services/jobReportService";
import {
  addPayment,
  addAdjustment,
  recordRefund,
  reverseTransaction,
  getJobReportBalance,
  getCustomerBalance,
} from "@/server/services/ledgerService";
import LedgerTransaction from "@/models/LedgerTransaction";

// Spec 18.4: build a fixture spanning multiple job reports, charges, partial
// payments, adjustments, refunds, and reversals for the SAME customer, then
// verify per-job and per-customer balances both reconcile from the ledger
// and that no transaction is counted twice.
describe("financial reconciliation (spec 18.4)", () => {
  it("reconciles per-job and per-customer balances across a mixed transaction history", async () => {
    const admin = await createAdminActor();
    const employee = await createEmployeeActor();
    const sharedPhone = "555-2001";

    // Job 1: billed 500, partial payment 300 at submission, later payment
    // of 200 brings it to zero, then a 50 adjustment re-opens a balance.
    const job1 = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Oscar",
        customerPhone: sharedPhone,
        serviceSnapshot: "Water line repair",
        workDate: "2026-11-18",
        workSummary: "Repaired water line",
        billedAmount: "500.00",
        amountReceived: "300.00",
        paymentMethod: "CASH",
      },
      employee
    );
    await addPayment(job1._id, { amount: "200.00", paymentMethod: "CARD" }, admin);
    await addAdjustment(job1._id, { newBilledAmount: "550.00", reason: "Additional fitting required" }, admin);

    // Job 2 (same customer): billed 200, paid in full at submission, then a
    // 50 refund is issued and a payment is later reversed for correction.
    const job2 = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Oscar",
        customerPhone: sharedPhone,
        serviceSnapshot: "Faucet replacement",
        workDate: "2026-11-19",
        workSummary: "Replaced kitchen faucet",
        billedAmount: "200.00",
        amountReceived: "200.00",
        paymentMethod: "CASH",
      },
      employee
    );
    await recordRefund(job2._id, { amount: "50.00", reason: "Customer dissatisfaction credit" }, admin);

    const job2Payment = await LedgerTransaction.findOne({
      jobReportId: job2._id,
      type: "PAYMENT",
    }).sort({ createdAt: 1 });
    const reversal = await reverseTransaction(job2Payment._id, { reason: "Recorded against wrong job" }, admin);

    // --- Per-job reconciliation ---
    const job1Transactions = await LedgerTransaction.find({ jobReportId: job1._id }).lean();
    const job1ExpectedBalance = job1Transactions.reduce((sum, tx) => sum + tx.signedAmountMinor, 0);
    expect(await getJobReportBalance(job1._id)).toBe(job1ExpectedBalance);
    expect(job1ExpectedBalance).toBe(5000); // 550 billed - 500 paid = 50 outstanding

    const job2Transactions = await LedgerTransaction.find({ jobReportId: job2._id }).lean();
    const job2ExpectedBalance = job2Transactions.reduce((sum, tx) => sum + tx.signedAmountMinor, 0);
    expect(await getJobReportBalance(job2._id)).toBe(job2ExpectedBalance);
    // 200 charge - 200 payment + 50 refund + 200 reversal (undoing the paid
    // charge) = 250 outstanding.
    expect(job2ExpectedBalance).toBe(25000);

    // --- Per-customer reconciliation ---
    const customerId = job1.customerId;
    expect(job2.customerId.toString()).toBe(customerId.toString());

    const allCustomerTransactions = await LedgerTransaction.find({ customerId }).lean();
    const customerExpectedBalance = allCustomerTransactions.reduce((sum, tx) => sum + tx.signedAmountMinor, 0);
    expect(await getCustomerBalance(customerId)).toBe(customerExpectedBalance);
    expect(customerExpectedBalance).toBe(job1ExpectedBalance + job2ExpectedBalance);

    // --- No transaction counted twice ---
    const allIds = allCustomerTransactions.map((tx) => tx._id.toString());
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(reversal.signedAmountMinor).toBe(-job2Payment.signedAmountMinor);
  });
});
