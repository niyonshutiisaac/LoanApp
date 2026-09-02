import dayjs from "dayjs";
import type { Paginated, Reminder, Sale, SaleInput } from "@/types/api";
import { money, nextId, type MockDb } from "./db";
import { withBalance, type ListQuery as CustomerListQuery } from "./customers";
import { normalizeAmount, paginate, sortByDate, throwApiError, wait } from "./utils";

export type SaleListQuery = CustomerListQuery & { type?: "cash" | "credit" };

export const mockSales = {
  async list(db: MockDb, query: SaleListQuery = {}): Promise<Paginated<Sale>> {
    await wait(300);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    let items = sortByDate(db.sales, "soldAt", "desc");
    if (query.type === "cash") items = items.filter((s) => s.paymentType === "CASH");
    if (query.type === "credit") items = items.filter((s) => s.paymentType !== "CASH");
    if (query.search) {
      items = items.filter((s) =>
        s.items.some((i) => i.productName.toLowerCase().includes(query.search!.toLowerCase())) ||
        (s.customerName ?? "").toLowerCase().includes(query.search!.toLowerCase()),
      );
    }
    return paginate(items, page, limit);
  },

  async get(db: MockDb, id: string): Promise<Sale> {
    await wait(200);
    const sale = db.sales.find((s) => s.id === id);
    if (!sale) throwApiError("SALE_NOT_FOUND", "Sale was not found", 404);
    return sale;
  },

  async create(db: MockDb, input: SaleInput): Promise<Sale> {
    await wait(500);
    if (!input.items || input.items.length === 0) {
      throwApiError("VALIDATION_ERROR", "Add at least one item to the sale");
    }

    for (const item of input.items) {
      if (!item.productName?.trim() && !item.productId) {
        throwApiError("VALIDATION_ERROR", "Every item needs a product name");
      }
      if (!(item.quantity > 0)) throwApiError("VALIDATION_ERROR", "Quantity must be greater than zero");
      if (normalizeAmount(item.unitPrice) <= 0) {
        throwApiError("VALIDATION_ERROR", "Price must be greater than zero");
      }
    }

    const paymentType = input.paymentType ?? "CASH";
    let paidAmount = normalizeAmount(input.paidAmount ?? 0);
    const total = input.items.reduce(
      (sum, item) => sum + item.quantity * normalizeAmount(item.unitPrice),
      0,
    );
    if (total <= 0) throwApiError("VALIDATION_ERROR", "Sale total must be greater than zero");

    const isCredit = paymentType !== "CASH";
    const customer = input.customerId
      ? db.customers.find((c) => c.id === input.customerId && c.isActive)
      : undefined;
    if (isCredit && !customer) {
      throwApiError("VALIDATION_ERROR", "A credit sale requires a customer", 422);
    }
    if (paymentType === "CASH") paidAmount = total;
    if (paymentType === "PARTIAL") {
      if (paidAmount <= 0 || paidAmount >= total) {
        throwApiError("VALIDATION_ERROR", "Partial payment must be between zero and the total");
      }
    }
    if (paymentType === "CREDIT") paidAmount = 0;
    const remaining = total - paidAmount;

    if (remaining > 0 && !input.customerId && paymentType === "PARTIAL") {
      throwApiError("VALIDATION_ERROR", "A partial sale requires a customer", 422);
    }
    if ((isCredit || remaining > 0) && !input.dueDate) {
      throwApiError("VALIDATION_ERROR", "A due date is required for unpaid credit");
    }

    const shop = db.shops[0]!;
    const sale: Sale = {
      id: nextId(db, "sal"),
      shopId: shop.id,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      paymentType,
      totalAmount: money(total),
      paidAmount: money(paidAmount),
      remainingAmount: money(remaining),
      dueDate: input.dueDate ? dayjs(input.dueDate).format("YYYY-MM-DD") : null,
      soldAt: new Date().toISOString(),
      notes: input.notes?.trim() || null,
      items: input.items.map((item) => ({
        id: nextId(db, "sit"),
        productId: item.productId ?? null,
        productName: (item.productName ?? db.products.find((p) => p.id === item.productId)?.name ?? "Item").trim(),
        quantity: item.quantity,
        unitPrice: money(item.unitPrice),
        total: money(item.quantity * normalizeAmount(item.unitPrice)),
      })),
    };

    for (const item of sale.items) {
      if (item.productId) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          if (product.stockQuantity - item.quantity < 0 && !shop.allowNegativeInventory) {
            throwApiError("INSUFFICIENT_STOCK", `Not enough stock of ${product.name}`);
          }
          product.stockQuantity -= item.quantity;
          product.updatedAt = new Date().toISOString();
        }
      }
    }

    db.sales.push(sale);

    if (customer) {
      db.ledgers[customer.id] = db.ledgers[customer.id] ?? [];
      db.ledgers[customer.id].push({
        id: nextId(db, "led"),
        type: "SALE",
        description: `Bought goods on credit · ${sale.items.map((i) => i.productName).join(", ")}`,
        amount: money(total),
        direction: "IN",
        createdAt: sale.soldAt,
      });
      withBalance(db, db.customers.find((c) => c.id === customer.id)!);
    }

    if (input.customerId) {
      db.activity.unshift({
        id: `act_${sale.id}`,
        type: "SALE",
        title: paymentType === "CASH" ? "Cash sale" : `${customer!.name} bought on credit`,
        subtitle: `${sale.items.length} item${sale.items.length > 1 ? "s" : ""}`,
        amount: sale.totalAmount,
        direction: "IN",
        createdAt: sale.soldAt,
      });
    } else {
      db.activity.unshift({
        id: `act_${sale.id}`,
        type: "SALE",
        title: "Cash sale",
        subtitle: `${sale.items.length} item${sale.items.length > 1 ? "s" : ""}`,
        amount: sale.totalAmount,
        direction: "IN",
        createdAt: sale.soldAt,
      });
    }

    if (remaining > 0 && sale.dueDate && customer) {
      const reminder: Reminder = {
        id: nextId(db, "rem"),
        customerId: customer.id,
        customerName: customer.name,
        scheduledFor: dayjs(sale.dueDate).startOf("day").add(8, "hour").toISOString(),
        status: "PENDING",
        channel: "SMS",
        message: `Hello ${customer.name}, this is a friendly reminder that your outstanding balance at ${shop.name} is ${money(remaining)} ${shop.currency}. Your payment is due today. Thank you.`,
        sentAt: null,
        failedAt: null,
        error: null,
        createdAt: new Date().toISOString(),
      };
      db.reminders.push(reminder);
    }

    return sale;
  },
};