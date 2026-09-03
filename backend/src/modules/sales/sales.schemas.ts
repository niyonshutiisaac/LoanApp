import { z } from "zod";

const moneyField = z.union([z.string(), z.number()]);

export const saleItemInputSchema = z.object({
  productId: z.string().nullable().optional(),
  productName: z.string().trim().optional(),
  quantity: z.number(),
  unitPrice: moneyField,
});

export const saleInputSchema = z.object({
  customerId: z.string().nullable().optional(),
  paymentType: z.enum(["CASH", "CREDIT", "PARTIAL"]),
  paidAmount: moneyField.optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(saleItemInputSchema).min(1, "Add at least one item to the sale"),
});

export const saleListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  type: z.enum(["cash", "credit"]).optional(),
});
