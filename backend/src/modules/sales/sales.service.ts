import dayjs from "dayjs";
import { Prisma, type Sale, type SaleItem } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/errors";
import { money, normalizeAmount } from "../../lib/money";
import { parsePageParams, toPaginated, type Paginated } from "../../lib/pagination";
import type { z } from "zod";
import type { saleInputSchema, saleListQuerySchema } from "./sales.schemas";

type SaleWithRelations = Sale & { items: SaleItem[]; customer: { name: string } | null };

function serialize(sale: SaleWithRelations) {
  return {
    id: sale.id,
    shopId: sale.shopId,
    customerId: sale.customerId,
    customerName: sale.customer?.name ?? null,
    paymentType: sale.paymentType,
    totalAmount: money(sale.totalAmount),
    paidAmount: money(sale.paidAmount),
    remainingAmount: money(sale.remainingAmount),
    dueDate: sale.dueDate ? dayjs(sale.dueDate).format("YYYY-MM-DD") : null,
    soldAt: sale.soldAt.toISOString(),
    notes: sale.notes,
    items: sale.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: money(i.unitPrice),
      total: money(i.total),
    })),
  };
}

const saleInclude = { items: true, customer: { select: { name: true } } } satisfies Prisma.SaleInclude;

export const salesService = {
  async list(shopId: string, query: z.infer<typeof saleListQuerySchema>): Promise<Paginated<ReturnType<typeof serialize>>> {
    const { page, limit, skip } = parsePageParams(query);
    const where: Prisma.SaleWhereInput = {
      shopId,
      ...(query.type === "cash" && { paymentType: "CASH" }),
      ...(query.type === "credit" && { paymentType: { not: "CASH" } }),
      ...(query.search && {
        OR: [
          { items: { some: { productName: { contains: query.search, mode: "insensitive" } } } },
          { customer: { name: { contains: query.search, mode: "insensitive" } } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      prisma.sale.findMany({ where, include: saleInclude, orderBy: { soldAt: "desc" }, skip, take: limit }),
      prisma.sale.count({ where }),
    ]);
    return toPaginated(items.map(serialize), total, page, limit);
  },

  async get(shopId: string, id: string) {
    const sale = await prisma.sale.findFirst({ where: { id, shopId }, include: saleInclude });
    if (!sale) throw new ApiError("SALE_NOT_FOUND", "Sale was not found", 404);
    return serialize(sale);
  },

  async create(shopId: string, input: z.infer<typeof saleInputSchema>) {
    for (const item of input.items) {
      if (!item.productName?.trim() && !item.productId) {
        throw new ApiError("VALIDATION_ERROR", "Every item needs a product name", 422);
      }
      if (!(item.quantity > 0)) throw new ApiError("VALIDATION_ERROR", "Quantity must be greater than zero", 422);
      if (normalizeAmount(item.unitPrice) <= 0) {
        throw new ApiError("VALIDATION_ERROR", "Price must be greater than zero", 422);
      }
    }

    const total = input.items.reduce((sum, item) => sum + item.quantity * normalizeAmount(item.unitPrice), 0);
    if (total <= 0) throw new ApiError("VALIDATION_ERROR", "Sale total must be greater than zero", 422);

    const shop = await prisma.shop.findUniqueOrThrow({ where: { id: shopId } });
    const isCredit = input.paymentType !== "CASH";

    const customer = input.customerId
      ? await prisma.customer.findFirst({ where: { id: input.customerId, shopId, isActive: true } })
      : null;
    if (isCredit && !customer) {
      throw new ApiError("VALIDATION_ERROR", "A credit sale requires a customer", 422);
    }

    let paidAmount = normalizeAmount(input.paidAmount ?? 0);
    if (input.paymentType === "CASH") paidAmount = total;
    if (input.paymentType === "PARTIAL") {
      if (paidAmount <= 0 || paidAmount >= total) {
        throw new ApiError("VALIDATION_ERROR", "Partial payment must be between zero and the total", 422);
      }
    }
    if (input.paymentType === "CREDIT") paidAmount = 0;
    const remaining = total - paidAmount;

    if ((isCredit || remaining > 0) && !input.dueDate) {
      throw new ApiError("VALIDATION_ERROR", "A due date is required for unpaid credit", 422);
    }

    const productIds = [...new Set(input.items.map((i) => i.productId).filter((id): id is string => !!id))];
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds }, shopId } })
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));

    const saleId = await prisma.$transaction(async (tx) => {
      // Atomic, race-safe stock decrement: the WHERE clause itself enforces the
      // "don't go negative" rule at the database level, so concurrent sales for
      // the same product can't both succeed past available stock.
      for (const item of input.items) {
        if (!item.productId) continue;
        const product = productById.get(item.productId);
        if (!product) continue;
        if (shop.allowNegativeInventory) {
          await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { decrement: item.quantity } } });
        } else {
          const updated = await tx.$executeRaw`
            UPDATE products SET "stockQuantity" = "stockQuantity" - ${item.quantity}, "updatedAt" = now()
            WHERE id = ${item.productId} AND "stockQuantity" >= ${item.quantity}
          `;
          if (updated === 0) {
            throw new ApiError("INSUFFICIENT_STOCK", `Not enough stock of ${product.name}`, 422);
          }
        }
      }

      const sale = await tx.sale.create({
        data: {
          shopId,
          customerId: customer?.id ?? null,
          paymentType: input.paymentType,
          totalAmount: money(total),
          paidAmount: money(paidAmount),
          remainingAmount: money(remaining),
          dueDate: input.dueDate ? dayjs(input.dueDate).toDate() : null,
          notes: input.notes?.trim() || null,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId ?? null,
              productName: (item.productName ?? productById.get(item.productId ?? "")?.name ?? "Item").trim(),
              quantity: item.quantity,
              unitPrice: money(item.unitPrice),
              total: money(item.quantity * normalizeAmount(item.unitPrice)),
            })),
          },
        },
        include: saleInclude,
      });

      if (customer) {
        await tx.customerLedgerEntry.create({
          data: {
            shopId,
            customerId: customer.id,
            type: "SALE",
            description: `Bought goods on credit · ${sale.items.map((i) => i.productName).join(", ")}`,
            amount: money(total),
            direction: "IN",
          },
        });
      }

      if (remaining > 0 && sale.dueDate && customer) {
        await tx.reminder.create({
          data: {
            shopId,
            customerId: customer.id,
            scheduledFor: dayjs(sale.dueDate).startOf("day").add(8, "hour").toDate(),
            status: "PENDING",
            channel: "SMS",
            message: `Hello ${customer.name}, this is a friendly reminder that your outstanding balance at ${shop.name} is ${money(remaining)} ${shop.currency}. Your payment is due today. Thank you.`,
          },
        });
      }

      return sale.id;
    });

    return salesService.get(shopId, saleId);
  },
};
