import type { Expense, ExpenseInput, Paginated } from "@/types/api";
import { money, nextId, type MockDb } from "./db";
import { isInRange, normalizeAmount, paginate, sortByDate, throwApiError, wait } from "./utils";

export interface ListQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export const mockExpenses = {
  async list(db: MockDb, query: ListQuery = {}): Promise<Paginated<Expense>> {
    await wait(300);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    let items = sortByDate(db.expenses, "expenseDate", "desc");
    if (query.from && query.to) {
      items = items.filter((e) => isInRange(e.expenseDate, query.from!, query.to!));
    }
    return paginate(items, page, limit);
  },

  async create(db: MockDb, input: ExpenseInput): Promise<Expense> {
    await wait(350);
    if (!input.category?.trim()) throwApiError("VALIDATION_ERROR", "Category is required");
    if (normalizeAmount(input.amount) <= 0) throwApiError("VALIDATION_ERROR", "Amount must be greater than zero");
    const expense: Expense = {
      id: nextId(db, "exp"),
      shopId: db.shops[0]!.id,
      category: input.category.trim(),
      description: input.description?.trim() || null,
      amount: money(input.amount),
      expenseDate: input.expenseDate ? new Date(input.expenseDate).toISOString() : new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.expenses.push(expense);
    db.activity.unshift({
      id: `act_${expense.id}`,
      type: "EXPENSE",
      title: expense.category,
      subtitle: expense.description ?? "Expense",
      amount: expense.amount,
      direction: "OUT",
      createdAt: expense.expenseDate,
    });
    return expense;
  },
};