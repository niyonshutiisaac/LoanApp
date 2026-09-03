import type { Expense } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { money, normalizeAmount } from "../../lib/money";
import { ApiError } from "../../lib/errors";
import { parsePageParams, toPaginated, type Paginated } from "../../lib/pagination";
import type { z } from "zod";
import type { expenseInputSchema, expenseListQuerySchema } from "./expenses.schemas";

function serialize(e: Expense) {
  return {
    id: e.id,
    shopId: e.shopId,
    category: e.category,
    description: e.description,
    amount: money(e.amount),
    expenseDate: e.expenseDate.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

export const expensesService = {
  async list(shopId: string, query: z.infer<typeof expenseListQuerySchema>): Promise<Paginated<ReturnType<typeof serialize>>> {
    const { page, limit, skip } = parsePageParams(query);
    const [items, total] = await Promise.all([
      prisma.expense.findMany({ where: { shopId }, orderBy: { expenseDate: "desc" }, skip, take: limit }),
      prisma.expense.count({ where: { shopId } }),
    ]);
    return toPaginated(items.map(serialize), total, page, limit);
  },

  async create(shopId: string, input: z.infer<typeof expenseInputSchema>) {
    const amount = normalizeAmount(input.amount);
    if (amount <= 0) throw new ApiError("VALIDATION_ERROR", "Expense amount must be greater than zero", 422);
    const expense = await prisma.expense.create({
      data: {
        shopId,
        category: input.category.trim(),
        description: input.description?.trim() || null,
        amount: money(amount),
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
      },
    });
    return serialize(expense);
  },
};
