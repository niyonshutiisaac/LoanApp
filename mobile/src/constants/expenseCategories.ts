import type { TranslationKey } from "@/i18n";

export interface ExpenseCategory {
  key: TranslationKey;
  value: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { key: "exf.cat.transport", value: "Transport" },
  { key: "exf.cat.electricity", value: "Electricity" },
  { key: "exf.cat.water", value: "Water" },
  { key: "exf.cat.rent", value: "Rent" },
  { key: "exf.cat.staff", value: "Staff" },
  { key: "exf.cat.taxes", value: "Taxes" },
  { key: "exf.cat.repairs", value: "Repairs" },
  { key: "exf.cat.other", value: "Other" },
];

const byValue = new Map(EXPENSE_CATEGORIES.map((c) => [c.value, c.key]));

export function expenseCategoryKey(value: string): TranslationKey {
  return byValue.get(value) ?? "exf.cat.other";
}