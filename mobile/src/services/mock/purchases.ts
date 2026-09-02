import type { Paginated, Purchase, PurchaseInput } from "@/types/api";
import { money, nextId, type MockDb } from "./db";
import { isInRange, normalizeAmount, paginate, sortByDate, throwApiError, wait } from "./utils";

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  from?: string;
  to?: string;
}

export const mockPurchases = {
  async list(db: MockDb, query: ListQuery = {}): Promise<Paginated<Purchase>> {
    await wait(300);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    let items = sortByDate(db.purchases, "purchasedAt", "desc");
    if (query.from && query.to) {
      items = items.filter((p) => isInRange(p.purchasedAt, query.from!, query.to!));
    }
    if (query.search) {
      items = items.filter((p) =>
        p.items.some((i) => i.productName.toLowerCase().includes(query.search!.toLowerCase())),
      );
    }
    return paginate(items, page, limit);
  },

  async create(db: MockDb, input: PurchaseInput): Promise<Purchase> {
    await wait(500);
    if (!input.items || input.items.length === 0) {
      throwApiError("VALIDATION_ERROR", "Add at least one item to the purchase");
    }
    for (const item of input.items) {
      if (!item.productName?.trim() && !item.productId) {
        throwApiError("VALIDATION_ERROR", "Every item needs a product name");
      }
      if (!(item.quantity > 0)) throwApiError("VALIDATION_ERROR", "Quantity must be greater than zero");
      if (normalizeAmount(item.unitCost) <= 0) {
        throwApiError("VALIDATION_ERROR", "Cost must be greater than zero");
      }
    }

    const total = input.items.reduce(
      (sum, item) => sum + item.quantity * normalizeAmount(item.unitCost),
      0,
    );
    const paid = normalizeAmount(input.paymentAmount ?? total);
    const remaining = Math.max(0, total - paid);

    const purchase: Purchase = {
      id: nextId(db, "pur"),
      shopId: db.shops[0]!.id,
      totalAmount: money(total),
      paymentAmount: money(paid),
      remainingAmount: money(remaining),
      paymentStatus: remaining <= 0 ? "PAID" : paid <= 0 ? "UNPAID" : "PARTIAL",
      purchasedAt: input.purchasedAt ? new Date(input.purchasedAt).toISOString() : new Date().toISOString(),
      notes: input.notes?.trim() || null,
      items: input.items.map((item) => ({
        id: nextId(db, "pit"),
        productId: item.productId ?? null,
        productName: (item.productName ?? db.products.find((p) => p.id === item.productId)?.name ?? "Item").trim(),
        quantity: item.quantity,
        unitCost: money(item.unitCost),
        total: money(item.quantity * normalizeAmount(item.unitCost)),
      })),
    };

    for (const item of purchase.items) {
      if (item.productId) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          product.stockQuantity += item.quantity;
          product.updatedAt = new Date().toISOString();
        }
      }
    }

    db.purchases.push(purchase);
    db.activity.unshift({
      id: `act_${purchase.id}`,
      type: "PURCHASE",
      title: "Bought goods",
      subtitle: purchase.items.map((i) => i.productName).join(", "),
      amount: purchase.totalAmount,
      direction: "OUT",
      createdAt: purchase.purchasedAt,
    });
    return purchase;
  },
};