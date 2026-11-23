"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import {
  addPaymentSchema,
  addAdjustmentSchema,
  recordRefundSchema,
  reverseTransactionSchema,
} from "@/lib/validation/ledger";
import {
  addPayment,
  addAdjustment,
  recordRefund,
  reverseTransaction,
} from "@/server/services/ledgerService";

function revalidateJobReport(jobReportId) {
  revalidatePath(`/daily-reports/${jobReportId}`);
  revalidatePath("/ledger");
}

export async function addPaymentAction(jobReportId, _prevState, formData) {
  const actor = await requireAdmin();

  const submittedFields = {
    amount: formData.get("amount") ?? undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    reference: formData.get("reference") ?? undefined,
    note: formData.get("note") ?? undefined,
  };

  const validatedFields = addPaymentSchema.safeParse(submittedFields);
  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message ?? "Invalid input.",
      fields: submittedFields,
    };
  }

  try {
    await addPayment(jobReportId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not add payment.", fields: submittedFields };
  }

  revalidateJobReport(jobReportId);
  return { success: true };
}

export async function addAdjustmentAction(jobReportId, _prevState, formData) {
  const actor = await requireAdmin();

  const validatedFields = addAdjustmentSchema.safeParse({
    newBilledAmount: formData.get("newBilledAmount"),
    reason: formData.get("reason"),
  });
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await addAdjustment(jobReportId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not post adjustment." };
  }

  revalidateJobReport(jobReportId);
  return { success: true };
}

export async function recordRefundAction(jobReportId, _prevState, formData) {
  const actor = await requireAdmin();

  const validatedFields = recordRefundSchema.safeParse({
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    reference: formData.get("reference"),
  });
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await recordRefund(jobReportId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not record refund." };
  }

  revalidateJobReport(jobReportId);
  return { success: true };
}

export async function reverseTransactionAction(transactionId, jobReportId, _prevState, formData) {
  const actor = await requireAdmin();

  const validatedFields = reverseTransactionSchema.safeParse({
    reason: formData.get("reason"),
  });
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await reverseTransaction(transactionId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not reverse transaction." };
  }

  revalidateJobReport(jobReportId);
  return { success: true };
}
