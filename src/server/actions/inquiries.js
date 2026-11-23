"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createInquirySchema, closeInquirySchema } from "@/lib/validation/inquiry";
import {
  createInquiry,
  closeInquiry,
  getInquiryForActor,
} from "@/server/services/inquiryService";

export async function createInquiryAction(_prevState, formData) {
  const actor = await requireUser();

  const validatedFields = createInquirySchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    addressLine1: formData.get("addressLine1"),
    addressCity: formData.get("addressCity"),
    callSummary: formData.get("callSummary"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  let inquiry;
  try {
    inquiry = await createInquiry(validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not create inquiry." };
  }

  revalidatePath("/inquiries");
  redirect(`/inquiries/${inquiry._id.toString()}`);
}

export async function closeInquiryAction(inquiryId, _prevState, formData) {
  const actor = await requireUser();

  // Re-check ownership before mutating, even though the service does too -
  // fail fast with a clear error rather than relying on a single layer.
  const inquiry = await getInquiryForActor(inquiryId, actor);
  if (!inquiry) {
    return { error: "Inquiry not found or you do not have access to it." };
  }

  const validatedFields = closeInquirySchema.safeParse({
    closeReason: formData.get("closeReason"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await closeInquiry(inquiryId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not close inquiry." };
  }

  revalidatePath("/inquiries");
  revalidatePath(`/inquiries/${inquiryId}`);
  return { success: true };
}
