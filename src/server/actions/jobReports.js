"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, requireAdmin } from "@/lib/auth/dal";
import { jobReportSchema, voidJobReportSchema } from "@/lib/validation/jobReport";
import {
  createDraft,
  updateOwnDraft,
  deleteOwnDraft,
  createAndSubmitJobReport,
  submitJobReport,
  voidJobReport,
} from "@/server/services/jobReportService";

// formData.get() returns null for a field with no matching input in the
// DOM (e.g. bookingId when source=MANUAL, or customerName when
// source=BOOKING, since the form only renders one group at a time). The
// schema's optional/"" fields don't accept null, so every omitted field
// must be normalized to undefined before validation.
function readJobReportFields(formData) {
  return {
    source: formData.get("source") ?? undefined,
    bookingId: formData.get("bookingId") ?? undefined,
    customerName: formData.get("customerName") ?? undefined,
    customerPhone: formData.get("customerPhone") ?? undefined,
    customerEmail: formData.get("customerEmail") ?? undefined,
    addressLine1: formData.get("addressLine1") ?? undefined,
    addressCity: formData.get("addressCity") ?? undefined,
    serviceSnapshot: formData.get("serviceSnapshot") ?? undefined,
    workDate: formData.get("workDate") ?? undefined,
    workSummary: formData.get("workSummary") ?? undefined,
    internalNotes: formData.get("internalNotes") ?? undefined,
    billedAmount: formData.get("billedAmount") ?? undefined,
    amountReceived: formData.get("amountReceived") ?? undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    paymentReference: formData.get("paymentReference") ?? undefined,
  };
}

// Single entry point for the "Add Job Entry" form - the clicked button sets
// intent=draft or intent=submit, so one form and one action cover both
// Workflow E/F paths without duplicating field handling.
export async function saveOrSubmitJobReportAction(_prevState, formData) {
  const actor = await requireUser();
  const intent = formData.get("intent");
  const submittedFields = readJobReportFields(formData);

  const validatedFields = jobReportSchema.safeParse(submittedFields);
  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message ?? "Invalid input.",
      fields: submittedFields,
    };
  }

  let report;
  try {
    report =
      intent === "submit"
        ? await createAndSubmitJobReport(validatedFields.data, actor)
        : await createDraft(validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not save job report.", fields: submittedFields };
  }

  revalidatePath("/daily-reports");
  redirect(`/daily-reports/${report._id.toString()}`);
}

export async function updateJobReportDraftAction(jobReportId, _prevState, formData) {
  const actor = await requireUser();
  const submittedFields = readJobReportFields(formData);

  const validatedFields = jobReportSchema.safeParse(submittedFields);
  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message ?? "Invalid input.",
      fields: submittedFields,
    };
  }

  try {
    await updateOwnDraft(jobReportId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not update job report.", fields: submittedFields };
  }

  revalidatePath("/daily-reports");
  revalidatePath(`/daily-reports/${jobReportId}`);
  return { success: true };
}

export async function deleteJobReportDraftAction(jobReportId) {
  const actor = await requireUser();

  await deleteOwnDraft(jobReportId, actor);

  revalidatePath("/daily-reports");
  redirect("/daily-reports");
}

export async function submitExistingJobReportAction(jobReportId, _prevState, _formData) {
  const actor = await requireUser();

  try {
    const report = await submitJobReport(jobReportId, {}, actor);
    revalidatePath("/daily-reports");
    revalidatePath(`/daily-reports/${jobReportId}`);
    return { success: true, reportId: report._id.toString() };
  } catch (error) {
    return { error: error.message || "Could not submit job report." };
  }
}

export async function voidJobReportAction(jobReportId, _prevState, formData) {
  const actor = await requireAdmin();

  const validatedFields = voidJobReportSchema.safeParse({
    voidReason: formData.get("voidReason"),
  });
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await voidJobReport(jobReportId, validatedFields.data, actor);
  } catch (error) {
    return { error: error.message || "Could not void job report." };
  }

  revalidatePath("/daily-reports");
  revalidatePath(`/daily-reports/${jobReportId}`);
  return { success: true };
}
