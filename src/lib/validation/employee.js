import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z.string().trim().optional().or(z.literal("")),
});
