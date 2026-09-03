import { z } from "zod";

export const shopUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  currency: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  allowNegativeInventory: z.boolean().optional(),
});
