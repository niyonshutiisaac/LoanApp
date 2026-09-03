import { Prisma, type Product } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/errors";
import { money, type MoneyInput } from "../../lib/money";
import { parsePageParams, toPaginated, type Paginated } from "../../lib/pagination";
import type { z } from "zod";
import type { productInputSchema, productListQuerySchema, productUpdateSchema } from "./products.schemas";

// Accepts either a Prisma model instance (Decimal fields) or a raw $queryRaw row
// (numeric columns come back as strings), so both list code paths can share it.
function serialize(p: Omit<Product, "buyingPrice" | "sellingPrice"> & { buyingPrice: MoneyInput; sellingPrice: MoneyInput }) {
  return {
    id: p.id,
    shopId: p.shopId,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    buyingPrice: money(p.buyingPrice),
    sellingPrice: money(p.sellingPrice),
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
    isActive: p.isActive,
    createdAt: new Date(p.createdAt).toISOString(),
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}

async function getActiveProduct(shopId: string, id: string): Promise<Product> {
  const product = await prisma.product.findFirst({ where: { id, shopId, isActive: true } });
  if (!product) throw new ApiError("PRODUCT_NOT_FOUND", "Product was not found", 404);
  return product;
}

export const productsService = {
  async list(shopId: string, query: z.infer<typeof productListQuerySchema>): Promise<Paginated<ReturnType<typeof serialize>>> {
    const { page, limit, skip } = parsePageParams(query);

    if (!query.lowStock) {
      // The common path (no low-stock filter) doesn't need to compare two columns,
      // so it stays as a plain indexed Prisma query.
      const where: Prisma.ProductWhereInput = {
        shopId,
        isActive: true,
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { sku: { contains: query.search, mode: "insensitive" } },
          ],
        }),
      };
      const [items, total] = await Promise.all([
        prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
        prisma.product.count({ where }),
      ]);
      return toPaginated(items.map(serialize), total, page, limit);
    }

    // Low stock compares two columns (stockQuantity <= lowStockThreshold), which
    // Prisma's query builder can't express, so this path drops to raw SQL.
    const searchClause = query.search
      ? Prisma.sql`AND (name ILIKE ${`%${query.search}%`} OR sku ILIKE ${`%${query.search}%`})`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<Array<Product & { total_count: bigint }>>(Prisma.sql`
      SELECT *, COUNT(*) OVER() AS total_count
      FROM products
      WHERE "shopId" = ${shopId} AND "isActive" = true AND "stockQuantity" <= "lowStockThreshold" ${searchClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `);
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    return toPaginated(rows.map(serialize), total, page, limit);
  },

  async get(shopId: string, id: string) {
    return serialize(await getActiveProduct(shopId, id));
  },

  async create(shopId: string, input: z.infer<typeof productInputSchema>) {
    const product = await prisma.product.create({
      data: {
        shopId,
        name: input.name.trim(),
        sku: input.sku?.trim() || null,
        unit: input.unit?.trim() || null,
        buyingPrice: money(input.buyingPrice),
        sellingPrice: money(input.sellingPrice),
        stockQuantity: input.stockQuantity ?? 0,
        lowStockThreshold: input.lowStockThreshold ?? 5,
      },
    });
    return serialize(product);
  },

  async update(shopId: string, id: string, input: z.infer<typeof productUpdateSchema>) {
    await getActiveProduct(shopId, id);
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.sku !== undefined && { sku: input.sku?.trim() || null }),
        ...(input.unit !== undefined && { unit: input.unit?.trim() || null }),
        ...(input.buyingPrice !== undefined && { buyingPrice: money(input.buyingPrice) }),
        ...(input.sellingPrice !== undefined && { sellingPrice: money(input.sellingPrice) }),
        ...(input.stockQuantity !== undefined && { stockQuantity: input.stockQuantity }),
        ...(input.lowStockThreshold !== undefined && { lowStockThreshold: input.lowStockThreshold }),
      },
    });
    return serialize(product);
  },

  async adjustStock(shopId: string, id: string, quantity: number) {
    const product = await getActiveProduct(shopId, id);
    if (product.stockQuantity + quantity < 0) {
      throw new ApiError("INSUFFICIENT_STOCK", "Not enough stock for this adjustment", 422);
    }
    const updated = await prisma.product.update({ where: { id }, data: { stockQuantity: { increment: quantity } } });
    return serialize(updated);
  },

  async archive(shopId: string, id: string): Promise<{ id: string }> {
    await getActiveProduct(shopId, id);
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return { id };
  },
};
