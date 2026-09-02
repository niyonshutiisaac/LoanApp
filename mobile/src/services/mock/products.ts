import type { Product, ProductInput } from "@/types/api";
import { money, nextId, type MockDb } from "./db";
import { paginate, searchBy, throwApiError, wait } from "./utils";

function getProduct(db: MockDb, id: string): Product {
  const product = db.products.find((p) => p.id === id && p.isActive);
  if (!product) throwApiError("PRODUCT_NOT_FOUND", "Product was not found", 404);
  return product;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  lowStock?: boolean;
  includeInactive?: boolean;
}

export const mockProducts = {
  async list(db: MockDb, query: ListQuery = {}): Promise<{
    items: Product[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    await wait(300);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    let items = db.products;
    if (!query.includeInactive) items = items.filter((p) => p.isActive);
    if (query.lowStock) items = items.filter((p) => p.stockQuantity <= p.lowStockThreshold);
    const searched = searchBy(items, query.search, ["name", "sku"]);
    return paginate(searched, page, limit);
  },

  async get(db: MockDb, id: string): Promise<Product> {
    await wait(200);
    return { ...getProduct(db, id) };
  },

  async create(db: MockDb, input: ProductInput): Promise<Product> {
    await wait(350);
    if (!input.name?.trim()) throwApiError("VALIDATION_ERROR", "Product name is required");
    const product: Product = {
      id: nextId(db, "prd"),
      shopId: db.shops[0]!.id,
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      unit: input.unit?.trim() || null,
      categoryId: null,
      categoryName: null,
      buyingPrice: money(input.buyingPrice),
      sellingPrice: money(input.sellingPrice),
      stockQuantity: input.stockQuantity ?? 0,
      lowStockThreshold: input.lowStockThreshold ?? 5,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.products.push(product);
    return { ...product };
  },

  async update(db: MockDb, id: string, input: Partial<ProductInput>): Promise<Product> {
    await wait(300);
    const product = getProduct(db, id);
    Object.assign(product, {
      name: input.name?.trim() ?? product.name,
      sku: input.sku !== undefined ? input.sku?.trim() || null : product.sku,
      unit: input.unit !== undefined ? input.unit?.trim() || null : product.unit,
      buyingPrice: input.buyingPrice !== undefined ? money(input.buyingPrice) : product.buyingPrice,
      sellingPrice: input.sellingPrice !== undefined ? money(input.sellingPrice) : product.sellingPrice,
      stockQuantity: input.stockQuantity ?? product.stockQuantity,
      lowStockThreshold: input.lowStockThreshold ?? product.lowStockThreshold,
      updatedAt: new Date().toISOString(),
    });
    return { ...product };
  },

  async adjustStock(
    db: MockDb,
    id: string,
    quantity: number,
    reason?: string,
  ): Promise<Product> {
    await wait(300);
    const product = getProduct(db, id);
    if (product.stockQuantity + quantity < 0) {
      throwApiError("INSUFFICIENT_STOCK", "Not enough stock for this adjustment");
    }
    product.stockQuantity += quantity;
    product.updatedAt = new Date().toISOString();
    void reason;
    return { ...product };
  },

  async archive(db: MockDb, id: string): Promise<{ id: string }> {
    await wait(250);
    const product = getProduct(db, id);
    product.isActive = false;
    product.updatedAt = new Date().toISOString();
    return { id };
  },
};