import { z } from "zod";
import { ALL_INQUIRY_STATUSES } from "@/constants/statuses";

export const createInquirySchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required"),
  customerPhone: z.string().trim().min(5, "Phone number is required"),
  addressLine1: z.string().trim().min(3, "Service address is required"),
  addressCity: z.string().trim().optional().or(z.literal("")),
  callSummary: z.string().trim().min(5, "Describe the customer's issue"),
});

export const updateInquiryStatusSchema = z.object({
  status: z.enum(ALL_INQUIRY_STATUSES),
});

export const closeInquirySchema = z.object({
  closeReason: z.string().trim().min(3, "A reason is required to close an inquiry"),
});
