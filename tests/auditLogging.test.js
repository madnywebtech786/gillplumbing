import { describe, expect, it } from "vitest";
import { createAdminActor, createEmployeeActor } from "./helpers.js";
import { createInquiry } from "@/server/services/inquiryService";
import { convertInquiryToBooking } from "@/server/services/bookingService";
import { createAndSubmitJobReport } from "@/server/services/jobReportService";
import { addPayment } from "@/server/services/ledgerService";
import AuditLog from "@/models/AuditLog";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "@/constants/statuses";

describe("audit logging", () => {
  it("records INQUIRY_CREATED with the correct actor and entity", async () => {
    const employee = await createEmployeeActor();
    const inquiry = await createInquiry(
      { customerName: "Penny", customerPhone: "555-3001", addressLine1: "1 Oak St", callSummary: "Dripping tap" },
      employee
    );

    const entries = await AuditLog.find({ entityId: inquiry._id }).lean();
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe(AUDIT_ACTION.INQUIRY_CREATED);
    expect(entries[0].entityType).toBe(AUDIT_ENTITY_TYPE.INQUIRY);
    expect(entries[0].actorUserId.toString()).toBe(employee.id);
    expect(entries[0].actorRole).toBe(employee.role);
  });

  it("records both BOOKING_CREATED and INQUIRY_CONVERTED atomically on conversion", async () => {
    const employee = await createEmployeeActor();
    const inquiry = await createInquiry(
      { customerName: "Quinn", customerPhone: "555-3002", addressLine1: "2 Oak St", callSummary: "Clogged sink" },
      employee
    );

    const booking = await convertInquiryToBooking(
      inquiry._id,
      { serviceName: "Sink repair", scheduledDate: "2026-11-25", scheduledTime: "11:00" },
      employee
    );

    const bookingEntry = await AuditLog.findOne({
      entityId: booking._id,
      action: AUDIT_ACTION.BOOKING_CREATED,
    }).lean();
    const inquiryEntry = await AuditLog.findOne({
      entityId: inquiry._id,
      action: AUDIT_ACTION.INQUIRY_CONVERTED,
    }).lean();

    expect(bookingEntry).not.toBeNull();
    expect(inquiryEntry).not.toBeNull();
  });

  it("records JOB_REPORT_SUBMITTED exactly once per submission", async () => {
    const employee = await createEmployeeActor();
    const report = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Riley",
        customerPhone: "555-3003",
        serviceSnapshot: "Toilet install",
        workDate: "2026-11-20",
        workSummary: "Installed new toilet",
        billedAmount: "250.00",
        amountReceived: "0",
      },
      employee
    );

    const entries = await AuditLog.find({
      entityId: report._id,
      action: AUDIT_ACTION.JOB_REPORT_SUBMITTED,
    }).lean();
    expect(entries).toHaveLength(1);
  });

  it("records PAYMENT_RECORDED with the admin actor who recorded it, not the report's employee", async () => {
    const employee = await createEmployeeActor();
    const admin = await createAdminActor();

    const report = await createAndSubmitJobReport(
      {
        source: "MANUAL",
        customerName: "Sam",
        customerPhone: "555-3004",
        serviceSnapshot: "Water softener install",
        workDate: "2026-11-20",
        workSummary: "Installed water softener",
        billedAmount: "600.00",
        amountReceived: "0",
      },
      employee
    );

    const payment = await addPayment(report._id, { amount: "600.00", paymentMethod: "CARD" }, admin);

    const entry = await AuditLog.findOne({
      entityId: payment._id,
      action: AUDIT_ACTION.PAYMENT_RECORDED,
    }).lean();
    expect(entry).not.toBeNull();
    expect(entry.actorUserId.toString()).toBe(admin.id);
    expect(entry.actorRole).toBe("ADMIN");
  });

  it("does not record an audit event when the operation throws before committing", async () => {
    const employee = await createEmployeeActor();

    await expect(
      createAndSubmitJobReport(
        {
          source: "MANUAL",
          customerName: "Tara",
          customerPhone: "555-3005",
          serviceSnapshot: "Overpayment test",
          workDate: "2026-11-20",
          workSummary: "Should fail validation",
          billedAmount: "100.00",
          amountReceived: "500.00", // exceeds billed amount - must throw
          paymentMethod: "CASH",
        },
        employee
      )
    ).rejects.toThrow(/cannot exceed the billed amount/i);

    const entries = await AuditLog.find({ action: AUDIT_ACTION.JOB_REPORT_SUBMITTED }).lean();
    expect(entries).toHaveLength(0);
  });
});
