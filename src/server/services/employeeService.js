import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { recordAuditEvent } from "@/server/services/auditService";
import { ROLES } from "@/constants/roles";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "@/constants/statuses";

export async function createEmployee({ name, email, phone, password, createdBy }, actor) {
  await connectToDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  const employee = await User.create({
    name,
    email,
    phone: phone || undefined,
    passwordHash,
    role: ROLES.EMPLOYEE,
    isActive: true,
    createdBy,
  });

  await recordAuditEvent(
    {
      action: AUDIT_ACTION.EMPLOYEE_CREATED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: employee._id,
      summary: `Employee ${employee.name} (${employee.email}) created`,
    },
    actor
  );

  return employee;
}

export async function listEmployees() {
  await connectToDatabase();
  return User.find({ role: ROLES.EMPLOYEE }).sort({ createdAt: -1 }).lean();
}

export async function getEmployeeById(employeeId) {
  await connectToDatabase();
  return User.findOne({ _id: employeeId, role: ROLES.EMPLOYEE }).lean();
}

export async function setEmployeeActiveStatus(employeeId, isActive, actor) {
  await connectToDatabase();

  const employee = await User.findOne({ _id: employeeId, role: ROLES.EMPLOYEE });
  if (!employee) {
    throw new Error("Employee not found.");
  }

  employee.isActive = isActive;
  await employee.save();

  await recordAuditEvent(
    {
      action: isActive ? AUDIT_ACTION.EMPLOYEE_ACTIVATED : AUDIT_ACTION.EMPLOYEE_DEACTIVATED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: employee._id,
      summary: `Employee ${employee.name} ${isActive ? "reactivated" : "deactivated"}`,
    },
    actor
  );

  return employee;
}

export async function updateEmployeeProfile(employeeId, { name, phone }, actor) {
  await connectToDatabase();

  const employee = await User.findOne({ _id: employeeId, role: ROLES.EMPLOYEE });
  if (!employee) {
    throw new Error("Employee not found.");
  }

  const before = { name: employee.name, phone: employee.phone ?? null };
  employee.name = name;
  employee.phone = phone || undefined;
  await employee.save();

  await recordAuditEvent(
    {
      action: AUDIT_ACTION.EMPLOYEE_UPDATED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: employee._id,
      summary: `Employee ${employee.name} profile updated`,
      before,
      after: { name: employee.name, phone: employee.phone ?? null },
    },
    actor
  );

  return employee;
}
