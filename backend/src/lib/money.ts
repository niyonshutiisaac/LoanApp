import { Prisma } from "@prisma/client";
import { ApiError } from "./errors";

export type MoneyInput = string | number | Prisma.Decimal;

/** Normalizes any money-ish input to a plain JS number for arithmetic. */
export function toNumber(value: MoneyInput): number {
  const n = typeof value === "object" ? Number(value.toString()) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Formats a number/Decimal as the fixed 2-decimal string the mobile app expects. */
export function money(value: MoneyInput): string {
  return toNumber(value).toFixed(2);
}

export function toDecimal(value: MoneyInput): Prisma.Decimal {
  return new Prisma.Decimal(money(value));
}

/** Validates a user-supplied amount and rounds it to cents, same rule the mock enforces. */
export function normalizeAmount(value: MoneyInput): number {
  const n = toNumber(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new ApiError("VALIDATION_ERROR", "Amount must be a positive number", 422);
  }
  return Math.round(n * 100) / 100;
}
