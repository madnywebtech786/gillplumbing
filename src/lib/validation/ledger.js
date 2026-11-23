import { z } from "zod";
import { ALL_PAYMENT_METHODS } from "@/constants/payment-methods";

export const addPaymentSchema = z.object({
  amount: z.string().trim().min(1, "Amount is required"),
  paymentMethod: z.enum(ALL_PAYMENT_METHODS, "A payment method is required"),
  reference: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
});

export const addAdjustmentSchema = z.object({
  newBilledAmount: z.string().trim().min(1, "New billed amount is required"),
  reason: z.string().trim().min(3, "A reason is required for an adjustment"),
});

export const recordRefundSchema = z.object({
  amount: z.string().trim().min(1, "Amount is required"),
  reason: z.string().trim().min(3, "A reason is required for a refund"),
  reference: z.string().trim().optional().or(z.literal("")),
});

export const reverseTransactionSchema = z.object({
  reason: z.string().trim().min(3, "A reason is required to reverse a transaction"),
});
