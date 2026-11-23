"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, requireAdmin } from "@/lib/auth/dal";
import {
  createBookingSchema,
  convertInquiryToBookingSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
  updateBookingStatusSchema,
  assignEmployeesSchema,
} from "@/lib/validation/booking";
import {
  createBooking,
  convertInquiryToBooking,
  rescheduleBooking,
  cancelBooking,
  updateBookingStatus,
  assignEmployeesToBooking,
  getBookingForActor,
} from "@/server/services/bookingService";

function parseBookingFields(formData) {
  return createBookingSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    addressLine1: formData.get("addressLine1"),
    addressCity: formData.get("addressCity"),
    serviceName: formData.get("serviceName"),
    serviceDescription: formData.get("serviceDescription"),
    scheduledDate: formData.get("scheduledDate"),
    scheduledTime: formData.get("scheduledTime"),
    expectedDurationMinutes: formData.get("expectedDurationMinutes") || undefined,
    assignedEmployeeIds: formData.getAll("assignedEmployeeIds"),
    internalNotes: formData.get("internalNotes"),
  });
}

export async function createBookingAction(_prevState, formData) {
  const actor = await requireUser();

  const validatedFields = parseBookingFields(formData);
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  let booking;
  try {
    booking = await createBooking(validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not create booking." };
  }

  revalidatePath("/bookings");
  redirect(`/bookings/${booking._id.toString()}`);
}

export async function convertInquiryToBookingAction(inquiryId, _prevState, formData) {
  const actor = await requireUser();

  const validatedFields = convertInquiryToBookingSchema.safeParse({
    serviceName: formData.get("serviceName"),
    serviceDescription: formData.get("serviceDescription"),
    scheduledDate: formData.get("scheduledDate"),
    scheduledTime: formData.get("scheduledTime"),
    expectedDurationMinutes: formData.get("expectedDurationMinutes") || undefined,
    assignedEmployeeIds: formData.getAll("assignedEmployeeIds"),
    internalNotes: formData.get("internalNotes"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  let booking;
  try {
    booking = await convertInquiryToBooking(inquiryId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not convert inquiry to booking." };
  }

  revalidatePath("/inquiries");
  revalidatePath(`/inquiries/${inquiryId}`);
  revalidatePath("/bookings");
  redirect(`/bookings/${booking._id.toString()}`);
}

export async function rescheduleBookingAction(bookingId, _prevState, formData) {
  const actor = await requireUser();

  const booking = await getBookingForActor(bookingId);
  if (!booking) {
    return { error: "Booking not found or you do not have access to it." };
  }

  const validatedFields = rescheduleBookingSchema.safeParse({
    scheduledDate: formData.get("scheduledDate"),
    scheduledTime: formData.get("scheduledTime"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await rescheduleBooking(bookingId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not reschedule booking." };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function cancelBookingAction(bookingId, _prevState, formData) {
  const actor = await requireUser();

  const booking = await getBookingForActor(bookingId);
  if (!booking) {
    return { error: "Booking not found or you do not have access to it." };
  }

  const validatedFields = cancelBookingSchema.safeParse({
    cancelReason: formData.get("cancelReason"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await cancelBooking(bookingId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not cancel booking." };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function updateBookingStatusAction(bookingId, _prevState, formData) {
  const actor = await requireUser();

  const booking = await getBookingForActor(bookingId);
  if (!booking) {
    return { error: "Booking not found or you do not have access to it." };
  }

  const validatedFields = updateBookingStatusSchema.safeParse({
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateBookingStatus(bookingId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not update booking status." };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function assignEmployeesAction(bookingId, _prevState, formData) {
  const actor = await requireAdmin();

  const booking = await getBookingForActor(bookingId);
  if (!booking) {
    return { error: "Booking not found or you do not have access to it." };
  }

  const validatedFields = assignEmployeesSchema.safeParse({
    assignedEmployeeIds: formData.getAll("assignedEmployeeIds"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await assignEmployeesToBooking(bookingId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not update assigned employees." };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}
