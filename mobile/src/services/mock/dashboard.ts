import dayjs from "dayjs";
import type { DashboardSummary, ReportData, ReportFilters } from "@/types/api";
import { money, type MockDb } from "./db";
import { withBalance } from "./customers";
import { isInRange, wait } from "./utils";

function dayRange(date?: string): { from: string; to: string } {
  const base = date ? dayjs(date) : dayjs();
  return { from: base.startOf("day").toISOString(), to: base.endOf("day").toISOString() };
}

export const mockDashboard = {
  async get(db: MockDb): Promise<DashboardSummary> {
    await wait(400);
    const { from, to } = dayRange();

    const salesToday = db.sales.filter((s) => isInRange(s.soldAt, from, to));
    const purchasesToday = db.purchases.filter((p) => isInRange(p.purchasedAt, from, to));
    const expensesToday = db.expenses.filter((e) => isInRange(e.expenseDate, from, to));
    const paymentsToday = db.payments.filter((p) => isInRange(p.paidAt, from, to));

    const cashFromSales = salesToday
      .filter((s) => s.paymentType === "CASH")
      .reduce((sum, s) => sum + Number(s.paidAmount), 0);
    const partialToday = salesToday
      .filter((s) => s.paymentType === "PARTIAL")
      .reduce((sum, s) => sum + Number(s.paidAmount), 0);
    const creditToday = salesToday
      .filter((s) => s.paymentType !== "CASH")
      .reduce((sum, s) => sum + Number(s.remainingAmount), 0);
    const customerPayments = paymentsToday.reduce((sum, p) => sum + Number(p.amount), 0);

    const cashReceived = cashFromSales + partialToday + customerPayments;

    const customers = db.customers.filter((c) => c.isActive).map((c) => withBalance(db, { ...c }));
    const owing = customers.filter((c) => Number(c.balance) > 0);
    const overdue = owing.filter((c) => {
      if (!c.nextDueDate) return false;
      return dayjs(c.nextDueDate).startOf("day").isBefore(dayjs().startOf("day"));
    });
    const dueSoonCustomers = owing
      .filter((c) => c.nextDueDate)
      .sort((a, b) => (a.nextDueDate! < b.nextDueDate! ? -1 : 1))
      .slice(0, 6)
      .map((c) => ({ id: c.id, name: c.name, balance: c.balance, nextDueDate: c.nextDueDate }));

    const shop = db.shops[0]!;
    const exchange = shop.currency;

    const today: DashboardSummary["today"] = {
      sales: money(salesToday.reduce((sum, s) => sum + Number(s.totalAmount), 0)),
      cashReceived: money(cashReceived),
      creditSales: money(creditToday),
      purchased: money(purchasesToday.reduce((sum, p) => sum + Number(p.totalAmount), 0)),
      expenses: money(expensesToday.reduce((sum, e) => sum + Number(e.amount), 0)),
      saleCount: salesToday.length,
    };
    void exchange;

    const stockValue = db.products
      .filter((p) => p.isActive)
      .reduce((sum, p) => sum + p.stockQuantity * Number(p.buyingPrice), 0);

    const activity = [...db.activity]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 12);

    return {
      shop,
      today,
      totals: {
        customersOwing: money(owing.reduce((sum, c) => sum + Number(c.balance), 0)),
        customerCount: customers.length,
        overdueCustomers: overdue.length,
        productsInStock: db.products.filter((p) => p.isActive).length,
        lowStockProducts: db.products.filter((p) => p.isActive && p.stockQuantity <= p.lowStockThreshold).length,
        stockValue: money(stockValue),
      },
      activity,
      dueSoonCustomers,
    };
  },
};

export const mockReports = {
  async get(db: MockDb, filters: ReportFilters): Promise<ReportData> {
    await wait(400);
    const from = dayjs(filters.from).startOf("day").toISOString();
    const to = dayjs(filters.to).endOf("day").toISOString();

    const sales = db.sales.filter((s) => isInRange(s.soldAt, from, to));
    const purchases = db.purchases.filter((p) => isInRange(p.purchasedAt, from, to));
    const expenses = db.expenses.filter((e) => isInRange(e.expenseDate, from, to));

    const salesTotal = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const creditTotal = sales.filter((s) => s.paymentType !== "CASH").reduce((sum, s) => sum + Number(s.remainingAmount), 0);
    const cashTotal = sales.reduce((sum, s) => sum + Number(s.paidAmount), 0);
    const purchasesTotal = purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const costOfGoods = sales.reduce((sum, s) => {
      return (
        sum +
        s.items.reduce((itemSum, item) => {
          if (!item.productId) return itemSum + 0;
          const product = db.products.find((p) => p.id === item.productId);
          return itemSum + (product ? Number(product.buyingPrice) * item.quantity : 0);
        }, 0)
      );
    }, 0);

    const estimatedProfit = salesTotal - costOfGoods - expensesTotal;

    const customers = db.customers.filter((c) => c.isActive && Number(withBalance(db, { ...c }).balance) > 0);
    const customerDebts = customers
      .map((c) => ({
        customerId: c.id,
        customerName: c.name,
        balance: c.balance,
        nextDueDate: c.nextDueDate,
        daysOverdue:
          c.nextDueDate && dayjs(c.nextDueDate).startOf("day").isBefore(dayjs().startOf("day"))
            ? dayjs().startOf("day").diff(dayjs(c.nextDueDate).startOf("day"), "day")
            : null,
      }))
      .sort((a, b) => Number(b.balance) - Number(a.balance));

    return {
      from: dayjs(filters.from).toISOString(),
      to: dayjs(filters.to).toISOString(),
      sales: money(salesTotal),
      salesCount: sales.length,
      creditSales: money(creditTotal),
      cashReceived: money(cashTotal),
      purchases: money(purchasesTotal),
      expenses: money(expensesTotal),
      estimatedProfit: money(estimatedProfit),
      customerDebts,
    };
  },
};