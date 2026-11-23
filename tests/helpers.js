import User from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { ROLES } from "@/constants/roles";

let counter = 0;

// Creates a real User document and returns the plain { id, role } shape
// every service function expects as its `actor` argument - the same shape
// src/lib/auth/dal.js produces from a real session.
export async function createActor(role = ROLES.EMPLOYEE, overrides = {}) {
  counter += 1;
  const passwordHash = await hashPassword("Test-password-123");

  const user = await User.create({
    name: overrides.name ?? `Test ${role} ${counter}`,
    email: overrides.email ?? `test-${role.toLowerCase()}-${counter}@example.com`,
    role,
    passwordHash,
    isActive: overrides.isActive ?? true,
  });

  return { id: user._id.toString(), role: user.role, _doc: user };
}

export function createAdminActor(overrides) {
  return createActor(ROLES.ADMIN, overrides);
}

export function createEmployeeActor(overrides) {
  return createActor(ROLES.EMPLOYEE, overrides);
}
