import { z } from "zod";

export const reportQuerySchema = z.object({
  from: z.string().min(1, "from date is required"),
  to: z.string().min(1, "to date is required"),
});
