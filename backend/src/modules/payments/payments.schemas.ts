import { z } from "zod";

const moneyField = z.union([z.string(), z.number()]);

export const paymentInputSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: moneyField,
  method: z.enum(["CASH", "MOBILE_MONEY", "BANK"]).optional(),
  paidAt: z.string().optional(),
  saleId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  customerId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
