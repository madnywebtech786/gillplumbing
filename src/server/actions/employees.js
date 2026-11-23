"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { createEmployeeSchema, updateEmployeeSchema } from "@/lib/validation/employee";
import {
  createEmployee,
  setEmployeeActiveStatus,
  updateEmployeeProfile,
} from "@/server/services/employeeService";

export async function createEmployeeAction(_prevState, formData) {
  const admin = await requireAdmin();

  const validatedFields = createEmployeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createEmployee({ ...validatedFields.data, createdBy: admin.id }, admin);
  } catch (error) {
    return { error: error.message || "Could not create employee." };
  }

  revalidatePath("/employees");
  redirect("/employees");
}

export async function deactivateEmployeeAction(employeeId) {
  const admin = await requireAdmin();
  await setEmployeeActiveStatus(employeeId, false, admin);
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
}

export async function reactivateEmployeeAction(employeeId) {
  const admin = await requireAdmin();
  await setEmployeeActiveStatus(employeeId, true, admin);
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
}

export async function updateEmployeeAction(employeeId, _prevState, formData) {
  const admin = await requireAdmin();

  const validatedFields = updateEmployeeSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateEmployeeProfile(employeeId, validatedFields.data, admin);
  revalidatePath(`/employees/${employeeId}`);
  return { success: true };
}
