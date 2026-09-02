import dayjs from "dayjs";
import type { Paginated } from "@/types/api";

export function wait(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): Paginated<T> {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function searchBy<T>(
  items: T[],
  term: string | undefined,
  fields: (keyof T)[],
): T[] {
  if (!term?.trim()) return items;
  const q = term.trim().toLowerCase();
  return items.filter((item) =>
    fields.some((f) => String(item[f] ?? "").toLowerCase().includes(q)),
  );
}

export function sortByDate<T>(
  items: T[],
  field: keyof T,
  order: "asc" | "desc" = "desc",
): T[] {
  const dir = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = dayjs(String(a[field] ?? ""));
    const bv = dayjs(String(b[field] ?? ""));
    return (av.isValid() && bv.isValid() ? av.diff(bv) : 0) * dir;
  });
}

export function dayRange(date?: string): { from: string; to: string } {
  const base = date ? dayjs(date) : dayjs();
  return {
    from: base.startOf("day").toISOString(),
    to: base.endOf("day").toISOString(),
  };
}

export function isInRange(isoDate: string, from: string, to: string): boolean {
  const d = dayjs(isoDate);
  return d.isAfter(dayjs(from).subtract(1, "millisecond")) && d.isBefore(dayjs(to).add(1, "millisecond"));
}

export function normalizeAmount(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw { success: false, error: { code: "INVALID_AMOUNT", message: "Amount must be a positive number" } };
  }
  return Math.round(n * 100) / 100;
}

export function throwApiError(code: string, message: string, status = 400): never {
  throw { success: false, error: { code, message }, status };
}