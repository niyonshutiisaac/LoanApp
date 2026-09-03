import type { Shop } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/errors";
import type { z } from "zod";
import type { shopUpdateSchema } from "./shop.schemas";

function serialize(shop: Shop) {
  return {
    id: shop.id,
    name: shop.name,
    phone: shop.phone,
    address: shop.address,
    currency: shop.currency,
    timezone: shop.timezone,
    allowNegativeInventory: shop.allowNegativeInventory,
    createdAt: shop.createdAt.toISOString(),
    updatedAt: shop.updatedAt.toISOString(),
  };
}

export const shopService = {
  async get(shopId: string) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new ApiError("SHOP_NOT_FOUND", "Shop was not found", 404);
    return serialize(shop);
  },

  async update(shopId: string, input: z.infer<typeof shopUpdateSchema>) {
    const shop = await prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.phone !== undefined && { phone: input.phone?.trim() || null }),
        ...(input.address !== undefined && { address: input.address?.trim() || null }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        ...(input.allowNegativeInventory !== undefined && { allowNegativeInventory: input.allowNegativeInventory }),
      },
    });
    return serialize(shop);
  },
};
