import { describe, expect, it } from "vitest";
import { createAdminActor, createEmployeeActor } from "./helpers.js";
import { createEmployee } from "@/server/services/employeeService";
import { createInquiry, getInquiryForActor, listInquiries } from "@/server/services/inquiryService";
import { createBooking, assignEmployeesToBooking } from "@/server/services/bookingService";
import { createDraft, getJobReportForActor } from "@/server/services/jobReportService";
import { addPayment, addAdjustment, recordRefund, reverseTransaction } from "@/server/services/ledgerService";
import { voidJobReport } from "@/server/services/jobReportService";
import User from "@/models/User";
import { ROLES } from "@/constants/roles";

describe("employee account creation (spec 18.2 #1-2)", () => {
  it("admin can create an employee account", async () => {
    const admin = await createAdminActor();
    const employee = await createEmployee(
      { name: "New Hire", email: "new-hire@example.com", password: "Password123", createdBy: admin.id },
      admin
    );

    expect(employee.role).toBe(ROLES.EMPLOYEE);
    const stored = await User.findById(employee._id);
    expect(stored.role).toBe(ROLES.EMPLOYEE);
  });

  it("createEmployee never grants ADMIN regardless of input", async () => {
    const admin = await createAdminActor();
    // employeeService.createEmployee hardcodes role: ROLES.EMPLOYEE and
    // takes no role field from its input - an employee (or a compromised
    // form) cannot escalate to ADMIN through this function.
    const employee = await createEmployee(
      { name: "Attempted Admin", email: "attempt@example.com", password: "Password123", createdBy: admin.id, role: "ADMIN" },
      admin
    );
    expect(employee.role).toBe(ROLES.EMPLOYEE);
  });
});

describe("inquiry ownership (spec 18.2 #3, #8)", () => {
  it("employee can create and read their own inquiry", async () => {
    const employee = await createEmployeeActor();
    const inquiry = await createInquiry(
      { customerName: "Alice", customerPhone: "555-0001", addressLine1: "1 Main St", callSummary: "Leaky faucet" },
      employee
    );

    const found = await getInquiryForActor(inquiry._id, employee);
    expect(found).not.toBeNull();
    expect(found.inquiryNumber).toBe(inquiry.inquiryNumber);
  });

  it("employee cannot read another employee's inquiry", async () => {
    const employeeA = await createEmployeeActor();
    const employeeB = await createEmployeeActor();

    const inquiry = await createInquiry(
      { customerName: "Bob", customerPhone: "555-0002", addressLine1: "2 Main St", callSummary: "Clogged drain" },
      employeeA
    );

    const found = await getInquiryForActor(inquiry._id, employeeB);
    expect(found).toBeNull();
  });

  it("employee's inquiry list excludes other employees' inquiries; admin sees all", async () => {
    const employeeA = await createEmployeeActor();
    const employeeB = await createEmployeeActor();
    const admin = await createAdminActor();

    await createInquiry(
      { customerName: "Carol", customerPhone: "555-0003", addressLine1: "3 Main St", callSummary: "Burst pipe" },
      employeeA
    );
    await createInquiry(
      { customerName: "Dave", customerPhone: "555-0004", addressLine1: "4 Main St", callSummary: "Water heater" },
      employeeB
    );

    const employeeAList = await listInquiries(employeeA);
    expect(employeeAList).toHaveLength(1);
    expect(employeeAList[0].customerSnapshot.name).toBe("Carol");

    const adminList = await listInquiries(admin);
    expect(adminList).toHaveLength(2);
  });
});

describe("job report ownership (spec 18.2 #8, #18)", () => {
  it("employee cannot read or edit another employee's job report", async () => {
    const employeeA = await createEmployeeActor();
    const employeeB = await createEmployeeActor();

    const draft = await createDraft(
      {
        source: "MANUAL",
        customerName: "Eve",
        customerPhone: "555-0005",
        serviceSnapshot: "Drain cleaning",
        workDate: "2026-11-20",
      },
      employeeA
    );

    const asOwner = await getJobReportForActor(draft._id, employeeA);
    expect(asOwner).not.toBeNull();

    const asOther = await getJobReportForActor(draft._id, employeeB);
    expect(asOther).toBeNull();
  });

  it("deactivated employee's past records remain intact and readable by admin", async () => {
    const admin = await createAdminActor();
    const employee = await createEmployeeActor();

    const draft = await createDraft(
      {
        source: "MANUAL",
        customerName: "Frank",
        customerPhone: "555-0006",
        serviceSnapshot: "Pipe repair",
        workDate: "2026-11-20",
      },
      employee
    );

    await User.findByIdAndUpdate(employee.id, { isActive: false });

    const found = await getJobReportForActor(draft._id, admin);
    expect(found).not.toBeNull();
    expect(found.jobReportNumber).toBe(draft.jobReportNumber);
  });
});

describe("admin-only service guards (spec 18.2 #16, defense-in-depth)", () => {
  it("employee cannot call ledger admin operations directly", async () => {
    const employee = await createEmployeeActor();
    await expect(addPayment("000000000000000000000000", {}, employee)).rejects.toThrow(/admin/i);
    await expect(addAdjustment("000000000000000000000000", {}, employee)).rejects.toThrow(/admin/i);
    await expect(recordRefund("000000000000000000000000", {}, employee)).rejects.toThrow(/admin/i);
    await expect(reverseTransaction("000000000000000000000000", {}, employee)).rejects.toThrow(/admin/i);
  });

  it("employee cannot void a job report directly", async () => {
    const employee = await createEmployeeActor();
    await expect(voidJobReport("000000000000000000000000", { voidReason: "x" }, employee)).rejects.toThrow(/admin/i);
  });

  it("employee cannot assign employees to a booking directly", async () => {
    const employee = await createEmployeeActor();
    const booking = await createBooking(
      {
        customerName: "Grace",
        customerPhone: "555-0007",
        addressLine1: "7 Main St",
        serviceName: "Inspection",
        scheduledDate: "2026-11-25",
        scheduledTime: "09:00",
      },
      employee
    );

    await expect(
      assignEmployeesToBooking(booking._id, { assignedEmployeeIds: [employee.id] }, employee)
    ).rejects.toThrow(/admin/i);
  });
});
