import { z } from "zod";

const moneyField = z.union([z.string(), z.number()]);

export const purchaseItemInputSchema = z.object({
  productId: z.string().nullable().optional(),
  productName: z.string().trim().optional(),
  quantity: z.number(),
  unitCost: moneyField,
});

export const purchaseInputSchema = z.object({
  paymentAmount: moneyField.optional(),
  purchasedAt: z.string().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(purchaseItemInputSchema).min(1, "Add at least one item to the purchase"),
});

export const purchaseListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
