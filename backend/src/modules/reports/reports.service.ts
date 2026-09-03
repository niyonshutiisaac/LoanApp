import dayjs from "dayjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { money } from "../../lib/money";
import type { z } from "zod";
import type { reportQuerySchema } from "./reports.schemas";

interface SalesAggRow {
  sales_total: string;
  sales_count: bigint;
  credit_total: string;
  cash_total: string;
}
interface SumRow {
  total: string | null;
}
interface CostRow {
  cost_of_goods: string;
}
interface DebtRow {
  customer_id: string;
  customer_name: string;
  balance: string;
  next_due_date: Date | null;
}

export const reportsService = {
  async get(shopId: string, filters: z.infer<typeof reportQuerySchema>) {
    const from = dayjs(filters.from).startOf("day").toDate();
    const to = dayjs(filters.to).endOf("day").toDate();

    const [salesAgg, purchasesTotal, expensesTotal, costRow, debts] = await Promise.all([
      prisma.$queryRaw<SalesAggRow[]>(Prisma.sql`
        SELECT
          COALESCE(SUM("totalAmount"), 0) AS sales_total,
          COUNT(*) AS sales_count,
          COALESCE(SUM(CASE WHEN "paymentType" != 'CASH' THEN "remainingAmount" ELSE 0 END), 0) AS credit_total,
          COALESCE(SUM("paidAmount"), 0) AS cash_total
        FROM sales WHERE "shopId" = ${shopId} AND "soldAt" BETWEEN ${from} AND ${to}
      `),
      prisma.$queryRaw<SumRow[]>(Prisma.sql`
        SELECT COALESCE(SUM("totalAmount"), 0)::text AS total FROM purchases
        WHERE "shopId" = ${shopId} AND "purchasedAt" BETWEEN ${from} AND ${to}
      `),
      prisma.$queryRaw<SumRow[]>(Prisma.sql`
        SELECT COALESCE(SUM(amount), 0)::text AS total FROM expenses
        WHERE "shopId" = ${shopId} AND "expenseDate" BETWEEN ${from} AND ${to}
      `),
      prisma.$queryRaw<CostRow[]>(Prisma.sql`
        SELECT COALESCE(SUM(si.quantity * COALESCE(p."buyingPrice", 0)), 0) AS cost_of_goods
        FROM sale_items si
        JOIN sales s ON s.id = si."saleId"
        LEFT JOIN products p ON p.id = si."productId"
        WHERE s."shopId" = ${shopId} AND s."soldAt" BETWEEN ${from} AND ${to}
      `),
      // Cost of goods is priced at each product's *current* buying price, same
      // simplification the mock makes — true historical costing is out of scope.
      prisma.$queryRaw<DebtRow[]>(Prisma.sql`
        SELECT c.id AS customer_id, c.name AS customer_name,
          COALESCE(SUM(CASE WHEN cle.direction = 'IN' THEN cle.amount ELSE -cle.amount END), 0) AS balance,
          MIN(due.next_due_date) AS next_due_date
        FROM customers c
        LEFT JOIN customer_ledger_entries cle ON cle."customerId" = c.id
        LEFT JOIN (
          SELECT "customerId" AS customer_id, "dueDate" AS next_due_date FROM sales
          WHERE "remainingAmount" > 0 AND "dueDate" IS NOT NULL
        ) due ON due.customer_id = c.id
        WHERE c."shopId" = ${shopId} AND c."isActive" = true
        GROUP BY c.id
        HAVING COALESCE(SUM(CASE WHEN cle.direction = 'IN' THEN cle.amount ELSE -cle.amount END), 0) > 0
        ORDER BY balance DESC
      `),
    ]);

    const sa = salesAgg[0];
    const salesTotal = Number(sa.sales_total);
    const costOfGoods = Number(costRow[0].cost_of_goods);
    const expensesTotalNum = Number(expensesTotal[0].total ?? 0);
    const today = dayjs().startOf("day");

    return {
      from: dayjs(filters.from).toISOString(),
      to: dayjs(filters.to).toISOString(),
      sales: money(salesTotal),
      salesCount: Number(sa.sales_count),
      creditSales: money(sa.credit_total),
      cashReceived: money(sa.cash_total),
      purchases: money(purchasesTotal[0].total ?? 0),
      expenses: money(expensesTotalNum),
      estimatedProfit: money(salesTotal - costOfGoods - expensesTotalNum),
      customerDebts: debts.map((d) => {
        const dueDate = d.next_due_date ? dayjs(d.next_due_date).startOf("day") : null;
        const isOverdue = !!dueDate && dueDate.isBefore(today);
        return {
          customerId: d.customer_id,
          customerName: d.customer_name,
          balance: money(d.balance),
          nextDueDate: d.next_due_date ? dayjs(d.next_due_date).format("YYYY-MM-DD") : null,
          daysOverdue: isOverdue ? today.diff(dueDate, "day") : null,
        };
      }),
    };
  },
};
