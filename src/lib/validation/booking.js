import { z } from "zod";
import { ALL_BOOKING_STATUSES } from "@/constants/statuses";

export const createBookingSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required"),
  customerPhone: z.string().trim().min(5, "Phone number is required"),
  addressLine1: z.string().trim().min(3, "Service address is required"),
  addressCity: z.string().trim().optional().or(z.literal("")),
  serviceName: z.string().trim().min(2, "Service type is required"),
  serviceDescription: z.string().trim().optional().or(z.literal("")),
  scheduledDate: z.string().trim().min(1, "Date is required"),
  scheduledTime: z.string().trim().min(1, "Time is required"),
  expectedDurationMinutes: z.coerce.number().int().min(15).max(600).optional(),
  assignedEmployeeIds: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((value) => {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    }),
  internalNotes: z.string().trim().optional().or(z.literal("")),
});

export const convertInquiryToBookingSchema = createBookingSchema.omit({
  customerName: true,
  customerPhone: true,
  addressLine1: true,
  addressCity: true,
});

export const rescheduleBookingSchema = z.object({
  scheduledDate: z.string().trim().min(1, "Date is required"),
  scheduledTime: z.string().trim().min(1, "Time is required"),
});

export const cancelBookingSchema = z.object({
  cancelReason: z.string().trim().min(3, "A reason is required to cancel a booking"),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(ALL_BOOKING_STATUSES),
});

export const assignEmployeesSchema = z.object({
  assignedEmployeeIds: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((value) => {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    }),
});
