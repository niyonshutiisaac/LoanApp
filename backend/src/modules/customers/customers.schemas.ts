import { z } from "zod";

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const customerUpdateSchema = customerInputSchema.partial();

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  sort: z.enum(["balance", "createdAt"]).optional(),
  status: z.enum(["active", "owed", "overdue"]).optional(),
});
