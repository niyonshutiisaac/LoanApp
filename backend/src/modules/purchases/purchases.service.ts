import dayjs from "dayjs";
import { Prisma, type Purchase, type PurchaseItem } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/errors";
import { money, normalizeAmount } from "../../lib/money";
import { parsePageParams, toPaginated, type Paginated } from "../../lib/pagination";
import type { z } from "zod";
import type { purchaseInputSchema, purchaseListQuerySchema } from "./purchases.schemas";

type PurchaseWithItems = Purchase & { items: PurchaseItem[] };

function serialize(purchase: PurchaseWithItems) {
  return {
    id: purchase.id,
    shopId: purchase.shopId,
    totalAmount: money(purchase.totalAmount),
    paymentAmount: money(purchase.paymentAmount),
    remainingAmount: money(purchase.remainingAmount),
    paymentStatus: purchase.paymentStatus,
    purchasedAt: purchase.purchasedAt.toISOString(),
    notes: purchase.notes,
    items: purchase.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitCost: money(i.unitCost),
      total: money(i.total),
    })),
  };
}

export const purchasesService = {
  async list(shopId: string, query: z.infer<typeof purchaseListQuerySchema>): Promise<Paginated<ReturnType<typeof serialize>>> {
    const { page, limit, skip } = parsePageParams(query);
    const where: Prisma.PurchaseWhereInput = {
      shopId,
      ...(query.from && query.to && { purchasedAt: { gte: new Date(query.from), lte: dayjs(query.to).endOf("day").toDate() } }),
      ...(query.search && { items: { some: { productName: { contains: query.search, mode: "insensitive" } } } }),
    };
    const [items, total] = await Promise.all([
      prisma.purchase.findMany({ where, include: { items: true }, orderBy: { purchasedAt: "desc" }, skip, take: limit }),
      prisma.purchase.count({ where }),
    ]);
    return toPaginated(items.map(serialize), total, page, limit);
  },

  async create(shopId: string, input: z.infer<typeof purchaseInputSchema>) {
    for (const item of input.items) {
      if (!item.productName?.trim() && !item.productId) {
        throw new ApiError("VALIDATION_ERROR", "Every item needs a product name", 422);
      }
      if (!(item.quantity > 0)) throw new ApiError("VALIDATION_ERROR", "Quantity must be greater than zero", 422);
      if (normalizeAmount(item.unitCost) <= 0) {
        throw new ApiError("VALIDATION_ERROR", "Cost must be greater than zero", 422);
      }
    }

    const total = input.items.reduce((sum, item) => sum + item.quantity * normalizeAmount(item.unitCost), 0);
    const paid = normalizeAmount(input.paymentAmount ?? total);
    const remaining = Math.max(0, total - paid);
    const paymentStatus = remaining <= 0 ? "PAID" : paid <= 0 ? "UNPAID" : "PARTIAL";

    const productIds = [...new Set(input.items.map((i) => i.productId).filter((id): id is string => !!id))];
    const products = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds }, shopId } }) : [];
    const productById = new Map(products.map((p) => [p.id, p]));

    const purchase = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          shopId,
          totalAmount: money(total),
          paymentAmount: money(paid),
          remainingAmount: money(remaining),
          paymentStatus,
          purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : new Date(),
          notes: input.notes?.trim() || null,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId ?? null,
              productName: (item.productName ?? productById.get(item.productId ?? "")?.name ?? "Item").trim(),
              quantity: item.quantity,
              unitCost: money(item.unitCost),
              total: money(item.quantity * normalizeAmount(item.unitCost)),
            })),
          },
        },
        include: { items: true },
      });

      for (const item of input.items) {
        if (!item.productId) continue;
        if (!productById.has(item.productId)) continue;
        await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
      }

      return purchase;
    });

    return serialize(purchase);
  },
};
