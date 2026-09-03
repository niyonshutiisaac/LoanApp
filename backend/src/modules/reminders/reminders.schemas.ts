import { z } from "zod";

export const reminderInputSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  channel: z.enum(["SMS", "PUSH", "EMAIL"]).optional(),
  scheduledFor: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
});

export const reminderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.enum(["PENDING", "SENT", "FAILED", "CANCELLED"]).optional(),
});
