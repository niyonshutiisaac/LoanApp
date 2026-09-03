import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { generateRefreshToken, hashRefreshToken, refreshTokenExpiry, signAccessToken } from "../../lib/jwt";
import { ApiError } from "../../lib/errors";
import type { z } from "zod";
import type { loginSchema, registerSchema } from "./auth.schemas";
import type { Shop, User } from "@prisma/client";

function serializeUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt.toISOString() };
}

function serializeShop(shop: Shop) {
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

async function issueSession(user: User, shop: Shop) {
  const accessToken = signAccessToken({ sub: user.id, shopId: shop.id });
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashRefreshToken(refreshToken), expiresAt: refreshTokenExpiry() },
  });
  return {
    user: serializeUser(user),
    shop: serializeShop(shop),
    accessToken,
    refreshToken,
  };
}

export const authService = {
  async register(input: z.infer<typeof registerSchema>) {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new ApiError("EMAIL_TAKEN", "An account with this email already exists", 409);

    const passwordHash = await hashPassword(input.password);
    const { user, shop } = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: { name: input.shopName?.trim() || `${input.name.trim().split(" ")[0]}'s Shop` },
      });
      const user = await tx.user.create({
        data: {
          shopId: shop.id,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone?.trim() || null,
          passwordHash,
        },
      });
      return { user, shop };
    });

    return issueSession(user, shop);
  },

  async login(input: z.infer<typeof loginSchema>) {
    const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() }, include: { shop: true } });
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new ApiError("INVALID_CREDENTIALS", "Email or password is incorrect", 401);
    }
    return issueSession(user, user.shop);
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { shop: true } });
    if (!user) throw new ApiError("UNAUTHENTICATED", "Not authenticated", 401);
    return { user: serializeUser(user), shop: serializeShop(user.shop) };
  },

  async logout(userId: string) {
    await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  },

  async refresh(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: { include: { shop: true } } } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new ApiError("UNAUTHENTICATED", "Refresh token is invalid or expired", 401);
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const nextRefreshToken = generateRefreshToken();
    await prisma.refreshToken.create({
      data: { userId: stored.userId, tokenHash: hashRefreshToken(nextRefreshToken), expiresAt: refreshTokenExpiry() },
    });
    const accessToken = signAccessToken({ sub: stored.userId, shopId: stored.user.shopId });
    return { accessToken, refreshToken: nextRefreshToken };
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(oldPassword, user.passwordHash))) {
      throw new ApiError("INVALID_CREDENTIALS", "Current password is incorrect", 401);
    }
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true as const };
  },
};
