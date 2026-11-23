import { describe, expect, it } from "vitest";
import { createAdminActor, createEmployeeActor } from "./helpers.js";
import { createBooking, assignEmployeesToBooking } from "@/server/services/bookingService";
import User from "@/models/User";

async function createBaseBooking(actor) {
  return createBooking(
    {
      customerName: "Uma",
      customerPhone: "555-4001",
      addressLine1: "1 Elm St",
      serviceName: "Inspection",
      scheduledDate: "2026-11-25",
      scheduledTime: "09:00",
    },
    actor
  );
}

describe("assigned employee validation (spec 12.3)", () => {
  it("rejects assigning a non-existent user id", async () => {
    const admin = await createAdminActor();
    const booking = await createBaseBooking(admin);

    await expect(
      assignEmployeesToBooking(booking._id, { assignedEmployeeIds: ["000000000000000000000000"] }, admin)
    ).rejects.toThrow(/invalid, inactive, or not an employee/i);
  });

  it("rejects assigning a deactivated employee", async () => {
    const admin = await createAdminActor();
    const employee = await createEmployeeActor();
    await User.findByIdAndUpdate(employee.id, { isActive: false });

    const booking = await createBaseBooking(admin);

    await expect(
      assignEmployeesToBooking(booking._id, { assignedEmployeeIds: [employee.id] }, admin)
    ).rejects.toThrow(/invalid, inactive, or not an employee/i);
  });

  it("rejects assigning an admin account as an employee", async () => {
    const admin = await createAdminActor();
    const otherAdmin = await createAdminActor();

    const booking = await createBaseBooking(admin);

    await expect(
      assignEmployeesToBooking(booking._id, { assignedEmployeeIds: [otherAdmin.id] }, admin)
    ).rejects.toThrow(/invalid, inactive, or not an employee/i);
  });

  it("accepts a real, active employee", async () => {
    const admin = await createAdminActor();
    const employee = await createEmployeeActor();

    const booking = await createBaseBooking(admin);

    const updated = await assignEmployeesToBooking(
      booking._id,
      { assignedEmployeeIds: [employee.id] },
      admin
    );
    expect(updated.assignedEmployeeIds.map(String)).toContain(employee.id);
  });
});
