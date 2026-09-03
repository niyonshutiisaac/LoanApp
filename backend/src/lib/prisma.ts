import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * One PrismaClient per process, reused across hot reloads in dev, so we never
 * open more DB connections than Neon's pooled connection string allows.
 */
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProduction ? ["error", "warn"] : ["error", "warn"],
  });

if (!isProduction) global.__prisma = prisma;
