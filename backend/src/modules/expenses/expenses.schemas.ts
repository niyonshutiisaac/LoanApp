import { z } from "zod";

export const expenseInputSchema = z.object({
  category: z.string().trim().min(1, "Category is required"),
  description: z.string().trim().nullable().optional(),
  amount: z.union([z.string(), z.number()]),
  expenseDate: z.string().optional(),
});

export const expenseListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
