import dayjs from "dayjs";
import type { Paginated, Payment, PaymentInput } from "@/types/api";
import { money, nextId, type MockDb } from "./db";
import { withBalance } from "./customers";
import { isInRange, normalizeAmount, paginate, sortByDate, throwApiError, wait } from "./utils";

export interface ListQuery {
  page?: number;
  limit?: number;
  customerId?: string;
  from?: string;
  to?: string;
}

export const mockPayments = {
  async list(db: MockDb, query: ListQuery = {}): Promise<Paginated<Payment>> {
    await wait(300);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    let items = sortByDate(db.payments, "paidAt", "desc");
    if (query.customerId) items = items.filter((p) => p.customerId === query.customerId);
    if (query.from && query.to) items = items.filter((p) => isInRange(p.paidAt, query.from!, query.to!));
    return paginate(items, page, limit);
  },

  async create(db: MockDb, input: PaymentInput): Promise<Payment> {
    await wait(450);
    const customer = db.customers.find((c) => c.id === input.customerId && c.isActive);
    if (!customer) throwApiError("CUSTOMER_NOT_FOUND", "Customer was not found", 404);

    const amount = normalizeAmount(input.amount);
    if (amount <= 0) throwApiError("VALIDATION_ERROR", "Payment amount must be greater than zero");

    const balanceBefore = Number(withBalance(db, { ...customer }).balance);
    if (amount > balanceBefore) {
      throwApiError("PAYMENT_EXCEEDS_BALANCE", `Payment exceeds the outstanding balance of ${money(balanceBefore)}`);
    }

    const sale = db.sales.find((s) => s.id === input.saleId);

    const payment: Payment = {
      id: nextId(db, "pay"),
      shopId: db.shops[0]!.id,
      customerId: customer.id,
      customerName: customer.name,
      saleId: input.saleId ?? null,
      amount: money(amount),
      method: input.method ?? "CASH",
      paidAt: input.paidAt ? new Date(input.paidAt).toISOString() : new Date().toISOString(),
      notes: input.notes?.trim() || null,
      balanceAfter: money(balanceBefore - amount),
      createdAt: new Date().toISOString(),
    };
    db.payments.push(payment);

    db.ledgers[customer.id] = db.ledgers[customer.id] ?? [];
    db.ledgers[customer.id].push({
      id: nextId(db, "led"),
      type: "CUSTOMER_PAYMENT",
      description: `Paid ${payment.method === "MOBILE_MONEY" ? "via mobile money" : "in cash"}`,
      amount: money(amount),
      direction: "OUT",
      createdAt: payment.paidAt,
    });

    withBalance(db, customer);

    if (sale && Number(sale.remainingAmount) > 0) {
      const newRemaining = Math.max(0, Number(sale.remainingAmount) - amount);
      sale.remainingAmount = money(newRemaining);
      sale.paidAmount = money(Number(sale.paidAmount) + amount);
    }

    db.activity.unshift({
      id: `act_${payment.id}`,
      type: "PAYMENT",
      title: `${customer.name} paid you`,
      subtitle: payment.method === "MOBILE_MONEY" ? "Mobile money" : "Cash",
      amount: payment.amount,
      direction: "IN",
      createdAt: payment.paidAt,
    });

    const due = db.sales
      .filter((s) => s.customerId === customer.id && Number(s.remainingAmount) > 0 && s.dueDate)
      .map((s) => s.dueDate!)
      .sort();
    customer.nextDueDate = due[0] ?? null;

    return payment;
  },
};

export { dayjs };