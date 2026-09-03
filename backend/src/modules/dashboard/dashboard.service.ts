import dayjs from "dayjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { money } from "../../lib/money";
import { customersService } from "../customers/customers.service";
import { shopService } from "../shop/shop.service";

interface SalesAggRow {
  sales_total: string;
  cash_from_sales: string;
  partial_today: string;
  credit_today: string;
  sale_count: bigint;
}
interface SumRow {
  total: string | null;
}
interface CustomerAggRow {
  customer_count: bigint;
  customers_owing: string;
  overdue_customers: bigint;
}
interface ProductAggRow {
  products_in_stock: bigint;
  low_stock_products: bigint;
  stock_value: string;
}

async function recentActivity(shopId: string) {
  const [sales, purchases, payments, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId },
      include: { items: true, customer: { select: { name: true } } },
      orderBy: { soldAt: "desc" },
      take: 12,
    }),
    prisma.purchase.findMany({ where: { shopId }, include: { items: true }, orderBy: { purchasedAt: "desc" }, take: 12 }),
    prisma.payment.findMany({ where: { shopId }, include: { customer: { select: { name: true } } }, orderBy: { paidAt: "desc" }, take: 12 }),
    prisma.expense.findMany({ where: { shopId }, orderBy: { expenseDate: "desc" }, take: 12 }),
  ]);

  const items = [
    ...sales.map((s) => ({
      id: `act_${s.id}`,
      type: "SALE" as const,
      title: s.customer ? `${s.customer.name} bought on credit` : "Cash sale",
      subtitle: `${s.items.length} item${s.items.length > 1 ? "s" : ""}`,
      amount: money(s.totalAmount),
      direction: "IN" as const,
      createdAt: s.soldAt,
    })),
    ...purchases.map((p) => ({
      id: `act_${p.id}`,
      type: "PURCHASE" as const,
      title: "Bought goods",
      subtitle: p.items.map((i) => i.productName).join(", "),
      amount: money(p.totalAmount),
      direction: "OUT" as const,
      createdAt: p.purchasedAt,
    })),
    ...payments.map((p) => ({
      id: `act_${p.id}`,
      type: "PAYMENT" as const,
      title: `${p.customer.name} paid you`,
      subtitle: p.method === "MOBILE_MONEY" ? "Mobile money" : "Cash",
      amount: money(p.amount),
      direction: "IN" as const,
      createdAt: p.paidAt,
    })),
    ...expenses.map((e) => ({
      id: `act_${e.id}`,
      type: "EXPENSE" as const,
      title: e.category,
      subtitle: e.description ?? "Expense",
      amount: money(e.amount),
      direction: "OUT" as const,
      createdAt: e.expenseDate,
    })),
  ];

  return items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 12)
    .map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }));
}

export const dashboardService = {
  async get(shopId: string) {
    // "Today" is a UTC day boundary rather than the shop's IANA timezone — a
    // known v1 simplification (see backend/README.md) to avoid a timezone
    // dependency for a single day-boundary calculation.
    const from = dayjs().startOf("day").toDate();
    const to = dayjs().endOf("day").toDate();

    const [shop, salesAgg, purchasesTotal, expensesTotal, paymentsTotal, customerAgg, productAgg, activity, dueSoonCustomers] =
      await Promise.all([
        shopService.get(shopId),
        prisma.$queryRaw<SalesAggRow[]>(Prisma.sql`
          SELECT
            COALESCE(SUM("totalAmount"), 0) AS sales_total,
            COALESCE(SUM(CASE WHEN "paymentType" = 'CASH' THEN "paidAmount" ELSE 0 END), 0) AS cash_from_sales,
            COALESCE(SUM(CASE WHEN "paymentType" = 'PARTIAL' THEN "paidAmount" ELSE 0 END), 0) AS partial_today,
            COALESCE(SUM(CASE WHEN "paymentType" != 'CASH' THEN "remainingAmount" ELSE 0 END), 0) AS credit_today,
            COUNT(*) AS sale_count
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
        prisma.$queryRaw<SumRow[]>(Prisma.sql`
          SELECT COALESCE(SUM(amount), 0)::text AS total FROM payments
          WHERE "shopId" = ${shopId} AND "paidAt" BETWEEN ${from} AND ${to}
        `),
        prisma.$queryRaw<CustomerAggRow[]>(Prisma.sql`
          WITH balances AS (
            SELECT c.id,
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
          )
          SELECT
            COUNT(*) AS customer_count,
            COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) AS customers_owing,
            COUNT(*) FILTER (WHERE balance > 0 AND next_due_date IS NOT NULL AND next_due_date < CURRENT_DATE) AS overdue_customers
          FROM balances
        `),
        prisma.$queryRaw<ProductAggRow[]>(Prisma.sql`
          SELECT
            COUNT(*) AS products_in_stock,
            COUNT(*) FILTER (WHERE "stockQuantity" <= "lowStockThreshold") AS low_stock_products,
            COALESCE(SUM("stockQuantity" * "buyingPrice"), 0) AS stock_value
          FROM products WHERE "shopId" = ${shopId} AND "isActive" = true
        `),
        recentActivity(shopId),
        customersService.dueSoon(shopId),
      ]);

    const sa = salesAgg[0];
    const cashReceived = Number(sa.cash_from_sales) + Number(sa.partial_today) + Number(paymentsTotal[0].total ?? 0);

    return {
      shop,
      today: {
        sales: money(sa.sales_total),
        cashReceived: money(cashReceived),
        creditSales: money(sa.credit_today),
        purchased: money(purchasesTotal[0].total ?? 0),
        expenses: money(expensesTotal[0].total ?? 0),
        saleCount: Number(sa.sale_count),
      },
      totals: {
        customersOwing: money(customerAgg[0].customers_owing),
        customerCount: Number(customerAgg[0].customer_count),
        overdueCustomers: Number(customerAgg[0].overdue_customers),
        productsInStock: Number(productAgg[0].products_in_stock),
        lowStockProducts: Number(productAgg[0].low_stock_products),
        stockValue: money(productAgg[0].stock_value),
      },
      activity,
      dueSoonCustomers,
    };
  },
};
