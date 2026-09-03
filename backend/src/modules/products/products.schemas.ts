import { z } from "zod";

const moneyField = z.union([z.string(), z.number()]);

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  sku: z.string().trim().nullable().optional(),
  unit: z.string().trim().nullable().optional(),
  buyingPrice: moneyField,
  sellingPrice: moneyField,
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export const productUpdateSchema = productInputSchema.partial();

export const stockAdjustSchema = z.object({
  quantity: z.number().int(),
});

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  lowStock: z.coerce.boolean().optional(),
});
