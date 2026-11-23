import { z } from "zod";
import { ALL_JOB_REPORT_SOURCES } from "@/constants/statuses";
import { ALL_PAYMENT_METHODS } from "@/constants/payment-methods";

// Covers both "save as draft" and "create and submit" - draft saves are
// intentionally lenient (spec 7.2: a draft is work-in-progress, not an
// incomplete record), so the fields that are only required on submission
// (workSummary, billedAmount, paymentMethod-when-paid) are enforced in
// jobReportService.submitJobReport, not here.
export const jobReportSchema = z
  .object({
    source: z.enum(ALL_JOB_REPORT_SOURCES),
    bookingId: z.string().trim().optional().or(z.literal("")),
    customerName: z.string().trim().optional().or(z.literal("")),
    customerPhone: z.string().trim().optional().or(z.literal("")),
    customerEmail: z.string().trim().optional().or(z.literal("")),
    addressLine1: z.string().trim().optional().or(z.literal("")),
    addressCity: z.string().trim().optional().or(z.literal("")),
    serviceSnapshot: z.string().trim().min(2, "Service is required"),
    workDate: z.string().trim().min(1, "Work date is required"),
    workSummary: z.string().trim().optional().or(z.literal("")),
    internalNotes: z.string().trim().optional().or(z.literal("")),
    billedAmount: z.string().trim().optional().or(z.literal("")),
    amountReceived: z.string().trim().optional().or(z.literal("")),
    paymentMethod: z.enum(ALL_PAYMENT_METHODS).optional().or(z.literal("")),
    paymentReference: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.source === "BOOKING" && !data.bookingId) {
      ctx.addIssue({
        code: "custom",
        message: "Select a booking",
        path: ["bookingId"],
      });
    }
    if (data.source === "MANUAL") {
      if (data.bookingId) {
        ctx.addIssue({
          code: "custom",
          message: "A manual job report cannot be linked to a booking",
          path: ["bookingId"],
        });
      }
      if (!data.customerName) {
        ctx.addIssue({
          code: "custom",
          message: "Customer name is required for a manual job",
          path: ["customerName"],
        });
      }
    }
  });

export const voidJobReportSchema = z.object({
  voidReason: z.string().trim().min(3, "A reason is required to void a report"),
});
